---
document: Technical Architecture Specification
project: RefaccionesDirect
version: 7.0
updated: February 2026
status: Ready for Development

purpose: |
  Master document defining HOW we build the platform—technology choices,
  infrastructure, code structure, development environment setup, testing,
  CI/CD, monitoring, internationalization, and deployment.

owns:
  - Technology stack decisions (Supabase, Vercel, Inngest, Stripe, Skydropx, WorkOS)
  - Infrastructure costs and scaling projections
  - Project file/folder structure
  - Background job architecture (Inngest workflows)
  - Authentication architecture (WorkOS AuthKit)
  - Development environment setup (Phase 0)
  - Testing strategy and tools
  - Git strategy and CI/CD pipeline
  - Error tracking and monitoring
  - Pre-commit hooks and code quality
  - API documentation strategy
  - Database seeding
  - Internationalization (i18n)
  - Performance optimization guidance
  - Security and compliance approach
  - Deployment and DevOps
  - Claude Code integration (CLAUDE.md, MCP, Skills)

does_not_own:
  - Database schema details → see Data Architecture
  - Excel template field specifications → see Data Architecture
  - Business logic (returns, pricing, seller rules) → see Data Architecture
  - Data normalization rules → see Data Architecture
  - Search/UX patterns → see Data Architecture

related_documents:
  - RefaccionesDirect_DataArchitectureSpec_v4.0.md (WHAT the data looks like)
  - RefaccionesDirect_Questions_Pending_v3.md (open decisions)
  - RefaccionesDirect_CostAnalysis_v5.md (detailed financial projections)
---

# RefaccionesDirect

## Technical Architecture Specification

**Version 7.0** | February 2026  
**CONFIDENTIAL**

---

## Document History

| Version | Date         | Changes                                                                                                                                                                         |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Jan 2026     | Initial architecture                                                                                                                                                            |
| 2.0     | Jan 2026     | Consolidated to Supabase ecosystem                                                                                                                                              |
| 3.0     | Jan 2026     | Removed Clerk, Trigger.dev; added Vercel Fluid Compute                                                                                                                          |
| 4.0     | Jan 2026     | Inngest for background workflows                                                                                                                                                |
| 5.0     | Jan 2026     | VCdb removed; Excel-first import; phases reordered                                                                                                                              |
| 5.1     | Jan 2026     | Removed duplicates with Data Architecture; added frontmatter                                                                                                                    |
| 6.0     | Jan 2026     | Replaced Supabase Auth with WorkOS AuthKit                                                                                                                                      |
| **7.0** | **Feb 2026** | **🆕 Master doc: Merged Phase 0 setup guide, dev practices (testing, git, CI/CD, error tracking, i18n, seeding, pre-commit hooks, API docs, performance, Claude Code tooling)** |

---

## 1. Technology Stack

**STATUS:** ✅ DECIDED - Ready for Development

### 1.1 Core Infrastructure

| Component           | Service                 | Purpose                                              | Status     |
| ------------------- | ----------------------- | ---------------------------------------------------- | ---------- |
| **Framework**       | Next.js 15 (App Router) | Full-stack React framework                           | ✅ Decided |
| **Database**        | Supabase (Postgres)     | All data, RLS for multi-tenancy                      | ✅ Decided |
| **Auth**            | WorkOS AuthKit          | User authentication, organizations                   | ✅ Decided |
| **Storage**         | Supabase Storage        | Product images, Excel files                          | ✅ Decided |
| **Hosting**         | Vercel                  | Next.js app, API routes, edge caching, Fluid Compute | ✅ Decided |
| **Background Jobs** | Inngest                 | Excel import, order workflows                        | ✅ Decided |
| **Payments**        | Stripe Connect          | Processing, splits, auto payouts                     | ✅ Decided |
| **Shipping**        | Skydropx                | Rates, labels, tracking                              | ✅ Decided |
| **Email**           | Resend                  | Transactional emails                                 | ✅ Decided |
| **Error Tracking**  | Sentry                  | Client + server errors, session replay               | ✅ Decided |
| **i18n**            | next-intl               | Spanish (MX) primary, English secondary              | ✅ Decided |
| **API Docs**        | next-openapi-gen        | Auto-generated OpenAPI 3.0 from code                 | ✅ Decided |

### 1.2 Development Tools

| Tool                      | Purpose                                   | Status     |
| ------------------------- | ----------------------------------------- | ---------- |
| **TypeScript**            | Type safety across entire codebase        | ✅ Decided |
| **Vitest**                | Unit tests (faster than Jest, native ESM) | ✅ Decided |
| **Playwright**            | E2E tests for critical flows              | ✅ Decided |
| **React Testing Library** | Component testing                         | ✅ Decided |
| **Husky + lint-staged**   | Pre-commit hooks                          | ✅ Decided |
| **ESLint + Prettier**     | Code formatting and linting               | ✅ Decided |
| **Commitlint**            | Enforce Conventional Commits              | ✅ Decided |
| **Zod**                   | Runtime validation schemas                | ✅ Decided |
| **Claude Code**           | AI-assisted development                   | ✅ Decided |

### 1.3 Why WorkOS AuthKit (Not Supabase Auth)

| Factor                           | Supabase Auth         | WorkOS AuthKit                    | Winner |
| -------------------------------- | --------------------- | --------------------------------- | ------ |
| **Cost at 1M MAU**               | Free                  | Free                              | Tie    |
| **Built-in Organizations**       | ❌ Build yourself     | ✅ Native support                 | WorkOS |
| **Enterprise SSO**               | ❌ Build yourself     | ✅ $125/connection                | WorkOS |
| **Security best practices**      | Manual implementation | ✅ Built-in                       | WorkOS |
| **Rate limiting/bot protection** | Manual implementation | ✅ Radar feature                  | WorkOS |
| **Pre-built widgets**            | ❌ None               | ✅ UsersManagement, UserProfile   | WorkOS |
| **Redirect-based auth**          | N/A                   | ✅ Industry standard, more secure | WorkOS |

