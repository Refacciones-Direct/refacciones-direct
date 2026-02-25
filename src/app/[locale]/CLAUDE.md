# UI Development Guide — src/app/[locale]/

This directory is the root of all portal UI: (catalog), (dashboard), (admin).

## Skills

### Core (use during planning & development)

1. `vercel-react-best-practices` — React/Next.js performance patterns, server components, data fetching
2. `next-intl-app-router` — All UI text needs i18n (es-MX primary, en-US secondary)
3. `tailwind-v4-shadcn` — Tailwind v4 CSS-first (`@theme inline`), shadcn/ui (new-york style)
4. `vercel-composition-patterns` — Component API design, compound components, children over render props

### During review

5. `accessibility` — Public-facing pages need WCAG 2.1 compliance
6. `vitest` — Unit tests for components

### Domain-specific (use when touching these areas)

- `supabase-postgres-best-practices` — Database queries, schema, RLS
- `workos-authkit-nextjs` — Auth integration, sessions, callbacks
- `inngest` — Background jobs, event-driven workflows

## Patterns

- **Server components by default** — only add `'use client'` when the component needs state, effects, or browser APIs
- **i18n everywhere** — no hardcoded strings. Use `useTranslations('namespace')` (client) or `getTranslations('namespace')` (server)
- **Locale-aware navigation** — use `Link`, `redirect`, `useRouter` from `@/i18n/navigation`, never from `next/navigation` directly
- **Token-driven styling** — use CSS variables from `globals.css` via Tailwind utilities (`bg-brand-navy`, `text-brand-red`). No hardcoded hex values in components
- **Design reference** — Pencil .pen file in editor. Use `get_variables` MCP tool to read design tokens, `get_screenshot` to verify visual fidelity

## Design Token Sync

When design tokens change in the Pencil .pen file:

1. Run `get_variables` (Pencil MCP) to read current design tokens
2. Compare against `src/app/globals.css` `:root` and `.dark` blocks
3. Update changed values in globals.css
4. Ensure new tokens are registered in `@theme inline` block
5. No live sync — the .pen file is the design reference, globals.css is the production source of truth
