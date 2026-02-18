# Roadmap: KEWA

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-6 (shipped 2025-03-XX)
- ✅ **v2.0 Advanced Features** -- Phases 7-12.3 (shipped 2026-01-19)
- ✅ **v2.1 Master Data Management** -- Phases 13-17 (shipped 2026-01-25)
- ✅ **v2.2 Extensions** -- Phases 18-24 (shipped 2026-01-29)
- ✅ **v3.0 Tenant & Offline** -- Phases 25-29 (shipped 2026-02-03)
- ✅ **v3.1 Production Hardening** -- Phases 30-34 (shipped 2026-02-17)
- 📋 **v4.0 Multi-Tenant Data Model & Navigation** -- Phases 35-40 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) -- SHIPPED 2025-03-XX</summary>

See milestones/v1-ROADMAP.md

</details>

<details>
<summary>✅ v2.0 Advanced Features (Phases 7-12.3) -- SHIPPED 2026-01-19</summary>

See milestones/v2.0-ROADMAP.md

</details>

<details>
<summary>✅ v2.1 Master Data Management (Phases 13-17) -- SHIPPED 2026-01-25</summary>

See milestones/v2.1-ROADMAP.md

</details>

<details>
<summary>✅ v2.2 Extensions (Phases 18-24) -- SHIPPED 2026-01-29</summary>

See milestones/v2.2-ROADMAP.md

</details>

<details>
<summary>✅ v3.0 Tenant & Offline (Phases 25-29) -- SHIPPED 2026-02-03</summary>

See milestones/v3.0-ROADMAP.md

</details>

<details>
<summary>✅ v3.1 Production Hardening (Phases 30-34) -- SHIPPED 2026-02-17</summary>

See milestones/v3.1-ROADMAP.md

</details>

### 📋 v4.0 Multi-Tenant Data Model & Navigation (Phases 35-40)

**Milestone Goal:** Branchenstandard-Datenmodell mit mandantenfaehiger Architektur (Organization > Mandat > Eigentuemer > Liegenschaft > Gebaeude > Einheit), Supabase RLS fuer Mandanten-Isolation, und Navigation-Redesign mit hierarchischem Drill-down.

---

- [x] **Phase 35: Schema Foundation** - New tables, organization_id on all tenant tables, indexes, helper functions, STWE fields (completed 2026-02-18)
- [ ] **Phase 36: Data Migration & Backfill** - Seed KEWA AG, backfill all rows, apply NOT NULL constraints
- [ ] **Phase 37: RLS Enablement & Context Wiring** - RLS policies on all tables, middleware org header, API route updates, isolation verification
- [ ] **Phase 38: Application Context & Org Switcher** - OrganizationProvider, MandateProvider, OrgSwitcher UI, BuildingContext scoping
- [ ] **Phase 39: Navigation Redesign** - Breadcrumbs, simplified footer, Objekte drill-down routes, URL redirects
- [ ] **Phase 40: Storage Multi-Tenancy** - Org-prefixed storage paths, storage RLS policies, existing file migration

## Phase Details

### Phase 35: Schema Foundation
**Goal**: Database schema supports multi-tenant data model with organizations, mandates, owners, tenancies, and organization_id on all tenant tables
**Depends on**: Phase 34 (v3.1 complete)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07
**Plans**: 4 plans
**Success Criteria** (what must be TRUE):
  1. New tables exist (organizations, organization_members, owners, mandates, tenancies) with all indexes and FK constraints
  2. All existing tenant tables have a nullable organization_id column with a btree index
  3. `set_org_context('some-uuid')` followed by `SELECT current_organization_id()` returns that UUID, and the setting is transaction-local (does not leak across connections)
  4. STWE fields (ownership_fraction, ownership_period_start/end, stwe_owner_id) exist on units as nullable columns, properties has property_type discriminator
  5. Inserting a building with a property_id auto-populates organization_id from that property via trigger

Plans:
- [ ] 35-01-PLAN.md -- New top-level tables: organizations, organization_members, owners, mandates, tenancies (migrations 073+074)
- [ ] 35-02-PLAN.md -- organization_id on all 44 existing tenant tables with CONCURRENTLY indexes (migration 075)
- [ ] 35-03-PLAN.md -- RLS helper functions and org_id sync triggers (migrations 076+077)
- [ ] 35-04-PLAN.md -- STWE fields on units/properties and parking unit_type rename (migration 078)

---

### Phase 36: Data Migration & Backfill
**Goal**: All existing data belongs to KEWA AG organization with no NULL organization_id values remaining
**Depends on**: Phase 35
**Requirements**: MIGR-01, MIGR-02, MIGR-03
**Plans**: 3 plans

Plans:
- [ ] 36-01-PLAN.md -- Hauswart role + seed organizations, owners, mandates, users, org_members (migrations 079+080)
- [ ] 36-02-PLAN.md -- Seed properties/buildings/units + backfill all existing data (migration 081)
- [ ] 36-03-PLAN.md -- NOT NULL constraints on all 56 tenant tables (migration 082)