WorkOS provides free auth up to 1M MAU with built-in organization support (perfect for manufacturers), enterprise-grade security features, and pre-built React widgets. The redirect-based auth flow is the industry standard used by Google, Microsoft, and Apple—research shows users don't notice the redirect and it's more secure than embedded forms.

### 1.4 What's NOT Needed

| Component             | Status        | Reason                                                                 |
| --------------------- | ------------- | ---------------------------------------------------------------------- |
| **VCdb Subscription** | ❌ NOT NEEDED | Manufacturers provide Make/Model/Year in Excel ($2,500/yr saved)       |
| **ACES XML Parser**   | ⏳ DEFERRED   | Mexican manufacturers use Excel, not ACES XML                          |
| **Clerk**             | ❌ NOT NEEDED | WorkOS is free up to 1M MAU (~$21,600/yr saved vs Clerk at 100k users) |

---

## 2. WorkOS AuthKit Integration

### 2.1 AuthKit Overview

WorkOS AuthKit provides:

- **Hosted UI** for sign-in/sign-up (redirect-based, customizable)
- **Next.js SDK** (`@workos-inc/authkit-nextjs`) for easy integration
- **Organizations** for manufacturer multi-tenancy
- **Widgets** for user management, profile, and org switching
- **Webhooks** for syncing user data to Supabase

### 2.2 Environment Variables

```bash
# .env.local

# WorkOS AuthKit (from WorkOS Dashboard)
WORKOS_API_KEY="sk_live_..."           # API key
WORKOS_CLIENT_ID="client_..."          # Client ID
WORKOS_COOKIE_PASSWORD="..."           # 32+ char password for session encryption

# Redirect URI (configured in WorkOS Dashboard)
NEXT_PUBLIC_WORKOS_REDIRECT_URI="http://localhost:3000/callback"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Inngest
INNGEST_EVENT_KEY="..."                # Only needed in production
INNGEST_SIGNING_KEY="..."              # Only needed in production

# Stripe Connect
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Resend
RESEND_API_KEY="re_..."

# Sentry
SENTRY_DSN="https://xxx@sentry.io/xxx"
SENTRY_AUTH_TOKEN="sntrys_..."
```

### 2.3 AuthKit SDK Methods

| Method                | Purpose                       | Usage                       |
| --------------------- | ----------------------------- | --------------------------- |
| `withAuth()`          | Get current user (server)     | Protected pages, API routes |
| `useAuth()`           | Get current user (client)     | Client components           |
| `getSignInUrl()`      | Generate AuthKit sign-in URL  | Sign-in buttons             |
| `getSignUpUrl()`      | Generate AuthKit sign-up URL  | Sign-up buttons             |
| `signOut()`           | End user session              | Logout functionality        |
| `handleAuth()`        | Handle OAuth callback         | Callback route              |
| `authkitMiddleware()` | Protect routes via middleware | Route protection            |

### 2.4 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WORKOS AUTHKIT FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User clicks "Sign In"                                           │
│     └── App calls getSignInUrl() → Redirect to AuthKit hosted UI    │
│                                                                     │
│  2. User authenticates on AuthKit                                   │
│     └── Email/password, social login, magic link, or SSO            │
│                                                                     │
│  3. AuthKit redirects to /callback with authorization code          │
│     └── handleAuth() exchanges code for session                     │
│                                                                     │
│  4. Session stored in encrypted cookie (wos-session)                │
│     └── Middleware refreshes session automatically                  │
│                                                                     │
│  5. App syncs user to Supabase (via onSuccess or webhook)           │
│     └── Creates/updates users table with WorkOS external_id         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.5 User Sync to Supabase

WorkOS manages authentication; Supabase stores business data. We sync users:

```typescript
// app/callback/route.ts
import { handleAuth } from '@workos-inc/authkit-nextjs';
import { createClient } from '@/lib/supabase/server';

export const GET = handleAuth({
  returnPathname: '/dashboard',
  onSuccess: async ({ user, organizationId }) => {
    const supabase = createClient();

    // Upsert user to Supabase
    await supabase.from('users').upsert(
      {
        external_id: user.id, // WorkOS user ID
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        organization_external_id: organizationId,
        role: 'customer', // Default role
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'external_id',
      },
    );
  },
});
```

### 2.6 WorkOS Widgets

Pre-built React components for common enterprise workflows:

| Widget                     | Purpose                      | Use Case               |
| -------------------------- | ---------------------------- | ---------------------- |
| `<UsersManagement />`      | Invite/remove/edit org users | Manufacturer dashboard |
| `<UserProfile />`          | Display/edit user profile    | Account settings       |
| `<UserSecurity />`         | Manage MFA/2FA settings      | Security settings      |
| `<UserSessions />`         | View/manage active sessions  | Security settings      |
| `<OrganizationSwitcher />` | Switch between organizations | Multi-org users        |
| `<Impersonation />`        | Admin impersonation banner   | Support/debugging      |

```tsx
import { UsersManagement, WorkOSWidgets } from '@workos-inc/widgets';

export function TeamManagement({ authToken }) {
  return (
    <WorkOSWidgets>
      <UsersManagement authToken={authToken} />
    </WorkOSWidgets>
  );
}
```

