/**
 * ErrorReportGenerator — generates a downloadable .xlsx error report.
 *
 * Format: Same columns as original template + "Error" column appended.
 * Two sheets: "Partes con Errores" and "Aplicaciones con Errores".
 */

import ExcelJS from 'exceljs';
import {
  SHEET_NAMES,
  COMMON_PART_COLUMNS,
  APPLICATION_COLUMNS,
  ERROR_COLUMN_HEADER,
} from './constants';
import type { RowError, TemplateConfig, ErrorReportInput } from './types';

export class ErrorReportGenerator {
  /**
   * Generate an .xlsx error report from validation/import errors.
   * Returns a Buffer that can be uploaded to storage.
   */
  async generate(input: ErrorReportInput): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook();

    const partErrors = input.errors.filter((e) => e.sheetName === SHEET_NAMES.PARTS);
    const appErrors = input.errors.filter((e) => e.sheetName === SHEET_NAMES.APPLICATIONS);

    if (partErrors.length > 0) {
      this.buildPartsErrorSheet(workbook, partErrors, input.templateConfig);
    }

    if (appErrors.length > 0) {
      this.buildApplicationsErrorSheet(workbook, appErrors);
    }

    // If no errors at all, add an empty sheet
    if (partErrors.length === 0 && appErrors.length === 0) {
      const ws = workbook.addWorksheet('Sin Errores');
      ws.addRow(['No se encontraron errores.']);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // -------------------------------------------------------------------------
  // Parts error sheet
  // -------------------------------------------------------------------------

  private buildPartsErrorSheet(
    workbook: ExcelJS.Workbook,
    errors: RowError[],
    config: TemplateConfig,
  ): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.ERRORS_PARTS);

    // Header: common columns + attribute columns + Error
    const headers = [
      COMMON_PART_COLUMNS.SKU.es,
      COMMON_PART_COLUMNS.BRAND.es,
      COMMON_PART_COLUMNS.NAME.es,
      COMMON_PART_COLUMNS.DESCRIPTION.es,
      ...config.attributes.map((a) => a.header_es),
      COMMON_PART_COLUMNS.PRICE.es,
      COMMON_PART_COLUMNS.QUANTITY.es,
      COMMON_PART_COLUMNS.OE_NUMBERS.es,
      COMMON_PART_COLUMNS.IMAGE_URL_1.es,
      COMMON_PART_COLUMNS.IMAGE_URL_2.es,
      COMMON_PART_COLUMNS.IMAGE_URL_3.es,
      COMMON_PART_COLUMNS.IMAGE_URL_4.es,
      ERROR_COLUMN_HEADER.es,
    ];

    const headerRow = ws.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Group errors by row number, aggregate messages
    const byRow = this.groupByRow(errors);
    for (const [, rowErrors] of byRow) {
      const firstError = rowErrors[0];
      const data = firstError.originalData;
      const errorMessages = rowErrors.map((e) => e.errorMessage).join('; ');

      const row = [
        data[COMMON_PART_COLUMNS.SKU.es] ?? '',
        data[COMMON_PART_COLUMNS.BRAND.es] ?? '',
        data[COMMON_PART_COLUMNS.NAME.es] ?? '',
        data[COMMON_PART_COLUMNS.DESCRIPTION.es] ?? '',
        ...config.attributes.map((a) => data[a.header_es] ?? ''),
        data[COMMON_PART_COLUMNS.PRICE.es] ?? '',
        data[COMMON_PART_COLUMNS.QUANTITY.es] ?? '',
        data[COMMON_PART_COLUMNS.OE_NUMBERS.es] ?? '',
        data[COMMON_PART_COLUMNS.IMAGE_URL_1.es] ?? '',
        data[COMMON_PART_COLUMNS.IMAGE_URL_2.es] ?? '',
        data[COMMON_PART_COLUMNS.IMAGE_URL_3.es] ?? '',
        data[COMMON_PART_COLUMNS.IMAGE_URL_4.es] ?? '',
        errorMessages,
      ];
      ws.addRow(row);
    }

    // Auto-width for readability
    this.autoWidth(ws);
  }

  // -------------------------------------------------------------------------
  // Applications error sheet
  // -------------------------------------------------------------------------

  private buildApplicationsErrorSheet(workbook: ExcelJS.Workbook, errors: RowError[]): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.ERRORS_APPLICATIONS);

    const headers = [
      APPLICATION_COLUMNS.SKU.es,
      APPLICATION_COLUMNS.MAKE.es,
      APPLICATION_COLUMNS.MODEL.es,
      APPLICATION_COLUMNS.YEAR_START.es,
      APPLICATION_COLUMNS.YEAR_END.es,
      ERROR_COLUMN_HEADER.es,
    ];

    const headerRow = ws.addRow(headers);
    this.styleHeaderRow(headerRow);

    const byRow = this.groupByRow(errors);
    for (const [, rowErrors] of byRow) {
      const firstError = rowErrors[0];
      const data = firstError.originalData;
      const errorMessages = rowErrors.map((e) => e.errorMessage).join('; ');

      ws.addRow([
        data[APPLICATION_COLUMNS.SKU.es] ?? '',
        data[APPLICATION_COLUMNS.MAKE.es] ?? '',
        data[APPLICATION_COLUMNS.MODEL.es] ?? '',
        data[APPLICATION_COLUMNS.YEAR_START.es] ?? '',
        data[APPLICATION_COLUMNS.YEAR_END.es] ?? '',
        errorMessages,
      ]);
    }

    this.autoWidth(ws);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private groupByRow(errors: RowError[]): Map<number, RowError[]> {
    const map = new Map<number, RowError[]>();
    for (const err of errors) {
      const list = map.get(err.rowNumber) ?? [];
      list.push(err);
      map.set(err.rowNumber, list);
    }
    return map;
  }

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
    });
  }

  private autoWidth(ws: ExcelJS.Worksheet): void {
    ws.columns?.forEach((column) => {
      let maxLen = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? '').length;
        if (len > maxLen) maxLen = len;
      });
      column.width = Math.min(maxLen + 2, 50);
    });
  }
}
