-- Migration 005: Import tracking tables
--
-- Tracks catalog import jobs and per-row errors. Used by the import
-- pipeline (Inngest) to record progress, row counts, and error details.
-- The import pipeline uses the admin client (service role) for all writes.
--
-- Adapted from Data Architecture Spec v5.1 Section 1.2.
-- Changes from spec: BIGINT IDENTITY PKs (not UUID), TEXT (not VARCHAR).

-- ============================================================================
-- import_jobs — one row per catalog import execution
-- ============================================================================
CREATE TABLE import_jobs (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  manufacturer_id         BIGINT NOT NULL REFERENCES manufacturers(id),
  import_type             TEXT NOT NULL
                            CHECK (import_type IN ('full_catalog', 'quick_update', 'new_parts')),
  template_type           TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url                TEXT,
  total_rows              INTEGER,
  successful_rows         INTEGER NOT NULL DEFAULT 0,
  failed_rows             INTEGER NOT NULL DEFAULT 0,
  error_file_url          TEXT,
  normalizations_applied  JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (successful_rows >= 0),
  CHECK (failed_rows >= 0),
  CHECK (total_rows IS NULL OR total_rows >= 0)
);

-- FK index: manufacturer dashboard queries, JOINs
CREATE INDEX idx_import_jobs_manufacturer ON import_jobs (manufacturer_id);

-- Status filter: "show me pending/processing jobs"
CREATE INDEX idx_import_jobs_status ON import_jobs (status);

-- ============================================================================
-- import_errors — per-row error detail for each import job
-- ============================================================================
CREATE TABLE import_errors (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  import_job_id   BIGINT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number      INTEGER NOT NULL,
  sheet_name      TEXT,
  original_data   JSONB NOT NULL,
  error_type      TEXT NOT NULL
                    CHECK (error_type IN (
                      'missing_required', 'invalid_format', 'invalid_value',
                      'duplicate_sku', 'sku_not_found', 'invalid_year_range',
                      'price_too_low', 'unknown_template'
                    )),
  error_message   TEXT NOT NULL,
  field_name      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK index: "get all errors for this job"
CREATE INDEX idx_import_errors_job ON import_errors (import_job_id);

-- ============================================================================
-- Enable RLS (defense-in-depth)
-- ============================================================================
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
--
-- All writes go through the import pipeline using the admin client (service
-- role bypasses RLS). No INSERT/UPDATE/DELETE policies needed.
-- ============================================================================

-- import_jobs: manufacturers see their own jobs
CREATE POLICY import_jobs_select_own ON import_jobs FOR SELECT
  USING (
    manufacturer_id IN (
      SELECT id FROM public.manufacturers
      WHERE user_id = (SELECT current_app_user_id())
    )
  );

-- import_jobs: admins see all
CREATE POLICY import_jobs_admin_all ON import_jobs FOR ALL
  USING ((SELECT is_admin()));

-- import_errors: visible if you can see the parent job
-- (errors inherit visibility from their job via the FK relationship)
CREATE POLICY import_errors_select_own ON import_errors FOR SELECT
  USING (
    import_job_id IN (
      SELECT ij.id FROM public.import_jobs ij
      JOIN public.manufacturers m ON m.id = ij.manufacturer_id
      WHERE m.user_id = (SELECT current_app_user_id())
    )
  );

-- import_errors: admins see all
CREATE POLICY import_errors_admin_all ON import_errors FOR ALL
  USING ((SELECT is_admin()));
