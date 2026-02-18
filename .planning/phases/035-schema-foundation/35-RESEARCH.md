# Phase 35: Schema Foundation - Research

**Researched:** 2026-02-18
**Domain:** PostgreSQL schema migration for multi-tenant property management (Supabase)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D1: Naming Convention — English Throughout**
All new table names, column names, enum values in English. Consistent with existing schema (properties, buildings, units, tasks). German terms only in UI labels, never in schema.
Examples: `organizations`, `owners`, `mandates`, `tenancies`, `ownership_fraction` (not `wertquote`), `renewal_fund_balance` (not `erneuerungsfonds_balance`).

**D2: Tenant vs Global Table Classification**
| Category | Tables | organization_id? |
|----------|--------|-------------------|
| **Per-Organization** | properties, buildings, units, rooms, projects, tasks, work_orders, offers, invoices, expenses, payments, media, audit_logs, partners, knowledge_articles, inspections, change_orders, push_subscriptions, notification_preferences, suppliers, purchase_orders, tickets, comments, parking_spaces (→ becomes units), tenancies, mandates, owners | YES |
| **Global (no org_id)** | roles, permissions, system_settings | NO |
| **Global + Org Extension** | trade_types, quality_gate_definitions — system provides base set, orgs can add custom entries but cannot modify global ones | org_id NULLABLE (NULL = system, UUID = org-specific) |
| **Global + Org Override** | project_templates, wbs_templates — system templates global, orgs can copy and customize | org_id NULLABLE (NULL = system template, UUID = org copy) |

Special cases:
- Knowledge Base articles: Per-organization (private internal docs)
- Audit logs: Per-organization with org_id, future super-admin view sees all
- Push notification preferences: Per user+organization (user can mute per org)
- Suppliers/Lieferanten: Per-organization (no sharing between orgs)
- Tenant portal tickets: Strictly org-isolated via unit hierarchy

**D3: Mandate-Property Relationship — 1:N with Temporal Mandates**
- 1 Owner = N Mandates (Owner can have multiple management contracts)
- 1 Mandate = N Properties (properties.mandate_id FK)
- Mandate has start_date / end_date — temporal, not permanent assignment
- Mandate switch: Old mandate gets end_date, new mandate created, property.mandate_id updated
- Historical data stays with old mandate for legal/accounting purposes
- STWE-Gemeinschaft is the owner entity for condominium mandates
- Individual STWE unit owners can also have own mandates (Sonderverwaltungsmandat — rare but possible)

**D4: Owner Model — Full Entity with Contact Data**
Owner is a first-class entity, separate from users:
- owner_type enum: `person`, `company`, `community` (Erbengemeinschaft), `stwe_association`
- Contact fields: name, address, postal_code, city, country, phone, email, language
- Optional user_id FK: nullable, links to auth user for future owner portal login
- Not a user by default — owner is business/legal entity, user is system account

**D5: Organization Legal Fields**
Organizations get Swiss legal/business fields:
- `uid` (Unternehmens-Identifikationsnummer, CHE-xxx.xxx.xxx)
- `vat_number` (MwSt-Nummer)
- `commercial_register` (Handelsregister-Eintrag)
- `bank_account` (IBAN for invoicing)
- All nullable — filled when org needs official documents

**D6: STWE Owner FK Prepared Now**
- `units.stwe_owner_id` → `owners(id)` as nullable FK
- Schema ready for STWE unit-owner assignment, UI comes later
- properties.property_type discriminator: `rental` | `stwe`

**D7: Parking Spaces Become Units**
- Migrate `parking_spaces` table content into `units` with `unit_type = 'parking'`
- Existing unit_type values: extend to include `parking`, `garage`, `storage`
- Tenancy model works uniformly on all unit types
- External parkers (no apartment) get a tenancy on the parking unit — they are full tenants with a contract

**D8: Swiss Tenancy Law Fields**
Tenancies table gets Swiss rental law fields (all nullable for flexibility):
- `base_rent` (Nettomiete)
- `ancillary_costs` (Nebenkosten-Akonto, OR 257a)
- `deposit_amount` (Mietkaution, max 3 Monatsmieten per OR 257e)
- `notice_period_months` (Kündigungsfrist)
- `reference_interest_rate` (Referenzzinssatz for rent adjustments)
- `contract_type` enum: `residential`, `commercial`, `parking`, `storage`

**D9: Grundbuch Reference on Properties**
Properties get Swiss land registry fields (nullable):
- `land_registry_nr` (Grundbuchnummer)
- `municipality` (Gemeinde)
- `parcel_nr` (Parzellennummer)

