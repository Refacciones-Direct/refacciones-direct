-- Migration 007: Search functions with pg_trgm fuzzy matching and tsvector
--
-- Creates search infrastructure for the storefront: pg_trgm extension,
-- generated tsvector column, GIN indexes (partial where possible),
-- and 4 RPC functions for text search, vehicle search, combined search,
-- and vehicle dropdown options.
--
-- Postgres best practices applied:
--   - tsvector with 'spanish' config instead of ILIKE (100x faster, ranking support)
--   - Partial GIN indexes (WHERE status = 'active') — smaller, faster
--   - STABLE + SET search_path = '' on all functions
--   - SECURITY INVOKER (default) — RLS applies, anon key sees only active parts
--   - Defense-in-depth: explicit status = 'active' even though RLS handles it
--
-- Design doc: ~/.claude/plans/shiny-snuggling-pebble.md

-- ============================================================================
-- STEP 1: Enable pg_trgm extension for fuzzy matching
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- STEP 2: Add generated tsvector column for full-text search
-- ============================================================================
-- Uses 'spanish' config: strips stop words (para, de, el, con, etc.)
-- Generated STORED: auto-maintained on INSERT/UPDATE, no triggers needed
ALTER TABLE parts ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish',
      COALESCE(name, '') || ' ' ||
      COALESCE(brand, '') || ' ' ||
      COALESCE(description, '') || ' ' ||
      COALESCE(category, '') || ' ' ||
      COALESCE(part_type, '')
    )
  ) STORED;

-- ============================================================================
-- STEP 3: GIN indexes
-- ============================================================================

-- Full-text search on tsvector — partial, only active parts
CREATE INDEX idx_parts_search_vector ON parts USING GIN (search_vector)
  WHERE status = 'active';

-- Trigram fuzzy indexes on parts — partial for active-only public queries
CREATE INDEX idx_parts_sku_trgm ON parts USING GIN (sku gin_trgm_ops)
  WHERE status = 'active';
CREATE INDEX idx_parts_name_trgm ON parts USING GIN (name gin_trgm_ops)
  WHERE status = 'active';
CREATE INDEX idx_parts_brand_trgm ON parts USING GIN (brand gin_trgm_ops)
  WHERE status = 'active';

-- Trigram fuzzy indexes on OE crossrefs and vehicles — not partial (shared tables)
CREATE INDEX idx_oe_normalized_trgm
  ON oe_crossrefs USING GIN (oe_number_normalized gin_trgm_ops);
CREATE INDEX idx_vehicles_make_trgm ON vehicles USING GIN (make gin_trgm_ops);
CREATE INDEX idx_vehicles_model_trgm ON vehicles USING GIN (model gin_trgm_ops);


-- ============================================================================
-- STEP 4: search_parts_by_text — multi-tier text search with early exit
-- ============================================================================
-- Tiers: exact SKU → exact OE → fuzzy SKU → fuzzy OE → full-text keyword
-- Mirrors ACR's search_by_sku pattern, expanded for marketplace context.
CREATE OR REPLACE FUNCTION search_parts_by_text(
  search_term   TEXT,
  p_limit       INTEGER DEFAULT 24,
  p_offset      INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                   BIGINT,
  manufacturer_id      BIGINT,
  sku                  TEXT,
  brand                TEXT,
  name                 TEXT,
  description          TEXT,
  category             TEXT,
  part_type            TEXT,
  price                NUMERIC(10,2),
  currency             TEXT,
  quantity             INTEGER,
  condition            TEXT,
  image_urls           TEXT[],
  attributes           JSONB,
  match_type           TEXT,
  similarity_score     REAL,
  total_count          BIGINT
) AS $$
DECLARE
  normalized_term TEXT;
  oe_normalized   TEXT;
  result_count    BIGINT;
  ts_query        tsquery;
