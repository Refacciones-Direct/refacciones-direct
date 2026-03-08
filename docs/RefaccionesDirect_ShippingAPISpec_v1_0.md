---
document: Shipping API Specification
project: RefaccionesDirect
version: 1.0
updated: March 2026
status: Ready for Development

purpose: |
  Defines the shipping integration architecture — provider abstraction layer,
  API client design, domain types, service patterns, provider-specific
  implementation details, and step-by-step implementation plan.
  Designed for provider swappability (outage failover, cost optimization,
  or future provider changes).

owns:
  - Shipping provider interface contract
  - Provider-agnostic domain types (quotes, labels, tracking)
  - Envia API client implementation (first provider)
  - Provider adapter pattern (lib/ → services/ mapping)
  - Shipping-related environment variables
  - Webhook handling for tracking updates
  - Failover and provider-switching strategy
  - Implementation plan for the shipping service

does_not_own:
  - Order fulfillment workflow orchestration → see shipping-payments-roadmap.md
  - Database schema for orders/order_items → see Data Architecture
  - Checkout UI/UX flow → see Data Architecture
  - Stripe payment splits → see shipping-payments-roadmap.md
  - Shipping cost display/formatting → see i18n (next-intl)

related_documents:
  - RefaccionesDirect_TechnicalArchitecture_v7_0.md (overall architecture)
  - RefaccionesDirect_DataArchitectureSpec_v5_1.md (order schema, business rules)
  - docs/plans/shipping-payments-roadmap.md (implementation epics)
  - docs/plans/envia-api-research.md (Envia API research findings)
  - docs/RefaccionesDirect_ShippingAPISpec_v0_1.md (previous draft)
---

# RefaccionesDirect

## Shipping API Specification

**Version 1.0** | March 2026
**CONFIDENTIAL**

---

## Document History

| Version | Date         | Changes                                                                                                                                                                                                  |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1     | Feb 2026     | Initial draft: Envia as primary provider, abstraction design                                                                                                                                             |
| **1.0** | **Mar 2026** | **Integrated Envia research findings; updated address model for MX addresses; confirmed field mappings, auth, billing, carriers; added detailed implementation plan; resolved open questions from v0.1** |

---

## 1. Overview

RefaccionesDirect is a multi-manufacturer marketplace. Shipping is platform-managed — the platform handles rate quoting at checkout and label generation on behalf of manufacturers. This spec defines the provider-agnostic abstraction layer and the initial Envia implementation.

### 1.1 Design Goals

1. **Provider swappability** — Switch shipping providers via config, not code changes
2. **Failover capability** — If a provider has an outage, fall back to an alternative
3. **Consistent domain types** — API routes and UI never see provider-specific shapes
4. **Testability** — Mock the interface, not HTTP calls

### 1.2 Primary Provider: Envia

| Attribute           | Value                                         |
| ------------------- | --------------------------------------------- |
| **Provider**        | Envia (envia.com)                             |
| **API Style**       | REST / JSON                                   |
| **Auth**            | Bearer token (`Authorization: Bearer <key>`)  |
| **Base URL (Prod)** | `https://api.envia.com`                       |
| **Base URL (Test)** | `https://api-test.envia.com`                  |
| **Dashboard**       | `https://app.envia.com`                       |
| **Billing Model**   | Prepaid wallet — fund balance, labels deduct  |
| **Rate Quotes**     | Free (no charge for `/ship/rate/` calls)      |
| **Coverage**        | Mexico, USA, LATAM (35+ carriers)             |
| **Account**         | One account, separate sandbox/production keys |

#### Mexico Domestic Carriers (Confirmed)

| Carrier       | Service Types                           | Notes                               |
| ------------- | --------------------------------------- | ----------------------------------- |
| FedEx         | Express, Ground                         | May require BYO account credentials |
| DHL           | Express                                 | May require BYO account credentials |
| UPS           | Ground, Express                         | May require BYO account credentials |
| Estafeta      | Standard, Express, Priority             | Available via Envia pooled rates    |
| Paquetexpress | Standard, Express                       | Available via Envia pooled rates    |
| Sendex        | Standard, Express                       | Available via Envia pooled rates    |
| 99Minutos     | Express, Same-day, Priority (last-mile) | Urban areas only                    |
| Dostavista    | Same-day, Local Delivery                | Urban areas only                    |
| AmPm          | Standard, Express                       | Regional                            |
| Castores      | Standard, Regional                      | Regional                            |
| Entrega       | Standard (local/regional)               | Regional                            |
| Fletes Mexico | Freight / heavy parcel                  | For overweight/oversized shipments  |

**Carrier availability:** Many carriers are available by default via Envia's pooled/aggregated rates. Major international integrators (FedEx, DHL, UPS) may require entering your own account credentials in the Envia dashboard. Use `GET https://queries.envia.com/carrier?country_code=MX` to check what's enabled for your account.

**Geographic filtering:** Not all carriers cover 100% of Mexico. `/ship/rate/` automatically filters carriers based on origin CP, destination CP, and package specs — only valid carriers are returned. Rural/remote CPs may trigger extended area surcharges or have fewer carrier options.

### 1.3 Billing & Pricing (Confirmed)

| Question              | Answer                                                               |
| --------------------- | -------------------------------------------------------------------- |
| Billing model         | Prepaid wallet — fund via dashboard, labels deduct from balance      |
| Rate quote cost       | Free — `/ship/rate/` calls are never charged                         |
| Label cost            | Deducted from wallet on `/ship/generate/` — the quoted price         |
| Envia platform fee    | None — no per-label surcharge from Envia on top of carrier rate      |
| Discounts             | Automatic — Envia's aggregated rates include ~70% off carrier retail |
| Volume negotiation    | Not required to start — discounts are automatic                      |
| Subscription          | None — no monthly fee, no minimum commitment                         |
| Wallet empty behavior | Label creation fails — must be handled in code                       |

**Surcharges:** Fuel, extended zone, oversize, residential delivery, and volumetric weight adjustments are typically included in the quote if weight/dimensions/postal codes are accurate. Post-billing adjustments can occur if package details were declared incorrectly. See Section 6.5 for the full surcharge reference.

---

## 2. File Structure

```
src/
├── lib/
│   └── envia/                          # Provider-specific HTTP client
│       ├── client.ts                   # Configured fetch wrapper
│       ├── types.ts                    # Envia API request/response Zod schemas
│       └── index.ts                    # Barrel export
│
├── services/
│   └── shipping/
│       ├── types.ts                    # Domain types (provider-agnostic)
│       ├── shipping.provider.ts        # Interface definition
│       ├── envia.provider.ts           # Envia implements ShippingProvider
│       ├── shipping.service.ts         # Business logic (uses interface)
│       ├── index.ts                    # Barrel + factory function
│       └── __tests__/
│           ├── shipping.service.test.ts
│           └── envia.provider.test.ts
│
└── app/api/
    ├── checkout/
    │   └── shipping-quotes/route.ts    # Customer-facing: get rates
    ├── dashboard/
    │   └── orders/[id]/
    │       └── label/route.ts          # Manufacturer-facing: generate label
    └── webhooks/
        └── envia/route.ts              # Tracking updates (if webhooks supported)
```

---

## 3. Domain Types (Provider-Agnostic)

These types represent what the application cares about. No provider-specific fields leak through.

