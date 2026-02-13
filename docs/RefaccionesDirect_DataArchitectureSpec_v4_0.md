---
document: Data Architecture Specification
project: RefaccionesDirect
version: 4.0
updated: January 2026
status: Ready for Development

purpose: |
  Defines WHAT the data looks likeâ€”database schemas, import templates, 
  business rules, data flows, and platform behavior.

owns:
  - Database schema (tables, relationships, constraints)
  - Excel import template specification (fields, validation, normalization)
  - Import workflow architecture (based on ML research)
  - Catalog update and lifecycle management
  - Part number hierarchy and OE cross-reference system
  - Vehicle data strategy (no VCdb needed)
  - Search architecture and UX patterns
  - Multi-manufacturer cart/checkout flow
  - Shipping and order tracking logic
  - Seller display options (anonymity feature)
  - Return and refund policies
  - Inventory management rules
  - Platform fee strategy
  - Initial product categories

does_not_own:
  - Technology stack choices â†’ see Technical Architecture
  - Infrastructure costs â†’ see Technical Architecture
  - Code/folder structure â†’ see Technical Architecture
  - Inngest workflow implementation details â†’ see Technical Architecture
  - Deployment and DevOps â†’ see Technical Architecture
  - Development timeline â†’ see Technical Architecture

related_documents:
  - RefaccionesDirect_TechnicalArchitecture_v5.1.md (HOW we build it)
  - RefaccionesDirect_Questions_Pending_v3.md (open decisions)
  - MercadoLibre_Template_Analysis.md (ML template research)
---

# RefaccionesDirect
## Data Architecture Specification

**Version 4.0** | January 2026  
**CONFIDENTIAL**

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial specification |
| 2.0 | Jan 2026 | Consolidated pipeline spec; added VCdb strategy |
| 2.5 | Jan 2026 | Search Architecture: decided Postgres for MVP |
| 3.0 | Jan 2026 | Stakeholder validation; confirmed facts integrated |
| 3.1 | Jan 2026 | Removed duplicates with Technical Architecture; added frontmatter |
| **4.0** | **Jan 2026** | **ðŸ†• Major update: Integrated ML deep dive research; defined three-layer validation system; documented explicit action model for catalog updates; resolved pending questions 1.4, 3.2, 3.4, 3.5, 6.1** |

---

## 1. Database Schema

### 1.1 Entity Relationship Overview

```
manufacturers (sellers)
    â”‚
    â”œâ”€â”€ parts (products)
    â”‚       â”‚
    â”‚       â”œâ”€â”€ fitments â”€â”€â”€â”€ vehicles
    â”‚       â”‚
    â”‚       â””â”€â”€ oe_crossrefs (OEM number lookups)
    â”‚
    â”œâ”€â”€ import_jobs (catalog import tracking) ðŸ†•
    â”‚
    â””â”€â”€ orders
            â”‚
            â””â”€â”€ order_items
```

### 1.2 Core Tables

```sql
-- Manufacturers (sellers)
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_name VARCHAR(255) NOT NULL,      -- Legal name (internal)
  brand_name VARCHAR(100) NOT NULL,         -- Public brand name
  display_mode VARCHAR(20) DEFAULT 'brand_only'  
    CHECK (display_mode IN ('brand_only', 'company_name')),
  rfc VARCHAR(13),                          -- Mexican tax ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles (built from manufacturer uploads)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year_start INTEGER NOT NULL,
  year_end INTEGER NOT NULL,
  engine VARCHAR(50),
  submodel VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(make, model, year_start, year_end, engine, submodel)
);

-- Parts (products)
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  sku VARCHAR(50) NOT NULL,                 -- Customer-facing part number
  factory_part_number VARCHAR(50),          -- Internal mfr code (not displayed)
  upc VARCHAR(14),                          -- Barcode (GTIN)
  brand VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD')),
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  condition VARCHAR(20) DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished')),
  status VARCHAR(20) DEFAULT 'active'       -- ðŸ†• Explicit status field
    CHECK (status IN ('active', 'paused', 'discontinued')),
  image_urls TEXT[],
  is_active BOOLEAN DEFAULT true,           -- Computed from status + quantity
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(manufacturer_id, sku)
);

-- Fitments (links parts to vehicles)
CREATE TABLE fitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  qualifiers JSONB DEFAULT '{}',  -- {"position": "Front", "driveType": "4WD", "withABS": true}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(part_id, vehicle_id, qualifiers)
);

-- OE Cross-References (for OEM number search)
CREATE TABLE oe_crossrefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  oe_number VARCHAR(50) NOT NULL,           -- Original format: "04E 129 620 D"
  oe_number_normalized VARCHAR(50) NOT NULL, -- Searchable: "04E129620D"
  oe_brand VARCHAR(100),                    -- VW, Toyota, Ford, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(part_id, oe_number)
);

-- ðŸ†• Import Jobs (tracks catalog imports)
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  import_type VARCHAR(20) NOT NULL          -- 'full_catalog', 'quick_update', 'new_parts'
    CHECK (import_type IN ('full_catalog', 'quick_update', 'new_parts')),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url VARCHAR(500),                    -- Supabase Storage URL
  total_rows INTEGER,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_file_url VARCHAR(500),              -- URL to download error report
  normalizations_applied JSONB DEFAULT '[]', -- Log of auto-fixes made
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ðŸ†• Import Errors (detailed error tracking)
CREATE TABLE import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  original_data JSONB NOT NULL,             -- The row as uploaded
  error_type VARCHAR(50) NOT NULL,          -- 'missing_required', 'invalid_format', etc.
  error_message TEXT NOT NULL,
  field_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search performance
CREATE INDEX idx_vehicles_make ON vehicles(make);
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_brand ON parts(brand);
CREATE INDEX idx_parts_sku ON parts(sku);
CREATE INDEX idx_parts_status ON parts(status);
CREATE INDEX idx_oe_normalized ON oe_crossrefs(oe_number_normalized);
CREATE INDEX idx_fitments_vehicle ON fitments(vehicle_id);
CREATE INDEX idx_fitments_part ON fitments(part_id);
CREATE INDEX idx_import_jobs_manufacturer ON import_jobs(manufacturer_id);
```

