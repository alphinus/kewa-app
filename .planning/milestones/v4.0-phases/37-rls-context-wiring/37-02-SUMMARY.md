---
phase: 37-rls-context-wiring
plan: "02"
subsystem: database
tags: [supabase, rls, multi-tenant, middleware, next.js, typescript]

requires:
  - phase: 37-rls-context-wiring/37-01
    provides: "248 RESTRICTIVE RLS policies on 62 tables + set_org_context RPC helper"

provides:
  - "createOrgClient(request) — tenant-scoped Supabase client with Postgres session variable set via RPC"
  - "createPublicClient() — anon-key client for global tables without org context"
  - "createServiceClient() — service_role client bypassing RLS for admin operations"
  - "OrgContextMissingError — fail-fast error class mapped to 401 by route handlers"
  - "Middleware sets x-organization-id response header on all authenticated requests"

affects:
  - "37-03-PLAN (portal/contractor route migration)"
  - "37-04-PLAN (tenant API route migration)"
  - "All API routes — must use createOrgClient instead of createClient"

tech-stack:
  added: []
  patterns:
    - "Middleware-to-DB org context flow: cookie -> organization_members fallback -> x-organization-id header -> RPC set_org_context"
    - "Fail-fast org context: OrgContextMissingError thrown when header absent, not silently ignored"
    - "Three client tiers: createOrgClient (tenant), createPublicClient (global), createServiceClient (admin)"

key-files:
  created:
    - src/lib/supabase/with-org.ts
  modified:
    - src/middleware.ts

key-decisions:
  - "Middleware imports from server.ts (not with-org.ts) to avoid circular dependency"
  - "orgId defaults to null when no cookie and no default org row — header not set (downstream route gets OrgContextMissingError)"
  - "createServiceClient is synchronous — uses @supabase/supabase-js createClient directly (no cookie handling needed)"

patterns-established:
  - "createOrgClient(request): read x-organization-id header, call set_org_context RPC, return client"
  - "Middleware org resolution: cookie first, organization_members.is_default fallback"
  - "OrgContextMissingError signals 401 — route handlers check instanceof OrgContextMissingError"

requirements-completed:
  - RLS-02
  - RLS-03

duration: 8min
completed: 2026-02-18
---

# Phase 37 Plan 02: TypeScript Org-Context Layer Summary

**Middleware org resolution via cookie/organization_members fallback + three-tier Supabase client factory (createOrgClient, createPublicClient, createServiceClient) bridging Next.js requests to Postgres RLS session context**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T00:00:00Z
- **Completed:** 2026-02-18T00:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/lib/supabase/with-org.ts` with three client factories and OrgContextMissingError class
- Middleware resolves organization_id from cookie or default organization_members row, sets x-organization-id response header
- TypeScript compiles clean with no errors across all modified files

## Task Commits

1. **Task 1: Create with-org.ts org-aware Supabase client helpers** - `2d31ab8` (feat)
2. **Task 2: Enhance middleware to set x-organization-id header** - `82cc3c1` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/lib/supabase/with-org.ts` — Three client factories (createOrgClient, createPublicClient, createServiceClient) + OrgContextMissingError class
- `src/middleware.ts` — Added org resolution: reads organization_id cookie, falls back to organization_members default org query, sets x-organization-id response header

## Decisions Made

- Middleware imports `createClient` from `@/lib/supabase/server` (not `with-org.ts`) to avoid circular dependency
- `createServiceClient()` is synchronous — uses `@supabase/supabase-js` bare client (no cookie/SSR handling needed)
- When no cookie and no default org row found, `orgId` is null and header is not set — route handlers receive OrgContextMissingError on next createOrgClient call

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. `SUPABASE_SERVICE_ROLE_KEY` env var must be set before `createServiceClient()` is called — this is an existing operational requirement, not new.

## Next Phase Readiness

- `src/lib/supabase/with-org.ts` ready for import by all API routes
- Middleware sets `x-organization-id` on every authenticated request
- Plan 37-03: Portal/contractor routes use `createServiceClient()` (no org context needed)
- Plan 37-04: ~119 tenant API routes migrated from `createClient()` to `createOrgClient(request)`

---
*Phase: 37-rls-context-wiring*
*Completed: 2026-02-18*
