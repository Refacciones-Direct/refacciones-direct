# Plan: Core Catalog Tables Migration

## Context

The Data Architecture Spec v5.0 defines the database schema for RefaccionesDirect. We have 3 migrations (users, manufacturers, RLS, storage) but **no catalog tables**. This migration creates the core product catalog schema — the foundation for the import pipeline.

Key architectural decisions informed by ACR-Automotive analysis:

- **Normalized vehicles table** (ACR denormalizes vehicle data per fitment row — we fix this)
- **Multi-make splitting at import** ("CHEVROLET, GMC" → 2 fitment rows — ACR stores literal strings, breaking exact search)
- **Server-side normalization** (ACR has no make/model normalization — case-sensitive matching)
- **Vehicle aliases included now** (ACR manages via Excel sheet; we seed and manage server-side)
- **JSONB attributes** for category flexibility (ACR has hardcoded columns per category)

## Scope

**Create:** `vehicles`, `parts`, `fitments`, `oe_crossrefs`, `vehicle_aliases` (5 tables)
**Out of scope:** import_jobs, import_errors, orders (later migrations)

## Migration: `004_create_catalog_tables.sql`

### vehicles — shared vehicle catalog

```
id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
make        TEXT NOT NULL
model       TEXT NOT NULL
year_start  INTEGER NOT NULL
year_end    INTEGER NOT NULL
engine      TEXT                    -- nullable (not all fitments specify engine)
submodel    TEXT                    -- nullable
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

CHECK (year_start <= year_end AND year_start >= 1900 AND year_end <= 2100)
```

**Unique index** (NULL-safe — Postgres treats NULL != NULL in UNIQUE constraints):

```sql
CREATE UNIQUE INDEX idx_vehicles_unique ON vehicles (
  make, model, year_start, year_end,
  COALESCE(engine, ''), COALESCE(submodel, '')
);
```

**Indexes:** `(make)`, `(make, model)`

### parts — products, one row per manufacturer SKU

```
id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
manufacturer_id      BIGINT NOT NULL REFERENCES manufacturers(id)
sku                  TEXT NOT NULL
factory_part_number  TEXT
upc                  TEXT
brand                TEXT NOT NULL
name                 TEXT NOT NULL
description          TEXT
category             TEXT NOT NULL
part_type            TEXT NOT NULL
attributes           JSONB NOT NULL DEFAULT '{}'::jsonb
price                NUMERIC(10,2)          -- nullable for drafts
currency             TEXT NOT NULL DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD'))
quantity             INTEGER NOT NULL DEFAULT 0
low_stock_threshold  INTEGER NOT NULL DEFAULT 5
condition            TEXT NOT NULL DEFAULT 'new'
                       CHECK (condition IN ('new', 'remanufactured', 'used'))
status               TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'active', 'paused', 'discontinued'))
image_urls           TEXT[] NOT NULL DEFAULT '{}'
created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()

CHECK (price IS NULL OR price >= 35)       -- min $35 MXN when set
CHECK (quantity >= 0)
CHECK (low_stock_threshold > 0)
UNIQUE (manufacturer_id, sku)              -- auto-creates composite index
```

**Indexes:**

- `idx_parts_manufacturer` on `(manufacturer_id)` — FK index for JOINs, RLS, dashboard queries
- `idx_parts_category` on `(category)`
- `idx_parts_brand` on `(brand)`
- `idx_parts_status` on `(status)`
- `idx_parts_part_type` on `(part_type)`
- `idx_parts_attributes` GIN on `(attributes)` — supports `@>` containment queries
- No standalone `(sku)` index — composite unique index covers manufacturer-scoped lookups. Add later if cross-manufacturer SKU search is needed.

**Trigger:** `set_updated_at BEFORE UPDATE` reusing `update_updated_at()` from migration 001

**Note on JSONB queries:** Storefront filters should use `@>` containment syntax (`WHERE attributes @> '{"position":"DELANTERA"}'`) to leverage the GIN index. The `->>'key'` syntax does NOT use GIN indexes.

### fitments — parts ↔ vehicles junction

```
id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
part_id     BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE
vehicle_id  BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT  -- explicit: vehicles are shared
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

UNIQUE (part_id, vehicle_id)    -- auto-creates composite index (part_id is leading column)
```

**Indexes:**

- `idx_fitments_vehicle` on `(vehicle_id)` — reverse lookup: "find all parts for this vehicle"
- No separate `(part_id)` index — the UNIQUE constraint's composite index already covers part_id lookups

### oe_crossrefs — OEM number search

```
id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
part_id               BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE
oe_number             TEXT NOT NULL           -- original as entered
oe_number_normalized  TEXT NOT NULL           -- uppercase, stripped of spaces/hyphens/dots
oe_brand              TEXT                    -- nullable: NULL means brand not specified in source data
created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()

UNIQUE (part_id, oe_number)     -- auto-creates composite index
```

**Indexes:**

- `idx_oe_normalized` on `(oe_number_normalized)` — primary search path

### vehicle_aliases — search-time alias resolution