File: `src/services/shipping/types.ts`

### 3.1 ShippingAddress

> **[ARCHITECT REVIEW REQUIRED]:** The address model has been updated from v0.1 to explicitly model Mexican address components (`streetNumber`, `interiorNumber`, `neighborhood` required for MX). This is a **breaking change** from the v0.1 draft. The previous `street2` field was ambiguous — different providers interpret it differently, which causes incorrect address mapping. The new model captures data unambiguously so any provider adapter can map it correctly. The Data Architecture spec's `orders.shipping_address JSONB` column should store this shape. Please confirm this model aligns with the broader data architecture.

```typescript
export interface ShippingAddress {
  /** Contact name for this address */
  name: string;
  /** Company or business name */
  company?: string;
  /** Street name only — no number (e.g., "Av. Insurgentes Sur") */
  street: string;
  /** Exterior number / street number (e.g., "1234") */
  streetNumber: string;
  /** Interior number, suite, apartment, floor (e.g., "Int. 4", "Depto 2B") */
  interiorNumber?: string;
  /** Colonia / neighborhood — required for MX addresses */
  neighborhood: string;
  /** City or municipio (e.g., "Monterrey", "Benito Juárez") */
  city: string;
  /** State abbreviation — 2-3 letter code (e.g., "NL", "CMX", "JAL") */
  state: string;
  /** Postal code — 5-digit string for Mexico (e.g., "64180") */
  postalCode: string;
  /** ISO 3166-1 alpha-2 country code (e.g., "MX") */
  country: string;
  /** Phone number with country code (e.g., "+525512345678") */
  phone: string;
  /** Email address */
  email?: string;
  /** Delivery reference / landmark (e.g., "Casa con timbre rojo") */
  reference?: string;
}
```

**Why this shape:**

| Mexican Address Concept | Field            | Required | Notes                                                    |
| ----------------------- | ---------------- | -------- | -------------------------------------------------------- |
| Calle                   | `street`         | Yes      | Street name without number                               |
| Numero Exterior         | `streetNumber`   | Yes      | Separated from street — Envia and most MX APIs need this |
| Numero Interior         | `interiorNumber` | No       | Apartment, suite, floor — separate from ext number       |
| Colonia                 | `neighborhood`   | Yes      | Required by carriers for MX routing and zone detection   |
| Municipio / Ciudad      | `city`           | Yes      |                                                          |
| Estado                  | `state`          | Yes      | 2-3 letter abbreviation, NOT ISO "MX-NLE" format         |
| Codigo Postal           | `postalCode`     | Yes      | Always 5 digits, always a string                         |
| Pais                    | `country`        | Yes      | "MX" for Mexico                                          |
| Referencias             | `reference`      | No       | Delivery notes / landmarks for the driver                |

**State codes:** Use the standard Mexican abbreviations (e.g., "NL" for Nuevo Leon, "CMX" for Ciudad de Mexico, "JAL" for Jalisco). Note: CDMX must be "CMX" — not "CM" or "DF".

**Portability to non-MX providers:** A US-focused adapter would map `street` + `streetNumber` → `address_line_1`, `interiorNumber` → `address_line_2`, and ignore `neighborhood`. The explicit fields make this trivial rather than requiring parsing.

### 3.2 ShippingPackage

```typescript
export interface ShippingPackage {
  /** Weight in kilograms */
  weightKg: number;
  /** Length in centimeters */
  lengthCm: number;
  /** Width in centimeters */
  widthCm: number;
  /** Height in centimeters */
  heightCm: number;
  /** Declared value for insurance (MXN for domestic) */
  declaredValueMxn: number;
  /** Description of contents (e.g., "Auto brake pads") */
  contents: string;
  /** Package type */
  type: 'box' | 'envelope' | 'pallet';
}
```

**Package limits:** Limits are per-carrier, not universal. Envia does not enforce a global max — `/ship/rate/` filters out carriers that can't handle the declared weight/dimensions. Carriers may audit and adjust after pickup if declared values are inaccurate.

**Volumetric weight:** Carriers charge based on the higher of actual weight vs volumetric weight. Volumetric weight = (L x W x H) / divisor (typically 5000 for express, 6000 for ground). This is reflected in the quote if dimensions are accurate.

### 3.3 ShippingQuote

```typescript
export interface ShippingQuote {
  /** Carrier name (e.g., "DHL Express", "Estafeta") */
  carrier: string;
  /** Service level (e.g., "express", "ground", "standard") */
  service: string;
  /** Final price including all surcharges (MXN) */
  totalPriceMxn: number;
  /** Currency code */
  currency: string;
  /** Estimated business days for delivery */
  estimatedDays: number;
  /** Opaque provider quote ID — pass back when creating label */
  providerQuoteId: string;
  /** Which provider generated this quote */
  providerName: string;
}
```

> **[DISCOVER DURING DEVELOPMENT]:** Whether Envia returns a quote ID that locks in a rate, and how long quotes remain valid (TTL). If quotes are ephemeral (no lock-in), the service layer needs a re-quote strategy before label generation. Capture findings from sandbox testing here.

> **[DISCOVER DURING DEVELOPMENT]:** Whether the Envia response breaks down the price (base rate, fuel surcharge, insurance, VAT) or just returns a total. If breakdown is available, consider adding optional fields (`basePriceMxn`, `surcharges`) for transparency.

### 3.4 ShippingLabel

```typescript
export interface ShippingLabel {
  /** Carrier tracking number */
  trackingNumber: string;
  /** URL to download the label (PDF or PNG) */
  labelUrl: string;
  /** Label format that was generated */
  labelFormat: 'pdf' | 'png';
  /** Carrier name */
  carrier: string;
  /** Service level */
  service: string;
  /** Price charged for this label (MXN) */
  totalPriceMxn: number;
  /** Provider's shipment ID (for tracking, cancellation) */
  shipmentId: string;
  /** Which provider created this label */
  providerName: string;
}
```

> **[DISCOVER DURING DEVELOPMENT]:** Label URL expiry — do Envia label download URLs expire? If so, we may need to download and store the PDF in Supabase Storage.

> **[DISCOVER DURING DEVELOPMENT]:** Supported label formats and sizes (PDF letter, 4x6 thermal, ZPL, etc.).

### 3.5 Tracking Types

```typescript
export interface TrackingEvent {
  /** Provider-normalized status code */
  status: string;
  /** Human-readable description */
  description: string;
  /** Location (city, state, or facility name) */
  location: string;
  /** When this event occurred */
  timestamp: Date;
}

export interface TrackingResult {
  /** Carrier tracking number */
  trackingNumber: string;
  /** Carrier name */
  carrier: string;
  /** Current high-level status */
  status: TrackingStatus;
  /** Chronological list of tracking events */
  events: TrackingEvent[];
  /** Estimated delivery date (if available) */
  estimatedDelivery?: Date;
}

export type TrackingStatus =
  | 'pending' // Label created, not yet picked up
  | 'picked_up' // Carrier has the package
  | 'in_transit' // Moving through carrier network
  | 'out_for_delivery' // On the truck for final delivery
  | 'delivered' // Successfully delivered
  | 'exception' // Problem (damaged, address issue, etc.)
  | 'returned' // Returned to sender
  | 'cancelled'; // Shipment cancelled
```

