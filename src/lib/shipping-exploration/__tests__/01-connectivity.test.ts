/**
 * Module 1: Connectivity & Authentication
 *
 * Purpose: Verify we can talk to the sandbox and understand the auth model.
 * Dependencies: None. Run this first.
 * Provider: Envia (implementation is provider-specific; plan is not)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ KEY FINDINGS (filled in after tests run)                      │
 * ├─────────────────────────────────────────────────────────────┤
 * │ - [ ] Auth mechanism confirmed (Bearer token, API key, etc.) │
 * │ - [ ] Rate limit policy (if discoverable from headers)       │
 * │ - [ ] Wallet/balance endpoint availability                   │
 * │ - [ ] Baseline latency range                                 │
 * │                                                              │
 * │ SURPRISES / DEVIATIONS FROM SPEC:                            │
 * │ - (filled in during execution)                               │
 * └─────────────────────────────────────────────────────────────┘
 */

import { describe, it, beforeAll, expect } from 'vitest';
import {
  createApiClient,
  getDefaultConfig,
  getQueriesBaseUrl,
  type ApiClient,
} from '../helpers/api-client';
import { saveSnapshot } from '../helpers/snapshot';

let client: ApiClient;
let requestPath = '/';
let requestBaseUrl = '';

beforeAll(() => {
  const config = getDefaultConfig();
  const queriesBaseUrl = getQueriesBaseUrl();
  const baseUrl = queriesBaseUrl || config.baseUrl;
  requestBaseUrl = baseUrl;
  requestPath =
    queriesBaseUrl && queriesBaseUrl.includes('queries') ? '/carrier?country_code=MX' : '/';
  client = createApiClient({ ...config, baseUrl });
});

describe('Module 1: Connectivity & Authentication', () => {
  it('authenticates with valid sandbox credentials', async () => {
    const res = await client.get(requestPath);
    saveSnapshot('01-auth-success-headers', {
      status: res.status,
      headers: res.headers,
      body: res.data,
      responseTimeMs: res.responseTimeMs,
      authScheme: 'Bearer',
    });
    expect(res.status).toBeLessThan(400);
  });

  it('rejects invalid API key', async () => {
    const invalidClient = createApiClient({
      ...getDefaultConfig(),
      baseUrl: requestBaseUrl,
      apiKey: 'invalid-key-for-module-1',
    });
    const res = await invalidClient.get(requestPath);
    saveSnapshot('01-auth-error-invalid-key', {
      status: res.status,
      headers: res.headers,
      body: res.data,
      responseTimeMs: res.responseTimeMs,
    });
    expect([401, 403]).toContain(res.status);
  });

  it('rejects missing API key', async () => {
    const url = `${requestBaseUrl}${requestPath}`;
    const start = performance.now();
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(30_000),
    });
    const responseTimeMs = Math.round(performance.now() - start);
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { _raw: text };
    }

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    saveSnapshot('01-auth-error-missing-key', {
      status: res.status,
      headers,
      body: data,
      responseTimeMs,
    });
    expect([401, 403]).toContain(res.status);
  });

  it('returns rate limit headers (if any)', async () => {
    const res = await client.get(requestPath);
    const rateLimitHeaders = Object.fromEntries(
      Object.entries(res.headers).filter(([k]) => /(ratelimit|x-ratelimit|retry-after)/i.test(k)),
    );

    saveSnapshot('01-rate-limit-headers', {
      status: res.status,
      rateLimitHeaders,
      allHeaders: res.headers,
    });

    expect(res.status).toBeLessThan(400);

    // Envia docs do not currently document rate-limit headers; treat absence as valid.
    if (Object.keys(rateLimitHeaders).length === 0) {
      expect(rateLimitHeaders).toEqual({});
      return;
    }

    for (const value of Object.values(rateLimitHeaders)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('sandbox wallet has balance (if wallet model)', async () => {
    const probes = [
      '/balance',
      '/wallet',
      '/wallet/balance',
      '/account/balance',
      '/user/balance',
      '/me',
    ];

    const probeResults: Array<{
      endpoint: string;
      status: number;
      responseTimeMs: number;
      body: unknown;
    }> = [];

    for (const endpoint of probes) {
      try {
        const res = await client.get(endpoint);
        probeResults.push({
          endpoint,
          status: res.status,
          responseTimeMs: res.responseTimeMs,
          body: res.data,
        });
      } catch (error) {
        probeResults.push({
          endpoint,
          status: 0,
          responseTimeMs: 0,
          body: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    const available = probeResults.filter((r) => r.status < 400);
    saveSnapshot('01-wallet-endpoint-availability', {
      baseUrl: requestBaseUrl,
      probeResults,
      availableEndpoints: available,
      finding:
        available.length > 0
          ? 'Balance-like endpoint appears available'
          : 'No obvious wallet/balance endpoint discovered in sandbox',
    });

    // Sandbox has no real charges per Envia auth docs; endpoint may be absent.
    expect(probeResults.length).toBe(probes.length);
    expect(probeResults.some((r) => r.status !== 0)).toBe(true);
  });

  it('measures baseline response latency', async () => {
    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await client.get(requestPath);
      expect(res.status).toBeLessThan(400);
      samples.push(res.responseTimeMs);
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];

    saveSnapshot('01-latency-baseline', {
      sampleCount: samples.length,
      samplesMs: samples,
      sortedMs: sorted,
      p50Ms: p50,
      p95Ms: p95,
      minMs: sorted[0],
      maxMs: sorted[sorted.length - 1],
    });

    expect(samples).toHaveLength(5);
    expect(p50).toBeGreaterThanOrEqual(0);
    expect(p95).toBeGreaterThanOrEqual(0);
    expect(p95).toBeGreaterThanOrEqual(p50);
  });
});
