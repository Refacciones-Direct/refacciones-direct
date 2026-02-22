/**
 * Import pipeline barrel export.
 */

// Types
export type {
  TemplateAttribute,
  TemplateConfig,
  NormalizerName,
  ParsedMetadata,
  RawPartRow,
  RawAppRow,
  ParsedFile,
  ErrorType,
  RowError,
  NormalizationRecord,
  ValidatedPartRow,
  ValidatedAppRow,
  ValidationSummary,
  ValidationResult,
  ImportCounts,
  ImportResult,
  UploadResponse,
  PreviewResponse,
  ExecuteResponse,
  ErrorReportInput,
  ImportJobInsert,
  ImportJobUpdate,
} from './types';

// Constants
export {
  SHEET_NAMES,
  METADATA_KEYS,
  COMMON_PART_COLUMNS,
  APPLICATION_COLUMNS,
  MAX_FILE_SIZE_BYTES,
  BATCH_SIZE,
  MIN_PRICE_MXN,
  DEFAULT_DATA_START_ROW,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_EXTENSIONS,
  ERROR_COLUMN_HEADER,
} from './constants';

// Template Registry
export {
  TEMPLATE_REGISTRY,
  getTemplateConfig,
  getTemplateTypes,
  getTemplateEntries,
} from './template-registry';

// Services
export { ExcelParseService, ExcelParseError } from './excel-parse.service';
export { ValidationEngine } from './validation-engine';
export type { DuplicateChecker, StalenessChecker } from './validation-engine';
export { ImportExecutor } from './import-executor';
export { ErrorReportGenerator } from './error-report-generator';
export { TemplateGenerator } from './template-generator';
export { ExportService } from './export.service';
