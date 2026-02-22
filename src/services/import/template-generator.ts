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

    // Row 1: Header row
    const headers = [
      COMMON_PART_COLUMNS.SKU.es,
      COMMON_PART_COLUMNS.BRAND.es,
      COMMON_PART_COLUMNS.NAME.es,
      COMMON_PART_COLUMNS.CONDITION.es,
      COMMON_PART_COLUMNS.DESCRIPTION.es,
      ...config.attributes.map((a) => a.header_es),
      COMMON_PART_COLUMNS.PRICE.es,
      COMMON_PART_COLUMNS.QUANTITY.es,
      COMMON_PART_COLUMNS.OE_NUMBERS.es,
      COMMON_PART_COLUMNS.IMAGE_URL_1.es,
      COMMON_PART_COLUMNS.IMAGE_URL_2.es,
      COMMON_PART_COLUMNS.IMAGE_URL_3.es,
      COMMON_PART_COLUMNS.IMAGE_URL_4.es,
    ];

    const headerRow = ws.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Row 2: Help text hints
    const helpTexts = [
      'Código único. Ej: ACR2302006',
      'Marca de la pieza',
      'Nombre descriptivo del producto',
      'Nuevo o Usado',
      'Descripción detallada',
      ...config.attributes.map((a) => a.header_es),
      'Precio en pesos mexicanos',
      'Cantidad disponible',
      'Números OEM separados por ; o ,',
      'URL de foto frontal',
      'URL de foto trasera',
      'URL de foto superior',
      'URL de foto adicional',
    ];
    const helpRow = ws.addRow(helpTexts);
    helpRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: 'FF808080' } };
    });

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
    ];

    const headerRow = ws.addRow(headers);
    this.styleHeaderRow(headerRow);

    // Help text row
    const helpTexts = [
      'SKU de la pieza en Partes',
      'Ej: CHEVROLET, FORD',
      'Ej: SILVERADO 1500',
      'Ej: 2010',
      'Ej: 2020',
    ];
    const helpRow = ws.addRow(helpTexts);
    helpRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: 'FF808080' } };
    });

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
}
