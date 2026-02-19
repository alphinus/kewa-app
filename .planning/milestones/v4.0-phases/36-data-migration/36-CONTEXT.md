# Phase 36 Context: Data Migration & Backfill

**Created:** 2026-02-18
**Phase:** 36 — Data Migration & Backfill
**Source:** discuss-phase session

## Decisions (LOCKED — implement exactly)

### D1: KEWA AG Organization — Real Company Data

Seed KEWA AG with real Handelsregister data:
- **Name:** KeWa AG
- **Slug:** kewa-ag
- **Address:** Rietbrunnen 42, 8808 Pfaeffikon SZ
- **UID:** CHE-135.108.414
- **Commercial Register:** CH-130.3.026.656-4
- **Country:** CH
- **Capital:** CHF 100'000
- **Rechtsform:** Aktiengesellschaft
- **Zweck:** Kauf und Verkauf sowie Verwaltung von Immobilien

Use a deterministic UUID for KEWA AG (e.g., `00000000-0000-0000-0001-000000000001`).

### D2: GIMBA AG — Second Organization for Multi-Tenant Showcase

Seed GIMBA AG as second organization with real data:
- **Name:** GIMBA AG
- **Slug:** gimba-ag
- **Location:** 8455 Ruedlingen SH
- **UID:** CHE-217.838.550
- **Commercial Register:** CH-290.3.020.028-0
- **Country:** CH
- **Capital:** CHF 100'000
- **VR-Praesident:** Simon Hugo Graber
- **Services:** Bauherrenvertretung, Projekte, Renovationen, Immobilienverkauf

Use a deterministic UUID for GIMBA AG (e.g., `00000000-0000-0000-0001-000000000002`).

### D3: Owner & Mandate Hierarchy — Both Eigen- and Drittverwaltung

**KEWA AG owners and mandates:**

| Owner | Type | Mandate Name | Mandate Type | Properties |
|-------|------|-------------|--------------|------------|
| KeWa AG | company (Eigenverwaltung) | Eigenverwaltung KEWA | rental | Leweg 4 Buelach, Limmatstrasse 42 Zuerich, Wohnanlage Seefeld Zuerich |
| Erbengemeinschaft Brunner | community (Drittverwaltung) | Mandat Brunner | rental | MFH Oerlikon |
| Pensionskasse Zuerich | company (STWE) | STWE Pensionskasse ZH | stwe | Neubau Zuerich West |

- Erbengemeinschaft Brunner: fictional-realistic. Contact: Fritz Brunner, Muehlegasse 12, 8001 Zuerich.
- Pensionskasse Zuerich: fictional-realistic. No user_id FK (institutional owner, no portal login).
- KeWa AG as owner uses the SAME organization data as contact info.

**GIMBA AG owners and mandates:**

| Owner | Type | Mandate Name | Mandate Type | Properties |
|-------|------|-------------|--------------|------------|
| Graber Immobilien GmbH | company | Verwaltung Graber | rental | Bundesplatz 8 Bern, Siedlung Wabern |

All mandates have `start_date = '2024-01-01'`, `end_date = NULL` (ongoing), `is_active = true`.

### D4: Property Distribution Between Organizations

**KEWA AG properties** (5 total):
1. **Leweg 4, 8180 Buelach** (NEW) — 1 building, 10 units (3 per floor: 2.5zi, 3.5zi, 4.5zi + Dachwohnung), property_type = 'rental'
2. Limmatstrasse 42, 8005 Zuerich (existing seed) — property_type = 'rental'
3. Wohnanlage Seefeld, 8008 Zuerich (existing seed) — property_type = 'rental'
4. MFH Oerlikon, 8050 Zuerich (existing seed) — property_type = 'rental'
5. Neubau Zuerich West, 8005 Zuerich (existing seed) — property_type = 'stwe'

**GIMBA AG properties** (2 total):
1. Bundesplatz 8, 3011 Bern (existing seed) — property_type = 'rental'
2. Siedlung Wabern, 3084 Wabern (existing seed) — property_type = 'rental'

**CRITICAL:** Leweg 4 Buelach MUST remain with KEWA AG. This is a real property.

**Leweg 4 detail:**
- 1 block (Mehrfamilienhaus), 3 Stockwerke + Dachgeschoss
- EG: 2.5zi, 3.5zi, 4.5zi (3 units)
- OG1: 2.5zi, 3.5zi, 4.5zi (3 units)
- OG2: 2.5zi, 3.5zi, 4.5zi (3 units)
- DG: grosse Dachwohnung (1 unit, potential future STWE conversion)
- Total: 10 Wohneinheiten

### D5: Comprehensive Showcase User Matrix

Seed users that demonstrate ALL role types and cross-org scenarios.

**New role needed:** `hauswart` (Hauswart / Facility Manager) — add to `user_role` ENUM and `roles` table with `is_internal = true`, permissions between property_manager (too broad) and external_contractor (too narrow). Hauswart sees: building maintenance, unit inspections, tasks, but NOT financials (costs, invoices, payments).

**KEWA AG users:**

| User | Role | Auth | Notes |
|------|------|------|-------|
| Rolf Kaelin | admin | pin | Real KEWA AG operator. New user. |
| Flurina Kaelin | admin | pin | Real KEWA AG operator. New user. |
| Imeri | hauswart | pin | Existing user (ID ...0002). Change role from property_manager to hauswart. Contracted to KEWA AG. |
| Sandra Keller | accounting | email_password | New user. Buchhaltung. |
| Beat Steiner | hauswart | pin | New user. Second Hauswart for different properties. |
| Hans Mueller | tenant | email_password | Existing tenant. Assign to Leweg 4 unit. |
| Anna Schmidt | tenant | email_password | Existing tenant. Assign to Limmatstrasse unit. |
| Peter Weber | tenant | email_password | Existing tenant. Assign to Seefeld unit. |

