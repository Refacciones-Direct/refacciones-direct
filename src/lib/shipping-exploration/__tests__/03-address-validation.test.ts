/**
 * Module 3: Address & Postal Code Validation
 *
 * Purpose: Understand address validation capabilities (colonias, city/state from CP).
 * Dependencies: Module 1 (auth works).
 * Provider: Envia (implementation is provider-specific; plan is not)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ KEY FINDINGS (filled in after tests run)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ - [ ] Whether address validation endpoint exists and shape   │
 * │ - [ ] Colonia/neighborhood list per CP (colonia dropdown UX)  │
 * │ - [ ] City/state auto-fill from postal code                   │
 * │ - [ ] Edge-case postal code handling                         │
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

describe('Module 3: Address & Postal Code Validation', () => {
  it.todo('validates a known good postal code');
  it.todo('returns neighborhoods (colonias) for a postal code');
  it.todo('rejects an invalid postal code');
  it.todo('validates postal codes across different states');
  it.todo('validates a rural/remote postal code');
  it.todo('returns city and state for a postal code');
  it.todo('handles postal code with leading zeros');
});
