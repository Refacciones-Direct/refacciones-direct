import { describe, it, expect, vi } from 'vitest';
import { ValidationEngine } from '../validation-engine';
import type { DuplicateChecker, StalenessChecker } from '../validation-engine';
import { ExcelParseService } from '../excel-parse.service';
import { TestWorkbookBuilder } from './helpers/test-workbook-builder';
import { DEFAULT_PART, DEFAULT_APPLICATION, TEST_MANUFACTURER_ID } from './helpers/test-constants';
import { SHEET_NAMES } from '../constants';

const parser = new ExcelParseService();

/** Helper: build, parse, and validate in one step */
async function parseAndValidate(
  builder: TestWorkbookBuilder,
  opts?: {
    duplicateChecker?: DuplicateChecker;
    stalenessChecker?: StalenessChecker;
  },
) {
  const buffer = await builder.build();
  const parsed = await parser.parse(buffer);
  const engine = new ValidationEngine(opts?.duplicateChecker, opts?.stalenessChecker);
  return engine.validate(parsed, TEST_MANUFACTURER_ID);
}

describe('ValidationEngine', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('validates a minimal valid file with no errors', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addPart().addApplication(DEFAULT_PART.sku),
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validParts).toHaveLength(1);
      expect(result.validApplications).toHaveLength(1);
    });

    it('produces correct summary counts', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addParts(5).addApplicationsForAllParts(),
      );

      expect(result.summary.totalPartRows).toBe(5);
      expect(result.summary.validPartRows).toBe(5);
      expect(result.summary.totalAppRows).toBe(5);
      expect(result.summary.validAppRows).toBe(5);
      expect(result.summary.errors).toBe(0);
    });

    it('extracts validated part fields correctly', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({
            sku: 'HUB-200',
            brand: 'ACR',
            name: 'Hub Assembly',
            price: 250.5,
            quantity: 15,
            imageUrl1: 'https://example.com/img.jpg',
            oeNumbers: '12345-ABC',
          })
          .addApplication('HUB-200'),
      );

      const part = result.validParts[0];
      expect(part.sku).toBe('HUB-200');
      expect(part.brand).toBe('ACR');
      expect(part.name).toBe('Hub Assembly');
      expect(part.price).toBe(250.5);
      expect(part.quantity).toBe(15);
      expect(part.imageUrls).toEqual(['https://example.com/img.jpg']);
      expect(part.oeNumbers).toHaveLength(1);
      expect(part.oeNumbers[0].original).toBe('12345-ABC');
    });

    it('extracts validated application fields correctly', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addPart().addApplication(DEFAULT_PART.sku, {
          make: 'FORD',
          model: 'F-150',
          yearStart: 2018,
          yearEnd: 2023,
        }),
      );

      const app = result.validApplications[0];
      expect(app.sku).toBe(DEFAULT_PART.sku);
      expect(app.make).toBe('Ford'); // Normalized
      expect(app.model).toBe('F-150');
      expect(app.yearStart).toBe(2018);
      expect(app.yearEnd).toBe(2023);
    });

    it('extracts condition when provided', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ condition: 'Nuevo' })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.validParts[0].condition).toBe('Nuevo');
    });

    it('condition is undefined when not provided', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addPart().addApplication(DEFAULT_PART.sku),
      );

      expect(result.validParts[0].condition).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Required field errors
  // -------------------------------------------------------------------------

  describe('required field errors', () => {
    it('flags missing SKU in Partes', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ sku: '' })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'missing_required',
          sheetName: SHEET_NAMES.PARTS,
          fieldName: 'SKU',
        }),
      );
    });

    it('flags missing Brand', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ brand: '' })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'missing_required',
          fieldName: expect.stringContaining('Marca'),
        }),
      );
    });

    it('flags missing Name', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ name: '' })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'missing_required',
          fieldName: expect.stringContaining('Nombre'),
        }),
      );
    });

    it('accepts missing optional attribute (position for mazas)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({
            attributes: {
              'Tipo de ABS': 'ABS Integrado',
              Barrenos: '6',
            },
          })
          .addApplication(DEFAULT_PART.sku),
      );

      // All mazas attributes are optional for MVP — missing Posición should not error
      expect(result.errors).toHaveLength(0);
      expect(result.validParts).toHaveLength(1);
    });

    it('flags missing Make in Aplicaciones', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart()
          .addApplication(DEFAULT_PART.sku, { make: '' }),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'missing_required',
          sheetName: SHEET_NAMES.APPLICATIONS,
        }),
      );
    });

    it('flags missing Year Start', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart()
          .addApplication(DEFAULT_PART.sku, { yearStart: '' as unknown as number }),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'missing_required',
          sheetName: SHEET_NAMES.APPLICATIONS,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Format errors
  // -------------------------------------------------------------------------

  describe('format errors', () => {
    it('flags invalid image URL', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ imageUrl1: 'not-a-url' })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'invalid_format',
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Price validation
  // -------------------------------------------------------------------------

  describe('price validation', () => {
    it('flags price below minimum (35 MXN)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ price: 20 })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.errors).toContainEqual(expect.objectContaining({ errorType: 'price_too_low' }));
    });

    it('accepts price at minimum (35 MXN)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ price: 35 })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.validParts[0]?.price).toBe(35);
    });

    it('allows empty price (null — part becomes draft)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ price: '' as unknown as number })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.validParts[0]?.price).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Attribute validation
  // -------------------------------------------------------------------------

  describe('attribute validation', () => {
    it('accepts string attributes as free text (mazas)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({
            attributes: {
              Posición: 'CustomPosition',
              'Tipo de ABS': 'ABS Integrado',
              Barrenos: '6',
              'Tipo de Tracción': 'Anything goes',
            },
          })
          .addApplication(DEFAULT_PART.sku),
      );

      // All mazas attributes are type: 'string', so any value is accepted
      expect(result.valid).toBe(true);
      expect(result.validParts[0].attributes.position).toBe('CustomPosition');
      expect(result.validParts[0].attributes.drive_type).toBe('Anything goes');
    });

    it('flags number attribute below minimum (alternadores amperage)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('alternadores_v1')
          .addPart({
            attributes: {
              Amperaje: 5, // min is 10
              Voltaje: '12V',
            },
          })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'invalid_value',
          fieldName: 'Amperaje',
        }),
      );
    });

    it('flags number attribute above maximum (alternadores amperage)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('alternadores_v1')
          .addPart({
            attributes: {
              Amperaje: 999, // max is 500
              Voltaje: '12V',
            },
          })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'invalid_value',
          fieldName: 'Amperaje',
        }),
      );
    });

    it('accepts optional attribute when empty', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({
            attributes: {
              Posición: 'Front',
              'Tipo de ABS': 'ABS Integrado',
              Barrenos: '6',
              'Tipo de Tracción': '', // Optional
            },
          })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.valid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Duplicate SKU detection
  // -------------------------------------------------------------------------

  describe('duplicate SKU detection', () => {
    it('flags duplicate SKU within file', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ sku: 'DUP-001' })
          .addPart({ sku: 'DUP-001' })
          .addApplication('DUP-001'),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'duplicate_sku',
          errorMessage: expect.stringContaining('Duplicate SKU in file'),
        }),
      );
      // Only first occurrence should be valid
      expect(result.validParts).toHaveLength(1);
    });

    it('flags duplicate SKU against database', async () => {
      const mockChecker: DuplicateChecker = {
        checkSkus: vi.fn().mockResolvedValue(new Set(['EXISTING-001'])),
      };

      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ sku: 'EXISTING-001' })
          .addPart({ sku: 'NEW-001' })
          .addApplication('EXISTING-001')
          .addApplication('NEW-001'),
        { duplicateChecker: mockChecker },
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'duplicate_sku',
          errorMessage: expect.stringContaining('already exists in database'),
        }),
      );
      expect(result.validParts).toHaveLength(1);
      expect(result.validParts[0].sku).toBe('NEW-001');
    });
  });

  // -------------------------------------------------------------------------
  // Cross-sheet validation
  // -------------------------------------------------------------------------

  describe('cross-sheet validation', () => {
    it('flags application referencing non-existent SKU', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ sku: 'REAL-001' })
          .addApplication('MISSING-SKU'),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          errorType: 'sku_not_found',
          sheetName: SHEET_NAMES.APPLICATIONS,
        }),
      );
    });

    it('application referencing invalid part is flagged', async () => {
      // Part with missing brand → invalid, so its SKU shouldn't be findable
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ sku: 'BAD-PART', brand: '' })
          .addApplication('BAD-PART'),
      );

      // The part is invalid, so the app should get sku_not_found
      expect(
        result.errors.some(
          (e) => e.errorType === 'sku_not_found' && e.sheetName === SHEET_NAMES.APPLICATIONS,
        ),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Year range validation
  // -------------------------------------------------------------------------

  describe('year range validation', () => {
    it('flags yearEnd < yearStart', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addPart().addApplication(DEFAULT_PART.sku, {
          yearStart: 2020,
          yearEnd: 2015,
        }),
      );

      expect(result.errors).toContainEqual(
        expect.objectContaining({ errorType: 'invalid_year_range' }),
      );
    });

    it('accepts yearEnd == yearStart (single year)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addPart().addApplication(DEFAULT_PART.sku, {
          yearStart: 2020,
          yearEnd: 2020,
        }),
      );

      expect(result.validApplications).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Multi-make splitting
  // -------------------------------------------------------------------------

  describe('multi-make splitting', () => {
    it('splits "CHEVROLET, GMC" into 2 validated app rows', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addPart().addApplication(DEFAULT_PART.sku, {
          make: 'CHEVROLET, GMC',
        }),
      );

      expect(result.validApplications).toHaveLength(2);
      expect(result.validApplications[0].make).toBe('Chevrolet');
      expect(result.validApplications[1].make).toBe('GMC');
      expect(result.summary.splitAppRows).toBe(1);
    });

    it('splits 3-make row correctly', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addPart().addApplication(DEFAULT_PART.sku, {
          make: 'CHEVROLET, GMC, CADILLAC',
        }),
      );

      expect(result.validApplications).toHaveLength(3);
      expect(result.summary.splitAppRows).toBe(2);
    });

    it('records normalization for each split make', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1').addPart().addApplication(DEFAULT_PART.sku, {
          make: 'CHEVY, VW',
        }),
      );

      // CHEVY → Chevrolet, VW → Volkswagen
      const makeNorms = result.normalizations.filter((n) => n.field === 'Make');
      expect(makeNorms).toHaveLength(2);
      expect(makeNorms).toContainEqual(
        expect.objectContaining({
          originalValue: 'CHEVY',
          normalizedValue: 'Chevrolet',
        }),
      );
      expect(makeNorms).toContainEqual(
        expect.objectContaining({
          originalValue: 'VW',
          normalizedValue: 'Volkswagen',
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Normalization recording
  // -------------------------------------------------------------------------

  describe('normalization recording', () => {
    it('records make normalization', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart()
          .addApplication(DEFAULT_PART.sku, { make: 'FORD' }),
      );

      expect(result.normalizations).toContainEqual(
        expect.objectContaining({
          field: 'Make',
          originalValue: 'FORD',
          normalizedValue: 'Ford',
        }),
      );
    });

    it('records OE number normalization', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ oeNumbers: '12-345.ABC' })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.normalizations).toContainEqual(
        expect.objectContaining({
          field: 'OE Number',
          originalValue: '12-345.ABC',
          normalizedValue: '12345ABC',
        }),
      );
    });

    it('does not record normalization when make value is unchanged', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart()
          .addApplication(DEFAULT_PART.sku, { make: 'Chevrolet' }),
      );

      // 'Chevrolet' is already canonical, should not be in normalizations for Make
      expect(result.normalizations.filter((n) => n.field === 'Make')).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // OE number parsing
  // -------------------------------------------------------------------------

  describe('OE number parsing', () => {
    it('splits OE numbers on comma', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ oeNumbers: '12345-ABC, 67890-DEF' })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.validParts[0].oeNumbers).toHaveLength(2);
    });

    it('splits OE numbers on semicolon', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ oeNumbers: '12345-ABC; 67890-DEF' })
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.validParts[0].oeNumbers).toHaveLength(2);
    });

    it('OE numbers have original and normalized fields (no brand)', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ oeNumbers: '12-345.ABC' })
          .addApplication(DEFAULT_PART.sku),
      );

      const oe = result.validParts[0].oeNumbers[0];
      expect(oe).toHaveProperty('original');
      expect(oe).toHaveProperty('normalized');
      expect(oe).not.toHaveProperty('brand');
    });
  });

  // -------------------------------------------------------------------------
  // Staleness check
  // -------------------------------------------------------------------------

  describe('staleness check', () => {
    it('warns when another import happened after export', async () => {
      const mockStaleChecker: StalenessChecker = {
        getLastImportTimestamp: vi.fn().mockResolvedValue('2025-06-20T12:00:00Z'),
      };

      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .setExportTimestamp('2025-06-15T10:00:00Z')
          .addPart()
          .addApplication(DEFAULT_PART.sku),
        { stalenessChecker: mockStaleChecker },
      );

      expect(result.staleWarning).toContain('Another import completed');
    });

    it('no warning when no import happened after export', async () => {
      const mockStaleChecker: StalenessChecker = {
        getLastImportTimestamp: vi.fn().mockResolvedValue('2025-06-10T10:00:00Z'),
      };

      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .setExportTimestamp('2025-06-15T10:00:00Z')
          .addPart()
          .addApplication(DEFAULT_PART.sku),
        { stalenessChecker: mockStaleChecker },
      );

      expect(result.staleWarning).toBeUndefined();
    });

    it('no warning when no staleness checker provided', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .setExportTimestamp('2025-06-15T10:00:00Z')
          .addPart()
          .addApplication(DEFAULT_PART.sku),
      );

      expect(result.staleWarning).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Partial success
  // -------------------------------------------------------------------------

  describe('partial success', () => {
    it('valid parts pass while invalid parts are rejected', async () => {
      const result = await parseAndValidate(
        TestWorkbookBuilder.forTemplate('mazas_v1')
          .addPart({ sku: 'GOOD-001' })
          .addPart({ sku: 'BAD-001', brand: '' })
          .addPart({ sku: 'GOOD-002' })
          .addApplication('GOOD-001')
          .addApplication('GOOD-002'),
      );

      expect(result.validParts).toHaveLength(2);
      expect(result.validParts.map((p) => p.sku)).toEqual(['GOOD-001', 'GOOD-002']);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Bulk validation
  // -------------------------------------------------------------------------

  describe('bulk validation', () => {
    it('validates 100 parts with mixed errors', async () => {
      const builder = TestWorkbookBuilder.forTemplate('mazas_v1');

      // 80 valid parts
      for (let i = 1; i <= 80; i++) {
        builder.addPart({ sku: `GOOD-${String(i).padStart(3, '0')}` });
      }
      // 20 invalid parts (missing brand)
      for (let i = 81; i <= 100; i++) {
        builder.addPart({ sku: `BAD-${String(i).padStart(3, '0')}`, brand: '' });
      }

      // Applications only for valid parts
      for (let i = 1; i <= 80; i++) {
        builder.addApplication(`GOOD-${String(i).padStart(3, '0')}`);
      }

      const result = await parseAndValidate(builder);

      expect(result.summary.totalPartRows).toBe(100);
      expect(result.summary.validPartRows).toBe(80);
      expect(result.summary.validAppRows).toBe(80);
      expect(result.errors.length).toBe(20);
    });
  });
});