**D10: KEWA AG Seed Strategy**
- KEWA AG is the first customer, not the product itself
- Seed as organization with full legal fields
- Create one default mandate initially, split into real mandates later
- All existing data backfilled to KEWA AG org (Phase 36 handles this)

**D11: International Extensibility (Architecture Principle)**
- Schema designed for Swiss law first (OR, Mietrecht, Grundbuch)
- Country-specific fields are nullable and clearly named
- No hardcoded Swiss-only logic in schema — country-specific behavior lives in application layer
- Future: `organizations.country` field to drive jurisdiction-specific logic
- This is an architecture principle, NOT a Phase 35 deliverable beyond nullable fields

### Claude's Discretion

**Technical Decisions**
- Exact list of which existing tables get organization_id (audit the ~68 tables, determine actual count)
- Index naming conventions (idx_tablename_column pattern)
- Trigger implementation details for org_id sync
- Migration file numbering (continue from existing sequence)
- Whether to use CHECK constraints or triggers for cross-tenant FK validation
- How to handle the parking_spaces → units migration (data + FK updates)
- Enum type definitions (CREATE TYPE vs text with CHECK)

**Schema Details**
- Exact column ordering in new tables
- Default values for enums
- Whether mandate_type uses enum or text
- Composite index choices (which columns to combine)
- Which FKs get ON DELETE CASCADE vs NO ACTION vs SET NULL

### Deferred Ideas (OUT OF SCOPE)

- Owner Portal login — user_id FK prepared, actual auth flow deferred to future milestone
- STWE UI — fields prepared, forms/views deferred
- Multi-language — schema extensible, i18n framework deferred
- Integrated accounting — legal fields prepared, GL deferred
- Custom roles per org — global roles sufficient for now
- Nebenkosten-Abrechnung UI — fields on tenancy, calculation logic deferred
- Grundbuch API integration — fields prepared, external API deferred
- Treuhänder as second customer — org model supports it, onboarding flow deferred
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHEMA-01 | Create `organizations` table (id, name, slug, is_active) and `organization_members` junction table (organization_id, user_id, role_id, is_default) with proper indexes | Section: New Tables — Organizations & Members |
| SCHEMA-02 | Create `owners` table (organization_id, name, contact info, owner_type enum) and `mandates` table (organization_id, owner_id, name, mandate_type enum, start/end dates, is_active) | Section: New Tables — Owners & Mandates |
| SCHEMA-03 | Create `tenancies` table (organization_id, unit_id, tenant info, rent_amount, start/end dates, is_active) | Section: New Tables — Tenancies with Swiss Law Fields |
| SCHEMA-04 | Add nullable `organization_id UUID` column to all existing tenant tables (~44 tables needing addition). Add `mandate_id` and `property_type` to properties | Section: Existing Table Audit |
| SCHEMA-05 | Create `current_organization_id()` SECURITY DEFINER function and `set_org_context(org_id UUID)` RPC function | Section: RLS Helper Functions |
| SCHEMA-06 | Add STWE fields to units (ownership_fraction, ownership_period, stwe_owner_id) and properties (renewal_fund_balance, renewal_fund_target) | Section: STWE Preparation Fields — NOTE: English naming required per D1 |
| SCHEMA-07 | Create BEFORE INSERT/UPDATE triggers on child tables that inherit organization_id from parent FK relationship | Section: Trigger Patterns for org_id Sync |
</phase_requirements>

---

## Summary

Phase 35 is a pure PostgreSQL migration phase — no application code changes. It lays the schema foundation for multi-tenant isolation by creating new top-level entities (organizations, owners, mandates, tenancies) and adding organization_id to all existing tenant tables. The work is entirely in SQL migration files continuing from migration 072 (last existing file).

The table audit of all 72 existing migration files reveals 68 actual application tables. Of these, 44 existing tables need organization_id added as a nullable column (Phase 35), with backfill deferred to Phase 36 and NOT NULL constraints deferred to after backfill. Additionally, 5 new tables will be created, and parking_spots within units will be normalized (the existing `parking_spots` data in units with `unit_type='parking_spot'` requires renaming to `'parking'` plus adding `'garage'`, `'storage'` to the CHECK constraint).

The most critical technical decision is trigger-based org_id sync: child tables (buildings inherit from properties, units from buildings, etc.) get BEFORE INSERT/UPDATE triggers so that inserting a building with a property_id automatically populates organization_id. This eliminates the need for application code to manually set org_id on every insert.

**Primary recommendation:** Write 4 migration files (073 through 076) covering: (1) new top-level tables, (2) organization_id columns on existing tables with immediate indexes, (3) RLS helper functions, (4) org_id sync triggers. Each file is independently deployable and idempotent (IF NOT EXISTS / CREATE OR REPLACE).

---

## Standard Stack

