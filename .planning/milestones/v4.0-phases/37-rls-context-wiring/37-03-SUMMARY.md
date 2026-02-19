---
phase: 37-rls-context-wiring
plan: 03
subsystem: api
tags: [supabase, rls, nextjs, api-routes, org-context]

requires:
  - phase: 37-rls-context-wiring
    provides: "37-02 created createOrgClient, createPublicClient, createServiceClient in with-org.ts"

provides:
  - "All 123 API route files migrated from createClient to org-aware clients"
  - "99 tenant routes using createOrgClient(request) with OrgContextMissingError handling"
  - "10 public/auth routes using createPublicClient()"
  - "15 portal/contractor routes using createServiceClient() (synchronous)"
  - "Zero remaining imports of createClient from @/lib/supabase/server in src/app/api/"

affects:
  - 37-04
  - future phases adding new API routes

tech-stack:
  added: []
  patterns:
    - "createOrgClient(request) for all tenant API routes — sets RLS org context via x-organization-id header"
    - "createPublicClient() for auth/settings routes — anon key, global tables only"
    - "createServiceClient() for portal/contractor routes — service_role, synchronous (no await), bypasses RLS"
    - "OrgContextMissingError caught in every tenant handler to return 401 when org header absent"

key-files:
  created: []
  modified:
    - "src/app/api/**/*.ts (99 tenant routes) — createOrgClient"
    - "src/app/api/auth/**/*.ts (4 files) — createPublicClient"
    - "src/app/api/portal/auth/**/*.ts (4 files) — createPublicClient"
    - "src/app/api/settings/categories/**/*.ts (2 files) — createPublicClient"
    - "src/app/api/portal/**/*.ts (8 files) — createServiceClient"
    - "src/app/api/contractor/**/*.ts (7 files) — createServiceClient"

key-decisions:
  - "Portal/contractor routes use createServiceClient (service_role) not createPublicClient — they query RLS-protected tenant tables without an org session; token-based validation provides application-layer access control"
  - "createServiceClient is synchronous (no await) — no cookie reading, no RPC call, direct service key client"
  - "Routes that delegate entirely to lib files (portal/tickets, portal/categories) excluded — handled in Plan 37-04"
  - "Two files used req instead of request parameter name — corrected to pass req to createOrgClient"

patterns-established:
  - "Tenant route pattern: import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org' — await createOrgClient(request) — catch OrgContextMissingError returns 401"
  - "Public route pattern: import { createPublicClient } from '@/lib/supabase/with-org' — await createPublicClient()"
  - "Portal/contractor route pattern: import { createServiceClient } from '@/lib/supabase/with-org' — createServiceClient() (no await)"

requirements-completed:
  - RLS-04

duration: 90min
completed: 2026-02-18
---

# Phase 37 Plan 03: API Route Client Migration Summary

**Mechanical migration of all 123 API route files from createClient to three org-aware Supabase clients, establishing RLS context enforcement at every tenant query boundary**

## Performance

- **Duration:** ~90 min (across two sessions)
- **Started:** Previous session
- **Completed:** 2026-02-18
- **Tasks:** 2
- **Files modified:** 123 (99 tenant + 10 public + 14 portal/contractor)

## Accomplishments
- All 99 tenant API routes now call `createOrgClient(request)` — org context set before every RLS-protected query
- All tenant handlers have `OrgContextMissingError` catch returning 401 when org header is absent
- 10 auth/settings routes use `createPublicClient()` for global table access
- 15 portal/contractor routes use `createServiceClient()` — synchronous service-role client bypasses RLS where token-based auth provides access control
- TypeScript compiles clean — zero errors after fixing two `req`/`request` naming issues

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate ~98 tenant API routes to createOrgClient** - `c39c40f` (feat)
2. **Task 2: Migrate public/portal/contractor routes to createPublicClient and createServiceClient** - `3d36555` (feat)
3. **Fix: Correct req parameter name in inspection routes** - `792f113` (fix)

## Files Created/Modified

