/**
 * Upload seed images to local Supabase Storage and update parts.image_urls.
 *
 * Reads fixtures/seed-images/image-manifest.json to find which SKUs have images,
 * uploads each image to the `product-images` bucket, then updates the corresponding
 * parts row with the public URLs.
 *
 * Usage:
 *   npx.cmd tsx scripts/seed-images.ts
 *
 * Environment variables (loaded via --env-file=.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL   — Supabase API URL
 *   SUPABASE_SERVICE_ROLE_KEY  — Service role key (admin access)
 *
 * Prerequisites:
 *   - Local Supabase running (`npx.cmd supabase start`)
 *   - Catalog already seeded (`scripts/seed-catalog.ts`)
 *   - Images downloaded (`fixtures/seed-images/` populated)
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Run with: node --env-file=.env.local --import=tsx scripts/seed-images.ts',
  );
  process.exit(1);
}

const MANUFACTURER_ID = 1;
const BUCKET = 'product-images';
const IMAGES_DIR = resolve('fixtures/seed-images');

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Load manifest ───────────────────────────────────────────
const manifestPath = join(IMAGES_DIR, 'image-manifest.json');
const manifest: Record<string, string[]> = JSON.parse(readFileSync(manifestPath, 'utf-8'));

const skus = Object.keys(manifest);
console.log(
  `\nImage manifest: ${skus.length} SKUs, ${Object.values(manifest).reduce((s, v) => s + v.length, 0)} files\n`,
);

let uploaded = 0;
let failed = 0;
let partsUpdated = 0;

for (const sku of skus) {
  const files = manifest[sku];
  const imageUrls: string[] = [];

  for (const fileName of files) {
    const localPath = join(IMAGES_DIR, sku, fileName);
    const storagePath = `${MANUFACTURER_ID}/${sku}/${fileName}`;
    const fileBuffer = readFileSync(localPath);

    const { error } = await adminClient.storage.from(BUCKET).upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

    if (error) {
      console.error(`  FAIL upload ${storagePath}: ${error.message}`);
      failed++;
      continue;
    }

    // Build public URL
    const { data: urlData } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath);

    imageUrls.push(urlData.publicUrl);
    uploaded++;
  }

  if (imageUrls.length === 0) continue;

  // Update parts row with image URLs
  const { error: updateError } = await adminClient
    .from('parts')
    .update({ image_urls: imageUrls })
    .eq('sku', sku)
    .eq('manufacturer_id', MANUFACTURER_ID);

  if (updateError) {
    console.error(`  FAIL update ${sku}: ${updateError.message}`);
  } else {
    partsUpdated++;
  }
}

console.log(`Uploaded: ${uploaded}`);
console.log(`Failed: ${failed}`);
console.log(`Parts updated with image URLs: ${partsUpdated}`);

// ── Verify ──────────────────────────────────────────────────
const { count } = await adminClient
  .from('parts')
  .select('*', { count: 'exact', head: true })
  .eq('manufacturer_id', MANUFACTURER_ID)
  .not('image_urls', 'eq', '{}');

console.log(`\nParts with images in DB: ${count}`);
console.log('Done.');
