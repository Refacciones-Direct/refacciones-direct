---
document: Data Architecture Specification
project: RefaccionesDirect
version: 5.0
updated: February 2026
status: Ready for Development

purpose: |
  Defines WHAT the data looks like—database schemas, import templates, 
  business rules, data flows, and platform behavior.

owns:
  - Database schema (tables, relationships, constraints)
  - Excel import template specification (fields, validation, normalization)
  - Import workflow architecture (template detection, registry, parsing)
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
  - Technology stack choices → see Technical Architecture
  - Infrastructure costs → see Technical Architecture
  - Code/folder structure → see Technical Architecture
  - Inngest workflow implementation details → see Technical Architecture
  - Deployment and DevOps → see Technical Architecture
  - Development timeline → see Technical Architecture

related_documents:
  - RefaccionesDirect_TechnicalArchitecture_v6.0.md (HOW we build it)
  - RefaccionesDirect_CrossReference_Architecture_v1.md (OEM vs competitor cross-refs)
  - RefaccionesDirect_Questions_Pending_v3.md (open decisions)
  - MercadoLibre_Template_Analysis_v2.md (ML template research)
---

# RefaccionesDirect
## Data Architecture Specification

**Version 5.0** | February 2026  
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
| 4.0 | Jan 2026 | Integrated ML deep dive research; three-layer validation; explicit action model |
| **5.0** | **Feb 2026** | **🆕 Major update: Two-sheet template model (Partes + Aplicaciones); template registry pattern for category-specific parsing; JSONB attributes column on parts table; template detection via Metadata sheet; real ACR data analysis integrated; import pipeline architecture consolidated from separate doc** |

---

## 1. Database Schema

### 1.1 Entity Relationship Overview

```
manufacturers (sellers)
    │
    ├── parts (products)
    │       │
    │       ├── fitments ──── vehicles
    │       │
    │       └── oe_crossrefs (OEM number lookups)
    │
    ├── import_jobs (catalog import tracking)
    │
    └── orders
            │
            └── order_items
```

### 1.2 Core Tables

```sql
-- Manufacturers (sellers)
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_name VARCHAR(255) NOT NULL,
  brand_name VARCHAR(100) NOT NULL,
  display_mode VARCHAR(20) DEFAULT 'brand_only'  
    CHECK (display_mode IN ('brand_only', 'company_name')),
  rfc VARCHAR(13),
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
-- 🆕 v5.0: Added part_type and attributes JSONB column
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  sku VARCHAR(50) NOT NULL,
  factory_part_number VARCHAR(50),
  upc VARCHAR(14),
  brand VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  part_type VARCHAR(50) NOT NULL,                -- 🆕 MAZA, ALTERNADOR, SOPORTE_MOTOR, CABLE
  attributes JSONB DEFAULT '{}',                 -- 🆕 Category-specific attributes (see Section 3.5)
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD')),
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  condition VARCHAR(20) DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished')),
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'discontinued')),
  image_urls TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(manufacturer_id, sku)
);

-- Fitments (links parts to vehicles)
CREATE TABLE fitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(part_id, vehicle_id)
);

-- OE Cross-References (for OEM number search)
CREATE TABLE oe_crossrefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  oe_number VARCHAR(50) NOT NULL,
  oe_number_normalized VARCHAR(50) NOT NULL,
  oe_brand VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(part_id, oe_number)
);

-- Import Jobs (tracks catalog imports)
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  import_type VARCHAR(20) NOT NULL
    CHECK (import_type IN ('full_catalog', 'quick_update', 'new_parts')),
  template_type VARCHAR(50),                     -- 🆕 e.g. 'mazas_v1', 'alternadores_v1'
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url VARCHAR(500),
  total_rows INTEGER,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_file_url VARCHAR(500),
  normalizations_applied JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import Errors (detailed error tracking)
CREATE TABLE import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  sheet_name VARCHAR(50),                        -- 🆕 'Partes' or 'Aplicaciones'
  original_data JSONB NOT NULL,
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  field_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vehicles_make ON vehicles(make);
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_brand ON parts(brand);
CREATE INDEX idx_parts_sku ON parts(sku);
CREATE INDEX idx_parts_status ON parts(status);
CREATE INDEX idx_parts_part_type ON parts(part_type);              -- 🆕
CREATE INDEX idx_parts_attributes ON parts USING gin(attributes);  -- 🆕 GIN index for JSONB
CREATE INDEX idx_oe_normalized ON oe_crossrefs(oe_number_normalized);
CREATE INDEX idx_fitments_vehicle ON fitments(vehicle_id);
CREATE INDEX idx_fitments_part ON fitments(part_id);
CREATE INDEX idx_import_jobs_manufacturer ON import_jobs(manufacturer_id);
```

