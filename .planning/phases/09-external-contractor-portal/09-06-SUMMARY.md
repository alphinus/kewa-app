---
phase: 09-external-contractor-portal
plan: 06
subsystem: auth
tags: [middleware, magic-link, contractor, session, next.js]

# Dependency graph
requires:
  - phase: 09-01
    provides: Magic link token system (validateContractorAccess)
  - phase: 09-02
    provides: Contractor portal pages with path-based tokens
provides:
  - Middleware allows contractor portal access via path-based magic link tokens
  - Token validation before session check
  - First-time contractor access without prior authentication
affects: [contractor-portal, UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Path-based token extraction in middleware
    - Pre-session validation for external users

key-files:
  created: []
  modified:
    - src/middleware.ts

key-decisions:
  - "Extract token from path segment, not query params"
  - "Validate token before session check for first-time access"
  - "Pass contractor email via response headers for downstream use"

patterns-established:
  - "Path token extraction: Use pathname.split('/').filter(Boolean) for segment access"
  - "External access: Validate token before requiring session"

# Metrics
duration: 5min
completed: 2026-01-19
---

# Phase 09 Plan 06: Middleware Magic Link Fix Summary

**Fix middleware to validate path-based magic link tokens before session check, enabling contractor portal first-time access**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-19T14:51:57Z
- **Completed:** 2026-01-19T14:57:15Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Fixed contractor route handler to extract token from URL path (not query params)
- Import and use validateContractorAccess from magic-link module
- Allow contractor portal access without prior session for valid tokens
- Pass contractor email and work order ID via response headers

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix handleContractorRoute to validate path token** - `a337996` (fix)
2. **Task 2: Test middleware allows magic link access** - (verification only, no code changes)

## Files Created/Modified

- `src/middleware.ts` - Fixed handleContractorRoute to extract token from path and validate before session check

## Decisions Made

1. **Token extraction from path** - URLs are `/contractor/{token}` where token is the path segment, not a query param
2. **Pre-session validation** - Token is validated via validateContractorAccess before checking for existing session
3. **Headers for downstream** - Pass contractor email and work order ID via response headers for page components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Build lock from previous process required cleaning .next directory before rebuild

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Middleware now correctly handles contractor portal magic link access
- UAT Test 4 blocker (middleware blocks contractor portal) should be resolved
- Ready for re-testing the full contractor portal flow

---
*Phase: 09-external-contractor-portal*
*Completed: 2026-01-19*
