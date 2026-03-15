# Plan: Shipping API Exploration Test Suite

## Context

RefaccionesDirect is a multi-manufacturer auto parts marketplace for Mexico. The shipping integration is greenfield — no production code exists yet. We have a detailed Shipping API Spec (`docs/RefaccionesDirect_ShippingAPISpec_v1_0.md`) but it contains **15+ "DISCOVER DURING DEVELOPMENT" placeholders** covering response shapes, quote behavior, tracking statuses, error formats, label options, webhook support, and more.

Rather than build the full shipping service on assumptions and rework constantly, we're taking a **test-driven discovery approach**: write a comprehensive test suite against the shipping provider's sandbox API to pin down exactly how it behaves before writing any production code.

### Goals

1. **Discover** — Answer every open question from the shipping spec via real API calls
2. **Document** — Capture actual request/response shapes as test fixtures and Zod schemas
3. **Validate** — Confirm the provider can power every workflow the marketplace needs
4. **De-risk** — Surface limitations, gotchas, and edge cases before committing to architecture

### Design Principles

- **Provider-agnostic plan** — This plan describes _what to test_, not provider-specific implementation details. The same test categories apply whether the provider is Envia, Skydropx, EasyPost, Shippo, or any other shipping API. Code will differ; the plan does not.
- **Auto parts context** — Tests use realistic auto parts fixtures (brake pads, rotors, bumpers, sensors) with real Mexican addresses, because shipping behavior varies by weight, dimensions, and geography.
- **First-class project code** — The test suite is a permanent part of the codebase, not a throwaway script. It lives in the standard test infrastructure and follows project conventions.

### What This Plan Does NOT Cover

- Production shipping service implementation (that comes after)
- Database schema for orders/shipments
- UI/UX for checkout or tracking
- Stripe payment integration

### Business Rules Affecting This Suite

These confirmed decisions directly shape what we test. See Data Architecture v5.1 and Technical Architecture v7.0 for full context.

**Weight-based carrier routing (core shipping logic):**

```
Order weight from a manufacturer ≤ 5kg → Quote DHL, FedEx, Estafeta → auto-select cheapest
Order weight from a manufacturer > 5kg → Quote Castores, Paquetexpress → auto-select cheapest
```

Customer does NOT choose carrier — we pick cheapest automatically and pass cost through.

**Multi-item orders = separate packages:** Each product ships in its own box. Multiple items from one manufacturer become separate entries in the `packages` array. Manufacturers upload per-product shipping box dimensions: `peso_paquete_kg`, `largo_paquete_cm`, `ancho_paquete_cm`, `alto_paquete_cm`.

**Multi-manufacturer split shipping:** Each manufacturer = separate shipment with separate origin address, tracking number, and label. Quote API called once per manufacturer per order.

**Platform fee excluded from shipping:** 9-10% platform fee applies to item subtotals only. Shipping costs are pass-through to the customer.

**Currency:** All prices MXN. No currency conversion for MVP (Mexico-only).

**Carrier exclusions (post-MVP):** Some products can't ship with certain carriers (e.g., oxygen sensors can't go DHL). Future `excluded_carriers` field per product — not tested now but context for the weight-routing tests.

### Already Validated (prior sandbox/production testing)

These findings are confirmed. Tests may revalidate but these are not unknowns:

- **Auth:** Bearer token works. Sandbox unreliable for some carriers (FedEx auth errors, Estafeta PHP crash, DHL fine). Production quotes are free — safe for testing.
- **Rate quote response shape:** `carrier`, `carrierDescription`, `serviceId`, `service`, `serviceDescription`, `deliveryEstimate`, `deliveryDate` (`date`, `dateDifference`, `timeUnit`), `totalPrice`, `basePrice`, `currency`.
- **Label response shape:** `carrier`, `service`, `shipmentId`, `trackingNumber`, `trackUrl`, `label` (S3 PDF URL), `totalPrice`, `currentBalance`, `currency`. Formats: PDF and ZPL; sizes: STOCK_4X6 and PAPER_8.5X11.
- **Tracking response shape:** `status`, `statusColor`, `estimatedDelivery`, `pickupDate`, `shippedAt`, `deliveredAt`, `signedBy`, `trackUrl`, `trackUrlSite`, `eventHistory[]`, `podFile`, `podEvidences[]`.
- **Cancellation response shape:** `carrier`, `service`, `trackingNumber`, `balanceReturned` (was 0 in sandbox), `balanceReturnDate` (was null in sandbox).
- **Latency:** ~2.7s per quote call in sandbox.

**Known issues to investigate:**

- **Currency bug:** Label endpoint returned `currency: "USD"` even when `currency: "MXN"` sent. Needs confirmation.
- **Phone code inconsistency:** Quote uses `phone_code: "MX"`, label uses `phone_code: "52"`.

### High-Priority Unknowns

These will most impact our architecture. **Prioritize during execution:**

1. **Test 4.11 — Multi-carrier quoting in one call:** Can omitting `shipment.carrier` return ALL carriers in one call? If yes, checkout drops from N parallel calls to 1 per manufacturer.
2. **Module 3 — Address validation (Geocodes API):** `GET geocodes(-test).envia.com/zip-code/{cp}?country_code=MX`. Colonias per CP → colonia dropdown at checkout.
3. **Module 8 — Error handling:** Actual error JSON shape for `parseError()`. Field-level vs request-level, HTTP status codes, error code mapping.
4. **Test 5.11 — Label URL expiry:** Expire → download + Supabase Storage. Permanent → store URL. Affects storage architecture.
5. **Test 5.16 — Duplicate label = double charge:** Confirm idempotency requirement.
6. **Tests 4.23/4.24 — Quote freshness / TTL:** Price drift between quote and label generation → re-quote strategy needed?

---

## Prerequisites

Before any developer starts writing tests:

- [ ] **Sandbox API credentials** — Obtain test/sandbox API key from the shipping provider's dashboard
- [ ] **Environment variables** — Add credentials to `.env.local`:
  ```
  SHIPPING_API_KEY=<sandbox-key>
  SHIPPING_API_URL=<sandbox-base-url>
  ```
- [ ] **Fund sandbox wallet** (if applicable) — Some providers use a prepaid wallet model. Sandbox wallets typically use fake money. Confirm this in Test 1.
- [ ] **Vitest configured** — Already in place (`vitest.config.ts`). See "Test Infrastructure" section below for the additional project config needed.

---

## Test Infrastructure

### File Structure

```
src/
└── lib/
    └── shipping-exploration/         # Exploration test module
        ├── README.md                 # Quick-start for developers
        ├── helpers/
        │   ├── api-client.ts         # Thin HTTP wrapper (never throws on 4xx/5xx)
        │   ├── fixtures.ts           # Addresses, packages, auto parts data
        │   ├── snapshot.ts           # Utility to capture & save response shapes
        │   ├── assertions.ts         # Shared assertion helpers
        │   └── schemas.ts            # Zod schemas built from real responses (key deliverable)
        ├── __tests__/
        │   ├── 01-connectivity.test.ts
        │   ├── 02-reference-data.test.ts
        │   ├── 03-address-validation.test.ts
        │   ├── 04-rate-quoting.test.ts
        │   ├── 05-label-generation.test.ts
        │   ├── 06-tracking.test.ts
        │   ├── 07-cancellation.test.ts
        │   ├── 08-error-handling.test.ts
        │   ├── 09-edge-cases.test.ts
        │   ├── 10-webhook-discovery.test.ts
        │   └── 11-pickup-scheduling.test.ts
        └── __snapshots__/            # Captured response JSON (git-tracked)
            └── .gitkeep
```

