# RefaccionesDirect — Auto Parts Marketplace

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, TypeScript)
- **Database:** Supabase (PostgreSQL + Storage)
- **Auth:** WorkOS AuthKit (organizations, SSO)
- **Payments:** Stripe Connect (multi-vendor splits)
- **Background Jobs:** Inngest (async workflows)
- **Shipping:** Skydropx API
- **Email:** Resend
- **i18n:** next-intl (es-MX primary, en-US secondary)
- **UI:** shadcn/ui + Tailwind CSS v4
- **Error Tracking:** Sentry

## Commands

- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build
- `npm run typecheck` — TypeScript checks
- `npm run lint` — ESLint (flat config)
- `npm run format` — Prettier format
- `npm run test` — Vitest (watch mode)
- `npm run test:run` — Vitest (single run)
- `npm run test:e2e` — Playwright E2E
- `supabase start` — Start local Supabase (Docker)
- `supabase db reset` — Reset DB + migrations + seed

## Architecture

- **src/ directory:** All source code under `src/`, `@/*` alias maps to `./src/*`
- **Three portals (route groups):**
  - `(storefront)` — Consumer-facing catalog/checkout
  - `(dashboard)` — Manufacturer portal (parts, orders, team)
  - `(admin)` — Platform admin (manufacturers, users, oversight)
- **Locale routing:** `app/[locale]/` with next-intl, proxy.ts handles routing
- **API routes:** `app/api/` (no locale prefix)
- **Inngest functions:** `src/inngest/functions/`
- **Database types:** `src/types/database.ts`
- **Translations:** `messages/es-MX.json`, `messages/en-US.json`

## Key Patterns

- Server components by default, client components when needed
- RLS policies for multi-tenant data (manufacturer_id)
- Inngest for all multi-step async workflows
- Conventional Commits (feat/fix/chore)
- Test files alongside source: `*.test.ts`
- Batch database operations (500 records max per step)

## Windows MINGW64 Note

Use `npm.cmd` / `npx.cmd` instead of `npm` / `npx` on this machine.

## Reference: ACR-Automotive

The import/export pipeline design references patterns from `c:/Users/abelm/Projects/acr-automotive`:

- 3-stage workflow (validate → preview → execute)
- Atomic PostgreSQL transactions
- Snapshot-based rollback
- ID-based change detection (DiffEngine)
- ExcelJS for workbook generation
