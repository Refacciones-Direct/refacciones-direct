/**
 * Deterministic test constants for import pipeline tests.
 */

export const CATALOG_STATS = {
  SMALL: { parts: 10, fitments: 26, vehicles: 20 },
  MEDIUM: { parts: 100, fitments: 260, vehicles: 80 },
  LARGE: { parts: 500, fitments: 1300, vehicles: 200 },
} as const;

export const TEST_MANUFACTURER_ID = 1;

export const DEFAULT_PART = {
  sku: 'TEST-001',
  brand: 'TestBrand',
  name: 'Test Part',
  description: 'A test part for unit tests',
  price: 150.0,
  quantity: 10,
  imageUrl1: 'https://example.com/img1.jpg',
  oeNumbers: '12345-ABC, 67890-DEF',
} as const;

export const DEFAULT_APPLICATION = {
  sku: 'TEST-001',
  make: 'CHEVROLET',
  model: 'Silverado 1500',
  yearStart: 2014,
  yearEnd: 2020,
} as const;

export const DEFAULT_MAZA_ATTRIBUTES = {
  position: 'Front',
  absType: 'ABS Integrado',
  boltCount: '6',
  driveType: '4WD',
} as const;

/** SKUs known to NOT exist in the DB (for duplicate checking tests) */
export const UNUSED_SKUS = ['NONEXISTENT-001', 'NONEXISTENT-002', 'NONEXISTENT-003'] as const;

/** Template type used for most tests */
export const TEST_TEMPLATE_TYPE = 'mazas_v1' as const;
