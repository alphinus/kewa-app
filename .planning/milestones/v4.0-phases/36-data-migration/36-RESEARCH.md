# Phase 36: Data Migration & Backfill — Research

**Researched:** 2026-02-18
**Domain:** PostgreSQL data seeding, backfill migrations, ENUM extension, Supabase SQL migrations
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D1: KEWA AG Organization — Real Company Data**
Seed KEWA AG with real Handelsregister data:
- Name: KeWa AG, Slug: kewa-ag
- Address: Rietbrunnen 42, 8808 Pfaeffikon SZ
- UID: CHE-135.108.414, Commercial Register: CH-130.3.026.656-4
- Country: CH, Capital: CHF 100'000, Rechtsform: Aktiengesellschaft
- Deterministic UUID: `00000000-0000-0000-0001-000000000001` (see UUID conflict note below)

**D2: GIMBA AG — Second Organization**
- Name: GIMBA AG, Slug: gimba-ag, Location: 8455 Ruedlingen SH
- UID: CHE-217.838.550, Commercial Register: CH-290.3.020.028-0
- Deterministic UUID: `00000000-0000-0000-0001-000000000002`

**D3: Owner & Mandate Hierarchy** — Both Eigen- and Drittverwaltung per CONTEXT.md

**D4: Property Distribution** — 5 KEWA properties (1 NEW: Leweg 4 Buelach), 2 GIMBA properties (both NEW)

**D5: Comprehensive Showcase User Matrix** — 14+ users across roles and orgs

**D6: Backfill Strategy** — Single KEWA AG UUID for all 62 tables; GIMBA properties are new inserts

**D7: NOT NULL Constraints** — After verification, ALTER all 62 org_id columns + properties.mandate_id and property_type

**D8: Legacy users.role Column** — NOT dropped. New users use role = NULL or placeholder.

**D9: Hauswart Role** — New ENUM value + role record with specific permissions (no financials)

### Claude's Discretion
- Exact deterministic UUIDs for owners, mandates, users (choose clear patterns)
- Migration file numbering (continue from 079+)
- Backfill ordering strategy
- Single file vs split files for seed/backfill/constraints
- How to handle existing user "KEWA AG" (ID ...0001) — rename or keep + create new
- Exact room/unit naming for Leweg 4 Buelach
- Password/PIN hashes for new users
- GIMBA AG building/unit/room depth (properties only, or full hierarchy)
- Contact details for fictional owners

### Deferred Ideas (OUT OF SCOPE)
- Owner portal UI
- STWE unit owner assignment for Neubau Zuerich West
- Dachwohnung STWE conversion
- Eigentuemer report views
- Hauswart building assignment
- Legacy users.role column removal
- Nebenkosten-Abrechnung seed data
- Cross-org contractor visibility rules (RLS Phase 37)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MIGR-01 | Seed KEWA AG Organization — deterministic UUID, owner, mandate, map existing users to org_members with is_default=true | UUID pattern, org_members schema, roles lookup, user enumeration |
| MIGR-02 | Backfill organization_id on all 62 tables — UPDATE all existing rows to KEWA AG UUID, backfill mandate_id on properties, set property_type | Backfill ordering (properties first, then trigger-propagated tables), flat UPDATE pattern, tables without hierarchical parent need direct UPDATE |
| MIGR-03 | Apply NOT NULL constraints — after verification, ALTER TABLE on all 62 org_id columns + properties.mandate_id/property_type | ALTER TABLE ... ALTER COLUMN pattern, verification query pattern, correct list of 62 tables |
</phase_requirements>

---

## Summary

Phase 36 is a pure SQL data migration phase — no TypeScript, no API changes, no UI. It consists of: seeding master data (orgs, owners, mandates, properties, users), backfilling organization_id across 62 existing tables, then promoting nullable columns to NOT NULL after verification. All work is in Supabase migration SQL files starting at 079.

The phase is more complex than it appears because "existing seed" properties referenced in CONTEXT.md (Limmatstrasse, Seefeld, MFH Oerlikon, Bundesplatz, Wabern) do NOT currently exist in any migration. They must be created as new properties in Phase 36. This means Phase 36 also creates the complete property/building/unit hierarchy for the multi-tenant showcase — not just backfills.

The backfill strategy is straightforward: all existing rows get `organization_id = '00000000-0000-0000-0001-000000000001'` (KEWA AG). New GIMBA AG data is inserted fresh. The org_sync_triggers from Phase 35 (077) handle automatic propagation for new inserts going forward — but they do NOT fire for existing rows. For backfill, the safest pattern is: UPDATE properties first (root of hierarchy), then UPDATE all other tables with a single flat UPDATE (same UUID for everything). No batch sizing needed at this data volume.