> **[DISCOVER DURING DEVELOPMENT]:** Map Envia's tracking status codes to our `TrackingStatus` enum. Generate test shipments in sandbox and capture the full set of status values. Build the mapping table in `envia.provider.ts` as statuses are discovered.

### 3.6 Error Types

```typescript
export class ShippingProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code: ShippingErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ShippingProviderError';
  }
}

export type ShippingErrorCode =
  | 'PROVIDER_UNAVAILABLE' // API down / timeout
  | 'INVALID_ADDRESS' // Address validation failed
  | 'NO_RATES_AVAILABLE' // No carriers serve this route
  | 'LABEL_FAILED' // Label generation error
  | 'CANCEL_FAILED' // Cancellation rejected
  | 'AUTH_ERROR' // Bad API key / expired token
  | 'RATE_LIMIT' // Too many requests
  | 'INSUFFICIENT_BALANCE' // Wallet empty (Envia-specific, but useful generically)
  | 'UNKNOWN'; // Catch-all
```

---

## 4. Provider Interface

File: `src/services/shipping/shipping.provider.ts`

This is the contract that every shipping provider must implement. The rest of the application only sees this interface — never provider-specific types.

```typescript
import type {
  ShippingAddress,
  ShippingPackage,
  ShippingQuote,
  ShippingLabel,
  TrackingResult,
} from './types';

export interface ShippingProvider {
  /** Provider identifier (e.g., "envia", "skydropx") */
  readonly name: string;

  /** Get rate quotes from available carriers */
  getQuotes(
    origin: ShippingAddress,
    destination: ShippingAddress,
    packages: ShippingPackage[],
  ): Promise<ShippingQuote[]>;

  /** Purchase a label for a selected quote */
  createLabel(
    origin: ShippingAddress,
    destination: ShippingAddress,
    packages: ShippingPackage[],
    selectedQuote: ShippingQuote,
  ): Promise<ShippingLabel>;

  /** Get current tracking status and event history */
  trackShipment(trackingNumber: string): Promise<TrackingResult>;

  /** Cancel a shipment and request refund */
  cancelShipment(
    carrier: string,
    trackingNumber: string,
  ): Promise<{ success: boolean; refunded: boolean }>;
}
```

**Future interface extensions (not MVP):**

- `validateAddress(address: ShippingAddress): Promise<AddressValidationResult>` — Envia has a zip code validation endpoint (`queries-test.envia.com/zip-code/{cp}?country_code=MX`) that could power this
- `schedulePickup(...)` — Envia supports `/ship/pickup/`
- `getBalance(): Promise<number>` — Check prepaid wallet balance

---

## 5. Envia Client (HTTP Layer)

File: `src/lib/envia/client.ts`

Thin HTTP wrapper. No business logic. Validates responses with Zod.

### 5.1 Configuration

```typescript
// Environment variables
ENVIA_API_KEY=<bearer-token>              // From Envia dashboard (app.envia.com)
ENVIA_API_URL=https://api.envia.com       // Production
// or
ENVIA_API_URL=https://api-test.envia.com  // Sandbox
```

One Envia account, two separate API keys (sandbox vs production), two different base URLs.

### 5.2 Envia API Endpoints

| Method | Endpoint              | Purpose                  | Used By            | Cost    |
| ------ | --------------------- | ------------------------ | ------------------ | ------- |
| POST   | `/ship/rate/`         | Get multi-carrier quotes | `getQuotes()`      | Free    |
| POST   | `/ship/generate/`     | Create label + tracking  | `createLabel()`    | Charged |
| POST   | `/ship/generaltrack/` | Track by tracking number | `trackShipment()`  | Free    |
| POST   | `/ship/cancel/`       | Cancel + refund          | `cancelShipment()` | Free    |

**Auxiliary endpoints (not part of ShippingProvider interface):**

| Method | Base URL                 | Endpoint                         | Purpose                          |
| ------ | ------------------------ | -------------------------------- | -------------------------------- |
| GET    | `queries.envia.com`      | `/carrier?country_code=MX`       | List available carriers          |
| GET    | `queries-test.envia.com` | `/zip-code/{cp}?country_code=MX` | Validate postal code             |
| GET    | `queries-test.envia.com` | `/country`                       | List countries and state codes   |
| POST   | `api-test.envia.com`     | `/ship/webhooktest/`             | Test webhook delivery (dev only) |

### 5.3 Client Design

```typescript
class EnviaClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async post<T>(endpoint: string, body: unknown, schema: ZodSchema<T>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000), // 30s default timeout
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    const data = await response.json();
    return schema.parse(data);
  }

  private async parseError(response: Response): Promise<ShippingProviderError> {
    // Parse Envia error response, map to ShippingProviderError
    // Exact error shape to be captured during development
  }
}
```

> **[DISCOVER DURING DEVELOPMENT]:** Envia error response JSON shape. Capture samples for: invalid address, auth failure, no rates, insufficient balance. Build the `parseError` method as errors are encountered during sandbox testing.

> **[DISCOVER DURING DEVELOPMENT]:** Appropriate timeout values per endpoint. Start with 30s across the board, tune based on observed latency. Rate quotes may take longer than tracking lookups.

### 5.4 Envia Request/Response Zod Schemas

File: `src/lib/envia/types.ts`

> **[DISCOVER DURING DEVELOPMENT]:** Full Zod schemas will be defined by making real sandbox calls and capturing response shapes. The schemas to build:
>
> - `EnviaRateRequest` / `EnviaRateResponse`
> - `EnviaGenerateRequest` / `EnviaGenerateResponse`
> - `EnviaTrackRequest` / `EnviaTrackResponse`
> - `EnviaCancelRequest` / `EnviaCancelResponse`
> - `EnviaErrorResponse`
>
> Reference: https://docs.envia.com/reference

The **request** shapes are known from the research (see Section 6.1 for the confirmed field mapping). The **response** shapes must be captured from sandbox calls.

---

## 6. Envia Provider (Adapter Layer)

File: `src/services/shipping/envia.provider.ts`

Implements `ShippingProvider`. Responsible for:

1. Transforming domain types → Envia API request shapes
2. Calling `EnviaClient`
3. Transforming Envia responses → domain types
4. Mapping Envia errors → `ShippingProviderError`

### 6.1 Address Mapping (Confirmed)

| Domain Field     | Envia Field  | Required | Notes                                            |
| ---------------- | ------------ | -------- | ------------------------------------------------ |
| `name`           | `name`       | Yes      | Contact name                                     |
| `company`        | `company`    | No       | Business name                                    |
| `email`          | `email`      | Yes\*    | Required for origin, recommended for destination |
| `phone`          | `phone`      | Yes      | Include +52 country code                         |
| `street`         | `street`     | Yes      | Street name only                                 |
| `streetNumber`   | `number`     | Yes      | Exterior number                                  |
| `interiorNumber` | `additional` | No       | Interior/suite/apartment                         |
| `neighborhood`   | `district`   | Yes      | Colonia — critical for MX carrier routing        |
| `city`           | `city`       | Yes      | Municipio / Alcaldia                             |
| `state`          | `state`      | Yes      | 2-3 letter code ("NL", "CMX", "JAL")             |
| `postalCode`     | `postalCode` | Yes      | 5-digit string                                   |
| `country`        | `country`    | Yes      | "MX" (ISO alpha-2)                               |
| `reference`      | `reference`  | No       | Delivery landmark / notes                        |