### 1.3 Order Tables

```sql
-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_total DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',
  shipping_address JSONB NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items (one per manufacturer in order)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  part_id UUID NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2),
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  skydropx_shipment_id VARCHAR(100),
  label_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Import System Architecture ðŸ†•

This section defines how catalog data flows into the system. Design is based on extensive research of Mercado Libre's import system.

### 2.1 Core Principle: Explicit Action Model

**CRITICAL DECISION:** Based on ML research, we use an **explicit action model** where:

1. **Creating and updating are SEPARATE operations**
2. **Missing items are NEVER auto-deleted**
3. **Deletion requires explicit user action**

This prevents accidental data loss when uploading partial files.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    EXPLICIT ACTION MODEL                            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                     â”‚
â”‚  THREE SEPARATE WORKFLOWS:                                          â”‚
â”‚                                                                     â”‚
â”‚  1. "Import New Parts"                                              â”‚
â”‚     â””â”€â”€ Creates NEW parts only                                      â”‚
â”‚     â””â”€â”€ Ignores rows where SKU already exists                       â”‚
â”‚     â””â”€â”€ Returns: "X created, Y skipped (already exist)"             â”‚
â”‚                                                                     â”‚
â”‚  2. "Update Catalog"                                                â”‚
â”‚     â””â”€â”€ Downloads manufacturer's CURRENT parts as Excel             â”‚
â”‚     â””â”€â”€ User modifies values                                        â”‚
â”‚     â””â”€â”€ Re-upload updates ONLY rows in file                         â”‚
â”‚     â””â”€â”€ Items NOT in file are UNTOUCHED                             â”‚
â”‚                                                                     â”‚
â”‚  3. "Quick Price/Stock Update"                                      â”‚
â”‚     â””â”€â”€ Lightweight update (SKU + Price + Stock only)               â”‚
â”‚     â””â”€â”€ No fitment data required                                    â”‚
â”‚     â””â”€â”€ Fast path for routine inventory updates                     â”‚
â”‚                                                                     â”‚
â”‚  DELETION:                                                          â”‚
â”‚  â””â”€â”€ Explicit "Status" column with value "discontinued"             â”‚
â”‚  â””â”€â”€ OR: Set quantity = 0 (auto-pauses, keeps data)                 â”‚
â”‚  â””â”€â”€ NEVER auto-delete based on missing rows                        â”‚
â”‚                                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.2 Three-Layer Validation System

**CRITICAL DECISION:** Based on ML research, we implement three layers of validation:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                 THREE-LAYER VALIDATION SYSTEM                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                     â”‚
â”‚  LAYER 1: TEMPLATE-LEVEL (In Excel, before upload)                  â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  â€¢ "Resumen de Errores" column with Excel formulas                  â”‚
â”‚  â€¢ Pre-populated dropdowns from hidden sheet                        â”‚
â”‚  â€¢ Real-time validation while user edits                            â”‚
â”‚  â€¢ Gray cell = valid, Red cell = error with message                 â”‚
â”‚                                                                     â”‚
â”‚  Benefits:                                                          â”‚
â”‚  â€¢ Users see errors BEFORE uploading                                â”‚
â”‚  â€¢ Reduces server load (bad files never uploaded)                   â”‚
â”‚  â€¢ Better UX (immediate feedback)                                   â”‚
â”‚                                                                     â”‚
â”‚  LAYER 2: SERVER-SIDE NORMALIZATION (Auto-fix)                      â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  â€¢ Trim whitespace from all fields                                  â”‚
â”‚  â€¢ Normalize case for Make, Model, Position, DriveType              â”‚
â”‚  â€¢ Standardize known variations (4X4 â†’ 4WD)                         â”‚
â”‚  â€¢ Log ALL changes made for transparency                            â”‚
â”‚                                                                     â”‚
â”‚  Benefits:                                                          â”‚
â”‚  â€¢ Accommodates real-world messy data                               â”‚
â”‚  â€¢ Doesn't reject files for trivial issues                          â”‚
â”‚  â€¢ Audit trail of modifications                                     â”‚
â”‚                                                                     â”‚
â”‚  LAYER 3: PARTIAL SUCCESS + ERROR FILE                              â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  â€¢ Process ALL valid rows                                           â”‚
â”‚  â€¢ Collect errors for invalid rows                                  â”‚
â”‚  â€¢ Return downloadable error file with:                             â”‚
â”‚    - Only the failed rows                                           â”‚
â”‚    - "Error" column with specific message                           â”‚
â”‚    - User fixes and re-uploads just the errors                      â”‚
â”‚  â€¢ Email notification with summary                                  â”‚
â”‚                                                                     â”‚
â”‚  Benefits:                                                          â”‚
â”‚  â€¢ One bad row doesn't block 999 good ones                          â”‚
â”‚  â€¢ Clear path to fix issues                                         â”‚
â”‚  â€¢ Matches ML's proven workflow                                     â”‚
â”‚                                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.3 Import Workflow: Full Catalog

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    FULL CATALOG IMPORT FLOW                         â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                     â”‚
â”‚  1. MANUFACTURER DOWNLOADS TEMPLATE                                 â”‚
â”‚     â”œâ”€â”€ Clicks "Download Import Template" in dashboard              â”‚
â”‚     â”œâ”€â”€ System generates personalized Excel with:                   â”‚
â”‚     â”‚   â”œâ”€â”€ Manufacturer ID embedded (hidden cell)                  â”‚
â”‚     â”‚   â”œâ”€â”€ Category-specific columns                               â”‚
â”‚     â”‚   â”œâ”€â”€ Dropdown options from our database                      â”‚
â”‚     â”‚   â””â”€â”€ Validation formulas pre-built                           â”‚
â”‚     â””â”€â”€ Template valid for 30 days (prevents stale dropdowns)       â”‚
â”‚                                                                     â”‚
â”‚  2. MANUFACTURER FILLS TEMPLATE                                     â”‚
â”‚     â”œâ”€â”€ Adds rows for each part + vehicle fitment                   â”‚
â”‚     â”œâ”€â”€ "Resumen de Errores" column shows issues in real-time       â”‚
â”‚     â”œâ”€â”€ Uploads images via "Gestor de Fotos" link                   â”‚
â”‚     â”‚   â””â”€â”€ Pastes URLs back into Excel                             â”‚
â”‚     â””â”€â”€ Limit: 10,000 rows per upload                               â”‚
â”‚                                                                     â”‚
â”‚  3. UPLOAD & VALIDATION                                             â”‚
â”‚     â”œâ”€â”€ File uploaded to Supabase Storage                           â”‚
â”‚     â”œâ”€â”€ Inngest job triggered for processing                        â”‚
â”‚     â”œâ”€â”€ For each row:                                               â”‚
â”‚     â”‚   â”œâ”€â”€ Validate required fields                                â”‚
â”‚     â”‚   â”œâ”€â”€ Normalize data (Layer 2)                                â”‚
â”‚     â”‚   â”œâ”€â”€ Check SKU: exists? â†’ UPDATE, else â†’ CREATE              â”‚
â”‚     â”‚   â””â”€â”€ If valid: process, else: add to error list              â”‚
â”‚     â””â”€â”€ User can navigate away (email when done)                    â”‚
â”‚                                                                     â”‚
â”‚  4. RESULTS                                                         â”‚
â”‚     â”œâ”€â”€ Dashboard shows: "847 created, 12 updated, 5 errors"        â”‚
â”‚     â”œâ”€â”€ Email sent with summary + links                             â”‚
â”‚     â”œâ”€â”€ Error file available for download                           â”‚
â”‚     â”‚   â””â”€â”€ Contains: original row + error message column           â”‚
â”‚     â””â”€â”€ Normalizations log available for review                     â”‚
â”‚                                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.4 Import Workflow: Quick Price/Stock Update

This is a lightweight workflow for routine inventory updates, similar to ML's "Modificar desde Excel":

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  QUICK UPDATE WORKFLOW                              â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                     â”‚
â”‚  1. DOWNLOAD CURRENT CATALOG                                        â”‚
â”‚     â”œâ”€â”€ Manufacturer clicks "Download Current Parts"                â”‚
â”‚     â”œâ”€â”€ System exports their parts as Excel:                        â”‚
â”‚     â”‚   â”œâ”€â”€ SKU (read-only identifier)                              â”‚
â”‚     â”‚   â”œâ”€â”€ Name (read-only, for reference)                         â”‚
â”‚     â”‚   â”œâ”€â”€ Current Price (editable)                                â”‚
â”‚     â”‚   â”œâ”€â”€ Current Stock (editable)                                â”‚
â”‚     â”‚   â””â”€â”€ Status (editable: active/paused/discontinued)           â”‚
â”‚     â””â”€â”€ NO fitment data (keeps file small and fast)                 â”‚
â”‚                                                                     â”‚
â”‚  2. MANUFACTURER EDITS                                              â”‚
â”‚     â”œâ”€â”€ Changes prices as needed                                    â”‚
â”‚     â”œâ”€â”€ Updates stock quantities                                    â”‚
â”‚     â”œâ”€â”€ Optionally marks items as discontinued                      â”‚
â”‚     â””â”€â”€ Does NOT need to re-enter vehicle fitments                  â”‚
â”‚                                                                     â”‚
â”‚  3. UPLOAD                                                          â”‚
â”‚     â”œâ”€â”€ Only SKU, Price, Stock, Status columns processed            â”‚
â”‚     â”œâ”€â”€ Match by SKU â†’ Update fields                                â”‚
â”‚     â”œâ”€â”€ Unknown SKUs â†’ Error (not auto-created)                     â”‚
â”‚     â””â”€â”€ Missing SKUs â†’ UNTOUCHED (explicit action model)            â”‚
â”‚                                                                     â”‚
â”‚  USE CASES:                                                         â”‚
â”‚  â”œâ”€â”€ Monthly price adjustments                                      â”‚
â”‚  â”œâ”€â”€ Weekly inventory sync                                          â”‚
â”‚  â”œâ”€â”€ Discontinuing products                                         â”‚
â”‚  â””â”€â”€ Reactivating paused products                                   â”‚
â”‚                                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.5 Part Lifecycle States

Based on ML research, parts have explicit status management:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                     PART STATUS LIFECYCLE                           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                     â”‚
â”‚  STATUSES:                                                          â”‚
â”‚                                                                     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                                       â”‚
â”‚  â”‚  ACTIVE  â”‚ â† Default for new parts                               â”‚
â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜                                                       â”‚
â”‚       â”‚                                                             â”‚
â”‚       â”‚ Stock = 0 (auto) OR manual pause                            â”‚
â”‚       â–¼                                                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                                       â”‚
â”‚  â”‚  PAUSED  â”‚ â† Hidden from search, data preserved                  â”‚
â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜                                                       â”‚
â”‚       â”‚                                                             â”‚
â”‚       â”‚ Can reactivate by setting status = 'active'                 â”‚
â”‚       â”‚ AND stock > 0                                               â”‚
â”‚       â”‚                                                             â”‚
â”‚       â”‚ OR: Explicit discontinue                                    â”‚
â”‚       â–¼                                                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                                   â”‚
â”‚  â”‚ DISCONTINUED â”‚ â† Soft delete, keeps history                      â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                                   â”‚
â”‚       â”‚                                                             â”‚
â”‚       â”‚ Can reactivate (rare but possible)                          â”‚
â”‚       â”‚                                                             â”‚
â”‚       â–¼                                                             â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                                       â”‚
â”‚  â”‚ DELETED  â”‚ â† Hard delete (manual only, requires confirmation)    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                                       â”‚
â”‚                                                                     â”‚
â”‚  VISIBILITY RULES:                                                  â”‚
â”‚  â”œâ”€â”€ ACTIVE + stock > 0     â†’ Visible to customers                  â”‚
â”‚  â”œâ”€â”€ ACTIVE + stock = 0     â†’ Auto-paused, hidden                   â”‚
â”‚  â”œâ”€â”€ PAUSED                  â†’ Hidden, shown in dashboard           â”‚
â”‚  â”œâ”€â”€ DISCONTINUED            â†’ Hidden, shown in dashboard (grayed)  â”‚
â”‚  â””â”€â”€ DELETED                 â†’ Removed from database                â”‚
â”‚                                                                     â”‚
â”‚  AUTO-PAUSE BEHAVIOR:                                               â”‚
â”‚  When stock reaches 0, status automatically changes to 'paused'     â”‚
â”‚  with sub_status 'out_of_stock'. When stock is replenished AND      â”‚
â”‚  user reactivates, part becomes visible again.                      â”‚
â”‚                                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.6 Server-Side Normalization Rules

These normalizations are applied automatically (Layer 2) and logged:

```typescript
// Normalization functions applied during import
const normalizations = {
  
  // MAKE: Title case, trim whitespace
  make: (value: string): string => {
    const trimmed = value.trim();
    // Map known variations
    const makeMap: Record<string, string> = {
      'CHEVROLET': 'Chevrolet',
      'chevrolet': 'Chevrolet',
      'CHEVY': 'Chevrolet',
      'FORD': 'Ford',
      'ford': 'Ford',
      'NISSAN': 'Nissan',
      'nissan': 'Nissan',
      'TOYOTA': 'Toyota',
      'toyota': 'Toyota',
      'VOLKSWAGEN': 'Volkswagen',
      'VW': 'Volkswagen',
      'vw': 'Volkswagen',
      // ... add more as discovered
    };
    return makeMap[trimmed] || titleCase(trimmed);
  },

  // MODEL: Trim only (preserve manufacturer's casing)
  model: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  },

  // POSITION: Standardize to English canonical values
  position: (value: string): string => {
    const positionMap: Record<string, string> = {
      // English variations
      'FRONT': 'Front',
      'front': 'Front',
      'Front': 'Front',
      'REAR': 'Rear',
      'rear': 'Rear',
      'Rear': 'Rear',
      'FRONT LEFT': 'Front Left',
      'FL': 'Front Left',
      'FRONT RIGHT': 'Front Right',
      'FR': 'Front Right',
      'REAR LEFT': 'Rear Left',
      'RL': 'Rear Left',
      'REAR RIGHT': 'Rear Right',
      'RR': 'Rear Right',
      'LEFT': 'Left',
      'RIGHT': 'Right',
      // Spanish variations
      'Delantera': 'Front',
      'DELANTERA': 'Front',
      'Trasera': 'Rear',
      'TRASERA': 'Rear',
      'Delantera Izquierda': 'Front Left',
      'Delantera Derecha': 'Front Right',
      'Trasera Izquierda': 'Rear Left',
      'Trasera Derecha': 'Rear Right',
      'Izquierda': 'Left',
      'Derecha': 'Right',
    };
    const trimmed = value.trim();
    return positionMap[trimmed] || trimmed;
  },

  // DRIVETYPE: Standardize variations
  driveType: (value: string): string => {
    const driveMap: Record<string, string> = {
      '4WD': '4WD',
      '4X4': '4WD',
      '4 X 4': '4WD',
      '4x4': '4WD',
      'AWD': 'AWD',
      'All Wheel': 'AWD',
      'ALL WHEEL': 'AWD',
      'FWD': 'FWD',
      'Front Wheel': 'FWD',
      'FRONT WHEEL': 'FWD',
      'RWD': 'RWD',
      'Rear Wheel': 'RWD',
      'REAR WHEEL': 'RWD',
      '2WD': '2WD',
      '4 X 2': '2WD',
      '4X2': '2WD',
    };
    const trimmed = value.toUpperCase().trim();
    return driveMap[trimmed] || value.trim();
  },

  // GENERAL: Apply to all text fields
  general: (value: string): string => {
    return value
      .trim()                    // Remove leading/trailing whitespace
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width chars
  },

  // UPC: Digits only, validate length
  upc: (value: string): string | null => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 14) {
      return digits;
    }
    return null; // Invalid UPC
  },

  // PRICE: Parse number, ensure positive
  price: (value: string | number): number | null => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num) || num < 35) { // Min $35 MXN
      return null;
    }
    return Math.round(num * 100) / 100; // 2 decimal places
  },

  // OE NUMBER: Normalize for search
  oeNumber: (value: string): { original: string; normalized: string } => {
    return {
      original: value.trim(),
      normalized: value.toUpperCase().replace(/[\s\-\.]/g, ''),
    };
  },
};
```

### 2.7 Error Types and Messages

Standard error types returned in error files:

| Error Type | Message Template | Example |
|------------|------------------|---------|
| `missing_required` | "Required field '{field}' is empty" | "Required field 'SKU' is empty" |
| `invalid_format` | "Field '{field}' has invalid format: {reason}" | "Field 'UPC' has invalid format: must be 8-14 digits" |
| `invalid_value` | "Field '{field}' has invalid value: '{value}'" | "Field 'Currency' has invalid value: 'EUR'" |
| `duplicate_sku` | "SKU '{sku}' already exists in this upload" | "SKU 'ACR-123' already exists in this upload" |
| `sku_not_found` | "SKU '{sku}' not found (quick update requires existing SKU)" | "SKU 'ACR-999' not found" |
| `invalid_year_range` | "Year end ({end}) must be >= year start ({start})" | "Year end (2005) must be >= year start (2010)" |
| `price_too_low` | "Price {price} is below minimum ($35 MXN)" | "Price $20 is below minimum ($35 MXN)" |
| `invalid_image_url` | "Image URL is not accessible: {url}" | "Image URL is not accessible: http://..." |

---

## 3. Excel Import Template

### 3.1 Why Excel (Not ACES XML)

Mexican manufacturers use **Excel templates** similar to Mercado Libreâ€”not ACES XML. Confirmed with Humberto: his Excel file is the **same file** he sends to AutoZone.

Manufacturers fill out templates from **Tech Alliance / Tech Doc** containing all Mexico/US vehicles. They enter their part numbers for each supported vehicle.

### 3.2 Template Structure

| Sheet | Purpose |
|-------|---------|
| **Ayuda (Help)** | Instructions, links to image uploader, expiration date |
| **Datos (Data Entry)** | Main data entry sheet with validation |
| **Resumen de Errores** | ðŸ†• Error summary column (auto-calculated) |
| **Opciones (Hidden)** | Dropdown validation lists |
| **Metadata (Hidden)** | ðŸ†• Manufacturer ID, template version, expiration |

### 3.3 Field Specification

#### Section A: Vehicle Fitment (ðŸ†• NOT IN MERCADO LIBRE)

ML puts vehicle info in the title only. We need **structured fields** for proper search:

| Field | Spanish | Required | Type | Notes |
|-------|---------|----------|------|-------|
| Make | Marca del VehÃ­culo | ðŸ”´ YES | Dropdown | e.g., Chevrolet, Ford, Nissan |
| Model | Modelo del VehÃ­culo | ðŸ”´ YES | Text | e.g., Suburban, Civic, Tsuru |
| Year Start | AÃ±o Inicio | ðŸ”´ YES | Number | e.g., 2007 |
| Year End | AÃ±o Fin | ðŸ”´ YES | Number | e.g., 2014 |
| Engine | Motor | No | Text | e.g., 2.4L, 5.7L V8 |
| Submodel | Submodelo | No | Text | e.g., LT, Sport, SE |

#### Section B: Part Information

| Field | Spanish | Required | Type | Notes |
|-------|---------|----------|------|-------|
| Brand | Marca | ðŸ”´ YES | Text | e.g., ACR, Bosch |
| SKU | SKU | ðŸ”´ YES | Text | Customer-facing part number |
| Factory Part # | NÃºmero de FÃ¡brica | No | Text | Internal code (not displayed) |
| UPC/Barcode | CÃ³digo de Barras | No | Text | 8-14 digit GTIN |
| Product Category | CategorÃ­a | ðŸ”´ YES | Dropdown | e.g., Mazas de Ruedas |
| Product Name | Nombre del Producto | ðŸ”´ YES | Text | e.g., Wheel Bearing Assembly |
| Description | DescripciÃ³n | No | Text | Product description |

#### Section C: Attributes (Category-Specific)

| Field | Spanish | Required | Type | Notes |
|-------|---------|----------|------|-------|
| Position | PosiciÃ³n | No | Dropdown | Front, Rear, Front Left, etc. |
| DriveType | Tipo de TracciÃ³n | No | Dropdown | FWD, RWD, 4WD, AWD |
| With ABS | Con ABS | No | Dropdown | SÃ­, No |
| Bolt Count | Cantidad de Barrenos | No | Number | For wheel hubs |

#### Section D: Pricing & Inventory

| Field | Spanish | Required | Type | Notes |
|-------|---------|----------|------|-------|
| Price | Precio | ðŸ”´ YES | Number | Min $35 MXN |
| Currency | Moneda | ðŸ”´ YES | Dropdown | $ (MXN), US$ |
| Stock | Stock | ðŸ”´ YES | Number | Current quantity |
| Condition | CondiciÃ³n | ðŸ”´ YES | Dropdown | Nuevo, Usado |
| Status | Estado | No | Dropdown | ðŸ†• Activo, Pausado, Descontinuado |

#### Section E: Images

| Field | Spanish | Required | Type | Notes |
|-------|---------|----------|------|-------|
| Image URLs | Fotos | ðŸ”´ YES | Text | URLs from image uploader (comma-separated) |

#### Section F: OE Cross-Reference

| Field | Spanish | Required | Type | Notes |
|-------|---------|----------|------|-------|
| OE Part # 1-4 | NÃºmero OE 1-4 | No | Text | Original equipment numbers |

#### Section G: Validation (Auto-Calculated) ðŸ†•

| Field | Spanish | Purpose |
|-------|---------|---------|
| Error Summary | Resumen de Errores | Excel formula showing validation errors |

### 3.4 Template Validation Formulas ðŸ†•

These Excel formulas go in the "Resumen de Errores" column:

```excel
// Example formula for row 7 (first data row after headers)
=IF(OR(
    ISBLANK(A7),  // Make
    ISBLANK(B7),  // Model
    ISBLANK(C7),  // Year Start
    ISBLANK(D7),  // Year End
    ISBLANK(E7),  // Brand
    ISBLANK(F7),  // SKU
    ISBLANK(K7),  // Price
    ISBLANK(L7),  // Stock
    ISBLANK(N7)   // Image URLs
  ),
  "âš ï¸ Campos obligatorios vacÃ­os",
  IF(D7 < C7,
    "âš ï¸ AÃ±o Fin debe ser >= AÃ±o Inicio",
    IF(K7 < 35,
      "âš ï¸ Precio mÃ­nimo $35 MXN",
      "âœ“ OK"
    )
  )
)
```

**Visual indication:**
- Cell shows "âœ“ OK" in green when valid
- Cell shows "âš ï¸ [error]" in red when invalid
- Conditional formatting highlights the row

### 3.5 Smart Column Mapping

Auto-detect common header variations during import:

```javascript
const columnMappings = {
  // Vehicle fields
  vehicleMake: ["Marca del VehÃ­culo", "Make", "Marca Auto", "MAKE"],
  vehicleModel: ["Modelo del VehÃ­culo", "Model", "Modelo Auto", "MODEL"],
  yearStart: ["AÃ±o Inicio", "Year Start", "AÃ±o Desde", "FROM_YEAR"],
  yearEnd: ["AÃ±o Fin", "Year End", "AÃ±o Hasta", "TO_YEAR"],
  
  // Part fields
  sku: ["SKU", "NÃºmero de Parte", "Part Number", "PART_NO"],
  brand: ["Marca", "Brand", "Fabricante", "BRAND"],
  upc: ["CÃ³digo de Barras", "UPC", "EAN", "GTIN", "BARCODE"],
  
  // Inventory fields
  quantity: ["Stock", "Cantidad", "Qty", "Inventario", "QTY"],
  price: ["Precio", "Price", "Costo", "PRICE"],
  
  // Attributes
  position: ["PosiciÃ³n", "Position", "PosiciÃ³n del Eje", "POS"],
  driveType: ["Tipo de TracciÃ³n", "DriveType", "TracciÃ³n", "DRIVE"],
  
  // Status (new)
  status: ["Estado", "Status", "ESTATUS"],
};
```

### 3.6 Data Quality Reality

Analysis of Humberto's file (29,505 fitments, 1,071 parts) revealed:

| Issue | Examples | Frequency |
|-------|----------|-----------|
| Case inconsistency | "Chevrolet" vs "CHEVROLET" | 39 of 66 makes |
| Trailing spaces | "NISSAN ", "REAR " | Common |
| Position variations | "Front" vs "FRONT" vs "FL" | 6 of 8 positions |
| DriveType variations | "4WD" vs "4 X 4" | Multiple |

**Our import MUST normalize**â€”we cannot assume clean data.

---

## 4. Part Number Hierarchy

### 4.1 Three Types of Part Numbers

| Type | What It Is | Example | Visibility |
|------|------------|---------|------------|
| **OEM Number** | Assigned by **vehicle manufacturer** (VW, Toyota, Ford) | 04465-02220 | Customer search |
| **Factory Part #** | Manufacturer's **internal production code** | C 84020014 | Internal only |
| **Brand SKU** | **Customer-facing** orderable number | ACRTM-510090 | Customers |

### 4.2 Key Industry Insight

Car manufacturers (VW, Toyota) **don't make parts**â€”they buy from suppliers (Bosch, Mann, Hengst) and rebrand them. The aftermarket version is often the **exact same part** at a lower price.

**Example:** VW-branded filter might be manufactured by Mann. When user searches VW's OEM number, they should see all aftermarket brands making that part.

### 4.3 Multiple SKUs Per Vehicle (Position-Based)

Some parts require up to **4 different SKUs** per vehicle:

```
Nissan Tsuru Wheel Bearings:
â”œâ”€â”€ ACRTM-510090-FR (Front Right)
â”œâ”€â”€ ACRTM-510090-FL (Front Left)
â”œâ”€â”€ ACRTM-510090-RR (Rear Right)
â””â”€â”€ ACRTM-510090-RL (Rear Left)
```

**Not all categories:** Spark plugs use same SKU for all cylinders.

---

## 5. OE Cross-Reference System

### 5.1 Why OE Search Matters

Professionals search by OEM number to compare all aftermarket brands. Humberto demonstrated **Oscaro** as the gold standard.

**Flow:**
1. User enters OEM number: `04E 129 620 D`
2. System shows ALL aftermarket brands making that part
3. Customer compares: ACR $850, Bosch $920, SKF $1,100

### 5.2 OE Number Normalization

```javascript
// Normalize for consistent search
function normalizeOE(oe) {
  return oe.toUpperCase().replace(/[\s\-\.]/g, '');
}

