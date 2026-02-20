import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontPath = resolve(__dirname, 'orbitron-900.ttf');
const fontBase64 = readFileSync(fontPath).toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Orbitron';
    font-style: normal;
    font-weight: 900;
    src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
  }
  * { margin: 0; padding: 0; }
  body { background: transparent; }
  .icon {
    width: 512px;
    height: 512px;
    border-radius: 96px;
    background: #001166;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Orbitron', sans-serif;
    font-weight: 900;
    font-size: 210px;
    letter-spacing: -8px;
    color: #ffffff;
  }
</style>
</head>
<body>
  <div class="icon" id="icon">RD</div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const icon = page.locator('#icon');
await icon.screenshot({
  path: resolve(__dirname, 'monogram-512.png'),
  type: 'png',
});
console.log('  wrote scripts/monogram-512.png (512x512)');

await browser.close();