**Why `src/lib/shipping-exploration/`:** This is a discovery module — it sits alongside future provider clients (`src/lib/envia/`, etc.) but is explicitly about exploration, not production code. When exploration is complete, findings feed into the production client. The exploration tests remain as regression/documentation.

### Vitest Project Configuration

Add a separate vitest project so exploration tests run independently from unit tests:

```typescript
// vitest.config.ts — add to existing config
// Add a project for exploration tests:
// - Separate from unit tests (they hit real APIs, are slower)
// - Run with: npm run test:explore
// - Excluded from: npm run test:run (unit tests)
```

**Package.json script:**

```json
{
  "test:explore": "vitest run --project exploration",
  "test:explore:watch": "vitest --project exploration"
}
```

### Helpers

#### `api-client.ts` — Generic HTTP Client

A thin, provider-agnostic HTTP wrapper for making sandbox API calls. Not a production client — just enough to make authenticated requests and return raw JSON.

```
Purpose: Make authenticated HTTP requests to the shipping provider's sandbox
Features:
  - Configurable base URL and auth (from env vars)
  - GET and POST methods
  - Returns raw JSON (no schema validation — that's what the tests discover)
  - Logs request/response for debugging
  - Configurable timeout (default 30s)
  - Records response time for latency benchmarking
```

**Critical:** This client should be dead simple. No retries, no error mapping, no Zod validation. The tests themselves determine what the responses look like.

#### `fixtures.ts` — Test Data

Realistic Mexican addresses and auto parts packages. These fixtures are used across all test files.

**Addresses** (real Mexican postal codes, neighborhoods, cities):

| Fixture Name           | Location         | Postal Code | State | Use Case                                |
| ---------------------- | ---------------- | ----------- | ----- | --------------------------------------- |
| `warehouseMonterrey`   | Monterrey, NL    | 64000       | NL    | Manufacturer origin (industrial area)   |
| `warehouseCDMX`        | Ciudad de México | 06600       | CMX   | Manufacturer origin (urban)             |
| `warehouseGuadalajara` | Guadalajara, JAL | 44100       | JAL   | Manufacturer origin                     |
| `customerCDMX`         | Col. Roma, CDMX  | 06700       | CMX   | Customer destination (urban)            |
| `customerMonterrey`    | Col. Centro, MTY | 64000       | NL    | Customer destination (metro)            |
| `customerMerida`       | Mérida, YUC      | 97000       | YUC   | Customer destination (different region) |
| `customerRural`        | Small town, OAX  | 71256       | OAX   | Customer destination (rural/remote)     |
| `customerTijuana`      | Tijuana, BC      | 22000       | BC    | Customer destination (border city)      |

Each address fixture must include all fields the provider requires: name, phone (+52...), street, street number, neighborhood (colonia), city, state code, postal code, country ("MX"), and reference.

**Packages** (realistic auto parts):

| Fixture Name        | Weight (kg) | Dimensions (L×W×H cm) | Declared Value (MXN) | Notes                     |
| ------------------- | ----------- | --------------------- | -------------------- | ------------------------- |
| `brakePadSet`       | 3.5         | 30×25×10              | 850                  | Standard box, common item |
| `brakeRotorPair`    | 12.0        | 35×35×15              | 1,800                | Heavy item                |
| `sparkPlugSet`      | 0.5         | 15×10×8               | 320                  | Very light, small box     |
| `oilFilterKit`      | 1.2         | 20×15×15              | 450                  | Light, standard box       |
| `bumperFront`       | 8.0         | 150×60×30             | 3,500                | Oversized item            |
| `exhaustPipe`       | 6.5         | 120×20×20             | 2,200                | Long/awkward shape        |
| `alternator`        | 5.0         | 25×20×20              | 2,800                | Medium weight, high value |
| `headlightAssembly` | 2.5         | 50×35×30              | 4,500                | Fragile, high value       |

Each package fixture includes: weight (kg), length/width/height (cm), declared value (MXN), contents description, and package type (box/envelope/pallet).