**Mapping function:**

```typescript
function toEnviaAddress(addr: ShippingAddress): EnviaAddress {
  return {
    name: addr.name,
    company: addr.company,
    email: addr.email,
    phone: addr.phone,
    street: addr.street,
    number: addr.streetNumber,
    additional: addr.interiorNumber,
    district: addr.neighborhood,
    city: addr.city,
    state: addr.state,
    country: addr.country,
    postalCode: addr.postalCode,
    reference: addr.reference,
  };
}
```

### 6.2 Package Mapping (Confirmed)

| Domain Field       | Envia Field                    | Notes                       |
| ------------------ | ------------------------------ | --------------------------- |
| `type`             | `packages[].type`              | "box", "envelope", "pallet" |
| `contents`         | `packages[].content`           | Description string          |
| `weightKg`         | `packages[].weight`            | Numeric                     |
| (hardcoded)        | `packages[].weightUnit`        | Always "KG"                 |
| (hardcoded)        | `packages[].lengthUnit`        | Always "CM"                 |
| `declaredValueMxn` | `packages[].declaredValue`     | Numeric                     |
| (hardcoded)        | `packages[].currency`          | "MXN" for domestic          |
| `lengthCm`         | `packages[].dimensions.length` | Numeric                     |
| `widthCm`          | `packages[].dimensions.width`  | Numeric                     |
| `heightCm`         | `packages[].dimensions.height` | Numeric                     |

**Shipment type mapping:** Envia requires a top-level `shipment.type` field: `1` = parcel, `2` = envelope, `3` = pallet. Derive from `packages[0].type` or the heaviest package type if mixed.

### 6.3 Rate Request Structure (Confirmed)

Complete Envia `/ship/rate/` request body:

```typescript
{
  origin: EnviaAddress,        // Mapped from ShippingAddress
  destination: EnviaAddress,   // Mapped from ShippingAddress
  packages: EnviaPackage[],    // Mapped from ShippingPackage[]
  shipment: {
    type: 1 | 2 | 3,          // parcel | envelope | pallet
    // carrier and service are OPTIONAL — omit to get all carriers
  }
}
```

**Key behavior:** Omitting `shipment.carrier` returns rates from ALL available carriers for the route in a single call. This is the default behavior we want for checkout — show all options, let the customer or platform choose.

### 6.4 Multi-Package Support (Confirmed)

Envia supports multi-package shipments via the `packages` array. Behavior is carrier-dependent:

- Some carriers return one master tracking number for all packages
- Some carriers return one tracking number per package

The `ShippingLabel` response must handle both cases. When multiple tracking numbers are returned, the adapter should return one `ShippingLabel` per tracking number.

### 6.5 Surcharge Reference

| Surcharge Type           | Included in Quote?    | Post-Billing Risk? | Mitigation                                |
| ------------------------ | --------------------- | ------------------ | ----------------------------------------- |
| Fuel surcharge           | Yes (usually)         | Low                | Varies weekly by carrier                  |
| Extended/remote area     | Yes (if CP valid)     | Medium             | Validate postal code before quoting       |
| Residential delivery     | Yes (usually)         | Low                | Most MX deliveries treated as residential |
| Oversize/large package   | Yes (if dims correct) | Medium             | Accurate dimensions critical              |
| Volumetric weight adj.   | Yes (if dims correct) | Medium             | Accurate dimensions critical              |
| Additional handling      | Sometimes             | Medium             | Irregular/fragile items                   |
| Insurance/declared value | Yes (if provided)     | No                 | Based on `declaredValue`                  |
| Address correction       | No                    | High               | Validate address before label creation    |
| Failed delivery/return   | No                    | High               | Accurate address + phone required         |
| Re-delivery fee          | No                    | Medium             | After failed attempt                      |

**Critical rule:** Quotes are only reliable when weight, dimensions, and postal codes are accurate. Inaccurate declarations can cause post-billing adjustments from the carrier.

### 6.6 Tracking Status Mapping

> **[DISCOVER DURING DEVELOPMENT]:** This table will be populated by generating test shipments in the Envia sandbox and capturing all status values returned by `/ship/generaltrack/`. Start with a best-guess mapping and refine as real statuses are observed.

| Envia Status         | Domain `TrackingStatus` | Notes                    |
| -------------------- | ----------------------- | ------------------------ |
| _(to be discovered)_ | `pending`               | Label created, no pickup |
| _(to be discovered)_ | `picked_up`             |                          |
| _(to be discovered)_ | `in_transit`            |                          |
| _(to be discovered)_ | `out_for_delivery`      |                          |
| _(to be discovered)_ | `delivered`             |                          |
| _(to be discovered)_ | `exception`             |                          |
| _(to be discovered)_ | `returned`              |                          |
| _(to be discovered)_ | `cancelled`             |                          |

**Fallback:** Any unrecognized Envia status should map to `'in_transit'` with the raw status preserved in `TrackingEvent.description`. Log a warning so we can add the mapping.

---

## 7. Shipping Service (Business Logic)

File: `src/services/shipping/shipping.service.ts`

### 7.1 Responsibilities

- Accepts a `ShippingProvider` via constructor injection
- Sorts/filters quotes for checkout display
- Looks up manufacturer warehouse address from Supabase
- Validates package dimensions before sending to provider
- Orchestrates per-manufacturer quote grouping
- Provides idempotency protection for label generation (critical — duplicate `/ship/generate/` = duplicate charge)

### 7.2 Key Methods

| Method                | Called By                               | Purpose                          |
| --------------------- | --------------------------------------- | -------------------------------- |
| `getCheckoutQuotes()` | `POST /api/checkout/shipping-quotes`    | Get sorted rates for checkout UI |
| `generateLabel()`     | `POST /api/dashboard/orders/[id]/label` | Create label for fulfillment     |
| `getTracking()`       | `GET /api/orders/[id]/tracking`         | Get tracking info for customer   |
| `cancelShipment()`    | Dashboard action                        | Cancel and request wallet refund |

### 7.3 Quote Sorting & Filtering

```
Default sort: cheapest first (totalPriceMxn ASC)
Future options:
  - Fastest (estimatedDays ASC)
  - Best value (balance of cost + speed)
  - Filter by carrier preference
```

### 7.4 Idempotency Protection

Label generation MUST be idempotent. A duplicate `/ship/generate/` call to Envia creates a duplicate label and charges the wallet again.

Strategy:

- Before calling the provider, check if a label already exists for this order item in the database
- If a label exists, return the stored label data without calling the provider
- Use a database-level lock or unique constraint to prevent race conditions

### 7.5 Factory Function

```typescript
// src/services/shipping/index.ts

export function createShippingService(): ShippingService {
  const providerName = process.env.SHIPPING_PROVIDER ?? 'envia';

  switch (providerName) {
    case 'envia':
      return new ShippingService(new EnviaProvider());
    // case 'skydropx':
    //   return new ShippingService(new SkydropxProvider());
    default:
      throw new Error(`Unknown shipping provider: ${providerName}`);
  }
}
```

---

## 8. API Routes

### 8.1 POST /api/checkout/shipping-quotes

**Purpose:** Customer-facing — returns rate quotes for the checkout page.