**GIMBA AG users:**

| User | Role | Auth | Notes |
|------|------|------|-------|
| Simon Graber | admin | pin | Real VR-Praesident of GIMBA AG. New user. |
| Lisa Meier | property_manager | email_password | New user. |
| Markus Huber | tenant | email_password | New user. Assign to Bundesplatz unit. |
| Paolo Rossi | external_contractor | pin | New user. Maler (painter). |

**Cross-Organization users:**

| User | Role (KEWA) | Role (GIMBA) | Notes |
|------|-------------|--------------|-------|
| Mario Giacchino | external_contractor | external_contractor | Plattenleger (tiler). Member of BOTH orgs. Works across entire database. |
| Thomas Wyss | property_manager | property_manager | Treuhaender. Member of BOTH orgs. Can see both orgs' data. |

**Owner-Login (prepared via owners.user_id FK):**

| Owner Entity | User FK | Notes |
|-------------|---------|-------|
| Fritz Brunner (Erbengemeinschaft) | fritz.brunner user | Owner portal login prepared. UI deferred. |

**Existing user "KEWA AG" (ID ...0001):** Rename to Rolf Kaelin OR keep as system/service account and create Rolf as new user. Claude's discretion on cleanest approach.

### D6: Backfill Strategy — Single KEWA AG UUID for All Existing Data

All existing rows across all 62 tenant tables get `organization_id = KEWA_AG_UUID`.
- Existing properties also get `mandate_id` and `property_type` backfilled
- Property-to-mandate assignment per D4 hierarchy
- All existing buildings, units, rooms, tasks, projects, etc. inherit org_id from their property chain

GIMBA AG properties and hierarchy are NEW inserts (not backfill of existing data).

### D7: NOT NULL Constraints — After Full Backfill Verification

After backfill completes:
1. Verify `SELECT count(*) FROM {table} WHERE organization_id IS NULL` = 0 for every table
2. Apply `ALTER TABLE ... ALTER COLUMN organization_id SET NOT NULL` on all 62 tables
3. Also apply NOT NULL on `properties.mandate_id` and `properties.property_type`

### D8: Legacy users.role Column — Defer to Phase 37

The `users.role TEXT CHECK ('kewa', 'imeri')` column is NOT dropped in Phase 36.
- Keep column as-is for backward compatibility
- Drop CHECK constraint and column in Phase 37 when API routes are refactored to use organization_members
- New users created in Phase 36 can have `role = NULL` or a placeholder value

### D9: Hauswart Role — New ENUM Value + Role Record

Add `hauswart` to the `user_role` ENUM type:
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hauswart';
```

Insert into roles table:
- name: `hauswart`
- display_name: `Hauswart`
- description: `Gebaeudeunterhalt, Inspektionen und Meldungen`
- is_internal: `true`

Hauswart permissions (assign via role_permissions):
- `properties:read`, `buildings:read`, `units:read`, `rooms:read`
- `tasks:read`, `tasks:create`, `tasks:update`
- `work_orders:read`
- `inspections:read`, `inspections:create`, `inspections:update`
- `tickets:read`, `tickets:update`
- NO access to: `costs:*`, `invoices:*`, `payments:*`, `reports:*`, `settings:*`, `users:*`

## Claude's Discretion (implementation freedom)

### Technical Decisions
- Exact deterministic UUIDs for all seeded entities (orgs, owners, mandates, users)
- Migration file numbering (continue from 079+)
- Backfill ordering (top-down from properties, or flat UPDATE with single UUID)
- Whether to use a single migration file or split into seed + backfill + constraints
- Batch size for large table backfills (if any tables are large enough to warrant batching)
- How to handle the existing user "KEWA AG" (ID ...0001) — rename or keep + create new
- Exact room/unit naming for Leweg 4 Buelach
- Password hashes for new email_password users (use bcrypt of 'test1234' like existing tenants)
- PIN hashes for new PIN users (use placeholder format like existing users)
- Which specific permissions to assign to hauswart role (exact permission names from 022_rbac.sql)
- Whether GIMBA AG gets full building/unit/room hierarchy or just properties

### Data Details
- Exact contact data for fictional owners (Erbengemeinschaft Brunner, Pensionskasse Zuerich)
- Graber Immobilien GmbH address and contact details
- Tenancy records for tenant-to-unit assignments
- Unit numbers and naming for existing seed properties

## Deferred Ideas (out of scope for Phase 36)

- **Owner portal UI** — Fritz Brunner user_id FK prepared, actual portal views/routes deferred
- **STWE unit owner assignment** — Neubau Zuerich West marked as STWE, individual unit owners not assigned yet
- **Dachwohnung STWE conversion** — Leweg 4 DG noted as potential future STWE, no action now
- **Eigentümer report views** — Mandate-based owner reporting deferred to future milestone
- **Hauswart building assignment** — Which Hauswart covers which buildings, deferred to Phase 38 context scoping
- **Legacy users.role column removal** — Deferred to Phase 37 with API route refactor
- **Nebenkosten-Abrechnung seed data** — Tenancy financial fields prepared in schema, calculation data deferred
- **Cross-org contractor visibility rules** — Mario sees both orgs' work orders, fine-grained filtering deferred to RLS Phase 37

---
*Phase 36 context captured from discuss-phase session, 2026-02-18*
