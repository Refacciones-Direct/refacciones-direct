import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { TemplateGenerator } from '../template-generator';
import { ExcelParseService } from '../excel-parse.service';
import { SHEET_NAMES, COMMON_PART_COLUMNS, APPLICATION_COLUMNS, METADATA_KEYS } from '../constants';
import { TEMPLATE_REGISTRY } from '../template-registry';
import { getTemplateTypes } from '../template-registry';

const generator = new TemplateGenerator();
const parser = new ExcelParseService();

describe('TemplateGenerator', () => {
  // -------------------------------------------------------------------------
  // Basic generation
  // -------------------------------------------------------------------------

  it('generates a valid .xlsx buffer for mazas_v1', async () => {
    const buffer = await generator.generate('mazas_v1');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);
    expect(wb.worksheets.length).toBe(3);
  });

  it('includes Metadata, Partes, and Aplicaciones sheets', async () => {
    const buffer = await generator.generate('mazas_v1');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    expect(wb.getWorksheet(SHEET_NAMES.METADATA)).toBeDefined();
    expect(wb.getWorksheet(SHEET_NAMES.PARTS)).toBeDefined();
    expect(wb.getWorksheet(SHEET_NAMES.APPLICATIONS)).toBeDefined();
  });

  it('sets correct metadata values', async () => {
    const buffer = await generator.generate('mazas_v1');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const meta = wb.getWorksheet(SHEET_NAMES.METADATA)!;
    const kvMap = new Map<string, string>();
    meta.eachRow((row) => {
      kvMap.set(String(row.getCell(1).value), String(row.getCell(2).value));
    });

    expect(kvMap.get(METADATA_KEYS.TEMPLATE_TYPE)).toBe('mazas_v1');
    expect(kvMap.get(METADATA_KEYS.VERSION)).toBe('1');
  });

  it('throws for unknown template type', async () => {
    await expect(generator.generate('nonexistent_v1')).rejects.toThrow('Unknown template type');
  });

  // -------------------------------------------------------------------------
  // Column headers
  // -------------------------------------------------------------------------

  it('includes all common part columns in Partes sheet', async () => {
    const buffer = await generator.generate('mazas_v1');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.PARTS)!;
    const headers: string[] = [];
    ws.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value));
    });

    expect(headers).toContain(COMMON_PART_COLUMNS.SKU.es);
    expect(headers).toContain(COMMON_PART_COLUMNS.BRAND.es);
    expect(headers).toContain(COMMON_PART_COLUMNS.NAME.es);
    expect(headers).toContain(COMMON_PART_COLUMNS.PRICE.es);
    expect(headers).toContain(COMMON_PART_COLUMNS.OE_NUMBERS.es);
  });

  it('includes category-specific attribute columns', async () => {
    const buffer = await generator.generate('mazas_v1');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.PARTS)!;
    const headers: string[] = [];
    ws.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value));
    });

    expect(headers).toContain('Posición');
    expect(headers).toContain('Birlos');
    expect(headers).toContain('Sensor ABS');
    expect(headers).toContain('Tracción');
  });

  it('includes all application columns in Aplicaciones sheet', async () => {
    const buffer = await generator.generate('mazas_v1');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);

    const ws = wb.getWorksheet(SHEET_NAMES.APPLICATIONS)!;
    const headers: string[] = [];
    ws.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value));
    });

    expect(headers).toContain(APPLICATION_COLUMNS.SKU.es);
    expect(headers).toContain(APPLICATION_COLUMNS.MAKE.es);
    expect(headers).toContain(APPLICATION_COLUMNS.MODEL.es);
    expect(headers).toContain(APPLICATION_COLUMNS.YEAR_START.es);
    expect(headers).toContain(APPLICATION_COLUMNS.YEAR_END.es);
  });

  // -------------------------------------------------------------------------
  // Round-trip: generate → parse
  // -------------------------------------------------------------------------

  it('round-trip: generated template is parseable by ExcelParseService', async () => {
    const buffer = await generator.generate('mazas_v1');
    const parsed = await parser.parse(buffer);

    expect(parsed.metadata.templateType).toBe('mazas_v1');
    expect(parsed.metadata.version).toBe('1');
    expect(parsed.parts).toHaveLength(0); // No data rows in template
    expect(parsed.applications).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // All templates generate without error
  // -------------------------------------------------------------------------

  it.each(getTemplateTypes())('generates template for %s without error', async (templateType) => {
    const buffer = await generator.generate(templateType);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify it's parseable
    const parsed = await parser.parse(buffer);
    expect(parsed.metadata.templateType).toBe(templateType);
  });
});
