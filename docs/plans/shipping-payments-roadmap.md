# Shipping & Payments Integration — Full Roadmap

## Context

RefaccionesDirect is a multi-manufacturer auto parts marketplace for Mexico. The core commerce pipeline — payments (Stripe Connect) and shipping (Skydropx) — is entirely greenfield. The architecture is well-documented in `docs/RefaccionesDirect_TechnicalArchitecture_v7_0.md` and `docs/RefaccionesDirect_DataArchitectureSpec_v4_0.md`, but no implementation exists beyond stub pages and an installed (unused) Stripe npm package.

**Goal:** Create a comprehensive beads roadmap (epics + tasks with dependencies) that spans multiple development sessions, covering the full order lifecycle from cart to delivery tracking.

### Key Decisions (Confirmed)

- **Multi-manufacturer orders from day 1** — Amazon-style single cart, Stripe Connect payment splits
- **Stripe Connect Express** — Self-service manufacturer onboarding (Stripe handles KYC)
- **Customer pays calculated shipping** — Skydropx PRO rate quotes at checkout
- **Platform fee:** 9-10% flat rate (taken via `application_fee_amount`)
- **Currency:** MXN
- **Skydropx PRO required** — Legacy API deprecated Jan 2025

### Critical Prerequisite: Product Catalog

**The database currently has only `users` and `manufacturers` tables** (migrations 001-003). There is NO `parts` table, no product catalog, no inventory. The commerce tables (`order_items`, `cart_items`) reference `parts(id)` which doesn't exist yet.

Before starting this roadmap, we need either:

- **Option A:** Create a minimal `parts` table as part of Epic 1 (just enough for commerce: id, name, price, quantity, manufacturer_id, status, images)
- **Option B:** Build the full product catalog epic first (parts, vehicles, fitments, cross-refs — per Data Architecture spec) then start this roadmap

**Recommendation:** Option A — create a minimal parts table in Epic 1 that satisfies the commerce FK requirements. The full catalog import pipeline (Excel, vehicle fitments, cross-references) is a separate epic and shouldn't block the payments/shipping work.

### Prerequisite: Account Setup (Manual — User)

Before any code work begins:

