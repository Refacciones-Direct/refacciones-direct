/**
 * Export a manufacturer's catalog from local Supabase as .xlsx.
 * Simulates what the "Export Excel" button would do in the UI.
 *
 * Usage: npx.cmd tsx scripts/export-catalog.ts
 *
 * Prerequisites:
 *   - `npx.cmd supabase start` (local Supabase running)
 *   - Data already imported (run scripts/test-import-db.ts first)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ExportService } from '../src/services/import/index.js';

// Local Supabase credentials (from `supabase status -o env`)
const SUPABASE_URL = 'http://127.0.0.1:54331';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const MANUFACTURER_ID = 1;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('Exporting catalog from local Supabase...\n');

const exportService = new ExportService(adminClient);
const { buffer, filename } = await exportService.export(MANUFACTURER_ID, 'mazas_v1');

// Write to scripts/output/ (gitignored throwaway location)
const outputDir = resolve('scripts/output');
mkdirSync(outputDir, { recursive: true });
const outputPath = resolve(outputDir, filename);
writeFileSync(outputPath, buffer);

console.log(`Exported: ${outputPath}`);
console.log(`Size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
console.log('\nDone.');
