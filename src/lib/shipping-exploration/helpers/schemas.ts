/**
 * Zod schemas built from real API responses during exploration.
 * Start minimal; add fields as tests capture and validate response shapes.
 * These become the foundation for production types in src/lib/<provider>/types.ts.
 */

import { z } from 'zod';

/** Placeholder: refine with real rate quote response from snapshots */
export const rateQuoteItemSchema = z
  .object({
    carrier: z.string().optional(),
    carrierDescription: z.string().optional(),
    serviceId: z.unknown().optional(),
    service: z.string().optional(),
    serviceDescription: z.string().optional(),
    totalPrice: z.number().optional(),
    basePrice: z.number().optional(),
    currency: z.string().optional(),
    deliveryEstimate: z.unknown().optional(),
    deliveryDate: z.unknown().optional(),
  })
  .passthrough();

/** Placeholder: refine with real label response from snapshots */
export const labelResponseSchema = z
  .object({
    carrier: z.string().optional(),
    service: z.string().optional(),
    shipmentId: z.string().optional(),
    trackingNumber: z.string().optional(),
    trackUrl: z.string().optional(),
    label: z.string().optional(),
    totalPrice: z.number().optional(),
    currentBalance: z.number().optional(),
    currency: z.string().optional(),
  })
  .passthrough();

/** Placeholder: refine with real tracking response from snapshots */
export const trackingResponseSchema = z
  .object({
    status: z.string().optional(),
    statusColor: z.string().optional(),
    estimatedDelivery: z.unknown().optional(),
    eventHistory: z.array(z.unknown()).optional(),
    trackUrl: z.string().optional(),
  })
  .passthrough();

/** Placeholder: refine with real error response from Module 8 */
export const apiErrorSchema = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
    code: z.unknown().optional(),
    statusCode: z.number().optional(),
  })
  .passthrough();