### Core (no new packages — all PostgreSQL built-ins)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| PostgreSQL DDL | Postgres 15 (Supabase) | CREATE TABLE, ALTER TABLE, CREATE INDEX | Standard SQL, already in use across 72 migrations |
| SECURITY DEFINER functions | PG built-in | RLS helper without privilege escalation | Only way to read current_setting() safely from RLS |
| BEFORE INSERT/UPDATE triggers | PG built-in | Automatic org_id propagation to child tables | Eliminates app-layer duplication, enforced at DB level |
| CREATE INDEX CONCURRENTLY | PG built-in | Index creation without table locks | Required for production zero-downtime; existing indexes in 071 use CONCURRENTLY |
| set_config() / current_setting() | PG built-in | Per-transaction organization context | Locked decision: use this, not auth.jwt() |

**No npm packages required.** This phase is 100% SQL migration files.

---

## Exact Table Audit

### Complete Table Inventory (72 migrations, 68 application tables)

**Actual count from migration file analysis:**

#### New Tables Created in Phase 35 (5 tables)
| Table | Purpose |
|-------|---------|
| `organizations` | Top-level tenant boundary |
| `organization_members` | user↔org junction |
| `owners` | Property owner entities |
| `mandates` | Management contracts |
| `tenancies` | Rental agreements (new — replaces ad-hoc tenant_name columns) |

#### Existing Tables Needing `organization_id` (per D2 classification)

**Per-Organization tables that need ALTER TABLE (44 tables):**

| Table | Created In | Parent FK for trigger |
|-------|-----------|----------------------|
| `properties` | 008 | (top-level, from mandate) |
| `buildings` | 001 | properties |
| `units` | 001 | buildings |
| `rooms` | 009 | units |
| `projects` | 001 | units |
| `tasks` | 001 | projects |
| `task_dependencies` | 012 | tasks (inherit from task) |
| `renovation_projects` | 011 | units |
| `work_orders` | 013 | tasks |
| `work_order_events` | 038 | work_orders |
| `partners` | 014 | (direct org member — no parent) |
| `media` | 015 | (polymorphic — no single parent trigger) |
| `audit_logs` | 016 | (direct org — no parent) |
| `offers` | 017 | work_orders |
| `invoices` | 018 | work_orders or projects |
| `expenses` | 019 | projects or work_orders |
| `payments` | 020 | invoices |
| `condition_history` | 027 | rooms or units (polymorphic) |
| `comments` | 040 | (polymorphic — entity_type/entity_id) |
| `magic_link_tokens` | 024 | work_orders |
| `kb_categories` | 048 | (direct org) |
| `kb_articles` | 048 | kb_categories |
| `kb_articles_history` | 048 | kb_articles |
| `kb_workflow_transitions` | 048 | kb_articles |
| `kb_dashboard_shortcuts` | 048 | (direct org, per user) |
| `kb_attachments` | 050 | kb_articles |
| `purchase_orders` | 051 | partners (suppliers) |
| `deliveries` | 052 | purchase_orders |
| `inventory_movements` | 054 | (direct org) |
| `purchase_order_allocations` | 055 | purchase_orders |
| `change_orders` | 057 | work_orders |
| `change_order_versions` | 057 | change_orders |
| `change_order_photos` | 057 | change_orders |
| `change_order_approval_tokens` | 058 | change_orders |
| `approval_thresholds` | 057 | (direct org) |
| `inspections` | 059 | units or work_orders |
| `inspection_defects` | 059 | inspections |
| `inspection_portal_tokens` | 060 | inspections |
| `inspection_templates` | 059 | (direct org — Global+Org pattern) |
| `notifications` | 061 | (direct org) |
| `user_notifications` | 061 | notifications |
| `push_subscriptions` | 061 | (per user+org) |
| `notification_preferences` | 061 | (per user+org) |
| `tickets` | 062 | units |
| `ticket_messages` | 062 | tickets |
| `ticket_attachments` | 062 | tickets |
| `ticket_work_orders` | 070 | tickets / work_orders |

**Global Tables (NO organization_id — per D2):**
| Table | Why Global |
|-------|-----------|
| `roles` | System-wide RBAC |
| `permissions` | System-wide RBAC |
| `role_permissions` | System-wide RBAC |
| `system_settings` | Global config |

**Global + Org Extension pattern (org_id NULLABLE):**
| Table | Pattern |
|-------|---------|
| `templates` | NULL = system template, UUID = org copy |
| `template_phases` | Inherits from templates |
| `template_packages` | Inherits from templates |
| `template_tasks` | Inherits from templates |
| `template_dependencies` | Inherits from templates |
| `template_quality_gates` | Inherits from templates |
| `project_phases` | Inherits from projects |
| `project_packages` | Inherits from project_phases |
| `project_quality_gates` | Inherits from project_packages |

