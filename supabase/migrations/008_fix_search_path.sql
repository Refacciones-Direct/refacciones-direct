-- Migration 008: Fix search_path on search functions
--
-- The search functions use pg_trgm's similarity() which lives in the public
-- schema. With SET search_path = '' (empty), PostgreSQL can't resolve
-- similarity(text, text). Change to search_path = 'public' so pg_trgm
-- functions are visible.
--
-- These functions are NOT SECURITY DEFINER, so including 'public' in the
-- search path is safe — there is no privilege escalation risk.

ALTER FUNCTION search_parts_by_text(TEXT, INTEGER, INTEGER)
  SET search_path = 'public';

ALTER FUNCTION search_parts_by_vehicle(TEXT, TEXT, INTEGER, INTEGER, INTEGER)
  SET search_path = 'public';

ALTER FUNCTION search_parts_combined(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER)
  SET search_path = 'public';

ALTER FUNCTION get_vehicle_options(TEXT, TEXT)
  SET search_path = 'public';