### 2.7 Organizations for Manufacturers

Each manufacturer is a WorkOS Organization:

```typescript
// Create organization when onboarding manufacturer
const organization = await workos.organizations.createOrganization({
  name: 'ACR Automotive',
  domains: ['acr-automotive.com'], // Optional: for SSO
});

// Invite user to organization
await workos.userManagement.sendInvitation({
  email: 'humberto@acr-automotive.com',
  organizationId: organization.id,
  roleSlug: 'admin',
});
```

### 2.8 Role-Based Access Control

| Role             | Permissions                     | Use Case               |
| ---------------- | ------------------------------- | ---------------------- |
| `admin`          | Full org access, manage users   | Manufacturer owner     |
| `member`         | View/edit parts, fulfill orders | Manufacturer staff     |
| `customer`       | Browse, purchase                | End customers          |
| `platform_admin` | Full platform access            | RefaccionesDirect team |

---

## 3. Infrastructure Costs

### 3.1 Monthly Costs by Growth Stage

| Service            | MVP (100/mo) | Growth (1,000/mo) | Scale (10,000/mo) | Enterprise (50,000/mo) |
| ------------------ | ------------ | ----------------- | ----------------- | ---------------------- |
| **Supabase**       | $25          | $50               | $150              | $599                   |
| **Vercel**         | $20          | $40               | $80               | $200                   |
| **Inngest**        | $0           | $0                | $0                | ~$50                   |
| **Resend**         | $0           | $20               | $90               | $225                   |
| **WorkOS AuthKit** | $0           | $0                | $0                | $0                     |
| **Sentry**         | $0           | $0                | $26               | $26                    |
| **TOTAL**          | **$45**      | **$110**          | **$346**          | **$1,100**             |

WorkOS AuthKit is free up to 1,000,000 MAU. Sentry free tier covers 5,000 errors/month (sufficient through Growth stage).

### 3.2 Total First Year Costs (Realistic Projection)

| Year   | H1 Orders/Mo | H1 Monthly | H2 Orders/Mo | H2 Monthly | Annual Total |
| ------ | ------------ | ---------- | ------------ | ---------- | ------------ |
| Year 1 | 100          | $45        | 500          | $80        | **~$750**    |
| Year 2 | 2,000        | $150       | 5,000        | $250       | **~$2,400**  |

### 3.3 Inngest Execution Estimates

| Workflow          | Volume    | Steps   | Monthly Executions |
| ----------------- | --------- | ------- | ------------------ |
| Excel imports     | 100/month | 7 steps | 700                |
| Order fulfillment | 100/month | 6 steps | 600                |
| Notifications     | 500/month | 1 step  | 500                |
| **TOTAL**         |           |         | **~1,800**         |

Free tier (50,000/mo) covers us well into Scale phase.

---

## 4. Project Structure

### 4.1 File Structure

```
refaccionesdirect/
├── CLAUDE.md                         # Claude Code project context
├── .mcp.json                         # MCP server config
├── .claude/
│   ├── settings.json                 # Hooks, permissions
│   ├── settings.local.json           # Personal overrides (gitignored)
│   └── commands/                     # Custom slash commands
├── app/
│   ├── [locale]/                     # 🆕 Locale-prefixed routes (next-intl)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── route.ts          # Redirects to AuthKit sign-in
│   │   │   ├── signup/
│   │   │   │   └── route.ts          # Redirects to AuthKit sign-up
│   │   │   └── callback/
│   │   │       └── route.ts          # handleAuth() + user sync
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Protected layout (withAuth)
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── parts/
│   │   │   │   └── page.tsx          # Part management
│   │   │   ├── orders/
│   │   │   │   └── page.tsx          # Order management
│   │   │   ├── team/
│   │   │   │   └── page.tsx          # UsersManagement widget
│   │   │   └── settings/
│   │   │       └── page.tsx          # UserProfile, UserSecurity widgets
│   │   ├── (storefront)/
│   │   │   ├── layout.tsx            # Public layout
│   │   │   ├── page.tsx              # Home page
│   │   │   ├── search/
│   │   │   │   └── page.tsx          # Vehicle/part search
│   │   │   ├── cart/
│   │   │   │   └── page.tsx          # Shopping cart
│   │   │   └── checkout/
│   │   │       └── page.tsx          # Checkout (protected)
│   │   └── layout.tsx                # Locale layout (NextIntlClientProvider)
│   ├── api/
│   │   ├── inngest/
│   │   │   └── route.ts              # Inngest serve endpoint
│   │   ├── webhooks/
│   │   │   ├── workos/
│   │   │   │   └── route.ts          # WorkOS webhooks
│   │   │   └── stripe/
│   │   │       └── route.ts          # Stripe webhooks
│   │   └── manufacturer/
│   │       ├── upload-excel/
│   │       │   └── route.ts          # Triggers Excel import
│   │       └── widget-token/
│   │           └── route.ts          # Generate WorkOS widget tokens
│   └── layout.tsx                    # Root layout with AuthKitProvider
├── components/
│   ├── auth/
│   │   ├── sign-in-button.tsx
│   │   ├── sign-out-button.tsx
│   │   └── user-menu.tsx
│   ├── dashboard/
│   │   └── ...
│   └── storefront/
│       └── ...
├── lib/
│   ├── workos/
│   │   ├── client.ts                 # WorkOS SDK client
│   │   └── widgets.ts                # Widget token generation
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── admin.ts                  # Admin client (service role)
│   └── workflows/
│       └── nodes/                    # Reusable step functions
│           ├── upload.ts
│           ├── validate.ts
│           ├── parse.ts
│           ├── normalize.ts
│           └── insert.ts
├── inngest/
│   ├── client.ts                     # Inngest client config
│   └── functions/
│       ├── excel-import.ts
│       ├── aces-import.ts            # FUTURE
│       ├── order-fulfillment.ts
│       └── notifications.ts
├── messages/                         # 🆕 i18n translation files
│   ├── es-MX.json                    # Spanish (Mexico) - primary
│   └── en-US.json                    # English (US) - secondary
├── i18n/
│   └── request.ts                    # 🆕 next-intl config
├── supabase/
│   ├── migrations/                   # Database migrations
│   ├── seed.sql                      # 🆕 Seed data for local dev
│   └── config.toml                   # Supabase CLI config
├── middleware.ts                      # WorkOS authkitMiddleware + next-intl
├── hooks/
│   └── use-current-user.ts
├── types/
│   ├── workos.ts
│   └── database.ts
├── sentry.client.config.ts           # 🆕 Sentry browser config
├── sentry.server.config.ts           # 🆕 Sentry server config
└── sentry.edge.config.ts             # 🆕 Sentry edge config
```