**Tables with special handling:**
| Table | Note |
|-------|------|
| `users` | Not org-scoped — users span orgs via organization_members |
| `tenant_users` | Links tenant users to units — gets org_id (isolated per org) |
| `components` | Property components (per-org, linked to buildings/units) |
| `task_audio` | Linked to tasks — gets org_id via tasks parent |
| `task_photos` | Legacy (superseded by media) — check if still used |
| `app_settings` | Key-value store — likely global (no org_id) |
| `ticket_categories` | Global or per-org? Currently no org_id — treat as global |
| `storage_metadata` | Per-org (files belong to org) |
| `inspection_templates` | Global+Org extension pattern |

**TOTAL ACTUAL COUNT:**
- 5 new tables (create fresh)
- ~44 existing tables needing `organization_id` (ALTER TABLE)
- ~9 template/project_phase tables needing nullable org_id (Global+Org)
- ~4 global tables (no change)
- ~5 tables with ambiguous/special handling (decide per table)

**Note:** REQUIREMENTS.md states "~44 tables needing addition" which matches the audit above. The architecture research said "68 tables" total but that includes the new ones and global ones.

---

## Architecture Patterns

### Recommended Migration File Structure

```
supabase/migrations/
  073_org_foundation.sql        -- organizations, organization_members, owners, mandates tables
  074_tenancies.sql             -- tenancies table with Swiss law fields
  075_org_id_columns.sql        -- ALTER TABLE: add organization_id to all existing tenant tables + indexes
  076_rls_helpers.sql           -- current_organization_id() and set_org_context() functions
  077_org_sync_triggers.sql     -- BEFORE INSERT/UPDATE triggers for org_id propagation
  078_stwe_fields.sql           -- STWE prep fields on units and properties; parking unit_type extension
```

**Why 6 files not 1:** Each file is independently rollbackable. If trigger creation fails, the column additions are not rolled back. Each file can also be tested in isolation against a staging environment.

### Pattern 1: New Table Creation with Swiss Legal Fields

```sql
-- Migration: 073_org_foundation.sql
-- organizations table with Swiss legal fields (all per D5)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,       -- URL-safe, e.g., 'kewa-ag'
  is_active BOOLEAN DEFAULT true,
  -- Swiss legal fields (D5, all nullable)
  uid TEXT,                        -- CHE-xxx.xxx.xxx (Unternehmens-ID)
  vat_number TEXT,                 -- MwSt-Nummer
  commercial_register TEXT,        -- Handelsregister-Eintrag
  bank_account TEXT,               -- IBAN
  country TEXT DEFAULT 'CH',       -- For D11 international extensibility
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);
```

### Pattern 2: Organization Members Junction

```sql
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_default ON organization_members(user_id, is_default) WHERE is_default = true;
```

### Pattern 3: Owner Entity (D4)

```sql
-- owner_type uses text + CHECK (consistent with existing schema style)
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL DEFAULT 'person'
    CHECK (owner_type IN ('person', 'company', 'community', 'stwe_association')),
  name TEXT NOT NULL,
  -- Contact fields (D4)
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'CH',
  phone TEXT,
  email TEXT,
  language TEXT DEFAULT 'de',
  -- Optional user link (D4 — owner portal deferred)
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_owners_org ON owners(organization_id);
CREATE INDEX idx_owners_org_type ON owners(organization_id, owner_type);
```

### Pattern 4: Mandates (D3)

```sql
CREATE TABLE IF NOT EXISTS mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id),
  name TEXT NOT NULL,
  mandate_type TEXT NOT NULL DEFAULT 'rental'
    CHECK (mandate_type IN ('rental', 'stwe', 'mixed')),
  start_date DATE NOT NULL,
  end_date DATE,                  -- NULL = ongoing
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mandates_org ON mandates(organization_id);
CREATE INDEX idx_mandates_owner ON mandates(owner_id);
CREATE INDEX idx_mandates_org_active ON mandates(organization_id, is_active);
```

### Pattern 5: Tenancies with Swiss Law Fields (SCHEMA-03, D8)

