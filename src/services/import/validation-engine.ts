/**
 * ValidationEngine — validates and normalizes parsed Excel data.
 *
 * Responsibilities:
 *   1. Required field validation
 *   2. Format validation (UPC, URLs, prices)
 *   3. Attribute validation (driven by TemplateConfig)
 *   4. Duplicate SKU detection (within file AND against DB)
 *   5. Multi-make splitting ("CHEVROLET, GMC" → 2 rows)
 *   6. Normalization (make, model, position, drive type, OE numbers)
 *   7. Cross-sheet validation (app SKU must exist in Partes)
 */

import {
  normalizeMake,
  normalizeModel,
  normalizePosition,
  normalizeDriveType,
  normalizeText,
  normalizeUpc,
  normalizePrice,
  normalizeOeNumber,
} from '@/lib/normalize';
import { COMMON_PART_COLUMNS, APPLICATION_COLUMNS, SHEET_NAMES, MIN_PRICE_MXN } from './constants';
import type {
  ParsedFile,
  RawPartRow,
  RawAppRow,
  TemplateConfig,
  TemplateAttribute,
  NormalizerName,
  RowError,
  NormalizationRecord,
  ValidatedPartRow,
  ValidatedAppRow,
  ValidationSummary,
  ValidationResult,
} from './types';

// ---------------------------------------------------------------------------
// Normalizer dispatch
// ---------------------------------------------------------------------------

const NORMALIZER_FNS: Record<NormalizerName, (v: string) => string> = {
  normalizePosition,
  normalizeDriveType,
  normalizeText,
};

// ---------------------------------------------------------------------------
// Types for DB duplicate check (injectable for testing)
// ---------------------------------------------------------------------------

export interface DuplicateChecker {
  checkSkus(manufacturerId: number, skus: string[]): Promise<Set<string>>;
}