### 4.2 Key File Implementations

**Root Layout with AuthKitProvider:**

```tsx
// app/layout.tsx
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthKitProvider>{children}</AuthKitProvider>
      </body>
    </html>
  );
}
```

**Middleware (Auth + i18n):**

```typescript
// middleware.ts
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import createMiddleware from 'next-intl/middleware';

// Combine WorkOS auth + next-intl locale detection
export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/search', '/search/(.*)', '/parts/(.*)', '/api/webhooks/(.*)'],
  },
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Login Route:**

```typescript
// app/[locale]/(auth)/login/route.ts
import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

export const GET = async () => {
  const signInUrl = await getSignInUrl();
  return redirect(signInUrl);
};
```

**Protected Server Component:**

```tsx
// app/[locale]/(dashboard)/page.tsx
import { withAuth } from '@workos-inc/authkit-nextjs';

export default async function DashboardPage() {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <p>Organization: {organizationId}</p>
    </div>
  );
}
```

---

## 5. Inngest Workflow Architecture

### 5.1 Core Workflows

**1. Excel Import Workflow (PRIMARY)**

```
Event: "manufacturer/excel.uploaded"
Steps:
  1. Upload to Supabase Storage
  2. Parse Excel headers (row 2)
  3. Auto-map columns to schema
  4. Validate required fields
  5. Normalize data (Position, DriveType)
  6. Upsert parts, vehicles, fitments (batch 500)
  7. Send notification email
```

**2. Order Fulfillment Workflow**

```
Event: "order/created"
Steps:
  1. Check inventory availability
  2. Reserve stock
  3. Process payment (Stripe)
  4. Generate shipping labels (Skydropx)
  5. Send customer notification
  6. Send manufacturer notification
```

**3. ACES Import Workflow (FUTURE)**

```
Event: "manufacturer/aces.uploaded"
Steps:
  1. Upload to Supabase Storage
  2. Validate XML structure
  3. Parse ACES file (chunked)
  4. Batch insert to database
  5. Send notification email
```

### 5.2 Inngest Configuration

```typescript
// inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'refaccionesdirect',
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

### 5.3 Inngest Limits (Free Tier)

| Limit              | Free Tier    | Our Usage    |
| ------------------ | ------------ | ------------ |
| Executions         | 50,000/month | ~2,000/month |
| Events             | 1-5M/day     | Well under   |
| Sleep duration     | Up to 7 days | Sufficient   |
| Event payload      | 256KB        | Sufficient   |
| Steps per function | 1,000 max    | ~7 steps     |

---

## 6. Development Environment Setup (Phase 0)

This section is the step-by-step guide to get a working development environment.

### 6.1 Prerequisites

- Node.js 18+ (LTS recommended)
- Docker Desktop (for local Supabase)
- Git
- VS Code (recommended)

### 6.2 Project Initialization

```bash
# 1. Create Next.js app
npx create-next-app@latest refaccionesdirect
# Options:
#   ✅ TypeScript: Yes
#   ✅ ESLint: Yes
#   ✅ Tailwind CSS: Yes
#   ✅ src/ directory: No (use app/ directly)
#   ✅ App Router: Yes
#   ✅ Import alias: @/*

# 2. Install core dependencies
npm install @workos-inc/authkit-nextjs @workos-inc/widgets
npm install @supabase/supabase-js @supabase/ssr
npm install inngest
npm install stripe
npm install resend
npm install zod
npm install next-intl

# 3. Install dev dependencies
npm install -D @sentry/nextjs
npm install -D vitest @vitejs/plugin-react
npm install -D @playwright/test
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
npm install -D prettier eslint-config-prettier

# 4. Initialize Sentry
npx @sentry/wizard@latest -i nextjs

# 5. Initialize Supabase locally
npx supabase init

# 6. Initialize Husky
npx husky init

# 7. Initialize git
git init && git add . && git commit -m "chore: initial project setup"
```

### 6.3 Supabase Local Development

```bash
# Start local Supabase (Postgres, Auth, Storage in Docker)
supabase start

# After first start, you'll get:
#   API URL:      http://localhost:54321
#   DB URL:       postgresql://postgres:postgres@localhost:54322/postgres
#   Studio URL:   http://localhost:54323
#   Anon key:     eyJ...
#   Service key:  eyJ...

# Reset database (drops, re-runs migrations + seed)
supabase db reset

# Create a new migration
supabase migration new <name>

# Push migrations to remote
supabase db push

# Stop containers (data persisted)
supabase stop
```

### 6.4 Environment Configuration