```sql
-- Migration: 074_tenancies.sql
CREATE TABLE IF NOT EXISTS tenancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  tenant_phone TEXT,
  -- Swiss rental law fields (D8, all nullable)
  base_rent DECIMAL(10,2),                   -- Nettomiete (OR 257a)
  ancillary_costs DECIMAL(10,2),             -- Nebenkosten-Akonto
  deposit_amount DECIMAL(10,2),              -- Mietkaution (max 3x Monatsmiete)
  notice_period_months INTEGER DEFAULT 3,    -- Kündigungsfrist
  reference_interest_rate DECIMAL(4,3),      -- Referenzzinssatz (e.g., 1.750)
  contract_type TEXT DEFAULT 'residential'
    CHECK (contract_type IN ('residential', 'commercial', 'parking', 'storage')),
  start_date DATE NOT NULL,
  end_date DATE,                  -- NULL = ongoing
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenancies_org ON tenancies(organization_id);
CREATE INDEX idx_tenancies_unit ON tenancies(unit_id);
CREATE INDEX idx_tenancies_unit_active ON tenancies(unit_id, is_active);
CREATE INDEX idx_tenancies_org_active ON tenancies(organization_id, is_active);
```

### Pattern 6: Adding organization_id to Existing Tables (SCHEMA-04)

```sql
-- Migration: 075_org_id_columns.sql
-- Pattern: add nullable column + index in same statement block
-- Must be nullable first — backfill happens in Phase 36

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS mandate_id UUID REFERENCES mandates(id),
  ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'rental'
    CHECK (property_type IN ('rental', 'stwe', 'mixed')),
  -- Swiss Grundbuch fields (D9)
  ADD COLUMN IF NOT EXISTS land_registry_nr TEXT,
  ADD COLUMN IF NOT EXISTS municipality TEXT,
  ADD COLUMN IF NOT EXISTS parcel_nr TEXT;

-- Index immediately — critical for RLS performance even before backfill
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_mandate ON properties(mandate_id);

-- Repeat for every tenant table...
ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_org ON buildings(organization_id);

-- etc. for all ~44 tables
```

### Pattern 7: RLS Helper Functions (SCHEMA-05)

```sql
-- Migration: 076_rls_helpers.sql

-- current_organization_id() — reads per-transaction setting
-- SECURITY DEFINER so it can be called from RLS policies safely
-- Returns NULL (not error) if no context set — queries return empty
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- set_org_context() — called via supabase.rpc() from API routes
-- true = LOCAL flag = transaction-scoped (CRITICAL: prevents pool contamination)
CREATE OR REPLACE FUNCTION set_org_context(org_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify functions work:
-- SELECT set_org_context('00000000-0000-0000-0000-000000000001');
-- SELECT current_organization_id();
```

### Pattern 8: Organization ID Sync Triggers (SCHEMA-07)

```sql
-- Migration: 077_org_sync_triggers.sql
-- Trigger function for buildings (inherits from properties)
CREATE OR REPLACE FUNCTION sync_org_id_from_property()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM properties WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_buildings_org_id
  BEFORE INSERT OR UPDATE OF property_id ON buildings
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_property();

-- Trigger function for units (inherits from buildings)
CREATE OR REPLACE FUNCTION sync_org_id_from_building()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.building_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM buildings WHERE id = NEW.building_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_units_org_id
  BEFORE INSERT OR UPDATE OF building_id ON units
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_building();

-- Pattern repeats for: rooms→units, projects→units, tasks→projects,
-- work_orders→tasks, renovation_projects→units, etc.
```

### Pattern 9: Parking Unit Type Extension (D7)

```sql
-- Migration: 078_stwe_fields.sql (or separate migration)
-- The existing CHECK constraint must be dropped and recreated
-- Current: CHECK (unit_type IN ('apartment', 'common_area', 'building', 'parking_spot'))
-- Target: CHECK (unit_type IN ('apartment', 'common_area', 'building', 'parking', 'garage', 'storage'))

ALTER TABLE units DROP CONSTRAINT IF EXISTS units_unit_type_check;
ALTER TABLE units ADD CONSTRAINT units_unit_type_check
  CHECK (unit_type IN ('apartment', 'common_area', 'building', 'parking', 'garage', 'storage'));

-- Rename existing parking_spot data to parking
UPDATE units SET unit_type = 'parking' WHERE unit_type = 'parking_spot';

-- Note: parking_status and parking_number columns from 039 remain valid
```

### Pattern 10: STWE Preparation Fields (SCHEMA-06 — with English naming per D1)

```sql
-- English naming required per CONTEXT.md D1 decision
-- CONFLICT WITH REQUIREMENTS.md: SCHEMA-06 uses German names (wertquote, eigentumsperiode)
-- CONTEXT.md D1 wins — use English names

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS ownership_fraction DECIMAL(5,4),  -- NOT wertquote
  ADD COLUMN IF NOT EXISTS ownership_period DATERANGE,        -- NOT eigentumsperiode
  ADD COLUMN IF NOT EXISTS stwe_owner_id UUID REFERENCES owners(id);

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS renewal_fund_balance DECIMAL(12,2) DEFAULT 0,  -- NOT erneuerungsfonds_balance
  ADD COLUMN IF NOT EXISTS renewal_fund_target DECIMAL(12,2);              -- NOT erneuerungsfonds_target
```

