/**
 * ExportService — exports a manufacturer's current catalog as .xlsx.
 *
 * Includes:
 *   - Metadata sheet with template_type, version, export_timestamp
 *   - Partes sheet with all parts
 *   - Aplicaciones sheet with all fitments
 */

import ExcelJS from 'exceljs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SHEET_NAMES, METADATA_KEYS, COMMON_PART_COLUMNS, APPLICATION_COLUMNS } from './constants';
import { getTemplateConfig, getTemplateEntries } from './template-registry';
import type { TemplateConfig } from './types';

export class ExportService {
  constructor(private adminClient: SupabaseClient) {}

  /**
   * Export the entire catalog for a manufacturer as .xlsx.
   * Uses the first part's category to determine template config.
   * If templateType is provided, uses that instead.
   */
  async export(
    manufacturerId: number,
    templateType?: string,
  ): Promise<{ buffer: Uint8Array; filename: string }> {
    // Fetch parts
    const { data: parts, error: partsError } = await this.adminClient
      .from('parts')
      .select('*')
      .eq('manufacturer_id', manufacturerId)
      .order('sku');

    if (partsError) throw new Error(`Failed to fetch parts: ${partsError.message}`);
    if (!parts || parts.length === 0) {
      throw new Error('No parts found for this manufacturer');
    }

    // Determine template config
    const config = this.resolveTemplateConfig(parts, templateType);

    // Fetch fitments with vehicle data
    const partIds = parts.map((p) => p.id);
    const { data: fitments, error: fitmentsError } = await this.adminClient
      .from('fitments')
      .select('part_id, vehicles(make, model, year_start, year_end)')
      .in('part_id', partIds);

    if (fitmentsError) throw new Error(`Failed to fetch fitments: ${fitmentsError.message}`);

    // Fetch OE crossrefs
    const { data: oeCrossrefs, error: oeError } = await this.adminClient
      .from('oe_crossrefs')
      .select('part_id, oe_number')
      .in('part_id', partIds);

    if (oeError) throw new Error(`Failed to fetch OE crossrefs: ${oeError.message}`);

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    const exportTimestamp = new Date().toISOString();

    this.buildMetadataSheet(workbook, config, exportTimestamp);
    this.buildPartsSheet(workbook, parts, oeCrossrefs ?? [], config);
    this.buildApplicationsSheet(workbook, parts, fitments ?? []);

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `catalog_${config.config.categorySlug}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return { buffer, filename };
  }

  // -------------------------------------------------------------------------
  // Template resolution
  // -------------------------------------------------------------------------

  private resolveTemplateConfig(
    parts: Array<{ part_type: string; category: string }>,
    templateType?: string,
  ): { key: string; config: TemplateConfig } {
    if (templateType) {
      const config = getTemplateConfig(templateType);
      if (!config) throw new Error(`Unknown template type: "${templateType}"`);
      return { key: templateType, config };
    }

    // Auto-detect from first part's part_type
    const firstPartType = parts[0].part_type;
    for (const [key, config] of getTemplateEntries()) {
      if (config.partType === firstPartType) {
        return { key, config };
      }
    }

    throw new Error(`No template registered for part_type: "${firstPartType}"`);
  }

  // -------------------------------------------------------------------------
  // Metadata sheet
  // -------------------------------------------------------------------------

  private buildMetadataSheet(
    workbook: ExcelJS.Workbook,
    template: { key: string; config: TemplateConfig },
    exportTimestamp: string,
  ): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.METADATA);
    ws.addRow([METADATA_KEYS.TEMPLATE_TYPE, template.key]);
    ws.addRow([METADATA_KEYS.VERSION, template.config.version]);
    ws.addRow([METADATA_KEYS.EXPORT_TIMESTAMP, exportTimestamp]);
    ws.getColumn(1).width = 20;
    ws.getColumn(2).width = 40;
  }

  // -------------------------------------------------------------------------
  // Partes sheet
  // -------------------------------------------------------------------------

  private buildPartsSheet(
    workbook: ExcelJS.Workbook,
    parts: Array<Record<string, unknown>>,
    oeCrossrefs: Array<{ part_id: number; oe_number: string }>,
    template: { key: string; config: TemplateConfig },
  ): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.PARTS);

    // Build OE map
    const oeByPart = new Map<number, string[]>();
    for (const oe of oeCrossrefs) {
      const existing = oeByPart.get(oe.part_id) ?? [];
      existing.push(oe.oe_number);
      oeByPart.set(oe.part_id, existing);
    }

    // Headers
    const headers = [
      COMMON_PART_COLUMNS.SKU.es,
      COMMON_PART_COLUMNS.BRAND.es,
      COMMON_PART_COLUMNS.NAME.es,
      COMMON_PART_COLUMNS.CONDITION.es,
      COMMON_PART_COLUMNS.DESCRIPTION.es,
      ...template.config.attributes.map((a) => a.header_es),
      COMMON_PART_COLUMNS.PRICE.es,
      COMMON_PART_COLUMNS.QUANTITY.es,
      COMMON_PART_COLUMNS.OE_NUMBERS.es,
      COMMON_PART_COLUMNS.IMAGE_URL_1.es,
      COMMON_PART_COLUMNS.IMAGE_URL_2.es,
      COMMON_PART_COLUMNS.IMAGE_URL_3.es,
      COMMON_PART_COLUMNS.IMAGE_URL_4.es,
    ];

    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Data rows
    for (const part of parts) {
      const attrs = (part.attributes ?? {}) as Record<string, unknown>;
      const imageUrls = (part.image_urls ?? []) as string[];
      const oeNumbers = oeByPart.get(part.id as number);

      ws.addRow([
        part.sku,
        part.brand,
        part.name,
        part.condition ?? '',
        part.description ?? '',
        ...template.config.attributes.map((a) => attrs[a.field] ?? ''),
        part.price ?? '',
        part.quantity ?? 0,
        oeNumbers?.join('; ') ?? '',
        imageUrls[0] ?? '',
        imageUrls[1] ?? '',
        imageUrls[2] ?? '',
        imageUrls[3] ?? '',
      ]);
    }
  }

  // -------------------------------------------------------------------------
  // Aplicaciones sheet
  // -------------------------------------------------------------------------

  private buildApplicationsSheet(
    workbook: ExcelJS.Workbook,
    parts: Array<Record<string, unknown>>,
    fitments: Array<{
      part_id: number;
      vehicles: Array<{
        make: string;
        model: string;
        year_start: number;
        year_end: number;
      }>;
    }>,
  ): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.APPLICATIONS);

    const headers = [
      APPLICATION_COLUMNS.SKU.es,
      APPLICATION_COLUMNS.MAKE.es,
      APPLICATION_COLUMNS.MODEL.es,
      APPLICATION_COLUMNS.YEAR_START.es,
      APPLICATION_COLUMNS.YEAR_END.es,
    ];

    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Build part_id → SKU map
    const idToSku = new Map<number, string>();
    for (const part of parts) {
      idToSku.set(part.id as number, part.sku as string);
    }

    for (const fitment of fitments) {
      const sku = idToSku.get(fitment.part_id);
      if (!sku) continue;

      // Supabase joins return related tables as arrays
      for (const vehicle of fitment.vehicles) {
        ws.addRow([sku, vehicle.make, vehicle.model, vehicle.year_start, vehicle.year_end]);
      }
    }
  }
}
