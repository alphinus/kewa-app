---
phase: 38-app-context-org-switcher
plan: 02
subsystem: context
tags: [react-context, cookies, organization, mandate, building, multi-tenant]

# Dependency graph
requires:
  - phase: 38-01
    provides: Organization and Mandate TypeScript types, GET /api/organizations, GET /api/mandates
  - phase: 37-rls-context-wiring
    provides: x-organization-id header set by middleware for RLS context
provides:
  - OrganizationProvider + useOrganization hook (src/contexts/OrganizationContext.tsx)
  - MandateProvider + useMandate hook (src/contexts/MandateContext.tsx)
  - BuildingProvider + useBuilding hook with cookie persistence (src/contexts/BuildingContext.tsx)
  - Cookie constants: COOKIE_OPTIONS, ORG_COOKIE, MANDATE_COOKIE, BUILDING_COOKIE
affects: [38-03, dashboard layout, all dashboard components consuming useBuilding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cookie persistence pattern: Cookies.get on mount, Cookies.set on change, stale validation against API data"
    - "Provider nesting pattern: Organization > Mandate > Building with loading cascade"
    - "Stale cookie validation: validate against fetched API data, fall back gracefully (isDefault > first)"
    - "Race condition prevention: MandateProvider effect depends on currentOrg (not empty dep array)"

key-files:
  created:
    - src/contexts/OrganizationContext.tsx
    - src/contexts/MandateContext.tsx
  modified:
    - src/contexts/BuildingContext.tsx

key-decisions:
  - "switchOrg uses window.location.href not router.push — full page reload required for org switch (D5/Pitfall 7)"
  - "MandateProvider useEffect depends on currentOrg?.id to prevent race condition fetching mandates before org resolves (Pitfall 2)"
  - "BuildingProvider calls useMandate() but does not filter — filtering is CombinedSelector's responsibility (Plan 03)"
  - "Cookie null vs remove: selectBuilding(null) removes cookie; selectBuilding('all' or UUID) writes cookie"
  - "switchMandate clears building cookie (building may not exist in new mandate per D6)"

# Metrics
duration: 15min
completed: 2026-02-18
---

# Phase 38 Plan 02: Context Providers (Organization > Mandate > Building) Summary

**Three nested context providers with cookie persistence, stale validation, and proper loading sequencing — Organization > Mandate > Building chain using js-cookie for D4 full state persistence**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-18
- **Completed:** 2026-02-18
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- OrganizationProvider fetches /api/organizations on mount, validates stale organization_id cookie against fetched list, exposes switchOrg with full page navigation and cascade cookie clear (D5)
- MandateProvider waits for org context before fetching /api/mandates (race condition prevention, Pitfall 2), validates stale mandate_id cookie, exposes switchMandate with in-place update and building cookie clear (D6)
- BuildingProvider reads building_id cookie on mount to restore selection, writes cookie on change, removes cookie on null selection
- Cookie constants (COOKIE_OPTIONS, ORG_COOKIE, MANDATE_COOKIE, BUILDING_COOKIE) exported from OrganizationContext for reuse across all providers
- All context values memoized with useMemo; switchOrg, switchMandate, selectBuilding wrapped in useCallback
- useBuilding() hook interface unchanged — all existing consumers work without modification

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OrganizationProvider and MandateProvider** - `f25a1bb` (feat)
2. **Task 2: Modify BuildingProvider for cookie persistence and mandate scoping** - `3baf7f3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/contexts/OrganizationContext.tsx` - New: OrganizationProvider, useOrganization, COOKIE_OPTIONS, ORG_COOKIE, MANDATE_COOKIE, BUILDING_COOKIE
- `src/contexts/MandateContext.tsx` - New: MandateProvider, useMandate
- `src/contexts/BuildingContext.tsx` - Modified: added cookie persistence (read on mount, write on change), useMandate() consumption, useMemo

## Decisions Made

- switchOrg uses `window.location.href = '/dashboard'` not `router.push` — full page reload is required so the middleware picks up the new organization_id cookie and sets the x-organization-id header (D5, Pitfall 7)
- MandateProvider useEffect has `[currentOrg, orgIsLoading]` in its dependency array — prevents fetching mandates before the org resolves (race condition, Pitfall 2)
- BuildingProvider calls useMandate() but does not filter buildings — CombinedSelector (Plan 03) is responsible for filtering buildings by mandate and calling selectBuilding when mandate changes
- Cookie removal uses `Cookies.remove(key, { path: '/' })` explicitly to ensure cookie is removed at root path

## Deviations from Plan

None — plan executed exactly as written. TypeScript passed clean on both tasks.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Organization > Mandate > Building provider chain is complete and ready for Plan 03 (CombinedSelector UI component)
- Cookie constants exported for reuse in Plan 03 components
- Dashboard layout needs to be updated in Plan 03 to wrap in OrganizationProvider > MandateProvider > BuildingProvider
- No blockers

---
*Phase: 38-app-context-org-switcher*
*Completed: 2026-02-18*