Create `.env.local` with all variables from Section 2.2. Also create `.env.example` (committed to git) with placeholder values for team reference.

### 6.5 Three-Tier Environment Strategy

| Environment         | Database                | Deployment              | Purpose                                 |
| ------------------- | ----------------------- | ----------------------- | --------------------------------------- |
| **Local**           | Supabase CLI (Docker)   | `localhost:3000`        | Development, unit tests, fast iteration |
| **Preview/Staging** | Supabase Project (test) | `*.vercel.app`          | Integration tests, PR previews, QA      |
| **Production**      | Supabase Project (prod) | `refaccionesdirect.com` | Live application, real data             |

### 6.6 Verification Checklist

After Phase 0, confirm:

- [ ] `npm run dev` loads at localhost:3000
- [ ] `supabase start` runs local Postgres in Docker
- [ ] Database schema created via migrations
- [ ] WorkOS AuthKit flow works (login → callback → dashboard)
- [ ] User sync creates record in Supabase `users` table
- [ ] Inngest Dev Server responds at `/api/inngest`
- [ ] Test Inngest workflow executes in dashboard
- [ ] Sentry captures a test error
- [ ] Environment variables configured for all services
- [ ] CLAUDE.md in project root
- [ ] Deployed to Vercel preview

---

## 7. Testing Strategy

### 7.1 MVP Testing Philosophy

**10-15% of development time on testing.** Focus on things that would be embarrassing to break—not exhaustive coverage.

| Layer              | What to Test                                     | Coverage | Why                                         |
| ------------------ | ------------------------------------------------ | -------- | ------------------------------------------- |
| **Critical paths** | Checkout, payments, inventory deduction          | ~80%     | Money and stock accuracy are non-negotiable |
| **Data ingestion** | Excel import, normalization                      | ~70%     | Garbage in = garbage out                    |
| **Skip for MVP**   | UI components, happy-path CRUD, admin dashboards | 0%       | Can be manually tested, low risk            |

### 7.2 Testing Tools

| Tool                          | Purpose         | When to Use                                        |
| ----------------------------- | --------------- | -------------------------------------------------- |
| **Vitest**                    | Unit tests      | Business logic, utilities, normalization functions |
| **Playwright**                | E2E tests       | Critical flows: search → cart → checkout → payment |
| **React Testing Library**     | Component tests | Complex interactive components (post-MVP)          |
| **MSW (Mock Service Worker)** | API mocking     | Mock Stripe, Skydropx in tests                     |

### 7.3 What to Test (MVP)

```
✅ TEST THESE:
├── Payment calculations (order totals, platform fees, splits)
├── Inventory decrement logic (stock = 0 → auto-pause)
├── Excel import normalization (case, whitespace, position mapping)
├── OE number normalization ("04E 129 620 D" → "04E129620D")
├── Vehicle lookup queries
└── One E2E flow: search → cart → checkout → confirmation

❌ SKIP THESE (for MVP):
├── UI rendering tests
├── Basic CRUD operations
├── Admin dashboard pages
├── Email template rendering
└── Static pages
```

### 7.4 Test File Location

Test files live alongside source files:

```
lib/
├── normalize.ts
├── normalize.test.ts       # ← Right next to the source
├── pricing.ts
└── pricing.test.ts
```

### 7.5 Running Tests

```bash
npm run test              # Vitest (unit tests)
npm run test:e2e          # Playwright (E2E tests)
npm run test:coverage     # Vitest with coverage report
```

---

## 8. Git Strategy & CI/CD

### 8.1 Branch Strategy (GitHub Flow)

| Branch      | Purpose                                       | Example                |
| ----------- | --------------------------------------------- | ---------------------- |
| `main`      | Production-ready code, protected, requires PR | Always deployable      |
| `feature/*` | New features                                  | `feature/excel-import` |
| `fix/*`     | Bug fixes                                     | `fix/cart-calculation` |
| `chore/*`   | Maintenance                                   | `chore/update-deps`    |

### 8.2 Commit Messages (Conventional Commits)

```
type(scope): description

Examples:
feat(cart): add multi-manufacturer checkout
fix(search): correct vehicle lookup query
docs(api): update ACES import endpoint docs
chore(deps): upgrade next to 15.1
```

### 8.3 CI/CD Pipeline (GitHub Actions)

Every PR triggers:

| Step               | Action                            | Blocks Merge? |
| ------------------ | --------------------------------- | ------------- |
| **Lint**           | ESLint + Prettier check           | ✅ Yes        |
| **Type Check**     | `tsc --noEmit`                    | ✅ Yes        |
| **Unit Tests**     | Vitest (critical paths)           | ✅ Yes        |
| **Build**          | Next.js production build          | ✅ Yes        |
| **Preview Deploy** | Vercel auto-deploy (linked to PR) | No            |

### 8.4 Security Best Practice (Anthropic Guidance)

- Gate merges on human review + green tests
- Never auto-merge solely on AI feedback
- Treat AI-generated code as untrusted until verified
- Keep secrets out of prompts and code

---

## 9. Error Tracking & Monitoring

### 9.1 Sentry Integration

Sentry provides comprehensive error tracking for Next.js + Vercel:

- Client-side error capture (React errors, runtime exceptions)
- Server-side error capture (API routes, SSR, Edge functions)
- Performance monitoring with distributed tracing
- Session replay for debugging user-reported issues
- Source maps for readable stack traces

### 9.2 Sentry Pricing

| Plan                 | Cost      | Included                                    |
| -------------------- | --------- | ------------------------------------------- |
| **Developer (Free)** | $0/month  | 5,000 errors, 1 user, 50 replays            |
| **Team**             | $26/month | 50,000 errors, unlimited users, 500 replays |

