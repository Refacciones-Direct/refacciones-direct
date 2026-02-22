/**
 * Shared types for the import pipeline (Mode 1: Add New Parts).
 *
 * These types flow through the pipeline stages:
 *   ExcelParseService → ValidationEngine → ImportExecutor → ErrorReportGenerator
 */

import type { Json } from '@/types/database';

// ---------------------------------------------------------------------------
// Template Registry Types
// ---------------------------------------------------------------------------

export type NormalizerName = 'normalizePosition' | 'normalizeDriveType' | 'normalizeText';

export interface TemplateAttribute {
  /** Key stored in parts.attributes JSONB */
  field: string;
  /** Excel column header (Spanish) */
  header_es: string;
  /** Excel column header (English) */
  header_en: string;
  /** Input type for validation / template generation */
  type: 'dropdown' | 'string' | 'number';
  /** Whether the attribute is required */
  required: boolean;
  /** Validation constraints */
  validation?: {
    values?: string[];
    min?: number;
    max?: number;
  };
  /** Normalizer function name from src/lib/normalize.ts */
  normalizer?: NormalizerName;
}

export interface TemplateConfig {
  /** Human-readable display name */
  displayName: string;
  /** Value for parts.part_type column */
  partType: string;
  /** Matches categories.slug in DB */
  categorySlug: string;
  /** Template format version */
  version: string;
  /** Excel row where data begins (1-indexed, after header rows) */
  dataStartRow: number;
  /** Category-specific attributes */
  attributes: TemplateAttribute[];
}

// ---------------------------------------------------------------------------
// Excel Parse Types
// ---------------------------------------------------------------------------

export interface ParsedMetadata {
  templateType: string;
  version: string;
  exportTimestamp?: string;
}

export interface RawPartRow {
  /** Excel row number (1-indexed) */
  rowNumber: number;
  /** Raw cell values keyed by column header */
  data: Record<string, unknown>;
}

export interface RawAppRow {
  /** Excel row number (1-indexed) */
  rowNumber: number;
  /** Raw cell values keyed by column header */
  data: Record<string, unknown>;
}

export interface ParsedFile {
  metadata: ParsedMetadata;
  templateConfig: TemplateConfig;
  parts: RawPartRow[];
  applications: RawAppRow[];
}

// ---------------------------------------------------------------------------
// Validation Types
// ---------------------------------------------------------------------------

export type ErrorType =
  | 'missing_required'
  | 'invalid_format'
  | 'invalid_value'
  | 'duplicate_sku'
  | 'sku_not_found'
  | 'invalid_year_range'
  | 'price_too_low'
  | 'unknown_template';

export interface RowError {
  rowNumber: number;
  sheetName: string;
  errorType: ErrorType;
  errorMessage: string;
  fieldName?: string;
  originalData: Record<string, unknown>;
}

export interface NormalizationRecord {
  rowNumber: number;
  sheetName: string;
  field: string;
  originalValue: string;
  normalizedValue: string;
}

export interface ValidatedPartRow {
  rowNumber: number;
  sku: string;
  factoryPartNumber?: string;
  upc?: string;
  brand: string;
  name: string;
  description?: string;
  price: number | null;
  quantity: number;
  imageUrls: string[];
  attributes: Record<string, unknown>;
  oeNumbers: { original: string; normalized: string; brand?: string }[];
}

export interface ValidatedAppRow {
  rowNumber: number;
  sku: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  engine?: string;
  submodel?: string;
}

export interface ValidationSummary {
  totalPartRows: number;
  validPartRows: number;
  totalAppRows: number;
  validAppRows: number;
  splitAppRows: number;
  errors: number;
  normalizations: number;
}

export interface ValidationResult {
  valid: boolean;
  summary: ValidationSummary;
  /** Registry key (e.g., "mazas_v1") */
  templateType: string;
  templateConfig: TemplateConfig;
  validParts: ValidatedPartRow[];
  validApplications: ValidatedAppRow[];
  errors: RowError[];
  normalizations: NormalizationRecord[];
  staleWarning?: string;
}

// ---------------------------------------------------------------------------
// Import Executor Types
// ---------------------------------------------------------------------------

export interface ImportCounts {
  partsInserted: number;
  partsFailed: number;
  vehiclesUpserted: number;
  fitmentsInserted: number;
  fitmentsFailed: number;
  oeCrossrefsInserted: number;
}

export interface ImportResult {
  success: boolean;
  importJobId: number;
  counts: ImportCounts;
  errors: RowError[];
  errorFileUrl?: string;
}

// ---------------------------------------------------------------------------
// API Route Types
// ---------------------------------------------------------------------------

export interface UploadResponse {
  fileUrl: string;
}

export interface PreviewResponse {
  validation: ValidationResult;
}

export interface ExecuteResponse {
  result: ImportResult;
}

// ---------------------------------------------------------------------------
// Error Report Types
// ---------------------------------------------------------------------------

export interface ErrorReportInput {
  errors: RowError[];
  templateConfig: TemplateConfig;
}

// ---------------------------------------------------------------------------
// Import Job DB types (for insert/update)
// ---------------------------------------------------------------------------

export interface ImportJobInsert {
  manufacturer_id: number;
  import_type: 'new_parts';
  template_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  total_rows?: number;
  normalizations_applied?: Json;
}

export interface ImportJobUpdate {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  successful_rows?: number;
  failed_rows?: number;
  error_file_url?: string;
  normalizations_applied?: Json;
  started_at?: string;
  completed_at?: string;
}
