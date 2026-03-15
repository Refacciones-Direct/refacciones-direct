/**
 * Module 8: Error Handling
 *
 * Purpose: Systematically discover every error the API can return (shape, codes, field-level vs request-level).
 * Dependencies: Module 1 (auth works).
 * Provider: Envia (implementation is provider-specific; plan is not)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ KEY FINDINGS (filled in after tests run)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ - [ ] Error response JSON shape for parseError()              │
 * │ - [ ] Error codes/types (string, numeric, categories)         │
 * │ - [ ] Field-level vs request-level validation errors          │
 * │ - [ ] HTTP status code patterns (400 vs 422, etc.)             │
 * │ - [ ] Rate limit threshold and retry guidance                  │
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

describe('Module 8: Error Handling', () => {
  it.todo('missing required address field (street)');
  it.todo('missing required address field (postal code)');
  it.todo('invalid postal code format');
  it.todo('mismatched postal code and state');
  it.todo('missing phone number');
  it.todo('invalid phone format');
  it.todo('zero weight');
  it.todo('negative weight');
  it.todo('zero dimensions');
  it.todo('extremely heavy package (500kg)');
  it.todo('extremely large dimensions (300×300×300 cm)');
  it.todo('empty packages array');
  it.todo('negative declared value');
  it.todo('empty request body');
  it.todo('malformed JSON');
  it.todo('wrong HTTP method');
  it.todo('unknown endpoint');
  it.todo('rapid sequential requests (10 in 1 second)');
  it.todo('rate limit response includes retry information');
});
