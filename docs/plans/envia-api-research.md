# Envia API Research Questions

**Purpose:** Answer these questions to determine exactly what Envia can and can't do for RefaccionesDirect. Findings will be merged into the Shipping API Spec (v0.1 → v1.0).

**Where to look:** Envia docs (https://docs.envia.com), sandbox testing, and/or Envia sales/support if docs are insufficient.

---

## 1. Account & Authentication

> We need to know how Envia accounts work before writing any code.

**1.1** What authentication method does Envia use? Bearer token, OAuth2, API key, or something else?

```
Answer:Bearer Token authentication (API Key as JWT-style token)
    BreakDown:
    Authorization: Bearer YOUR_ENVIA_API_KEY
    Content-Type: application/json
    Example(Sandbox)
    POST https://api-test.envia.com/ship/rate
    Authorization: Bearer YOUR_SANDBOX_KEY
```

**1.2** Are sandbox and production separate accounts with separate tokens, or is it one account with different base URLs?

```
Answer: One Envia Account(I'm assuming we are using Richardo account?)
        We would use different keys: One for Sandbox and one for Prod
        Environment	Base URL
        Production	https://api.envia.com
        Sandbox / Test	https://api-test.envia.com
```

**1.3** Is there an account dashboard where we can manage API keys, view usage, check balance, etc.? What's the URL?

```
Answer: Envia provides an account dashboard where you can - Generate/Mangage API Keys, View accounts balances, Manage carriers,
        View shipment history, download invocies, manage team members, configure webhooks, access sandbox credentials
        URL: https:app.envia.com
```

**1.4** Is there a free tier, trial period, or minimum commitment? What does it cost to get started?

```
Answer: No monthly subscription required to start, we have an account created already, no mandatory minimum monthly commitment,
        sandbox is free to use, Prod: Pay as you ship model! You fund your wallet balance in the dashboard, each real label deducts shipping cost from that balance. No platform fee to integrate the API
            You preload wallet (e.g., MXN amount)
            If balance = 0 → label creation fails.
```

---

## 2. Pricing & Billing

> We take a 9-10% platform fee on each order. Shipping costs are passed to the customer. We need to understand what Envia charges us so we can price correctly.

**2.1** What is the billing model — prepaid balance, post-paid invoice, or pay-per-label?

```
Answer: Review the above question: Pay-per-label
        No SaaS subscription cost.
        No long-term contract required.
        You can go live with minimal upfront cost.
        You only pay per shipment.
```

**2.2** Does Envia charge for rate quote requests (`/ship/rate/`), or only when we generate a label (`/ship/generate/`)?

```
Answer: Rate quote requests (/ship/rate/) are free
        You are charged only when you generate a real label (/ship/generate/) in production
        It's safe and free to
            Call quotes per manufacturer
            Recalculate quotes during checkout
            Retry quotes if needed
        Protect label creation:
            Add idempotency protection
            Prevent duplicate label calls
            Wrap in transaction
            Track wallet balance errors
            Because duplicate /ship/generate/ = duplicate charge.
```

**2.3** What discount tiers are available? Envia advertises "70%+ discounts" — discounts off what (carrier retail rates)? Is the discount automatic or do we need to negotiate?

```
Answer: Discount off carrier published retail / counter rates
            Basically means: compared to walking into DHL/Estafeta and shipping at retail price
            NOT 70% off negotiated enterprise contracts or bulk agreements
            related to public list price
            Discounts will be apply automatically it will automatically access Envia's aggregated negotiated rates
            NO neogtiates to get started or minimum volume required
```

**2.4** Are there any per-label surcharges from Envia on top of the carrier rate (platform fee, transaction fee, etc.)?

```
Answer: No separate platform fee per label (API access is free).
        You pay the rate shown in the quote — that’s what gets deducted from your wallet.
        Carrier surcharges may apply (fuel, remote area, oversized, etc.) — these come from the carrier, not Envia adding its own fee.
        Reprints / duplicates can cause duplicate charges if not handled idempotently
        Balance top-ups may have payment processor fees (depending on how you fund the wallet).
```

**2.5** What surcharges can appear on a shipment? List all possible (fuel, extended zone, oversize, residential, insurance, etc.) and whether they're included in the quote or added after.

```
Answer:
Fuel surcharge
    Usually included in the quoted rate
    Varies weekly by carrier
Extended / remote area (Zona extendida)
    Often included in quote if postal code recognized
    May be added after if destination misclassified
Residential delivery
    Typically included in quote
    Some carriers treat all MX deliveries as residential
Oversize / large package
    Triggered by dimensions (length, girth)
    Usually included if dimensions entered correctly
    Can be adjusted after audit
Volumetric weight adjustment
    Charged based on higher of actual vs volumetric
    Reflected in quote if dimensions accurate
    Adjusted after if misdeclared
Additional handling (irregular shape, fragile)
    Sometimes included
    Often added after carrier inspection
Insurance / declared value
    Optional
    Added to quote if declared value provided
Address correction
    Added after delivery attempt
Failed delivery / return to sender
    Added after event occurs
Re-delivery fee
    Added after failed attempt
Saturday / special delivery window
    Included in quote if service selected
COD (Cash on Delivery)
    Included in quote if selected

IMPORANT RULES
We are protected only if
    Weight & dimensions are accurate
    Correct postal code + colonia provided
    Declared value accurat
If not, carriers can post-bill adjustments, meaning:
    The final charged amount may differ from initial quote.

Checkout Request
│
├── Customer Info
│   ├── name
│   ├── email
│   └── phone (+52 validation)
│
├── Shipping Address (MX)
│   ├── street
│   ├── number
│   ├── district (colonia)
│   ├── city / municipio
│   ├── state (2–3 letter code)
│   └── postalCode (5 digits)
│
├── Cart
│   ├── manufacturerGroups[]
│   │   ├── manufacturerId
│   │   ├── items[]
│   │   │   ├── skuId
│   │   │   ├── quantity
│   │   │   ├── unitPriceMXN
│   │   │   ├── weightKg
│   │   │   ├── lengthCm
│   │   │   ├── widthCm
│   │   │   └── heightCm
│   │   │
│   │   ├── computed:
│   │   │   ├── totalWeightKg
│   │   │   ├── volumetricWeightKg
│   │   │   └── declaredValueMXN
│   │   │
│   │   └── selectedRate
│   │       ├── carrier
│   │       ├── serviceId
│   │       ├── rateId
│   │       └── priceMXN
│   │
│   └── cartTotals
│       ├── subtotalMXN
│       ├── shippingTotalMXN
│       └── grandTotalMXN
│
└── Payment Intent
    ├── stripePaymentIntentId
    └── clientConfirmation
```

---

## 3. Carriers & Coverage (Mexico Domestic)

> We only need Mexico domestic shipping for MVP. Our manufacturers ship auto parts from their warehouses to customers across Mexico.

**3.1** List every carrier available for Mexico domestic parcel shipping through Envia. For each carrier, note the service types offered (express, ground, economy, etc.).

Official Envia documentation doesn’t publicly list every service type per carrier — some require logging into your Envia dashboard to see the full service list and codes (e.g., Standard, Express, Priority, Same Day).

The Carrier list above comes from Envia’s “quote domestic shipments” carrier listing example for Mexico.

Where a carrier page exists on the public site, I linked the implied Envia carrier URL path (e.g., /carriers/<carrier>-MX).

Service Types are general expectations based on common MX parcel offerings — actual Envia service codes come from rate API responses.

| Carrier       | Service Types (typical / MX domestic)                           | Notes & Envia Reference URL                                                                                                |
| ------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| FedEx         | Express, Standard / Ground (depending on service offered in MX) | https://envia.com/en-US/carriers/fedex-MX (`/carriers/fedex-MX`) :contentReference[oaicite:2]{index=2}                     |
| DHL           | Express (primary domestic express service in MX)                | https://envia.com/en-US/carriers/dhl-MX (`/carriers/dhl-MX`) :contentReference[oaicite:3]{index=3}                         |
| UPS           | Ground, Express (typical parcel services)                       | https://envia.com/en-US/carriers/ups-MX (`/carriers/ups-MX`) :contentReference[oaicite:4]{index=4}                         |
| Estafeta      | Standard, Express / Priority (regional MX parcel)               | https://envia.com/en-US/carriers/estafeta-MX :contentReference[oaicite:5]{index=5}                                         |
| Paquetexpress | Standard, Express (MX parcel services)                          | https://envia.com/en-US/carriers/paquetexpress-MX (`/carriers/???`) :contentReference[oaicite:6]{index=6}                  |
| Sendex        | Standard, Express (MX domestic)                                 | https://envia.com/en-US/carriers/sendex-MX :contentReference[oaicite:7]{index=7}                                           |
| 99Minutos     | Express / Same-day / Priority (last-mile focused)               | https://envia.com/en-US/carriers/noventa9Minutos-MX (`/carriers/noventa9Minutos-MX`) :contentReference[oaicite:8]{index=8} |
| Dostavista    | Same-day / Local Delivery (last-mile, flexible time windows)    | https://envia.com/en-US/carriers/dostavista-MX (`/carriers/dostavista-MX`) :contentReference[oaicite:9]{index=9}           |
| AmPm          | Standard, Express (regional MX parcel)                          | https://envia.com/en-US/carriers/amPm-MX :contentReference[oaicite:10]{index=10}                                           |
| Castores      | Standard / Regional (parcel services in Mexico)                 | https://envia.com/en-CA/carriers/castores-MX :contentReference[oaicite:11]{index=11}                                       |
| Entrega       | Standard (local/regional shipping services)                     | https://envia.com/en-GB/carriers/entrega-MX :contentReference[oaicite:12]{index=12}                                        |
| Fletes México | Freight / Heavy parcel options (overweight/oversized shipments) | https://envia.com/en-IN/carriers/fletesMexico-MX :contentReference[oaicite:13]{index=13}                                   |

**3.2** Are all carriers available by default, or do some require a separate contract or activation?

```
Answer:
    Many carriers are available by default via Envia’s pooled/aggregated rates.
        Pre-negotiated by Envia
        Charged against your Envia wallet
    Some carriers require manual activation in the dashboard.
    Some carriers require you to add your own contract credentials (BYO account).
        The big internation integrators(FEDEX, DHL, UPS) - May need to input: Account Number & API Credentials
    Availability can depend on your country (MX) and account configuration.
    Sandbox may show fewer or simulated carriers.
    Use GET https://queries.envia.com/carrier?country_code=MX to check what is available
```

**3.3** Are there any geographic limitations? Areas in Mexico that certain carriers won't serve?

```
Answer: Not all carries cover 100% of Mexico
        Many rural CPs trigger extended area coverage.
        Carrier may:
            Add surcharge
            Increase delivery time
            Or reject the shipment entirely.
        Some CPs may be unsupported but those carrier won't appear in the /ship/rate list
         /ship/rate/ automatically filters carriers based on:
            Origin CP
            Destination CP
            Package specs
            Only valid carriers are returned.
```

**3.4** Do we need to specify which carrier to quote, or can we send one request and get rates from all available carriers at once?

```
Answer:
    You can send one /ship/rate/ request and get rates from multiple carriers in the response — that’s the default “multi-carrier quote” behavior. https://docs.envia.com/reference/quote-shipments

    **Default:** call /ship/rate/ once and show whatever carriers come back for that origin/destination/packages.
    **Optional filtering:** if you want to limit to specific carriers, you typically do that by including carrier selection in the request body (or by controlling enabled carriers in your account), but you don’t need to specify a carrier to get results.
```

---

## 4. Package Limits

> Auto parts range from small gaskets (0.1 kg) to heavy rotors/hubs (15+ kg) and potentially bulky items. We need to know what Envia and its carriers can handle.

**4.1** What are the maximum weight and dimension limits? Is this per-carrier or does Envia enforce its own limits?

```
Answer:
 Limits are per-carrier, not universal.
    Envia does not enforce one global max weight/dimension rule.
    Each carrier (DHL, Estafeta, FedEx, etc.) has its own limits.
    /ship/rate/ filters out carriers that can’t handle your package.
    Carriers may still audit and adjust after pickup.
```

**4.2** At what thresholds do oversize/overweight surcharges kick in? Are these reflected in the rate quote automatically?

```
Answer: This is not an Envia rule, but depends on the carrier themself.
        Triggers are usually:
            Weight above standard parcel limit
            Longest side above carrier max
            Girth formula exceeded
            If dimensions/weight are entered correctly, surcharges are usually reflected in the quote.
            If declared incorrectly, carriers can apply post-billing adjustments after pickup.
            IMPORANT
                If weight, dimensions are accurate, correct origin/destination CP provided then it will reflect in /ship/rate
                Again if package are decalred wrong this could cause an audit
```

**4.3** Does Envia support multi-package shipments (multiple boxes on one label/tracking number), or is it one label per package?

```
Answer: Yes, Envia supports multi-package shipments.
        It depends on the carrier whether you get:
        One master tracking number with multiple packages
        Or multiple tracking numbers (one per box)
        Behavior is carrier-dependent, not universal.
            How it works:
                Call /ship/rate/
                Call /ship/generate/
                    Send a JSON list of the object "packages" which will house the packages details in an array
                    https://hopp.sh/r/VtlnD2PBMbFn --> Multi-Package sandbox testing
        shipment (order-level)
        │
        └── shipment_packages[]
            ├── tracking_number
            ├── label_url
            ├── weight
            └── dims
```

---

## 5. Address Format (Mexico)

> Mexican addresses have specific fields (colonia, interior/exterior numbers) that differ from US addresses. We need the exact field mapping.

**5.1** Paste a complete sample request body for a Mexico-to-Mexico rate quote. Show every address field Envia accepts. Mark which are required vs optional.

```json
{
  // ─────────────────────────────────────────
  // ORIGIN ADDRESS
  // ─────────────────────────────────────────
  "origin": {
    "name":       "Tony Auto Warehouse",    // ✅ Required — contact name
    "company":    "Tony Auto MX",           // ⬜ Optional
    "email":      "shipping@tonyauto.mx",   // ✅ Required (strongly recommended)
    "phone":      "+525512345678",          // ✅ Required — include country code
    "street":     "Av. Insurgentes Sur",    // ✅ Required
    "number":     "1234",                   // ✅ Required — street number
    "district":   "Del Valle",              // ✅ Required — Colonia in MX
    "city":       "Benito Juárez",          // ✅ Required — Alcaldía/Municipio
    "state":      "CMX",                    // ✅ Required — 2–3 letter code (CMX not CM!)
    "country":    "MX",                     // ✅ Required — ISO 2-letter code
    "postalCode": "03100",                  // ✅ Required — 5 digits, no spaces
    "reference":  "Bodega principal",       // ⬜ Optional — delivery notes/landmark
    "additional": "Interior 2B"             // ⬜ Optional — suite/apartment/floor
  },

  // ─────────────────────────────────────────
  // DESTINATION ADDRESS
  // ─────────────────────────────────────────
  "destination": {
    "name":       "Ahusaka Sioux",          // ✅ Required
    "company":    "Fradkin Brothers",       // ⬜ Optional
    "email":      "ahusaka@example.com",    // ⬜ Optional (recommended)
    "phone":      "+5281109265",            // ✅ Required
    "street":     "San Bernabé",            // ✅ Required
    "number":     "456",                    // ✅ Required
    "district":   "Morelos",               // ✅ Required
    "city":       "Monterrey",              // ✅ Required
    "state":      "NL",                     // ✅ Required
    "country":    "MX",                     // ✅ Required
    "postalCode": "64180",                  // ✅ Required
    "reference":  "Casa, timbre rojo",      // ⬜ Optional
    "additional": "Puerta negra"            // ⬜ Optional
  },

  // ─────────────────────────────────────────
  // PACKAGES (array — supports multiple)
  // ─────────────────────────────────────────
  "packages": [
    {
      "type":         "box",               // ✅ Required — "box" | "envelope" | "pallet"
      "content":      "Auto brake pads",   // ✅ Required — description of contents
      "amount":       1,                   // ✅ Required — number of identical packages
      "declaredValue": 1000,               // ✅ Required — insured value
      "currency":     "MXN",              // ⬜ Optional — defaults to MXN for MX→MX
      "weight":       2,                   // ✅ Required
      "weightUnit":   "KG",               // ✅ Required — "KG" or "LB" (KG preferred)
      "lengthUnit":   "CM",               // ✅ Required — "CM" or "IN" (CM preferred)
      "dimensions": {
        "length":     30,                  // ✅ Required
        "width":      20,                  // ✅ Required
        "height":     10                   // ✅ Required
      }
    }
  ],

  // ─────────────────────────────────────────
  // SHIPMENT OPTIONS
  // ─────────────────────────────────────────
  "shipment": {
    "type":    1,           // ✅ Required — 1 = parcel, 2 = envelope, 3 = pallet
    "carrier": "dhl",       // ⚠️  Technically optional per docs, but API enforces it
                            //     Use: "dhl" | "fedex" | "estafeta" | "redpack" | "ups"
    "service": "express"    // ⬜ Optional — filters to a specific service level
  }
}

state for CDMX  Must be "CMX" — not "CM" or "DF"
postalCode  Always 5 digits, string type "03100" not 3100
phone Include country code: +52 prefix
carrier Required in practice even though docs say optional
Units  MX carriers strongly prefer KG + CM to avoid conversion errors
declaredValue   In MXN for domestic — affects insurance calculation
```

**5.2** How does Envia handle "colonia" (neighborhood)? What field name does it use — `district`, `neighborhood`, `suburb`, something else?

```
Answer: Envia uses: "district"
        | Mexico Concept     | Envia Field             |
| ------------------ | ----------------------- |
| Calle              | `street`                |
| Número             | `number`                |
| Colonia            | `district` ✅           | --> very important in MX (Required)
| Municipio / Ciudad | `city`                  |
| Estado             | `state`                 |
| Código Postal      | `postalCode`            |
| Referencias        | `reference`             |
| Interior / Suite   | `additional` (optional) |

    Many carriers require colonia for:
        Route validation
        Extended zone detection
        Accurate delivery routing

    Missing or incorrect district can cause:
        Address correction surcharge
        Delivery failure
        Post-billing adjustment
    Do not use:
        neighborhood
        suburb
        colonia
        Those are not recognized by Envia’s schema.
```

**5.3** How does Envia handle Mexican street numbers? In Mexico, addresses often have "Numero Exterior" and "Numero Interior" (e.g., "Av. Constituyentes 123 Int. 4"). Does Envia have separate fields for these?

```
Answer: Envia does not have separate dedicated fields named:
        numeroExterior
        numeroInterior
| Mexico Concept                       | Envia Field  |
| ------------------------------------ | ------------ |
| Calle                                | `street`     |
| Número Exterior                      | `number`     |
| Número Interior (Int., Dept., Suite) | `additional` |

        {
        "street": "Av. Constituyentes",
        "number": "123",
        "additional": "Int. 4"
        }
```

**5.4** What format does Envia expect for the Mexican state — full name ("Nuevo Leon"), abbreviation ("NL"), or ISO code ("MX-NLE")?

```
Answer: This is expected format for "state" 2-3 letter codes abbreviation ("NL")
        Queires API contains the country https://queries-test.envia.com/country
        https://queries-test.envia.com/carrier?country_code=MX to get all carries available for a given country_code
```

**5.5** Does Envia validate addresses? If we send a bad postal code or nonexistent city, does it error or just pass it through to the carrier?

```
Answer: There is a valide zip code endpoint -- https://queries-test.envia.com/zip-code/{postalCode}?country_code=MX
        We will have to make a separate call because it's not run with ship/rate/
        The ship/rate can pass bad data
 The postalCode 64000 belongs to Nuevo León, but state: "JA" is Jalisco. Those don't match.
{
  "origin": {
    "name": "Carlos Mendoza",
    "company": "Refacciones Test SA",
    "email": "test@refacciones.mx",
    "phone": "+525511223344",
    "street": "Av. Insurgentes Sur",
    "number": "1234",
    "district": "Del Valle",
    "city": "Benito Juárez",
    "state": "CMX",
    "country": "MX",
    "postalCode": "03100",
    "reference": "Bodega planta baja"
  },
  "destination": {
    "name": "María López",
    "company": "Muebles Fradkin",
    "email": "maria.lopez@example.mx",
    "phone": "+5218112345678",
    "street": "Av. Constitución",
  	"number": "200",
  	"district": "Centro",
  	"city": "Monterrey",
  	"state": "JA",              // WRONG (JA = Jalisco)
  	"country": "MX",
  	"postalCode": "64000",      // 64000 = Nuevo León
  	"reference": "Oficina piso 2"
  },

```

---

## 6. Rate Quotes (`/ship/rate/`)

> This is what we call at checkout to show the customer their shipping options.

**6.1** Paste a complete sample response from `/ship/rate/` for a Mexico domestic shipment. We need to see the exact JSON structure.

```json
// Paste full sample here
```

**6.2** Does the response include a quote ID or reference that we can use later when creating a label to lock in the quoted price?

```
Answer:
```

**6.3** How long is a quote valid? If a customer gets a quote at checkout and pays 10 minutes later, will the price change when we generate the label?

```
Answer:
```

**6.4** Does the response break down the price (base rate, fuel surcharge, insurance, VAT) or just return a total?

```
Answer:
```

**6.5** What does the response look like when no carriers can service the route (e.g., very remote area)? Paste the error/empty response.

```json
// Paste sample here
```

---

## 7. Label Generation (`/ship/generate/`)

> This is what we call when a manufacturer is ready to ship an order.

**7.1** Paste a complete sample response from `/ship/generate/`. We need to see: tracking number, label URL, shipment ID, and any other fields returned.

```json
// Paste full sample here
```

**7.2** What label formats are supported (PDF, PNG, ZPL, etc.)? What sizes (letter, 4x6 thermal, etc.)?

```
Answer:
```

**7.3** How long do label download URLs remain valid? Do they expire?

```
Answer:
```

**7.4** Is the charge deducted immediately on label generation, or on carrier pickup?

```
Answer:
```

---

## 8. Tracking (`/ship/generaltrack/`)

> We show tracking status to customers and use it to update order status in our DB.

**8.1** List every tracking status value that Envia returns. We need the complete set to build our status mapping.

| Envia Status Value | Meaning |
| ------------------ | ------- |
|                    |         |

**8.2** Paste a complete sample response from `/ship/generaltrack/` showing a shipment with multiple tracking events.

```json
// Paste full sample here
```

**8.3** Does Envia support **webhooks** for tracking updates (push), or do we have to poll `/ship/generaltrack/` ourselves?

```
Answer:
```

**8.4** If webhooks are supported: What's the payload format? Is there signature verification for security? How do we register a webhook URL?

```
Answer:
```

---

## 9. Cancellation (`/ship/cancel/`)

**9.1** What's the cancellation window — how long after label generation can we cancel?

```
Answer:
```

**9.2** Is the refund automatic and instant, or does it take time? Is there a cancellation fee?

```
Answer:
```

---

## 10. Error Handling

> We need to know what errors look like so we can map them to our `ShippingProviderError` codes.

**10.1** Paste sample error responses for each of these scenarios:

**Invalid/missing address:**

```json
// Paste sample here
```

**Authentication failure (bad token):**

```json
// Paste sample here
```

**Rate limit exceeded (if applicable):**

```json
// Paste sample here
```

**No carriers available for route:**

```json
// Paste sample here
```

**10.2** Are there documented rate limits (requests per second/minute)? What happens when you exceed them?

```
Answer:
```

**10.3** Are there documented timeout expectations? How long should we wait for a response from `/ship/rate/` and `/ship/generate/` before timing out?

```
Answer:
```

---

## 11. Sandbox Environment

**11.1** Does the sandbox (`api-test.envia.com`) return realistic Mexican carrier rates and services, or dummy/fixed data?

```
Answer:
```

**11.2** Can we generate test labels in sandbox without being charged?

```
Answer:
```

**11.3** Does sandbox tracking work (simulated tracking events), or does it only work with real shipments?

```
Answer:
```

---

## 12. Anything Else

**12.1** Is there an official SDK or client library (Node.js, Python, etc.)? Or is it raw HTTP only?

```
Answer:
```

**12.2** Is there a Postman collection or OpenAPI spec we can import?

```
Answer:
```

**12.3** Any known gotchas, undocumented behaviors, or things the docs don't cover that you discovered during research?

```
Answer:
```

---

**When done:** Hand this doc back to JamesonHearts — findings get merged into the Shipping API Spec, placeholder tables filled in, and Zod schemas finalized.
