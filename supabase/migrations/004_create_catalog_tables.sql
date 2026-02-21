-- Migration 004: Core catalog tables
--
-- Creates the product catalog foundation: vehicles, parts, fitments,
-- oe_crossrefs, and vehicle_aliases. These are the tables the import
-- pipeline will populate and the storefront will query.
--
-- Design decisions documented in: docs/plans/core-catalog-tables-migration.md

-- ============================================================================
-- vehicles — shared vehicle catalog (not manufacturer-scoped)
-- ============================================================================
CREATE TABLE vehicles (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  make        TEXT NOT NULL,
  model       TEXT NOT NULL,
  year_start  INTEGER NOT NULL,
  year_end    INTEGER NOT NULL,
  engine      TEXT,
  submodel    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (year_start <= year_end AND year_start >= 1900 AND year_end <= 2100)
);

-- NULL-safe unique: COALESCE prevents duplicate rows differing only in NULL engine/submodel
CREATE UNIQUE INDEX idx_vehicles_unique ON vehicles (
  make, model, year_start, year_end,
  COALESCE(engine, ''), COALESCE(submodel, '')
);

CREATE INDEX idx_vehicles_make ON vehicles (make);
CREATE INDEX idx_vehicles_make_model ON vehicles (make, model);

-- ============================================================================
-- parts — products, one row per manufacturer SKU
-- ============================================================================
CREATE TABLE parts (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  manufacturer_id      BIGINT NOT NULL REFERENCES manufacturers(id),
  sku                  TEXT NOT NULL,
  factory_part_number  TEXT,
  upc                  TEXT,
  brand                TEXT NOT NULL,
  name                 TEXT NOT NULL,
  description          TEXT,
  category             TEXT NOT NULL,
  part_type            TEXT NOT NULL,
  attributes           JSONB NOT NULL DEFAULT '{}'::jsonb,
  price                NUMERIC(10,2),
  currency             TEXT NOT NULL DEFAULT 'MXN'
                         CHECK (currency IN ('MXN', 'USD')),
  quantity             INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
  condition            TEXT NOT NULL DEFAULT 'new'
                         CHECK (condition IN ('new', 'remanufactured', 'used')),
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'active', 'paused', 'discontinued')),
  image_urls           TEXT[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (price IS NULL OR price >= 35),
  CHECK (quantity >= 0),
  CHECK (low_stock_threshold > 0),
  UNIQUE (manufacturer_id, sku)
);

-- FK index: Postgres doesn't auto-index FKs. Needed for JOINs, RLS, dashboard queries.
CREATE INDEX idx_parts_manufacturer ON parts (manufacturer_id);
CREATE INDEX idx_parts_category ON parts (category);
CREATE INDEX idx_parts_brand ON parts (brand);
CREATE INDEX idx_parts_status ON parts (status);
CREATE INDEX idx_parts_part_type ON parts (part_type);

-- GIN index for JSONB containment queries (@> operator).
-- Storefront filters should use: WHERE attributes @> '{"position":"DELANTERA"}'
-- The ->>'key' syntax does NOT use GIN indexes.
CREATE INDEX idx_parts_attributes ON parts USING GIN (attributes);

-- Reuse trigger function from migration 001
CREATE TRIGGER set_updated_at BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- fitments — parts <-> vehicles junction
-- ============================================================================
CREATE TABLE fitments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  part_id     BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  vehicle_id  BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (part_id, vehicle_id)
);

-- Reverse lookup: "find all parts for this vehicle"
-- The UNIQUE constraint's composite index already covers part_id lookups.
CREATE INDEX idx_fitments_vehicle ON fitments (vehicle_id);

-- ============================================================================
-- oe_crossrefs — OEM number search
-- ============================================================================
CREATE TABLE oe_crossrefs (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  part_id               BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  oe_number             TEXT NOT NULL,
  oe_number_normalized  TEXT NOT NULL,
  oe_brand              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (part_id, oe_number)
);

-- Primary search path: normalized OEM number lookup
CREATE INDEX idx_oe_normalized ON oe_crossrefs (oe_number_normalized);

-- ============================================================================
-- vehicle_aliases — search-time alias resolution
-- ============================================================================
CREATE TABLE vehicle_aliases (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alias           TEXT NOT NULL,
  canonical_name  TEXT NOT NULL,
  alias_type      TEXT NOT NULL CHECK (alias_type IN ('make', 'model')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique: prevents "chevy" and "CHEVY" as separate rows
CREATE UNIQUE INDEX idx_vehicle_aliases_alias ON vehicle_aliases (LOWER(alias));

-- ============================================================================
-- Enable RLS on all tables (defense-in-depth)
-- ============================================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE oe_crossrefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_aliases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
--
-- All writes go through the import pipeline using the admin client (service
-- role bypasses RLS). No INSERT/DELETE policies are defined intentionally —
-- same pattern as manufacturers in migration 002.
-- ============================================================================

-- vehicles: anyone can read (storefront search)
CREATE POLICY vehicles_select_public ON vehicles FOR SELECT
  USING (true);

-- parts: public sees active parts only
CREATE POLICY parts_select_active ON parts FOR SELECT
  USING (status = 'active');

-- parts: manufacturers see all their own parts (any status)
CREATE POLICY parts_select_own ON parts FOR SELECT
  USING (
    manufacturer_id IN (
      SELECT id FROM public.manufacturers
      WHERE user_id = (SELECT current_app_user_id())
    )
  );

-- parts: manufacturers update their own parts
CREATE POLICY parts_update_own ON parts FOR UPDATE
  USING (
    manufacturer_id IN (
      SELECT id FROM public.manufacturers
      WHERE user_id = (SELECT current_app_user_id())
    )
  );

-- parts: admins have full access
CREATE POLICY parts_admin_all ON parts FOR ALL
  USING ((SELECT is_admin()));

-- fitments: anyone can read (storefront needs part-vehicle relationships)
CREATE POLICY fitments_select_public ON fitments FOR SELECT
  USING (true);

-- oe_crossrefs: anyone can read (OEM number search)
CREATE POLICY oe_crossrefs_select_public ON oe_crossrefs FOR SELECT
  USING (true);

-- vehicle_aliases: anyone can read (search-time resolution)
CREATE POLICY vehicle_aliases_select_public ON vehicle_aliases FOR SELECT
  USING (true);

-- ============================================================================
-- Seed: vehicle_aliases (15 common aliases)
-- ON CONFLICT DO NOTHING for idempotency if migration replays
-- ============================================================================
INSERT INTO vehicle_aliases (alias, canonical_name, alias_type) VALUES
  ('chevy',    'CHEVROLET',     'make'),
  ('beemer',   'BMW',           'make'),
  ('bimmer',   'BMW',           'make'),
  ('caddy',    'CADILLAC',      'make'),
  ('ram',      'DODGE-RAM',     'make'),
  ('dodge',    'DODGE-RAM',     'make'),
  ('vw',       'VOLKSWAGEN',    'make'),
  ('merc',     'MERCEDES-BENZ', 'make'),
  ('benz',     'MERCEDES-BENZ', 'make'),
  ('mercedes', 'MERCEDES-BENZ', 'make'),
  ('stang',    'MUSTANG',       'model'),
  ('vette',    'CORVETTE',      'model'),
  ('slade',    'ESCALADE',      'model'),
  ('cammy',    'CAMRY',         'model'),
  ('monte',    'MONTE CARLO',   'model')
ON CONFLICT DO NOTHING;