**Primary recommendation:** Split into 4 migration files: 079 (role+permissions), 080 (seed master data: orgs/owners/mandates/users), 081 (seed properties/buildings/units/rooms + backfill), 082 (NOT NULL constraints). This gives clear rollback boundaries and keeps each file focused.

---

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| PostgreSQL SQL | 15 (Supabase) | All migration logic | Native, no ORM overhead |
| Supabase migrations | current | Migration runner | Already in use in this project |
| bcrypt hash `$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2` | n/a | Password hash for 'test1234' | Already used in 063_seed_tenant_portal.sql |

### No External Libraries Needed
This phase is 100% SQL DDL/DML. No npm packages, no TS code changes.

---

## Architecture Patterns

### Recommended File Split

```
supabase/migrations/
  079_hauswart_role.sql         # ENUM value + role record + permissions
  080_seed_organizations.sql    # orgs, owners, mandates, users, org_members
  081_seed_properties.sql       # properties, buildings, units, rooms, backfill
  082_not_null_constraints.sql  # verification DO block + ALTER TABLE statements
```

Rationale: Each file is independently rollback-able. The NOT NULL file is isolated so if verification finds a gap, only that file needs to be fixed. 080 and 081 can be written and verified independently.

### Pattern 1: Deterministic UUID Assignment

Use a single UUID namespace per entity type for seeded data:
- Organizations: `00000000-0000-0000-00NN-000000000001` where NN = entity group
- KEWA AG org: `00000000-0000-0000-0010-000000000001` — avoid `0001` namespace (already used for buildings)
- GIMBA AG org: `00000000-0000-0000-0010-000000000002`

**CRITICAL UUID CONFLICT:** The CONTEXT.md D1 suggests using `00000000-0000-0000-0001-000000000001` for KEWA AG org UUID. This same UUID is already used as the **building** ID ("Liegenschaft KEWA") in migration 001_initial_schema.sql and referenced in 039_parking_spots.sql and 047_seed_complete_workflow.sql. Different tables, so no FK collision — but the pattern is confusing and should be avoided for maintainability. Recommend using `00000000-0000-0000-0010-000000000001` for KEWA AG organization instead.

If Mario insists on `00000000-0000-0000-0001-000000000001`, it technically works (organizations.id vs buildings.id are different tables). Document this clearly in the migration.

### Pattern 2: users.role Constraint Problem

The `users` table has: `role TEXT NOT NULL CHECK (role IN ('kewa', 'imeri'))`. New users cannot be inserted with `role = NULL` due to NOT NULL constraint. New users must receive one of the valid values ('kewa' or 'imeri') even though this column is being deprecated. The clean approach:

```sql
-- New users in Phase 36 use 'kewa' as placeholder (semantically neutral)
-- D8 says: "New users can have role = NULL or a placeholder value"
-- But NOT NULL constraint prevents NULL — so use 'kewa' as placeholder
-- Phase 37 will drop this column
```

Note: The NOT NULL constraint on `users.role` makes "role = NULL" impossible per D8. Planner must use 'kewa' as placeholder for all new users.

### Pattern 3: Flat Backfill (Single UUID for All 62 Tables)

Since ALL existing data belongs to KEWA AG, the backfill is a flat UPDATE:

```sql
-- Pattern: Direct update with single UUID constant
-- Faster than JOIN-based update, safe because ALL existing rows belong to KEWA AG
UPDATE properties   SET organization_id = KEWA_AG_UUID WHERE organization_id IS NULL;
UPDATE buildings    SET organization_id = KEWA_AG_UUID WHERE organization_id IS NULL;
UPDATE units        SET organization_id = KEWA_AG_UUID WHERE organization_id IS NULL;
-- ... repeat for all 62 tables
```

The `WHERE organization_id IS NULL` guard ensures idempotent re-runs (if migration is applied twice, no harm done).

**Important: Properties must be updated BEFORE other tables** to ensure the mandate_id backfill is correct. But for org_id itself, order doesn't matter since it's a flat UUID assignment.

### Pattern 4: Properties Backfill with mandate_id

Properties need THREE columns backfilled: `organization_id`, `mandate_id`, `property_type`.

Current existing properties:
- "Liegenschaft KEWA" (auto-generated UUID from 008_property_building.sql, no deterministic ID) — use lookup by name
- "Neubau Zürich West" (UUID `00000000-0000-0000-0002-000000000001` from 047_seed_complete_workflow.sql)

Both existing properties belong to KEWA AG. The property-to-mandate mapping:
- "Liegenschaft KEWA" → unclear which specific mandate from D4. This is the generic building with all the original units. Needs clarification in planning: is this one of the 4 "existing seed" properties? It doesn't match any named property in D4.