// "04E 129 620 D" â†’ "04E129620D"
// "04E-129-620-D" â†’ "04E129620D"
```

### 5.3 OE Number Variations

Same part can have multiple OEM numbers (color changes, minor revisions):
- `04E 129 620 B` (original)
- `04E 129 620 D` (revision)
- `04E 129 620 H` (improvement)

Store all variationsâ€”any search should find the part.

---

## 6. VCdb Strategy

**STATUS:** âœ… NOT NEEDED - $2,500/year saved

### 6.1 Why We Don't Need VCdb

Manufacturers provide Make/Model/Year directly in Excel templates. We don't need VCdb to translate BaseVehicle IDs.

| Previous Assumption | Reality |
|---------------------|---------|
| Need VCdb for vehicle lookup | Manufacturers provide human-readable names |
| $2,500/year required | $0 - data comes from manufacturers |

### 6.2 How Vehicle Data Grows

1. Manufacturer uploads Excel with vehicle fitments
2. Import creates/updates `vehicles` table
3. Search dropdowns populated from our data
4. Coverage grows as manufacturers join

### 6.3 When We Might Need VCdb (Future)

- US manufacturers using ACES XML with BaseVehicle IDs
- Validating data against authoritative source
- Pre-populating vehicles before manufacturers join

---

## 7. Search Architecture

**STATUS:** âœ… Postgres Full-Text Search for MVP

### 7.1 Search Methods (Priority Order)

| Priority | Method | Example | Implementation |
|----------|--------|---------|----------------|
| ðŸ¥‡ PRIMARY | Vehicle Lookup | Year > Make > Model | Cascading dropdowns |
| ðŸ¥ˆ SECONDARY | OEM Number | "04E 129 620 D" | `oe_crossrefs` lookup |
| ðŸ¥‰ SECONDARY | Brand SKU | "ACRTM-510090" | `parts.sku` match |
| 4th | Keyword | "ceramic brake pads" | Postgres FTS |
| 5th | Category | Brakes > Pads | Hierarchical nav |

### 7.2 Vehicle Lookup Query

```sql
-- Get available makes
SELECT DISTINCT make FROM vehicles ORDER BY make;

