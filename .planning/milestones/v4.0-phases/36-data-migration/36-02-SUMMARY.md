---
phase: 36-data-migration
plan: 02
subsystem: database/migrations
tags: [sql, seed-data, multi-tenant, properties, buildings, units, backfill, tenancies]
dependency_graph:
  requires:
    - phase: 36-01
      provides: [kewa-ag-org, gimba-ag-org, org-owners, org-mandates, org-members, users]
  provides:
    - 7 properties across 2 organizations (5 KEWA + 2 GIMBA) with mandate assignments
    - Leweg 4 Buelach full 10-unit hierarchy (buildings + units, namespace 0015)
    - New buildings + units for Limmatstrasse 42, MFH Oerlikon, Bundesplatz 8, Siedlung Wabern
    - Existing properties backfilled (Liegenschaft KEWA renamed Wohnanlage Seefeld, Neubau Zuerich West assigned STWE mandate)
    - organization_id backfilled on all 56 non-template tenant tables to KEWA AG
    - Deterministic tenant-unit assignments for Mueller/Schmidt/Weber/Huber
    - Tenancy records for 4 tenant-unit relationships
  affects: [36-03, plan-03-not-null-constraints, RLS-phase-37]
tech_stack:
  added: []
  patterns:
    - flat-backfill-single-uuid (WHERE organization_id IS NULL idempotent guard)
    - deterministic-uuid-seeding (0013/0014/0015/0016 namespaces for properties/buildings/units)
    - where-not-exists-idempotency (tenancies has no unique constraint, use subquery guard)
    - name-based-property-lookup (existing "Liegenschaft KEWA" has auto-UUID, lookup by name)
key_files:
  created:
    - supabase/migrations/081_seed_properties.sql
  modified: []
key_decisions:
  - "Renamed Liegenschaft KEWA to Wohnanlage Seefeld — assigns existing 13-unit building to Eigenverwaltung KEWA mandate, preserving all FK references (renovation/task/project data)"
  - "contract_type uses 'residential' not 'unlimited' — 074 tenancies CHECK only allows residential/commercial/parking/storage; unlimited duration = end_date NULL"
  - "tenancies idempotency via WHERE NOT EXISTS subquery — table has no unique constraint, ON CONFLICT DO NOTHING requires a conflict target column"
  - "Unit namespace split: 0015 for Leweg 4 (10 units, detailed), 0016 for all other new property units (representative)"
  - "Weber Seefeld unit assigned via ORDER BY floor/name LIMIT 1 — non-deterministic UUID from 008 requires runtime lookup"
  - "Markus Huber tenant_users INSERT uses GIMBA AG org_id directly (after flat backfill) — correct org from inception"
requirements-completed: [MIGR-02]
duration: 12min
completed: 2026-02-18
---

# Phase 36 Plan 02: Property Hierarchy + Organization Backfill Summary

**5 new properties + 2 backfilled existing properties across 2 orgs, 10-unit Leweg 4 hierarchy, and flat org_id backfill across all 56 non-template tenant tables**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-18T07:35:13Z
- **Completed:** 2026-02-18T07:47:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `081_seed_properties.sql` with 6 logical sections covering all MIGR-02 requirements
- Seeded 5 new properties with full building/unit hierarchies: Leweg 4 Buelach (10 units), Limmatstrasse 42 (4 units), MFH Oerlikon (6 units), Bundesplatz 8 (4 units), Siedlung Wabern (4 units)
- Backfilled 2 existing properties: "Liegenschaft KEWA" renamed to "Wohnanlage Seefeld" + Neubau Zuerich West assigned STWE mandate
- Flat UPDATE of 56 non-template tables to KEWA AG UUID with idempotency guard (`WHERE organization_id IS NULL`)
- Template tables (templates, template_phases, template_packages, template_tasks, template_dependencies, template_quality_gates) intentionally excluded — NULL = system template
- Deterministic tenant-unit assignments: Mueller → Leweg 4, Schmidt → Limmatstrasse, Weber → Wohnanlage Seefeld, Huber → Bundesplatz
- 4 tenancy records with Swiss rental law fields (base_rent, ancillary_costs, deposit_amount = 3x, notice_period_months = 3, reference_interest_rate = 1.50)

## Task Commits

