# Import Pipeline Analysis — ACR-Automotive → RefaccionesDirect

## Your Task

Analyze the ACR-Automotive import/export pipeline codebase and evaluate what can be extracted into a **publishable npm package** (`@refacciones/import-pipeline`) that both ACR-Automotive (single-manufacturer storefront) and RefaccionesDirect (multi-manufacturer marketplace) can consume.

---

## Context: Two Products, One Pipeline

### Product 1: ACR-Automotive (EXISTING — already built)

- **What:** A standalone Next.js e-commerce site for a single auto parts manufacturer (Humberto/ACR)
- **Stack:** Next.js, Supabase, deployed on Vercel
- **Import system:** Already built and working — Excel upload with validation, diff preview, atomic execution, rollback, and history tracking
- **Audience:** Single manufacturer managing their own catalog

### Product 2: RefaccionesDirect (PLANNED — in architecture phase)

- **What:** A multi-manufacturer auto parts marketplace (like Amazon for Mexican auto parts)
- **Stack:** Next.js, Supabase, WorkOS AuthKit, Inngest (background jobs), Stripe Connect, Skydropx, Vercel
- **Import system:** Needs to support multiple manufacturers uploading catalogs via Excel
- **Key differences from ACR:**
  - **Multi-tenant:** Each manufacturer has their own catalog isolated by `manufacturer_id`
  - **Three separate import workflows:** "Import New Parts", "Update Catalog", "Quick Price/Stock Update"
  - **Three-layer validation:** Excel template formulas (Layer 1) → server-side normalization (Layer 2) → partial success with error file (Layer 3)
  - **Explicit action model:** Creating and updating are SEPARATE operations. Missing items are NEVER auto-deleted.
  - **Background processing:** Uses Inngest for async processing (manufacturer can navigate away, gets email when done)
  - **Additional fields:** Vehicle fitment data (Make, Model, Year Start, Year End, Engine, Submodel), OE cross-references, position/drive-type qualifiers
  - **Normalization:** Auto-fixes case inconsistencies, standardizes position names (Spanish → English), drive types (4X4 → 4WD), trims whitespace
  - **Platform fee:** 9% platform fee deducted from manufacturer payouts via Stripe Connect

### The Goal

Extract the **core pipeline logic** (parsing, validation, diffing, normalization, bulk operations) into a shared package. Keep the **UI components, API routes, and app-specific logic** in each respective app.

---

## Files to Analyze

Read ALL of these files from the ACR-Automotive repo (branch: `dev`):

### Core Services (START HERE — most important)

```
src/services/excel/import/ImportService.ts        — Main orchestrator
src/services/excel/import/ExcelImportService.ts   — Excel-specific parsing/validation
src/services/excel/import/types.ts                — Type definitions
src/services/excel/import/index.ts                — Public exports
src/services/excel/shared/types.ts                — Shared type definitions
src/services/excel/shared/constants.ts            — Shared constants
src/services/excel/diff/DiffEngine.ts             — Diff computation engine
src/services/bulk-operations/BulkOperationsService.ts — Database bulk operations
src/services/export/ExcelExportService.ts         — Export service
```

### API Routes (how the pipeline is exposed)

```
src/app/api/admin/import/_helpers.ts
src/app/api/admin/import/preview/route.ts
src/app/api/admin/import/validate/route.ts
src/app/api/admin/import/execute/route.ts
src/app/api/admin/import/rollback/route.ts
src/app/api/admin/import/history/route.ts
src/app/api/admin/export/route.ts
```

### UI Components (for understanding the UX flow)

```
src/app/admin/import/page.tsx
src/components/features/admin/import/ImportWizard.tsx
src/components/features/admin/import/ImportStepIndicator.tsx
src/components/features/admin/import/ImportHistoryPanel.tsx
src/components/features/admin/import/steps/ImportStep1Upload.tsx
src/components/features/admin/import/steps/ImportStep2Validation.tsx
src/components/features/admin/import/steps/ImportStep2DiffPreview.tsx
src/components/features/admin/import/utils/exportErrorReport.ts
```

