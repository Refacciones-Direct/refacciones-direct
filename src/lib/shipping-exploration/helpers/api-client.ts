/**
 * Thin HTTP client for shipping provider sandbox API.
 * No retries, no error mapping, no Zod — tests discover response shapes.
 * Never throws on 4xx/5xx; returns { status, headers, data, responseTimeMs }.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_TIMEOUT_MS = 30_000;
let hasAttemptedLocalEnvLoad = false;

function loadDotEnvLocalIfNeeded(): void {
  if (hasAttemptedLocalEnvLoad) return;
  hasAttemptedLocalEnvLoad = true;

  const hasAnyShippingEnv =
    process.env.ENIVA_SANDBOX_SHIPPING_API_KEY ||
    process.env.ENVIA_SANDBOX_SHIPPING_API_KEY ||
    process.env.SHIPPING_API_KEY ||
    process.env.ENIVA_SANDBOX_SHIPPING_API_URL ||
    process.env.ENVIA_SANDBOX_SHIPPING_API_URL ||
    process.env.SHIPPING_API_URL ||
    process.env.ENIVA_SANDBOX_SHIPPING_API_QUERIES ||
    process.env.ENVIA_SANDBOX_SHIPPING_API_QUERIES ||
    process.env.SHIPPING_API_QUERIES_URL;

  if (hasAnyShippingEnv) return;

  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    const rawValue = line.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
}

function getEnv(name: string): string | undefined {
  loadDotEnvLocalIfNeeded();
  return (
    process.env[name] ??
    process.env[name.replace('ENIVA_', 'ENVIA_')] ??
    process.env[name.replace('ENVIA_', 'ENIVA_')]
  );
}

export type ApiClientConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
};

export type ApiResponse<T = unknown> = {
  status: number;
  headers: Record<string, string>;
  data: T;
  responseTimeMs: number;
};

export type ApiClient = {
  get: (path: string) => Promise<ApiResponse>;
  post: (path: string, body: unknown) => Promise<ApiResponse>;
};

export function getDefaultConfig(): ApiClientConfig {
  const baseUrl =
    getEnv('ENIVA_SANDBOX_SHIPPING_API_URL') ??
    getEnv('ENVIA_SANDBOX_SHIPPING_API_URL') ??
    getEnv('SHIPPING_API_URL') ??
    '';
  const apiKey =
    getEnv('ENIVA_SANDBOX_SHIPPING_API_KEY') ??
    getEnv('ENVIA_SANDBOX_SHIPPING_API_KEY') ??
    getEnv('SHIPPING_API_KEY') ??
    '';
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiKey,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

/** Queries API base URL (e.g. carrier list, rate quotes). Envia uses a separate URL for queries. */
export function getQueriesBaseUrl(): string {
  const url =
    getEnv('ENIVA_SANDBOX_SHIPPING_API_QUERIES') ??
    getEnv('ENVIA_SANDBOX_SHIPPING_API_QUERIES') ??
    getEnv('SHIPPING_API_QUERIES_URL') ??
    '';
  return url.replace(/\/$/, '');
}

export function createApiClient(overrides?: Partial<ApiClientConfig>): ApiClient {
  const config = { ...getDefaultConfig(), ...overrides };

  async function request(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<ApiResponse> {
    const url = path.startsWith('http') ? path : `${config.baseUrl}${path}`;
    const start = performance.now();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
    };
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }
    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    };
    if (body !== undefined && method === 'POST') {
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    const responseTimeMs = Math.round(performance.now() - start);
    let data: unknown;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { _raw: text };
    }
    const headerRecord: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headerRecord[k] = v;
    });
    return {
      status: res.status,
      headers: headerRecord,
      data,
      responseTimeMs,
    };
  }

  return {
    get: (path: string) => request('GET', path),
    post: (path: string, body: unknown) => request('POST', path, body),
  };
}