BEGIN
  normalized_term := TRIM(search_term);
  IF normalized_term = '' OR normalized_term IS NULL THEN
    RETURN;
  END IF;

  -- OE normalization: strip spaces, hyphens, dots
  -- MIRROR: Must match normalizeOeNumber() in src/lib/normalize.ts — keep both in sync
  oe_normalized := UPPER(REGEXP_REPLACE(normalized_term, '[\s\-\.]', '', 'g'));

  -- ========================================
  -- Tier 1: Exact SKU match (case-insensitive)
  -- ========================================
  SELECT COUNT(*) INTO result_count
  FROM public.parts p
  WHERE UPPER(p.sku) = UPPER(normalized_term)
    AND p.status = 'active';

  IF result_count > 0 THEN
    RETURN QUERY
    SELECT p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
           p.category, p.part_type, p.price, p.currency, p.quantity,
           p.condition, p.image_urls, p.attributes,
           'exact_sku'::TEXT AS match_type,
           1.0::REAL AS similarity_score,
           result_count AS total_count
    FROM public.parts p
    WHERE UPPER(p.sku) = UPPER(normalized_term)
      AND p.status = 'active'
    ORDER BY p.name
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  -- ========================================
  -- Tier 2: Exact OE number match (normalized)
  -- ========================================
  SELECT COUNT(DISTINCT p.id) INTO result_count
  FROM public.parts p
  JOIN public.oe_crossrefs oe ON p.id = oe.part_id
  WHERE oe.oe_number_normalized = oe_normalized
    AND p.status = 'active';

  IF result_count > 0 THEN
    RETURN QUERY
    SELECT sub.* FROM (
      SELECT DISTINCT ON (p.id)
             p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
             p.category, p.part_type, p.price, p.currency, p.quantity,
             p.condition, p.image_urls, p.attributes,
             'exact_oe'::TEXT,
             1.0::REAL,
             result_count
      FROM public.parts p
      JOIN public.oe_crossrefs oe ON p.id = oe.part_id
      WHERE oe.oe_number_normalized = oe_normalized
        AND p.status = 'active'
      ORDER BY p.id
    ) sub
    ORDER BY sub.name
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  -- ========================================
  -- Tier 3: Fuzzy SKU match (pg_trgm, similarity > 0.4)
  -- ========================================
  SELECT COUNT(*) INTO result_count
  FROM public.parts p
  WHERE similarity(p.sku, normalized_term) > 0.4
    AND p.status = 'active';

  IF result_count > 0 THEN
    RETURN QUERY
    SELECT p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
           p.category, p.part_type, p.price, p.currency, p.quantity,
           p.condition, p.image_urls, p.attributes,
           'fuzzy_sku'::TEXT,
           similarity(p.sku, normalized_term)::REAL,
           result_count
    FROM public.parts p
    WHERE similarity(p.sku, normalized_term) > 0.4
      AND p.status = 'active'
    ORDER BY similarity(p.sku, normalized_term) DESC, p.name
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  -- ========================================
  -- Tier 4: Fuzzy OE number match (pg_trgm, similarity > 0.4)
  -- ========================================
  SELECT COUNT(DISTINCT p.id) INTO result_count
  FROM public.parts p
  JOIN public.oe_crossrefs oe ON p.id = oe.part_id
  WHERE similarity(oe.oe_number_normalized, oe_normalized) > 0.4
    AND p.status = 'active';

  IF result_count > 0 THEN
    RETURN QUERY
    SELECT p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
           p.category, p.part_type, p.price, p.currency, p.quantity,
           p.condition, p.image_urls, p.attributes,
           'fuzzy_oe'::TEXT,
           MAX(similarity(oe.oe_number_normalized, oe_normalized))::REAL,
           result_count
    FROM public.parts p
    JOIN public.oe_crossrefs oe ON p.id = oe.part_id
    WHERE similarity(oe.oe_number_normalized, oe_normalized) > 0.4
      AND p.status = 'active'
    GROUP BY p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
             p.category, p.part_type, p.price, p.currency, p.quantity,
             p.condition, p.image_urls, p.attributes
    ORDER BY MAX(similarity(oe.oe_number_normalized, oe_normalized)) DESC, p.name
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  -- ========================================
  -- Tier 5: Full-text keyword match (tsvector + ts_rank)
  -- Uses 'spanish' config — strips stop words like "para", "de", "el"
  -- ========================================
  BEGIN
    ts_query := websearch_to_tsquery('spanish', normalized_term);
  EXCEPTION WHEN OTHERS THEN
    ts_query := plainto_tsquery('spanish', normalized_term);
  END;

  SELECT COUNT(*) INTO result_count
  FROM public.parts p
  WHERE p.search_vector @@ ts_query
    AND p.status = 'active';

  IF result_count > 0 THEN
    RETURN QUERY
    SELECT p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
           p.category, p.part_type, p.price, p.currency, p.quantity,
           p.condition, p.image_urls, p.attributes,
           'keyword'::TEXT,
           ts_rank(p.search_vector, ts_query)::REAL,
           result_count
    FROM public.parts p
    WHERE p.search_vector @@ ts_query
      AND p.status = 'active'
    ORDER BY ts_rank(p.search_vector, ts_query) DESC, p.name
    LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  -- ========================================
  -- Tier 6: Fallback — trigram on name/brand (catches partial matches)
  -- ========================================
  SELECT COUNT(*) INTO result_count
  FROM public.parts p
  WHERE (similarity(p.name, normalized_term) > 0.25
     OR similarity(p.brand, normalized_term) > 0.25)
    AND p.status = 'active';

  RETURN QUERY
  SELECT p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
         p.category, p.part_type, p.price, p.currency, p.quantity,
         p.condition, p.image_urls, p.attributes,
         'fuzzy_keyword'::TEXT,
         GREATEST(
           similarity(p.name, normalized_term),
           similarity(p.brand, normalized_term)
         )::REAL,
         result_count
  FROM public.parts p
  WHERE (similarity(p.name, normalized_term) > 0.25
     OR similarity(p.brand, normalized_term) > 0.25)
    AND p.status = 'active'
  ORDER BY GREATEST(
    similarity(p.name, normalized_term),
    similarity(p.brand, normalized_term)
  ) DESC, p.name
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE
   SET search_path = '';

