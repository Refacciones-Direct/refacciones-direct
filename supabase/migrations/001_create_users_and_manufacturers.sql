-- Migration 001: Create users and manufacturers tables
-- These are the foundational auth-related tables for the RefaccionesDirect platform.
-- We use WorkOS AuthKit for authentication (not Supabase Auth), so we maintain
-- our own users table with workos_user_id as the external identity link.

-- ============================================================================
-- Users table
-- ============================================================================
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workos_user_id TEXT UNIQUE NOT NULL,
  workos_org_id TEXT,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'manufacturer', 'admin')),
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workos_user_id UNIQUE and email UNIQUE auto-create indexes
CREATE INDEX idx_users_workos_org ON users(workos_org_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- Manufacturers table
-- ============================================================================
CREATE TABLE manufacturers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  workos_org_id TEXT UNIQUE,
  company_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  display_mode TEXT DEFAULT 'brand_only'
    CHECK (display_mode IN ('brand_only', 'company_name')),
  rfc VARCHAR(13),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workos_org_id UNIQUE auto-creates index
CREATE INDEX idx_manufacturers_user ON manufacturers(user_id);

-- ============================================================================
-- Trigger: auto-update updated_at on row changes
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON manufacturers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Enable RLS (defense-in-depth; primary auth is app-layer)
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
