# Database Migration Guidelines

## Core Rules

- Always use the **supabase-postgres-best-practices** skill when doing database design work
- **NEVER** apply migrations directly to STAGING or PRODUCTION. Always apply on LOCAL first. CI/CD pipelines handle environment promotion automatically.
- **NEVER** make updates to existing tables unless USER has given explicit PERMISSION. Any schema change requires express approval first.

## Migration File Discipline

- **Never modify an existing migration file** — once committed, it may have been applied. Always create a new migration.
- **One logical change per migration** — easier to review, debug, and rollback.
- **Always enable RLS** on new tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- **Test with `supabase db reset`** before committing — ensures migrations replay cleanly from scratch.

## Safety

- **Never use `DROP TABLE` or `DROP COLUMN` without explicit user approval** — destructive and irreversible in production.
- **Use `IF EXISTS` / `IF NOT EXISTS`** guards for idempotency where appropriate.

## Naming Conventions

- Migration files: `NNN_descriptive_name.sql` (sequential numbering)
- Tables: `snake_case`, plural (`users`, `manufacturers`)
- Columns: `snake_case` (`workos_user_id`, `created_at`)
- Indexes: `idx_<table>_<column(s)>` pattern

## Data Types (per Supabase Postgres Best Practices)

- **Strings**: Use `TEXT` not `VARCHAR(N)` (same performance, no arbitrary limits). Exception: use `VARCHAR(N)` only where length has business meaning (e.g., RFC tax ID).
- **Timestamps**: Always `TIMESTAMPTZ` not `TIMESTAMP`.
- **Primary keys**: `BIGINT GENERATED ALWAYS AS IDENTITY` (sequential, 8 bytes, SQL-standard, no index fragmentation).
- **Enums**: `TEXT` with `CHECK` constraint.
- **UNIQUE constraints** automatically create indexes — do not add redundant explicit indexes.

## Authorization Model

- **Primary authorization**: App-layer (TypeScript) using admin client (service role key)
- **RLS**: Defense-in-depth safety net. Enabled on all tables but not the primary auth mechanism.
- **Reason**: `SET LOCAL` session variables are unreliable with PgBouncer connection pooling in production.
