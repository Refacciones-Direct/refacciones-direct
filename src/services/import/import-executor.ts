/**
 * ImportExecutor — inserts validated data into the database.
 *
 * Responsibilities:
 *   1. Create import_jobs row
 *   2. Upsert vehicles (shared table, ON CONFLICT DO NOTHING)
 *   3. Insert parts in batches of 500
 *   4. Insert fitments (resolve part_id + vehicle_id)
 *   5. Insert oe_crossrefs (resolve part_id)
 *   6. Record errors to import_errors
 *   7. Generate error report if errors exist
 *   8. Update import_jobs with counts and status
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { BATCH_SIZE, MIN_PRICE_MXN } from './constants';
import type {
  ValidatedPartRow,
  ValidatedAppRow,
  ValidationResult,
  ImportResult,
  ImportCounts,
  RowError,
  TemplateConfig,
} from './types';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ImportExecutor {
  constructor(private adminClient: SupabaseClient) {}

  async execute(
    validationResult: ValidationResult,
    manufacturerId: number,
    fileUrl?: string,
  ): Promise<ImportResult> {
    const errors: RowError[] = [];
    const counts: ImportCounts = {
      partsInserted: 0,
      partsFailed: 0,
      vehiclesUpserted: 0,
      fitmentsInserted: 0,
      fitmentsFailed: 0,
      oeCrossrefsInserted: 0,
    };

    // 1. Create import job
    const importJobId = await this.createImportJob(manufacturerId, validationResult, fileUrl);

    try {
      // 2. Insert parts in batches → get SKU → part_id map
      const skuToPartId = await this.insertParts(
        validationResult.validParts,
        manufacturerId,
        validationResult.templateConfig,
        counts,
        errors,
      );

      // 3. Upsert vehicles → get vehicle key → vehicle_id map
      const vehicleIdMap = await this.upsertVehicles(validationResult.validApplications, counts);

      // 4. Insert fitments
      await this.insertFitments(
        validationResult.validApplications,
        skuToPartId,
        vehicleIdMap,
        counts,
        errors,
      );

      // 5. Insert OE cross-references
      await this.insertOeCrossrefs(validationResult.validParts, skuToPartId, counts);

      // 6. Record errors to import_errors table
      const allErrors = [...validationResult.errors, ...errors];
      if (allErrors.length > 0) {
        await this.recordErrors(importJobId, allErrors);
      }

      // 7. Update import job status
      await this.updateImportJob(importJobId, counts, allErrors.length);

      return {
        success: allErrors.length === 0,
        importJobId,
        counts,
        errors: allErrors,
      };
    } catch (err) {
      await this.failImportJob(importJobId, String(err));
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Import job lifecycle
  // -------------------------------------------------------------------------

  private async createImportJob(
    manufacturerId: number,
    validationResult: ValidationResult,
    fileUrl?: string,
  ): Promise<number> {
    const { data, error } = await this.adminClient
      .from('import_jobs')
      .insert({
        manufacturer_id: manufacturerId,
        import_type: 'new_parts',
        template_type: validationResult.templateType,
        status: 'processing',
        file_url: fileUrl ?? null,
        total_rows: validationResult.summary.totalPartRows,
        normalizations_applied: validationResult.normalizations,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create import job: ${error?.message}`);
    }

    return data.id;
  }

  private async updateImportJob(
    importJobId: number,
    counts: ImportCounts,
    errorCount: number,
  ): Promise<void> {
    const { error } = await this.adminClient
      .from('import_jobs')
      .update({
        status: 'completed',
        successful_rows: counts.partsInserted,
        failed_rows: counts.partsFailed + errorCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importJobId);

    if (error) {
      console.error(`Failed to update import job ${importJobId}:`, error);
    }
  }

  private async failImportJob(importJobId: number, errorMessage: string): Promise<void> {
    console.error(`Import job ${importJobId} failed:`, errorMessage);
    await this.adminClient
      .from('import_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', importJobId);
  }

  // -------------------------------------------------------------------------
  // Parts insertion
  // -------------------------------------------------------------------------

  private async insertParts(
    parts: ValidatedPartRow[],
    manufacturerId: number,
    templateConfig: TemplateConfig,
    counts: ImportCounts,
    errors: RowError[],
  ): Promise<Map<string, number>> {
    const skuToPartId = new Map<string, number>();

    for (let i = 0; i < parts.length; i += BATCH_SIZE) {
      const batch = parts.slice(i, i + BATCH_SIZE);
      const rows = batch.map((p) => ({
        manufacturer_id: manufacturerId,
        sku: p.sku,
        brand: p.brand,
        name: p.name,
        description: p.description ?? null,
        category: templateConfig.categorySlug,
        part_type: templateConfig.partType,
        price: p.price,
        quantity: p.quantity,
        image_urls: p.imageUrls,
        attributes: p.attributes,
        status: this.determinePartStatus(p),
      }));

      const { data, error } = await this.adminClient.from('parts').insert(rows).select('id, sku');

      if (error) {
        // Individual row failures in batch
        counts.partsFailed += batch.length;
        for (const part of batch) {
          errors.push({
            rowNumber: part.rowNumber,
            sheetName: 'Partes',
            errorType: 'invalid_value',
            errorMessage: `Database insert failed: ${error.message}`,
            fieldName: undefined,
            originalData: { SKU: part.sku },
          });
        }
      } else if (data) {
        counts.partsInserted += data.length;
        for (const row of data) {
          skuToPartId.set(row.sku, row.id);
        }
      }
    }

    return skuToPartId;
  }

  /**
   * Part status logic:
   * - active if: price >= 35 AND stock > 0 AND image_urls has >= 1 URL
   * - draft otherwise
   */
  private determinePartStatus(part: ValidatedPartRow): string {
    if (
      part.price !== null &&
      part.price >= MIN_PRICE_MXN &&
      part.quantity > 0 &&
      part.imageUrls.length > 0
    ) {
      return 'active';
    }
    return 'draft';
  }

  // -------------------------------------------------------------------------
  // Vehicle upsert
  // -------------------------------------------------------------------------

  private async upsertVehicles(
    applications: ValidatedAppRow[],
    counts: ImportCounts,
  ): Promise<Map<string, number>> {
    const vehicleIdMap = new Map<string, number>();

    // Deduplicate vehicles by key
    const uniqueVehicles = new Map<string, ValidatedAppRow>();
    for (const app of applications) {
      const key = this.vehicleKey(app);
      if (!uniqueVehicles.has(key)) {
        uniqueVehicles.set(key, app);
      }
    }

    // Batch upsert
    const vehicleRows = [...uniqueVehicles.values()].map((app) => ({
      make: app.make,
      model: app.model,
      year_start: app.yearStart,
      year_end: app.yearEnd,
    }));

    for (let i = 0; i < vehicleRows.length; i += BATCH_SIZE) {
      const batch = vehicleRows.slice(i, i + BATCH_SIZE);

      // Insert with ON CONFLICT DO NOTHING
      const { error: insertError } = await this.adminClient
        .from('vehicles')
        .upsert(batch, { onConflict: 'make,model,year_start,year_end', ignoreDuplicates: true });

      if (insertError) {
        console.error('Vehicle upsert error:', insertError);
      }
    }

    // Now SELECT all needed vehicles to get IDs
    for (const [key, app] of uniqueVehicles) {
      const { data } = await this.adminClient
        .from('vehicles')
        .select('id')
        .eq('make', app.make)
        .eq('model', app.model)
        .eq('year_start', app.yearStart)
        .eq('year_end', app.yearEnd)
        .single();
      if (data) {
        vehicleIdMap.set(key, data.id);
        counts.vehiclesUpserted++;
      }
    }

    return vehicleIdMap;
  }

  private vehicleKey(app: ValidatedAppRow): string {
    return `${app.make}|${app.model}|${app.yearStart}|${app.yearEnd}`;
  }

  // -------------------------------------------------------------------------
  // Fitments insertion
  // -------------------------------------------------------------------------

  private async insertFitments(
    applications: ValidatedAppRow[],
    skuToPartId: Map<string, number>,
    vehicleIdMap: Map<string, number>,
    counts: ImportCounts,
    errors: RowError[],
  ): Promise<void> {
    const fitmentRows: { part_id: number; vehicle_id: number }[] = [];

    for (const app of applications) {
      const partId = skuToPartId.get(app.sku);
      const vehicleId = vehicleIdMap.get(this.vehicleKey(app));

      if (!partId || !vehicleId) {
        counts.fitmentsFailed++;
        continue;
      }

      fitmentRows.push({ part_id: partId, vehicle_id: vehicleId });
    }

    // Deduplicate fitments
    const seen = new Set<string>();
    const uniqueFitments = fitmentRows.filter((f) => {
      const key = `${f.part_id}|${f.vehicle_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (let i = 0; i < uniqueFitments.length; i += BATCH_SIZE) {
      const batch = uniqueFitments.slice(i, i + BATCH_SIZE);

      const { data, error } = await this.adminClient
        .from('fitments')
        .upsert(batch, { onConflict: 'part_id,vehicle_id', ignoreDuplicates: true })
        .select('id');

      if (error) {
        counts.fitmentsFailed += batch.length;
      } else if (data) {
        counts.fitmentsInserted += data.length;
      }
    }
  }

  // -------------------------------------------------------------------------
  // OE cross-references
  // -------------------------------------------------------------------------

  private async insertOeCrossrefs(
    parts: ValidatedPartRow[],
    skuToPartId: Map<string, number>,
    counts: ImportCounts,
  ): Promise<void> {
    const rows: {
      part_id: number;
      oe_number: string;
      oe_number_normalized: string;
    }[] = [];

    for (const part of parts) {
      const partId = skuToPartId.get(part.sku);
      if (!partId) continue;

      for (const oe of part.oeNumbers) {
        rows.push({
          part_id: partId,
          oe_number: oe.original,
          oe_number_normalized: oe.normalized,
        });
      }
    }

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const { data, error } = await this.adminClient
        .from('oe_crossrefs')
        .upsert(batch, { onConflict: 'part_id,oe_number', ignoreDuplicates: true })
        .select('id');

      if (error) {
        console.error('OE crossref insert error:', error);
      } else if (data) {
        counts.oeCrossrefsInserted += data.length;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Error recording
  // -------------------------------------------------------------------------

  private async recordErrors(importJobId: number, errors: RowError[]): Promise<void> {
    const rows = errors.map((e) => ({
      import_job_id: importJobId,
      row_number: e.rowNumber,
      sheet_name: e.sheetName,
      original_data: e.originalData,
      error_type: e.errorType,
      error_message: e.errorMessage,
      field_name: e.fieldName ?? null,
    }));

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await this.adminClient.from('import_errors').insert(batch);

      if (error) {
        console.error('Error recording import errors:', error);
      }
    }
  }
}
