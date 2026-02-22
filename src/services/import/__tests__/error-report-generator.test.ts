import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { ErrorReportGenerator } from '../error-report-generator';
import { TEMPLATE_REGISTRY } from '../template-registry';
import { SHEET_NAMES, ERROR_COLUMN_HEADER } from '../constants';
import type { RowError, TemplateConfig } from '../types';

const generator = new ErrorReportGenerator();
const mazasConfig = TEMPLATE_REGISTRY['mazas_v1'] as TemplateConfig;

function makePartError(overrides: Partial<RowError> = {}): RowError {
  return {
    rowNumber: 2,
    sheetName: SHEET_NAMES.PARTS,
    errorType: 'missing_required',
    errorMessage: 'SKU is required',
    fieldName: 'SKU',
    originalData: { SKU: '', 'Marca Pieza': 'ACR', Nombre: 'Test' },
    ...overrides,
  };
}

function makeAppError(overrides: Partial<RowError> = {}): RowError {
  return {
    rowNumber: 3,
    sheetName: SHEET_NAMES.APPLICATIONS,
    errorType: 'sku_not_found',
    errorMessage: 'SKU not found in Partes: MISSING-001',
    fieldName: 'SKU',
    originalData: { SKU: 'MISSING-001', 'Marca Vehículo': 'FORD' },
    ...overrides,
  };
}

describe('ErrorReportGenerator', () => {
  it('generates a workbook with part errors sheet', async () => {
    const buffer = await generator.generate({
      errors: [makePartError()],
      templateConfig: mazasConfig,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.ERRORS_PARTS);
    expect(ws).toBeDefined();
    expect(ws!.rowCount).toBe(2); // header + 1 error row
  });

  it('generates a workbook with application errors sheet', async () => {
    const buffer = await generator.generate({
      errors: [makeAppError()],
      templateConfig: mazasConfig,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.ERRORS_APPLICATIONS);
    expect(ws).toBeDefined();
    expect(ws!.rowCount).toBe(2);
  });

  it('includes Error column as last header', async () => {
    const buffer = await generator.generate({
      errors: [makePartError()],
      templateConfig: mazasConfig,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.ERRORS_PARTS)!;
    const headerRow = ws.getRow(1);
    const lastCell = headerRow.getCell(headerRow.cellCount);
    expect(String(lastCell.value)).toBe(ERROR_COLUMN_HEADER.es);
  });

  it('aggregates multiple errors for same row', async () => {
    const buffer = await generator.generate({
      errors: [
        makePartError({ rowNumber: 2, errorMessage: 'Error 1' }),
        makePartError({ rowNumber: 2, errorMessage: 'Error 2' }),
      ],
      templateConfig: mazasConfig,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.ERRORS_PARTS)!;
    // 1 header + 1 data row (aggregated)
    expect(ws.rowCount).toBe(2);
    const errorCell = ws.getRow(2).getCell(ws.getRow(1).cellCount);
    expect(String(errorCell.value)).toContain('Error 1');
    expect(String(errorCell.value)).toContain('Error 2');
  });

  it('generates both sheets when both types of errors exist', async () => {
    const buffer = await generator.generate({
      errors: [makePartError(), makeAppError()],
      templateConfig: mazasConfig,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    expect(wb.getWorksheet(SHEET_NAMES.ERRORS_PARTS)).toBeDefined();
    expect(wb.getWorksheet(SHEET_NAMES.ERRORS_APPLICATIONS)).toBeDefined();
  });

  it('handles empty errors gracefully', async () => {
    const buffer = await generator.generate({
      errors: [],
      templateConfig: mazasConfig,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    // Should have a "Sin Errores" sheet
    expect(wb.getWorksheet('Sin Errores')).toBeDefined();
  });

  it('handles many errors (100+)', async () => {
    const errors: RowError[] = [];
    for (let i = 0; i < 100; i++) {
      errors.push(makePartError({ rowNumber: i + 2, errorMessage: `Error ${i}` }));
    }

    const buffer = await generator.generate({
      errors,
      templateConfig: mazasConfig,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.ERRORS_PARTS)!;
    expect(ws.rowCount).toBe(101); // 1 header + 100 error rows
  });

  it('includes category-specific attribute columns', async () => {
    const buffer = await generator.generate({
      errors: [makePartError()],
      templateConfig: mazasConfig,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.ERRORS_PARTS)!;
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => {
      headers.push(String(cell.value));
    });

    // Should include mazas-specific attributes
    expect(headers).toContain('Posición');
    expect(headers).toContain('Birlos');
    expect(headers).toContain('Sensor ABS');
  });
});
