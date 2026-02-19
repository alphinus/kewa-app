---
phase: 38-app-context-org-switcher
plan: 03
subsystem: ui
tags: [react, components, navigation, organization, mandate, building, multi-tenant]

# Dependency graph
requires:
  - phase: 38-01
    provides: Organization/Mandate types, GET /api/organizations, GET /api/mandates
  - phase: 38-02
    provides: OrganizationProvider, MandateProvider, BuildingProvider with cookie persistence
provides:
  - OrgSwitcher component: org badge + dropdown for multi-org users (null for single-org)
  - CombinedSelector component: hierarchical mandate > property > building dropdown
  - Updated header.tsx: OrgSwitcher + CombinedSelector replace PropertySelector
  - Updated dashboard layout: full OrganizationProvider > MandateProvider > BuildingProvider > ConnectivityProvider stack
affects: [header.tsx, dashboard/layout.tsx, all internal users navigating the dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Context-driven selector: UI reads from context hooks — no prop drilling for building selection"
    - "Null-render guard: isMultiOrg=false → OrgSwitcher returns null (transparent for single-org users)"
    - "Mandate boundary crossing: selectBuilding + switchMandate called together when building crosses mandate"
    - "Single-mandate optimization (D3): isSingleMandate=true skips mandate headers in dropdown"

key-files:
  created:
    - src/components/navigation/OrgSwitcher.tsx
    - src/components/navigation/CombinedSelector.tsx
  modified:
    - src/components/navigation/header.tsx
    - src/app/dashboard/layout.tsx
    - src/types/database.ts

key-decisions:
  - "Property interface in database.ts now includes mandate_id: string | null — required for client-side grouping in CombinedSelector"
  - "CombinedSelector fetches all properties without mandate_id param — groups client-side using availableMandates from context"
  - "Initial auto-selection guard: ref prevents re-selecting after cookie-restored selection on mount"

patterns-established:
  - "Context-first UI: selector components consume context directly, zero prop drilling from layout"
  - "Mandate-crossing building select: switchMandate(mandateId) before selectBuilding(buildingId) when crossing mandate"

requirements-completed: [CTX-01, CTX-02, CTX-03, CTX-04]

# Metrics
duration: 20min
completed: 2026-02-18
---

# Phase 38 Plan 03: OrgSwitcher + CombinedSelector UI Components and Layout Wiring Summary

**OrgSwitcher badge and CombinedSelector hierarchical dropdown wired into header; dashboard layout wrapped in full OrganizationProvider > MandateProvider > BuildingProvider > ConnectivityProvider stack with zero prop drilling**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-02-18
- **Completed:** 2026-02-18
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- OrgSwitcher: pill badge showing current org name, dropdown lists available orgs with Check icon on current, calls switchOrg() on select (full page nav per D5), renders null for single-org users (D2)
- CombinedSelector: hierarchical dropdown with two rendering modes:
  - Multi-mandate: Alle Mandate → Mandate group header → Property sub-header → Building radio
  - Single-mandate (D3): Alle Liegenschaften → Property header → Building radio
- Building selection across mandate boundary: switchMandate(mandateId) called before selectBuilding(buildingId) (D6)
- Initial auto-selection: if no cookie-restored building_id, selects first building from first property
- Stale validation: if selected building no longer in property list, resets to 'all'
- Header updated: PropertySelector removed, OrgSwitcher + CombinedSelector added; HeaderProps simplified to `{ user?: User }` (no prop drilling)
- Dashboard layout: full provider nesting OrganizationProvider > MandateProvider > BuildingProvider > ConnectivityProvider
- DashboardLayoutInner simplified: no BuildingContext destructuring, passes only `user` to Header

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OrgSwitcher and CombinedSelector components** - `6de940b` (feat)
2. **Task 2: Wire header and dashboard layout with new components and provider stack** - `85b0651` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/navigation/OrgSwitcher.tsx` - New: org badge + dropdown, null for single-org (D2)
- `src/components/navigation/CombinedSelector.tsx` - New: mandate > property > building hierarchical dropdown (D1, D3, D6)
- `src/components/navigation/header.tsx` - Modified: replaced PropertySelector with OrgSwitcher + CombinedSelector; removed prop drilling
- `src/app/dashboard/layout.tsx` - Modified: added OrganizationProvider + MandateProvider to wrapping stack; simplified DashboardLayoutInner
- `src/types/database.ts` - Modified: added mandate_id field to Property interface (auto-fix: required for client-side grouping)

## Decisions Made

- Property interface now includes `mandate_id: string | null` — client-side grouping in CombinedSelector requires this field; was missing from the type despite existing in the DB schema
- CombinedSelector fetches all properties without mandate_id param, groups client-side using availableMandates — avoids re-fetching when mandate changes (consistent with existing PropertySelector behavior)
- Initial selection ref guard prevents re-triggering after cookie-restored buildingId is applied

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added mandate_id to Property interface**
- **Found during:** Task 1 (CombinedSelector grouping logic)
- **Issue:** Property interface in src/types/database.ts lacked `mandate_id` field, blocking client-side mandate grouping
- **Fix:** Added `mandate_id: string | null` to Property interface in database.ts
- **Files modified:** src/types/database.ts
- **Commit:** 6de940b

## Issues Encountered

None — TypeScript passed clean on both tasks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 38 complete: all 3 plans done (data layer → context providers → UI components + wiring)
- Dashboard is now multi-tenant aware: org switcher for multi-org users, combined selector with mandate hierarchy
- v4.0 Multi-Tenant Architecture context and navigation layer is complete
- No blockers

---
*Phase: 38-app-context-org-switcher*
*Completed: 2026-02-18*