COMMENT ON FUNCTION search_parts_by_text IS
  'Multi-tier text search: exact SKU -> exact OE -> fuzzy SKU -> fuzzy OE -> full-text keyword -> fuzzy name/brand. Returns parts with match metadata and total_count for pagination.';


-- ============================================================================
-- STEP 5: search_parts_by_vehicle — vehicle fitment search
-- ============================================================================
CREATE OR REPLACE FUNCTION search_parts_by_vehicle(
  p_make    TEXT,
  p_model   TEXT,
  p_year    INTEGER,
  p_limit   INTEGER DEFAULT 24,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                   BIGINT,
  manufacturer_id      BIGINT,
  sku                  TEXT,
  brand                TEXT,
  name                 TEXT,
  description          TEXT,
  category             TEXT,
  part_type            TEXT,
  price                NUMERIC(10,2),
  currency             TEXT,
  quantity             INTEGER,
  condition            TEXT,
  image_urls           TEXT[],
  attributes           JSONB,
  match_type           TEXT,
  similarity_score     REAL,
  total_count          BIGINT
) AS $$
DECLARE
  resolved_make  TEXT;
  resolved_model TEXT;
  result_count   BIGINT;
BEGIN
  -- Resolve make alias (e.g., "chevy" -> "CHEVROLET")
  SELECT va.canonical_name INTO resolved_make
  FROM public.vehicle_aliases va
  WHERE LOWER(va.alias) = LOWER(TRIM(p_make))
    AND va.alias_type = 'make'
  LIMIT 1;

  IF resolved_make IS NULL THEN
    resolved_make := UPPER(TRIM(p_make));
  END IF;

  -- Resolve model alias (e.g., "stang" -> "MUSTANG")
  SELECT va.canonical_name INTO resolved_model
  FROM public.vehicle_aliases va
  WHERE LOWER(va.alias) = LOWER(TRIM(p_model))
    AND va.alias_type = 'model'
  LIMIT 1;

  IF resolved_model IS NULL THEN
    resolved_model := UPPER(TRIM(p_model));
  END IF;

  -- Count total matching parts for pagination
  SELECT COUNT(DISTINCT p.id) INTO result_count
  FROM public.parts p
  JOIN public.fitments f ON p.id = f.part_id
  JOIN public.vehicles v ON f.vehicle_id = v.id
  WHERE UPPER(v.make) = resolved_make
    AND UPPER(v.model) = resolved_model
    AND p_year BETWEEN v.year_start AND v.year_end
    AND p.status = 'active';

  RETURN QUERY
  SELECT sub.* FROM (
    SELECT DISTINCT ON (p.id)
           p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
           p.category, p.part_type, p.price, p.currency, p.quantity,
           p.condition, p.image_urls, p.attributes,
           'vehicle_fitment'::TEXT AS match_type,
           1.0::REAL AS similarity_score,
           result_count AS total_count
    FROM public.parts p
    JOIN public.fitments f ON p.id = f.part_id
    JOIN public.vehicles v ON f.vehicle_id = v.id
    WHERE UPPER(v.make) = resolved_make
      AND UPPER(v.model) = resolved_model
      AND p_year BETWEEN v.year_start AND v.year_end
      AND p.status = 'active'
    ORDER BY p.id
  ) sub
  ORDER BY sub.name
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE
   SET search_path = '';

