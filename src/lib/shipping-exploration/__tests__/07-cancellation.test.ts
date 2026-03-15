/**
 * Module 7: Cancellation & Refunds
 *
 * Purpose: Understand the cancellation flow — refund behavior, cancellation window.
 * Dependencies: Module 5 (need shipments to cancel).
 * Provider: Envia (implementation is provider-specific; plan is not)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ KEY FINDINGS (filled in after tests run)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ - [ ] Complete cancellation response Zod schema               │
 * │ - [ ] Refund behavior (automatic, amount, timing)            │
 * │ - [ ] Cancellation window (how long after label creation)     │
 * │ - [ ] Error responses for invalid cancellations               │
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

describe('Module 7: Cancellation & Refunds', () => {
  it.todo('cancels a freshly generated shipment');
  it.todo('cancellation response includes refund info');
  it.todo('wallet balance is restored after cancellation');
  it.todo('cannot cancel an already-cancelled shipment');
  it.todo('cannot cancel a shipped/in-transit shipment (if testable)');
  it.todo('captures the complete cancellation response shape');
});
