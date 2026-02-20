import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(__dirname, 'swoosh-icon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'apple-icon.png', size: 180, dest: 'src/app' },
  { name: 'icon-192.png', size: 192, dest: 'public' },
  { name: 'icon-512.png', size: 512, dest: 'public' },
];

// Generate all PNGs
const pngBuffers = {};
for (const { name, size, dest } of sizes) {
  const buf = await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toBuffer();
  pngBuffers[name] = buf;
  if (dest) {
    const outPath = resolve(root, dest, name);
    writeFileSync(outPath, buf);
    console.log(`  wrote ${dest}/${name} (${size}x${size})`);
  }
}

// Generate ICO from 16 + 32 PNGs
const icoBuffer = await pngToIco([pngBuffers['favicon-16.png'], pngBuffers['favicon-32.png']]);
writeFileSync(resolve(root, 'src/app/favicon.ico'), icoBuffer);
console.log('  wrote src/app/favicon.ico (16+32)');

// Copy SVG to src/app/icon.svg
copyFileSync(svgPath, resolve(root, 'src/app/icon.svg'));
console.log('  wrote src/app/icon.svg');

console.log('\nDone! All favicon assets generated.');