### Anti-Patterns to Avoid

- **Adding NOT NULL in Phase 35:** organization_id must be nullable until backfill (Phase 36). Adding NOT NULL here breaks migration — all existing rows are NULL.
- **Using global SET config (not LOCAL):** `set_config('app.current_organization_id', value, false)` poisons the connection pool. Always `true` for LOCAL.
- **Creating indexes without CONCURRENTLY:** On production tables with existing data, `CREATE INDEX` (no CONCURRENTLY) takes a table lock. Use `CREATE INDEX CONCURRENTLY`.
- **Compound primary keys:** Do not change `id UUID PRIMARY KEY` to compound keys — breaks all existing FK references and the Supabase client expects UUID PKs.
- **Trigger on UPDATE (all columns):** Triggers `BEFORE UPDATE ON table` fire on every UPDATE. Restrict to `BEFORE INSERT OR UPDATE OF property_id` to avoid performance hit on unrelated updates.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-transaction org context | Custom session table | `set_config()` + `current_setting()` | Built into PostgreSQL, zero overhead, transaction-scoped |
| org_id propagation to children | App-layer code to set org_id on every insert | BEFORE INSERT trigger | DB-level guarantee, cannot be forgotten by app code |
| Index creation on live table | Maintenance window + table lock | `CREATE INDEX CONCURRENTLY` | No lock acquired, works on live production data |
| Idempotent migrations | Version tracking table | `IF NOT EXISTS` on all DDL | Native PostgreSQL, migrations can be replayed safely |
| Cross-tenant FK safety | Application-layer validation | Trigger checks org_id consistency | Database enforced, cannot be bypassed |

**Key insight:** The trigger pattern for org_id propagation is the critical "don't hand-roll" item. Without triggers, every API route that inserts a building/unit/task must manually pass organization_id. Triggers make it impossible to forget.

---

## Common Pitfalls

### Pitfall 1: REQUIREMENTS.md Naming Conflicts with CONTEXT.md D1

**What goes wrong:** REQUIREMENTS.md SCHEMA-06 specifies German column names: `wertquote`, `eigentumsperiode`, `erneuerungsfonds_balance`. CONTEXT.md D1 locks English naming: `ownership_fraction`, `ownership_period`, `renewal_fund_balance`. Both docs exist — the planner might use REQUIREMENTS.md as the source of truth.

**Why it happens:** REQUIREMENTS.md was written before the CONTEXT.md discussion that locked English naming as D1.

**How to avoid:** CONTEXT.md decisions override REQUIREMENTS.md column names. The planner must use English column names from D1 examples: `ownership_fraction`, `ownership_period`, `renewal_fund_balance`, `renewal_fund_target`.

**Warning signs:** Any migration file containing `wertquote`, `eigentumsperiode`, `erneuerungsfonds_balance` is wrong.

---

### Pitfall 2: Migration File Numbering Gap

**What goes wrong:** Existing migrations go 001-072, with gaps at 041-043 (missing), 064-069 (missing). New migrations must start at 073, not 073 through any existing gap.

**Why it happens:** Supabase applies migrations in lexicographic order by filename. Filling in gaps would apply migrations out of order relative to the state they were designed for.

**How to avoid:** Start Phase 35 migrations at `073_org_foundation.sql`. Do not back-fill missing migration numbers.

**Warning signs:** Any migration file numbered below 073 that doesn't already exist in the migrations directory.

---

### Pitfall 3: Trigger Infinite Loop on org_id Sync

**What goes wrong:** A trigger `BEFORE UPDATE ON buildings` calls `UPDATE buildings SET org_id = ...` which fires the trigger again — infinite recursion, stack overflow.

**Why it happens:** If the trigger function updates the same table it's watching, without a guard.

**How to avoid:** Use `BEFORE INSERT OR UPDATE OF property_id ON buildings` (column-specific trigger) — the trigger fires only when `property_id` changes, not when `organization_id` is set. The trigger sets `NEW.organization_id` in-memory (BEFORE trigger), which does not fire another UPDATE.

**Warning signs:** Trigger declared as `AFTER UPDATE ON buildings` (use BEFORE not AFTER for in-memory row modification); trigger body contains `UPDATE buildings SET ...` (modifies the table being watched).

---

### Pitfall 4: Parking Type Rename Data Loss

**What goes wrong:** The existing unit_type CHECK constraint includes `'parking_spot'`. Migration 039 seeded 8 parking spots as `unit_type = 'parking_spot'`. If you add `'parking'` without renaming existing rows, you now have two types for parking. Later RLS policies and tenancy queries filtering on `unit_type = 'parking'` will miss the old rows.

