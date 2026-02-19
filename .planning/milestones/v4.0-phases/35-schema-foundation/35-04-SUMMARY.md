---
phase: 35-schema-foundation
plan: 04
subsystem: database
tags: [postgres, supabase, stwe, parking, migrations, sql, multi-tenant]

# Dependency graph
requires:
  - 35-01 (owners table must exist for stwe_owner_id FK)
provides:
  - units.ownership_fraction DECIMAL(5,4) — STWE Wertquote preparation field
  - units.ownership_period_start DATE — STWE Eigentumsperiode start (two-column pattern)
  - units.ownership_period_end DATE — STWE Eigentumsperiode end
  - units.stwe_owner_id UUID FK to owners(id) — STWE unit-owner link
  - properties.renewal_fund_balance DECIMAL(12,2) — Erneuerungsfonds current balance
  - properties.renewal_fund_target DECIMAL(12,2) — Erneuerungsfonds target
  - units_unit_type_check expanded: parking, garage, storage values added
  - parking_spot rows renamed to parking
affects:
  - Any code filtering on unit_type = 'parking_spot' (must update to 'parking')
  - Future STWE UI/ownership tracking (schema is ready)
  - Partial indexes idx_units_parking_status and idx_units_parking_number (recreated)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IF NOT EXISTS on all DDL for idempotent migrations"
    - "Two DATE columns for temporal period (not DATERANGE) — RESEARCH.md Pitfall 6"
    - "DROP CONSTRAINT + UPDATE + ADD CONSTRAINT ordering for safe CHECK expansion"
    - "CONCURRENTLY index creation for zero-lock index adds"
    - "German terms in SQL comments/COMMENT ON strings for Swiss law context; English identifiers only"

key-files:
  created:
    - supabase/migrations/078_stwe_and_parking.sql
  modified: []

key-decisions:
  - "English column names only as identifiers — German terms appear in comments/COMMENT ON strings for Swiss law context (D1 locked)"
  - "DATERANGE not used — two DATE columns (ownership_period_start, ownership_period_end) per RESEARCH.md Pitfall 6"
  - "Parking type rename order: DROP constraint, UPDATE data, ADD new constraint — ensures UPDATE violates neither constraint"
  - "renewal_fund_balance has DEFAULT 0, renewal_fund_target is nullable (no target = no target)"

requirements-completed: [SCHEMA-06]

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 35 Plan 04: STWE Fields and Parking Unit Type Normalization Summary

**Migration 078 adds six STWE preparation columns to units and properties with English names (D1 locked), then safely renames all parking_spot rows to parking by dropping the CHECK constraint, updating data, and recreating the constraint with expanded values including garage and storage.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T00:46:57Z
- **Completed:** 2026-02-18T00:49:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Migration 078 adds STWE preparation fields to units: `ownership_fraction` (DECIMAL(5,4)), `ownership_period_start` (DATE), `ownership_period_end` (DATE), `stwe_owner_id` (UUID FK to owners.id)
- Migration 078 adds STWE fund fields to properties: `renewal_fund_balance` (DECIMAL(12,2) DEFAULT 0), `renewal_fund_target` (DECIMAL(12,2) nullable)
- Parking unit_type normalized: `units_unit_type_check` dropped, all `parking_spot` rows updated to `parking`, new constraint recreated with `apartment | common_area | building | parking | garage | storage`
- Partial indexes `idx_units_parking_status` and `idx_units_parking_number` dropped and recreated with `WHERE unit_type = 'parking'` (was `'parking_spot'`)
- Index `idx_units_stwe_owner` added on `stwe_owner_id` for future STWE queries
- All column names in English — German terms (Wertquote, Eigentumsperiode, Erneuerungsfonds) appear only in SQL comments and COMMENT ON strings for Swiss law context

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 078_stwe_and_parking.sql** - `64561af` (feat)

## Files Created/Modified

- `supabase/migrations/078_stwe_and_parking.sql` - STWE fields on units/properties, parking unit_type expansion, index recreation

## Decisions Made

- English identifiers only (D1 locked). German legal terms appear in `-- comments` and `COMMENT ON` string values to document Swiss law equivalents for future maintainers — they do not appear as column names.
- Two DATE columns (`ownership_period_start`, `ownership_period_end`) used instead of DATERANGE per RESEARCH.md Pitfall 6 (DATERANGE causes Supabase TypeScript generation failures).
- CHECK constraint modification order: DROP old constraint first, then UPDATE data rows, then ADD new constraint. This ensures the UPDATE runs with no active CHECK, eliminating the risk of violating either the old or new constraint during transition.
- `renewal_fund_balance` has `DEFAULT 0` (a property always has a fund balance, even if zero); `renewal_fund_target` is nullable (absence of target is meaningful).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Migration 078 is the final migration in Phase 35 Wave 2
- All STWE schema foundation columns are in place for future STWE UI work (deferred per CONTEXT.md)
- parking unit_type is normalized; no code should filter on `unit_type = 'parking_spot'` going forward
- Phase 35 is complete: org foundation (35-01), org_id denormalization (35-02, 35-03), STWE+parking (35-04)

---
*Phase: 35-schema-foundation*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: supabase/migrations/078_stwe_and_parking.sql
- FOUND: commit 64561af (feat(35-04): add STWE fields and normalize parking unit_type)