-- Get models for make
SELECT DISTINCT model FROM vehicles WHERE make = $1 ORDER BY model;

-- Get years for make/model
SELECT DISTINCT generate_series(year_start, year_end) as year
FROM vehicles 
WHERE make = $1 AND model = $2
ORDER BY year DESC;

-- Find parts for vehicle
SELECT p.*, m.brand_name as seller
FROM parts p
JOIN fitments f ON p.id = f.part_id
JOIN vehicles v ON f.vehicle_id = v.id
JOIN manufacturers m ON p.manufacturer_id = m.id
WHERE v.make = $1 
  AND v.model = $2 
  AND $3 BETWEEN v.year_start AND v.year_end
  AND p.status = 'active'
  AND p.quantity > 0
ORDER BY p.price ASC;
```

### 7.3 OEM Number Search Query

```sql
SELECT p.*, m.brand_name as seller, oc.oe_number
FROM parts p
JOIN oe_crossrefs oc ON p.id = oc.part_id
JOIN manufacturers m ON p.manufacturer_id = m.id
WHERE oc.oe_number_normalized = $1
  AND p.status = 'active'
ORDER BY p.price ASC;
```

### 7.4 Attribute Filters

Stored as JSONB on fitments, used for dynamic filtering:

```sql
-- Filter by position
WHERE f.qualifiers->>'position' = 'Front'

