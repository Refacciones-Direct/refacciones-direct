/**
 * Module 6: Shipment Tracking
 *
 * Purpose: Discover how tracking works — status codes, event structure, ETA.
 * Dependencies: Module 5 (need tracking numbers from generated labels).
 * Provider: Envia (implementation is provider-specific; plan is not)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ KEY FINDINGS (filled in after tests run)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ - [ ] Complete tracking response Zod schema                  │
 * │ - [ ] All status codes → domain TrackingStatus mapping       │
 * │ - [ ] Event/checkpoint structure                              │
 * │ - [ ] ETA availability and format                            │
 * │ - [ ] Tracking by tracking number vs shipment ID             │
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

describe('Module 6: Shipment Tracking', () => {
  it.todo('tracks a freshly generated shipment');
  it.todo('tracking response includes status field');
  it.todo('tracking response includes event history');
  it.todo('captures all possible tracking status values');
  it.todo('tracking response includes estimated delivery date');
  it.todo('tracks by tracking number');
  it.todo('tracks by provider shipment ID (if different)');
  it.todo('tracking a non-existent number returns clear error');
  it.todo('captures the complete tracking response shape');
  it.todo('sandbox simulates tracking progression (if supported)');
  it.todo('sandbox provides different status examples');
});
