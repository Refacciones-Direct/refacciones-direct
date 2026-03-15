/**
 * Verify connectivity to the Envia sandbox without running the full test suite.
 * Run: npm run shipping:verify-sandbox
 *
 * Loads .env.local from the project root. Uses the same env vars as shipping-exploration:
 * - ENVIA_SANDBOX_SHIPPING_API_KEY (or ENIVA_SANDBOX_SHIPPING_API_KEY / SHIPPING_API_KEY)
 * - ENIVA_SANDBOX_SHIPPING_API_URL or ENVIA_SANDBOX_SHIPPING_API_URL (main API)
 * - ENIVA_SANDBOX_SHIPPING_API_QUERIES or ENVIA_SANDBOX_SHIPPING_API_QUERIES (queries API, optional)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

import {
  createApiClient,
  getDefaultConfig,
  getQueriesBaseUrl,
} from '../src/lib/shipping-exploration/helpers/api-client';

function main() {
  const config = getDefaultConfig();
  const queriesBaseUrl = getQueriesBaseUrl();

  if (!config.baseUrl && !queriesBaseUrl) {
    console.error(
      'Missing env: set ENIVA_SANDBOX_SHIPPING_API_URL or ENVIA_SANDBOX_SHIPPING_API_URL (and/or ENIVA_SANDBOX_SHIPPING_API_QUERIES) in .env.local',
    );
    process.exit(1);
  }
  if (!config.apiKey) {
    console.error(
      'Missing env: set ENIVA_SANDBOX_SHIPPING_API_KEY or ENVIA_SANDBOX_SHIPPING_API_KEY in .env.local',
    );
    process.exit(1);
  }

  console.log('Sandbox config:');
  console.log('  Main API base URL:', config.baseUrl || '(not set)');
  console.log('  Queries base URL:', queriesBaseUrl || '(not set)');
  console.log('  API key:', config.apiKey ? `${config.apiKey.slice(0, 8)}...` : '(not set)');
  console.log('');

  async function run() {
    // Prefer queries API (carrier list) — read-only, safe, common Envia endpoint
    const baseUrlToUse = queriesBaseUrl || config.baseUrl;
    const client = createApiClient({
      ...config,
      baseUrl: baseUrlToUse,
    });

    const path =
      baseUrlToUse && baseUrlToUse.includes('queries') ? '/carrier?country_code=MX' : '/';
    const url = `${baseUrlToUse}${path}`;
    console.log(`GET ${url}`);
    const res = await client.get(path);
    console.log(`  Status: ${res.status}`);
    console.log(`  Time: ${res.responseTimeMs} ms`);
    if (res.status >= 400) {
      console.log('  Body:', JSON.stringify(res.data, null, 2).slice(0, 500));
      process.exit(1);
    }
    const data = res.data as Record<string, unknown>;
    if (data && typeof data === 'object') {
      const keys = Object.keys(data).slice(0, 10);
      console.log('  Response keys:', keys.join(', '), Object.keys(data).length > 10 ? '...' : '');
    }
    console.log('');
    console.log('Sandbox is reachable and accepted the request.');
  }

  run().catch((err) => {
    console.error('Request failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

main();