-- Filter by drive type
WHERE f.qualifiers->>'driveType' = '4WD'

-- Filter by ABS
WHERE (f.qualifiers->>'withABS')::boolean = true
```

### 7.5 When to Upgrade Search

**Stay with Postgres if:**
- Catalog under 100,000 parts
- Primary search is vehicle lookup (not keyword)

**Consider Algolia/Typesense if:**
- Catalog grows to 100,000+ parts
- Analytics show heavy keyword search usage
- Need typo tolerance, synonyms, faceting

---

## 8. Seller Display Options

### 8.1 The Problem

Some manufacturers want to sell direct but **hide their company name** to avoid conflicts with existing distributors.

### 8.2 Solution: Display Mode

```sql
display_mode VARCHAR(20) DEFAULT 'brand_only'
  CHECK (display_mode IN ('brand_only', 'company_name'))
```

| Mode | Customer Sees | Use Case |
|------|--------------|----------|
| `brand_only` | "Sold by ACR" | Hide company identity |
| `company_name` | "Sold by Refacciones ACR S.A. de C.V." | Full transparency |

### 8.3 Shipping Label Note

Even with `brand_only`, shipping labels show return address. Options:
- **MVP:** Accept it (most customers don't notice)
- **Future:** Fulfillment center or P.O. Box

---

## 9. Multi-Manufacturer Cart & Checkout

### 9.1 Checkout Flow

Single checkout (like Amazon), even when buying from multiple manufacturers:

1. Customer adds items from multiple sellers
2. Single payment processed via Stripe Connect
3. Platform takes fee, splits remainder to manufacturers
4. Each manufacturer ships their items separately
5. Customer gets multiple tracking numbers

### 9.2 Money Flow Example

| Component | Amount | Recipient |
|-----------|--------|-----------|
| Product (Mfr A) | $500 | Mfr A gets $455 (after 9% fee) |
| Product (Mfr B) | $150 | Mfr B gets $136.50 (after 9% fee) |
| Platform fee | $58.50 | RefaccionesDirect |
| Shipping | $140 | Carriers (via Skydropx) |
| **Customer pays** | **$790** | |

### 9.3 Platform Fee Strategy

| Platform | Fee | Notes |
|----------|-----|-------|
| Mercado Libre ClÃ¡sica | 14% | Lower visibility |
| Mercado Libre Premium | 36-40% | Higher visibility |
| **RefaccionesDirect** | **9-10%** | Flat rate, manufacturer-exclusive |

---

## 10. Shipping & Order Tracking

### 10.1 Label Generation (Skydropx)

1. Order placed â†’ manufacturer notified
2. Manufacturer clicks "Generate Label" in dashboard
3. System calls Skydropx API
4. Returns: tracking_number + label PDF
5. Manufacturer prints and ships

### 10.2 Multi-Package Tracking

Each manufacturer shipment has its own tracking. Order page groups them:

```
Order #12345
â”œâ”€â”€ Package 1: ACR (Tracking: SKY123456)
â”‚   â””â”€â”€ Wheel Bearing - Front Left
â””â”€â”€ Package 2: Bosch (Tracking: SKY789012)
    â””â”€â”€ Brake Pads - Front