COMMENT ON FUNCTION search_parts_by_vehicle IS
  'Find parts compatible with a vehicle via fitments junction. Resolves make/model aliases. Returns parts with total_count for pagination.';


-- ============================================================================
-- STEP 6: search_parts_combined — text search within vehicle context
-- ============================================================================
CREATE OR REPLACE FUNCTION search_parts_combined(
  search_term  TEXT,
  p_make       TEXT,
  p_model      TEXT,
  p_year       INTEGER,
  p_limit      INTEGER DEFAULT 24,
  p_offset     INTEGER DEFAULT 0
)
RETURNS TABLE (
  id                   BIGINT,
  manufacturer_id      BIGINT,
  sku                  TEXT,
  brand                TEXT,
  name                 TEXT,
  description          TEXT,
  category             TEXT,
  part_type            TEXT,
  price                NUMERIC(10,2),
  currency             TEXT,
  quantity             INTEGER,
  condition            TEXT,
  image_urls           TEXT[],
  attributes           JSONB,
  match_type           TEXT,
  similarity_score     REAL,
  total_count          BIGINT
) AS $$
DECLARE
  resolved_make   TEXT;
  resolved_model  TEXT;
  normalized_term TEXT;
  oe_normalized   TEXT;
  ts_query        tsquery;
  result_count    BIGINT;
