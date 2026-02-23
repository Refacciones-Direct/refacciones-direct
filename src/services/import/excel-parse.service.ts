/**
 * ExcelParseService — parses .xlsx buffers into structured ParsedFile objects.
 *
 * Responsibilities:
 *   1. Read Metadata sheet → identify template type → look up TemplateConfig
 *   2. Parse Partes sheet → extract rows with common + attribute columns
 *   3. Parse Aplicaciones sheet → extract vehicle application rows
 *
 * File-level errors (missing sheets, unknown template) throw ExcelParseError.
 * Row-level issues are left for ValidationEngine.
 */

import ExcelJS from 'exceljs';
import {
  SHEET_NAMES,
  METADATA_KEYS,
  COMMON_PART_COLUMNS,
  APPLICATION_COLUMNS,
  DEFAULT_DATA_START_ROW,
} from './constants';
import { getTemplateConfig } from './template-registry';
import type { ParsedFile, ParsedMetadata, RawPartRow, RawAppRow, TemplateConfig } from './types';

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class ExcelParseError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_FILE'
      | 'MISSING_METADATA'
      | 'UNKNOWN_TEMPLATE'
      | 'MISSING_PARTS_SHEET'
      | 'MISSING_APPLICATIONS_SHEET'
      | 'MISSING_HEADERS',
  ) {
    super(message);
    this.name = 'ExcelParseError';
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ExcelParseService {
  /**
   * Parse an .xlsx buffer into a structured ParsedFile.
   * Throws ExcelParseError for file-level issues.
   */
  async parse(buffer: Buffer | Uint8Array): Promise<ParsedFile> {
    const workbook = await this.readWorkbook(buffer);

    const metadata = this.parseMetadata(workbook);
    const templateConfig = this.resolveTemplate(metadata.templateType);
    const parts = this.parseParts(workbook, templateConfig);
    const applications = this.parseApplications(workbook);

    return { metadata, templateConfig, parts, applications };
  }

  // -------------------------------------------------------------------------
  // Workbook reading
  // -------------------------------------------------------------------------

  private async readWorkbook(buffer: Buffer | Uint8Array): Promise<ExcelJS.Workbook> {
    try {
      const workbook = new ExcelJS.Workbook();
      // ExcelJS's Buffer type extends ArrayBuffer; Node 22 Buffer<ArrayBufferLike> differs
      await workbook.xlsx.load(buffer as never);
      return workbook;
    } catch {
      throw new ExcelParseError('File is not a valid .xlsx workbook', 'INVALID_FILE');
    }
  }

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  private parseMetadata(workbook: ExcelJS.Workbook): ParsedMetadata {
    const ws = workbook.getWorksheet(SHEET_NAMES.METADATA);
    if (!ws) {
      throw new ExcelParseError(
        `Missing required sheet: "${SHEET_NAMES.METADATA}"`,
        'MISSING_METADATA',
      );
    }

    const kvMap = new Map<string, string>();
    ws.eachRow((row) => {
      const key = String(row.getCell(1).value ?? '').trim();
      const val = String(row.getCell(2).value ?? '').trim();
      if (key) kvMap.set(key, val);
    });

    const templateType = kvMap.get(METADATA_KEYS.TEMPLATE_TYPE);
    if (!templateType) {
      throw new ExcelParseError(
        `Metadata sheet missing "${METADATA_KEYS.TEMPLATE_TYPE}" key`,
        'MISSING_METADATA',
      );
    }

    return {
      templateType,
      version: kvMap.get(METADATA_KEYS.VERSION) ?? '1',
      exportTimestamp: kvMap.get(METADATA_KEYS.EXPORT_TIMESTAMP) || undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Template resolution
  // -------------------------------------------------------------------------

  private resolveTemplate(templateType: string): TemplateConfig {
    const config = getTemplateConfig(templateType);
    if (!config) {
      throw new ExcelParseError(`Unknown template type: "${templateType}"`, 'UNKNOWN_TEMPLATE');
    }
    return config;
  }

  // -------------------------------------------------------------------------
  // Partes sheet
  // -------------------------------------------------------------------------

  private parseParts(workbook: ExcelJS.Workbook, templateConfig: TemplateConfig): RawPartRow[] {
    const ws = workbook.getWorksheet(SHEET_NAMES.PARTS);
    if (!ws) {
      throw new ExcelParseError(
        `Missing required sheet: "${SHEET_NAMES.PARTS}"`,
        'MISSING_PARTS_SHEET',
      );
    }

    const headerRow = ws.getRow(1);
    const headerMap = this.buildHeaderMap(headerRow);

    // Validate that at least the SKU column exists
    const skuHeader = COMMON_PART_COLUMNS.SKU.es;
    if (!headerMap.has(skuHeader)) {
      throw new ExcelParseError(
        `Parts sheet missing required column: "${skuHeader}"`,
        'MISSING_HEADERS',
      );
    }

    const rows: RawPartRow[] = [];
    const dataStartRow = templateConfig.dataStartRow;

    ws.eachRow((row, rowNumber) => {
      if (rowNumber < dataStartRow) return;

      // Skip completely empty rows
      if (this.isEmptyRow(row, headerMap.size)) return;

      const data: Record<string, unknown> = {};
      for (const [header, colIndex] of headerMap) {
        data[header] = this.getCellValue(row.getCell(colIndex));
      }

      rows.push({ rowNumber, data });
    });

    return rows;
  }

  // -------------------------------------------------------------------------
  // Aplicaciones sheet
  // -------------------------------------------------------------------------

  private parseApplications(workbook: ExcelJS.Workbook): RawAppRow[] {
    const ws = workbook.getWorksheet(SHEET_NAMES.APPLICATIONS);
    if (!ws) {
      throw new ExcelParseError(
        `Missing required sheet: "${SHEET_NAMES.APPLICATIONS}"`,
        'MISSING_APPLICATIONS_SHEET',
      );
    }

    const headerRow = ws.getRow(1);
    const headerMap = this.buildHeaderMap(headerRow);

    const skuHeader = APPLICATION_COLUMNS.SKU.es;
    if (!headerMap.has(skuHeader)) {
      throw new ExcelParseError(
        `Applications sheet missing required column: "${skuHeader}"`,
        'MISSING_HEADERS',
      );
    }

    const rows: RawAppRow[] = [];

    ws.eachRow((row, rowNumber) => {
      if (rowNumber < DEFAULT_DATA_START_ROW) return; // Skip header + help text rows

      if (this.isEmptyRow(row, headerMap.size)) return;

      const data: Record<string, unknown> = {};
      for (const [header, colIndex] of headerMap) {
        data[header] = this.getCellValue(row.getCell(colIndex));
      }

      rows.push({ rowNumber, data });
    });

    return rows;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Build a map of header name → column index from the first row.
   */
  private buildHeaderMap(headerRow: ExcelJS.Row): Map<string, number> {
    const map = new Map<string, number>();
    headerRow.eachCell((cell, colNumber) => {
      const header = String(cell.value ?? '').trim();
      if (header) {
        map.set(header, colNumber);
      }
    });
    return map;
  }

  /**
   * Extract a cell's primitive value, handling ExcelJS rich text and formulas.
   */
  private getCellValue(cell: ExcelJS.Cell): unknown {
    const val = cell.value;

    if (val === null || val === undefined) return '';

    // ExcelJS rich text: { richText: [{ text: '...' }, ...] }
    if (typeof val === 'object' && 'richText' in val) {
      return (val as { richText: { text: string }[] }).richText.map((rt) => rt.text).join('');
    }

    // ExcelJS formula result
    if (typeof val === 'object' && 'result' in val) {
      return (val as { result: unknown }).result;
    }

    // ExcelJS hyperlink
    if (typeof val === 'object' && 'hyperlink' in val) {
      return (
        (val as { hyperlink: string; text?: string }).text ??
        (val as { hyperlink: string }).hyperlink
      );
    }

    // Date object → ISO string
    if (val instanceof Date) {
      return val.toISOString();
    }

    return val;
  }

  /**
   * Check if a row is completely empty (all cells blank/null).
   */
  private isEmptyRow(row: ExcelJS.Row, maxCols: number): boolean {
    for (let i = 1; i <= maxCols; i++) {
      const val = row.getCell(i).value;
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        return false;
      }
    }
    return true;
  }
}
