# Shipping API Exploration

Test-driven discovery module for the shipping provider's sandbox API. No production code — tests call the real API to capture request/response shapes, then we build Zod schemas and document findings before implementing the production client.

## Quick start

1. **Env vars** (in `.env.local`):
   - `ENVIA_SANDBOX_SHIPPING_API_KEY` (or `SHIPPING_API_KEY`) — sandbox API key
   - `ENIVA_SANDBOX_SHIPPING_API_URL` or `ENVIA_SANDBOX_SHIPPING_API_URL` (or `SHIPPING_API_URL`) — sandbox base URL
   - Optional: `ENIVA_SANDBOX_SHIPPING_API_QUERIES` / `ENVIA_SANDBOX_SHIPPING_API_QUERIES` — queries base URL if different

2. **Verify sandbox connectivity** (optional, no Vitest):

   ```bash
   npm run shipping:verify-sandbox
   ```

   This hits the sandbox (carrier list or root) and prints status and response time. Exits with 0 if the request succeeds.

3. **Run exploration tests:**

   ```bash
   npm run test:explore          # single run
   npm run test:explore:watch    # watch mode
   ```

   Module 1’s first test (“authenticates with valid sandbox credentials”) does the same connectivity check and saves a snapshot to `__snapshots__/`.

4. **Order:** Run modules in order (01 → 11). Later modules may depend on data from earlier ones (e.g. tracking numbers from label generation).

## Layout

- `helpers/` — API client, fixtures, snapshot util, assertions, Zod schemas (filled from real responses)
- `__tests__/` — 11 modules (connectivity, reference data, address validation, rate quoting, labels, tracking, cancellation, errors, edge cases, webhooks, pickup)
- `__snapshots__/` — Captured JSON responses (git-tracked); source of truth for response shapes

## Plan

See `docs/plans/shipping-api-exploration-tests.md` for the full test plan, business rules, and workflow validation checklist.