BEGIN
  normalized_term := TRIM(search_term);
  IF normalized_term = '' THEN normalized_term := NULL; END IF;

  -- If no text, delegate to vehicle-only search
  IF normalized_term IS NULL THEN
    RETURN QUERY
    SELECT * FROM public.search_parts_by_vehicle(p_make, p_model, p_year, p_limit, p_offset);
    RETURN;
  END IF;

  -- If no vehicle, delegate to text-only search
  IF p_make IS NULL OR TRIM(p_make) = '' THEN
    RETURN QUERY
    SELECT * FROM public.search_parts_by_text(search_term, p_limit, p_offset);
    RETURN;
  END IF;

  -- Both text and vehicle provided: combined search
  -- Resolve vehicle aliases
  SELECT va.canonical_name INTO resolved_make
  FROM public.vehicle_aliases va
  WHERE LOWER(va.alias) = LOWER(TRIM(p_make)) AND va.alias_type = 'make'
  LIMIT 1;
  IF resolved_make IS NULL THEN resolved_make := UPPER(TRIM(p_make)); END IF;

  SELECT va.canonical_name INTO resolved_model
  FROM public.vehicle_aliases va
  WHERE LOWER(va.alias) = LOWER(TRIM(p_model)) AND va.alias_type = 'model'
  LIMIT 1;
  IF resolved_model IS NULL THEN resolved_model := UPPER(TRIM(p_model)); END IF;

  -- Prepare text search
  -- OE normalization — MIRROR: Must match normalizeOeNumber() in src/lib/normalize.ts
  oe_normalized := UPPER(REGEXP_REPLACE(normalized_term, '[\s\-\.]', '', 'g'));
  BEGIN
    ts_query := websearch_to_tsquery('spanish', normalized_term);
  EXCEPTION WHEN OTHERS THEN
    ts_query := plainto_tsquery('spanish', normalized_term);
  END;

  -- Count matching parts (vehicle + text combined)
  SELECT COUNT(DISTINCT p.id) INTO result_count
  FROM public.parts p
  JOIN public.fitments f ON p.id = f.part_id
  JOIN public.vehicles v ON f.vehicle_id = v.id
  LEFT JOIN public.oe_crossrefs oe ON p.id = oe.part_id
  WHERE UPPER(v.make) = resolved_make
    AND UPPER(v.model) = resolved_model
    AND p_year BETWEEN v.year_start AND v.year_end
    AND p.status = 'active'
    AND (
      UPPER(p.sku) = UPPER(normalized_term)
      OR oe.oe_number_normalized = oe_normalized
      OR p.search_vector @@ ts_query
      OR similarity(p.sku, normalized_term) > 0.4
      OR similarity(p.name, normalized_term) > 0.25
      OR similarity(p.brand, normalized_term) > 0.25
    );

  RETURN QUERY
  SELECT sub.* FROM (
    SELECT DISTINCT ON (p.id)
           p.id, p.manufacturer_id, p.sku, p.brand, p.name, p.description,
           p.category, p.part_type, p.price, p.currency, p.quantity,
           p.condition, p.image_urls, p.attributes,
           'combined'::TEXT AS match_type,
           GREATEST(
             CASE WHEN UPPER(p.sku) = UPPER(normalized_term) THEN 1.0 ELSE 0.0 END,
             CASE WHEN oe.oe_number_normalized = oe_normalized THEN 1.0 ELSE 0.0 END,
             ts_rank(p.search_vector, ts_query),
             similarity(p.sku, normalized_term),
             similarity(p.name, normalized_term),
             similarity(p.brand, normalized_term)
           )::REAL AS similarity_score,
           result_count AS total_count
    FROM public.parts p
    JOIN public.fitments f ON p.id = f.part_id
    JOIN public.vehicles v ON f.vehicle_id = v.id
    LEFT JOIN public.oe_crossrefs oe ON p.id = oe.part_id
    WHERE UPPER(v.make) = resolved_make
      AND UPPER(v.model) = resolved_model
      AND p_year BETWEEN v.year_start AND v.year_end
      AND p.status = 'active'
      AND (
        UPPER(p.sku) = UPPER(normalized_term)
        OR oe.oe_number_normalized = oe_normalized
        OR p.search_vector @@ ts_query
        OR similarity(p.sku, normalized_term) > 0.4
        OR similarity(p.name, normalized_term) > 0.25
        OR similarity(p.brand, normalized_term) > 0.25
      )
    ORDER BY p.id,
      GREATEST(
        CASE WHEN UPPER(p.sku) = UPPER(normalized_term) THEN 1.0 ELSE 0.0 END,
        CASE WHEN oe.oe_number_normalized = oe_normalized THEN 1.0 ELSE 0.0 END,
        ts_rank(p.search_vector, ts_query),
        similarity(p.sku, normalized_term),
        similarity(p.name, normalized_term),
        similarity(p.brand, normalized_term)
      ) DESC
  ) sub
  ORDER BY sub.similarity_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE
   SET search_path = '';