```

---

## 11. Inventory Management

### 11.1 How It Works

- Manufacturers upload Excel with stock quantities
- System decrements on each sale
- Dashboard shows "Low Stock" warnings
- Parts auto-pause when quantity = 0

### 11.2 Inventory Fields

```sql
quantity INTEGER NOT NULL DEFAULT 0,      -- Current stock
low_stock_threshold INTEGER DEFAULT 5,    -- Warning threshold
status VARCHAR(20) DEFAULT 'active'       -- Explicit status
```

### 11.3 Stock Decrement Logic

```sql
-- On order placement
UPDATE parts 
SET quantity = quantity - $1,
    status = CASE 
      WHEN quantity - $1 <= 0 THEN 'paused' 
      ELSE status 
    END,
    updated_at = NOW()
WHERE id = $2 
  AND quantity >= $1
  AND status = 'active'
RETURNING *;

-- If no rows returned, insufficient stock or part not active
```

---

## 12. Return & Refund Flow

**STATUS:** â³ PENDING - Policy questions unanswered

### 12.1 Proposed Scenarios

| Scenario | Return Shipping | Restocking Fee |
|----------|----------------|----------------|
| Changed mind | Customer pays | 15% |
| Defective | Manufacturer pays | None |
| Wrong item shipped | Manufacturer pays | None |
| Damaged in transit | Carrier claim | None |

### 12.2 Proposed Defaults

| Policy | Default | Rationale |
|--------|---------|-----------|
| Return window | 30 days | Industry standard |
| Restocking fee | 15% | Protects manufacturers |
| Non-returnable | Electrical, installed | Prevents abuse |
| Platform fee | Keep on returns | We facilitated transaction |
| Defective process | Photo required | Prevents fraud |

**See Questions_Pending.md for open items.**

---

## 13. Initial Product Categories

### 13.1 Launch Categories (4 Committed Manufacturers)

| Category | Spanish | Manufacturer |
|----------|---------|--------------|
| Wheel Bearings/Hubs | Masas de Ruedas | Humberto (ACR) |
| Starters & Alternators | Marchas y Alternadores | Humberto's Mom |
| Engine Mounts | Soportes de Motor | Mom's Friend |
| Cables | Chicotes | Mom's Friend |

### 13.2 Category-Specific Attributes

| Category | Qualifiers |
|----------|------------|
| Wheel Bearings | Position, Bolt Count, ABS Sensor, Bearing Included |
| Starters/Alternators | Voltage, Amperage, Rotation, Teeth Count |
| Engine Mounts | Position, Material (Rubber/Hydraulic) |
| Cables | Length, End Fittings, Application Type |

---

## 14. Competitor Context

### 14.1 Why Manufacturers Need RefaccionesDirect

**Mercado Libre Problems:**

1. **Price Chaos** - Same Bosch part: $800, $1200, $1686. No price control.

2. **Stolen Goods** - Stolen inventory sold below cost. Double loss for manufacturers.

3. **Counterfeits** - Chinese knockoffs with fake branding. "They'll print any brand you want."

### 14.2 Our Differentiation

| RefaccionesDirect | Mercado Libre |
|-------------------|---------------|
| Manufacturer-only (invite) | Anyone can sell |
| 9-10% flat fee | 14-40% fees |
| Price control | Price chaos |
| No counterfeits | Counterfeit problem |
| Optional anonymity | Company exposed |
| Auto parts only | Everything |

---

## 15. Image Upload Flow

### 15.1 Process

1. Manufacturer opens Excel template
2. Clicks hyperlink in "Fotos" column
3. Opens RefaccionesDirect Image Manager
4. Uploads images (stored in Supabase Storage)
5. Copies URLs back to Excel

### 15.2 Image Requirements

- Formats: JPG, PNG, WebP
- Max size: 5MB per image
- Recommended: 1000x1000px minimum
- At least 1 image required per part

---

## 16. Resolved Questions (from ML Research) ðŸ†•

The following questions have been resolved based on ML research:

| Question | Resolution |
|----------|------------|
| **1.4** Auto-fix vs reject errors | Three-layer validation: Excel formulas + server normalization + partial success with error file |
| **3.2** Full replacement vs incremental | Explicit action model - separate "Create New" and "Update Existing" workflows |
| **3.4** Discontinued part handling | Explicit "Status" column - parts marked 'discontinued' or 'paused' |
| **3.5** Missing = discontinued? | NO - missing means "not in this update", items are NEVER auto-deleted |
| **6.1** Quick price/inventory update | YES - build download-modify-upload workflow for price/stock/status only |

---

## 17. Remaining Pending Items

See **RefaccionesDirect_Questions_Pending_v3.md** for:

- Return policy details (7 questions)
- Overselling scenarios
- Data quality source questions (nice-to-know)

---

**End of Document**

RefaccionesDirect Data Architecture Specification v4.0 | January 2026
