/**
 * Shared assertion helpers for exploration tests.
 * Assertions are intentionally loose at first; tighten as we discover real shapes.
 */

import { expect } from 'vitest';

export function assertValidQuote(quote: unknown): void {
  expect(quote).toBeDefined();
  expect(quote).toBeTypeOf('object');
  const q = quote as Record<string, unknown>;
  expect(q.carrier ?? q.carrierCode ?? q.carrier_id).toBeDefined();
  expect(q.totalPrice ?? q.price ?? q.total ?? q.rate).toBeDefined();
}

export function assertValidLabel(label: unknown): void {
  expect(label).toBeDefined();
  expect(label).toBeTypeOf('object');
  const l = label as Record<string, unknown>;
  expect(l.trackingNumber ?? l.tracking_number ?? l.trackingNumber).toBeDefined();
  expect(l.label ?? l.labelUrl ?? l.label_url ?? l.pdfUrl).toBeDefined();
  expect(l.carrier ?? l.carrierCode ?? l.carrier_id).toBeDefined();
}

export function assertValidTrackingEvent(event: unknown): void {
  expect(event).toBeDefined();
  expect(event).toBeTypeOf('object');
  const e = event as Record<string, unknown>;
  expect(e.status ?? e.description ?? e.event).toBeDefined();
}

export function assertResponseTime(actualMs: number, maxMs: number): void {
  expect(actualMs).toBeLessThanOrEqual(maxMs);
}

export function assertErrorShape(error: unknown): void {
  expect(error).toBeDefined();
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    expect(e.message ?? e.error ?? e.msg ?? e.detail).toBeDefined();
  }
}
