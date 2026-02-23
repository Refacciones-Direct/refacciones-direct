/**
 * Quick script to parse + validate Humberto's mazas template through our import pipeline.
 * Usage: npx.cmd tsx scripts/preview-import.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ExcelParseService, ValidationEngine } from '../src/services/import/index.js';

const filePath = resolve('docs/RefaccionesDirect_Mazas_Template_v1.xlsx');
const buffer = readFileSync(filePath);

console.log(`\nFile: ${filePath}`);
console.log(`Size: ${(buffer.byteLength / 1024).toFixed(1)} KB\n`);

// Parse
const parser = new ExcelParseService();
const parsed = await parser.parse(buffer);

console.log('=== PARSE RESULTS ===');
console.log(`Template type: ${parsed.metadata.templateType}`);
console.log(`Version: ${parsed.metadata.version}`);
console.log(`Export timestamp: ${parsed.metadata.exportTimestamp ?? '(none)'}`);
console.log(`Parts rows: ${parsed.parts.length}`);
console.log(`Application rows: ${parsed.applications.length}`);
console.log('');

// Show first part row as sample
if (parsed.parts.length > 0) {
  console.log('--- Sample part row (row #2) ---');
  const sample = parsed.parts[0];
  for (const [key, value] of Object.entries(sample.data)) {
    if (value !== undefined && value !== null && value !== '') {
      console.log(`  ${key}: ${value}`);
    }
  }
  console.log('');
}

// Show first app row as sample
if (parsed.applications.length > 0) {
  console.log('--- Sample application row (row #2) ---');
  const sample = parsed.applications[0];
  for (const [key, value] of Object.entries(sample.data)) {
    if (value !== undefined && value !== null && value !== '') {
      console.log(`  ${key}: ${value}`);
    }
  }
  console.log('');
}

// Validate (no DB duplicate checker — we're offline)
const engine = new ValidationEngine();
const validation = await engine.validate(parsed, 1);

console.log('=== VALIDATION RESULTS ===');
console.log(`Valid: ${validation.valid}`);
console.log(`Template: ${validation.templateType}`);
console.log('');
console.log('Summary:');
console.log(`  Total part rows:  ${validation.summary.totalPartRows}`);
console.log(`  Valid part rows:  ${validation.summary.validPartRows}`);
console.log(`  Total app rows:   ${validation.summary.totalAppRows}`);
console.log(`  Valid app rows:   ${validation.summary.validAppRows}`);
console.log(`  Split app rows:   ${validation.summary.splitAppRows}`);
console.log(`  Errors:           ${validation.summary.errors}`);
console.log(`  Normalizations:   ${validation.summary.normalizations}`);
console.log('');

if (validation.staleWarning) {
  console.log(`Stale warning: ${validation.staleWarning}`);
  console.log('');
}

// Show errors grouped by type
if (validation.errors.length > 0) {
  console.log('=== ERRORS ===');
  const byType = new Map<string, typeof validation.errors>();
  for (const err of validation.errors) {
    const list = byType.get(err.errorType) ?? [];
    list.push(err);
    byType.set(err.errorType, list);
  }
  for (const [type, errors] of byType) {
    console.log(`\n${type} (${errors.length}):`);
    for (const err of errors.slice(0, 5)) {
      console.log(
        `  Row ${err.rowNumber} [${err.sheetName}] ${err.fieldName ?? ''}: ${err.errorMessage}`,
      );
    }
    if (errors.length > 5) {
      console.log(`  ... and ${errors.length - 5} more`);
    }
  }
  console.log('');
}

// Show normalizations sample
if (validation.normalizations.length > 0) {
  console.log('=== NORMALIZATIONS (first 10) ===');
  for (const norm of validation.normalizations.slice(0, 10)) {
    console.log(
      `  Row ${norm.rowNumber} [${norm.sheetName}] ${norm.field}: "${norm.originalValue}" → "${norm.normalizedValue}"`,
    );
  }
  if (validation.normalizations.length > 10) {
    console.log(`  ... and ${validation.normalizations.length - 10} more`);
  }
  console.log('');
}

// Show valid parts summary
if (validation.validParts.length > 0) {
  console.log('=== VALID PARTS SAMPLE (first 5) ===');
  for (const part of validation.validParts.slice(0, 5)) {
    console.log(
      `  SKU: ${part.sku} | ${part.brand} | ${part.name} | $${part.price} | qty: ${part.quantity} | status: ${part.price !== null && part.price >= 35 && part.quantity > 0 && part.imageUrls.length > 0 ? 'active' : 'draft'}`,
    );
  }
  console.log('');
}

console.log('Done.');
