/**
 * Test importing Humberto's mazas file into local Supabase.
 *
 * Usage: npx.cmd tsx scripts/test-import-db.ts
 *
 * Prerequisites:
 *   - `npx.cmd supabase start` (local Supabase running)
 *   - `npx.cmd supabase db reset` if tables are stale
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  ExcelParseService,
  ValidationEngine,
  ImportExecutor,
} from '../src/services/import/index.js';

// Local Supabase credentials (from `supabase status -o env`)
const SUPABASE_URL = 'http://127.0.0.1:54331';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const MANUFACTURER_ID = 1; // Seed data: ACR Automotive Parts

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Read file ───────────────────────────────────────────────
const filePath = resolve(process.argv[2] ?? 'docs/RefaccionesDirect_Mazas_Template_v1.xlsx');
const buffer = readFileSync(filePath);
console.log(`\nFile: ${filePath}`);
console.log(`Size: ${(buffer.byteLength / 1024).toFixed(1)} KB\n`);

// ── Parse ───────────────────────────────────────────────────
const parser = new ExcelParseService();
const parsed = await parser.parse(buffer);
console.log(`Parsed: ${parsed.parts.length} parts, ${parsed.applications.length} applications\n`);

// ── Validate (with DB duplicate check) ──────────────────────
const engine = new ValidationEngine({
  async checkSkus(mfgId: number, skus: string[]) {
    const { data } = await adminClient
      .from('parts')
      .select('sku')
      .eq('manufacturer_id', mfgId)
      .in('sku', skus);
    return new Set((data ?? []).map((r) => r.sku));
  },
});

const validation = await engine.validate(parsed, MANUFACTURER_ID);
console.log('=== VALIDATION ===');
console.log(`Valid: ${validation.valid}`);
console.log(`Valid parts: ${validation.validParts.length}`);
console.log(`Valid apps:  ${validation.validApplications.length}`);
console.log(`Errors:      ${validation.errors.length}`);
console.log('');

if (validation.validParts.length === 0) {
  console.error('No valid parts — aborting import.');
  process.exit(1);
}

// ── Execute import ──────────────────────────────────────────
console.log('=== IMPORTING ===');
const executor = new ImportExecutor(adminClient);
const result = await executor.execute(validation, MANUFACTURER_ID);

console.log(`\nImport ${result.success ? 'SUCCEEDED' : 'completed with errors'}`);
console.log(`Import job ID: ${result.importJobId}`);
console.log('');
console.log('Counts:');
console.log(`  Parts inserted:      ${result.counts.partsInserted}`);
console.log(`  Parts failed:        ${result.counts.partsFailed}`);
console.log(`  Vehicles upserted:   ${result.counts.vehiclesUpserted}`);
console.log(`  Fitments inserted:   ${result.counts.fitmentsInserted}`);
console.log(`  Fitments failed:     ${result.counts.fitmentsFailed}`);
console.log(`  OE crossrefs:        ${result.counts.oeCrossrefsInserted}`);
console.log('');

if (result.errors.length > 0) {
  console.log(`Errors (${result.errors.length}):`);
  for (const err of result.errors.slice(0, 10)) {
    console.log(
      `  Row ${err.rowNumber} [${err.sheetName}] ${err.fieldName ?? ''}: ${err.errorMessage}`,
    );
  }
  if (result.errors.length > 10) {
    console.log(`  ... and ${result.errors.length - 10} more`);
  }
}

// ── Verify by reading back ──────────────────────────────────
console.log('\n=== VERIFICATION ===');

const { count: partsCount } = await adminClient
  .from('parts')
  .select('*', { count: 'exact', head: true })
  .eq('manufacturer_id', MANUFACTURER_ID);

const { count: vehiclesCount } = await adminClient
  .from('vehicles')
  .select('*', { count: 'exact', head: true });

const { count: fitmentsCount } = await adminClient
  .from('fitments')
  .select('*', { count: 'exact', head: true });

const { count: oeCount } = await adminClient
  .from('oe_crossrefs')
  .select('*', { count: 'exact', head: true });

console.log(`Parts in DB:      ${partsCount}`);
console.log(`Vehicles in DB:   ${vehiclesCount}`);
console.log(`Fitments in DB:   ${fitmentsCount}`);
console.log(`OE crossrefs:     ${oeCount}`);

// Sample a few parts
const { data: sampleParts } = await adminClient
  .from('parts')
  .select('sku, brand, name, price, quantity, status, category')
  .eq('manufacturer_id', MANUFACTURER_ID)
  .limit(5);

if (sampleParts && sampleParts.length > 0) {
  console.log('\nSample parts:');
  for (const p of sampleParts) {
    console.log(
      `  ${p.sku} | ${p.brand} | ${p.name} | $${p.price} | qty:${p.quantity} | ${p.status}`,
    );
  }
}

console.log('\nDone.');