For MVP, the free tier (5,000 errors/month) is sufficient. Upgrade when you have real traffic.

### 9.3 Setup

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Install from Vercel Marketplace for automatic release tracking, source map uploads, and log drains.

### 9.4 Monitoring Dashboards

| Service                   | What We Monitor                             |
| ------------------------- | ------------------------------------------- |
| **WorkOS Dashboard**      | User signups, auth events, organizations    |
| **Inngest Dashboard**     | Workflow executions, failures, replay       |
| **Vercel Analytics**      | Page performance, Core Web Vitals           |
| **Vercel Speed Insights** | Real user performance data                  |
| **Supabase Dashboard**    | Database size, query performance            |
| **Stripe Dashboard**      | Payment success rates, disputes             |
| **Resend Dashboard**      | Email delivery rates, bounces               |
| **Sentry**                | Errors, performance traces, session replays |

### 9.5 Alerting (Future)

- Inngest workflow failures → Slack notification
- Payment failures → Email to ops
- Low inventory warnings → Email to manufacturer
- Auth anomalies → WorkOS Radar alerts

---

## 10. Code Quality & Pre-commit Hooks

### 10.1 Husky + lint-staged

Enforce code quality on every commit. Only checks staged files (fast).

```bash
npm install -D husky lint-staged
npx husky init
```

**Configuration (package.json):**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

**Bypass when needed:** `git commit --no-verify` (intentional override).

### 10.2 Commitlint

Enforce Conventional Commits format:

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

```javascript
// commitlint.config.js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

---

## 11. API Documentation

### 11.1 Strategy: next-openapi-gen

Auto-generates OpenAPI 3.0 specs from Zod schemas + JSDoc comments in API routes.

```typescript
// Example: documented API route
/**
 * Get parts by vehicle
 * @response PartsResponseSchema
 * @openapi              ← This tag is REQUIRED
 */
export async function GET(request: Request) {
  // ...
}
```

Routes without `@openapi` tag are NOT documented (useful for internal routes).

### 11.2 ESLint Enforcement

Using `jsdoc/no-missing-syntax` to require `@openapi` tags on all public API routes. Developers can bypass with `// eslint-disable-next-line jsdoc/no-missing-syntax` (intentional override).

---

## 12. Database Seeding

### 12.1 Seed Files

Seed data lives in `supabase/seed.sql` and runs automatically on `supabase db reset`.

**Best practices:**

- Only INSERT statements (no schema changes)
- Realistic test data covering edge cases
- Include sample manufacturers, parts, vehicles, and orders
- Never commit production secrets to seed files

### 12.2 Seed Commands

| Command             | Effect                                            |
| ------------------- | ------------------------------------------------- |
| `supabase db reset` | Drops DB, runs migrations, runs seed.sql          |
| `supabase db seed`  | Runs seed.sql without dropping                    |
| `npm run seed`      | Custom TypeScript seed script (for complex logic) |

### 12.3 TypeScript Seed Script (Alternative)

For complex seeding logic beyond SQL:

```typescript
// scripts/seed.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypasses RLS
);

async function seed() {
  // Insert manufacturers, parts, vehicles, orders
}
```

---

## 13. Internationalization (i18n)

### 13.1 Framework: next-intl

Recommended library for Next.js App Router. Provides message translation, date/time/number formatting, currency formatting (MXN), and Server Component support.

### 13.2 Locale Configuration

| Locale    | Language         | Currency                   | Notes                           |
| --------- | ---------------- | -------------------------- | ------------------------------- |
| **es-MX** | Spanish (Mexico) | MXN (Mexican Peso)         | Primary — default locale        |
| **en-US** | English (US)     | MXN (prices always in MXN) | Secondary — for bilingual users |

### 13.3 File Structure

```
messages/
  es-MX.json    # Spanish translations (primary)
  en-US.json    # English translations
i18n/
  request.ts    # next-intl config
app/
  [locale]/     # Locale-prefixed routes
```

### 13.4 Formatting Examples

```typescript
// Currency (always MXN)
format.number(1499.9, { style: 'currency', currency: 'MXN' });
// → $1,499.90 MXN

// Date
format.dateTime(new Date(), 'medium');
// → 15 ene 2026 (es-MX)
```

### 13.5 Mexican Address Format

```
Calle y Número
Colonia
Código Postal, Ciudad
Estado, México
```

---

## 14. Performance Optimization

### 14.1 Vercel Best Practices

**Rendering Strategy:**

- Use Static Generation (SSG) for catalog pages where possible
- Use ISR (Incremental Static Regeneration) for product pages
- Reserve SSR for personalized/dynamic content only
- Enable Fluid Compute in Vercel project settings (3GB memory, 800s timeout vs standard 256MB/400s)

**Code Optimization:**

- Use `next/dynamic` for lazy loading heavy components
- Use `next/image` for automatic image optimization
- Use `next/font` for optimized font loading
- Place Client Components at the bottom of the component tree
- Avoid request waterfalls: parallelize with `Promise.all`
- Use bundle analyzer to identify large dependencies

### 14.2 Performance Monitoring

| Tool                      | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| **Vercel Analytics**      | Core Web Vitals (LCP, FID, CLS)             |
| **Vercel Speed Insights** | Real user performance data                  |
| **Sentry Performance**    | Distributed tracing, slow query detection   |
| **Lighthouse CI**         | Automated performance audits in CI (future) |

---

## 15. Security & Compliance

### 15.1 Data Security

