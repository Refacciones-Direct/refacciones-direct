/**
 * TestWorkbookBuilder — programmatic Excel generation for import pipeline tests.
 *
 * Generates .xlsx buffers matching production template format so tests
 * don't depend on fixture files.
 *
 * Usage:
 *   const buffer = TestWorkbookBuilder.forTemplate('mazas_v1')
 *     .addPart({ sku: 'TEST-001', price: 150 })
 *     .addApplication('TEST-001', { make: 'CHEVROLET', model: 'SILVERADO' })
 *     .build();
 */

import ExcelJS from 'exceljs';
import {
  SHEET_NAMES,
  METADATA_KEYS,
  COMMON_PART_COLUMNS,
  APPLICATION_COLUMNS,
} from '../../constants';
import { TEMPLATE_REGISTRY } from '../../template-registry';
import type { TemplateConfig } from '../../types';
import { DEFAULT_PART, DEFAULT_APPLICATION, DEFAULT_MAZA_ATTRIBUTES } from './test-constants';

// ---------------------------------------------------------------------------
// Part row input — all fields optional, merged with defaults
// ---------------------------------------------------------------------------

export interface PartInput {
  sku?: string;
  brand?: string;
  name?: string;
  description?: string;
  price?: number | string;
  quantity?: number | string;
  imageUrl1?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  imageUrl4?: string;
  oeNumbers?: string;
  /** Category-specific attributes keyed by header_es */
  attributes?: Record<string, unknown>;
}

export interface AppInput {
  make?: string;
  model?: string;
  yearStart?: number | string;
  yearEnd?: number | string;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export class TestWorkbookBuilder {
  private templateType: string;
  private templateConfig: TemplateConfig;
  private version: string;
  private exportTimestamp?: string;
  private parts: PartInput[] = [];
  private applications: { sku: string; app: AppInput }[] = [];

  private constructor(templateType: string) {
    const config = TEMPLATE_REGISTRY[templateType];
    if (!config) {
      throw new Error(`Unknown template type: ${templateType}`);
    }
    this.templateType = templateType;
    this.templateConfig = config;
    this.version = config.version;
  }

  static forTemplate(templateType: string): TestWorkbookBuilder {
    return new TestWorkbookBuilder(templateType);
  }

  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  setExportTimestamp(timestamp: string): this {
    this.exportTimestamp = timestamp;
    return this;
  }

  addPart(input: PartInput = {}): this {
    this.parts.push(input);
    return this;
  }

  addApplication(sku: string, input: AppInput = {}): this {
    this.applications.push({ sku, app: input });
    return this;
  }

  /**
   * Add N parts with auto-generated SKUs: TEST-001, TEST-002, ...
   */
  addParts(count: number, overrides: Partial<PartInput> = {}): this {
    for (let i = 0; i < count; i++) {
      const idx = String(i + 1).padStart(3, '0');
      this.parts.push({ sku: `TEST-${idx}`, ...overrides });
    }
    return this;
  }

  /**
   * Add an application for each part SKU already added.
   */
  addApplicationsForAllParts(appInput: AppInput = {}): this {
    for (const part of this.parts) {
      const sku = part.sku ?? DEFAULT_PART.sku;
      this.applications.push({ sku, app: appInput });
    }
    return this;
  }

  async build(): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook();

    this.buildMetadataSheet(workbook);
    this.buildPartsSheet(workbook);
    this.buildApplicationsSheet(workbook);

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // -------------------------------------------------------------------------
  // Metadata sheet
  // -------------------------------------------------------------------------

  private buildMetadataSheet(workbook: ExcelJS.Workbook): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.METADATA);
    ws.addRow([METADATA_KEYS.TEMPLATE_TYPE, this.templateType]);
    ws.addRow([METADATA_KEYS.VERSION, this.version]);
    if (this.exportTimestamp) {
      ws.addRow([METADATA_KEYS.EXPORT_TIMESTAMP, this.exportTimestamp]);
    }
  }

  // -------------------------------------------------------------------------
  // Partes sheet
  // -------------------------------------------------------------------------

  private buildPartsSheet(workbook: ExcelJS.Workbook): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.PARTS);

    // Row 1: Header row — matches production template-generator column order
    const headers = [
      COMMON_PART_COLUMNS.SKU.es,
      COMMON_PART_COLUMNS.BRAND.es,
      COMMON_PART_COLUMNS.NAME.es,
      COMMON_PART_COLUMNS.DESCRIPTION.es,
      ...this.templateConfig.attributes.map((a) => a.header_es),
      COMMON_PART_COLUMNS.PRICE.es,
      COMMON_PART_COLUMNS.QUANTITY.es,
      COMMON_PART_COLUMNS.OE_NUMBERS.es,
      COMMON_PART_COLUMNS.IMAGE_URL_1.es,
      COMMON_PART_COLUMNS.IMAGE_URL_2.es,
      COMMON_PART_COLUMNS.IMAGE_URL_3.es,
      COMMON_PART_COLUMNS.IMAGE_URL_4.es,
    ];
    ws.addRow(headers);

    // Row 2: Help text row (to match production template with dataStartRow=3)
    ws.addRow(headers.map(() => ''));

    // Data rows (starting at row 3)
    for (const part of this.parts) {
      const attrs = part.attributes ?? this.defaultAttributes();
      const row = [
        part.sku ?? DEFAULT_PART.sku,
        part.brand ?? DEFAULT_PART.brand,
        part.name ?? DEFAULT_PART.name,
        part.description ?? DEFAULT_PART.description,
        ...this.templateConfig.attributes.map((a) => attrs[a.header_es] ?? attrs[a.field] ?? ''),
        part.price ?? DEFAULT_PART.price,
        part.quantity ?? DEFAULT_PART.quantity,
        part.oeNumbers ?? DEFAULT_PART.oeNumbers,
        part.imageUrl1 ?? DEFAULT_PART.imageUrl1,
        part.imageUrl2 ?? '',
        part.imageUrl3 ?? '',
        part.imageUrl4 ?? '',
      ];
      ws.addRow(row);
    }
  }

  // -------------------------------------------------------------------------
  // Aplicaciones sheet
  // -------------------------------------------------------------------------

  private buildApplicationsSheet(workbook: ExcelJS.Workbook): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.APPLICATIONS);

    const headers = [
      APPLICATION_COLUMNS.SKU.es,
      APPLICATION_COLUMNS.MAKE.es,
      APPLICATION_COLUMNS.MODEL.es,
      APPLICATION_COLUMNS.YEAR_START.es,
      APPLICATION_COLUMNS.YEAR_END.es,
    ];
    ws.addRow(headers);

    // Row 2: Help text row (to match production template with dataStartRow)
    ws.addRow(headers.map(() => ''));

    for (const { sku, app } of this.applications) {
      ws.addRow([
        sku,
        app.make ?? DEFAULT_APPLICATION.make,
        app.model ?? DEFAULT_APPLICATION.model,
        app.yearStart ?? DEFAULT_APPLICATION.yearStart,
        app.yearEnd ?? DEFAULT_APPLICATION.yearEnd,
      ]);
    }
  }

  // -------------------------------------------------------------------------
  // Default attribute values per template type
  // -------------------------------------------------------------------------

  private defaultAttributes(): Record<string, unknown> {
    if (this.templateType === 'mazas_v1') {
      return {
        Posición: DEFAULT_MAZA_ATTRIBUTES.position,
        'Tipo de ABS': DEFAULT_MAZA_ATTRIBUTES.absType,
        Barrenos: DEFAULT_MAZA_ATTRIBUTES.boltCount,
        'Tipo de Tracción': DEFAULT_MAZA_ATTRIBUTES.driveType,
      };
    }
    // Other templates: return empty — tests should provide explicit values
    return {};
  }
}