**CRITICAL DISCOVERY:** The CONTEXT.md references these as "existing seed" for KEWA:
- Limmatstrasse 42, 8005 Zuerich
- Wohnanlage Seefeld, 8008 Zuerich
- MFH Oerlikon, 8050 Zuerich

And for GIMBA:
- Bundesplatz 8, 3011 Bern
- Siedlung Wabern, 3084 Wabern

**NONE of these exist in any current migration.** Only 2 properties exist:
1. "Liegenschaft KEWA" (auto-UUID from 008)
2. "Neubau Zürich West" (`00000000-0000-0000-0002-000000000001` from 047)

The planner must create ALL the "existing seed" properties as new inserts in Phase 36. The 13 existing units in building `00000000-0000-0000-0001-000000000001` need to be associated with one of the KEWA properties. The most logical assignment: the existing "Liegenschaft KEWA" building maps to either "Limmatstrasse 42" or "Wohnanlage Seefeld" — or the building gets RENAMED to Leweg 4 Buelach (it has the right unit count: 13 units for a 3-floor + DG building). Actually: Leweg 4 has exactly 10 units (3+3+3+1) and "Liegenschaft KEWA" currently has 13 apartments + common areas. These don't match. The planner needs to decide: either (a) the existing building stays as a generic test building and gets assigned to one of the KEWA mandates, or (b) create Leweg 4 as a fresh building separate from the existing one.

**Recommendation:** Keep "Liegenschaft KEWA" building assigned to "Wohnanlage Seefeld" mandate (it has the most units, 13 apartments, reasonable for a Seefeld complex). Create Leweg 4 as a brand new property+building+10 units. This preserves all existing data relationships while adding the real property.

### Pattern 5: ENUM Extension (hauswart)

PostgreSQL ENUM values can be added with `ADD VALUE IF NOT EXISTS`. This is an irreversible DDL change — once added, the value cannot be removed without recreating the type.

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hauswart';
```

Key constraint: `ADD VALUE` cannot run inside a transaction that also uses the new value. In Supabase migrations (which run in autocommit mode), this is not an issue — each statement commits independently.

But there is a subtlety: if the migration file uses `BEGIN/COMMIT` blocks, `ADD VALUE` must be OUTSIDE the transaction block. Standard Supabase migration files without explicit transactions are fine.

```sql
-- Safe: no explicit transaction
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hauswart';
-- Now insert the role record referencing 'hauswart'
INSERT INTO roles (name, display_name, description, is_internal) VALUES
  ('hauswart', 'Hauswart', 'Gebaeudeunterhalt, Inspektionen und Meldungen', true)
ON CONFLICT (name) DO NOTHING;
```

### Pattern 6: Permission Assignment for hauswart

The permissions table from 022_rbac.sql has codes:
- `properties:read`, `buildings:read`, `units:read`, `rooms:read` — exist
- `tasks:read`, `tasks:create`, `tasks:update` — exist
- `work_orders:read` — exists
- `inspections:read`, `inspections:create`, `inspections:update` — need to verify (059_inspections.sql may have added these)
- `tickets:read`, `tickets:update` — exist

Note: `buildings:read` and `rooms:read` are NOT in the current permissions seed (022_rbac.sql). The permissions seed only includes: properties, units, projects, tasks, work_orders, partners, costs, reports, users, tenants, tickets, audit, settings. Hauswart permissions referencing `buildings:read` and `rooms:read` will fail unless those permission records are inserted first. The planner must INSERT missing permissions before assigning them to the hauswart role.

Permissions NOT in 022_rbac.sql that hauswart needs (to be inserted in 079):
- `buildings:read` — buildings resource
- `rooms:read` — rooms resource
- `inspections:read`, `inspections:create`, `inspections:update` — inspections resource

### Pattern 7: organization_members Seed

The `organization_members` table has `UNIQUE(organization_id, user_id)`. For the cross-org users (Mario Giacchino, Thomas Wyss), two rows are inserted — one per org. This is explicitly supported by the schema.

Existing users to map to KEWA AG:
- `00000000-0000-0000-0000-000000000001` (KEWA AG / Rolf Kaelin)
- `00000000-0000-0000-0000-000000000002` (Imeri — role changes to hauswart)
- Hans Mueller, Anna Schmidt, Peter Weber (from 063_seed_tenant_portal.sql, no deterministic UUIDs — use lookup by email)

The `organization_members` lookup for tenants needs `role_id` from the `roles` table. Use a subquery: `(SELECT id FROM roles WHERE name = 'tenant')`.

### Pattern 8: NOT NULL Constraint Application

The safe pattern is a DO block with row counts:

```sql
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT count(*) INTO null_count FROM properties WHERE organization_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'properties still has % NULL organization_id rows', null_count;
  END IF;
END $$;

