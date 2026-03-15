/**
 * Module 2: Reference Data & Carrier Discovery
 *
 * Purpose: Discover what carriers, services, countries, and postal codes the provider supports.
 * Dependencies: Module 1 (auth works).
 * Provider: Envia (implementation is provider-specific; plan is not)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ KEY FINDINGS (filled in after tests run)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ - [ ] Complete carrier list with identifiers and services   │
 * │ - [ ] Which carriers are pooled vs require BYO account      │
 * │ - [ ] State code format (critical for address mapping)     │
 * │ - [ ] Any carriers specific to certain regions               │
 * │                                                              │
 * │ SURPRISES / DEVIATIONS FROM SPEC:                            │
 * │ - (filled in during execution)                               │
 * └─────────────────────────────────────────────────────────────┘
 */

import { describe, it, beforeAll } from 'vitest';
import { createApiClient, type ApiClient } from '../helpers/api-client';

let client: ApiClient;

beforeAll(() => {
  client = createApiClient();
});

describe('Module 2: Reference Data & Carrier Discovery', () => {
  it.todo('lists available carriers for Mexico');
  it.todo('carrier list includes expected major carriers');
  it.todo('lists available carrier service types');
  it.todo('lists supported countries');
  it.todo('lists states/regions for Mexico');
  it.todo('identifies carriers requiring BYO credentials');
});
