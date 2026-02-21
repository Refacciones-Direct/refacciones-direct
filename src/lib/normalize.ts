/**
 * Server-side normalization functions for the import pipeline.
 *
 * These transform raw manufacturer data into canonical forms during import.
 * Vehicle alias resolution is separate (search-time, not import-time).
 *
 * @see docs/RefaccionesDirect_DataArchitectureSpec_v5_1.md Section 2.6
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Make normalization
// ---------------------------------------------------------------------------

const MAKE_MAP: Record<string, string> = {
  CHEVROLET: 'Chevrolet',
  CHEVY: 'Chevrolet',
  FORD: 'Ford',
  NISSAN: 'Nissan',
  TOYOTA: 'Toyota',
  VOLKSWAGEN: 'Volkswagen',
  VW: 'Volkswagen',
  BMW: 'BMW',
  DODGE: 'Dodge',
  RAM: 'Ram',
  CHRYSLER: 'Chrysler',
  JEEP: 'Jeep',
  GMC: 'GMC',
  HONDA: 'Honda',
  HYUNDAI: 'Hyundai',
  KIA: 'Kia',
  MAZDA: 'Mazda',
  'MERCEDES-BENZ': 'Mercedes-Benz',
  MERCEDES: 'Mercedes-Benz',
  BENZ: 'Mercedes-Benz',
  AUDI: 'Audi',
  SUBARU: 'Subaru',
  MITSUBISHI: 'Mitsubishi',
  ACURA: 'Acura',
  LEXUS: 'Lexus',
  INFINITI: 'Infiniti',
  CADILLAC: 'Cadillac',
  BUICK: 'Buick',
  LINCOLN: 'Lincoln',
  VOLVO: 'Volvo',
  MINI: 'MINI',
  FIAT: 'FIAT',
  PEUGEOT: 'Peugeot',
  RENAULT: 'Renault',
  SEAT: 'SEAT',
  SUZUKI: 'Suzuki',
};

export function normalizeMake(value: string): string {
  const trimmed = value.trim();
  return MAKE_MAP[trimmed.toUpperCase()] ?? titleCase(trimmed);
}

// ---------------------------------------------------------------------------
// Model normalization
// ---------------------------------------------------------------------------

export function normalizeModel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Position normalization (bilingual → English canonical)
// ---------------------------------------------------------------------------

const POSITION_MAP: Record<string, string> = {
  FRONT: 'Front',
  REAR: 'Rear',
  DELANTERA: 'Front',
  DELANTERO: 'Front',
  TRASERA: 'Rear',
  TRASERO: 'Rear',
  'DEL/TRA': 'Front/Rear',
  'DELANTERO/TRASERA': 'Front/Rear',
  'DELANTERA/TRASERA': 'Front/Rear',
  'DELANTERA DERECHA': 'Front Right',
  'DELANTERA IZQUIERDA': 'Front Left',
  'TRASERA DERECHA': 'Rear Right',
  'TRASERA IZQUIERDA': 'Rear Left',
  'TRASERA "L"': 'Rear Left',
  'TRASERA "R"': 'Rear Right',
  'TRASERA CON ARBOL': 'Rear With Axle',
};

export function normalizePosition(value: string): string {
  const trimmed = value.trim();
  return POSITION_MAP[trimmed.toUpperCase()] ?? trimmed;
}

// ---------------------------------------------------------------------------
// Drive type normalization
// ---------------------------------------------------------------------------

const DRIVE_TYPE_MAP: Record<string, string> = {
  '4X4': '4WD',
  '4x4': '4WD',
  '4WD': '4WD',
  AWD: 'AWD',
  '4X2': '2WD',
  '4x2': '2WD',
  '2WD': '2WD',
  FWD: 'FWD',
  RWD: 'RWD',
  '4X2 / 4X4': '2WD/4WD',
  '4X2/4X4': '2WD/4WD',
  '4X2, 4X4': '2WD/4WD',
  '4X2,4X4': '2WD/4WD',
  '4X2 DOBLE RODADA': '2WD Dually',
  '4X4 DOBLE RODADA': '4WD Dually',
};

export function normalizeDriveType(value: string): string {
  const trimmed = value.trim();
  return DRIVE_TYPE_MAP[trimmed.toUpperCase()] ?? trimmed;
}

// ---------------------------------------------------------------------------
// General text normalization (trim + collapse whitespace + strip zero-width)
// ---------------------------------------------------------------------------

export function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

// ---------------------------------------------------------------------------
// UPC validation — returns cleaned digits or null if invalid
// ---------------------------------------------------------------------------

export function normalizeUpc(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 14 ? digits : null;
}

// ---------------------------------------------------------------------------
// Price validation — returns rounded cents or null if below minimum
// ---------------------------------------------------------------------------

const MIN_PRICE_MXN = 35;

export function normalizePrice(
  value: string | number,
): number | null {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num) || num < MIN_PRICE_MXN) return null;
  return Math.round(num * 100) / 100;
}

// ---------------------------------------------------------------------------
// OE number normalization — uppercase, strip spaces/hyphens/dots
// ---------------------------------------------------------------------------

export function normalizeOeNumber(value: string): {
  original: string;
  normalized: string;
} {
  return {
    original: value.trim(),
    normalized: value.toUpperCase().replace(/[\s\-.]/g, ''),
  };
}
