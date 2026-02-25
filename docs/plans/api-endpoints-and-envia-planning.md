# API Endpoints & Envia.com Integration — Technical Planning Doc

This document lists **existing** API routes, **planned** shipping-related routes (from the roadmap), and how they map to **envia.com** so we can plan the next steps.

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

### Envia endpoints — short summary list

| #   | API      | Endpoint / feature                        | Use                                                     |
| --- | -------- | ----------------------------------------- | ------------------------------------------------------- |
| 1   | Shipping | **Quote Shipments**                       | Checkout: get rates per manufacturer shipment           |
| 2   | Shipping | **Create Shipping Labels**                | Manufacturer: generate label after order paid           |
| 3   | Shipping | **Track Shipments**                       | Tracking page; optional status polling if no webhooks   |
| 4   | Shipping | **Cancel Shipments**                      | Cancel label (mistakes, duplicates)                     |
| 5   | Shipping | **Webhooks**                              | Delivery status updates → update order, notify customer |
| 6   | Queries  | **Get address structure**                 | MX (and other) address form fields and validation       |
| 7   | Queries  | **Get carriers by country**               | Which carriers to quote for MX                          |
| 8   | Queries  | **Get services by carrier** (and country) | Optional: service list per carrier                      |
| 9   | Queries  | **Get states by country**                 | State dropdown (e.g. MX)                                |
| 10  | Geocodes | **Validate zip code**                     | CP validation before quote/label                        |
| 11  | Geocodes | **Locate city**                           | City/locality from CP (autofill)                        |
| 12  | Shipping | **Schedule Pickup**                       | Optional: manufacturer requests carrier pickup          |

---

## 3.1 Envia Quote Shipments (`POST /ship/rate/`) — Full Requirements