- [ ] Create Stripe account at [stripe.com/mx](https://stripe.com/mx) → Get test API keys
- [ ] Create Skydropx PRO account at [skydropx.com/pro](https://www.skydropx.com/pro) → Get Client ID + Client Secret
- [ ] Add keys to `.env.local`

---

## Beads Ticket Map

| Ticket     | Type         | Title                                             |
| ---------- | ------------ | ------------------------------------------------- |
| **RD-bjv** | prerequisite | Design parts/product catalog data architecture    |
| **RD-nt7** | prerequisite | Set up Stripe and Skydropx API accounts           |
| **RD-84f** | epic         | Epic 1: Foundation (DB + service clients)         |
| RD-2rn     | task 1.1     | Create commerce database migration                |
| RD-eng     | task 1.2     | Create Stripe client wrapper                      |
| RD-hkz     | task 1.3     | Create Skydropx PRO client wrapper                |
| RD-bhu     | task 1.4     | Configure commerce environment variables          |
| **RD-3sp** | epic         | Epic 2: Manufacturer Stripe Connect Onboarding    |
| RD-9ls     | task 2.1     | Create Stripe Connect onboarding API route        |
| RD-64q     | task 2.2     | Create Stripe Connect return/refresh routes       |
| RD-ihe     | task 2.3     | Implement Stripe Connect webhook handler          |
| RD-iyi     | task 2.4     | Add Stripe status to manufacturer dashboard       |
| **RD-4fg** | epic         | Epic 3: Cart System                               |
| RD-2nh     | task 3.1     | Create cart API routes                            |
| RD-pss     | task 3.2     | Implement cart state management                   |
| RD-eyl     | task 3.3     | Build cart page UI                                |
| RD-abx     | task 3.4     | Add 'Add to Cart' button to product pages         |
| **RD-9na** | epic         | Epic 4: Checkout & Payment                        |
| RD-t8d     | task 4.1     | Build checkout shipping address form              |
| RD-seo     | task 4.2     | Implement Skydropx shipping rate quotes           |
| RD-gs5     | task 4.3     | Implement Stripe payment flow with Connect splits |
| RD-v3l     | task 4.4     | Create order on payment success                   |
| RD-q34     | task 4.5     | Build checkout success/failure pages              |
| **RD-kem** | epic         | Epic 5: Order Fulfillment                         |
| RD-yvi     | task 5.1     | Create Inngest order fulfillment workflow         |
| RD-2xx     | task 5.2     | Build manufacturer orders list page               |
| RD-h3a     | task 5.3     | Implement shipping label generation               |
| RD-aut     | task 5.4     | Build order status update API                     |
| **RD-ve0** | epic         | Epic 6: Notifications & Tracking                  |
| RD-pgd     | task 6.1     | Create order email templates                      |
| RD-nvy     | task 6.2     | Build customer order history page                 |
| RD-ozp     | task 6.3     | Implement Skydropx delivery webhooks              |
| RD-sgs     | task 6.4     | Build customer order tracking page                |

---

## Epic 1: Foundation (DB Schema + Service Clients)

**Why:** Everything depends on the database tables and API client wrappers. This must be built first.

### Task 1.1: Commerce database migration

Create `supabase/migrations/YYYYMMDD_create_commerce_tables.sql`:

**Tables (from Data Architecture v4.0, refined):**

```
parts (minimal — enough for commerce, expanded later for full catalog)
  - id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  - manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id)
  - sku TEXT NOT NULL
  - name TEXT NOT NULL
  - description TEXT
  - price NUMERIC(12,2) NOT NULL
  - quantity INTEGER NOT NULL DEFAULT 0
  - low_stock_threshold INTEGER DEFAULT 5
  - status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active','paused','discontinued'))
  - weight_kg NUMERIC(8,3)  -- needed for shipping quotes
  - dimensions_cm JSONB      -- {length, width, height} for shipping
  - images JSONB DEFAULT '[]' -- array of image URLs (simplified for MVP)
  - category TEXT
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ DEFAULT now()
  - UNIQUE(manufacturer_id, sku)

orders
  - id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  - customer_id BIGINT NOT NULL REFERENCES users(id)
  - status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','refunded'))
  - subtotal NUMERIC(12,2) NOT NULL
  - shipping_total NUMERIC(12,2) NOT NULL
  - platform_fee NUMERIC(12,2) NOT NULL
  - total NUMERIC(12,2) NOT NULL
  - currency TEXT NOT NULL DEFAULT 'MXN'
  - shipping_address JSONB NOT NULL
  - stripe_payment_intent_id TEXT
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ DEFAULT now()

order_items
  - id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  - order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE
  - manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id)
  - part_id BIGINT NOT NULL REFERENCES parts(id)  -- NOTE: parts table needs to exist first
  - quantity INTEGER NOT NULL CHECK (quantity > 0)
  - unit_price NUMERIC(12,2) NOT NULL
  - subtotal NUMERIC(12,2) NOT NULL
  - shipping_cost NUMERIC(12,2)
  - shipping_carrier TEXT
  - tracking_number TEXT
  - tracking_url TEXT
  - label_url TEXT
  - skydropx_shipment_id TEXT
  - status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','refunded'))
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ DEFAULT now()

manufacturer_stripe_accounts
  - id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  - manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id) UNIQUE
  - stripe_account_id TEXT NOT NULL  -- acct_xxx
  - onboarding_complete BOOLEAN NOT NULL DEFAULT false
  - charges_enabled BOOLEAN NOT NULL DEFAULT false
  - payouts_enabled BOOLEAN NOT NULL DEFAULT false
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ DEFAULT now()

cart_items (session-based or user-based)
  - id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
  - user_id BIGINT REFERENCES users(id)
  - session_id TEXT  -- for guest carts
  - part_id BIGINT NOT NULL REFERENCES parts(id)
  - manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id)
  - quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ DEFAULT now()
  - UNIQUE(user_id, part_id) WHERE user_id IS NOT NULL
  - UNIQUE(session_id, part_id) WHERE session_id IS NOT NULL
```

**Indexes:** order_items(order_id), order_items(manufacturer_id), orders(customer_id), orders(status), cart_items(user_id), cart_items(session_id)

**RLS policies:** Orders visible to customer who placed them + manufacturer for their items + platform admin. Cart items visible only to owner.

**Note:** Parts table created in this same migration (minimal schema for commerce). The full catalog schema (vehicles, fitments, cross-references) will be a separate epic.

### Task 1.2: Stripe client wrapper

Create `src/lib/stripe/client.ts`:

- Initialize Stripe SDK with `STRIPE_SECRET_KEY`
- Export typed helper functions (not raw SDK)
- Use Stripe API version 2024-12-18 or latest

Create `src/lib/stripe/config.ts`:

- Platform fee percentage constant (0.09)
- Stripe webhook secret
- Connect configuration

**Files:** `src/lib/stripe/client.ts`, `src/lib/stripe/config.ts`

### Task 1.3: Skydropx client wrapper

Create `src/lib/skydropx/client.ts`:

- HTTP client wrapping Skydropx PRO REST API
- Auth: Bearer token or OAuth2 (Client ID + Secret)
- Base URL: `https://api.skydropx.com/v1/`
- Key methods: `getQuotations()`, `createShipment()`, `createLabel()`, `getTracking()`
- Zod schemas for request/response validation

Create `src/lib/skydropx/types.ts`:

- TypeScript types for quotation request/response, shipment, label, tracking

**Files:** `src/lib/skydropx/client.ts`, `src/lib/skydropx/types.ts`, `src/lib/skydropx/config.ts`

### Task 1.4: Environment variables setup

Add to `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SKYDROPX_CLIENT_ID=...
SKYDROPX_CLIENT_SECRET=...
SKYDROPX_API_URL=https://api.skydropx.com/v1
```

Update `.env.example` with placeholder keys.

---

## Epic 2: Manufacturer Stripe Connect Onboarding

**Why:** Manufacturers must have connected Stripe accounts before they can receive payouts. This is a prerequisite for checkout.

### Task 2.1: Create Connect onboarding API route

`src/app/api/stripe/connect/onboard/route.ts`:

- POST: Creates Express connected account for manufacturer
- Calls `stripe.accounts.create({ type: 'express', country: 'MX', ... })`
- Saves to `manufacturer_stripe_accounts` table
- Returns Stripe Account Link URL for onboarding

### Task 2.2: Create Connect return/refresh routes

`src/app/api/stripe/connect/return/route.ts`:

- GET: Stripe redirects here after manufacturer completes onboarding
- Checks account status (`charges_enabled`, `payouts_enabled`)
- Updates `manufacturer_stripe_accounts` table

`src/app/api/stripe/connect/refresh/route.ts`:

- GET: If onboarding link expired, generates new one

### Task 2.3: Stripe Connect webhook handler

Update `src/app/api/webhooks/stripe/route.ts` (currently stub):

- Verify webhook signature
- Handle `account.updated` event → update `manufacturer_stripe_accounts`
- Handle `payment_intent.succeeded` → update order status
- Handle `payment_intent.payment_failed` → handle failure
- Handle `charge.refunded` → update order status

### Task 2.4: Manufacturer dashboard — Stripe status

Add to manufacturer dashboard:

- "Connect with Stripe" button (if not onboarded)
- Onboarding status indicator (pending / active / restricted)
- Link to Stripe Express Dashboard for payouts/balance

**Depends on:** Epic 1 (Task 1.1, 1.2)

---

## Epic 3: Cart System

**Why:** Customers need to add parts to a cart before checkout. Cart must support items from multiple manufacturers.

### Task 3.1: Cart API routes

`src/app/api/cart/route.ts`:

- GET: Fetch current cart (by user_id or session_id)
- POST: Add item to cart (part_id, quantity)
- PATCH: Update quantity
- DELETE: Remove item

Cart grouped by manufacturer for display purposes.

### Task 3.2: Cart state management

`src/lib/cart/context.tsx` (or server-side with cookies):

- Cart count in header
- Optimistic updates for add/remove
- Merge guest cart → user cart on login

### Task 3.3: Cart page UI

Update `src/app/[locale]/(storefront)/cart/page.tsx` (currently stub):

- Items grouped by manufacturer
- Quantity +/- controls
- Subtotal per manufacturer
- Cart total
- "Proceed to Checkout" button
- Empty cart state

### Task 3.4: "Add to Cart" button on product pages

Add to product detail page and product cards:

- Button with quantity selector
- Success feedback (toast or cart count animation)
- Stock check before adding

**Depends on:** Epic 1 (Task 1.1 for cart_items table)

---

## Epic 4: Checkout & Payment

**Why:** The core transaction — customer pays, money splits to manufacturers, order is created.

### Task 4.1: Checkout page — shipping address

Update `src/app/[locale]/(storefront)/checkout/page.tsx`:

- Step 1: Shipping address form (Mexico-specific: colonia, CP, city, state)
- Address validation (Zod schema)
- Save address for future orders (optional)

### Task 4.2: Checkout page — shipping rate quotes

- Step 2: Call Skydropx `/v1/quotations` per manufacturer (separate shipments)
- Show carrier options per manufacturer (DHL, FedEx, Estafeta, etc.)
- Customer selects carrier for each shipment
- Display shipping cost breakdown

**API route:** `src/app/api/checkout/shipping-quotes/route.ts`

- Accepts: shipping address + cart items grouped by manufacturer
- For each manufacturer: calls Skydropx with origin (manufacturer address) + destination
- Returns: carrier options with prices per manufacturer

### Task 4.3: Checkout page — payment

- Step 3: Order summary (items + shipping + platform fee + total)
- Create Stripe PaymentIntent server-side via API route
- Use `@stripe/react-stripe-js` for Stripe Elements (card input)
- PaymentIntent uses `transfer_data` for multi-party split:
  - Each manufacturer gets their subtotal minus platform fee
  - Platform keeps `application_fee_amount`

**API route:** `src/app/api/checkout/create-payment-intent/route.ts`

- Calculates: item totals + shipping per mfr + platform fee
- Creates PaymentIntent with Connect transfers
- Returns: client_secret for Stripe Elements

### Task 4.4: Order creation on payment success

**API route:** `src/app/api/checkout/confirm/route.ts` (or webhook-based):

- On successful payment:
  1. Create `orders` row
  2. Create `order_items` rows (one per manufacturer per part)
  3. Decrement inventory (`parts.quantity`)
  4. Clear cart
  5. Emit Inngest `order/created` event

### Task 4.5: Checkout success/failure pages

- `src/app/[locale]/(storefront)/checkout/success/page.tsx` — Order confirmation
- `src/app/[locale]/(storefront)/checkout/cancel/page.tsx` — Payment failed/cancelled

**Depends on:** Epics 1-3, manufacturer must have Stripe account (Epic 2)

---

## Epic 5: Order Fulfillment & Manufacturer Dashboard

**Why:** After payment, manufacturers need to fulfill orders — confirm, generate shipping labels, and ship.

### Task 5.1: Inngest order fulfillment workflow

`src/inngest/functions/order-fulfillment.ts`:

```
Event: "order/created"
Steps:
  1. Validate order + stock availability (re-check)
  2. Update order status → 'paid'
  3. Send order confirmation email to customer (Resend)
  4. For each manufacturer in order:
     a. Create manufacturer notification
     b. Update order_item status → 'confirmed'
  5. Wait for shipping (manufacturer generates label)
  6. On label created → update tracking, notify customer
```

### Task 5.2: Manufacturer dashboard — orders list

`src/app/[locale]/(dashboard)/orders/page.tsx`:

- List of order items for this manufacturer
- Filter by status (pending, confirmed, shipped, delivered)
- Order details: customer shipping address, items, amounts

### Task 5.3: Manufacturer dashboard — generate shipping label

`src/app/[locale]/(dashboard)/orders/[id]/page.tsx`:

- "Generate Label" button
- Calls Skydropx `POST /v1/shipments` then `POST /v1/labels`
- Displays label PDF for printing
- Saves tracking number + label URL to order_item

**API route:** `src/app/api/dashboard/orders/[id]/label/route.ts`

- Creates Skydropx shipment with manufacturer origin + customer destination
- Generates label
- Updates order_item with tracking info
- Emits Inngest `order/shipped` event

### Task 5.4: Order status updates

API routes for manufacturer to update order status:

- `PATCH /api/dashboard/orders/[id]` — mark as shipped (with tracking), mark as delivered
- Triggers Inngest events for status change notifications

**Depends on:** Epic 4

---

## Epic 6: Notifications & Customer Tracking

**Why:** Customers need visibility into their order status. Manufacturers need order notifications.

### Task 6.1: Email templates (React Email + Resend)

Templates:

- Order confirmation (customer)
- New order notification (manufacturer)
- Order shipped with tracking (customer)
- Order delivered (customer)

Using `react-email` + Resend (already in tech stack).

### Task 6.2: Customer order history page

`src/app/[locale]/(storefront)/orders/page.tsx`:

- List of past orders
- Order detail with status per manufacturer shipment
- Tracking link per shipment

### Task 6.3: Skydropx webhook handler

`src/app/api/webhooks/skydropx/route.ts`:

- Verify HMAC SHA-512 signature
- Handle delivery status updates
- Update order_item status
- Trigger notification emails

### Task 6.4: Customer order tracking page

`src/app/[locale]/(storefront)/orders/[id]/page.tsx`:

- Order summary
- Per-manufacturer shipment tracking
- Status timeline (ordered → confirmed → shipped → delivered)
- Tracking number + carrier link

**Depends on:** Epic 5

---

## Dependency Graph

```
Prerequisites
  RD-bjv (parts data architecture) ──┐
  RD-nt7 (Stripe/Skydropx accounts) ─┤
                                      ▼
  Epic 1: RD-84f Foundation (DB + clients)
        ├── Epic 2: RD-3sp Manufacturer Onboarding (Stripe Connect)
        ├── Epic 3: RD-4fg Cart System
        └── Epic 4: RD-9na Checkout & Payment (needs 1, 2, 3)
              └── Epic 5: RD-kem Order Fulfillment (needs 4)
                    └── Epic 6: RD-ve0 Notifications & Tracking (needs 5)
```

## Existing Code to Reuse

| Existing               | Path                                              | Reuse for                         |
| ---------------------- | ------------------------------------------------- | --------------------------------- |
| Stripe npm package     | `package.json` (v20)                              | Already installed                 |
| Inngest client         | `src/inngest/client.ts`                           | Add order events to schema        |
| Inngest serve route    | `src/app/api/inngest/route.ts`                    | Register new functions            |
| Stripe webhook stub    | `src/app/api/webhooks/stripe/route.ts`            | Replace with real handler         |
| Cart page stub         | `src/app/[locale]/(storefront)/cart/page.tsx`     | Replace with real UI              |
| Checkout page stub     | `src/app/[locale]/(storefront)/checkout/page.tsx` | Replace with real UI              |
| Supabase admin client  | `src/lib/supabase/admin.ts`                       | Service-role operations           |
| Supabase server client | `src/lib/supabase/server.ts`                      | User-scoped queries               |
| WorkOS auth            | `src/proxy.ts`                                    | Protect checkout/dashboard routes |
| Database types         | `src/types/database.ts`                           | Regenerate after migration        |

## API References

- **Stripe Connect Express**: [docs.stripe.com/connect/express-accounts](https://docs.stripe.com/connect/express-accounts)
- **Stripe Connect Marketplace**: [docs.stripe.com/connect/end-to-end-marketplace](https://docs.stripe.com/connect/end-to-end-marketplace)
- **Stripe Connect Mexico Pricing**: [stripe.com/en-mx/connect/pricing](https://stripe.com/en-mx/connect/pricing)
- **Skydropx PRO API**: [docs.skydropx.com](https://docs.skydropx.com/)
- **Skydropx PRO**: [skydropx.com/pro/soluciones/api](https://www.skydropx.com/pro/soluciones/api)
- **Community Skydropx client**: [github.com/Docxter/Skydropx-API](https://github.com/Docxter/Skydropx-API)

## Verification

After each epic is complete:

1. **Epic 1:** `supabase db reset` succeeds, types regenerate, Stripe/Skydropx clients instantiate without errors
2. **Epic 2:** Test manufacturer can complete Stripe onboarding in test mode, webhook updates status
3. **Epic 3:** Can add/remove items, cart persists across page loads, items grouped by manufacturer
4. **Epic 4:** End-to-end: add to cart → checkout → enter address → see shipping quotes → pay with test card → order created in DB
5. **Epic 5:** Inngest Dev Server shows workflow steps completing, manufacturer can generate test label
6. **Epic 6:** Emails sent via Resend, customer can view order status, tracking updates arrive via webhook

## Estimated Effort

| Epic                        | Sessions          | Notes                                                 |
| --------------------------- | ----------------- | ----------------------------------------------------- |
| 1. Foundation               | 2-3               | DB migration + two API clients                        |
| 2. Manufacturer Onboarding  | 1-2               | Stripe Connect is well-documented                     |
| 3. Cart System              | 1-2               | Standard CRUD + UI                                    |
| 4. Checkout & Payment       | 2-3               | Most complex: Skydropx quotes + Stripe Connect splits |
| 5. Order Fulfillment        | 2-3               | Inngest workflow + manufacturer dashboard             |
| 6. Notifications & Tracking | 1-2               | Email templates + tracking page                       |
| **Total**                   | **9-15 sessions** |                                                       |

## Land the Plane

Per CLAUDE.md protocol — each epic gets its own branch, PR, and CI pass before merging.