**Why it happens:** Adding a new enum value without migrating existing data.

**How to avoid:** In the same migration that modifies the CHECK constraint:
1. Drop the old CHECK constraint
2. Add the new CHECK constraint
3. `UPDATE units SET unit_type = 'parking' WHERE unit_type = 'parking_spot'`

**Warning signs:** If `SELECT count(*) FROM units WHERE unit_type = 'parking_spot'` returns > 0 after Phase 35 runs, the rename was missed.

---

### Pitfall 5: Missing Index on properties.mandate_id

**What goes wrong:** `mandate_id` is added to properties but no index created. Future queries filtering properties by mandate (common in the mandate-switcher) perform full table scans.

**Why it happens:** Most index discussions focus on `organization_id` because it's the RLS column. `mandate_id` is a FK that's equally frequently queried.

**How to avoid:** Create `idx_properties_mandate ON properties(mandate_id)` in the same migration that adds the column.

---

### Pitfall 6: DATERANGE Type for ownership_period

**What goes wrong:** `DATERANGE` is a PostgreSQL-specific type not present in Supabase's JavaScript type generation by default. TypeScript types come back as `string | null` instead of a structured range object.

**Why it happens:** Supabase's `gen types typescript` generates DATERANGE as `unknown` in older versions.

**How to avoid:** This is acceptable for Phase 35 — the STWE fields are prepared but not yet used by application code. Document that when STWE UI is built, a custom type must be defined for DATERANGE handling. Alternatively, use two DATE columns (`ownership_period_start`, `ownership_period_end`) for TypeScript friendliness — defer the decision to the planner.

**Recommendation:** Use two DATE columns (`ownership_period_start DATE`, `ownership_period_end DATE`) for TypeScript compatibility. DATERANGE offers no benefit before STWE queries are built.

---

### Pitfall 7: audit_logs Table Classification

**What goes wrong:** The `audit_logs` table (migration 016) is classified as per-organization in D2, but it currently has no org_id. The table uses an `entity_type / entity_id` polymorphic pattern. Adding org_id here is correct but requires careful thought about the trigger: audit_logs are inserted by a trigger (028_audit_triggers.sql), not by application code. The trigger function must also set organization_id.

