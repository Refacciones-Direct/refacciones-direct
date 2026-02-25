# API Endpoints & Envia.com Integration — Technical Planning Doc

This document lists **existing** API routes, **planned** shipping-related routes (from the roadmap), and how they map to **envia.com** so you can plan the next steps.

---

## 1. Existing API Endpoints (Current Codebase)

All routes live under `src/app/api/`. No `[locale]` in the path.

| Path                                      | Method(s)      | Purpose                                                      |
| ----------------------------------------- | -------------- | ------------------------------------------------------------ |
| `/api/auth/callback`                      | GET            | WorkOS auth callback; syncs user to `users` table            |
| `/api/inngest`                            | GET, POST, PUT | Inngest webhook (background job events)                      |
| `/api/webhooks/workos`                    | POST           | WorkOS webhooks (user/org sync)                              |
| `/api/webhooks/stripe`                    | POST           | Stripe webhooks (payments, Connect; currently stub)          |
| `/api/manufacturer/upload-excel`          | —              | Excel file upload (manufacturer import)                      |
| `/api/manufacturer/import/upload`         | —              | Import: upload step                                          |
| `/api/manufacturer/import/preview`        | POST           | Import: parse + validate .xlsx → validation summary + errors |
| `/api/manufacturer/import/execute`        | —              | Import: execute validated changes (atomic)                   |
| `/api/manufacturer/import/template`       | —              | Download blank Excel template by type                        |
| `/api/manufacturer/import/errors/[jobId]` | —              | Fetch import errors for a job                                |
| `/api/manufacturer/export`                | —              | Export catalog (manufacturer)                                |
| `/api/manufacturer/widget-token`          | —              | WorkOS widget token (TODO in code)                           |

**Patterns to follow:** `NextRequest`/`NextResponse`, `createAdminClient()` from `@/lib/supabase/admin`, JSON body parsing, return `NextResponse.json()` with appropriate status. Auth: resolve session (WorkOS) and enforce manufacturer scope where needed.

---

## 2. Planned Endpoints That Depend on Shipping (Roadmap → Envia)

These come from `docs/plans/shipping-payments-roadmap.md`. The roadmap was written for **Skydropx**; the same **roles** apply for **envia.com** — only the backend client and env vars change.

### 2.1 Checkout — Shipping quotes (customer-facing)