### Database Migrations (schema context)

```
supabase/migrations/20251022010000_add_import_history.sql
supabase/migrations/20251028000000_add_atomic_import_transaction.sql
supabase/migrations/20251028000001_comment_execute_atomic_import.sql
supabase/migrations/20260129000000_drop_old_import_function.sql
supabase/migrations/20260129000001_create_import_function.sql
supabase/migrations/20260211000000_fix_import_preserve_360_viewer.sql
```

### Tests (quality/coverage context)

```
tests/e2e/admin-import.spec.ts
tests/e2e/export-coverage.spec.ts
tests/integration/malformed-files.test.ts
tests/unit/excel/workbook-builder.test.ts
tests/e2e/helpers/workbook-builder.ts
tests/helpers/test-snapshot.ts
```

### Documentation

```
docs/developer-guide/excel-processing/import.mdx
docs/developer-guide/excel-processing/export.mdx
docs/admin-guide/importing-data.mdx
docs/admin-guide/exporting-data.mdx
```

---

## What I Need From You

After reading all the files, produce a comprehensive analysis document covering:

### 1. Architecture Map

- How the current pipeline works end-to-end (upload → parse → validate → diff → preview → execute → rollback)
- What each service/class is responsible for
- How data flows between services
- What's coupled to Supabase vs. what's generic
- What's coupled to the ACR-specific schema vs. what's generalizable

### 2. Package Extraction Plan

Identify what belongs in the shared package vs. what stays app-specific:

**Likely belongs in `@refacciones/import-pipeline`:**

- Excel parsing logic (reading workbooks, mapping columns)
- Validation engine (field validation, type checking, error collection)
- Normalization engine (case fixing, whitespace trimming, value standardization)
- Diff engine (comparing uploaded data vs. existing data)
- Error report generation
- Type definitions and interfaces
- Constants and configuration

**Likely stays in each app:**

- API routes (different auth, different middleware)
- UI components (different UX per app)
- Database operations (different schemas, different RLS policies)
- Inngest workflows (RefaccionesDirect only)
- Supabase-specific storage operations

### 3. Adaptation Requirements for RefaccionesDirect

What needs to change or be added for the marketplace context:

- Multi-tenant support (manufacturer_id scoping)
- Additional fields (vehicle fitment, OE cross-refs, qualifiers)
- Additional normalization rules (Spanish → English position names, drive types)
- Three separate workflow modes (new parts, update catalog, quick price/stock)
- Explicit action model (never auto-delete)
- Partial success with downloadable error file
- Background processing via Inngest (vs. synchronous in ACR)

### 4. Package API Design

Propose the public API surface of the package:

- What functions/classes would be exported?
- How would consumers configure it (schema definitions, validation rules, normalization maps)?
- How would it handle different database backends?
- How would it handle different Excel template structures?

### 5. Migration Path

How would ACR-Automotive migrate to consuming the published package instead of its local code:

- What refactoring is needed?
- Can it be done incrementally?
- What tests need updating?

### 6. Monorepo vs. Published Package Recommendation

Given this analysis, confirm or revise the recommendation:

- Should the package live in a monorepo with RefaccionesDirect, or be a standalone published npm package?
- What's the publishing strategy (npm public, GitHub Packages private, or monorepo internal)?
- What's the versioning strategy?

---

## RefaccionesDirect Data Architecture Context

Here are the key specs from the RefaccionesDirect architecture that the pipeline needs to support:

### Database Schema (core tables)