ALTER TABLE properties ALTER COLUMN organization_id SET NOT NULL;
```

This pattern ensures the migration fails loudly if any table has missed rows, rather than silently applying the constraint and failing on the first application query.

### Anti-Patterns to Avoid

- **Overusing ON CONFLICT DO NOTHING:** For UUID-based inserts, prefer `ON CONFLICT (id) DO NOTHING`. For non-ID conflict checks (like slug), use `ON CONFLICT (slug) DO NOTHING`. Don't use `ON CONFLICT DO NOTHING` without specifying the column.
- **Updating without WHERE clause:** Never `UPDATE properties SET organization_id = X` without `WHERE organization_id IS NULL` — breaks idempotency.
- **Using ADD VALUE inside explicit transaction:** Would fail with "cannot run inside a transaction block". Keep ENUM adds at the top level.
- **Assuming trigger propagation fires on UPDATE:** Phase 35 triggers are BEFORE INSERT OR UPDATE OF specific_column. The trigger fires if the FK column changes. During backfill, we UPDATE organization_id directly — the trigger will NOT re-fire because we're not changing property_id/building_id/etc. This is correct — direct UPDATE is the right pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | Re-use existing bcrypt hash from 063_seed | Already verified working: `$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2` |
| PIN hashing | New bcrypt | Same hash placeholder pattern as 002_set_pin_hashes.sql | Consistency; PIN set separately in dev anyway |
| Backfill ordering logic | Complex dependency graph | Flat UPDATE with same UUID | All existing data = KEWA AG, no ordering required for org_id backfill |
| ENUM introspection | `SELECT enum_range(NULL::user_role)` | Trust the migration | Known values, no runtime introspection needed |

---

## Common Pitfalls

### Pitfall 1: UUID Namespace Collision (CRITICAL)

**What goes wrong:** Using `00000000-0000-0000-0001-000000000001` for KEWA AG organization UUID when this UUID is already the `buildings.id` for "Liegenschaft KEWA". Causes no SQL error (different tables), but creates confusion and makes logs hard to trace.

**Why it happens:** CONTEXT.md D1 suggests this UUID as an example. The pattern `0001` was already used for buildings in migration 001.

**How to avoid:** Use `0010` namespace for organizations: KEWA AG = `00000000-0000-0000-0010-000000000001`, GIMBA AG = `00000000-0000-0000-0010-000000000002`. If Mario reviews and insists on the D1 suggested UUIDs, document the dual-use clearly.

**Warning signs:** If the planner uses `00000000-0000-0000-0001-0000000000XX`, check that it doesn't match any buildings.id in migration 001.

### Pitfall 2: users.role NOT NULL Constraint

**What goes wrong:** New users inserted with `role = NULL` fail with NOT NULL constraint violation.

**Why it happens:** D8 says "can have role = NULL or a placeholder value" — but the constraint `role TEXT NOT NULL CHECK (role IN ('kewa', 'imeri'))` prevents NULL.

**How to avoid:** All new users in Phase 36 get `role = 'kewa'` as a placeholder value. Document that this column is deprecated and will be dropped in Phase 37.

**Warning signs:** Any INSERT INTO users without a `role` value.

### Pitfall 3: Missing Permission Codes for hauswart

**What goes wrong:** `INSERT INTO role_permissions` fails because `buildings:read`, `rooms:read`, `inspections:read`, etc. don't exist in the `permissions` table.

**Why it happens:** 022_rbac.sql doesn't seed building-level or inspection-level permissions. The hauswart role needs them.

**How to avoid:** In 079_hauswart_role.sql, INSERT missing permissions first before assigning them to the role.

**Warning signs:** FK violation on `permission_id` in role_permissions insert.

### Pitfall 4: "Existing Seed" Properties Don't Exist

**What goes wrong:** Planner writes backfill assuming Limmatstrasse, Seefeld, Oerlikon, Bundesplatz, Wabern properties exist in DB. They don't.

**Why it happens:** CONTEXT.md D4 calls them "existing seed" but they were never migrated.

**How to avoid:** Create all named properties as new INSERTs with deterministic UUIDs. The only truly existing properties are "Liegenschaft KEWA" (auto-UUID from 008) and "Neubau Zürich West" (`00000000-0000-0000-0002-000000000001` from 047).

**Warning signs:** Any UPDATE or lookup referencing property names that don't exist.

### Pitfall 5: Backfill of Orphaned Tables

**What goes wrong:** Some tables have `organization_id` but no hierarchical parent with a trigger. These require explicit direct UPDATE. If missed, NOT NULL constraint in 082 will fail for those tables.

**Why it happens:** 077_org_sync_triggers.sql explicitly excludes: `purchase_orders` (no hierarchical parent), `kb_categories` (direct-org table), `partners`, `notifications`, `push_subscriptions`, `templates`, `template_*` (NULL = system), `inspection_templates`, `app_settings`, `audit_logs`, `media`, `comments`, `condition_history`, `storage_metadata` (polymorphic, no single FK).

**How to avoid:** The 081 backfill must include explicit UPDATE statements for ALL 62 tables — both hierarchical and direct. For tables where NULL is intentional (templates with organization_id = NULL = system template), do NOT set NOT NULL in 082. Cross-check 075_org_id_columns.sql for the authoritative list of 62 tables.

**Warning signs:** 082 NOT NULL ALTER failing on templates, template_phases, template_tasks, etc.

**IMPORTANT EXCEPTION:** `templates`, `template_phases`, `template_packages`, `template_tasks`, `template_dependencies`, `template_quality_gates` use `organization_id = NULL` to mean "system template" (per 075 migration comment: "NULL = system entry (template/definition), UUID = org-specific entry"). These tables should NOT get NOT NULL constraints. The planner must exclude these from D7 NOT NULL application.

### Pitfall 6: tenancies Table Already Has NOT NULL

**What goes wrong:** Including `tenancies` in the 082 NOT NULL ALTER list. Migration 074 created `tenancies.organization_id` as `NOT NULL` from the start (it's a new table, not an existing one that was altered).

**Why it happens:** The 62-table list from Phase 35 includes tenancies because it was added to org tracking, but 074 created it already NOT NULL.

**How to avoid:** Verify the tenancies column definition: `organization_id UUID NOT NULL REFERENCES organizations(id)`. Skip ALTER for tenancies in 082.

**Warning signs:** `ALTER TABLE tenancies ALTER COLUMN organization_id SET NOT NULL` would succeed (idempotent in PostgreSQL if already NOT NULL) but is unnecessary.

### Pitfall 7: Existing users With No organization_members Entry

**What goes wrong:** After Phase 36, API routes that look up user's org via `organization_members` find nothing for existing users if the mapping INSERT was missed.

**Why it happens:** It's easy to INSERT the org but forget to INSERT all the user-to-org membership rows.

**How to avoid:** In 080, insert `organization_members` rows for ALL users that should have KEWA AG access: existing users (`...0001`, `...0002`) plus all tenant users from 063 (Hans Mueller, Anna Schmidt, Peter Weber). Use `ON CONFLICT (organization_id, user_id) DO NOTHING` for safety.

**Warning signs:** Post-migration: `SELECT count(*) FROM organization_members WHERE organization_id = KEWA_AG_UUID` is lower than expected active user count.

---

## Code Examples

### hauswart ENUM and Role (verified from 022_rbac.sql pattern)

```sql
-- 079_hauswart_role.sql
-- Step 1: Add ENUM value (must be outside transaction block)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hauswart';