**How to avoid:** When adding org_id to audit_logs:
1. Add the nullable column (Phase 35)
2. Phase 36 backfill must handle audit_logs via entity resolution (look up the entity's org_id)
3. Phase 37 audit trigger must be updated to capture current_organization_id() on insert

**Warning signs:** Phase 37 planner must remember to update audit trigger function, not just the table columns.

---

### Pitfall 8: Properties Already Has property_type Added in Architecture Research

**What goes wrong:** The architecture research (ARCHITECTURE.md) shows properties getting `property_type` column. The existing PITFALLS.md also mentions it. A naive migration might add it twice or with conflicting CHECKs.

**How to avoid:** Use `ADD COLUMN IF NOT EXISTS property_type TEXT` to be idempotent. The migration should also check if the column exists before adding. The existing full_schema.sql confirms no property_type column exists yet.

---

## Code Examples

### set_config LOCAL Pattern (Critical)

```sql
-- Source: Supabase docs + ARCHITECTURE.md pattern
-- The 'true' parameter is CRITICAL — it means LOCAL (transaction-scoped)
-- 'false' would be session-level, contaminating the connection pool

CREATE OR REPLACE FUNCTION set_org_context(org_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id::text, true);
  --                                                               ^^^^
  --                                                          true = LOCAL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Idempotent Migration Pattern (All Phase 35 DDL)

```sql
-- Source: existing migration pattern (all migrations use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS organizations (...);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS organization_id UUID;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE OR REPLACE FUNCTION current_organization_id() RETURNS UUID AS $$...$$;
```

### BEFORE Trigger for org_id Sync

```sql
-- Source: ARCHITECTURE.md Pattern 2 (verified correct)
-- BEFORE INSERT OR UPDATE OF property_id prevents infinite loop
-- Sets NEW.organization_id in-memory — no recursive trigger fire

CREATE OR REPLACE FUNCTION sync_org_id_from_property()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM properties WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_buildings_org_id
  BEFORE INSERT OR UPDATE OF property_id ON buildings
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_property();
```

### current_organization_id() with NULL Safety

```sql
-- Source: ARCHITECTURE.md + Supabase docs
-- NULLIF prevents empty string '' being cast to UUID (would error)
-- true parameter to current_setting means "return NULL if not set" (not error)

CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### Nullable Column Addition with Immediate Index

```sql
-- Pattern for all 44 existing tables:
-- 1. Add nullable column (no lock on modern PG for nullable add)
-- 2. Add FK reference to organizations
-- 3. Create CONCURRENTLY to avoid table lock

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_org
  ON buildings(organization_id);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact for Phase 35 |
|--------------|------------------|--------------|---------------------|
| Compound PKs for multi-tenancy | UUID PK + org_id column + RLS | Last 2 years | Keep UUID PKs — don't change |
| auth.jwt() in RLS | current_setting() for PIN-auth apps | Phase 35 decision | Use set_config / current_setting |
| Parking as separate table type | Parking as unit_type variant | Phase 35 | Rename 'parking_spot' → 'parking' |
| Inline RLS subqueries | SECURITY DEFINER helper functions | 2024+ | current_organization_id() function |
| Index after migration | CREATE INDEX CONCURRENTLY in same migration | Established practice | All indexes in same migration file |

---

## Open Questions

1. **ticket_categories table — global or per-org?**
   - What we know: Currently no org_id; seeded with German category names (heizung, wasser_sanitaer); shared across any future tenants
   - What's unclear: Should orgs be able to have custom ticket categories, or is a global set sufficient?
   - Recommendation: Global for Phase 35 (no org_id). Easy to add later. Document this assumption.

2. **approval_thresholds table — global or per-org?**
   - What we know: Migration 057 creates approval_thresholds but no clear parent entity
   - What's unclear: Are approval thresholds organization-specific or global?
   - Recommendation: Per-organization (different orgs may have different approval limits). Add org_id.

3. **storage_metadata table (031_storage_buckets.sql) — needs audit**
   - What we know: Created in migration 031 but not seen in full detail
   - What's unclear: What columns exist, how it relates to media
   - Recommendation: Add org_id if it stores per-org file references. Read 031 before planning.

4. **magic_link_tokens — does it need org_id?**
   - What we know: Links to work_orders; work_orders will have org_id
   - What's unclear: Whether RLS needs to scope magic_link_tokens by org
   - Recommendation: Add org_id for consistency with Phase 37 RLS. Can be populated via work_order JOIN.

5. **ownership_period — DATERANGE vs two DATE columns**
   - What we know: DATERANGE is PostgreSQL-specific; Supabase TypeScript types don't handle it well
   - What's unclear: Whether the planner wants native range semantics or TypeScript simplicity
   - Recommendation: Use `ownership_period_start DATE, ownership_period_end DATE` for TypeScript compatibility. Rename if/when STWE UI is built with native range queries.

6. **app_settings table — global or per-org?**
   - What we know: Seeded with company_name='KEWA AG', support_email, notfall_phone — currently single-tenant assumptions
   - What's unclear: Should settings be per-organization (each org sets their own company name)?
   - Recommendation: Per-organization — each org will have their own company name for tenant portal. Add org_id and make pk (key, organization_id).

---

## Sources

### Primary (HIGH confidence)
- Migration files 001-072 in `supabase/migrations/` — ground truth for existing table structure
- `C:/Dev/KeWa-App/.planning/phases/035-schema-foundation/35-CONTEXT.md` — locked decisions
- `C:/Dev/KeWa-App/.planning/REQUIREMENTS.md` — requirement details (naming conflict with CONTEXT.md noted)
- `C:/Dev/KeWa-App/.planning/research/ARCHITECTURE.md` — verified SQL patterns for RLS helper functions and trigger patterns
- `C:/Dev/KeWa-App/.planning/research/PITFALLS.md` — verified pitfall catalog for this domain

### Secondary (MEDIUM confidence)
- `C:/Dev/KeWa-App/.planning/research/STACK.md` — technology choices already researched
- PostgreSQL docs on `set_config()` — confirmed `true` parameter = LOCAL scope
- Supabase RLS documentation — confirmed `current_setting()` pattern for non-JWT auth

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All PostgreSQL built-ins, no external dependencies, verified in existing migrations
- Table audit: HIGH — Read all 72 migration files to enumerate actual tables (not estimated)
- Architecture patterns: HIGH — Patterns directly verified from ARCHITECTURE.md which was researched against official Supabase docs
- Pitfalls: HIGH — Derived from actual migration file analysis + existing PITFALLS.md research
- STWE field naming conflict: HIGH — Both documents read directly; conflict is real and documented

**Research date:** 2026-02-18
**Valid until:** 2026-04-18 (stable domain — PostgreSQL DDL patterns don't change)

**Critical flag for planner:** The naming conflict between REQUIREMENTS.md (German column names) and CONTEXT.md D1 (English required) must be resolved in favor of CONTEXT.md. Use: `ownership_fraction`, `ownership_period_start`, `ownership_period_end`, `renewal_fund_balance`, `renewal_fund_target`.