| Layer                  | Implementation                                      |
| ---------------------- | --------------------------------------------------- |
| **Authentication**     | WorkOS AuthKit — redirect-based, industry standard  |
| **Session Management** | Encrypted cookies (wos-session), auto-refresh       |
| **Database**           | Supabase RLS — Row-level security for multi-tenancy |
| **Rate Limiting**      | WorkOS Radar — built-in bot protection              |
| **Payments**           | Stripe Connect — PCI compliance handled by Stripe   |
| **Webhooks**           | Signature verification (WorkOS, Stripe, Inngest)    |
| **Secrets**            | Vercel env vars — All secrets encrypted             |
| **Error Tracking**     | Sentry — no sensitive data in error reports         |

### 15.2 Why Redirect-Based Auth is More Secure

| Security Concern            | Embedded Login | Redirect Login (AuthKit)            |
| --------------------------- | -------------- | ----------------------------------- |
| **Cross-origin attacks**    | 🔴 Vulnerable  | ✅ Protected                        |
| **Phishing risk**           | 🔴 Higher      | ✅ Lower (users see trusted domain) |
| **XSS credential theft**    | 🔴 Possible    | ✅ Credentials never touch app      |
| **App access to passwords** | 🔴 Yes         | ✅ No                               |

### 15.3 File Upload Security

| Control              | Implementation                   |
| -------------------- | -------------------------------- |
| File type validation | Only Excel, CSV (XML for future) |
| File size limits     | Max 10MB per upload              |
| Access control       | Signed URLs with expiration      |

### 15.4 Post-MVP Security Items

- Rate limiting on API routes (beyond WorkOS Radar)
- File upload malware scanning
- CORS configuration hardening
- Security audit and penetration testing

---

## 16. Deployment

### 16.1 Environments

| Environment | URL                   | Purpose           |
| ----------- | --------------------- | ----------------- |
| Development | localhost:3000        | Local development |
| Preview     | \*.vercel.app         | PR previews       |
| Production  | refaccionesdirect.com | Live site         |

### 16.2 WorkOS Dashboard Configuration

| Environment | Redirect URI                           | Sign-out Redirect             |
| ----------- | -------------------------------------- | ----------------------------- |
| Development | http://localhost:3000/callback         | http://localhost:3000         |
| Preview     | https://\*.vercel.app/callback         | (use wildcard)                |
| Production  | https://refaccionesdirect.com/callback | https://refaccionesdirect.com |

### 16.3 CI/CD Pipeline

```
Push to GitHub → Vercel Build → Preview Deploy
Merge to main  → Vercel Build → Production Deploy
```

### 16.4 Database Migrations

```bash
supabase migration new <name>    # Create new migration
supabase db push                 # Push to remote
supabase db reset                # Reset local (migrations + seed)
```

---

## 17. Claude Code Integration

### 17.1 CLAUDE.md

The project root contains a `CLAUDE.md` file that gives Claude Code context about our architecture:

```markdown
# RefaccionesDirect - Auto Parts Marketplace

## Tech Stack

- Framework: Next.js 15 (App Router)
- Database: Supabase (Postgres + Storage)
- Auth: WorkOS AuthKit
- Payments: Stripe Connect
- Background Jobs: Inngest
- Shipping: Skydropx API
- Email: Resend
- i18n: next-intl (es-MX primary, en-US secondary)
- Error Tracking: Sentry

## Commands

- npm run dev: Start development server
- npm run build: Build for production
- npm run typecheck: Run TypeScript checks
- npm run lint: Run ESLint
- npm run test: Run Vitest
- supabase start: Start local Supabase (Docker)
- supabase db reset: Reset DB + run migrations + seed

## Code Style

- TypeScript strict mode
- Server components by default, client components when needed
- Supabase RLS for data access control
- Inngest for all multi-step workflows
- Conventional Commits (feat/fix/chore)

## Architecture

- API routes: app/api/
- Inngest functions: inngest/functions/
- Database types: types/database.ts
- Workflow nodes: lib/workflows/nodes/
- Translations: messages/es-MX.json, messages/en-US.json

## Key Patterns

- RLS policies for multi-tenant data (manufacturer_id)
- Event-driven architecture via Inngest
- Batch database operations (500 records max)
- All API routes require @openapi JSDoc tag

## Testing

- Critical paths only (10-15% time budget)
- Test files alongside source: \*.test.ts
- Run tests before committing
```

### 17.2 Recommended MCP Servers

| MCP Server        | Purpose                                                                                         | Priority     |
| ----------------- | ----------------------------------------------------------------------------------------------- | ------------ |
| **Supabase MCP**  | Query database directly, manage schema (official: supabase.com/docs/guides/getting-started/mcp) | Essential    |
| **Puppeteer MCP** | Screenshot testing, visual verification                                                         | Nice-to-have |
| **GitHub MCP**    | PR management (less needed with Claude Code native git)                                         | Optional     |

### 17.3 Workflow: Explore → Plan → Code → Commit

Per Anthropic's best practices:

1. **Explore** — Read existing code, understand context
2. **Plan** — Outline approach before writing code
3. **Code** — Implement with small, testable changes
4. **Commit** — Write clear commit messages, create PR

Use "think hard" or "ultrathink" for complex decisions. Use `/clear` to reset context between tasks.

---

## 18. Development Phases

### Phase 0: Skeleton (Week 1-2)

- [ ] Next.js app setup with TypeScript
- [ ] Supabase project + local Docker + database schema
- [ ] WorkOS AuthKit integration (middleware, callback, login)
- [ ] Inngest setup + test workflow
- [ ] Sentry integration
- [ ] i18n setup (next-intl, es-MX/en-US)
- [ ] Husky + lint-staged + commitlint
- [ ] CLAUDE.md + .mcp.json
- [ ] Basic CI/CD with Vercel + GitHub Actions
- [ ] Deploy skeleton to preview

