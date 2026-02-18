---
phase: 38-app-context-org-switcher
plan: 01
subsystem: api
tags: [supabase, typescript, organizations, mandates, rbac, multi-tenant]

# Dependency graph
requires:
  - phase: 37-rls-context-wiring
    provides: createPublicClient, createOrgClient in with-org.ts; middleware sets x-user-id and x-organization-id headers
  - phase: 35-schema-foundation
    provides: organization_members, organizations, mandates tables in schema
provides:
  - Organization and Mandate TypeScript interfaces exportable from '@/types'
  - GET /api/organizations — user's available orgs from organization_members
  - GET /api/mandates — org-scoped active mandates ordered by name
  - GET /api/properties with optional mandate_id query param filter
  - isInternalRole('hauswart') returns true (D7 fix)
affects: [38-02, 38-03, any code that checks isInternalRole or accesses org/mandate data]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public client pattern: tables without RLS use createPublicClient + header-based scoping at query level"
    - "Optional query param filter: propertiesQuery built conditionally before .eq() chaining"

key-files:
  created:
    - src/app/api/organizations/route.ts
    - src/app/api/mandates/route.ts
  modified:
    - src/types/index.ts
    - src/lib/permissions.ts
    - src/app/api/properties/route.ts

key-decisions:
  - "hauswart added to isInternalRole() at level 40 in ROLE_HIERARCHY — between accounting(60) and tenant(20), per D7"
  - "MandateType exported as standalone type alias alongside Mandate interface — consumers can import either"
  - "mandate_id filter skipped when value is 'all' string — UI convention for 'no filter selected'"

patterns-established:
  - "Header-scoped public client: no-RLS tables use createPublicClient() with .eq('user_id'/'organization_id', header_value)"
  - "Optional filter pattern: build query object then conditionally chain .eq() before awaiting"

requirements-completed: [CTX-01, CTX-02, CTX-04]

# Metrics
duration: 15min
completed: 2026-02-18
---

# Phase 38 Plan 01: Data Layer (Types, API Routes, Permissions) Summary

**Organization and Mandate TypeScript types, two new API endpoints (GET /api/organizations, GET /api/mandates), mandate_id filter on /api/properties, and hauswart role added to isInternalRole for dashboard access**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-18
- **Completed:** 2026-02-18
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Organization and Mandate interfaces + MandateType alias exported from src/types/index.ts
- GET /api/organizations returns user's available orgs via organization_members JOIN, filtered to is_active = true
- GET /api/mandates returns org-scoped active mandates ordered by name
- GET /api/properties now accepts optional mandate_id query param (skipped when value is 'all')
- hauswart added to ROLE_HIERARCHY at level 40 and to isInternalRole() per D7

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Organization/Mandate types and fix isInternalRole** - `b8dab7b` (feat)
2. **Task 2: Create organizations, mandates API routes and add mandate filter to properties** - `47232a4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/types/index.ts` - Added Organization interface, Mandate interface, MandateType alias
- `src/lib/permissions.ts` - Added hauswart to ROLE_HIERARCHY (level 40) and isInternalRole()
- `src/app/api/organizations/route.ts` - New: GET returns user's available organizations from organization_members
- `src/app/api/mandates/route.ts` - New: GET returns active org-scoped mandates ordered by name
- `src/app/api/properties/route.ts` - Added optional mandate_id query param filter

## Decisions Made
- hauswart at level 40 in ROLE_HIERARCHY: between accounting (60) and tenant (20), matching its operational scope
- MandateType exported as a standalone type alias so consumers can use either the full Mandate interface or just the type
- mandate_id filter treats 'all' as no-filter: matches UI convention where 'all' means "don't filter"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript check passed clean on both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All types and API endpoints are ready for Plan 02 (OrganizationProvider + MandateProvider context providers)
- Plan 03 (UI components) can consume /api/organizations, /api/mandates, and mandate-filtered /api/properties
- No blockers

---
*Phase: 38-app-context-org-switcher*
*Completed: 2026-02-18*
