import { describe, expect, it } from 'vitest';

import {
  extractBoltCount,
  normalizeDriveType,
  normalizeMake,
  normalizeModel,
  normalizeOeNumber,
  normalizePosition,
  normalizePrice,
  normalizeText,
  normalizeUpc,
} from './normalize';

describe('normalizeMake', () => {
  it('maps known makes to canonical form', () => {
    expect(normalizeMake('CHEVROLET')).toBe('Chevrolet');
    expect(normalizeMake('chevy')).toBe('Chevrolet');
    expect(normalizeMake('vw')).toBe('Volkswagen');
    expect(normalizeMake('MERCEDES-BENZ')).toBe('Mercedes-Benz');
    expect(normalizeMake('benz')).toBe('Mercedes-Benz');
    expect(normalizeMake('bmw')).toBe('BMW');
    expect(normalizeMake('gmc')).toBe('GMC');
  });

  it('title-cases unknown makes', () => {
    expect(normalizeMake('CHANGAN')).toBe('Changan');
    expect(normalizeMake('byd')).toBe('Byd');
  });

  it('trims whitespace', () => {
    expect(normalizeMake('  FORD  ')).toBe('Ford');
  });
});

describe('normalizeModel', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeModel('  SILVERADO  1500  ')).toBe('SILVERADO 1500');
    expect(normalizeModel('Camry')).toBe('Camry');
  });
});

describe('normalizePosition', () => {
  it('maps Spanish positions to English', () => {
    expect(normalizePosition('DELANTERA')).toBe('Front');
    expect(normalizePosition('TRASERA')).toBe('Rear');
    expect(normalizePosition('DELANTERA DERECHA')).toBe('Front Right');
    expect(normalizePosition('TRASERA IZQUIERDA')).toBe('Rear Left');
    expect(normalizePosition('TRASERA CON ARBOL')).toBe('Rear With Axle');
  });

  it('maps English positions', () => {
    expect(normalizePosition('Front')).toBe('Front');
    expect(normalizePosition('REAR')).toBe('Rear');
  });

  it('passes through unknown positions', () => {
    expect(normalizePosition('Custom Position')).toBe('Custom Position');
  });
});

describe('normalizeDriveType', () => {
  it('normalizes common drive types', () => {
    expect(normalizeDriveType('4X4')).toBe('4WD');
    expect(normalizeDriveType('4x2')).toBe('2WD');
    expect(normalizeDriveType('AWD')).toBe('AWD');
    expect(normalizeDriveType('4X2/4X4')).toBe('2WD/4WD');
    expect(normalizeDriveType('4X2 DOBLE RODADA')).toBe('2WD Dually');
  });

  it('passes through unknown drive types', () => {
    expect(normalizeDriveType('Electric')).toBe('Electric');
  });
});

describe('normalizeText', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeText('  hello   world  ')).toBe('hello world');
  });

  it('strips zero-width characters', () => {
    expect(normalizeText('test\u200Bvalue\uFEFF')).toBe('testvalue');
  });
});

describe('normalizeUpc', () => {
  it('accepts valid UPCs (8-14 digits)', () => {
    expect(normalizeUpc('12345678')).toBe('12345678');
    expect(normalizeUpc('012345678901')).toBe('012345678901');
  });

  it('strips non-digit characters', () => {
    expect(normalizeUpc('123-456-789-012')).toBe('123456789012');
  });

  it('rejects too short/long UPCs', () => {
    expect(normalizeUpc('1234567')).toBeNull();
    expect(normalizeUpc('123456789012345')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(normalizeUpc('abc')).toBeNull();
  });
});

describe('normalizePrice', () => {
  it('accepts prices >= 35 MXN', () => {
    expect(normalizePrice(100)).toBe(100);
    expect(normalizePrice('249.99')).toBe(249.99);
    expect(normalizePrice(35)).toBe(35);
  });

  it('rejects prices below minimum', () => {
    expect(normalizePrice(20)).toBeNull();
    expect(normalizePrice('34.99')).toBeNull();
  });

  it('rounds to 2 decimal places', () => {
    expect(normalizePrice(99.999)).toBe(100);
    expect(normalizePrice('150.456')).toBe(150.46);
  });

  it('rejects NaN', () => {
    expect(normalizePrice('abc')).toBeNull();
    expect(normalizePrice(NaN)).toBeNull();
  });
});

describe('extractBoltCount', () => {
  it('extracts leading integer from compound values', () => {
    expect(extractBoltCount('5 (M12X1.5)')).toBe(5);
    expect(extractBoltCount('6 (M14X1.5)')).toBe(6);
  });

  it('extracts plain integers', () => {
    expect(extractBoltCount('5')).toBe(5);
    expect(extractBoltCount('8')).toBe(8);
  });

  it('returns null for non-numeric input', () => {
    expect(extractBoltCount('abc')).toBeNull();
    expect(extractBoltCount('')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(extractBoltCount('  5  ')).toBe(5);
  });
});

describe('normalizeOeNumber', () => {
  it('preserves original and creates normalized version', () => {
    const result = normalizeOeNumber('  AB-123.456 ');
    expect(result.original).toBe('AB-123.456');
    expect(result.normalized).toBe('AB123456');
  });

  it('uppercases the normalized version', () => {
    const result = normalizeOeNumber('abc-def');
    expect(result.normalized).toBe('ABCDEF');
  });
});