**Request:**

```typescript
{
  destinationPostalCode: string;
  destinationState: string;
  destinationCity: string;
  destinationNeighborhood: string;
  items: Array<{
    partId: string; // UUID
    quantity: number;
  }>;
}
```

**Response:**

```typescript
{
  quotes: Array<{
    manufacturerId: string;
    manufacturerName: string;
    options: ShippingQuote[]; // Sorted cheapest-first
  }>;
}
```

**Flow:**

1. Look up each item's part record (weight, dimensions, manufacturer_id)
2. Group items by manufacturer
3. For each manufacturer group:
   a. Look up manufacturer's warehouse/origin address
   b. Build `ShippingPackage[]` from the items
   c. Call `shippingProvider.getQuotes(origin, destination, packages)`
4. Return grouped quotes

> **[ARCHITECT REVIEW — DATA DEPENDENCY]:** Manufacturer origin/warehouse address is not currently in the schema. The shipping service needs a source address per manufacturer. Recommendation: add a `shipping_address JSONB` column to the `manufacturers` table, or create a `manufacturer_addresses` table if manufacturers can have multiple warehouses. This is a Data Architecture decision.

### 8.2 POST /api/dashboard/orders/[id]/label

**Purpose:** Manufacturer generates a shipping label from their dashboard.

**Request:**

```typescript
{
  orderId: string;
  orderItemId: string;
  selectedQuote: {
    carrier: string;
    service: string;
    providerQuoteId: string;
    providerName: string;
  }
}
```

**Response:**

```typescript
{
  label: ShippingLabel;
}
```

**Flow:**

1. Verify the manufacturer owns this order item
2. Check idempotency — if label already exists, return it
3. Load origin (manufacturer address) and destination (order shipping address)
4. Build packages from order item data
5. Call `shippingProvider.createLabel(origin, destination, packages, selectedQuote)`
6. Store tracking number, label URL, shipment ID on the order item
7. Return the label

### 8.3 Tracking Webhook / Polling

> **[DISCOVER DURING DEVELOPMENT]:** Whether Envia supports push webhooks for tracking updates or requires polling. If webhooks are supported, implement `POST /api/webhooks/envia` with signature verification. If polling is required, implement an Inngest cron function that polls active shipments on a schedule.

---

## 9. Provider Swapping & Failover

### 9.1 Environment-Based Switching

```bash
# .env.local
SHIPPING_PROVIDER=envia        # "envia" | future providers
ENVIA_API_KEY=...
ENVIA_API_URL=https://api.envia.com
```

To add a new provider:

1. Create `src/lib/<provider>/client.ts` (HTTP client)
2. Create `src/lib/<provider>/types.ts` (Zod schemas)
3. Create `src/services/shipping/<provider>.provider.ts` (implements `ShippingProvider`)
4. Add the case to the factory function in `src/services/shipping/index.ts`
5. Add env vars

No changes needed to `ShippingService`, API routes, or UI.

### 9.2 Automatic Failover (Post-MVP)

Not in scope for initial implementation. Design considerations documented in v0.1 remain valid:

- Label portability across providers
- Price guarantee when falling back to a more expensive provider
- Tracking must go through the provider that created the label
- Circuit breaker pattern for auto-switching

---

## 10. Inngest Integration

Shipping operations are steps in the order fulfillment workflow (owned by shipping-payments-roadmap.md). The shipping service is called by that workflow — it doesn't define the workflow.

**Touch points:**

- Label generation may be called from an Inngest step (automatic) or from a dashboard API route (manual) — both use the same `ShippingService.generateLabel()` method
- Tracking updates (whether via webhook or polling) should emit Inngest events to trigger downstream actions (customer notifications, order status updates)

---

## 11. Testing Strategy

### 11.1 Test Layers

| Layer             | Test Type   | Approach                                          | When    |
| ----------------- | ----------- | ------------------------------------------------- | ------- |
| `EnviaClient`     | Unit        | Mock `fetch`, verify request shapes + headers     | Phase 2 |
| `EnviaProvider`   | Unit        | Mock `EnviaClient`, verify domain type transforms | Phase 3 |
| `ShippingService` | Unit        | Mock `ShippingProvider` interface                 | Phase 4 |
| API routes        | Integration | Mock `ShippingService`                            | Phase 5 |
| Full flow         | E2E         | Envia sandbox (quote → label → track)             | Phase 6 |

### 11.2 Sandbox Testing

```bash
ENVIA_API_URL=https://api-test.envia.com
ENVIA_API_KEY=<sandbox-token>
```

Sandbox is free. Use it to:

- Capture real response shapes for Zod schemas
- Discover tracking status values
- Test error handling (bad addresses, empty results)
- Verify multi-package behavior
- Confirm label format options

> **[DISCOVER DURING DEVELOPMENT]:** Whether sandbox returns realistic MX carrier rates or dummy data. Whether sandbox tracking returns simulated events.

---

## 12. Environment Variables

| Variable            | Required | Default | Purpose            |
| ------------------- | -------- | ------- | ------------------ |
| `SHIPPING_PROVIDER` | No       | `envia` | Provider selector  |
| `ENVIA_API_KEY`     | Yes\*    | —       | Envia bearer token |
| `ENVIA_API_URL`     | Yes\*    | —       | Envia base URL     |

\* Required when `SHIPPING_PROVIDER=envia` (default).

---

## 13. Data Architecture Recommendations

> **[ARCHITECT REVIEW REQUIRED]:** The following are recommendations from the Shipping API spec for the project architect to evaluate. These affect tables owned by the Data Architecture spec.

### 13.1 Order Items — Provider-Agnostic Column Naming

The current Data Architecture spec (v5.1) has `order_items.skydropx_shipment_id`. Since the shipping layer is provider-agnostic, recommend renaming to:

```sql
-- Instead of:
skydropx_shipment_id VARCHAR(100)

-- Use:
shipping_shipment_id VARCHAR(100),    -- Provider's shipment ID
shipping_provider VARCHAR(50),         -- "envia", "skydropx", etc.
shipping_carrier VARCHAR(100),         -- "DHL Express", "Estafeta", etc.
```

This allows the order item to record which provider was used without coupling the schema to a specific provider.

### 13.2 Manufacturer Origin Address

The shipping service needs a source/origin address per manufacturer to generate quotes and labels. This doesn't exist in the current schema. Options:

- **Option A:** Add `shipping_address JSONB` column to `manufacturers` table (simplest — one warehouse per manufacturer)
- **Option B:** Create `manufacturer_addresses` table with a `type` column (supports multiple warehouses per manufacturer)

Recommendation: Option A for MVP, migrate to Option B if multi-warehouse support is needed.

### 13.3 Shipping Address JSONB Shape

The `orders.shipping_address JSONB` column should store the `ShippingAddress` shape defined in Section 3.1. This ensures the address can be passed directly to the shipping service without transformation.

---

## 14. Open Questions Summary

### Resolved (from v0.1)