### Phase 1: Core Features (Week 3-6)

- [ ] User sync to Supabase (onSuccess callback)
- [ ] Excel import workflow (three-layer validation)
- [ ] Image upload manager ("Gestor de Fotos")
- [ ] Product search (vehicle lookup + OE number)
- [ ] Cart & checkout (Stripe Connect)
- [ ] Database seed script with realistic test data

### Phase 2: Advanced Features (Week 7-10)

- [ ] Order fulfillment workflow
- [ ] Shipping label generation (Skydropx)
- [ ] Manufacturer organization setup (WorkOS)
- [ ] WorkOS Widgets (UsersManagement, UserProfile)
- [ ] Seller display options (brand-only vs company name)
- [ ] Email notifications (Resend)
- [ ] Quick price/stock update workflow
- [ ] API documentation (next-openapi-gen)

### Phase 3: Polish & Launch (Week 11-12)

- [ ] Manufacturer dashboard UI
- [ ] Testing: critical paths + one E2E flow
- [ ] Performance optimization (SSG, ISR, image optimization)
- [ ] Production deployment
- [ ] WorkOS Dashboard branding (logo, colors)
- [ ] Test with Humberto's sample file

### Future Phases (Post-Launch)

- ⏳ Enterprise SSO for large manufacturers ($125/connection)
- ⏳ ACES XML import (if US manufacturers join)
- ⏳ VCdb integration (if data validation needed)
- ⏳ Bulk pricing tiers (Costco model)
- ⏳ ERP API integrations
- ⏳ Customer support infrastructure
- ⏳ Accessibility audit

---

## 19. Key Architectural Decisions Summary

| Decision                  | Choice                   | Rationale                                                |
| ------------------------- | ------------------------ | -------------------------------------------------------- |
| **Auth provider**         | WorkOS AuthKit           | Free to 1M MAU, organizations built-in, widgets, secure  |
| **VCdb subscription**     | ❌ NOT NEEDED            | Manufacturers provide vehicle data in Excel              |
| **Primary import format** | Excel                    | Matches how Mexican manufacturers work                   |
| **Background jobs**       | Inngest                  | Zero infra, free tier, Vercel-native                     |
| **Vehicle data source**   | Manufacturer-provided    | Grows organically, no external dependency                |
| **Payment processor**     | Stripe Connect           | Handles multi-vendor splits automatically                |
| **Payout strategy**       | Stripe automatic payouts | Weekly default, no custom cron jobs needed               |
| **Error tracking**        | Sentry                   | Industry standard for Next.js + Vercel                   |
| **i18n framework**        | next-intl                | Best Next.js App Router support, locale-aware formatting |
| **Testing approach**      | Critical paths only      | 10-15% time budget, Vitest + Playwright                  |
| **Git strategy**          | GitHub Flow              | Simple, PR-based, Conventional Commits                   |
| **API documentation**     | next-openapi-gen         | Auto-generated from code, enforced via ESLint            |
| **Pre-commit hooks**      | Husky + lint-staged      | Fast (staged files only), bypassable                     |

---

## Appendix A: WorkOS AuthKit Quick Reference

### Installation

```bash
npm install @workos-inc/authkit-nextjs @workos-inc/widgets
```

### Key Imports

```typescript
// Server components
import { withAuth, getSignInUrl, signOut, handleAuth } from '@workos-inc/authkit-nextjs';

// Client components
import { useAuth } from '@workos-inc/authkit-nextjs/components';

// Middleware
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

// Widgets
import {
  UsersManagement,
  UserProfile,
  OrganizationSwitcher,
  WorkOSWidgets,
} from '@workos-inc/widgets';

// WorkOS SDK (for admin operations)
import { getWorkOS } from '@workos-inc/authkit-nextjs';
```

### Common Patterns

```typescript
// Get current user (server)
const { user, organizationId } = await withAuth();

// Require auth (server)
const { user } = await withAuth({ ensureSignedIn: true });

// Get current user (client)
const { user, loading } = useAuth();

// Sign out
await signOut();
```

---

## Appendix B: Stripe Connect Mexico Specifics

**Note:** The Stripe fee structure for Mexico was researched early in the project. Two different fee structures appeared across documents:

| Source                       | Transaction Fee | Notes                             |
| ---------------------------- | --------------- | --------------------------------- |
| Early research (Concept doc) | 3.6% + MXN$3    | Mexico-specific Stripe pricing    |
| Cost Analysis v5             | 2.9% + $0.30    | Simplified/generic Stripe pricing |

Platform fee strategy (9-10% flat rate) and money flow details are documented in **Data Architecture Spec** and **Cost Analysis**. Verify current Stripe Mexico pricing at [stripe.com/mx/pricing](https://stripe.com/mx/pricing) before launch.

---

## Appendix C: Full Dependency List

### Production Dependencies

```bash
npm install @workos-inc/authkit-nextjs @workos-inc/widgets
npm install @supabase/supabase-js @supabase/ssr
npm install inngest
npm install stripe
npm install resend
npm install zod
npm install next-intl
```

### Development Dependencies

```bash
npm install -D @sentry/nextjs
npm install -D vitest @vitejs/plugin-react
npm install -D @playwright/test
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D husky lint-staged
npm install -D @commitlint/cli @commitlint/config-conventional
npm install -D prettier eslint-config-prettier
npm install -D @types/node
```

---

**End of Document**

RefaccionesDirect Technical Architecture v7.0 | February 2026
