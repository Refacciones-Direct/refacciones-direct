/**
 * TemplateGenerator — generates blank .xlsx templates for manufacturer download.
 *
 * Each template includes:
 *   - Metadata sheet with template_type and version
 *   - Partes sheet with headers (common + category-specific attributes)
 *   - Aplicaciones sheet with headers
 *   - Data validation dropdowns where applicable
 */

import ExcelJS from 'exceljs';
import { SHEET_NAMES, METADATA_KEYS, COMMON_PART_COLUMNS, APPLICATION_COLUMNS } from './constants';
import { getTemplateConfig } from './template-registry';
import type { TemplateConfig } from './types';

export class TemplateGenerator {
  /**
   * Generate a blank .xlsx template for the given template type.
   * Throws if the template type is not registered.
   */
  async generate(templateType: string): Promise<Uint8Array> {
    const config = getTemplateConfig(templateType);
    if (!config) {
      throw new Error(`Unknown template type: "${templateType}"`);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RefaccionesDirect';
    workbook.created = new Date();

    this.buildMetadataSheet(workbook, templateType, config);
    this.buildPartsSheet(workbook, config);
    this.buildApplicationsSheet(workbook);

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // -------------------------------------------------------------------------
  // Metadata sheet
  // -------------------------------------------------------------------------

  private buildMetadataSheet(
    workbook: ExcelJS.Workbook,
    templateType: string,
    config: TemplateConfig,
  ): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.METADATA);
    ws.addRow([METADATA_KEYS.TEMPLATE_TYPE, templateType]);
    ws.addRow([METADATA_KEYS.VERSION, config.version]);

    // Style
    ws.getColumn(1).width = 20;
    ws.getColumn(2).width = 30;
    ws.getColumn(1).font = { bold: true };
  }

  // -------------------------------------------------------------------------
  // Partes sheet
  // -------------------------------------------------------------------------

  private buildPartsSheet(workbook: ExcelJS.Workbook, config: TemplateConfig): void {
    const ws = workbook.addWorksheet(SHEET_NAMES.PARTS);

    // Header row
    const headers = [
      COMMON_PART_COLUMNS.SKU.es,
      COMMON_PART_COLUMNS.FACTORY_PART_NUMBER.es,
      COMMON_PART_COLUMNS.UPC.es,
      COMMON_PART_COLUMNS.BRAND.es,
      COMMON_PART_COLUMNS.NAME.es,
      COMMON_PART_COLUMNS.DESCRIPTION.es,
      COMMON_PART_COLUMNS.PRICE.es,
      COMMON_PART_COLUMNS.QUANTITY.es,
      COMMON_PART_COLUMNS.IMAGE_URL_1.es,
      COMMON_PART_COLUMNS.IMAGE_URL_2.es,
      COMMON_PART_COLUMNS.IMAGE_URL_3.es,
      COMMON_PART_COLUMNS.OE_NUMBERS.es,
      COMMON_PART_COLUMNS.OE_BRAND.es,
      ...config.attributes.map((a) => a.header_es),
    ];

    const headerRow = ws.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Data validations for dropdown attributes
    const commonColCount = 13; // Number of common columns
    for (let i = 0; i < config.attributes.length; i++) {
      const attr = config.attributes[i];
      if (attr.type === 'dropdown' && attr.validation?.values) {
        const colIndex = commonColCount + i + 1; // 1-indexed
        const colLetter = this.colLetter(colIndex);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExcelJS supports dataValidations but @types are incomplete
        (ws as any).dataValidations.add(`${colLetter}2:${colLetter}1048576`, {
          type: 'list',
          allowBlank: !attr.required,
          formulae: [`"${attr.validation.values.join(',')}"`],
          showErrorMessage: true,
          errorTitle: 'Valor inválido',
          error: `Debe ser uno de: ${attr.validation.values.join(', ')}`,
        });
      }
    }

    // Auto-width
    this.autoWidth(ws);
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
      APPLICATION_COLUMNS.ENGINE.es,
      APPLICATION_COLUMNS.SUBMODEL.es,
    ];

    const headerRow = ws.addRow(headers);
    this.styleHeaderRow(headerRow);
    this.autoWidth(ws);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.alignment = { horizontal: 'center' };
    });
  }

  private autoWidth(ws: ExcelJS.Worksheet): void {
    ws.columns?.forEach((column) => {
      let maxLen = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? '').length;
        if (len > maxLen) maxLen = len;
      });
      column.width = Math.min(maxLen + 4, 40);
    });
  }

  private colLetter(colIndex: number): string {
    let letter = '';
    let n = colIndex;
    while (n > 0) {
      n--;
      letter = String.fromCharCode(65 + (n % 26)) + letter;
      n = Math.floor(n / 26);
    }
    return letter;
  }
}
