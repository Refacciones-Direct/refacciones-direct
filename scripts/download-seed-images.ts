/**
 * One-time script: Download product images from ACR's public storage
 * for SKUs that match our mazas catalog.
 *
 * Reads both Excel files, cross-references SKUs, downloads .jpg files,
 * and saves them to fixtures/seed-images/{SKU}/{position}.jpg.
 *
 * Usage: npx.cmd tsx scripts/download-seed-images.ts
 *
 * Idempotent: skips files that already exist.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import ExcelJS from 'exceljs';

const ACR_FILE = resolve('docs/acr-catalog-export-2026-02-19.xlsx');
const MAZAS_FILE = resolve('scripts/output/catalog_mazas_2026-02-23.xlsx');
const OUTPUT_DIR = resolve('fixtures/seed-images');

const POSITION_NAMES = ['front', 'back', 'top', 'other'] as const;
const IMAGE_COLUMNS = [22, 23, 24, 25]; // Columns V-Y in ACR Parts sheet

// ── Read mazas catalog SKUs ─────────────────────────────────
const mazas = new ExcelJS.Workbook();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await mazas.xlsx.load(readFileSync(MAZAS_FILE) as any);
const mazasSheet = mazas.getWorksheet('Partes')!;

const mazasSkus = new Set<string>();
for (let i = 3; i <= mazasSheet.rowCount; i++) {
  const sku = String(mazasSheet.getRow(i).getCell(1).value || '').trim();
  if (sku) mazasSkus.add(sku);
}
console.log(`Mazas catalog: ${mazasSkus.size} SKUs`);

// ── Read ACR catalog and find matching SKUs with images ─────
const acr = new ExcelJS.Workbook();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await acr.xlsx.load(readFileSync(ACR_FILE) as any);
const partsSheet = acr.getWorksheet('Parts')!;

const downloads: Array<{ sku: string; position: string; url: string }> = [];

for (let i = 4; i <= partsSheet.rowCount; i++) {
  const sku = String(partsSheet.getRow(i).getCell(2).value || '').trim();
  if (!mazasSkus.has(sku)) continue;

  for (let c = 0; c < IMAGE_COLUMNS.length; c++) {
    const val = partsSheet.getRow(i).getCell(IMAGE_COLUMNS[c]).value;
    let url = '';
    if (val && typeof val === 'object' && 'hyperlink' in (val as object)) {
      url = (val as { hyperlink: string }).hyperlink;
    } else if (typeof val === 'string' && val.startsWith('http')) {
      url = val;
    }
    // Only download actual image files from Supabase storage (skip 360-viewer links)
    if (url && url.includes('acr-part-images')) {
      downloads.push({ sku, position: POSITION_NAMES[c], url });
    }
  }
}

console.log(
  `Found ${downloads.length} images across ${new Set(downloads.map((d) => d.sku)).size} SKUs\n`,
);

// ── Download images ─────────────────────────────────────────
mkdirSync(OUTPUT_DIR, { recursive: true });

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const { sku, position, url } of downloads) {
  const skuDir = join(OUTPUT_DIR, sku);
  const filePath = join(skuDir, `${position}.jpg`);

  if (existsSync(filePath)) {
    skipped++;
    continue;
  }

  mkdirSync(skuDir, { recursive: true });

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  FAIL ${sku}/${position}.jpg — HTTP ${response.status}`);
      failed++;
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(filePath, buffer);
    downloaded++;

    if (downloaded % 20 === 0) {
      console.log(`  Downloaded ${downloaded}/${downloads.length - skipped}...`);
    }
  } catch (err) {
    console.error(`  FAIL ${sku}/${position}.jpg — ${(err as Error).message}`);
    failed++;
  }
}

console.log(`\nDownloaded: ${downloaded}`);
console.log(`Skipped (exists): ${skipped}`);
console.log(`Failed: ${failed}`);

// ── Generate manifest ───────────────────────────────────────
const manifest: Record<string, string[]> = {};
for (const { sku, position } of downloads) {
  const filePath = join(OUTPUT_DIR, sku, `${position}.jpg`);
  if (existsSync(filePath)) {
    if (!manifest[sku]) manifest[sku] = [];
    manifest[sku].push(`${position}.jpg`);
  }
}

const manifestPath = join(OUTPUT_DIR, 'image-manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nManifest written: ${manifestPath}`);
console.log(`SKUs with images: ${Object.keys(manifest).length}`);
console.log(`Total image files: ${Object.values(manifest).reduce((s, v) => s + v.length, 0)}`);