- [x] Auth method — Bearer token
- [x] Sandbox vs production — Same account, separate keys, different base URLs
- [x] Account dashboard — `app.envia.com`
- [x] Billing model — Prepaid wallet, pay-per-label, rate quotes are free
- [x] Envia platform fee — None
- [x] Discount tiers — Automatic, ~70% off carrier retail
- [x] Colonia field name — `district`
- [x] State code format — 2-3 letter abbreviation ("NL", "CMX"), not ISO
- [x] Interior/exterior number — `number` (ext) and `additional` (int)
- [x] Carrier list for MX domestic — 12 carriers confirmed
- [x] Multi-carrier quoting — One `/ship/rate/` call returns all carriers
- [x] Multi-package support — Yes, via `packages[]` array
- [x] Package limits — Per-carrier, filtered automatically by `/ship/rate/`
- [x] Address validation — Separate endpoint (`queries.envia.com/zip-code/`)

### Discover During Development (via sandbox testing)

- [ ] Rate quote response JSON shape → build `EnviaRateResponse` Zod schema
- [ ] Label generation response JSON shape → build `EnviaGenerateResponse` Zod schema
- [ ] Tracking response JSON shape → build `EnviaTrackResponse` Zod schema
- [ ] Error response JSON shape → build `EnviaErrorResponse` Zod schema + `parseError()`
- [ ] Quote ID / rate-locking behavior
- [ ] Quote TTL (how long before price changes)
- [ ] Price breakdown in response (base vs surcharges vs total)
- [ ] Tracking status values → populate mapping table (Section 6.6)
- [ ] Webhook support for tracking (push vs poll)
- [ ] Label format options (PDF, PNG, ZPL, sizes)
- [ ] Label URL expiry
- [ ] Sandbox realism (real rates vs dummy data)
- [ ] Cancellation window and refund behavior
- [ ] Rate limits and timeout characteristics
- [ ] Charge timing (immediate on generate vs carrier pickup)

### Architect Decisions Needed

- [ ] Address model change approval (Section 3.1)
- [ ] `order_items` column naming — `shipping_shipment_id` + `shipping_provider` (Section 13.1)
- [ ] Manufacturer origin address schema (Section 13.2)
- [ ] `orders.shipping_address` JSONB shape confirmation (Section 13.3)

### Business Decisions (from v0.1, still open)

- [ ] Auto-select cheapest carrier, or let customer choose?
- [ ] Auto-generate label on payment, or manufacturer triggers manually?
- [ ] Surcharge breakdown — show to customer or just total?

---

## 15. Implementation Plan

This plan covers building the shipping service end-to-end. Each phase produces working, tested code that builds on the previous phase. Phases are ordered by dependency — you cannot skip ahead.

### Prerequisites

Before starting Phase 1:

- [ ] Envia sandbox API key available (from `app.envia.com`)
- [ ] `ENVIA_API_KEY` and `ENVIA_API_URL` added to `.env.local`
- [ ] Architect has reviewed Sections 3.1, 13.1, 13.2, 13.3 (address model + schema recommendations)

---

### Phase 1: Domain Types & Provider Interface

**Goal:** Define the provider-agnostic contract that the entire shipping system builds on. No provider-specific code yet.

**Files to create:**

1. `src/services/shipping/types.ts`
2. `src/services/shipping/shipping.provider.ts`

**Step 1.1 — Create `src/services/shipping/types.ts`**

Define all domain types exactly as specified in Section 3:

- `ShippingAddress` (with `streetNumber`, `interiorNumber`, `neighborhood` per Section 3.1)
- `ShippingPackage` (with `type` field per Section 3.2)
- `ShippingQuote` (per Section 3.3)
- `ShippingLabel` (per Section 3.4)
- `TrackingEvent`, `TrackingResult`, `TrackingStatus` (per Section 3.5)
- `ShippingProviderError`, `ShippingErrorCode` (per Section 3.6)

Add Zod schemas that mirror each interface for runtime validation at API boundaries:

- `ShippingAddressSchema`
- `ShippingPackageSchema`
- `ShippingQuoteSchema`
- `ShippingLabelSchema`