-- Step 2: Insert missing permissions needed by hauswart
INSERT INTO permissions (code, name, resource, action, description) VALUES
  ('buildings:read', 'View Buildings', 'buildings', 'read', 'View building details'),
  ('rooms:read', 'View Rooms', 'rooms', 'read', 'View room details'),
  ('inspections:read', 'View Inspections', 'inspections', 'read', 'View inspection details'),
  ('inspections:create', 'Create Inspections', 'inspections', 'create', 'Create new inspections'),
  ('inspections:update', 'Update Inspections', 'inspections', 'update', 'Edit inspection details')
ON CONFLICT (code) DO NOTHING;

-- Step 3: Insert hauswart role
INSERT INTO roles (name, display_name, description, is_internal) VALUES
  ('hauswart', 'Hauswart', 'Gebaeudeunterhalt, Inspektionen und Meldungen', true)
ON CONFLICT (name) DO NOTHING;

-- Step 4: Assign permissions to hauswart
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hauswart'
  AND p.code IN (
    'properties:read', 'buildings:read', 'units:read', 'rooms:read',
    'tasks:read', 'tasks:create', 'tasks:update',
    'work_orders:read',
    'inspections:read', 'inspections:create', 'inspections:update',
    'tickets:read', 'tickets:update'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

### Org Seed with Deterministic UUID (verified from 073_org_foundation.sql pattern)

```sql
-- 080_seed_organizations.sql
-- KEWA AG organization
INSERT INTO organizations (id, name, slug, uid, commercial_register, country, is_active)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  'KeWa AG',
  'kewa-ag',
  'CHE-135.108.414',
  'CH-130.3.026.656-4',
  'CH',
  true
) ON CONFLICT (id) DO NOTHING;

-- GIMBA AG organization
INSERT INTO organizations (id, name, slug, uid, commercial_register, country, is_active)
VALUES (
  '00000000-0000-0000-0010-000000000002',
  'GIMBA AG',
  'gimba-ag',
  'CHE-217.838.550',
  'CH-290.3.020.028-0',
  'CH',
  true
) ON CONFLICT (id) DO NOTHING;
```

### User Insert Pattern (verified from 063_seed_tenant_portal.sql)

```sql
-- New PIN user (admin)
INSERT INTO users (id, pin_hash, role, display_name, role_id, auth_method, is_active)
VALUES (
  '00000000-0000-0000-0020-000000000001',  -- Rolf Kaelin
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',  -- placeholder PIN
  'kewa',  -- legacy column, required NOT NULL
  'Rolf Kaelin',
  (SELECT id FROM roles WHERE name = 'admin'),
  'pin',
  true
) ON CONFLICT (id) DO NOTHING;

-- New email/password user
INSERT INTO users (id, pin_hash, email, password_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000004',  -- Sandra Keller
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',  -- pin_hash NOT NULL, use same placeholder
  'sandra.keller@kewa.ch',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',  -- bcrypt('test1234')
  'kewa',
  'Sandra Keller',
  (SELECT id FROM roles WHERE name = 'accounting'),
  'email_password',
  true,
  true
) ON CONFLICT (id) DO NOTHING;
```

### Existing User Imeri — Role Update to hauswart

```sql
-- Update Imeri (existing user 00000000-0000-0000-0000-000000000002)
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'hauswart')
WHERE id = '00000000-0000-0000-0000-000000000002';
```

### Organization Members Seed Pattern

```sql
-- Map existing user to org (lookup by deterministic ID)
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',  -- KEWA AG
  '00000000-0000-0000-0000-000000000001',  -- KEWA AG user / Rolf Kaelin
  (SELECT id FROM roles WHERE name = 'admin'),
  true
) ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Map tenant user by email lookup (no deterministic UUID from 063)
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
SELECT
  '00000000-0000-0000-0010-000000000001',
  u.id,
  (SELECT id FROM roles WHERE name = 'tenant'),
  true
FROM users u
WHERE u.email = 'mueller@example.com'
ON CONFLICT (organization_id, user_id) DO NOTHING;
```

### Property Seed with Deterministic UUID and Backfill

```sql
-- New properties (all are new inserts)
INSERT INTO properties (id, name, address, organization_id, mandate_id, property_type)
VALUES (
  '00000000-0000-0000-0003-000000000001',
  'Limmatstrasse 42',
  'Limmatstrasse 42, 8005 Zürich',
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0004-000000000001',  -- Eigenverwaltung KEWA mandate UUID
  'rental'
) ON CONFLICT (id) DO NOTHING;

-- Existing property backfill (update by ID — Neubau Zürich West has deterministic UUID)
UPDATE properties
SET
  organization_id = '00000000-0000-0000-0010-000000000001',
  mandate_id = '00000000-0000-0000-0004-000000000003',  -- STWE Pensionskasse ZH mandate UUID
  property_type = 'stwe'
WHERE id = '00000000-0000-0000-0002-000000000001'
  AND organization_id IS NULL;

-- Existing "Liegenschaft KEWA" property — lookup by name (auto-UUID, unknown)
UPDATE properties
SET
  organization_id = '00000000-0000-0000-0010-000000000001',
  mandate_id = '00000000-0000-0000-0004-000000000001',  -- assign to appropriate mandate
  property_type = 'rental'
WHERE name = 'Liegenschaft KEWA'
  AND organization_id IS NULL;
```

### Flat Backfill for Non-Property Tables

```sql
-- All existing data is KEWA AG — direct flat UPDATE, no JOIN needed
DO $$
DECLARE
  kewa_id UUID := '00000000-0000-0000-0010-000000000001';
BEGIN
  UPDATE buildings            SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE units                SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE rooms                SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE components           SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE renovation_projects  SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE projects             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE project_phases       SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE project_packages     SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE project_quality_gates SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE tasks                SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE task_photos          SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE task_audio           SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE task_dependencies    SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE work_orders          SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE work_order_events    SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE offers               SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE invoices             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE expenses             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE payments             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE partners             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE purchase_orders      SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE deliveries           SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inventory_movements  SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE purchase_order_allocations SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE approval_thresholds  SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE change_orders        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE change_order_versions SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE change_order_photos  SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE change_order_approval_tokens SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inspections          SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inspection_defects   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inspection_portal_tokens SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inspection_templates SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE media                SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE audit_logs           SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE comments             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE magic_link_tokens    SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE storage_metadata     SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_categories        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_articles          SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_articles_history  SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_workflow_transitions SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_dashboard_shortcuts SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_attachments       SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE notifications        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE user_notifications   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE push_subscriptions   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE notification_preferences SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE tickets              SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE ticket_messages      SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE ticket_attachments   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE ticket_work_orders   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE condition_history    SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE app_settings         SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE tenant_users         SET organization_id = kewa_id WHERE organization_id IS NULL;
  -- NOTE: templates, template_phases, template_packages, template_tasks,
  --       template_dependencies, template_quality_gates are EXCLUDED.
  --       organization_id = NULL means "system template" for these tables.
  --       Do NOT backfill them. Do NOT add NOT NULL constraint to them.
  RAISE NOTICE 'Backfill complete';
END $$;
```

### NOT NULL Verification and Application

```sql
-- 082_not_null_constraints.sql
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'properties', 'buildings', 'units', 'rooms', 'components',
    'renovation_projects', 'projects', 'project_phases', 'project_packages',
    'project_quality_gates', 'tasks', 'task_photos', 'task_audio',
    'task_dependencies', 'work_orders', 'work_order_events', 'offers',
    'invoices', 'expenses', 'payments', 'partners', 'purchase_orders',
    'deliveries', 'inventory_movements', 'purchase_order_allocations',
    'approval_thresholds', 'change_orders', 'change_order_versions',
    'change_order_photos', 'change_order_approval_tokens', 'inspections',
    'inspection_defects', 'inspection_portal_tokens', 'inspection_templates',
    'media', 'audit_logs', 'comments', 'magic_link_tokens', 'storage_metadata',
    'kb_categories', 'kb_articles', 'kb_articles_history', 'kb_workflow_transitions',
    'kb_dashboard_shortcuts', 'kb_attachments', 'notifications', 'user_notifications',
    'push_subscriptions', 'notification_preferences', 'tickets', 'ticket_messages',
    'ticket_attachments', 'ticket_work_orders', 'condition_history', 'app_settings',
    'tenant_users'
  ];
  tbl TEXT;
  null_count BIGINT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE organization_id IS NULL', tbl) INTO null_count;
    IF null_count > 0 THEN
      RAISE EXCEPTION 'Table % has % NULL organization_id rows — backfill incomplete', tbl, null_count;
    END IF;
  END LOOP;
  RAISE NOTICE 'All % tables verified: zero NULL organization_id values', array_length(tables, 1);
END $$;

-- Apply NOT NULL constraints (only after verification above passes)
ALTER TABLE properties ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE properties ALTER COLUMN mandate_id SET NOT NULL;
ALTER TABLE properties ALTER COLUMN property_type SET NOT NULL;
ALTER TABLE buildings ALTER COLUMN organization_id SET NOT NULL;
-- ... etc for all tables in the verified list above
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Single org (all data shared) | Multi-tenant with org_id on every table | All queries will need org context in Phase 37 |
| properties without mandate_id | properties.mandate_id NOT NULL after Phase 36 | Mandate-scoped property queries enabled |
| 5 roles (admin, property_manager, accounting, tenant, external_contractor) | 6 roles (+ hauswart) | New role available for Phase 38 dashboard scoping |

---

## Open Questions

1. **UUID for KEWA AG Organization**
   - What we know: CONTEXT.md D1 suggests `00000000-0000-0000-0001-000000000001` (same namespace as existing buildings.id)
   - What's unclear: Whether Mario cares about the collision with buildings.id UUID
   - Recommendation: Use `00000000-0000-0000-0010-000000000001` (new 0010 namespace). If Mario disagrees after seeing the plan, the change is trivial.

2. **Existing "Liegenschaft KEWA" Building Assignment**
   - What we know: Building `00000000-0000-0000-0001-000000000001` has 13 apartments + common areas. D4 lists 4 KEWA rental properties but none match a 13-unit generic building.
   - What's unclear: Which property does this building get assigned to? Leweg 4 has 10 units (too few). The 13-unit building is closest to "Wohnanlage Seefeld" (a complex).
   - Recommendation: Rename "Liegenschaft KEWA" building and assign to "Wohnanlage Seefeld" property. The existing rooms/tasks/renovation projects/work orders all belong to it. This is the safest assignment that preserves test data coherence.

3. **Existing tenants (Mueller, Schmidt, Weber) unit assignments**
   - What we know: 063_seed_tenant_portal.sql assigned them to units via `ORDER BY random() LIMIT 1` — no deterministic unit assignments.
   - What's unclear: D5 says "Hans Mueller → Leweg 4 unit, Anna Schmidt → Limmatstrasse unit, Peter Weber → Seefeld unit"
   - Recommendation: In 080, UPDATE tenant_users to set specific unit assignments (Leweg 4 unit for Mueller, etc.). The existing random assignments must be overwritten with deterministic ones.

4. **Template tables and NOT NULL**
   - What we know: 075 migration explicitly notes "NULL = system entry (template/definition)" for templates and template_* tables
   - What's unclear: Should these 6 tables be entirely excluded from NOT NULL, or only for existing system templates?
   - Recommendation: Exclude all 6 template tables from NOT NULL application entirely. Organization-specific templates can be added later with org_id set — the system templates need to stay NULL.

5. **Leweg 4 Buelach — New vs Existing Building**
   - What we know: D4 says Leweg 4 is NEW property with 1 building, 10 units. The existing building `00000000-0000-0000-0001-000000000001` has 13 apartments.
   - What's unclear: Whether to keep the existing building as-is or repurpose it
   - Recommendation: Keep existing building intact (assigned to Wohnanlage Seefeld). Create Leweg 4 as a completely new property + building + 10 units with fresh UUIDs. This preserves all existing renovation/task data.

---

## Migration File Plan (Recommended)

| File | Number | Content | Dependencies |
|------|--------|---------|-------------|
| 079_hauswart_role.sql | 079 | ENUM add, missing permissions, role record, role_permissions | 022_rbac.sql |
| 080_seed_organizations.sql | 080 | orgs, owners, mandates, users, org_members, owner user_id FKs | 073, 079 |
| 081_seed_properties.sql | 081 | New properties + buildings + units + rooms (all 7 new properties), existing property backfill, flat backfill of all 55+ non-property tables, tenancy records | 080 |
| 082_not_null_constraints.sql | 082 | Verification DO block + ALTER TABLE NOT NULL on 56 tables (excl. template tables and tenancies) | 081 |

Total migration files: 4

---

## Complete Entity UUID Reference (for Planner)

Use this namespace scheme for all deterministic UUIDs:

| Namespace | Entity Type | Example |
|-----------|-------------|---------|
| `0010` | Organizations | `00000000-0000-0000-0010-000000000001` = KEWA AG |
| `0011` | Owners | `00000000-0000-0000-0011-000000000001` = KeWa AG as owner |
| `0012` | Mandates | `00000000-0000-0000-0012-000000000001` = Eigenverwaltung KEWA |
| `0013` | Properties (new) | `00000000-0000-0000-0013-000000000001` = Leweg 4 |
| `0014` | Buildings (new) | `00000000-0000-0000-0014-000000000001` = Leweg 4 Gebaeude |
| `0015` | Units (new for Leweg 4) | `00000000-0000-0000-0015-000000000001..010` |
| `0020` | New users | `00000000-0000-0000-0020-000000000001` = Rolf Kaelin |

Existing deterministic UUIDs to preserve:
- `00000000-0000-0000-0000-000000000001` = KEWA AG user (to be renamed Rolf Kaelin OR kept as service account)
- `00000000-0000-0000-0000-000000000002` = Imeri (role → hauswart)
- `00000000-0000-0000-0001-000000000001` = building "Liegenschaft KEWA" (keep as-is, assign to Wohnanlage Seefeld)
- `00000000-0000-0000-0002-000000000001` = property "Neubau Zürich West" (backfill with KEWA org + STWE mandate)

---

## Sources

### Primary (HIGH confidence)
- Migration 022_rbac.sql — exact permissions table codes and role_permissions patterns
- Migration 023_users_auth.sql — users table schema, existing user IDs, role column constraint
- Migration 063_seed_tenant_portal.sql — bcrypt hash for 'test1234', user insert pattern
- Migration 073_org_foundation.sql — organizations/owners/mandates schema
- Migration 075_org_id_columns.sql — authoritative list of all 62 tables receiving organization_id
- Migration 077_org_sync_triggers.sql — which tables are trigger-propagated vs need direct backfill
- Migration 001_initial_schema.sql — existing building/unit UUIDs, users.role constraint
- Migration 047_seed_complete_workflow.sql — Neubau Zürich West property UUID
- Migration 074_tenancies.sql — tenancies already has NOT NULL on organization_id

### Secondary (MEDIUM confidence)
- CONTEXT.md D1–D9 — user decisions (locked constraints)
- REQUIREMENTS.md MIGR-01/02/03 — acceptance criteria

### Tertiary (LOW confidence — needs validation in planning)
- Property-to-mandate assignment for existing "Liegenschaft KEWA" building (see Open Questions)
- Whether Mario prefers UUID `0001` namespace for orgs despite collision with buildings UUID namespace

---

## Metadata

**Confidence breakdown:**
- Migration file structure: HIGH — based on direct inspection of all relevant migrations
- Backfill strategy: HIGH — flat UPDATE with single UUID is provably correct for single-org backfill
- UUID conflict detection: HIGH — confirmed via grep across all migrations
- "Existing seed" property gap: HIGH — confirmed no Limmatstrasse/Seefeld/etc. in any migration
- Template table exclusion from NOT NULL: HIGH — 075 migration comment explicitly states NULL=system
- hauswart permissions gap: HIGH — confirmed `buildings:read`, `rooms:read`, `inspections:*` not in 022

**Research date:** 2026-02-18
**Valid until:** stable (SQL migrations don't change without explicit new migrations)