**Success Criteria** (what must be TRUE):
  1. Organization "KEWA AG" (slug: kewa-ag) exists with a seeded owner and default mandate
  2. All active users are mapped to KEWA AG in organization_members with is_default=true
  3. `SELECT count(*) FROM {table} WHERE organization_id IS NULL` returns 0 for every tenant table
  4. All organization_id columns have NOT NULL constraint applied

---

### Phase 37: RLS Enablement & Context Wiring
**Goal**: Every database query is automatically scoped to the current organization via RLS, enforced at the database level with no application-layer bypass possible
**Depends on**: Phase 36
**Requirements**: RLS-01, RLS-02, RLS-03, RLS-04, RLS-05
**Plans**: TBD
**Success Criteria** (what must be TRUE):
  1. Every tenant table has RLS enabled with SELECT/INSERT/UPDATE/DELETE policies using current_organization_id()
  2. API requests to /dashboard/* include x-organization-id header set by middleware from cookie or user default
  3. All ~119 API route files use createOrgClient for tenant-scoped queries (zero raw createClient calls for tenant data)
  4. A test with two organizations confirms: Org A cannot read, insert, update, or delete Org B's data via the Supabase anon client
  5. Existing application functionality works identically for KEWA AG users after RLS enablement (no empty results, no broken pages)

---

### Phase 38: Application Context & Org Switcher
**Goal**: Users can view and switch between organizations and mandates, with all downstream data automatically scoped
**Depends on**: Phase 37
**Requirements**: CTX-01, CTX-02, CTX-03, CTX-04
**Plans**: TBD
**Success Criteria** (what must be TRUE):
  1. Dashboard layout wraps children in OrganizationProvider > MandateProvider > BuildingProvider hierarchy
  2. Header displays current organization name (static for single-org users, dropdown for multi-org)
  3. Switching organization clears mandate and building selection, refreshes all data to new org scope
  4. Building selector shows only buildings from the selected mandate (or all mandates within current org)

---

### Phase 39: Navigation Redesign
**Goal**: Navigation follows the data hierarchy with breadcrumbs and a simplified footer that keeps high-frequency features accessible
**Depends on**: Phase 38
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Plans**: TBD
**Success Criteria** (what must be TRUE):
  1. Breadcrumbs display on all dashboard pages showing clickable path (Org > Mandat > Liegenschaft > Gebaeude > Einheit)
  2. Mobile footer shows 5 items (Uebersicht, Objekte, Aufgaben, Kosten, Mehr) with all other features accessible via Mehr menu
  3. /dashboard/objekte drill-down works: property list > property detail (buildings) > building detail (units + heatmap) > unit detail (rooms)
  4. Old URLs (/dashboard/liegenschaft/*, /dashboard/gebaude/*) redirect to corresponding /dashboard/objekte/* paths

---

### Phase 40: Storage Multi-Tenancy
**Goal**: File storage is organization-isolated with RLS enforcement on storage buckets
**Depends on**: Phase 37 (can run parallel to Phases 38-39 after RLS is in place)
**Requirements**: STOR-01, STOR-02, STOR-03
**Plans**: TBD
**Success Criteria** (what must be TRUE):
  1. New file uploads are stored under {organization_id}/{property_id}/{building_id}/{entity_type}/{filename} path structure
  2. Storage RLS policies prevent users from accessing files outside their organization's folder
  3. All existing files are accessible under the new org-prefixed path structure with no broken links in the UI

---

## Progress

**Execution Order:**
Phases execute in numeric order: 35 > 36 > 37 > 38 > 39 > 40
Phase 40 can start after Phase 37 completes (parallel to 38-39).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v1.0 | 17/17 | Complete | 2025-03-XX |
| 7-12.3 | v2.0 | 31/31 | Complete | 2026-01-19 |
| 13-17 | v2.1 | 24/24 | Complete | 2026-01-25 |
| 18-24 | v2.2 | 25/25 | Complete | 2026-01-29 |
| 25-29 | v3.0 | 17/17 | Complete | 2026-02-03 |
| 30-34 | v3.1 | 14/14 | Complete | 2026-02-17 |
| 35. Schema Foundation | v4.0 | Complete    | 2026-02-18 | - |
| 36. Data Migration | v4.0 | 0/3 | Planned | - |
| 37. RLS & Context Wiring | v4.0 | 0/TBD | Not started | - |
| 38. App Context & Switcher | v4.0 | 0/TBD | Not started | - |
| 39. Navigation Redesign | v4.0 | 0/TBD | Not started | - |
| 40. Storage Multi-Tenancy | v4.0 | 0/TBD | Not started | - |

**Total:** 34 phases complete, 6 phases planned

---

*Last updated: 2026-02-18 -- Phase 35 planned (4 plans, 3 waves)*