// ---------------------------------------------------------------------------
// Convenience: build a minimal valid workbook buffer
// ---------------------------------------------------------------------------

export async function buildMinimalWorkbook(templateType: string = 'mazas_v1'): Promise<Uint8Array> {
  return TestWorkbookBuilder.forTemplate(templateType)
    .addPart()
    .addApplication(DEFAULT_PART.sku)
    .build();
}

/**
 * Build a workbook with NO Metadata sheet (for error testing).
 */
export async function buildWorkbookWithoutMetadata(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(SHEET_NAMES.PARTS);
  ws.addRow(['SKU', 'Name']);
  ws.addRow(['TEST-001', 'Test Part']);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Build a workbook with Metadata but missing Partes sheet.
 */
export async function buildWorkbookWithoutParts(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const meta = workbook.addWorksheet(SHEET_NAMES.METADATA);
  meta.addRow([METADATA_KEYS.TEMPLATE_TYPE, 'mazas_v1']);
  meta.addRow([METADATA_KEYS.VERSION, '1']);
  const apps = workbook.addWorksheet(SHEET_NAMES.APPLICATIONS);
  apps.addRow(['SKU']);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Build a workbook with Metadata but missing Aplicaciones sheet.
 */
export async function buildWorkbookWithoutApplications(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const meta = workbook.addWorksheet(SHEET_NAMES.METADATA);
  meta.addRow([METADATA_KEYS.TEMPLATE_TYPE, 'mazas_v1']);
  meta.addRow([METADATA_KEYS.VERSION, '1']);
  const parts = workbook.addWorksheet(SHEET_NAMES.PARTS);
  parts.addRow(['SKU']);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