```
id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
alias           TEXT NOT NULL               -- stored lowercase
canonical_name  TEXT NOT NULL               -- stored uppercase
alias_type      TEXT NOT NULL CHECK (alias_type IN ('make', 'model'))
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**Unique index** (case-insensitive — replaces plain UNIQUE constraint):

```sql
CREATE UNIQUE INDEX idx_vehicle_aliases_alias ON vehicle_aliases (LOWER(alias));
```

**Seed data** (15 aliases, inserted with `ON CONFLICT DO NOTHING` for idempotency):

| alias    | canonical_name | alias_type |
| -------- | -------------- | ---------- |
| chevy    | CHEVROLET      | make       |
| beemer   | BMW            | make       |
| bimmer   | BMW            | make       |
| caddy    | CADILLAC       | make       |
| ram      | DODGE-RAM      | make       |
| dodge    | DODGE-RAM      | make       |
| vw       | VOLKSWAGEN     | make       |
| merc     | MERCEDES-BENZ  | make       |
| benz     | MERCEDES-BENZ  | make       |
| mercedes | MERCEDES-BENZ  | make       |
| stang    | MUSTANG        | model      |
| vette    | CORVETTE       | model      |
| slade    | ESCALADE       | model      |
| cammy    | CAMRY          | model      |
| monte    | MONTE CARLO    | model      |

### RLS Policies

All 5 tables get `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

| Table           | Policy                          | Rule                                                                                        |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| vehicles        | `vehicles_select_public`        | Anyone reads (storefront search)                                                            |
| parts           | `parts_select_active`           | Public sees `status = 'active'` only                                                        |
| parts           | `parts_select_own`              | Manufacturers see all their own parts (uses `current_app_user_id()` → manufacturers lookup) |
| parts           | `parts_update_own`              | Manufacturers update their own parts                                                        |
| parts           | `parts_admin_all`               | Admins: full access (uses `is_admin()`)                                                     |
| fitments        | `fitments_select_public`        | Anyone reads                                                                                |
| oe_crossrefs    | `oe_crossrefs_select_public`    | Anyone reads                                                                                |
| vehicle_aliases | `vehicle_aliases_select_public` | Anyone reads (search)                                                                       |

**No INSERT/DELETE policies** on any table for anon/authenticated roles. All writes go through the import pipeline using the admin client (service role bypasses RLS). This is consistent with the existing pattern in migration 002 where `manufacturers` has no INSERT policy. A SQL comment in the migration will document this intentional omission.

### Key Decisions vs Spec v5.0

| Change                                              | Why                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| BIGINT IDENTITY PKs (not UUID)                      | Project standard; Amazon/ML/Shopify use numeric IDs; better B-tree perf |
| TEXT (not VARCHAR)                                  | Project standard; same Postgres perf                                    |
| `price` nullable                                    | Supports draft imports (Amazon/ML allow partial listings)               |
| `status` default `'draft'` (not `'active'`)         | Parts without price/stock/images start as draft                         |
| `condition: 'remanufactured'` (not `'refurbished'`) | Auto parts industry standard term                                       |
| `is_active` omitted                                 | Redundant with `status` — avoids consistency risk                       |
| `vehicle_aliases` table added                       | ACR pattern — resolves colloquial terms during search                   |
| `ON DELETE RESTRICT` on fitments.vehicle_id         | Explicit: vehicles are shared, never casually deleted                   |
| Case-insensitive unique on aliases                  | ACR uses case-sensitive UNIQUE — we fix this                            |
| FK index on parts.manufacturer_id                   | Best practice: Postgres doesn't auto-index FKs                          |

### Design Notes for Future Pipeline Work

- **Multi-make splitting**: "CHEVROLET, GMC" → 2 separate fitment rows (pipeline splits on comma)
- **OEM delimiter**: semicolons (OEM numbers can contain internal spaces)
- **Make/model normalization**: server-side canonical forms during import
- **Alias management**: server-side only, not in manufacturer templates
- **Partial index optimization**: `WHERE status = 'active' AND quantity > 0` on `(category, brand)` — add when query profiling shows need

## Files

| File                                                | Action                                                     |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `supabase/migrations/004_create_catalog_tables.sql` | **Create**                                                 |
| `src/types/database.ts`                             | **Regenerate** via `npx.cmd supabase gen types typescript` |

## Verification

1. `npx.cmd supabase db reset` — migrations replay cleanly
2. `npx.cmd supabase gen types typescript` — regenerate types
3. Manual SQL checks in Supabase Studio:
   - INSERT draft part (null price) → succeeds
   - INSERT part with price < 35 → fails (CHECK)
   - INSERT duplicate (manufacturer_id, sku) → fails (UNIQUE)
   - INSERT duplicate vehicle with NULL engine → fails (COALESCE unique index)
   - INSERT alias "CHEVY" when "chevy" exists → fails (case-insensitive unique)
   - SELECT vehicle_aliases → 15 seeded rows
   - RLS: anon sees active parts but not drafts
4. `npm.cmd run typecheck` — compiles with new types
5. `npm.cmd run build` — full build passes

## Land the Plane

- [ ] Code review via `superpowers:requesting-code-review`
- [ ] Run quality gates (typecheck, build, test)
- [ ] Close beads issues
- [ ] Commit, push, open PR, monitor CI until merged
