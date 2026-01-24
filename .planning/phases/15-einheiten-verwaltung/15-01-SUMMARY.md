---
phase: 15-einheiten-verwaltung
plan: 01
subsystem: api
tags: [units, crud, rest-api, tenant-data, building-filter]

# Dependency graph
requires:
  - phase: 14-multi-liegenschaft
    provides: BuildingContext for building_id scoping
provides:
  - Unit API with building_id filter for multi-building support
  - POST endpoint for unit creation with extended tenant fields
  - PATCH endpoint for partial unit updates
  - DELETE endpoint for admin-only unit removal
  - Extended Unit type with tenant phone, email, move-in date, vacancy
affects: [15-02-rooms, 15-03-unit-ui, 15-04-unit-form]

# Tech tracking
tech-stack:
  added: []
  patterns: [building-scoped API filtering, extended tenant data model]

key-files:
  created: []
  modified:
    - src/types/database.ts
    - src/app/api/units/route.ts
    - src/app/api/units/[id]/route.ts

key-decisions:
  - "Extended Unit fields optional for backward compatibility"
  - "PATCH replaces PUT for REST consistency"
  - "DELETE restricted to kewa role for safety"
  - "Default is_vacant=true for new units"

patterns-established:
  - "Building-scoped API: ?building_id=X filter, 'all' returns unfiltered"
  - "Admin-only DELETE with warning log for cascade"

# Metrics
duration: 8min
completed: 2026-01-24
---

# Phase 15 Plan 01: Unit API Extension Summary

**Extended Unit API with building_id filter, full CRUD operations, and tenant data fields (phone, email, move-in, vacancy)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-24T21:09:00Z
- **Completed:** 2026-01-24T21:17:37Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Extended Unit interface with tenant phone, email, move-in date, vacancy tracking
- GET /api/units now supports building_id query parameter filtering
- POST /api/units creates units with all extended tenant fields
- PATCH /api/units/:id replaces PUT, accepts partial updates for any field
- DELETE /api/units/:id restricted to kewa role with cascade warning

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Unit type with tenant fields** - `fa97c89` (chore - previously committed)
2. **Task 2: Add building_id filter and POST to units collection route** - `9c63c04` (feat)
3. **Task 3: Extend single unit route with PATCH and DELETE** - `3f45daa` (feat)

## Files Created/Modified

- `src/types/database.ts` - Added Unit extended fields, CreateUnitInput, UpdateUnitInput interfaces
- `src/app/api/units/route.ts` - Added building_id filter to GET, new POST handler
- `src/app/api/units/[id]/route.ts` - Replaced PUT with PATCH, added DELETE handler

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Extended fields marked optional | Backward compatibility - DB columns may not exist yet |
| PATCH instead of PUT | REST convention for partial updates |
| DELETE kewa-only | Destructive operation requires admin privileges |
| Default is_vacant=true | New units assumed vacant until tenant assigned |
| Validate unit_type enum | Prevent invalid unit types at API level |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 1 types were already committed in a prior session (fa97c89) - verified existing and continued

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Unit API complete with all CRUD operations
- Ready for Room API (15-02) and UI components (15-03, 15-04)
- Extended tenant fields ready for form integration
- No blockers

---
*Phase: 15-einheiten-verwaltung*
*Completed: 2026-01-24*