**Task 1 — createOrgClient (99 files across):**
- `src/app/api/buildings/**` (3 files)
- `src/app/api/properties/**` (2 files)
- `src/app/api/units/**` (3 files)
- `src/app/api/rooms/**` (2 files)
- `src/app/api/tasks/**` (3 files)
- `src/app/api/projects/**` (3 files)
- `src/app/api/renovation-projects/**` (4 files)
- `src/app/api/work-orders/**` (6 files)
- `src/app/api/expenses/**` (2 files)
- `src/app/api/invoices/**` (4 files)
- `src/app/api/payments/**` (2 files)
- `src/app/api/partners/**` (2 files)
- `src/app/api/purchase-orders/**` (4 files)
- `src/app/api/deliveries/**` (3 files)
- `src/app/api/inventory-movements/**` (2 files)
- `src/app/api/suppliers/**` (3 files)
- `src/app/api/change-orders/**` (9 files)
- `src/app/api/inspections/**` (6 files)
- `src/app/api/inspection-templates/route.ts` (1 file — delegates to lib)
- `src/app/api/templates/**` (10 files)
- `src/app/api/knowledge/**` (10 files)
- `src/app/api/comments/route.ts`
- `src/app/api/photos/**` (2 files)
- `src/app/api/audio/**` (3 files)
- `src/app/api/notifications/digest/route.ts`
- `src/app/api/costs/**` (2 files)
- `src/app/api/reports/weekly/route.ts`
- `src/app/api/admin/tickets/**` (4 files)
- `src/app/api/reorder-alerts/route.ts`

**Task 2 Category A — createPublicClient (10 files):**
- `src/app/api/auth/login/route.ts` — also updated 3 helper function ReturnType annotations
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/magic-link/send/route.ts`
- `src/app/api/auth/magic-link/verify/route.ts` — also updated 1 helper function ReturnType annotation
- `src/app/api/portal/auth/login/route.ts`
- `src/app/api/portal/auth/register/[token]/route.ts`
- `src/app/api/portal/auth/verify-invite/[token]/route.ts`
- `src/app/api/portal/auth/qr-login/route.ts`
- `src/app/api/settings/categories/route.ts`
- `src/app/api/settings/categories/[id]/route.ts`

**Task 2 Category B — createServiceClient (15 files):**
- `src/app/api/portal/dashboard/route.ts`
- `src/app/api/portal/profile/route.ts`
- `src/app/api/portal/tickets/[id]/attachments/route.ts`
- `src/app/api/portal/inspections/[token]/route.ts`
- `src/app/api/portal/inspections/[token]/acknowledge/route.ts`
- `src/app/api/portal/change-orders/[token]/route.ts`
- `src/app/api/portal/change-orders/[token]/approve/route.ts`
- `src/app/api/portal/change-orders/[token]/reject/route.ts`
- `src/app/api/contractor/request-link/route.ts`
- `src/app/api/contractor/[token]/status/route.ts`
- `src/app/api/contractor/[token]/mark-viewed/route.ts`
- `src/app/api/contractor/[token]/[workOrderId]/respond/route.ts`
- `src/app/api/contractor/[token]/[workOrderId]/upload/route.ts`
- `src/app/api/contractor/[token]/[workOrderId]/media/route.ts`
- `src/app/api/audio/route.ts` — background transcription uses service client

## Decisions Made

- Portal/contractor routes use `createServiceClient` (service_role key) rather than `createPublicClient` — they query RLS-protected tenant tables (work_orders, partners, media, inspections, change_orders, tickets) without an org session. The token-based validation in each handler provides application-layer access control. Using anon key with RLS would block these queries.
- `createServiceClient()` is synchronous — no cookie read, no set_org_context RPC. Applied without `await` throughout.
- Routes delegating entirely to lib files (portal/tickets/*, portal/categories) excluded from this plan — their lib dependencies are handled in Plan 37-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong parameter name in createOrgClient calls**
- **Found during:** Post-task TypeScript compilation check
- **Issue:** Two inspection route files declared handler parameter as `req: NextRequest` but called `createOrgClient(request)` — TS2552 "Cannot find name 'request'"
- **Fix:** Changed `createOrgClient(request)` to `createOrgClient(req)` in both files
- **Files modified:** `src/app/api/inspections/[id]/defects/[defectId]/action/route.ts`, `src/app/api/inspections/[id]/pdf/route.tsx`
- **Verification:** `tsc --noEmit` passes with zero errors
- **Committed in:** `792f113`

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Fix essential for TypeScript correctness. No scope creep.

## Issues Encountered

- Various catch block format variations (single-line, multi-line, German string, `error instanceof Error ? error.message`) required checking each file's actual format before applying OrgContextMissingError addition.
- `inspection-templates/route.ts` delegates all DB operations to lib functions — import still updated, OrgContextMissingError added to catch blocks, but no direct `createClient()` call was present.
- `portal/tickets/[id]/attachments/route.ts` had mixed indentation (6-space in POST handler, 4-space in GET handler) — handled with two separate replace_all calls.
- `auth/login/route.ts` and `auth/magic-link/verify/route.ts` had helper function type annotations `Awaited<ReturnType<typeof createClient>>` — updated to reference `createPublicClient`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All API routes now use org-aware Supabase clients
- Plan 37-04 handles lib/ and page-level files that still reference old createClient
- TypeScript compiles clean — foundation solid for runtime RLS enforcement

---
*Phase: 37-rls-context-wiring*
*Completed: 2026-02-18*