**🆕 v5.0 Schema Changes from v4.0:**

| Change | Reason |
|--------|--------|
| Added `parts.part_type` | Pipeline needs to know what kind of part this is for search filters |
| Added `parts.attributes JSONB` | Category-specific attributes stored flexibly (see Section 3.5) |
| Added `import_jobs.template_type` | Track which template was used for each import |
| Added `import_errors.sheet_name` | Two-sheet model means errors can come from either sheet |
| Removed `fitments.qualifiers JSONB` | Attributes now live on `parts.attributes` instead — they describe the part, not the fitment |
| Added GIN index on `parts.attributes` | Efficient JSONB queries for attribute filtering |

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

## 2. Import System Architecture

This section defines how catalog data flows into the system. Design is based on ML research and real ACR data analysis.

### 2.1 Core Principle: Explicit Action Model

Based on ML research, we use an **explicit action model** where:

1. Creating and updating are SEPARATE operations
2. Missing items are NEVER auto-deleted
3. Deletion requires explicit user action

Three separate workflows:

1. **"Import New Parts"** — Creates NEW parts only. Ignores rows where SKU already exists.
2. **"Update Catalog"** — Downloads manufacturer's CURRENT parts as Excel. User modifies and re-uploads. Items NOT in file are UNTOUCHED.
3. **"Quick Price/Stock Update"** — Lightweight update (SKU + Price + Stock + Status only). No fitment data required.

Deletion uses explicit "Status" column with value "discontinued". Setting quantity = 0 auto-pauses but keeps data. Items are NEVER auto-deleted based on missing rows.

### 2.2 Three-Layer Validation System

**Layer 1: Template-Level (In Excel, before upload)**
- Pre-populated dropdowns from hidden sheet
- Real-time validation while user edits
- "Obligatorio" / "Opcional" indicators on columns

**Layer 2: Server-Side Normalization (Auto-fix)**
- Trim whitespace from all fields
- Normalize case for Make, Model, Position, DriveType
- Standardize known variations (4X4 → 4WD)
- Log ALL changes made for transparency

**Layer 3: Partial Success with Error File**
- Process ALL valid rows
- Collect errors for invalid rows
- Return downloadable error file with only failed rows + error message column
- User fixes and re-uploads just the errors

### 2.3 🆕 Import Pipeline Flow (with Template Detection)

```
1. UPLOAD
   Manufacturer uploads .xlsx to dashboard

2. DETECT TEMPLATE TYPE (🆕)
   Read hidden "Metadata" sheet → get template_type value
   Look up in TEMPLATE_REGISTRY → get parsing config
   If unknown template_type → reject with clear error

3. PARSE PARTES SHEET
   a. Common columns (same for all templates):
      SKU, Marca, Nombre, Condición, Descripción,
      Precio, Stock, Números OEM, Fotos
   b. Category-specific attributes (from registry config):
      e.g. for mazas: Posición, Tipo de ABS, Barrenos, Tracción, Especificaciones
      e.g. for alternadores: Voltaje, Amperaje, Rotación, Tipo de Polea

4. PARSE APLICACIONES SHEET
   SKU del Producto, Marca del Vehículo, Modelo del Vehículo,
   Año Inicio, Año Fin
   Validate: SKU must exist in Partes sheet
   Validate: Año Fin >= Año Inicio

5. NORMALIZE (Layer 2)
   Apply normalizers (see Section 2.6)

6. STORE
   Parts → parts table (common fields + JSONB attributes)
   Fitments → fitments table (via vehicles table)
   OEM numbers → oe_crossrefs table

7. REPORT
   Return success count + error file with failed rows
```

