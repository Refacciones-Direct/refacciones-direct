/**
 * Shared constants for the import pipeline.
 */

// ---------------------------------------------------------------------------
// Sheet names (Spanish — what the manufacturer sees)
// ---------------------------------------------------------------------------

export const SHEET_NAMES = {
  METADATA: 'Metadata',
  PARTS: 'Partes',
  APPLICATIONS: 'Aplicaciones',
  ERRORS_PARTS: 'Partes con Errores',
  ERRORS_APPLICATIONS: 'Aplicaciones con Errores',
} as const;

// ---------------------------------------------------------------------------
// Metadata sheet keys
// ---------------------------------------------------------------------------

export const METADATA_KEYS = {
  TEMPLATE_TYPE: 'template_type',
  VERSION: 'version',
  EXPORT_TIMESTAMP: 'export_timestamp',
} as const;

// ---------------------------------------------------------------------------
// Common column headers shared across all templates
// ---------------------------------------------------------------------------

export const COMMON_PART_COLUMNS = {
  SKU: { es: 'SKU', en: 'SKU' },
  BRAND: { es: 'Marca', en: 'Brand' },
  NAME: { es: 'Nombre del Producto', en: 'Product Name' },
  CONDITION: { es: 'Condición', en: 'Condition' },
  DESCRIPTION: { es: 'Descripción', en: 'Description' },
  PRICE: { es: 'Precio (MXN)', en: 'Price (MXN)' },
  QUANTITY: { es: 'Stock', en: 'Stock' },
  OE_NUMBERS: { es: 'Números OEM', en: 'OEM Numbers' },
  IMAGE_URL_1: { es: 'Foto Frente', en: 'Photo Front' },
  IMAGE_URL_2: { es: 'Foto Atrás', en: 'Photo Back' },
  IMAGE_URL_3: { es: 'Foto Arriba', en: 'Photo Top' },
  IMAGE_URL_4: { es: 'Foto Otra', en: 'Photo Other' },
} as const;

export const APPLICATION_COLUMNS = {
  SKU: { es: 'SKU del Producto', en: 'Product SKU' },
  MAKE: { es: 'Marca del Vehículo', en: 'Vehicle Make' },
  MODEL: { es: 'Modelo del Vehículo', en: 'Vehicle Model' },
  YEAR_START: { es: 'Año Inicio', en: 'Year Start' },
  YEAR_END: { es: 'Año Fin', en: 'Year End' },
} as const;

// ---------------------------------------------------------------------------
// File size limits
// ---------------------------------------------------------------------------

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Batch sizes
// ---------------------------------------------------------------------------

export const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Price threshold (MXN)
// ---------------------------------------------------------------------------

export const MIN_PRICE_MXN = 35;

// ---------------------------------------------------------------------------
// Template data start row default (row 3 = first data row after header + help text)
// ---------------------------------------------------------------------------

export const DEFAULT_DATA_START_ROW = 3;

// ---------------------------------------------------------------------------
// Supported file types
// ---------------------------------------------------------------------------

export const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const SUPPORTED_EXTENSIONS = ['.xlsx'] as const;

// ---------------------------------------------------------------------------
// Error column appended to error report sheets
// ---------------------------------------------------------------------------

export const ERROR_COLUMN_HEADER = { es: 'Error', en: 'Error' } as const;
