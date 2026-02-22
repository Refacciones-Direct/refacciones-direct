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
  FACTORY_PART_NUMBER: { es: 'Número de Parte Fábrica', en: 'Factory Part Number' },
  UPC: { es: 'UPC', en: 'UPC' },
  BRAND: { es: 'Marca Pieza', en: 'Part Brand' },
  NAME: { es: 'Nombre', en: 'Name' },
  DESCRIPTION: { es: 'Descripción', en: 'Description' },
  PRICE: { es: 'Precio (MXN)', en: 'Price (MXN)' },
  QUANTITY: { es: 'Cantidad', en: 'Quantity' },
  IMAGE_URL_1: { es: 'URL Imagen 1', en: 'Image URL 1' },
  IMAGE_URL_2: { es: 'URL Imagen 2', en: 'Image URL 2' },
  IMAGE_URL_3: { es: 'URL Imagen 3', en: 'Image URL 3' },
  OE_NUMBERS: { es: 'Números OE (separados por coma)', en: 'OE Numbers (comma separated)' },
  OE_BRAND: { es: 'Marca OE', en: 'OE Brand' },
} as const;

export const APPLICATION_COLUMNS = {
  SKU: { es: 'SKU', en: 'SKU' },
  MAKE: { es: 'Marca Vehículo', en: 'Vehicle Make' },
  MODEL: { es: 'Modelo', en: 'Model' },
  YEAR_START: { es: 'Año Inicio', en: 'Year Start' },
  YEAR_END: { es: 'Año Fin', en: 'Year End' },
  ENGINE: { es: 'Motor', en: 'Engine' },
  SUBMODEL: { es: 'Submodelo', en: 'Submodel' },
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
// Template data start row default (row 2 = first data row after header)
// ---------------------------------------------------------------------------

export const DEFAULT_DATA_START_ROW = 2;

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