| Planned route                   | Method | Purpose                                                                                                                                      | Envia.com mapping                                                                                                                                                                                                                                                               |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/checkout/shipping-quotes` | POST   | Given shipping address + cart (grouped by manufacturer), return **carrier options with prices** per manufacturer so the customer can choose. | **Quote Shipments** — [docs.envia.com/reference/quote-shipments](https://docs.envia.com/reference/quote-shipments). Input: origin (manufacturer address), destination (customer), package specs (weight/dimensions from `parts`). Output: list of services with price and ETAs. |

**Request shape (to define):** e.g. `{ shippingAddress: {...}, itemsByManufacturer: [{ manufacturerId, originAddress, packages: [{ weight_kg, dimensions_cm }] }] }`.  
**Response shape:** e.g. `{ quotes: [{ manufacturerId, carrierOptions: [{ carrier, serviceCode, price, estimatedDays }] }] }`.

---

### 2.2 Order fulfillment — Label generation (manufacturer-facing)

| Planned route                      | Method                             | Purpose                                                                                                                                                                 | Envia.com mapping                                                                                                                                                                                                                                  |
| ---------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/dashboard/orders/[id]/label` | POST (or GET that triggers create) | For an order (or order_item/shipment), create a **shipping label** using the carrier/service chosen at checkout. Store tracking number and label URL on the order item. | **Create Shipping Labels** — [docs.envia.com/reference/create-shipping-labels](https://docs.envia.com/reference/create-shipping-labels). Input: service code (from quote), origin, destination, package specs. Output: label URL, tracking number. |

**Flow:** Manufacturer clicks “Generate label” → API calls Envia Create Shipping Labels → save `tracking_number`, `tracking_url`, `label_url`, and optionally `envia_shipment_id` (or equivalent) on `order_items` (or your shipment table). Optionally trigger Inngest `order/shipped` for notifications.

---

### 2.3 Tracking (customer + manufacturer)

| Concern                      | Where it’s used                                          | Envia.com mapping                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Track by tracking number** | Customer order tracking page; manufacturer order detail. | **Track Shipments** — [docs.envia.com/reference/track-shipments](https://docs.envia.com/reference/track-shipments). Input: tracking number(s). Output: status, events, ETA. |

You can either:

- **Option A — Backend proxy:** e.g. `GET /api/shipping/track?trackingNumber=...` that calls Envia Track and returns normalized status/events (recommended so you don’t expose Envia API key).
- **Option B — Client calls Envia from your backend only:** No public “track” API route; server-side code (e.g. Inngest or a server component) calls Envia when building the tracking page.

---

### 2.4 Webhooks (delivery status updates)

| Planned route         | Method | Purpose                                                                                                                                       | Envia.com mapping                                                                                                                                                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/webhooks/envia` | POST   | Receive **delivery status updates** (e.g. delivered, exception). Update `order_items` status and trigger customer/manufacturer notifications. | Envia webhooks (if offered) for shipment status changes. Verify in [docs.envia.com](https://docs.envia.com/) for “webhooks” or “events”. If none, use polling via **Track Shipments** in a scheduled Inngest job. |

**Implementation:** Verify webhook signature (Envia docs); idempotent handling; update DB and emit Inngest events for emails.

---

## 3. Envia.com API Summary (for your technical doc)

| Envia capability           | Endpoint / feature                                                                | Use in RefaccionesDirect                                     |
| -------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Quote Shipments**        | [Quote Shipments](https://docs.envia.com/reference/quote-shipments)               | Checkout: get rates per manufacturer shipment                |
| **Create Shipping Labels** | [Create Shipping Labels](https://docs.envia.com/reference/create-shipping-labels) | Manufacturer dashboard: generate label for an order/shipment |
| **Track Shipments**        | [Track Shipments](https://docs.envia.com/reference/track-shipments)               | Customer/manufacturer tracking page or backend status checks |
| **Webhooks**               | Check Envia docs                                                                  | Update order status on delivery; trigger notifications       |

**Auth:** JWT bearer token (Envia).  
**Environments:** Production `api.envia.com`, Sandbox `api-test.envia.com`.

---

## 4. Database Fields to Align With Envia

From the roadmap, commerce tables will have shipping-related columns. Use these for **envia** (rename/adapt if your schema uses different names):

- **order_items** (or equivalent):  
  `shipping_carrier`, `tracking_number`, `tracking_url`, `label_url`, and a **shipment id** field — e.g. `envia_shipment_id` (or whatever Envia returns) instead of `skydropx_shipment_id`.
- **parts**: `weight_kg`, `dimensions_cm` (for quote and label creation).

---

## 5. Endpoints You Need to Understand for Planning

**Existing (read and understand):**

1. **`/api/manufacturer/import/preview`** — POST, JSON body, Supabase admin client, structured error responses. Good template for “accept payload → call external API → return result.”
2. **`/api/auth/callback`** — GET, WorkOS + Supabase upsert. Pattern for “external provider callback → DB sync.”
3. **`/api/webhooks/stripe`** — POST, signature verification, event handling. Template for **`/api/webhooks/envia`** (verify Envia signature, handle events, update DB).

**To add for Envia:**

4. **`/api/checkout/shipping-quotes`** — POST; input address + cart; call Envia Quote Shipments per manufacturer; return options.
5. **`/api/dashboard/orders/[id]/label`** — POST; create label via Envia; persist tracking + label URL.
6. **`/api/shipping/track`** (optional) — GET; proxy to Envia Track; return normalized status.
7. **`/api/webhooks/envia`** — POST; verify signature; update order/shipment status; trigger Inngest for notifications.

---

## 6. Suggested Next Steps

1. **Env & client**
   - Add Envia env vars (e.g. `ENVIA_API_KEY`, `ENVIA_API_URL` for sandbox/prod) to `.env.example` and your local env.
   - Implement `src/lib/envia/client.ts` (or `src/services/shipping/envia.ts`) with:
     - `quoteShipments(...)` → Quote Shipments API
     - `createShippingLabel(...)` → Create Shipping Labels API
     - `trackShipments(...)` → Track Shipments API
   - Add Zod (or similar) types for request/response where useful.

2. **Docs**
   - Read [docs.envia.com](https://docs.envia.com/) for: auth (JWT), rate limits, Mexico address format, and webhooks (if any).
   - In this repo, update `CLAUDE.md` and `docs/plans/shipping-payments-roadmap.md`: replace “Skydropx” with “envia.com” and point to the Envia client and the routes above.

3. **API routes**
   - Implement **shipping-quotes** first (checkout flow).
   - Then **label** creation (fulfillment).
   - Then **track** (and/or Envia webhooks) and **`/api/webhooks/envia`** once you know Envia’s event model.

4. **Schema**
   - When adding commerce migrations, use `envia_shipment_id` (or Envia’s equivalent) instead of `skydropx_shipment_id` on order/shipment tables.

---

## 7. Quick Reference — All Relevant Endpoints

| Endpoint                                      | Status            | Owner                |
| --------------------------------------------- | ----------------- | -------------------- |
| `GET  /api/auth/callback`                     | Exists            | Auth                 |
| `GET/POST/PUT /api/inngest`                   | Exists            | Inngest              |
| `POST /api/webhooks/workos`                   | Exists            | Auth                 |
| `POST /api/webhooks/stripe`                   | Exists (stub)     | Payments             |
| `POST /api/webhooks/envia`                    | **To add**        | **Shipping (Envia)** |
| `POST /api/manufacturer/import/preview`       | Exists            | Import               |
| `POST /api/manufacturer/import/execute`       | Exists            | Import               |
| … (other manufacturer/import/export)          | Exists            | Import/Export        |
| `POST /api/checkout/shipping-quotes`          | **To add**        | **Shipping (Envia)** |
| `POST /api/checkout/create-payment-intent`    | Planned (roadmap) | Payments             |
| `POST /api/checkout/confirm`                  | Planned (roadmap) | Payments             |
| `GET  /api/cart`, `POST /api/cart`, etc.      | Planned (roadmap) | Cart                 |
| `POST /api/dashboard/orders/[id]/label`       | **To add**        | **Shipping (Envia)** |
| `PATCH /api/dashboard/orders/[id]`            | Planned (roadmap) | Orders               |
| `GET  /api/shipping/track?trackingNumber=...` | Optional          | **Shipping (Envia)** |

Use this doc as the single place to plan and track API work for envia.com integration.