Reference: [Quote Shipments](https://docs.envia.com/reference/quote-shipments).

### Top-level body (all required)

| Field         | Type   | Required | Notes                                   |
| ------------- | ------ | -------- | --------------------------------------- |
| `origin`      | object | ✅       | Sender address (manufacturer warehouse) |
| `destination` | object | ✅       | Recipient address (customer)            |
| `packages`    | array  | ✅       | One or more package specs               |
| `shipment`    | object | ✅       | Carrier + shipment type                 |

### Origin & destination address (same shape)

| Field         | Type                    | Required | Notes                                              |
| ------------- | ----------------------- | -------- | -------------------------------------------------- |
| `name`        | string                  | ✅       | Person or contact name                             |
| `phone`       | string                  | ✅       | Phone number                                       |
| `street`      | string                  | ✅       | Street address                                     |
| `city`        | string                  | ✅       | City (use Queries/Geocodes for valid values)       |
| `state`       | string                  | ✅       | **2-digit state code** (e.g. `NL`, `CMX` for CDMX) |
| `country`     | string                  | ✅       | **2-digit country code** (e.g. `MX`)               |
| `postalCode`  | string                  | ✅       | Zip; validate with Geocodes API for MX             |
| `company`     | string                  | —        | Optional                                           |
| `email`       | string                  | —        | Optional                                           |
| `phone_code`  | string                  | —        | e.g. `52`, `MX`                                    |
| `number`      | string                  | —        | Street number (Mexico example uses it)             |
| `district`    | string                  | —        | Colonia / neighborhood (Mexico)                    |
| `reference`   | string                  | —        | Delivery notes                                     |
| `coordinates` | { latitude, longitude } | —        | Optional                                           |

**Mexico:** Envia examples use `district` (colonia), `number` (street number). State must be 2 digits (e.g. `NL`, `CMX`). Use [Get address structure](https://docs.envia.com/reference/get-address-structure) with `country_code=MX` and `form=address_info` to get required fields and validation rules.

### Packages (each item in `packages` array)

| Field                | Type    | Required | Notes                                                                                       |
| -------------------- | ------- | -------- | ------------------------------------------------------------------------------------------- |
| `type`               | string  | ✅       | `envelope` \| `box` \| `pallet` \| `full_truck_load`                                        |
| `content`            | string  | ✅       | Description of contents                                                                     |
| `amount`             | integer | ✅       | Number of packages (usually 1 per line or aggregated)                                       |
| `declaredValue`      | number  | ✅       | Merchandise value (not insurance amount)                                                    |
| `lengthUnit`         | string  | ✅       | `CM` \| `IN`                                                                                |
| `weightUnit`         | string  | ✅       | `KG` \| `LB`                                                                                |
| `weight`             | number  | ✅       | Package weight                                                                              |
| `dimensions`         | object  | ✅       | See below                                                                                   |
| `name`               | string  | —        | Package name                                                                                |
| `additionalServices` | array   | —        | e.g. `envia_insurance`, `cash_on_delivery`, `electronic_signature`; some need `data.amount` |

**dimensions** (required): `length`, `width`, `height` (numbers).

**International:** For cross-border, packages can include `items[]` with `description`, `productCode` (HS code), `quantity`, `countryOfManufacture`, `price`, `currency`.

### Shipment object

| Field                | Type    | Required | Notes                                          |
| -------------------- | ------- | -------- | ---------------------------------------------- |
| `type`               | integer | ✅       | `1` = Parcel, `2` = LTL, `3` = FTL (default 1) |
| `carrier`            | string  | ✅       | Carrier key, e.g. `dhl`, `ups`, `usps`         |
| `service`            | string  | —        | If set, quote only this service                |
| `reverse_pickup`     | 0 \| 1  | —        | Return shipment (default 0)                    |
| `import`             | 0 \| 1  | —        | Import shipment (default 0)                    |
| `declaredValue`      | number  | —        | Shipment-level declared value                  |
| `additionalServices` | array   | —        | Shipment-level services                        |

**Important:** **One request per carrier.** To get multiple carriers (DHL, Estafeta, etc.), the app must call Quote Shipments once per carrier and aggregate results.

### Optional: settings

| Field      | Type   | Notes                                           |
| ---------- | ------ | ----------------------------------------------- |
| `currency` | string | `MXN`, `USD`, etc. (ISO). Use `MXN` for Mexico. |
| `comments` | string | Shipment comments                               |

### Optional: customsSettings (international only)

| Field                 | Type   | Notes                                               |
| --------------------- | ------ | --------------------------------------------------- |
| `dutiesPaymentEntity` | string | `envia_guaranteed` \| `sender` \| `recipient`       |
| `exportReason`        | string | `sale` \| `gift` \| `sample` \| `return` \| `other` |

### Response (200) — fields useful for checkout

| Field                                   | Use in RefaccionesDirect                                        |
| --------------------------------------- | --------------------------------------------------------------- |
| `data[]`                                | Array of quote options                                          |
| `data[].carrier`                        | Carrier key (e.g. `dhl`)                                        |
| `data[].carrierDescription`             | Display name                                                    |
| `data[].serviceId`                      | **Required later for Create Label** — save with selected option |
| `data[].service` / `serviceDescription` | Display name for service                                        |
| `data[].totalPrice`                     | Price to show customer (string)                                 |
| `data[].currency`                       | e.g. `MXN`                                                      |
| `data[].deliveryEstimate`               | e.g. "2-3 days"                                                 |
| `data[].deliveryDate`                   | `date`, `time`, `timeUnit` (hours/days)                         |
| `data[].dropOff`                        | 0=home-home, 1=branch-home, 2=home-branch, 3=branch-branch      |

---

## 3.2 Consumer Journey vs Envia Requirements

| Consumer step                | What we need for Envia Quote                                       | Source / open question                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browse / add to cart         | —                                                                  | —                                                                                                                                                             |
| Go to checkout               | **Destination address** (full Envia shape)                         | Customer form: name, phone, street, number?, district (colonia?), city, state (2-digit), country, postalCode. Do we validate CP with Geocodes before quoting? |
| See shipping options         | **Origin address** per manufacturer                                | Where do we store manufacturer warehouse address? (manufacturers table? new `addresses`?)                                                                     |
|                              | **Packages** (weight, dimensions, declaredValue, content)          | From `parts`: weight_kg, dimensions_cm. Do we have defaults for missing dims? Declared value = sum of (unit_price × qty) per package?                         |
|                              | **One quote request per carrier** per manufacturer                 | Which carriers do we support for MX? (DHL, Estafeta, Redpack, …?) Get list from Envia Queries: “Get carriers by country” for MX.                              |
|                              | **Currency**                                                       | MXN (confirm).                                                                                                                                                |
| Select carrier + service     | Store `serviceId` (and carrier key) for each manufacturer shipment | Pass to Create Label step later.                                                                                                                              |
| Pay                          | —                                                                  | Stripe flow.                                                                                                                                                  |
| Order created                | —                                                                  | Order + order_items with chosen carrier/serviceId per line.                                                                                                   |
| Manufacturer generates label | Same origin, destination, packages + **serviceId** from quote      | Create Shipping Labels API.                                                                                                                                   |

---

## 3.3 Questions to Resolve (Planning)

### Address & validation

1. **Mexico address form:** Do we use Envia’s [Get address structure](https://docs.envia.com/reference/get-address-structure) (`country_code=MX`, `form=address_info`) to drive checkout address fields and validation rules?
2. **Postal code validation:** Do we call Envia Geocodes (e.g. validate zip / locate city) before calling Quote, to avoid bad quotes or failed labels?
3. **Colonia (district):** Is colonia required for Mexico in practice? Envia Mexico example includes `district` (e.g. "Obispado", "Jardines de Mirasierra"). Do we collect it and from where (CP lookup vs free text)?

### Product & packaging

4. **Missing weight/dimensions:** If a part has no `weight_kg` or `dimensions_cm`, do we block checkout, use defaults, or estimate from category?
5. **Declared value:** Is `declaredValue` per package always the sum of (unit_price × quantity) for that package, or do we allow override (e.g. for insurance)?
6. **Multiple parts in one box:** For one manufacturer, do we quote one package (aggregate weight/dims) or one package per part? Envia allows multiple packages in one quote; we need a rule (e.g. one box per manufacturer with aggregated specs).

### Multi-manufacturer & carriers

7. **Manufacturer origin address:** Where is it stored? (e.g. `manufacturers.shipping_address` or separate `addresses` table.) Who maintains it (manufacturer profile in dashboard)?
8. **Carrier list for MX:** Which carriers do we expose? Use Envia Queries “Get carriers by country” (MX) and optionally “Get services by carrier” to show only serviceable options.
9. **One quote per carrier:** We need N × M requests (N manufacturers, M carriers). Do we run them in parallel and cap M (e.g. top 3–5 carriers) to keep checkout fast?

### UX & business

10. **Display of options:** Show one combined list (all carriers × all manufacturers) or grouped by manufacturer? How do we display “DHL $120, Estafeta $95” when there are 2 manufacturers (2 shipments)?
11. **Free shipping:** Do we ever offer free shipping (e.g. over threshold) and hide or zero out Envia’s quote for that leg?
12. **Service code for label:** When generating the label later, we must pass the same `serviceId` (and carrier) the customer chose. Is that stored on `order_items` (e.g. `envia_carrier`, `envia_service_id`) at checkout confirmation?

---

## 3.4 Envia Create Shipping Labels (`POST /ship/generate/`) — Full Requirements

Reference: [Create Shipping Labels](https://docs.envia.com/reference/create-shipping-labels).

Use this **after** the customer has paid and the manufacturer is fulfilling: same origin/destination/packages as the quote, plus the **service** (and carrier) the customer selected. Creating a label **charges** the Envia account and generates a real shipment with the carrier.

### Top-level body (all required)

| Field         | Type   | Required | Notes                                                                |
| ------------- | ------ | -------- | -------------------------------------------------------------------- |
| `origin`      | object | ✅       | Same shape as Quote (manufacturer address)                           |
| `destination` | object | ✅       | Same shape as Quote (customer shipping address)                      |
| `packages`    | array  | ✅       | Same shape as Quote (one or more packages)                           |
| `shipment`    | object | ✅       | **Must include `carrier` + `service`** from the quote                |
| `settings`    | object | ✅       | **Required for labels** — must include `printFormat` and `printSize` |

### Origin & destination

Same as Quote Shipments: `name`, `phone`, `street`, `city`, `state`, `country`, `postalCode` (all required). Optional: `company`, `email`, `phone_code`, `number`, `district`, `reference`, `address_id`, `identificationNumber`, `category`. State/country 2-digit codes; Mexico uses `district` (colonia), `number`.

### Packages

Same as Quote except **package type** enum: `envelope` | `box` | `pallet` (no `full_truck_load`). Required per item: `type`, `content`, `amount`, `declaredValue`, `lengthUnit`, `weightUnit`, `weight`, `dimensions` (length/width/height). Optional: `name`, `additionalServices`, `items` (international). For LTL/freight, `bolComplement` can be used.

### Shipment object (required fields differ from Quote)

| Field                | Type    | Required | Notes                                                                 |
| -------------------- | ------- | -------- | --------------------------------------------------------------------- |
| `type`               | integer | ✅       | 1 = Parcel, 2 = LTL, 3 = FTL                                          |
| `carrier`            | string  | ✅       | Same carrier key used in the quote (e.g. `dhl`, `fedex`)              |
| `service`            | string  | ✅       | **Service code from the Quote response** — must match what was quoted |
| `reverse_pickup`     | 0 \| 1  | —        | Return shipment (default 0)                                           |
| `import`             | 0 \| 1  | —        | Import shipment (default 0)                                           |
| `declaredValue`      | number  | —        | Shipment-level declared value                                         |
| `orderReference`     | string  | —        | **Our order ID** — good to pass for support and reconciliation        |
| `additionalServices` | array   | —        | LTL only                                                              |
| `pickup`             | object  | —        | Pickup date, totalPackages, totalWeight (for scheduled pickup)        |

**Critical:** `shipment.service` must be the exact **service** (or serviceId) returned by Quote for the chosen option; otherwise label creation can fail or not match the quoted price.

### Settings (required for label generation)

| Field         | Type   | Required | Notes                                                          |
| ------------- | ------ | -------- | -------------------------------------------------------------- |
| `printFormat` | string | ✅       | `PDF` \| `PNG` \| `ZPL` \| `ZPLII` \| `EPL`                    |
| `printSize`   | string | ✅       | `PAPER_4X6` \| `PAPER_7X4.75` \| `STOCK_4X6` \| `PAPER_LETTER` |
| `currency`    | string | —        | MXN, USD, etc.                                                 |
| `comments`    | string | —        | Shipment comments                                              |

**Typical:** `printFormat: "PDF"`, `printSize: "STOCK_4X6"` or `"PAPER_4X6"` for standard 4×6 labels.

### Optional: customsSettings

Same as Quote: `dutiesPaymentEntity`, `exportReason` for international.

### Response (200) — fields to persist

| Field                               | Use in RefaccionesDirect                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `data`                              | Array of generated label(s) (usually one per request)                        |
| `data[].shipmentId`                 | **Store as `envia_shipment_id`** — Envia’s shipment ID                       |
| `data[].trackingNumber`             | **Store** — show to customer and manufacturer                                |
| `data[].trackUrl`                   | **Store as `tracking_url`** — carrier tracking link                          |
| `data[].label`                      | **Store as `label_url`** — URL to download/print label (PDF/PNG/etc.)        |
| `data[].carrier` / `data[].service` | Echo of request; can store for display                                       |
| `data[].totalPrice`                 | What was charged for this label                                              |
| `data[].packages[]`                 | Per-package tracking if multiple; each can have `trackingNumber`, `trackUrl` |
| `data[].additionalFiles`            | Any extra documents (e.g. commercial invoice)                                |

### Create Label vs Quote — differences

| Aspect                    | Quote (`/ship/rate/`)                           | Create Label (`/ship/generate/`)                                     |
| ------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `settings`                | Optional (currency, comments)                   | **Required**; must include **printFormat**, **printSize**            |
| `shipment.service`        | Optional (if omitted, all services for carrier) | **Required** — must be the selected quote option                     |
| `shipment.orderReference` | —                                               | Optional but recommended (our order ID)                              |
| Package type              | envelope, box, pallet, full_truck_load          | envelope, box, pallet only                                           |
| Effect                    | Returns rates only                              | **Charges account**, creates real shipment, returns label + tracking |

### Consumer journey (fulfillment)

| Step                     | What we need                                                                                                                        | Source                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Manufacturer opens order | Order + order_items with shipping address, package specs, chosen carrier/service                                                    | DB (orders, order_items, parts)                              |
| Clicks “Generate label”  | Same origin (manufacturer), destination (order shipping_address), packages (from parts), **carrier + service** (stored at checkout) | order_items: envia_carrier, envia_service_id (or equivalent) |
| Backend calls Envia      | Add **settings.printFormat**, **settings.printSize**; optionally **shipment.orderReference** = order id                             | App config (e.g. PDF, STOCK_4X6)                             |
| Persist response         | Save shipmentId, trackingNumber, trackUrl, label URL on order_item                                                                  | API route + DB update                                        |
| Notify customer          | Trigger Inngest “order shipped” → email with tracking link                                                                          | Inngest                                                      |

### Questions to resolve (Create Label)

1. **Print format/size:** Default to `PDF` + `STOCK_4X6` (or `PAPER_4X6`)? Or let manufacturer choose in dashboard settings?
2. **Order reference:** Always send `shipment.orderReference` = our `orders.id` (or order number) for support and reconciliation?
3. **Label storage:** Store only the Envia `label` URL, or also download and store in Supabase Storage for durability if Envia URL expires?
4. **Idempotency:** If manufacturer clicks “Generate label” twice, do we block (already has tracking) or call Envia again (risk of double charge)? Prefer: check order_item for existing tracking_number before calling Envia.
5. **Service code format:** Quote returns `serviceId` and `service` — which one does Create Label expect in `shipment.service`? (Verify in Envia docs; often the string service code.)
6. **Cancel flow:** If label was created by mistake, use Envia **Cancel Shipments** endpoint; document and optionally expose “Cancel shipment” in dashboard with confirmation.

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