COMMENT ON FUNCTION search_parts_combined IS
  'Combined text + vehicle search. Delegates to search_parts_by_text or search_parts_by_vehicle when only one input is provided. Uses single-pass scoring when both are provided.';


-- ============================================================================
-- STEP 7: get_vehicle_options — dependent dropdown data
-- ============================================================================
-- Returns only makes/models/years that have active parts (via fitments join).
-- Better than ACR: pushes aggregation to SQL instead of fetching all rows to JS.
CREATE OR REPLACE FUNCTION get_vehicle_options(
  p_make  TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  -- Case 1: No params — return all distinct makes with active parts
  IF p_make IS NULL OR TRIM(p_make) = '' THEN
    RETURN (
      SELECT jsonb_build_object(
        'makes', COALESCE(jsonb_agg(sub.make ORDER BY sub.make), '[]'::JSONB)
      )
      FROM (
        SELECT DISTINCT v.make
        FROM public.vehicles v
        JOIN public.fitments f ON v.id = f.vehicle_id
        JOIN public.parts p ON f.part_id = p.id
        WHERE p.status = 'active'
      ) sub
    );
  END IF;

  -- Case 2: Make given — return models for that make
  IF p_model IS NULL OR TRIM(p_model) = '' THEN
    RETURN (
      SELECT jsonb_build_object(
        'models', COALESCE(jsonb_agg(sub.model ORDER BY sub.model), '[]'::JSONB)
      )
      FROM (
        SELECT DISTINCT v.model
        FROM public.vehicles v
        JOIN public.fitments f ON v.id = f.vehicle_id
        JOIN public.parts p ON f.part_id = p.id
        WHERE UPPER(v.make) = UPPER(TRIM(p_make))
          AND p.status = 'active'
      ) sub
    );
  END IF;

  -- Case 3: Make + Model given — return year range
  RETURN (
    SELECT jsonb_build_object(
      'year_min', sub.min_year,
      'year_max', sub.max_year
    )
    FROM (
      SELECT MIN(v.year_start) AS min_year, MAX(v.year_end) AS max_year
      FROM public.vehicles v
      JOIN public.fitments f ON v.id = f.vehicle_id
      JOIN public.parts p ON f.part_id = p.id
      WHERE UPPER(v.make) = UPPER(TRIM(p_make))
        AND UPPER(v.model) = UPPER(TRIM(p_model))
        AND p.status = 'active'
    ) sub
  );
END;
$$ LANGUAGE plpgsql STABLE
   SET search_path = '';

COMMENT ON FUNCTION get_vehicle_options IS
  'Dependent dropdown data: no params -> makes, make -> models, make+model -> year range. Only includes vehicles that have active parts via fitments.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  ext_exists BOOLEAN;
  idx_count  INTEGER;
  fn_count   INTEGER;
  col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') INTO ext_exists;

  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE indexname IN (
    'idx_parts_search_vector',
    'idx_parts_sku_trgm', 'idx_parts_name_trgm', 'idx_parts_brand_trgm',
    'idx_oe_normalized_trgm', 'idx_vehicles_make_trgm', 'idx_vehicles_model_trgm'
  );

  SELECT COUNT(*) INTO fn_count
  FROM pg_proc
  WHERE proname IN (
    'search_parts_by_text', 'search_parts_by_vehicle',
    'search_parts_combined', 'get_vehicle_options'
  );

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'search_vector'
  ) INTO col_exists;

  RAISE NOTICE 'Search Migration 007 Complete:';
  RAISE NOTICE '  pg_trgm extension: %', CASE WHEN ext_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '  search_vector column: %', CASE WHEN col_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '  GIN indexes created: %/7', idx_count;
  RAISE NOTICE '  Search functions created: %/4', fn_count;
END $$;
