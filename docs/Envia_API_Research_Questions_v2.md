# Envia API Research Questions (v2)

**Purpose:** Remaining questions from the original research that can be answered via Envia docs, dashboard, or support — without writing code or making sandbox calls. Answers will be folded into the Shipping API Spec v1.0 to close out remaining placeholders.

**Context:** v1 of these questions was partially answered (Sections 1-5). Response shapes, error formats, and tracking statuses were moved to "discover during development" in the spec since they require sandbox testing. The questions below are simple lookups.

---

## 1. Quote Behavior

**1.1** Does the `/ship/rate/` response include a quote ID or reference that locks in the quoted price for later label generation? Or is it purely informational (you re-quote at label time)?

```
Answer:
```

**1.2** How long is a rate quote valid? If a customer gets a quote and pays 10 minutes later, will the price change when we call `/ship/generate/`?

```
Answer:
```

**1.3** Does the rate response break down the price (base rate + fuel surcharge + insurance + VAT), or does it just return a single total?

```
Answer:
```

---

## 2. Label Generation

**2.1** What label formats does Envia support? (PDF, PNG, ZPL, etc.) What sizes? (letter, 4x6 thermal, etc.)

```
Answer:
```

**2.2** Do label download URLs expire? If so, after how long?

```
Answer:
```

**2.3** Is the wallet charge deducted immediately when `/ship/generate/` is called, or when the carrier picks up the package?

```
Answer:
```

---

## 3. Webhooks

**3.1** Does Envia support webhooks for tracking status updates (push notifications), or do we have to poll `/ship/generaltrack/`?

```
Answer:
```

**3.2** If webhooks are supported: where do we register the webhook URL — in the dashboard or via API? Is there signature verification on the payload?

```
Answer:
```

---

## 4. Cancellation

**4.1** What's the cancellation window — how long after label generation can we cancel via `/ship/cancel/`?

```
Answer:
```

**4.2** Is the wallet refund automatic and instant, or does it take time? Is there a cancellation fee?

```
Answer:
```

---

## 5. Rate Limits & Timeouts

**5.1** Are there documented rate limits for the API (requests per second/minute)? What's the HTTP response when limits are exceeded?

```
Answer:
```

**5.2** Are there documented timeout expectations? What's the typical response time for `/ship/rate/` and `/ship/generate/`?

```
Answer:
```

---

## 6. SDK & Tooling

**6.1** Is there an official SDK or client library (Node.js, Python, etc.)? Or is it raw HTTP only?

```
Answer:
```

**6.2** Is there a Postman collection or OpenAPI/Swagger spec we can import?

```
Answer:
```

---

**When done:** Merge answers into `RefaccionesDirect_ShippingAPISpec_v1_0.md` — update the relevant "DISCOVER DURING DEVELOPMENT" placeholders with confirmed values.
