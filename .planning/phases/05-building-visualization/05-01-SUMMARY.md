---
phase: 05-building-visualization
plan: 01
subsystem: api
tags: [nextjs, supabase, typescript, rest-api, units]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase client, auth middleware, base types
  - phase: 02-task-management
    provides: Units API pattern, task aggregation approach
provides:
  - GET /api/units/[id] for single unit with task stats
  - PUT /api/units/[id] for tenant/visibility updates (KEWA only)
  - UpdateUnitInput and UnitResponse TypeScript types
affects:
  - 05-02 (building grid will need unit detail endpoint)
  - 05-03 (unit detail page will use this API)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic route params via Promise<{ id: string }> (Next.js 16)"
    - "Role-based access control at API level"

key-files:
  created:
    - src/app/api/units/[id]/route.ts
  modified:
    - src/types/database.ts

key-decisions:
  - "Reuse aggregation pattern from /api/units for task statistics"
  - "KEWA-only PUT with 403 for Imeri"
  - "Empty update request returns 400 (no fields to update)"

patterns-established:
  - "Dynamic API route params: await params in Next.js 16"
  - "UnitResponse type for single unit responses"

# Metrics
duration: 5min
completed: 2026-01-17
---

# Phase 5 Plan 1: Unit Detail API Summary

**GET/PUT API for single units with role-based access and task statistics**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-17T19:35:00Z
- **Completed:** 2026-01-17T19:40:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- GET /api/units/[id] returns single unit with open/total task counts
- PUT /api/units/[id] updates tenant_name and tenant_visible_to_imeri (KEWA only)
- Imeri gets 403 when accessing units with tenant_visible_to_imeri=false
- Added UpdateUnitInput and UnitResponse TypeScript types

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unit detail API endpoint** - `56840cc` (feat)
2. **Task 2: Add TypeScript types for unit API** - `92a1790` (feat)

## Files Created/Modified

- `src/app/api/units/[id]/route.ts` - GET and PUT handlers for single unit operations
- `src/types/database.ts` - Added UpdateUnitInput and UnitResponse interfaces

## Decisions Made

- **Reuse aggregation pattern:** Same task statistics approach as /api/units list endpoint for consistency
- **Role-based PUT access:** Only KEWA can update units (tenant info is sensitive)
- **400 for empty update:** Reject requests with no fields to update rather than returning unchanged unit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Unit detail API ready for building grid UI (05-02)
- Unit visibility toggles can be controlled via PUT endpoint
- TypeScript types available for frontend components

---
*Phase: 05-building-visualization*
*Completed: 2026-01-17*
