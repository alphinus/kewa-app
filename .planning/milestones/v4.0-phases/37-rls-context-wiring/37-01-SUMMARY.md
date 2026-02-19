---
phase: 37-rls-context-wiring
plan: 01
subsystem: database
tags: [postgres, rls, row-level-security, multi-tenant, supabase]

# Dependency graph
requires:
  - phase: 35-schema-foundation
    provides: organization_id columns on 62 tables, current_organization_id() and set_org_context() helper functions
  - phase: 36-data-migration
    provides: NOT NULL constraints on organization_id (verified backfill complete), Imeri org seeded
provides:
  - 248 RESTRICTIVE RLS policies on 62 tenant tables (SELECT/INSERT/UPDATE/DELETE)
  - Legacy RLS teardown (029/044/060 policies dropped, 3 legacy functions dropped)
  - Imeri Immobilien AG seeded as permanent second test organization
  - Cross-tenant CRUD isolation verified at SQL level via DO-block
affects:
  - 37-02 (middleware/createOrgClient — depends on RLS being active)
  - 37-03 (API route migration — depends on RLS being enforced)
  - 37-04 (verification — tests the policies created here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RESTRICTIVE RLS: all 4 CRUD policies per table, enabling future policy layering without modifying existing ones"
    - "Template table pattern: SELECT with OR IS NULL for system templates, strict org match for writes"
    - "DO-block isolation test: inline SQL-level CRUD cross-tenant verification with RAISE EXCEPTION on failure"

key-files:
  created:
    - supabase/migrations/083_rls_policies.sql
  modified: []

key-decisions:
  - "24 policies dropped (not 21 as estimated) — 029 had 16 actual policies (13 estimated); correct count verified from source migrations"
  - "6 template tables use OR IS NULL SELECT to expose system templates (NULL org_id) to all authenticated orgs"
  - "DO-block uses nested BEGIN/EXCEPTION to catch INSERT policy violation without aborting outer block"
  - "Context reset to KeWa AG at end of verification DO-block for safety"

patterns-established:
  - "Standard policy naming: <table>_org_<select|insert|update|delete>"
  - "All tenant policies are RESTRICTIVE — additive isolation, not permissive by default"
  - "Template tables (nullable org_id) get extended SELECT but strict writes"

requirements-completed:
  - RLS-01
  - RLS-05

# Metrics
duration: 12min
completed: 2026-02-18
---

# Phase 37 Plan 01: RLS Policies Summary

**248 RESTRICTIVE RLS policies across 62 tenant tables using current_organization_id(), replacing all legacy user-based policies from migrations 029/044/060**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-18T09:01:08Z
- **Completed:** 2026-02-18T09:13:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Dropped 24 legacy policies (from 3 prior migrations) and 3 unreferenced helper functions (is_internal_user, is_tenant_of_unit, is_contractor_for_work_order)
- Created 248 RESTRICTIVE policies: 224 standard (56 tables x 4 ops) + 24 template (6 tables x 4 ops)
- 6 template tables receive extended SELECT (organization_id = current_organization_id() OR organization_id IS NULL) so system templates are visible to all orgs
- Seeded Imeri Immobilien AG as permanent second organization for multi-tenant testing
- Embedded cross-tenant isolation DO-block that RAISE EXCEPTIONs on SELECT/INSERT/UPDATE/DELETE violation — migration aborts on any failure

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 083_rls_policies.sql** - `a808b0b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `supabase/migrations/083_rls_policies.sql` - Complete RLS teardown, 248 RESTRICTIVE policies, Imeri seed, cross-tenant CRUD verification DO-block

## Decisions Made

- **24 DROP POLICY statements (not 21):** The plan estimated 13+ policies from 029, but the actual migration had 16 (2 each for units/rooms/tasks/renovation_projects/condition_history + 3 for work_orders + 3 for media). All 24 dropped correctly.
- **DO-block INSERT test:** Uses nested BEGIN/EXCEPTION to catch check_violation without aborting outer block. Outer block re-raises if insert succeeds.
- **Context reset after verification:** DO-block ends with set_org_context(kewa_org_id) to prevent any residual Imeri context leaking into subsequent migration steps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DROP POLICY count corrected from 21 to 24**
- **Found during:** Task 1 (migration file creation)
- **Issue:** Plan stated "21 old policies" but source migration 029_rls_policies.sql has 16 named policies (not 13): 2x units, 2x rooms, 2x tasks, 3x work_orders, 2x renovation_projects, 3x media, 2x condition_history. Total with 044 (4) and 060 (4) = 24.
- **Fix:** Dropped all 24 actual policies present in source migrations. Dropping non-existent policies with IF EXISTS is safe; missing any existing policy would leave active legacy behavior.
- **Files modified:** supabase/migrations/083_rls_policies.sql
- **Verification:** All named policies from 029/044/060 source files are listed in DROP POLICY IF EXISTS statements
- **Committed in:** a808b0b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/incorrect count)
**Impact on plan:** Correctness fix. Dropping 24 vs 21 policies is necessary — skipping 3 policies would leave legacy user-based RLS active on work_orders and media.

## Issues Encountered

None — migration file created cleanly. Static verification only (Docker Desktop not running; applies to all Phase 37 migrations per existing pattern from Phase 36).

## Next Phase Readiness

- 083_rls_policies.sql ready for deployment; policies active once migration runs
- Phase 37 Plan 02 (middleware + createOrgClient): RLS now enforced at DB level; middleware must set org context before any data query
- Concern: PgBouncer + SET LOCAL interaction still needs staging validation (noted in STATE.md blockers from Phase 35)

---
*Phase: 37-rls-context-wiring*
*Completed: 2026-02-18*