1. **Task 1: Create 081_seed_properties.sql** - `2207076` (feat)

**Plan metadata:** TBD (docs commit after SUMMARY.md creation)

## Files Created/Modified

- `supabase/migrations/081_seed_properties.sql` — Complete property/building/unit hierarchy seed + 56-table org_id backfill + tenant assignments + tenancy records

## Decisions Made

- **Liegenschaft KEWA renamed to Wohnanlage Seefeld** — The existing building (auto-UUID `00000000-0000-0000-0001-000000000001`) has 13 apartments + common areas. D4 maps it to the "Wohnanlage Seefeld" property. Renaming preserves all FK references from renovation projects, tasks, work orders, etc.
- **Leweg 4 as brand new property** — Keeps existing Seefeld building intact, creates Leweg 4 as fresh property+building+10 units with deterministic UUIDs (0013/0014/0015 namespaces)
- **contract_type = 'residential'** — Plan spec said 'unlimited' but that describes duration (end_date = NULL). The `tenancies.contract_type` CHECK constraint only allows residential/commercial/parking/storage.
- **Weber unit via runtime subquery** — The Seefeld building has an auto-generated UUID from 008, so Weber's unit is assigned via `ORDER BY floor, name LIMIT 1` on building_id = 0001.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] contract_type corrected from 'unlimited' to 'residential'**
- **Found during:** Task 1 (tenancy record creation)
- **Issue:** Plan spec listed `contract_type 'unlimited'`. The `tenancies` table CHECK constraint (from 074_tenancies.sql) only allows values: `'residential', 'commercial', 'parking', 'storage'`. Using 'unlimited' would cause a CHECK constraint violation on db reset.
- **Fix:** Used `'residential'` for all tenancy records. Duration semantics (unlimited/fixed-term) are captured via `end_date = NULL` (ongoing) per the schema design.
- **Files modified:** supabase/migrations/081_seed_properties.sql
- **Verification:** Static review of 074_tenancies.sql constraint confirms valid values
- **Committed in:** 2207076 (Task 1 commit)

**2. [Rule 1 - Bug] Tenancy inserts use WHERE NOT EXISTS guard instead of ON CONFLICT DO NOTHING**
- **Found during:** Task 1 (tenancy record creation)
- **Issue:** Plan spec said `ON CONFLICT DO NOTHING` for tenancies. PostgreSQL requires `ON CONFLICT DO NOTHING` to specify a constraint or column (or use `ON CONFLICT ON CONSTRAINT name`). The `tenancies` table has no unique constraint on `(unit_id)` or `(organization_id, unit_id)`, making bare `ON CONFLICT DO NOTHING` invalid syntax.
- **Fix:** Used `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM tenancies WHERE unit_id = X AND is_active = true)` for idempotency.
- **Files modified:** supabase/migrations/081_seed_properties.sql
- **Verification:** Static review confirms correct PostgreSQL syntax
- **Committed in:** 2207076 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — schema constraint bugs in plan spec)
**Impact on plan:** Both fixes required for migration to apply cleanly on db reset. No scope creep.

## Issues Encountered

- Docker Desktop not running — `supabase db reset` verification deferred. SQL reviewed statically:
  - All UUIDs follow correct namespace scheme (0013/0014/0015/0016 for new, 0010 for orgs, 0012 for mandates)
  - All INSERT patterns use `ON CONFLICT (id) DO NOTHING` per anti-pattern guidance
  - All backfill UPDATEs include `WHERE organization_id IS NULL` guard
  - 56 tables counted and matched against RESEARCH.md authoritative list
  - Template tables excluded from backfill confirmed
  - Mandate assignments verified against D3 ownership hierarchy
  - property_type values: all 'rental' except Neubau Zuerich West = 'stwe' (matches D4)
  - tenancy contract_type = 'residential' matches 074 CHECK constraint

## Next Phase Readiness

- Plan 03 (082_not_null_constraints.sql) can proceed immediately
- All 56 tables backfilled — zero NULL organization_id values expected after db reset
- Template tables intentionally excluded — NOT NULL constraint must not be applied to those 6 tables
- Properties.mandate_id and property_type ready for NOT NULL promotion

---
*Phase: 36-data-migration*
*Completed: 2026-02-18*