export interface StalenessChecker {
  getLastImportTimestamp(manufacturerId: number): Promise<string | null>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ValidationEngine {
  constructor(
    private duplicateChecker?: DuplicateChecker,
    private stalenessChecker?: StalenessChecker,
  ) {}

  async validate(parsedFile: ParsedFile, manufacturerId: number): Promise<ValidationResult> {
    const errors: RowError[] = [];
    const normalizations: NormalizationRecord[] = [];
    const { templateConfig } = parsedFile;

    // 1. Validate + normalize parts
    const { validParts, skuSet } = this.validateParts(
      parsedFile.parts,
      templateConfig,
      errors,
      normalizations,
    );

    // 2. Check DB duplicates — returns set of SKUs that exist in DB
    const dbDupSkus = await this.checkDbDuplicates(validParts, manufacturerId, errors);

    // Filter out only DB duplicates (in-file duplicates were already excluded in validateParts)
    const finalValidParts = validParts.filter((p) => !dbDupSkus.has(p.sku));
    const finalSkuSet = new Set(finalValidParts.map((p) => p.sku));

    // 3. Validate + normalize applications
    const { validApplications, splitCount } = this.validateApplications(
      parsedFile.applications,
      finalSkuSet,
      errors,
      normalizations,
    );

    // 4. Staleness check
    const staleWarning = await this.checkStaleness(
      parsedFile.metadata.exportTimestamp,
      manufacturerId,
    );

    // 5. Build summary
    const summary: ValidationSummary = {
      totalPartRows: parsedFile.parts.length,
      validPartRows: finalValidParts.length,
      totalAppRows: parsedFile.applications.length,
      validAppRows: validApplications.length,
      splitAppRows: splitCount,
      errors: errors.length,
      normalizations: normalizations.length,
    };

    return {
      valid: errors.length === 0,
      summary,
      templateType: parsedFile.metadata.templateType,
      templateConfig,
      validParts: finalValidParts,
      validApplications,
      errors,
      normalizations,
      staleWarning: staleWarning ?? undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Part validation
  // -------------------------------------------------------------------------

  private validateParts(
    rawParts: RawPartRow[],
    config: TemplateConfig,
    errors: RowError[],
    normalizations: NormalizationRecord[],
  ): { validParts: ValidatedPartRow[]; skuSet: Set<string> } {
    const validParts: ValidatedPartRow[] = [];
    const skuSet = new Set<string>();

    for (const raw of rawParts) {
      const rowErrors: RowError[] = [];
      const data = raw.data;
      const sheet = SHEET_NAMES.PARTS;

      // --- SKU (required) ---
      const skuRaw = this.str(data[COMMON_PART_COLUMNS.SKU.es]);
      if (!skuRaw) {
        rowErrors.push(
          this.makeError(raw.rowNumber, sheet, 'missing_required', 'SKU is required', 'SKU', data),
        );
        errors.push(...rowErrors);
        continue; // Cannot process row without SKU
      }

      // File-level duplicate
      if (skuSet.has(skuRaw)) {
        rowErrors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'duplicate_sku',
            `Duplicate SKU in file: ${skuRaw}`,
            'SKU',
            data,
          ),
        );
        errors.push(...rowErrors);
        continue;
      }
      skuSet.add(skuRaw);

      // --- Brand (required) ---
      const brand = this.str(data[COMMON_PART_COLUMNS.BRAND.es]);
      if (!brand) {
        rowErrors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'missing_required',
            'Brand is required',
            COMMON_PART_COLUMNS.BRAND.es,
            data,
          ),
        );
      }

      // --- Name (required) ---
      const name = this.str(data[COMMON_PART_COLUMNS.NAME.es]);
      if (!name) {
        rowErrors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'missing_required',
            'Name is required',
            COMMON_PART_COLUMNS.NAME.es,
            data,
          ),
        );
      }

      // --- Price ---
      const priceRaw = data[COMMON_PART_COLUMNS.PRICE.es];
      let price: number | null = null;
      if (priceRaw !== '' && priceRaw !== undefined && priceRaw !== null) {
        const normalized = normalizePrice(priceRaw as string | number);
        if (normalized === null) {
          rowErrors.push(
            this.makeError(
              raw.rowNumber,
              sheet,
              'price_too_low',
              `Price must be at least ${MIN_PRICE_MXN} MXN`,
              COMMON_PART_COLUMNS.PRICE.es,
              data,
            ),
          );
        } else {
          price = normalized;
        }
      }

      // --- Quantity ---
      const quantityRaw = data[COMMON_PART_COLUMNS.QUANTITY.es];
      const quantity =
        typeof quantityRaw === 'number'
          ? Math.max(0, Math.round(quantityRaw))
          : parseInt(String(quantityRaw || '0'), 10) || 0;

      // --- UPC (optional, validate format if provided) ---
      const upcRaw = this.str(data[COMMON_PART_COLUMNS.UPC.es]);
      let upc: string | undefined;
      if (upcRaw) {
        const normalizedUpc = normalizeUpc(upcRaw);
        if (normalizedUpc === null) {
          rowErrors.push(
            this.makeError(
              raw.rowNumber,
              sheet,
              'invalid_format',
              'UPC must be 8-14 digits',
              COMMON_PART_COLUMNS.UPC.es,
              data,
            ),
          );
        } else {
          if (normalizedUpc !== upcRaw) {
            normalizations.push({
              rowNumber: raw.rowNumber,
              sheetName: sheet,
              field: 'UPC',
              originalValue: upcRaw,
              normalizedValue: normalizedUpc,
            });
          }
          upc = normalizedUpc;
        }
      }

      // --- Image URLs ---
      const imageUrls: string[] = [];
      for (const key of [
        COMMON_PART_COLUMNS.IMAGE_URL_1.es,
        COMMON_PART_COLUMNS.IMAGE_URL_2.es,
        COMMON_PART_COLUMNS.IMAGE_URL_3.es,
      ]) {
        const url = this.str(data[key]);
        if (url) {
          if (this.isValidUrl(url)) {
            imageUrls.push(url);
          } else {
            rowErrors.push(
              this.makeError(
                raw.rowNumber,
                sheet,
                'invalid_format',
                `Invalid URL: ${url}`,
                key,
                data,
              ),
            );
          }
        }
      }

      // --- OE numbers ---
      const oeRaw = this.str(data[COMMON_PART_COLUMNS.OE_NUMBERS.es]);
      const oeBrand = this.str(data[COMMON_PART_COLUMNS.OE_BRAND.es]) || undefined;
      const oeNumbers: { original: string; normalized: string; brand?: string }[] = [];
      if (oeRaw) {
        const parts = oeRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const oe of parts) {
          const { original, normalized } = normalizeOeNumber(oe);
          if (normalized !== original) {
            normalizations.push({
              rowNumber: raw.rowNumber,
              sheetName: sheet,
              field: 'OE Number',
              originalValue: original,
              normalizedValue: normalized,
            });
          }
          oeNumbers.push({ original, normalized, brand: oeBrand });
        }
      }

      // --- Category-specific attributes ---
      const attributes: Record<string, unknown> = {};
      for (const attr of config.attributes) {
        const rawVal = data[attr.header_es];
        const validated = this.validateAttribute(
          attr,
          rawVal,
          raw.rowNumber,
          sheet,
          data,
          rowErrors,
          normalizations,
        );
        if (validated !== undefined) {
          attributes[attr.field] = validated;
        }
      }

      // --- Collect row errors ---
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        // Still exclude this row from valid parts only if critical errors
        // For this MVP, any error on the row excludes it
        continue;
      }

      validParts.push({
        rowNumber: raw.rowNumber,
        sku: skuRaw,
        factoryPartNumber: this.str(data[COMMON_PART_COLUMNS.FACTORY_PART_NUMBER.es]) || undefined,
        upc,
        brand: brand!,
        name: name!,
        description: this.str(data[COMMON_PART_COLUMNS.DESCRIPTION.es]) || undefined,
        price,
        quantity,
        imageUrls,
        attributes,
        oeNumbers,
      });
    }

    return { validParts, skuSet };
  }

  // -------------------------------------------------------------------------
  // Attribute validation
  // -------------------------------------------------------------------------

  private validateAttribute(
    attr: TemplateAttribute,
    rawVal: unknown,
    rowNumber: number,
    sheet: string,
    originalData: Record<string, unknown>,
    errors: RowError[],
    normalizations: NormalizationRecord[],
  ): unknown {
    const strVal = this.str(rawVal);

    // Required check
    if (attr.required && !strVal) {
      errors.push(
        this.makeError(
          rowNumber,
          sheet,
          'missing_required',
          `${attr.header_es} is required`,
          attr.header_es,
          originalData,
        ),
      );
      return undefined;
    }

    if (!strVal) return undefined;

    // Normalize first (if applicable)
    let value: string | number = strVal;
    if (attr.normalizer) {
      const fn = NORMALIZER_FNS[attr.normalizer];
      const normalized = fn(strVal);
      if (normalized !== strVal) {
        normalizations.push({
          rowNumber,
          sheetName: sheet,
          field: attr.field,
          originalValue: strVal,
          normalizedValue: normalized,
        });
      }
      value = normalized;
    }

    // Type-specific validation
    switch (attr.type) {
      case 'dropdown': {
        if (attr.validation?.values && !attr.validation.values.includes(String(value))) {
          errors.push(
            this.makeError(
              rowNumber,
              sheet,
              'invalid_value',
              `${attr.header_es} must be one of: ${attr.validation.values.join(', ')}. Got: "${value}"`,
              attr.header_es,
              originalData,
            ),
          );
          return undefined;
        }
        return value;
      }

      case 'number': {
        const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(value));
        if (isNaN(num)) {
          errors.push(
            this.makeError(
              rowNumber,
              sheet,
              'invalid_format',
              `${attr.header_es} must be a number`,
              attr.header_es,
              originalData,
            ),
          );
          return undefined;
        }
        if (attr.validation?.min !== undefined && num < attr.validation.min) {
          errors.push(
            this.makeError(
              rowNumber,
              sheet,
              'invalid_value',
              `${attr.header_es} must be at least ${attr.validation.min}`,
              attr.header_es,
              originalData,
            ),
          );
          return undefined;
        }
        if (attr.validation?.max !== undefined && num > attr.validation.max) {
          errors.push(
            this.makeError(
              rowNumber,
              sheet,
              'invalid_value',
              `${attr.header_es} must be at most ${attr.validation.max}`,
              attr.header_es,
              originalData,
            ),
          );
          return undefined;
        }
        return num;
      }

      case 'string':
      default:
        return value;
    }
  }

  // -------------------------------------------------------------------------
  // DB duplicate check
  // -------------------------------------------------------------------------

  private async checkDbDuplicates(
    validParts: ValidatedPartRow[],
    manufacturerId: number,
    errors: RowError[],
  ): Promise<Set<string>> {
    if (!this.duplicateChecker || validParts.length === 0) return new Set();

    const skus = validParts.map((p) => p.sku);
    const existingSkus = await this.duplicateChecker.checkSkus(manufacturerId, skus);

    for (const part of validParts) {
      if (existingSkus.has(part.sku)) {
        errors.push(
          this.makeError(
            part.rowNumber,
            SHEET_NAMES.PARTS,
            'duplicate_sku',
            `SKU already exists in database: ${part.sku}`,
            'SKU',
            { [COMMON_PART_COLUMNS.SKU.es]: part.sku },
          ),
        );
      }
    }

    return existingSkus;
  }

  // -------------------------------------------------------------------------
  // Application validation
  // -------------------------------------------------------------------------

  private validateApplications(
    rawApps: RawAppRow[],
    validPartSkus: Set<string>,
    errors: RowError[],
    normalizations: NormalizationRecord[],
  ): { validApplications: ValidatedAppRow[]; splitCount: number } {
    const validApplications: ValidatedAppRow[] = [];
    let splitCount = 0;

    for (const raw of rawApps) {
      const data = raw.data;
      const sheet = SHEET_NAMES.APPLICATIONS;

      // --- SKU (required, must reference a valid part) ---
      const sku = this.str(data[APPLICATION_COLUMNS.SKU.es]);
      if (!sku) {
        errors.push(
          this.makeError(raw.rowNumber, sheet, 'missing_required', 'SKU is required', 'SKU', data),
        );
        continue;
      }
      if (!validPartSkus.has(sku)) {
        errors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'sku_not_found',
            `SKU not found in Partes: ${sku}`,
            'SKU',
            data,
          ),
        );
        continue;
      }

      // --- Make (required, may contain multiple comma-separated) ---
      const makeRaw = this.str(data[APPLICATION_COLUMNS.MAKE.es]);
      if (!makeRaw) {
        errors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'missing_required',
            'Make is required',
            APPLICATION_COLUMNS.MAKE.es,
            data,
          ),
        );
        continue;
      }

      // --- Model (required) ---
      const modelRaw = this.str(data[APPLICATION_COLUMNS.MODEL.es]);
      if (!modelRaw) {
        errors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'missing_required',
            'Model is required',
            APPLICATION_COLUMNS.MODEL.es,
            data,
          ),
        );
        continue;
      }

      // --- Year range ---
      const yearStartRaw = data[APPLICATION_COLUMNS.YEAR_START.es];
      const yearEndRaw = data[APPLICATION_COLUMNS.YEAR_END.es];
      const yearStart =
        typeof yearStartRaw === 'number' ? yearStartRaw : parseInt(String(yearStartRaw), 10);
      const yearEnd =
        typeof yearEndRaw === 'number' ? yearEndRaw : parseInt(String(yearEndRaw), 10);

      if (!yearStartRaw || isNaN(yearStart)) {
        errors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'missing_required',
            'Year Start is required',
            APPLICATION_COLUMNS.YEAR_START.es,
            data,
          ),
        );
        continue;
      }
      if (!yearEndRaw || isNaN(yearEnd)) {
        errors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'missing_required',
            'Year End is required',
            APPLICATION_COLUMNS.YEAR_END.es,
            data,
          ),
        );
        continue;
      }
      if (yearEnd < yearStart) {
        errors.push(
          this.makeError(
            raw.rowNumber,
            sheet,
            'invalid_year_range',
            `Year End (${yearEnd}) < Year Start (${yearStart})`,
            APPLICATION_COLUMNS.YEAR_END.es,
            data,
          ),
        );
        continue;
      }

      // --- Optional fields ---
      const engine = this.str(data[APPLICATION_COLUMNS.ENGINE.es]) || undefined;
      const submodel = this.str(data[APPLICATION_COLUMNS.SUBMODEL.es]) || undefined;

      // --- Multi-make splitting ---
      const makes = makeRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (makes.length > 1) {
        splitCount += makes.length - 1; // Track extra rows from splitting
      }

      for (const rawMake of makes) {
        const normalizedMake = normalizeMake(rawMake);
        if (normalizedMake !== rawMake) {
          normalizations.push({
            rowNumber: raw.rowNumber,
            sheetName: sheet,
            field: 'Make',
            originalValue: rawMake,
            normalizedValue: normalizedMake,
          });
        }

        const normalizedModel = normalizeModel(modelRaw);
        if (normalizedModel !== modelRaw) {
          normalizations.push({
            rowNumber: raw.rowNumber,
            sheetName: sheet,
            field: 'Model',
            originalValue: modelRaw,
            normalizedValue: normalizedModel,
          });
        }

        validApplications.push({
          rowNumber: raw.rowNumber,
          sku,
          make: normalizedMake,
          model: normalizedModel,
          yearStart,
          yearEnd,
          engine,
          submodel,
        });
      }
    }

    return { validApplications, splitCount };
  }

  // -------------------------------------------------------------------------
  // Staleness check
  // -------------------------------------------------------------------------

  private async checkStaleness(
    exportTimestamp: string | undefined,
    manufacturerId: number,
  ): Promise<string | null> {
    if (!this.stalenessChecker || !exportTimestamp) return null;

    const lastImport = await this.stalenessChecker.getLastImportTimestamp(manufacturerId);
    if (!lastImport) return null;

    if (new Date(lastImport) > new Date(exportTimestamp)) {
      return `Warning: Another import completed at ${lastImport}, after this file was exported at ${exportTimestamp}. Some data may be outdated.`;
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private str(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  private makeError(
    rowNumber: number,
    sheetName: string,
    errorType: RowError['errorType'],
    errorMessage: string,
    fieldName: string,
    originalData: Record<string, unknown>,
  ): RowError {
    return { rowNumber, sheetName, errorType, errorMessage, fieldName, originalData };
  }
}