```sql
-- Parts table (multi-tenant)
CREATE TABLE parts (
  id UUID PRIMARY KEY,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  sku VARCHAR(50) NOT NULL,
  factory_part_number VARCHAR(50),
  upc VARCHAR(14),
  brand VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  condition VARCHAR(20) DEFAULT 'new',
  status VARCHAR(20) DEFAULT 'active'  -- active, paused, discontinued
    CHECK (status IN ('active', 'paused', 'discontinued')),
  image_urls TEXT[],
  is_active BOOLEAN DEFAULT true,
  UNIQUE(manufacturer_id, sku)
);

-- Vehicles (built from manufacturer uploads)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year_start INTEGER NOT NULL,
  year_end INTEGER NOT NULL,
  engine VARCHAR(50),
  submodel VARCHAR(100),
  UNIQUE(make, model, year_start, year_end, engine, submodel)
);

-- Fitments (links parts to vehicles)
CREATE TABLE fitments (
  id UUID PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  qualifiers JSONB DEFAULT '{}',  -- {"position": "Front", "driveType": "4WD", "withABS": true}
  UNIQUE(part_id, vehicle_id, qualifiers)
);

-- OE Cross-References
CREATE TABLE oe_crossrefs (
  id UUID PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  oe_number VARCHAR(50) NOT NULL,
  oe_number_normalized VARCHAR(50) NOT NULL,
  oe_brand VARCHAR(100),
  UNIQUE(part_id, oe_number)
);

-- Import Jobs (tracking)
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  import_type VARCHAR(20) NOT NULL  -- 'full_catalog', 'quick_update', 'new_parts'
    CHECK (import_type IN ('full_catalog', 'quick_update', 'new_parts')),
  status VARCHAR(20) DEFAULT 'pending',
  file_url VARCHAR(500),
  total_rows INTEGER,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_file_url VARCHAR(500),
  normalizations_applied JSONB DEFAULT '[]'
);
```

### Excel Template Fields (what manufacturers upload)

```
Vehicle Fitment:  Make, Model, Year Start, Year End, Engine, Submodel
Part Info:        Brand, SKU, Factory Part #, UPC, Category, Name, Description
Attributes:       Position, DriveType, With ABS, Bolt Count (category-specific)
Pricing:          Price (min $35 MXN), Currency (MXN/USD), Stock, Condition, Status
Images:           Image URLs (comma-separated)
OE Cross-Refs:    OE Part # 1-4
```

### Normalization Rules

```typescript
// Make: "CHEVROLET" → "Chevrolet", "VW" → "Volkswagen", "CHEVY" → "Chevrolet"
// Position: "Delantera" → "Front", "TRASERA" → "Rear", "FL" → "Front Left"
// DriveType: "4X4" → "4WD", "4 X 4" → "4WD", "Front Wheel" → "FWD"
// OE Numbers: "04E 129 620 D" → normalized: "04E129620D" (strip spaces/dashes)
// General: trim whitespace, collapse multiple spaces, remove zero-width chars
// UPC: strip non-digits, validate 8-14 digit length
// Price: parse number, enforce min $35 MXN, round to 2 decimals
```

### Three Import Workflows

1. **"Import New Parts"** — Creates NEW parts only, skips existing SKUs
2. **"Update Catalog"** — Downloads current catalog as Excel, user modifies, re-uploads (updates ONLY rows in file, untouched items stay untouched)
3. **"Quick Price/Stock Update"** — Lightweight: SKU + Price + Stock + Status only, no fitment data

### Data Quality Reality (from Humberto's actual file: 29,505 fitments, 1,071 parts)

- Case inconsistency: 39 of 66 makes affected ("Chevrolet" vs "CHEVROLET")
- Trailing spaces common ("NISSAN ", "REAR ")
- Position variations: "Front" vs "FRONT" vs "FL"
- DriveType variations: "4WD" vs "4 X 4" vs "4X2"

---

## Deliverable

A single comprehensive markdown document with all 6 sections above. Be specific — include code snippets, proposed interfaces, and concrete file paths. Think of this as a technical design document that I'll use to actually build the package.