These schemas validate incoming data (e.g., the checkout route validates the customer's address). They do NOT validate provider API responses — that's the client's job (Phase 2).

**Step 1.2 — Create `src/services/shipping/shipping.provider.ts`**

Define the `ShippingProvider` interface exactly as specified in Section 4. This is the contract every provider adapter must implement. Export it.

**Verification:** TypeScript compiles. No runtime behavior yet — this is pure type definitions.

---

### Phase 2: Envia HTTP Client

**Goal:** Build the low-level HTTP client that talks to Envia's API. This layer knows about Envia's URL structure, auth headers, and response parsing — but does NOT know about our domain types.

**Files to create:**

1. `src/lib/envia/client.ts`
2. `src/lib/envia/types.ts`
3. `src/lib/envia/index.ts`
4. `src/lib/envia/__tests__/client.test.ts`

**Step 2.1 — Create `src/lib/envia/types.ts`**

Define Zod schemas for Envia's API shapes. Start with the **request** schemas (known from research — see Section 6.1, 6.2, 6.3):

```
EnviaAddressSchema        — { name, company?, email?, phone, street, number, ... }
EnviaPackageSchema        — { type, content, amount, weight, weightUnit, lengthUnit, dimensions, declaredValue, currency? }
EnviaShipmentSchema       — { type: 1|2|3, carrier?, service? }
EnviaRateRequestSchema    — { origin, destination, packages, shipment }
EnviaGenerateRequestSchema — same shape as rate request (plus carrier/service selection)
EnviaCancelRequestSchema  — { carrier, trackingNumber } (verify exact shape in sandbox)
EnviaTrackRequestSchema   — { trackingNumber } (verify exact shape in sandbox)
```

For **response** schemas, start with permissive schemas (`z.object({}).passthrough()`) that capture the raw shape. These will be tightened in Phase 6 after real sandbox responses are captured:

```
EnviaRateResponseSchema     — z.object({}).passthrough()  // tighten after sandbox call
EnviaGenerateResponseSchema — z.object({}).passthrough()
EnviaTrackResponseSchema    — z.object({}).passthrough()
EnviaCancelResponseSchema   — z.object({}).passthrough()
EnviaErrorResponseSchema    — z.object({}).passthrough()
```

**Step 2.2 — Create `src/lib/envia/client.ts`**

Build the `EnviaClient` class per Section 5.3:

- Constructor takes `apiKey` and `baseUrl`
- Single `post<T>(endpoint, body, schema)` method
- Sets `Authorization: Bearer ${apiKey}` and `Content-Type: application/json` headers
- Uses `AbortSignal.timeout(30_000)` for request timeout
- On non-OK response: calls `parseError()` which throws `ShippingProviderError`
- On OK response: parses JSON through the provided Zod schema
- `parseError()` starts as a simple implementation that reads response text/JSON and maps HTTP status codes to `ShippingErrorCode` values (401 → `AUTH_ERROR`, 429 → `RATE_LIMIT`, etc.). Refine as real error shapes are discovered.

Expose convenience methods that map to Envia endpoints:

```typescript
async getRate(request: EnviaRateRequest): Promise<EnviaRateResponse>
async generateLabel(request: EnviaGenerateRequest): Promise<EnviaGenerateResponse>
async track(request: EnviaTrackRequest): Promise<EnviaTrackResponse>
async cancel(request: EnviaCancelRequest): Promise<EnviaCancelResponse>
```

Each convenience method calls `this.post()` with the correct endpoint and schema.

**Step 2.3 — Create `src/lib/envia/index.ts`**

Barrel export: `EnviaClient`, all Zod schemas, all inferred types.

**Step 2.4 — Write unit tests `src/lib/envia/__tests__/client.test.ts`**

Mock `global.fetch` (or use `msw`). Test:

- Correct URL construction (`baseUrl + endpoint`)
- Correct auth header sent
- Correct Content-Type header sent
- Request body is JSON-serialized correctly
- Successful response is parsed through Zod schema
- Non-OK response throws `ShippingProviderError` with correct `code`
- Timeout triggers `ShippingProviderError` with `PROVIDER_UNAVAILABLE`
- Zod validation failure throws (malformed response from provider)

**Verification:** All unit tests pass. `EnviaClient` can be instantiated with test credentials.

---

### Phase 3: Envia Provider Adapter

**Goal:** Build the adapter that implements `ShippingProvider` using `EnviaClient`. This is the translation layer between our domain types and Envia's API shapes.

**Files to create:**

1. `src/services/shipping/envia.provider.ts`
2. `src/services/shipping/__tests__/envia.provider.test.ts`

**Step 3.1 — Create `src/services/shipping/envia.provider.ts`**

Implement the `ShippingProvider` interface:

```typescript
class EnviaProvider implements ShippingProvider {
  readonly name = 'envia';
  private client: EnviaClient;

  constructor() {
    const apiKey = process.env.ENVIA_API_KEY;
    const baseUrl = process.env.ENVIA_API_URL;
    if (!apiKey || !baseUrl) throw new Error('Missing ENVIA_API_KEY or ENVIA_API_URL');
    this.client = new EnviaClient(apiKey, baseUrl);
  }
}
```

**`getQuotes()` implementation:**

1. Map `ShippingAddress` → `EnviaAddress` using the mapping in Section 6.1
2. Map `ShippingPackage[]` → `EnviaPackage[]` using the mapping in Section 6.2
3. Build the rate request per Section 6.3 (omit `shipment.carrier` to get all carriers)
4. Call `this.client.getRate(request)`
5. Map each carrier result in the response → `ShippingQuote` (carrier name, service, price, estimated days, quote ID)
6. Return the array of `ShippingQuote[]`

**`createLabel()` implementation:**

1. Same address/package mapping as `getQuotes()`
2. Build the generate request — same shape as rate request but include the selected carrier/service from `selectedQuote`
3. Call `this.client.generateLabel(request)`
4. Map response → `ShippingLabel` (tracking number, label URL, shipment ID, price)
5. Return the `ShippingLabel`

**`trackShipment()` implementation:**

1. Call `this.client.track({ trackingNumber })`
2. Map response events → `TrackingEvent[]`
3. Map current status → `TrackingStatus` using the mapping table (Section 6.6). For unknown statuses, default to `'in_transit'` and log a warning.
4. Return `TrackingResult`

**`cancelShipment()` implementation:**

1. Call `this.client.cancel({ carrier, trackingNumber })`
2. Map response → `{ success, refunded }`

**Helper functions** (private, in the same file):

- `toEnviaAddress(addr: ShippingAddress): EnviaAddress` — per Section 6.1
- `toEnviaPackages(pkgs: ShippingPackage[]): EnviaPackage[]` — per Section 6.2
- `toShipmentType(pkgs: ShippingPackage[]): 1 | 2 | 3` — derive from package types
- `mapTrackingStatus(enviaStatus: string): TrackingStatus` — per Section 6.6

**Step 3.2 — Write unit tests `src/services/shipping/__tests__/envia.provider.test.ts`**

Mock `EnviaClient` (not `fetch` — that's the client's concern). Test:

- `toEnviaAddress()` maps all domain fields to correct Envia fields
- `toEnviaPackages()` maps weight/dimensions/type correctly, hardcodes "KG"/"CM"
- `getQuotes()` transforms mock Envia rate response → correct `ShippingQuote[]`
- `createLabel()` transforms mock Envia generate response → correct `ShippingLabel`
- `trackShipment()` maps mock tracking events to `TrackingEvent[]` with correct statuses
- `cancelShipment()` returns correct success/refunded flags
- Missing env vars throw clear error at construction time
- Envia errors are caught and re-thrown as `ShippingProviderError` with correct codes

**Verification:** All unit tests pass. The adapter correctly translates between domain types and Envia shapes in both directions.

---

### Phase 4: Shipping Service (Business Logic)

**Goal:** Build the service layer that sits between API routes and the provider. Contains business logic, orchestration, and idempotency protection.

**Files to create:**

1. `src/services/shipping/shipping.service.ts`
2. `src/services/shipping/index.ts`
3. `src/services/shipping/__tests__/shipping.service.test.ts`

**Step 4.1 — Create `src/services/shipping/shipping.service.ts`**

```typescript
class ShippingService {
  constructor(private readonly provider: ShippingProvider) {}
}
```

**`getCheckoutQuotes(destination, itemsByManufacturer)` method:**

1. Accept destination address + items grouped by manufacturer (with their origin addresses and package details already resolved — the API route does the DB lookups)
2. For each manufacturer group, call `this.provider.getQuotes(origin, destination, packages)`
3. Sort each group's results by `totalPriceMxn` ascending (cheapest first)
4. Return the grouped, sorted results
5. If a manufacturer's quote call fails, include an error for that manufacturer in the response rather than failing the entire request — other manufacturers' quotes should still be returned

**`generateLabel(origin, destination, packages, selectedQuote, existingLabel?)` method:**

1. **Idempotency check:** If `existingLabel` is provided (caller checked DB), return it immediately without calling the provider
2. Call `this.provider.createLabel(origin, destination, packages, selectedQuote)`
3. Return the `ShippingLabel`
4. The caller (API route) is responsible for storing the label in the DB and passing `existingLabel` on retries

**`getTracking(trackingNumber)` method:**

1. Call `this.provider.trackShipment(trackingNumber)`
2. Return the `TrackingResult`

**`cancelShipment(carrier, trackingNumber)` method:**

1. Call `this.provider.cancelShipment(carrier, trackingNumber)`
2. Return the result

**Step 4.2 — Create `src/services/shipping/index.ts`**

Barrel exports + factory function per Section 7.5:

- Export all types from `./types`
- Export `ShippingProvider` from `./shipping.provider`
- Export `ShippingService` from `./shipping.service`
- Export `createShippingService()` factory function

**Step 4.3 — Write unit tests `src/services/shipping/__tests__/shipping.service.test.ts`**

Create a mock `ShippingProvider` (simple object implementing the interface with `vi.fn()` methods). Test:

- `getCheckoutQuotes()` calls provider once per manufacturer group
- `getCheckoutQuotes()` sorts results cheapest-first
- `getCheckoutQuotes()` returns partial results if one manufacturer's quotes fail
- `generateLabel()` returns existing label without calling provider (idempotency)
- `generateLabel()` calls provider when no existing label
- `getTracking()` passes through to provider
- `cancelShipment()` passes through to provider
- Factory function creates service with correct provider based on env var

**Verification:** All unit tests pass. Business logic works correctly with any `ShippingProvider` implementation.

---

### Phase 5: API Routes

**Goal:** Wire the shipping service into HTTP endpoints that the checkout UI and manufacturer dashboard will call.

**Files to create:**

1. `src/app/api/checkout/shipping-quotes/route.ts`
2. `src/app/api/dashboard/orders/[id]/label/route.ts`

**Step 5.1 — Create `POST /api/checkout/shipping-quotes`**

Per Section 8.1:

1. Parse and validate the request body with Zod (destination address fields + items array)
2. Load each item's part record from Supabase (need weight, dimensions, manufacturer_id)
3. Group items by `manufacturer_id`
4. For each manufacturer: load the manufacturer's origin/warehouse address from Supabase
5. For each manufacturer: build `ShippingPackage[]` from the items
   - `weightKg` = `part.weight_kg` (or column name per schema) \* quantity
   - Dimensions from `part.dimensions_cm` JSONB (or columns per schema)
   - `declaredValueMxn` = `part.price * quantity`
   - `contents` = part name(s)
   - `type` = `'box'` (default for auto parts)
6. Build the destination `ShippingAddress` from the request
7. Call `shippingService.getCheckoutQuotes(destination, manufacturerGroups)`
8. Return the grouped quotes response

**Error handling:**

- Invalid request body → 400 with validation errors
- Part not found → 400 with "item not found" error
- Manufacturer has no origin address → include error for that manufacturer, return others
- Provider error → 502 with `ShippingProviderError` details

**Step 5.2 — Create `POST /api/dashboard/orders/[id]/label`**

Per Section 8.2:

1. Authenticate the request (WorkOS session — must be a manufacturer user)
2. Parse and validate the request body with Zod
3. Load the order and order item from Supabase
4. Verify the authenticated manufacturer owns this order item
5. **Idempotency check:** If order item already has a tracking number + label URL, return the existing label
6. Load the manufacturer's origin address
7. Load the order's shipping address (from `orders.shipping_address` JSONB)
8. Build `ShippingPackage[]` from the order item data
9. Call `shippingService.generateLabel(origin, destination, packages, selectedQuote, existingLabel)`
10. Update the order item in Supabase: set `tracking_number`, `label_url`, `shipping_shipment_id`, `shipping_provider`, `shipping_carrier`
11. Return the label

**Error handling:**

- Not authenticated → 401
- Doesn't own order item → 403
- Order item not in correct status for label generation → 409
- Provider error → 502

**Verification:** Routes respond correctly to valid and invalid requests (test with mock `ShippingService`).

---

### Phase 6: Sandbox Integration & Schema Hardening

**Goal:** Make real calls to the Envia sandbox, capture actual response shapes, tighten Zod schemas, and fill in the remaining unknowns.

**This phase is iterative — it's a series of sandbox experiments, not a single implementation step.**

**Step 6.1 — Sandbox rate quote**

1. Write a small script or test that calls `/ship/rate/` via `EnviaClient` with a real MX-to-MX address pair (use the sample from Section 6.3 research)
2. Capture the full JSON response
3. Update `EnviaRateResponseSchema` in `src/lib/envia/types.ts` with the actual shape (replace `.passthrough()` with explicit fields)
4. Update `EnviaProvider.getQuotes()` if the response structure differs from assumptions
5. Document: Does the response include a quote ID? Price breakdown? Estimated days format?
6. Update Section 6 of this spec with findings

**Step 6.2 — Sandbox label generation**

1. Using a rate quote result from Step 6.1, call `/ship/generate/`
2. Capture the full JSON response
3. Update `EnviaGenerateResponseSchema` with actual shape
4. Update `EnviaProvider.createLabel()` if needed
5. Document: Label URL format, charge behavior, label formats available
6. Test multi-package: send 2+ packages and observe tracking number behavior

**Step 6.3 — Sandbox tracking**

1. Using a tracking number from Step 6.2, call `/ship/generaltrack/`
2. Capture the full JSON response
3. Update `EnviaTrackResponseSchema` with actual shape
4. Begin populating the tracking status mapping table (Section 6.6)
5. Update `EnviaProvider.trackShipment()` with real status mapping

**Step 6.4 — Sandbox cancellation**

1. Using a shipment from Step 6.2, call `/ship/cancel/`
2. Capture the response
3. Update `EnviaCancelResponseSchema`
4. Document: cancellation window, refund timing

**Step 6.5 — Sandbox error capture**

Test these scenarios and capture the error response JSON:

- Bad/missing address fields
- Invalid API key
- Mismatched postal code + state
- Very remote postal code (no carriers available)
- Oversized package dimensions
- Any other errors encountered

Update `EnviaClient.parseError()` with the actual error response structure.

**Step 6.6 — Harden all Zod schemas**

After Steps 6.1-6.5, all response schemas should have explicit field definitions instead of `.passthrough()`. Run all existing unit tests to ensure nothing broke.

**Verification:** All unit tests still pass. Sandbox calls succeed end-to-end. Response schemas are tight. Error handling covers observed error shapes.

---

### Phase 7: Webhook or Polling for Tracking Updates

**Goal:** Implement the mechanism for receiving tracking status updates from Envia so we can update order status and notify customers.

> This phase depends on what's discovered in Phase 6.3. There are two paths:

**Path A — If Envia supports webhooks:**

1. Create `src/app/api/webhooks/envia/route.ts`
2. Verify the webhook signature/payload format (discovered in Phase 6)
3. Parse the tracking update
4. Look up the order item by tracking number or shipment ID
5. Update the order item status
6. Emit an Inngest event (`shipping/tracking-updated`) for downstream actions (email notifications, etc.)
7. Register the webhook URL in the Envia dashboard

**Path B — If Envia requires polling:**

1. Create `src/inngest/functions/poll-tracking.ts`
2. Inngest cron function that runs on a schedule (e.g., every 30 minutes)
3. Query all order items with status `'shipped'` (have a tracking number, not yet delivered)
4. For each, call `shippingService.getTracking(trackingNumber)`
5. If status changed, update the order item and emit Inngest event
6. Batch to avoid rate limits — process in chunks with delays between

**Verification:** Tracking updates flow from Envia into the order item records.

---

### Phase Summary

| Phase | What                              | Depends On | Key Output                                   |
| ----- | --------------------------------- | ---------- | -------------------------------------------- |
| 1     | Domain types + provider interface | Nothing    | `types.ts`, `shipping.provider.ts`           |
| 2     | Envia HTTP client                 | Phase 1    | `lib/envia/client.ts` + unit tests           |
| 3     | Envia provider adapter            | Phase 2    | `envia.provider.ts` + unit tests             |
| 4     | Shipping service (business logic) | Phase 3    | `shipping.service.ts` + factory + unit tests |
| 5     | API routes                        | Phase 4    | Checkout quotes + label generation routes    |
| 6     | Sandbox integration + hardening   | Phase 5    | Tight Zod schemas, filled placeholders       |
| 7     | Tracking webhook or polling       | Phase 6    | Live tracking updates into order items       |

**Data Architecture dependencies (needed before Phase 5 can fully work):**

- Manufacturer origin address (Section 13.2) — needed to look up origin for quotes
- `order_items` shipping columns (Section 13.1) — needed to store label results
- `orders.shipping_address` JSONB shape (Section 13.3) — needed to read destination

These schema changes are owned by the Data Architecture spec and may be implemented as part of the broader commerce epic. Phase 5 can be developed against mocked/hardcoded addresses and updated once the schema is in place.

---

**End of Document**

RefaccionesDirect Shipping API Spec v1.0 | March 2026