**Real Launch Products** (from Humberto's 4 manufacturers — approximate shipping box dimensions):

| Fixture Name       | Weight (kg) | Dimensions (L×W×H cm) | Declared Value (MXN) | Notes                                    |
| ------------------ | ----------- | --------------------- | -------------------- | ---------------------------------------- |
| `mazaDeRueda`      | 4.0         | 35×30×25              | 1,200                | Heavy for size, ≤5kg carrier group       |
| `alternador12V`    | 6.5         | 30×25×25              | 2,800                | >5kg carrier group, medium-heavy         |
| `soporteDeMotor`   | 3.0         | 25×20×20              | 900                  | Medium, ≤5kg carrier group               |
| `chicoteElectrico` | 1.0         | 30×15×10              | 650                  | Light, long-ish box, ≤5kg group          |
| `mazaPesada`       | 5.0         | 35×30×25              | 1,500                | Boundary: exactly 5kg (test both groups) |

These real-product fixtures are critical for testing the weight-based carrier routing rules. Keep the generic fixtures above for edge case testing (oversized bumper, very light spark plugs, etc.).

#### `snapshot.ts` — Response Capture Utility

```
Purpose: Save raw API responses to __snapshots__/ for reference
Features:
  - saveSnapshot(testName: string, response: unknown): void
  - Writes JSON files with pretty-printing
  - Includes metadata: timestamp, endpoint called, request summary
  - Files are git-tracked (they ARE the documentation)
```

#### `assertions.ts` — Shared Test Helpers

```
Purpose: Reusable assertion functions across test files
Features:
  - assertValidQuote(quote): checks required fields exist
  - assertValidLabel(label): checks tracking number, URL, carrier
  - assertValidTrackingEvent(event): checks timestamp, status, description
  - assertResponseTime(ms, maxMs): latency threshold check
  - assertErrorShape(error): checks error has code, message, etc.
```

---

## Test Suite: Module-by-Module Specification

Each test file below is a self-contained module. They are **numbered for recommended execution order** (later tests may depend on data created by earlier tests, like tracking numbers from generated labels), but each module should also document its dependencies clearly so developers can work on them in parallel where possible.

---

### Module 1: Connectivity & Authentication (`01-connectivity.test.ts`)

**Purpose:** Verify we can talk to the sandbox and understand the auth model.

**Dependencies:** None. Run this first.

**Tests:**

| #   | Test Name                                      | What It Does                                                              | What We Learn                                                    |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1.1 | `authenticates with valid sandbox credentials` | Make a simple authenticated request (e.g., list carriers or health check) | Auth header format works, sandbox is reachable                   |
| 1.2 | `rejects invalid API key`                      | Send request with a bad/empty API key                                     | Error response shape for auth failures, HTTP status code         |
| 1.3 | `rejects missing API key`                      | Send request with no auth header                                          | Whether it returns 401 or 403, error body shape                  |
| 1.4 | `returns rate limit headers (if any)`          | Inspect response headers from a valid request                             | Whether rate limit info is exposed (X-RateLimit-\*, Retry-After) |
| 1.5 | `sandbox wallet has balance (if wallet model)` | Check if there's a balance/account endpoint                               | Whether we can monitor wallet balance programmatically           |
| 1.6 | `measures baseline response latency`           | Time a simple request, record p50/p95 over 5 calls                        | Baseline latency for timeout configuration                       |

**Snapshot outputs:**

- `01-auth-success-headers.json` — Full response headers from a successful request
- `01-auth-error-invalid-key.json` — Error response body for bad API key
- `01-auth-error-missing-key.json` — Error response body for missing auth

**Key findings to document:**

- Auth mechanism confirmed (Bearer token, API key header, OAuth, etc.)
- Rate limit policy (if discoverable from headers)
- Wallet/balance endpoint availability
- Baseline latency range

---

### Module 2: Reference Data & Carrier Discovery (`02-reference-data.test.ts`)

**Purpose:** Discover what carriers, services, countries, and postal codes the provider supports. This is the foundation for understanding what shipping options we can offer customers.

**Dependencies:** Module 1 (auth works).

**Tests:**

| #   | Test Name                                       | What It Does                                                  | What We Learn                                      |
| --- | ----------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| 2.1 | `lists available carriers for Mexico`           | Query carrier list filtered by country=MX                     | Which carriers are enabled, their identifiers      |
| 2.2 | `carrier list includes expected major carriers` | Assert DHL, FedEx, Estafeta (or equivalents) are present      | Whether the account has the carriers we need       |
| 2.3 | `lists available carrier service types`         | For each carrier, query available service levels              | Express vs ground vs economy options per carrier   |
| 2.4 | `lists supported countries`                     | Query country list                                            | Geographic coverage, country code format           |
| 2.5 | `lists states/regions for Mexico`               | Query state list for MX                                       | State code format (2-letter, 3-letter, full name?) |
| 2.6 | `identifies carriers requiring BYO credentials` | Check if any carriers are flagged as needing your own account | Which carriers work out of the box vs need setup   |

**Snapshot outputs:**

- `02-carriers-mx.json` — Full carrier list for Mexico
- `02-countries.json` — Supported countries
- `02-states-mx.json` — Mexican states with codes

**Key findings to document:**

- Complete carrier list with identifiers and service types
- Which carriers are pooled/aggregated vs require BYO account
- State code format (critical for address mapping)
- Any carriers specific to certain regions

---

### Module 3: Address & Postal Code Validation (`03-address-validation.test.ts`)

**Purpose:** Understand address validation capabilities. Accurate addresses are critical for auto parts shipping (heavy items, expensive return costs).

**Dependencies:** Module 1 (auth works).

**Tests:**

| #   | Test Name                                            | What It Does                                         | What We Learn                                                                    |
| --- | ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| 3.1 | `validates a known good postal code`                 | Send CP 06700 (Col. Roma, CDMX)                      | Response shape for valid postal code, returned data (neighborhoods, city, state) |
| 3.2 | `returns neighborhoods (colonias) for a postal code` | Check if validation returns a list of valid colonias | Whether we can power a colonia dropdown from the API                             |
| 3.3 | `rejects an invalid postal code`                     | Send CP 00000 or 99999                               | Error shape for bad postal code                                                  |
| 3.4 | `validates postal codes across different states`     | Test CPs from NL, JAL, YUC, OAX, BC                  | Consistent behavior across regions                                               |
| 3.5 | `validates a rural/remote postal code`               | Send the rural OAX fixture CP                        | Whether remote areas are recognized, any warnings                                |
| 3.6 | `returns city and state for a postal code`           | Check if postal code lookup returns city/state       | Whether we can auto-fill city/state from CP (UX optimization)                    |
| 3.7 | `handles postal code with leading zeros`             | Send CP 01000 (Álvaro Obregón, CDMX)                 | Whether leading zeros are preserved or stripped                                  |

**Snapshot outputs:**

- `03-postal-code-valid.json` — Response for valid CP with neighborhoods
- `03-postal-code-invalid.json` — Error response for bad CP
- `03-postal-code-rural.json` — Response for remote area CP

**Key findings to document:**

- Whether address validation endpoint exists and what it returns
- Colonia/neighborhood list availability per CP (huge UX win if available)
- City/state auto-fill capability
- How the provider handles edge-case postal codes

---

### Module 4: Rate Quoting (`04-rate-quoting.test.ts`)

**Purpose:** The most critical module. Rate quoting is the foundation of the checkout experience. This module explores every aspect of how the provider returns shipping rates.

**Dependencies:** Module 1 (auth works), Module 2 (carrier list known).

**Tests — Basic Quoting:**

| #   | Test Name                                          | What It Does                                        | What We Learn                                      |
| --- | -------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| 4.1 | `gets rates for a standard domestic shipment`      | Quote: Monterrey → CDMX, brake pad set (3.5kg)      | Full response shape, how carriers are listed       |
| 4.2 | `response contains carrier name and service level` | Assert each quote has carrier + service identifiers | How to display options to customer                 |
| 4.3 | `response contains price in expected currency`     | Assert price fields and currency code               | Price format (cents vs decimal), currency handling |
| 4.4 | `response contains estimated delivery time`        | Assert delivery estimate exists                     | Format: days (int), date, range, or text?          |
| 4.5 | `response includes a quote ID or reference`        | Check for any ID that could lock in the quoted rate | Whether quotes are ephemeral or referenceable      |
| 4.6 | `captures the complete rate response shape`        | Snapshot the full JSON, build initial Zod schema    | Source of truth for the response schema            |

**Tests — Price Analysis:**

| #    | Test Name                                                | What It Does                                           | What We Learn                               |
| ---- | -------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| 4.7  | `price includes breakdown (base, fuel, insurance, VAT)`  | Check if response has price components or just total   | Whether we can show surcharge transparency  |
| 4.8  | `heavier package costs more than lighter for same route` | Quote same route: spark plugs (0.5kg) vs rotors (12kg) | Price scales with weight as expected        |
| 4.9  | `longer distance costs more for same package`            | Quote same package: MTY→CDMX vs MTY→local              | Price scales with distance as expected      |
| 4.10 | `oversized package has higher cost or fewer carriers`    | Quote bumper fixture (150×60×30 cm)                    | Volumetric weight impact, carrier filtering |

**Tests — Multi-Carrier Behavior:**

| #    | Test Name                                                   | What It Does                                 | What We Learn                                   |
| ---- | ----------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| 4.11 | `returns quotes from multiple carriers in one call`         | Send rate request without specifying carrier | Multi-carrier response structure                |
| 4.12 | `can filter quotes to a specific carrier`                   | Send rate request specifying carrier=X       | How to request carrier-specific rates           |
| 4.13 | `different carriers return different prices for same route` | Compare prices across carriers from 4.11     | Price variance, cheapest carrier identification |
| 4.14 | `different carriers have different delivery estimates`      | Compare delivery times from 4.11             | Speed vs cost tradeoffs                         |

**Tests — Package Variations:**

| #    | Test Name                                     | What It Does                    | What We Learn                               |
| ---- | --------------------------------------------- | ------------------------------- | ------------------------------------------- |
| 4.15 | `quotes for envelope package type`            | Send request with type=envelope | Envelope support and pricing                |
| 4.16 | `quotes for pallet/freight package type`      | Send request with type=pallet   | Heavy freight support for large auto parts  |
| 4.17 | `quotes for multi-package shipment (2 boxes)` | Send 2 packages in one request  | Multi-package pricing, combined vs separate |
| 4.18 | `quotes for multi-package shipment (5 boxes)` | Send 5 packages in one request  | Scaling behavior, any package count limits  |

**Tests — Geographic Variations:**

| #    | Test Name                                         | What It Does                     | What We Learn                                    |
| ---- | ------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| 4.19 | `quotes for route to rural/remote area`           | MTY → rural OAX fixture          | Fewer carriers? Surcharges? Longer delivery?     |
| 4.20 | `quotes for route to border city`                 | MTY → Tijuana (BC)               | Border area handling                             |
| 4.21 | `quotes for short-distance same-city route`       | CDMX warehouse → CDMX customer   | Last-mile carrier availability (99Minutos, etc.) |
| 4.22 | `quotes across multiple origin-destination pairs` | 3 different routes, same package | Response consistency, regional price patterns    |

**Tests — Quote Freshness:**

| #    | Test Name                                         | What It Does                            | What We Learn                                     |
| ---- | ------------------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| 4.23 | `re-quoting same route returns consistent prices` | Quote same route twice immediately      | Whether prices are deterministic or fluctuate     |
| 4.24 | `quote includes expiry or TTL information`        | Check response for any TTL/expiry field | How long we can display a quote before it's stale |

**Tests — Weight-Based Carrier Routing (Business Rule):**

| #    | Test Name                                                              | What It Does                                                              | What We Learn                                                 |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 4.27 | `quotes light package (3kg soporte) with DHL, FedEx, Estafeta`         | Quote ≤5kg fixture with each light-group carrier specified                | Do all 3 carriers return valid quotes for light packages?     |
| 4.28 | `quotes heavy package (6.5kg alternador) with Castores, Paquetexpress` | Quote >5kg fixture with each heavy-group carrier specified                | Do both carriers return valid quotes for heavy packages?      |
| 4.29 | `≤5kg carriers handle boundary (5kg maza) well`                        | Quote exactly-5kg fixture with DHL, FedEx, Estafeta                       | Does 5kg work with the light carrier group?                   |
| 4.30 | `>5kg carriers handle boundary (5kg maza) well`                        | Quote exactly-5kg fixture with Castores, Paquetexpress                    | Does 5kg work with the heavy carrier group? Which is cheaper? |
| 4.31 | `auto-select cheapest from light carrier group`                        | Quote ≤5kg fixture without specifying carrier, compare all light carriers | Price comparison — which carrier wins for light auto parts?   |
| 4.32 | `auto-select cheapest from heavy carrier group`                        | Quote >5kg fixture without specifying carrier, compare heavy carriers     | Price comparison — which carrier wins for heavy auto parts?   |
| 4.33 | `light carriers reject or surcharge >5kg package`                      | Quote 6.5kg alternador with DHL/FedEx/Estafeta                            | Do light carriers accept heavy packages? At what premium?     |
| 4.34 | `heavy carriers handle ≤5kg package`                                   | Quote 3kg soporte with Castores/Paquetexpress                             | Do heavy carriers accept light packages? Is pricing worse?    |

**Tests — Multi-Item Separate Packages (Business Rule):**

| #    | Test Name                                                                    | What It Does                                                        | What We Learn                                                             |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 4.35 | `quotes 2 separate packages in one request (2 items from same manufacturer)` | 1× maza (4kg) + 1× chicote (1kg) as 2 entries in packages array     | Multi-package pricing for real product combo                              |
| 4.36 | `quotes 3 separate packages with different weights/dimensions`               | 1× maza + 1× soporte + 1× chicote as 3 packages                     | Scaling behavior, total price for mixed auto parts order                  |
| 4.37 | `multi-package total vs sum of individual quotes`                            | Quote same items as multi-package AND as 3 separate single requests | **Critical:** Is multi-package priced differently than individual quotes? |
| 4.38 | `multi-package with mixed weight groups (one ≤5kg, one >5kg)`                | 1× chicote (1kg) + 1× alternador (6.5kg) in same request            | Can a single request contain items for different carrier groups?          |

**Tests — Declared Value & Insurance:**

| #    | Test Name                                         | What It Does                                         | What We Learn                                         |
| ---- | ------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| 4.25 | `higher declared value affects price (insurance)` | Same route/package, declared value $500 vs $5000 MXN | Whether insurance is automatic, optional, or separate |
| 4.26 | `zero declared value is accepted`                 | Send declaredValue=0                                 | Whether declared value is required                    |

**Snapshot outputs:**

- `04-rate-standard-domestic.json` — Complete rate response (source of truth)
- `04-rate-multi-carrier.json` — Multi-carrier response
- `04-rate-multi-package.json` — Multi-package response
- `04-rate-oversized.json` — Oversized item response
- `04-rate-rural.json` — Rural destination response
- `04-rate-light-carriers.json` — DHL/FedEx/Estafeta quotes for ≤5kg package
- `04-rate-heavy-carriers.json` — Castores/Paquetexpress quotes for >5kg package
- `04-rate-boundary-5kg.json` — Both carrier groups quoting exactly 5kg
- `04-rate-multi-item-order.json` — Multiple packages in single request (real products)
- `04-rate-multi-vs-individual.json` — Price comparison: multi-package vs individual quotes

**Key findings to document:**

- Complete rate response Zod schema
- Quote ID / rate-locking behavior
- Price breakdown availability (base, fuel, insurance, VAT — or just total)
- Estimated delivery format
- Multi-carrier response structure
- Carrier filtering mechanism
- Multi-package quoting behavior
- Volumetric weight impact
- Geographic coverage gaps or surcharges
- Quote TTL / freshness
- Insurance/declared value behavior
- **Weight-based routing validation:** Do DHL/FedEx/Estafeta handle ≤5kg reliably? Do Castores/Paquetexpress handle >5kg? Boundary behavior at exactly 5kg? Cross-group pricing (light carrier with heavy package and vice versa)?
- **Multi-item pricing model:** Is a multi-package request priced differently than the sum of individual quotes? This determines whether we batch items or quote individually at checkout.
- **Carrier availability:** Are Castores and Paquetexpress available in the provider's carrier list? What are their service identifiers?

---

### Module 5: Label Generation (`05-label-generation.test.ts`)

**Purpose:** Understand how to purchase shipping labels. This is where money (even sandbox money) changes hands and tracking numbers are created.

**Dependencies:** Module 4 (need a valid quote to generate a label from).

**Important note on test design:** Each label generation test creates a real (sandbox) shipment. Tests should be designed to minimize unnecessary label creation. Where possible, generate one label and run multiple assertions against it.

**Tests — Basic Label Creation:**

| #   | Test Name                                          | What It Does                                                         | What We Learn                           |
| --- | -------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------- |
| 5.1 | `generates a label from a valid rate quote`        | Get a quote (Module 4), then create a label for the cheapest carrier | Full label response shape               |
| 5.2 | `label response includes tracking number`          | Assert tracking number exists and format                             | Tracking number format per carrier      |
| 5.3 | `label response includes downloadable label URL`   | Assert label URL exists, is accessible                               | URL format, whether we need to store it |
| 5.4 | `label URL returns a valid document`               | HTTP GET the label URL, check content-type                           | PDF? PNG? What format?                  |
| 5.5 | `label response includes carrier and service info` | Assert carrier/service matches what was requested                    | Consistency between quote and label     |
| 5.6 | `label response includes charge amount`            | Assert the price charged for the label                               | Whether it matches the quoted price     |
| 5.7 | `captures the complete label response shape`       | Snapshot full JSON, build Zod schema                                 | Source of truth for label schema        |

**Tests — Label Options:**

| #    | Test Name                                 | What It Does                             | What We Learn                                             |
| ---- | ----------------------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| 5.8  | `can request specific label format (PDF)` | Generate with format=PDF (if supported)  | Available label formats                                   |
| 5.9  | `can request specific label format (PNG)` | Generate with format=PNG (if supported)  | PNG support                                               |
| 5.10 | `can request thermal label size (4x6)`    | Generate with size=4x6 (if supported)    | Thermal printer support                                   |
| 5.11 | `label URL has expiry or is permanent`    | Generate label, wait, then re-access URL | Whether we need to download and store in Supabase Storage |

**Tests — Multi-Package Labels:**

| #    | Test Name                                          | What It Does                              | What We Learn                                   |
| ---- | -------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| 5.12 | `generates labels for multi-package shipment`      | Quote + label for 2-package shipment      | One tracking number or one per package?         |
| 5.13 | `multi-package: label count matches package count` | Check if response has 1 label or N labels | How to handle multi-package in our domain model |

**Tests — Billing Behavior:**

| #    | Test Name                                                     | What It Does                                   | What We Learn                                                                   |
| ---- | ------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| 5.14 | `sandbox does not charge real money`                          | Check wallet before/after label generation     | Confirm sandbox is safe for testing                                             |
| 5.15 | `wallet balance decreases after label generation`             | If balance endpoint exists, check before/after | Charge timing — immediate on generate?                                          |
| 5.16 | `generating with same data twice creates two separate labels` | Generate same shipment twice                   | **CRITICAL:** Confirms duplicate = double charge risk (idempotency requirement) |

**Tests — Different Carriers:**

| #    | Test Name                                         | What It Does                           | What We Learn                              |
| ---- | ------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| 5.17 | `generates label with carrier A (e.g., Estafeta)` | Quote + label for one specific carrier | Carrier-specific label behavior            |
| 5.18 | `generates label with carrier B (e.g., DHL)`      | Quote + label for a different carrier  | Whether response shape differs by carrier  |
| 5.19 | `generates label with carrier C (e.g., FedEx)`    | Quote + label for a third carrier      | Response shape consistency across carriers |

**Snapshot outputs:**

- `05-label-created.json` — Complete label generation response
- `05-label-multi-package.json` — Multi-package label response
- `05-label-carrier-A.json` / `B.json` / `C.json` — Per-carrier responses

**Key findings to document:**

- Complete label response Zod schema
- Tracking number format (per carrier if different)
- Label URL format, accessibility, and expiry
- Available label formats and sizes
- Charge timing and amount
- Multi-package behavior (one tracking # or many)
- Duplicate label risk (idempotency confirmation)
- Per-carrier response shape variations

---

### Module 6: Shipment Tracking (`06-tracking.test.ts`)

**Purpose:** Discover how tracking works — status codes, event structure, and whether updates are pushed or pulled.

**Dependencies:** Module 5 (need tracking numbers from generated labels).

**Tests:**

| #   | Test Name                                            | What It Does                                    | What We Learn                                      |
| --- | ---------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| 6.1 | `tracks a freshly generated shipment`                | Track a label created in Module 5               | Initial tracking response shape                    |
| 6.2 | `tracking response includes status field`            | Assert a status/state field exists              | Status field name and format                       |
| 6.3 | `tracking response includes event history`           | Assert an events/checkpoints array exists       | Event structure (timestamp, description, location) |
| 6.4 | `captures all possible tracking status values`       | Track multiple shipments at different stages    | Build the status mapping table                     |
| 6.5 | `tracking response includes estimated delivery date` | Check for ETA field                             | Whether ETA is available and in what format        |
| 6.6 | `tracks by tracking number`                          | Track using the tracking # from label creation  | Primary tracking key confirmed                     |
| 6.7 | `tracks by provider shipment ID (if different)`      | Track using the shipment ID from label creation | Whether there's an alternate tracking key          |
| 6.8 | `tracking a non-existent number returns clear error` | Track a fake tracking number                    | Error response shape for "not found"               |
| 6.9 | `captures the complete tracking response shape`      | Snapshot full JSON, build Zod schema            | Source of truth for tracking schema                |

**Tests — Sandbox Simulation:**

| #    | Test Name                                               | What It Does                                            | What We Learn                                         |
| ---- | ------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| 6.10 | `sandbox simulates tracking progression (if supported)` | Track over time or use test endpoints to advance status | Whether sandbox provides simulated delivery lifecycle |
| 6.11 | `sandbox provides different status examples`            | Generate multiple shipments, track all                  | Range of statuses visible in sandbox                  |

**Snapshot outputs:**

- `06-tracking-initial.json` — Tracking response for new shipment
- `06-tracking-statuses.json` — All observed status values with descriptions

**Key findings to document:**

- Complete tracking response Zod schema
- All status codes and their meanings → domain `TrackingStatus` mapping table
- Event/checkpoint structure
- ETA availability and format
- Tracking by tracking number vs shipment ID
- Sandbox simulation capabilities

---

### Module 7: Cancellation & Refunds (`07-cancellation.test.ts`)

**Purpose:** Understand the cancellation flow — critical for order cancellations before pickup.

**Dependencies:** Module 5 (need shipments to cancel).

**Note:** Each test requires a fresh label to cancel. Generate labels at the start of each test.

**Tests:**

| #   | Test Name                                                   | What It Does                                                | What We Learn                               |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| 7.1 | `cancels a freshly generated shipment`                      | Generate label, then immediately cancel                     | Cancel response shape, success confirmation |
| 7.2 | `cancellation response includes refund info`                | Check if response confirms wallet refund                    | Automatic vs manual refund, refund amount   |
| 7.3 | `wallet balance is restored after cancellation`             | Check balance before generate, after generate, after cancel | Full billing cycle confirmation             |
| 7.4 | `cannot cancel an already-cancelled shipment`               | Cancel same shipment twice                                  | Error shape for double-cancellation         |
| 7.5 | `cannot cancel a shipped/in-transit shipment (if testable)` | Try to cancel after pickup (if sandbox simulates this)      | Cancellation window constraints             |
| 7.6 | `captures the complete cancellation response shape`         | Snapshot full JSON                                          | Source of truth for cancel schema           |

**Snapshot outputs:**

- `07-cancel-success.json` — Successful cancellation response
- `07-cancel-already-cancelled.json` — Double-cancellation error

**Key findings to document:**

- Complete cancellation response Zod schema
- Refund behavior (automatic, instant, delayed)
- Cancellation window (how long after label creation)
- Error responses for invalid cancellations

---

### Module 8: Error Handling (`08-error-handling.test.ts`)

**Purpose:** Systematically discover every error the API can return. Critical for building robust error handling in production.

**Dependencies:** Module 1 (auth works).

**Tests — Address Errors:**

| #   | Test Name                                      | What It Does                                | What We Learn                                     |
| --- | ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| 8.1 | `missing required address field (street)`      | Rate request with street="" or missing      | Error for missing field — field-level or generic? |
| 8.2 | `missing required address field (postal code)` | Rate request with no postal code            | Same exploration                                  |
| 8.3 | `invalid postal code format`                   | Rate request with CP "ABCDE"                | Validation error shape                            |
| 8.4 | `mismatched postal code and state`             | CP from NL but state="CMX"                  | Whether the API catches geographic mismatches     |
| 8.5 | `missing phone number`                         | Rate request without phone                  | Whether phone is truly required                   |
| 8.6 | `invalid phone format`                         | Phone without country code, too short, etc. | Phone validation rules                            |

**Tests — Package Errors:**

| #    | Test Name                                     | What It Does                             | What We Learn                    |
| ---- | --------------------------------------------- | ---------------------------------------- | -------------------------------- |
| 8.7  | `zero weight`                                 | Package with weight=0                    | Validation rules for weight      |
| 8.8  | `negative weight`                             | Package with weight=-1                   | Validation edge cases            |
| 8.9  | `zero dimensions`                             | Package with length=0, width=0, height=0 | Dimension validation             |
| 8.10 | `extremely heavy package (500kg)`             | Package exceeding any reasonable limit   | Weight limit behavior            |
| 8.11 | `extremely large dimensions (300×300×300 cm)` | Unreasonably large package               | Dimension limit behavior         |
| 8.12 | `empty packages array`                        | Rate request with packages=[]            | Whether empty packages is caught |
| 8.13 | `negative declared value`                     | declaredValue=-100                       | Value validation                 |

**Tests — Request Errors:**

| #    | Test Name            | What It Does                        | What We Learn                  |
| ---- | -------------------- | ----------------------------------- | ------------------------------ |
| 8.14 | `empty request body` | POST with {}                        | Generic validation error shape |
| 8.15 | `malformed JSON`     | POST with invalid JSON string       | Parser error handling          |
| 8.16 | `wrong HTTP method`  | GET instead of POST (or vice versa) | Method not allowed error       |
| 8.17 | `unknown endpoint`   | POST to /ship/nonexistent/          | 404 behavior                   |

**Tests — Rate Limit Behavior:**

| #    | Test Name                                        | What It Does                                     | What We Learn                                |
| ---- | ------------------------------------------------ | ------------------------------------------------ | -------------------------------------------- |
| 8.18 | `rapid sequential requests (10 in 1 second)`     | Fire 10 rate requests quickly                    | Rate limit threshold, response when exceeded |
| 8.19 | `rate limit response includes retry information` | If 429 is returned, check for Retry-After header | How to implement backoff                     |

**Snapshot outputs:**

- `08-error-missing-field.json` — Missing required field error
- `08-error-invalid-postal.json` — Bad postal code error
- `08-error-bad-package.json` — Invalid package error
- `08-error-rate-limit.json` — Rate limit response (if triggered)
- `08-error-malformed.json` — Malformed request error

**Key findings to document:**

- Error response JSON shape (consistent across errors? varies?)
- Error codes/types (string codes? numeric? categories?)
- Field-level vs request-level validation errors
- HTTP status code patterns (400 vs 422 vs specific codes)
- Rate limit threshold and retry guidance
- Full error → `ShippingErrorCode` mapping table

---

### Module 9: Edge Cases & Stress Tests (`09-edge-cases.test.ts`)

**Purpose:** Test unusual but realistic scenarios that will occur in production with a multi-manufacturer auto parts marketplace.

**Dependencies:** Modules 1-4 at minimum.

**Tests — Data Edge Cases:**

| #   | Test Name                                      | What It Does                                           | What We Learn               |
| --- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------- |
| 9.1 | `address with special characters (accents, ñ)` | Address: "Av. Niños Héroes", name: "José García Muñoz" | Unicode handling in the API |
| 9.2 | `address with very long reference field`       | Reference: 500-character delivery instructions         | Max field lengths           |
| 9.3 | `address with interior number (apartment)`     | Include interiorNumber/additional field                | Optional field handling     |
| 9.4 | `same origin and destination postal code`      | Ship within same neighborhood                          | Same-area shipping behavior |
| 9.5 | `company name with special characters`         | Company: "Refacciones & Auto Parts S.A. de C.V."       | Business name encoding      |

**Tests — Auto Parts Specific:**

| #   | Test Name                                    | What It Does                                     | What We Learn                                  |
| --- | -------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| 9.6 | `heavy multi-item order (4 rotors = 48kg)`   | 4× brake rotor package                           | Weight aggregation or per-package limits       |
| 9.7 | `mixed package types in one shipment`        | 1 small box (spark plugs) + 1 large box (bumper) | How mixed sizes are handled                    |
| 9.8 | `high declared value shipment ($50,000 MXN)` | Headlight assemblies, high total value           | Insurance requirements or carrier restrictions |
| 9.9 | `very small and very light package`          | Gasket set: 0.1kg, 10×8×2 cm                     | Minimum weight/size behavior                   |

**Tests — Timing & Consistency:**

| #    | Test Name                                                 | What It Does                            | What We Learn                      |
| ---- | --------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| 9.10 | `response time: rate quote`                               | Measure latency across 10 rate calls    | p50, p95, max — for timeout config |
| 9.11 | `response time: label generation`                         | Measure latency across 3 label calls    | Label generation latency profile   |
| 9.12 | `response time: tracking lookup`                          | Measure latency across 5 tracking calls | Tracking latency profile           |
| 9.13 | `idempotency: identical rate requests return same prices` | Same request 3 times in a row           | Rate quote determinism             |

**Snapshot outputs:**

- `09-special-characters.json` — Response with Unicode in address
- `09-heavy-multi-item.json` — Heavy shipment response
- `09-latency-report.json` — Latency measurements per endpoint

**Key findings to document:**

- Unicode/special character handling
- Field length limits
- Auto parts-specific shipping constraints
- Latency benchmarks per endpoint (for timeout configuration)
- Rate quote consistency/determinism

---

### Module 10: Webhook & Push Notification Discovery (`10-webhook-discovery.test.ts`)

**Purpose:** Determine whether the provider supports push-based tracking updates (webhooks) or requires polling. This is a critical architectural decision — it determines whether we build a webhook handler or an Inngest polling cron.

**Dependencies:** Module 5 (need active shipments for webhook testing).

**Tests:**

| #    | Test Name                                              | What It Does                                              | What We Learn                                  |
| ---- | ------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------- |
| 10.1 | `webhook registration endpoint exists`                 | Check if there's an API endpoint to register webhook URLs | Push notification capability                   |
| 10.2 | `webhook test endpoint works (if available)`           | Call any webhook-test endpoint the provider offers        | Webhook payload shape                          |
| 10.3 | `webhook payload contains tracking update data`        | Inspect test webhook payload                              | Event structure, signature verification method |
| 10.4 | `webhook includes signature or verification mechanism` | Check for HMAC, shared secret, or other verification      | Security model for webhook handler             |
| 10.5 | `webhook registration via dashboard (document steps)`  | If no API, check if dashboard has webhook config          | Manual vs programmatic webhook setup           |

**If webhooks are NOT supported:**

| #    | Test Name                                                   | What It Does                                 | What We Learn                                  |
| ---- | ----------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| 10.6 | `polling: tracking endpoint returns updated data over time` | Track same shipment at intervals             | How quickly tracking data updates              |
| 10.7 | `polling: determine optimal polling interval`               | Track frequently, observe update granularity | Recommended polling frequency for Inngest cron |

**Snapshot outputs:**

- `10-webhook-payload.json` — Webhook test payload (if available)
- `10-webhook-registration.json` — Webhook registration response

**Key findings to document:**

- **DECISION: Webhook or Polling?** — This is the #1 output of this module
- If webhook: registration method, payload shape, verification mechanism
- If polling: recommended interval, update granularity
- Impact on architecture: webhook handler route vs Inngest cron function

---

### Module 11: Pickup Scheduling Discovery (`11-pickup-scheduling.test.ts`)

**Purpose:** Explore whether the provider supports scheduling carrier pickups — relevant for manufacturers who don't have daily carrier visits.

**Dependencies:** Module 5 (need active shipments for pickup scheduling).

**Tests:**

| #    | Test Name                                           | What It Does                           | What We Learn                            |
| ---- | --------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| 11.1 | `pickup scheduling endpoint exists`                 | Check if there's a pickup API          | Whether we can offer this feature        |
| 11.2 | `creates a pickup request for an existing shipment` | Schedule pickup for a generated label  | Pickup request/response shape            |
| 11.3 | `pickup requires date and time window`              | Check what parameters are needed       | Scheduling constraints                   |
| 11.4 | `pickup is carrier-dependent`                       | Try scheduling with different carriers | Which carriers support pickup scheduling |
| 11.5 | `can cancel a scheduled pickup`                     | Cancel after scheduling                | Pickup cancellation flow                 |

**Snapshot outputs:**

- `11-pickup-created.json` — Pickup scheduling response
- `11-pickup-cancel.json` — Pickup cancellation response

**Key findings to document:**

- Whether pickup scheduling is available
- Which carriers support it
- Request/response shapes
- Scheduling constraints (lead time, time windows)

---

## Workflow Validation Checklist

After all modules are complete, the combined findings must confirm we can support these marketplace workflows. This checklist is the **acceptance criteria** for the exploration suite.

### Checkout Flow

- [ ] Can get multi-carrier rate quotes for a MX domestic shipment
- [ ] Quotes include price, carrier, service level, and estimated delivery
- [ ] Quotes work for different auto parts (light, heavy, oversized)
- [ ] Quotes work for different routes (metro, rural, border, cross-region)
- [ ] We understand quote freshness (TTL or need to re-quote before purchase)
- [ ] Quote prices are in MXN (investigate known currency bug from prior testing)

### Weight-Based Carrier Routing

- [ ] DHL, FedEx, Estafeta all return valid quotes for ≤5kg packages
- [ ] Castores, Paquetexpress return valid quotes for >5kg packages
- [ ] Boundary behavior at exactly 5kg is understood (which group wins?)
- [ ] Auto-select cheapest works: we can programmatically compare prices across carrier group
- [ ] Cross-group behavior known: what happens if ≤5kg carrier gets >5kg package (reject or surcharge?)

### Multi-Item / Multi-Package Orders

- [ ] Multiple packages in a single quote request works (2-3 items from same manufacturer)
- [ ] Multi-package pricing model understood (combined vs sum-of-individual — same or different?)
- [ ] Mixed-weight items in one request handled correctly
- [ ] Each item-as-separate-package approach validated with the API

### Multi-Manufacturer Split Shipping

- [ ] Can get separate quotes for different origin addresses (one per manufacturer)
- [ ] Each manufacturer's shipment gets its own tracking number
- [ ] Cost per manufacturer can be calculated independently

### Label Purchase & Fulfillment

- [ ] Can generate a label from a quote
- [ ] Label includes tracking number and downloadable document
- [ ] Label format is suitable for printing (PDF at minimum)
- [ ] We understand the charge model (when money is deducted)
- [ ] We have a strategy for idempotency (avoid double charges — Test 5.16)
- [ ] Label URL expiry behavior understood (permanent vs temporary — Test 5.11)

### Shipment Tracking

- [ ] Can track by tracking number
- [ ] We have a mapping from provider statuses → our domain statuses
- [ ] We know whether to use webhooks or polling for updates
- [ ] Event history is available for building a customer-facing timeline

### Address Validation

- [ ] Geocodes API returns colonias per postal code (colonia dropdown UX)
- [ ] City/state auto-fill from postal code works
- [ ] Rural and remote postal codes handled correctly

### Cancellation & Returns

- [ ] Can cancel a shipment before pickup
- [ ] Refund behavior is understood (automatic, amount, timing)
- [ ] We know the cancellation window

### Auto Parts Specifics

- [ ] Heavy items (12kg+ rotors) get valid quotes
- [ ] Oversized items (bumpers) get valid quotes or clear rejection
- [ ] High-value items get insurance coverage
- [ ] Real launch products (mazas, alternadores, soportes, chicotes) all quote successfully
- [ ] Very light items (0.5kg) have no minimum-weight issues

### Error Handling

- [ ] Error JSON shape documented for `parseError()` implementation
- [ ] Field-level vs request-level validation errors understood
- [ ] HTTP status code patterns mapped (400 vs 422 vs specific codes)
- [ ] Error codes mapped to `ShippingErrorCode` enum
- [ ] Rate limit threshold and retry guidance documented

### Operational

- [ ] We can monitor wallet/account balance (avoid label failures)
- [ ] We understand rate limits and have timeout values
- [ ] Phone code format confirmed (MX vs 52 inconsistency resolved)

---

## Implementation Guide

### Purpose & Long-Term Value

This exploration suite serves three purposes at different stages:

1. **Discovery (now):** Answer every open question about the shipping provider's API before writing production code. The test suite runs against the real sandbox/production API and captures actual behavior — not documentation claims, not assumptions.

2. **Production implementation (next):** The exploration outputs (snapshots, Zod schemas, findings) become the spec for building the production provider adapter (`src/lib/<provider>/`). The adapter that connects our business rules to the shipping provider should work correctly on day one because every input/output combination has already been exercised and recorded.

3. **Regression & debugging (ongoing):** When something breaks in production — a carrier stops returning quotes, a response shape changes, a new edge case appears — the exploration suite is the first debugging tool. Run the relevant module against the live API to isolate whether the issue is on our side or the provider's. When we eventually switch providers (this plan is provider-agnostic), the same test modules run against the new provider to map its behavior before writing a single line of adapter code.

### Execution Model

Each module will be built and executed by an AI agent session. The agent:

1. **Implements the tests** from the plan's module spec (test names, inputs, assertions)
2. **Runs them against the real API** and captures responses
3. **Expands coverage** — the plan specifies the minimum test set, but agents should explore additional input combinations when findings warrant it. For example, if Test 4.11 reveals that multi-carrier quoting works, the agent should try it with different package weights, routes, and carrier filters to map the full behavior space. Test suites will grow beyond the numbered tests in this plan — that's expected and encouraged.
4. **Records all findings** in snapshots, tightened assertions, and `// FINDING:` comments
5. **Builds Zod schemas** from real responses that become the foundation for production types

The plan defines the _minimum_ test coverage. The actual test files will be larger — potentially much larger — as agents explore combinations of fixtures × routes × carriers × package configurations. Every combination that reveals different behavior gets its own test case.

### Getting Started

1. **Read `RefaccionesDirect_EnviaIntegration_v2.md`** (project knowledge) — contains validated response shapes, Zod schema starting points, and known issues from prior sandbox testing
2. Pull the `feature/envia-api-testing` branch
3. Ensure `.env.local` has `SHIPPING_API_KEY` and `SHIPPING_API_URL`
4. Run `npm.cmd run test:explore` to execute the full suite (initially all tests will be pending/skipped)
5. Work through modules in order — each module builds on previous findings
6. **Cross-reference PR #51** (Shipping API Spec) — update "DISCOVER DURING DEVELOPMENT" placeholders with confirmed values as you go

### How to Write Each Test

1. **Start with the snapshot** — Before asserting anything, capture the raw response and save it to `__snapshots__/`. This is the primary deliverable.
2. **Write loose assertions first** — Assert the response is an object, has certain top-level fields. Don't over-specify until you know the shape.
3. **Tighten assertions iteratively** — As you learn the shape, add specific field checks, type checks, value range checks.
4. **Document surprises in test comments** — If behavior differs from what the spec assumed, add a `// FINDING:` comment explaining what's different and why it matters.
5. **Build Zod schemas from snapshots** — After capturing real responses, create Zod schemas in the helpers that validate the actual shape. These schemas become the foundation for the production client.
6. **Expand input combinations** — When a test reveals interesting behavior, add parameterized variants to map the full behavior space (see "Expected Test File Structure" below for `it.each` patterns).

### Conventions

- Test file names are numbered for execution order but each file should be independently runnable
- Use `describe.sequential` for tests within a module that depend on prior test outputs (e.g., label tests use quotes from earlier tests)
- Use `test.todo('...')` for tests you haven't implemented yet — this provides a clear progress tracker
- Mark tests that create billable resources (labels) with a `// BILLABLE` comment
- Store cross-test state (tracking numbers, shipment IDs) in module-level variables within the test file, not in shared mutable state across files
- The api-client helper must **never throw on 4xx/5xx** — it returns `{ status, headers, data }` for every response so tests can inspect and snapshot error responses

### Expected Test File Structure

Every module test file should follow this structure. This is the contract that agents must produce:

```typescript
/**
 * Module N: <Module Name>
 *
 * Purpose: <one-line purpose from the plan>
 * Dependencies: <which modules must pass first>
 * Provider: <provider name> (implementation is provider-specific; plan is not)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ KEY FINDINGS (filled in after tests run)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ - [ ] Finding 1 from plan's "Key findings to document"     │
 * │ - [ ] Finding 2 ...                                        │
 * │ - [ ] Finding N ...                                        │
 * │                                                            │
 * │ SURPRISES / DEVIATIONS FROM SPEC:                          │
 * │ - (filled in during execution)                             │
 * └─────────────────────────────────────────────────────────────┘
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createApiClient, type ApiClient } from '../helpers/api-client';
import { saveSnapshot } from '../helpers/snapshot';
// import fixtures as needed from '../helpers/fixtures'
// import Zod schemas as they are built from '../helpers/schemas'

let client: ApiClient;

beforeAll(() => {
  client = createApiClient();
});

describe('Module N: <Module Name>', () => {
  // -------------------------------------------------------------------------
  // N.1 — <Test name from plan>
  // -------------------------------------------------------------------------

  it('<test name from plan>', async () => {
    const res = await client.get('/some-endpoint');

    // 1. Snapshot first — this is the primary deliverable
    saveSnapshot('NN-descriptive-name', {
      status: res.status,
      headers: res.headers,
      body: res.data,
    });

    // 2. Loose assertions that tighten over time
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    // 3. FINDING: <describe what was learned>
    // <explain deviation from spec if any>
  });

  // -------------------------------------------------------------------------
  // N.2 — Parameterized expansion (agent-generated)
  // -------------------------------------------------------------------------
  // When a test reveals behavior that varies by input, expand with it.each:

  it.each([
    { name: 'light maza (4kg)', fixture: 'mazaDeRueda', expectedGroup: 'light' },
    { name: 'heavy alternador (6.5kg)', fixture: 'alternador12V', expectedGroup: 'heavy' },
    { name: 'boundary maza (5kg)', fixture: 'mazaPesada', expectedGroup: 'TBD' },
  ])('quotes $name with appropriate carriers', async ({ fixture, expectedGroup }) => {
    // ... test implementation
    // FINDING: <what varied across the parameterized inputs>
  });

  // -------------------------------------------------------------------------
  // N.X — Agent-discovered tests (beyond the plan)
  // -------------------------------------------------------------------------
  // Agents should add tests here when they discover behavior not
  // anticipated by the plan. Prefix with the module number and use
  // the next available sequence number.
});
```

**What this structure guarantees:**

| Output                   | Where it lives                       | What it feeds into                                |
| ------------------------ | ------------------------------------ | ------------------------------------------------- |
| Raw API responses        | `__snapshots__/*.json` (git-tracked) | Production Zod schemas, field mapping reference   |
| Zod schemas              | `helpers/schemas.ts`                 | Copied/adapted into `src/lib/<provider>/types.ts` |
| Key findings checklist   | Test file header comment             | Shipping API Spec placeholder updates             |
| `// FINDING:` comments   | Inline in test code                  | Provider adapter implementation decisions         |
| Surprise/deviation notes | Test file header comment             | Architecture decisions, risk register             |
| Parameterized test data  | `it.each` tables in test files       | Input validation rules for production             |

### Output Expectations

When the exploration is complete, each module should produce:

1. **Passing tests** with specific assertions (not just "doesn't throw")
2. **Snapshot files** with real API responses in `__snapshots__/`
3. **Zod schemas** in `helpers/` that validate the discovered shapes
4. **A summary comment** at the top of each test file with the key findings checklist filled in
5. **Expanded test cases** beyond the plan's minimum — every input combination that revealed different behavior should have its own test

The combined output across all modules should be sufficient to:

- Fill in every "DISCOVER DURING DEVELOPMENT" placeholder in the Shipping API Spec
- Build the production Zod schemas in `src/lib/<provider>/types.ts`
- Build the provider adapter with correct field mappings — **it should work on day one**
- Configure timeouts, retries, and error handling with real data
- Swap providers in the future: run the same test plan against the new provider's sandbox, compare findings, and build a new adapter with the same confidence

---

## Dependency Graph

```
Module 1: Connectivity
  ├── Module 2: Reference Data
  ├── Module 3: Address Validation
  ├── Module 8: Error Handling (partially parallel)
  │
  └── Module 4: Rate Quoting
        │
        └── Module 5: Label Generation
              ├── Module 6: Tracking
              ├── Module 7: Cancellation
              ├── Module 10: Webhook Discovery
              └── Module 11: Pickup Scheduling

  Module 9: Edge Cases (runs after Modules 1-4 at minimum)
```

**Parallelization opportunities:**

- Modules 2, 3, and 8 can be developed in parallel (all only need Module 1)
- Modules 6, 7, 10, and 11 can be developed in parallel (all only need Module 5)
- Module 9 can start after Module 4 is done

---

## Land the Plane

- [ ] All 11 modules have passing tests
- [ ] All snapshot files are committed to the repo
- [ ] Workflow validation checklist is complete (all boxes checked or items flagged as limitations)
- [ ] Summary of findings is written (can be a doc or the test file header comments)
- [ ] Shipping API Spec v1.0 (PR #51) placeholders updated with confirmed values
- [ ] Weight-based carrier routing validated — confirmed which carriers support each weight group
- [ ] Multi-package pricing model documented — combined vs individual quotes answered
- [ ] PR merged into `dev`
