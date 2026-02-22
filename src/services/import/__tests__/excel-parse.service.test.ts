import { describe, it, expect } from 'vitest';
import { ExcelParseService, ExcelParseError } from '../excel-parse.service';
import {
  TestWorkbookBuilder,
  buildMinimalWorkbook,
  buildWorkbookWithoutMetadata,
  buildWorkbookWithoutParts,
  buildWorkbookWithoutApplications,
} from './helpers/test-workbook-builder';
import { DEFAULT_PART, TEST_TEMPLATE_TYPE } from './helpers/test-constants';
import { SHEET_NAMES, COMMON_PART_COLUMNS, APPLICATION_COLUMNS } from '../constants';
import ExcelJS from 'exceljs';

const service = new ExcelParseService();

describe('ExcelParseService', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('parses a minimal valid workbook', async () => {
      const buffer = await buildMinimalWorkbook();
      const result = await service.parse(buffer);

      expect(result.metadata.templateType).toBe(TEST_TEMPLATE_TYPE);
      expect(result.metadata.version).toBe('1');
      expect(result.templateConfig.partType).toBe('wheel_hub');
      expect(result.parts).toHaveLength(1);
      expect(result.applications).toHaveLength(1);
    });

    it('extracts part data with all common columns', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('mazas_v1')
        .addPart({ sku: 'HUB-100', price: 250, brand: 'ACR' })
        .addApplication('HUB-100')
        .build();

      const result = await service.parse(buffer);
      const part = result.parts[0];

      expect(part.data[COMMON_PART_COLUMNS.SKU.es]).toBe('HUB-100');
      expect(part.data[COMMON_PART_COLUMNS.PRICE.es]).toBe(250);
      expect(part.data[COMMON_PART_COLUMNS.BRAND.es]).toBe('ACR');
    });

    it('extracts category-specific attribute columns', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('mazas_v1')
        .addPart({
          attributes: {
            Posición: 'Rear',
            'Tipo de ABS': 'Sin ABS',
            Barrenos: '5',
            'Tipo de Tracción': '2WD',
          },
        })
        .addApplication(DEFAULT_PART.sku)
        .build();

      const result = await service.parse(buffer);
      const part = result.parts[0];

      expect(part.data['Posición']).toBe('Rear');
      expect(part.data['Tipo de ABS']).toBe('Sin ABS');
      expect(part.data['Barrenos']).toBe('5');
      expect(part.data['Tipo de Tracción']).toBe('2WD');
    });

    it('extracts application data with all columns', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('mazas_v1')
        .addPart()
        .addApplication('TEST-001', {
          make: 'FORD',
          model: 'F-150',
          yearStart: 2018,
          yearEnd: 2023,
        })
        .build();

      const result = await service.parse(buffer);
      const app = result.applications[0];

      expect(app.data[APPLICATION_COLUMNS.SKU.es]).toBe('TEST-001');
      expect(app.data[APPLICATION_COLUMNS.MAKE.es]).toBe('FORD');
      expect(app.data[APPLICATION_COLUMNS.MODEL.es]).toBe('F-150');
      expect(app.data[APPLICATION_COLUMNS.YEAR_START.es]).toBe(2018);
      expect(app.data[APPLICATION_COLUMNS.YEAR_END.es]).toBe(2023);
    });

    it('preserves row numbers (1-indexed)', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('mazas_v1')
        .addParts(3)
        .addApplicationsForAllParts()
        .build();

      const result = await service.parse(buffer);

      // Data starts at row 3 (row 1 = header, row 2 = help text)
      expect(result.parts[0].rowNumber).toBe(3);
      expect(result.parts[1].rowNumber).toBe(4);
      expect(result.parts[2].rowNumber).toBe(5);
    });

    it('reads export_timestamp from metadata', async () => {
      const ts = '2025-06-15T10:30:00Z';
      const buffer = await TestWorkbookBuilder.forTemplate('mazas_v1')
        .setExportTimestamp(ts)
        .addPart()
        .addApplication(DEFAULT_PART.sku)
        .build();

      const result = await service.parse(buffer);
      expect(result.metadata.exportTimestamp).toBe(ts);
    });

    it('handles missing export_timestamp gracefully', async () => {
      const buffer = await buildMinimalWorkbook();
      const result = await service.parse(buffer);
      expect(result.metadata.exportTimestamp).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Template detection
  // -------------------------------------------------------------------------

  describe('template detection', () => {
    it('detects alternadores_v1 template', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('alternadores_v1')
        .addPart({
          attributes: { Amperaje: 150, Voltaje: '12V' },
        })
        .addApplication(DEFAULT_PART.sku)
        .build();

      const result = await service.parse(buffer);
      expect(result.metadata.templateType).toBe('alternadores_v1');
      expect(result.templateConfig.partType).toBe('alternator');
    });

    it('detects soportes_motor_v1 template', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('soportes_motor_v1')
        .addPart({
          attributes: { Posición: 'Front', Material: 'Rubber' },
        })
        .addApplication(DEFAULT_PART.sku)
        .build();

      const result = await service.parse(buffer);
      expect(result.metadata.templateType).toBe('soportes_motor_v1');
      expect(result.templateConfig.partType).toBe('engine_mount');
    });

    it('detects cables_v1 template', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('cables_v1')
        .addPart({
          attributes: { 'Cantidad de Cables': 8 },
        })
        .addApplication(DEFAULT_PART.sku)
        .build();

      const result = await service.parse(buffer);
      expect(result.metadata.templateType).toBe('cables_v1');
      expect(result.templateConfig.partType).toBe('spark_plug_wire');
    });
  });

  // -------------------------------------------------------------------------
  // File-level errors
  // -------------------------------------------------------------------------

  describe('file-level errors', () => {
    it('throws INVALID_FILE for non-xlsx buffer', async () => {
      const buffer = Buffer.from('not an xlsx file');
      await expect(service.parse(buffer)).rejects.toThrow(ExcelParseError);
      await expect(service.parse(buffer)).rejects.toMatchObject({
        code: 'INVALID_FILE',
      });
    });

    it('throws MISSING_METADATA when Metadata sheet is absent', async () => {
      const buffer = await buildWorkbookWithoutMetadata();
      await expect(service.parse(buffer)).rejects.toThrow(ExcelParseError);
      await expect(service.parse(buffer)).rejects.toMatchObject({
        code: 'MISSING_METADATA',
      });
    });

    it('throws UNKNOWN_TEMPLATE for unregistered template type', async () => {
      const workbook = new ExcelJS.Workbook();
      const meta = workbook.addWorksheet(SHEET_NAMES.METADATA);
      meta.addRow(['template_type', 'unknown_template_v99']);
      meta.addRow(['version', '1']);
      workbook.addWorksheet(SHEET_NAMES.PARTS);
      workbook.addWorksheet(SHEET_NAMES.APPLICATIONS);
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await expect(service.parse(buffer)).rejects.toThrow(ExcelParseError);
      await expect(service.parse(buffer)).rejects.toMatchObject({
        code: 'UNKNOWN_TEMPLATE',
      });
    });

    it('throws MISSING_PARTS_SHEET when Partes sheet is absent', async () => {
      const buffer = await buildWorkbookWithoutParts();
      await expect(service.parse(buffer)).rejects.toThrow(ExcelParseError);
      await expect(service.parse(buffer)).rejects.toMatchObject({
        code: 'MISSING_PARTS_SHEET',
      });
    });

    it('throws MISSING_APPLICATIONS_SHEET when Aplicaciones sheet is absent', async () => {
      const buffer = await buildWorkbookWithoutApplications();
      await expect(service.parse(buffer)).rejects.toThrow(ExcelParseError);
      await expect(service.parse(buffer)).rejects.toMatchObject({
        code: 'MISSING_APPLICATIONS_SHEET',
      });
    });

    it('throws MISSING_METADATA when template_type key is missing', async () => {
      const workbook = new ExcelJS.Workbook();
      const meta = workbook.addWorksheet(SHEET_NAMES.METADATA);
      meta.addRow(['version', '1']); // No template_type
      workbook.addWorksheet(SHEET_NAMES.PARTS);
      workbook.addWorksheet(SHEET_NAMES.APPLICATIONS);
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await expect(service.parse(buffer)).rejects.toMatchObject({
        code: 'MISSING_METADATA',
      });
    });

    it('throws MISSING_HEADERS when SKU column is missing from Partes', async () => {
      const workbook = new ExcelJS.Workbook();
      const meta = workbook.addWorksheet(SHEET_NAMES.METADATA);
      meta.addRow(['template_type', 'mazas_v1']);
      meta.addRow(['version', '1']);
      const parts = workbook.addWorksheet(SHEET_NAMES.PARTS);
      parts.addRow(['Not SKU', 'Other']); // Missing SKU header
      workbook.addWorksheet(SHEET_NAMES.APPLICATIONS);
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await expect(service.parse(buffer)).rejects.toMatchObject({
        code: 'MISSING_HEADERS',
      });
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('skips empty rows in Partes sheet', async () => {
      const workbook = new ExcelJS.Workbook();
      const meta = workbook.addWorksheet(SHEET_NAMES.METADATA);
      meta.addRow(['template_type', 'mazas_v1']);
      meta.addRow(['version', '1']);

      const parts = workbook.addWorksheet(SHEET_NAMES.PARTS);
      // Row 1: Header
      parts.addRow([
        'SKU',
        'Marca',
        'Nombre del Producto',
        'Precio (MXN)',
        'Stock',
        'Posición',
        'Tipo de ABS',
        'Barrenos',
      ]);
      // Row 2: Help text (blank)
      parts.addRow([null, null, null, null, null, null, null, null]);
      // Row 3: valid data
      parts.addRow(['TEST-001', 'ACR', 'Hub 1', 100, 5, 'Front', 'ABS Integrado', '6']);
      // Row 4: empty
      parts.addRow([null, null, null, null, null, null, null, null]);
      // Row 5: valid data
      parts.addRow(['TEST-002', 'ACR', 'Hub 2', 200, 3, 'Rear', 'Sin ABS', '5']);

      const apps = workbook.addWorksheet(SHEET_NAMES.APPLICATIONS);
      apps.addRow([
        'SKU del Producto',
        'Marca del Vehículo',
        'Modelo del Vehículo',
        'Año Inicio',
        'Año Fin',
      ]);
      apps.addRow(['TEST-001', 'CHEVROLET', 'Silverado', 2014, 2020]);

      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await service.parse(buffer);

      expect(result.parts).toHaveLength(2);
      expect(result.parts[0].rowNumber).toBe(3);
      expect(result.parts[1].rowNumber).toBe(5);
    });

    it('handles workbook with zero data rows', async () => {
      const workbook = new ExcelJS.Workbook();
      const meta = workbook.addWorksheet(SHEET_NAMES.METADATA);
      meta.addRow(['template_type', 'mazas_v1']);
      meta.addRow(['version', '1']);

      const parts = workbook.addWorksheet(SHEET_NAMES.PARTS);
      parts.addRow(['SKU', 'Marca', 'Nombre del Producto']);

      const apps = workbook.addWorksheet(SHEET_NAMES.APPLICATIONS);
      apps.addRow([
        'SKU del Producto',
        'Marca del Vehículo',
        'Modelo del Vehículo',
        'Año Inicio',
        'Año Fin',
      ]);

      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await service.parse(buffer);

      expect(result.parts).toHaveLength(0);
      expect(result.applications).toHaveLength(0);
    });

    it('converts cells with string numbers to their original type', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('mazas_v1')
        .addPart({ price: 99.5, quantity: 25 })
        .addApplication(DEFAULT_PART.sku, { yearStart: 2015, yearEnd: 2020 })
        .build();

      const result = await service.parse(buffer);
      // ExcelJS preserves number types
      expect(typeof result.parts[0].data[COMMON_PART_COLUMNS.PRICE.es]).toBe('number');
      expect(typeof result.parts[0].data[COMMON_PART_COLUMNS.QUANTITY.es]).toBe('number');
    });
  });

  // -------------------------------------------------------------------------
  // Bulk / performance
  // -------------------------------------------------------------------------

  describe('bulk parsing', () => {
    it('parses 100 parts + 100 applications', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('mazas_v1')
        .addParts(100)
        .addApplicationsForAllParts()
        .build();

      const result = await service.parse(buffer);
      expect(result.parts).toHaveLength(100);
      expect(result.applications).toHaveLength(100);
    });

    it('parses 1000 parts in under 5 seconds', async () => {
      const buffer = await TestWorkbookBuilder.forTemplate('mazas_v1')
        .addParts(1000)
        .addApplicationsForAllParts()
        .build();

      const start = performance.now();
      const result = await service.parse(buffer);
      const elapsed = performance.now() - start;

      expect(result.parts).toHaveLength(1000);
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