### 2.4 Import Workflow: Quick Price/Stock Update

Lightweight workflow for routine inventory updates (matches ML's "Modificar desde Excel"):

1. Manufacturer clicks "Download Current Parts"
2. System exports their parts as Excel: SKU (read-only), Name (read-only), Current Price (editable), Current Stock (editable), Status (editable)
3. Manufacturer edits, re-uploads
4. Match by SKU → Update fields. Unknown SKUs → Error. Missing SKUs → UNTOUCHED.

### 2.5 Part Lifecycle States

```
ACTIVE  ← Default for new parts
  │
  │ Stock = 0 (auto) OR manual pause
  ▼
PAUSED  ← Hidden from search, data preserved
  │
  │ Reactivate: status = 'active' AND stock > 0
  │ OR: Explicit discontinue
  ▼
DISCONTINUED  ← Soft delete, keeps history
  │
  ▼
DELETED  ← Hard delete (manual only, requires confirmation)
```

Visibility rules:
- ACTIVE + stock > 0 → Visible to customers
- ACTIVE + stock = 0 → Auto-paused, hidden
- PAUSED → Hidden, shown in dashboard
- DISCONTINUED → Hidden, shown in dashboard (grayed)

### 2.6 Server-Side Normalization Rules

```typescript
const normalizations = {
  make: (value: string): string => {
    const trimmed = value.trim();
    const makeMap: Record<string, string> = {
      'CHEVROLET': 'Chevrolet', 'CHEVY': 'Chevrolet',
      'FORD': 'Ford', 'NISSAN': 'Nissan', 'TOYOTA': 'Toyota',
      'VOLKSWAGEN': 'Volkswagen', 'VW': 'Volkswagen',
      'BMW': 'BMW', 'DODGE': 'Dodge', 'CHRYSLER': 'Chrysler',
      // ... extend as discovered
    };
    return makeMap[trimmed.toUpperCase()] || titleCase(trimmed);
  },

  model: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  },

  position: (value: string): string => {
    const positionMap: Record<string, string> = {
      'FRONT': 'Front', 'REAR': 'Rear',
      'DELANTERA': 'Front', 'TRASERA': 'Rear',
      'DEL/TRA': 'Front/Rear', 'DELANTERO/TRASERA': 'Front/Rear',
      'DELANTERA DERECHA': 'Front Right', 'DELANTERA IZQUIERDA': 'Front Left',
      'TRASERA DERECHA': 'Rear Right', 'TRASERA IZQUIERDA': 'Rear Left',
      'TRASERA "L"': 'Rear Left', 'TRASERA "R"': 'Rear Right',
      'TRASERA CON ARBOL': 'Rear With Axle',
    };
    return positionMap[value.trim().toUpperCase()] || value.trim();
  },

  driveType: (value: string): string => {
    const driveMap: Record<string, string> = {
      '4X4': '4WD', '4x4': '4WD', '4WD': '4WD', 'AWD': 'AWD',
      '4X2': '2WD', '4x2': '2WD', '2WD': '2WD', 'FWD': 'FWD', 'RWD': 'RWD',
      '4X2 / 4X4': '2WD/4WD', '4X2/4X4': '2WD/4WD', '4X2, 4X4': '2WD/4WD',
      '4X2,4X4': '2WD/4WD',
      '4X2 DOBLE RODADA': '2WD Dually', '4X4 DOBLE RODADA': '4WD Dually',
    };
    return driveMap[value.trim().toUpperCase()] || value.trim();
  },

  general: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '');
  },

  upc: (value: string): string | null => {
    const digits = value.replace(/\D/g, '');
    return (digits.length >= 8 && digits.length <= 14) ? digits : null;
  },

  price: (value: string | number): number | null => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num) || num < 35) return null;
    return Math.round(num * 100) / 100;
  },

  oeNumber: (value: string): { original: string; normalized: string } => {
    return {
      original: value.trim(),
      normalized: value.toUpperCase().replace(/[\s\-\.]/g, ''),
    };
  },
};
```

### 2.7 Error Types and Messages

| Error Type | Message Template | Example |
|------------|------------------|---------|
| `missing_required` | "Required field '{field}' is empty" | "Required field 'SKU' is empty" |
| `invalid_format` | "Field '{field}' has invalid format: {reason}" | "Field 'UPC': must be 8-14 digits" |
| `invalid_value` | "Field '{field}' has invalid value: '{value}'" | "Field 'Currency': 'EUR'" |
| `duplicate_sku` | "SKU '{sku}' already exists in this upload" | "SKU 'ACR-123' already exists" |
| `sku_not_found` | "SKU '{sku}' not found in Partes sheet" | 🆕 Cross-sheet validation |
| `invalid_year_range` | "Año Fin ({end}) must be >= Año Inicio ({start})" | "2005 must be >= 2010" |
| `price_too_low` | "Price {price} is below minimum ($35 MXN)" | "Price $20 below minimum" |
| `unknown_template` | "Template type '{type}' not recognized" | 🆕 Template detection error |

---

## 3. 🆕 Excel Import Templates

### 3.1 Why Excel (Not ACES XML)

Mexican manufacturers use Excel templates similar to Mercado Libre — not ACES XML. Confirmed with Humberto: his Excel file is the same file he sends to AutoZone. The data originates from TecDoc/TecAlliance exports flattened into Excel format.

### 3.2 🆕 Two-Sheet Model

**v4.0 used a single flat sheet** with vehicle fitments and part data in the same row. This caused massive duplication — a part fitting 10 vehicles meant 10 rows with identical price, brand, and specs.

**v5.0 uses separate sheets**, matching how TecDoc structures data internally:

| Sheet | Purpose | Key |
|-------|---------|-----|
| **Portada** | Instructions for the manufacturer | N/A |
| **Partes** | One row per product (SKU is unique) | SKU |
| **Aplicaciones** | One row per product+vehicle combo | SKU + Vehicle |
| **Metadata** (hidden) | Template type, version, platform ID | N/A |

**Why separate sheets:**
- Humberto has parts fitting 2-10 vehicles each (380 parts → 1,000 fitments = avg 2.6x)
- Duplicating all part data across fitment rows is error-prone
- Changing a price would require updating 10 rows in a flat file
- TecDoc already separates parts from fitments — manufacturers are used to this

### 3.3 🆕 Template Detection via Metadata Sheet

The hidden Metadata sheet contains key-value pairs the pipeline reads:

```
template_type    mazas_v1
template_version 1.0
platform         RefaccionesDirect
category         Mazas de Ruedas
created          2026-02-20
parts_sheet      Partes
apps_sheet       Aplicaciones
data_starts_row  3
```

The pipeline reads `template_type`, looks it up in the Template Registry (Section 3.4), and gets the parsing config for that category.

### 3.4 🆕 Template Registry Pattern

Each part category has a registry entry defining its category-specific attributes. The pipeline uses this config to parse and validate dynamically — no hardcoded category logic.

```typescript
// Simplified example — full implementation in template-registry.ts
const TEMPLATE_REGISTRY = {
  "mazas_v1": {
    displayName: "Mazas de Ruedas",
    partType: "MAZA",
    attributes: [
      { field: "position",  header_es: "Posición",         type: "dropdown", required: true,
        validation: { values: ["DELANTERA","TRASERA","DEL/TRA",...] } },
      { field: "abs_type",  header_es: "Tipo de ABS",      type: "dropdown", required: false,
        validation: { values: ["C/ABS","S/ABS","P/ABS"] } },
      { field: "bolt_pattern", header_es: "Barrenos",      type: "string",   required: false },
      { field: "drive_type",   header_es: "Tipo de Tracción", type: "dropdown", required: false },
      { field: "specifications", header_es: "Especificaciones", type: "string", required: false },
    ],
  },

  "alternadores_v1": {
    displayName: "Alternadores",
    partType: "ALTERNADOR",
    attributes: [
      { field: "voltage",     header_es: "Voltaje",       type: "dropdown", required: true,
        validation: { values: ["12V","24V"] } },
      { field: "amperage",    header_es: "Amperaje",      type: "number",   required: true,
        validation: { min: 40, max: 300 } },
      { field: "rotation",    header_es: "Rotación",      type: "dropdown", required: false },
      { field: "pulley_type", header_es: "Tipo de Polea", type: "dropdown", required: false },
    ],
  },

  "soportes_motor_v1": {
    displayName: "Soportes de Motor",
    partType: "SOPORTE_MOTOR",
    attributes: [
      { field: "position", header_es: "Posición", type: "dropdown", required: true },
      { field: "material", header_es: "Material", type: "dropdown", required: false,
        validation: { values: ["Hule","Hidráulico","Poliuretano"] } },
    ],
  },

  "cables_v1": {
    displayName: "Cables",
    partType: "CABLE",
    attributes: [
      { field: "cable_type",  header_es: "Tipo de Cable", type: "dropdown", required: true },
      { field: "length_mm",   header_es: "Longitud (mm)", type: "number",   required: false },
      { field: "connector_a", header_es: "Conector A",    type: "string",   required: false },
      { field: "connector_b", header_es: "Conector B",    type: "string",   required: false },
    ],
  },
};
```

**Adding a new part type requires:** Adding a registry entry + generating a new Excel template. No database migration, no code changes to the pipeline.

### 3.5 🆕 Attribute Storage: JSONB Column

Category-specific attributes are stored in `parts.attributes` as JSONB. The template registry enforces the schema at import time. The database stores whatever attributes that part type has.

```sql
-- Mazas example:
UPDATE parts SET attributes = '{"position":"DELANTERA","abs_type":"C/ABS","bolt_pattern":"5","drive_type":"4X4","specifications":"33 ESTRIAS"}'

-- Alternadores example:
UPDATE parts SET attributes = '{"voltage":"12V","amperage":150,"rotation":"CW","pulley_type":"Serpentine"}'
```

Querying attributes:

```sql
-- All mazas with ABS
SELECT * FROM parts WHERE part_type = 'MAZA' AND attributes->>'abs_type' = 'C/ABS';

-- Alternators over 100A
SELECT * FROM parts WHERE part_type = 'ALTERNADOR' AND (attributes->>'amperage')::int > 100;

-- Hydraulic engine mounts
SELECT * FROM parts WHERE part_type = 'SOPORTE_MOTOR' AND attributes->>'material' = 'Hidráulico';
```

**Why JSONB over alternatives:**
- EAV tables: ugly queries, no type safety
- Category-specific tables: new migration per category
- JSONB: no extra tables, Postgres GIN indexing, flexible. Registry enforces schema at import time.

### 3.6 Partes Sheet Columns

Every template shares common columns. Category-specific attributes sit between "Descripción" and "Precio":

**Common columns (all templates):**

| Column | Field | Spanish | Required | Notes |
|--------|-------|---------|----------|-------|
| A | sku | SKU | 🔴 YES | Unique product identifier |
| B | brand | Marca | 🔴 YES | Product brand |
| C | name | Nombre del Producto | 🔴 YES | Descriptive name |
| D | condition | Condición | 🔴 YES | Nuevo, Remanufacturado, Usado |
| E | description | Descripción | No | Detailed description |
| ... | *attributes* | *Varies by category* | Varies | See Section 3.4 |
| K+ | price | Precio (MXN) | 🔴 YES | Minimum $35 MXN |
| L+ | stock | Stock | 🔴 YES | Current quantity |
| M+ | oe_numbers | Números OEM | No | Separated by semicolons |
| N+ | image_urls | Fotos (URLs) | 🔴 YES | Separated by commas |

Column letters after E shift depending on how many category attributes exist.

**Mazas-specific attributes (columns F-J):**

| Column | Field | Required | Observed Values (ACR data) |
|--------|-------|----------|---------------------------|
| F | Posición | Yes | DELANTERA, TRASERA, DEL/TRA, plus left/right variants |
| G | Tipo de ABS | No | C/ABS, S/ABS, P/ABS |
| H | Barrenos | No | 4, 5, 6, 8 with thread patterns like (M12X1.5) |
| I | Tipo de Tracción | No | 4X2, 4X4, 4X2/4X4, plus dually variants |
| J | Especificaciones | No | Free text, e.g. "33 ESTRIAS" |

### 3.7 Aplicaciones Sheet Columns

Identical across all templates — vehicle fitments are not category-specific.

| Column | Field | Spanish | Required | Notes |
|--------|-------|---------|----------|-------|
| A | sku | SKU del Producto | 🔴 YES | Must match a SKU in Partes sheet |
| B | make | Marca del Vehículo | 🔴 YES | e.g. CHEVROLET, FORD, BMW |
| C | model | Modelo del Vehículo | 🔴 YES | e.g. SILVERADO, F-150, SERIE 3 (E90) |
| D | year_start | Año Inicio | 🔴 YES | First year of compatibility (1950-2030) |
| E | year_end | Año Fin | 🔴 YES | Last year of compatibility (1950-2030) |

### 3.8 Data Quality Reality

Analysis of Humberto's ACR file (380 parts with fitments, 1,000 fitment rows):

| Issue | Examples | Frequency |
|-------|----------|-----------|
| Case inconsistency | "CHEVROLET" vs "Chevrolet" | Common |
| Trailing spaces | "NISSAN ", "REAR " | Common |
| Position variations | "DELANTERA" vs "DELANTERA DERECHA" vs "DEL/TRA" | 11 distinct values |
| DriveType variations | "4X2", "4x2", "4X2/4X4", "4X2, 4X4" | 10 distinct values |
| Multi-make fitments | "CHEVROLET, GMC" in one cell | 68 rows |
| Bolt pattern formats | "5", "5 (M12X1.5)", "5 BIRLOS C/ABS" | 22 distinct values |

Our import MUST normalize — we cannot assume clean data.

### 3.9 🆕 ACR Seed Data Summary

The Mazas template v1 was built using Humberto's ACR catalog export:

| Metric | Count |
|--------|-------|
| Total parts in ACR file | 867 (744 active, 123 inactive) |
| Active parts with vehicle fitments | 380 |
| Total fitment rows | 1,000 |
| Average fitments per part | 2.6 |
| Parts with OEM cross-refs | 79 of 380 |
| Unique vehicle makes | 14 |

Fields left blank for Humberto to fill: Precio, Stock, Fotos, Descripción.

---

## 4. Part Number Hierarchy

### 4.1 Three Types of Part Numbers

| Type | What It Is | Example | Visibility |
|------|------------|---------|------------|
| **OEM Number** | Assigned by vehicle manufacturer | Toyota #04465-02220 | Customer search |
| **Factory Part #** | Internal manufacturing code | C 84020014 | Internal only |
| **Brand SKU** | Customer-facing orderable number | ACRTM-510090 | Customers |

### 4.2 Key Industry Insight

Car manufacturers (VW, Toyota) don't make parts — they buy from suppliers (Bosch, Mann, Hengst) and rebrand them. The aftermarket version is often the exact same part at a lower price.

### 4.3 Multiple SKUs Per Vehicle (Position-Based)

Some parts require up to 4 different SKUs per vehicle:

```
Nissan Tsuru Wheel Bearings:
├── ACRTM-510090-FR (Front Right)
├── ACRTM-510090-FL (Front Left)
├── ACRTM-510090-RR (Rear Right)
└── ACRTM-510090-RL (Rear Left)
```

---

## 5. OE Cross-Reference System

### 5.1 Why OE Search Matters

Professionals search by OEM number to compare all aftermarket brands.

Flow:
1. User enters OEM number: `33416762321`
2. System normalizes and queries `oe_crossrefs.oe_number_normalized`
3. Shows ALL aftermarket brands making that part
4. Customer compares: ACR $850, National $920, FAG $1,100

### 5.2 OE Number Normalization

```javascript
function normalizeOE(oe) {
  return oe.toUpperCase().replace(/[\s\-\.]/g, '');
}
// "04E 129 620 D" → "04E129620D"
// "33416762321" → "33416762321" (already clean)
```

### 5.3 🆕 Cross-Reference Types

See `RefaccionesDirect_CrossReference_Architecture_v1.md` for full details. Summary:

| Type | MVP Status | Example |
|------|-----------|---------|
| **OEM Cross-Refs** | ✅ In schema | BMW 33416762321 → ACR2302006 |
| **Competitor Cross-Refs** | ⏳ Deferred | National 515072 ≈ ACR2306010 |

OEM cross-refs are captured at import time from the "Números OEM" column. Competitor cross-refs are deferred to post-MVP — adding a `competitor_crossrefs` table later won't impact existing schema.

---

## 6. VCdb Strategy

**STATUS:** ✅ NOT NEEDED - $2,500/year saved

Manufacturers provide Make/Model/Year directly in Excel templates. We build the vehicles table from their uploads. TecDoc is the actual data source (manufacturers export from TecDoc to Excel).

When we might need VCdb in the future: US manufacturers using ACES XML with BaseVehicle IDs; validating data against authoritative source.

---

## 7. Search Architecture

**STATUS:** ✅ Postgres Full-Text Search for MVP

### 7.1 Search Methods (Priority Order)

| Priority | Method | Example | Implementation |
|----------|--------|---------|----------------|
| 🥇 PRIMARY | Vehicle Lookup | Year > Make > Model | Cascading dropdowns |
| 🥈 SECONDARY | OEM Number | "33416762321" | `oe_crossrefs` lookup |
| 🥉 SECONDARY | Brand SKU | "ACR2302006" | `parts.sku` match |
| 4th | Keyword | "maza delantera abs" | Postgres FTS |
| 5th | Category | Mazas de Ruedas | Hierarchical nav |

### 7.2 Vehicle Lookup Query

```sql
SELECT p.*, m.brand_name as seller
FROM parts p
JOIN fitments f ON p.id = f.part_id
JOIN vehicles v ON f.vehicle_id = v.id
JOIN manufacturers m ON p.manufacturer_id = m.id
WHERE v.make = $1 AND v.model = $2 
  AND $3 BETWEEN v.year_start AND v.year_end
  AND p.status = 'active' AND p.quantity > 0
ORDER BY p.price ASC;
```

### 7.3 🆕 Attribute Filters (via JSONB)

```sql
-- Filter mazas by position and ABS
WHERE p.part_type = 'MAZA'
  AND p.attributes->>'position' = 'DELANTERA'
  AND p.attributes->>'abs_type' = 'C/ABS'

-- Filter alternators by voltage
WHERE p.part_type = 'ALTERNADOR'
  AND p.attributes->>'voltage' = '12V'
```

### 7.4 When to Upgrade Search

Stay with Postgres if catalog under 100,000 parts and primary search is vehicle lookup. Consider Algolia/Typesense if catalog grows past 100K or analytics show heavy keyword search.

---

## 8. Seller Display Options

```sql
display_mode VARCHAR(20) DEFAULT 'brand_only'
  CHECK (display_mode IN ('brand_only', 'company_name'))
```

| Mode | Customer Sees | Use Case |
|------|--------------|----------|
| `brand_only` | "Sold by ACR" | Hide company identity |
| `company_name` | "Sold by Refacciones ACR S.A. de C.V." | Full transparency |

---

## 9. Multi-Manufacturer Cart & Checkout

Single checkout (like Amazon), even when buying from multiple manufacturers:

1. Customer adds items from multiple sellers
2. Single payment via Stripe Connect
3. Platform takes fee, splits remainder to manufacturers
4. Each manufacturer ships separately
5. Customer gets multiple tracking numbers

### 9.1 Platform Fee Strategy

| Platform | Fee | Notes |
|----------|-----|-------|
| Mercado Libre Clásica | 14% | Lower visibility |
| Mercado Libre Premium | 36-40% | Higher visibility |
| **RefaccionesDirect** | **9-10%** | Flat rate, manufacturer-exclusive |

---

## 10. Shipping & Order Tracking

### 10.1 Label Generation (Skydropx)

1. Order placed → manufacturer notified
2. Manufacturer clicks "Generate Label"
3. System calls Skydropx API → tracking_number + label PDF
4. Manufacturer prints and ships

### 10.2 Multi-Package Tracking

Each manufacturer shipment has its own tracking:

```
Order #12345
├── Package 1: ACR (Tracking: SKY123456)
│   └── Maza Delantera
└── Package 2: Bosch (Tracking: SKY789012)
    └── Alternador 12V
```

---

## 11. Inventory Management

- Manufacturers upload Excel with stock quantities
- System decrements on each sale
- Dashboard shows "Low Stock" warnings
- Parts auto-pause when quantity = 0

```sql
-- Stock decrement on order
UPDATE parts 
SET quantity = quantity - $1,
    status = CASE WHEN quantity - $1 <= 0 THEN 'paused' ELSE status END,
    updated_at = NOW()
WHERE id = $2 AND quantity >= $1 AND status = 'active'
RETURNING *;
```

---

## 12. Return & Refund Flow

**STATUS:** ⏳ PENDING - Policy questions unanswered

### 12.1 Proposed Defaults

| Policy | Default | Rationale |
|--------|---------|-----------|
| Return window | 30 days | Industry standard |
| Restocking fee | 15% | Protects manufacturers |
| Non-returnable | Electrical, installed | Prevents abuse |
| Platform fee | Keep on returns | We facilitated transaction |
| Defective process | Photo required | Prevents fraud |

See Questions_Pending.md for open items.

---

## 13. Initial Product Categories

### 13.1 Launch Categories (4 Committed Manufacturers)

| Category | Spanish | Manufacturer | Template ID |
|----------|---------|--------------|-------------|
| Wheel Bearings/Hubs | Mazas de Ruedas | Humberto (ACR) | `mazas_v1` ✅ |
| Starters & Alternators | Marchas y Alternadores | Humberto's Mom | `alternadores_v1` (stub) |
| Engine Mounts | Soportes de Motor | Mom's Friend | `soportes_motor_v1` (stub) |
| Cables | Chicotes | Mom's Friend | `cables_v1` (stub) |

### 13.2 🆕 Category-Specific Attributes (from real data)

| Category | Attributes | Source |
|----------|-----------|--------|
| Wheel Bearings | Position, ABS Type, Bolt Pattern, Drive Type, Specifications | ACR TecDoc export (380 parts analyzed) |
| Starters/Alternators | Voltage, Amperage, Rotation, Pulley Type | Stub — awaiting ML template from Humberto |
| Engine Mounts | Position, Material (Rubber/Hydraulic) | Stub — awaiting ML template |
| Cables | Cable Type, Length, Connector A, Connector B | Stub — awaiting ML template |

---

## 14. Competitor Context

**Mercado Libre Problems:** Price chaos (same part at $800-$1686), stolen goods sold below cost, counterfeits with fake branding.

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

1. Manufacturer opens Excel template
2. Clicks hyperlink in "Fotos" column
3. Opens RefaccionesDirect Image Manager
4. Uploads images (stored in Supabase Storage)
5. Copies URLs back to Excel

Requirements: JPG/PNG/WebP, max 5MB, recommended 1000x1000px, at least 1 image per part.

---

## 16. Remaining Pending Items

See **RefaccionesDirect_Questions_Pending_v3.md** for:

- Return policy details (7 questions)
- Overselling scenarios
- ML templates for Alternadores, Soportes de Motor, Cables (need from Humberto)
- Confirm ML category tree for ACR products

---

**End of Document**

RefaccionesDirect Data Architecture Specification v5.0 | February 2026
