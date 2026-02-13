-- Migration 002: RLS policies (defense-in-depth)
--
-- Primary authorization happens in TypeScript (app-layer) using the admin client.
-- These RLS policies are a safety net — if code accidentally uses the anon client
-- instead of admin, the DB still protects data.
--
-- The helper functions use app.workos_user_id session variable, which can be set
-- via SET LOCAL in a transaction. For the admin client (service role), RLS is
-- bypassed entirely, so these only apply to anon/authenticated roles.

-- ============================================================================
-- Helper functions
-- ============================================================================

-- Get current user's DB id from session variable
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS BIGINT AS $$
  SELECT id FROM public.users
  WHERE workos_user_id = (SELECT current_setting('app.workos_user_id', true))
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE workos_user_id = (SELECT current_setting('app.workos_user_id', true))
    AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ============================================================================
-- Users policies
-- ============================================================================

-- Users can read their own row
CREATE POLICY users_select_own ON users FOR SELECT
  USING (workos_user_id = (SELECT current_setting('app.workos_user_id', true)));

-- Admins can read all users
CREATE POLICY users_select_admin ON users FOR SELECT
  USING ((SELECT is_admin()));

-- Users can update their own row (name, avatar only — role changes require admin)
CREATE POLICY users_update_own ON users FOR UPDATE
  USING (workos_user_id = (SELECT current_setting('app.workos_user_id', true)))
  WITH CHECK (workos_user_id = (SELECT current_setting('app.workos_user_id', true)));

-- No INSERT policy for anon — user sync uses admin client (service role bypasses RLS)

-- ============================================================================
-- Manufacturers policies
-- ============================================================================

-- Anyone can read manufacturers (storefront needs brand info)
CREATE POLICY manufacturers_select_public ON manufacturers FOR SELECT
  USING (true);

-- Manufacturer owner can update their own record
CREATE POLICY manufacturers_update_own ON manufacturers FOR UPDATE
  USING (user_id = (SELECT current_app_user_id()));

-- Admins can do everything
CREATE POLICY manufacturers_admin_all ON manufacturers FOR ALL
  USING ((SELECT is_admin()));
