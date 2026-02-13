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

## Beads Task Management

Tasks persist across sessions in `.beads/`. Run at session start:

```bash
bd ready                                  # See pending tasks
bd create --title="..." --type=task       # Create task
bd update <id> --status=in_progress       # Start working
bd close <id> --reason="done"             # Complete task
```

**Plan Traceability:** When creating tasks from a plan file, add the plan reference:
```bash
bd update <id> --notes="Plan: ~/.claude/plans/<plan-file>.md"
```

## Code Quality

Use these skills when relevant:
- `vercel-react-best-practices` — React/Next.js patterns
- `supabase-postgres-best-practices` — Database queries/schema
- `workos-authkit-nextjs` — Auth integration
- `next-intl-app-router` — i18n routing/translations

## Testing Rules

- **No sneaky implementation changes**: When writing tests, do NOT modify production/implementation code to make tests easier to write or pass. Tests must work against the current codebase as-is.
- **HARD STOP on production code changes**: If a test or CI failure reveals a bug in production code (`src/`, `lib/`, `services/`), you MUST:
  1. STOP immediately — do not plan or implement a fix
  2. Show the user: what broke, the root cause, and which production file(s) would need to change
  3. Wait for explicit approval before touching any production file
  4. If the user says "file it for later", create a beads issue and move on
  This rule applies even when the fix seems obvious. No exceptions.
- **Do not modify existing test files** unless the user has approved the change.

## Landing the Plane (Session Completion)

**Plan Rule:** Every implementation plan MUST include "Land the Plane" as its final checklist item.

Work is NOT complete until a successful PR has passed CI and has been MERGED into the target branch.

### 0. Code review (before committing)

Use `superpowers:requesting-code-review` to launch a review subagent. The review must check:
- Do the changes match the stated plan/requirements?
- Was anything added that wasn't in scope?
- Are production changes minimal?
- Fix all Critical and Important issues before proceeding.

**Skill-based audits** — for non-trivial work touching a core dependency, invoke the relevant skill during review to catch gaps missed during development:

| Area changed | Audit skill |
|---|---|
| React components, UI | `vercel-react-best-practices` |
| Next.js (server components, API routes, SSR/SSG, proxy) | `vercel-react-best-practices` |
| Database (migrations, queries, schema, RLS) | `supabase-postgres-best-practices` |
| Authentication (WorkOS, sessions, callbacks) | `workos-authkit-nextjs` |
| i18n (routing, translations, locale handling) | `next-intl-app-router` |
| Background jobs (event-driven workflows) | `inngest` |

### 1. File issues for remaining work
```bash
bd create --title="Follow-up: ..." --type=task --priority=2
```

### 2. Run quality gates (if code changed)
```bash
./node_modules/.bin/tsc.cmd --noEmit  # Type check
npm.cmd run build                     # Build
npm.cmd run test:run                  # Unit tests
```

### 3. Update beads
```bash
bd close <id1> <id2> ... --reason="done"   # Close finished work
bd sync                                     # Flush to .beads/issues.jsonl
```

### 4. Commit, push, and open PR
```bash
git add <files>                  # Stage changes (including .beads/issues.jsonl)
git commit -m "..."              # Commit
git pull --rebase                # Sync with remote
git push -u origin <branch>     # Push feature branch
gh pr create --title "..." --body "..."  # Open PR against target branch
```

### 5. Monitor PR until merged
The session is NOT over after pushing. You must:
1. Report to the user that the PR is open and CI is running.
2. Wait 5–7 minutes for CI to complete, then check status:
   ```bash
   gh pr checks <pr-number>
   ```
3. If CI fails: investigate, fix, push again, and repeat.
4. If CI passes: report to the user that the PR is ready for review/merge.
5. Once the PR is merged, confirm with `gh pr view <pr-number>` and report completion.

**Critical rules:**
- NEVER stop before the PR is merged — that leaves work in limbo
- NEVER say "ready to push when you are" — YOU must push and open the PR
- If CI fails, resolve and retry until it passes
- Report status periodically — the user should never have to ask "what's happening?"

## Windows MINGW64 Note

Use `npm.cmd` / `npx.cmd` instead of `npm` / `npx` on this machine.

## Reference: ACR-Automotive

The import/export pipeline design references patterns from `c:/Users/abelm/Projects/acr-automotive`:

- 3-stage workflow (validate → preview → execute)
- Atomic PostgreSQL transactions
- Snapshot-based rollback
- ID-based change detection (DiffEngine)
- ExcelJS for workbook generation
