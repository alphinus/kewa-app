---
phase: 14-multi-liegenschaft
plan: 05
subsystem: ui
tags: [react, context, dashboard, heatmap, building-filter]

requires:
  - phase: 14-02
    provides: BuildingContext with useBuilding hook, isAllSelected, selectedBuildingId

provides:
  - Dashboard page filtered by selected building
  - Liegenschaft heatmap using context building
  - Appropriate handling of 'all' selection (aggregate vs prompt)

affects: [14-03, 14-04]

tech-stack:
  added: []
  patterns:
    - Client-side data fetching based on context state
    - Building-aware API queries with building_id param

key-files:
  created: []
  modified:
    - src/app/dashboard/page.tsx
    - src/app/dashboard/liegenschaft/page.tsx

key-decisions:
  - "Liegenschaft converted to client component for context integration"
  - "Heatmap shows prompt when 'all' selected (building-specific view)"
  - "Tasks API already supports building_id filter (found pre-existing)"

patterns-established:
  - "Pattern: useBuilding() in pages to access selectedBuildingId"
  - "Pattern: Re-fetch data in useEffect when selectedBuildingId changes"

duration: 19min
completed: 2026-01-24
---

# Phase 14 Plan 05: Dashboard Context Wiring Summary

**Dashboard and Liegenschaft pages now respect BuildingContext selection, filtering data by selected building**

## Performance

- **Duration:** 19 min
- **Started:** 2026-01-24T14:09:19Z
- **Completed:** 2026-01-24T14:28:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Main dashboard filters tasks by selected building via building_id query param
- Liegenschaft page converted to client component using BuildingContext
- "Alle" selection shows aggregate data on dashboard, prompt on Liegenschaft (heatmap is building-specific)
- Both pages re-fetch data when building selection changes

## Task Commits

1. **Task 1: Wire main dashboard to building context** - `7645df7` (feat)
2. **Task 2: Wire Liegenschaft page to building context** - `75a27df` (feat)

## Files Created/Modified

- `src/app/dashboard/page.tsx` - Added useBuilding hook, building_id param to task fetches
- `src/app/dashboard/liegenschaft/page.tsx` - Converted to client component with inline heatmap/parking rendering

## Decisions Made

- **Liegenschaft converted to client component:** Server component couldn't access BuildingContext. Converted to client-side with API-based data fetching.
- **Inline heatmap/parking components:** Rather than importing async server components (which fail in client components), implemented inline versions that render from API response data.
- **Tasks API already had building_id support:** Found existing implementation with building_id filter in tasks API (via unit.building_id chain).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Liegenschaft server components incompatible with client context**
- **Found during:** Task 2 (Wire Liegenschaft page)
- **Issue:** Existing components (BuildingHeatmap, ParkingSection, OccupancyGauge) were async server components importing server-only code. Client components cannot import these.
- **Fix:** Created inline client-side implementations (UnitCell, ParkingCard, StatCard) that render from API response data instead of importing server components.
- **Files modified:** src/app/dashboard/liegenschaft/page.tsx
- **Verification:** Build passes, page renders correctly
- **Committed in:** 75a27df (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Necessary architectural adaptation for client-side context integration. Functionality preserved.

## Issues Encountered

- Build lock file conflict on initial build attempt (resolved by removing .next directory)
- Server component imports in client component (resolved by inlining components)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BuildingContext fully integrated with dashboard and Liegenschaft pages
- Ready for 14-03 (Data Loading Patterns) and 14-04 (remaining context wiring)
- Heatmap and parking display working with client-side rendering

---
*Phase: 14-multi-liegenschaft*
*Completed: 2026-01-24*
