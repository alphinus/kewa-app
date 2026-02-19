---
phase: 37
plan: 04
subsystem: supabase-client-migration
tags: [rls, multi-tenant, client-migration, with-org, server-components]
dependency_graph:
  requires:
    - 37-02  # with-org.ts created (createPublicClient/createServiceClient/createOrgClient)
    - 37-03  # API routes migrated (Phase 37-03 handled portal/contractor API route migration)
  provides:
    - complete-createClient-elimination  # Zero non-API files import from @/lib/supabase/server
    - phase-38-ready  # Server components use createPublicClient; Phase 38 will add org context
  affects:
    - src/lib/**/*.ts  # All lib utility files
    - src/app/dashboard/**/*.tsx  # All dashboard server component pages
    - src/app/contractor/**/*.tsx  # Contractor knowledge pages
    - src/app/portal/**/*.tsx  # Portal pages
    - src/app/admin/page.tsx  # Admin page
tech_stack:
  added: []
  patterns:
    - createPublicClient for lib files called from org-scoped API routes and server components
    - createServiceClient (synchronous) for portal/contractor lib files without org session
    - Awaited<ReturnType<typeof createPublicClient>> replaces createClient type references
key_files:
  created: []
  modified:
    - src/lib/audit.ts
    - src/lib/admin/ticket-to-work-order.ts
    - src/lib/comments/comment-queries.ts
    - src/lib/costs/invoice-queries.ts
    - src/lib/costs/unit-cost-queries.ts
    - src/lib/dashboard/occupancy-queries.ts
    - src/lib/inspections/defect-actions.ts
    - src/lib/inspections/queries.ts
    - src/lib/inspections/re-inspection.ts
    - src/lib/inspections/signature-utils.ts
    - src/lib/knowledge/search.ts
    - src/lib/notifications/preferences.ts
    - src/lib/notifications/queries.ts
    - src/lib/notifications/send.ts
    - src/lib/notifications/tenant-triggers.ts
    - src/lib/notifications/triggers.ts
    - src/lib/parking/parking-queries.ts
    - src/lib/settings/queries.ts
    - src/lib/supabase/cached-queries.ts
    - src/lib/units/condition-queries.ts
    - src/lib/units/timeline-queries.ts
    - src/lib/work-orders/events.ts
    - src/lib/magic-link.ts
    - src/lib/contractor/queries.ts
    - src/lib/inspections/portal-tokens.ts
    - src/lib/portal/message-queries.ts
    - src/lib/portal/tenant-isolation.ts
    - src/lib/portal/ticket-queries.ts
    - src/app/dashboard/wohnungen/[id]/page.tsx
    - src/app/dashboard/projekte/[id]/page.tsx
    - src/app/dashboard/projekte/[id]/aenderungsauftraege/page.tsx
    - src/app/dashboard/kosten/wohnungen/[id]/page.tsx
    - src/app/dashboard/kosten/rechnungen/page.tsx
    - src/app/dashboard/kosten/projekte/[id]/page.tsx
    - src/app/dashboard/kosten/page.tsx
    - src/app/dashboard/kosten/export/page.tsx
    - src/app/dashboard/knowledge/category/[id]/page.tsx
    - src/app/dashboard/auftraege/page.tsx
    - src/app/dashboard/vorlagen/abnahmen/page.tsx
    - src/app/dashboard/aenderungsauftraege/[id]/page.tsx
    - src/app/contractor/[token]/knowledge/[id]/page.tsx
    - src/app/contractor/[token]/knowledge/page.tsx
    - src/app/portal/page.tsx
    - src/app/portal/change-orders/[token]/page.tsx
    - src/app/admin/page.tsx
decisions:
  - "createServiceClient is synchronous: removed await from all Group B call sites (no cookies/SSR needed)"
  - "admin/ticket-to-work-order.ts uses both clients: createPublicClient for main tenant queries, createServiceClient for storage copy operations (replaces inline createClient from @supabase/supabase-js)"
  - "audit.ts Awaited<ReturnType<typeof createClient>> type references updated to createPublicClient (functions receive client as parameter)"
  - "timeline-queries.ts internal helper functions had createClient type annotations — updated to createPublicClient"
  - "cached-queries.ts regression accepted: createPublicClient returns empty for tenant tables until Phase 38 threads org context through server components"
metrics:
  duration: "~15min"
  completed: "2026-02-18"
  tasks_completed: 2
  files_modified: 45
---

# Phase 37 Plan 04: Non-API File Migration Summary

Complete migration of all 45 non-API files (lib utilities + server component pages) from `createClient` (from `@/lib/supabase/server`) to the appropriate client from `with-org.ts` — eliminating the last non-API uses of the old Supabase client factory so the codebase uses with-org.ts clients exclusively outside API routes.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Migrate lib utility files (Group A + Group B) | ec9f603 | 28 lib files |
| 2 | Migrate server component pages | b8823c9 | 17 page files |
| Fix | Fix createClient type references in timeline-queries.ts | d83ead6 | 1 file |

## What Was Built

**Group A (22 lib files) — createPublicClient:**
Lib files called from org-scoped API routes that already set org context via createOrgClient. These files inherit the org context from the route's RPC call on the shared Postgres session.
- audit.ts, admin/ticket-to-work-order.ts (partial), comments/comment-queries.ts, costs/invoice-queries.ts, costs/unit-cost-queries.ts, dashboard/occupancy-queries.ts, inspections/defect-actions.ts, inspections/queries.ts, inspections/re-inspection.ts, inspections/signature-utils.ts, knowledge/search.ts, notifications/preferences.ts, notifications/queries.ts, notifications/send.ts, notifications/tenant-triggers.ts, notifications/triggers.ts, parking/parking-queries.ts, settings/queries.ts, supabase/cached-queries.ts, units/condition-queries.ts, units/timeline-queries.ts, work-orders/events.ts

**Group B (6 lib files) — createServiceClient (synchronous):**
Lib files called from portal/contractor routes that have no org session. Service role bypasses RLS; application-layer access control is enforced by calling routes.
- magic-link.ts, contractor/queries.ts, inspections/portal-tokens.ts, portal/message-queries.ts, portal/tenant-isolation.ts, portal/ticket-queries.ts

**admin/ticket-to-work-order.ts — both clients:**
Main tenant queries use createPublicClient; storage copy operations (previously used bare `createClient` from `@supabase/supabase-js`) now use createServiceClient.

**Server component pages (17 files) — createPublicClient:**
All dashboard, contractor knowledge, portal, and admin server component pages. These cannot set org context until Phase 38 (OrganizationProvider). Using createPublicClient is the correct intermediate step.

## Known Regression (Accepted)

`cached-queries.ts` functions (getCachedUnitsWithRooms, getCachedUnitConditionSummary, getCachedActiveProjectCount) query tenant tables via createPublicClient. After RLS enablement, these return empty results when called from server components (no org context on connection). This is explicitly deferred to Phase 38, which will thread org context through React server components via OrganizationProvider.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed createClient type references in timeline-queries.ts**
- **Found during:** TypeScript compilation check after Task 2
- **Issue:** `timeline-queries.ts` used `Awaited<ReturnType<typeof createClient>>` as the type for `supabase` parameters in 4 internal helper functions. These were not replaced by the `await createClient()` find-replace because they appear in function signatures, not as call sites.
- **Fix:** Replaced `Awaited<ReturnType<typeof createClient>>` with `Awaited<ReturnType<typeof createPublicClient>>` (4 occurrences)
- **Files modified:** `src/lib/units/timeline-queries.ts`
- **Commit:** d83ead6

**2. [Rule 2 - Missing] Replaced inline bare Supabase client in admin/ticket-to-work-order.ts**
- **Found during:** Task 1 execution
- **Issue:** File imported `import { createClient } from '@supabase/supabase-js'` for storage operations and constructed a bare admin client with hardcoded env vars. This pattern bypassed the centralized client factory.
- **Fix:** Replaced with `createServiceClient()` from with-org.ts (which already encapsulates the service role key setup)
- **Files modified:** `src/lib/admin/ticket-to-work-order.ts`
- **Commit:** ec9f603 (included in Task 1)

**3. [Rule 1 - Bug] audit.ts type references**
- **Found during:** Task 1 execution (same pattern as timeline-queries.ts)
- **Issue:** Functions `createAuthAuditLog`, `createDataAuditLog`, `getRecordAuditHistory`, `getUserAuthHistory`, `getFailedLoginAttempts` all take `supabase: Awaited<ReturnType<typeof createClient>>` as parameter type.
- **Fix:** Updated type to `Awaited<ReturnType<typeof createPublicClient>>`
- **Files modified:** `src/lib/audit.ts`
- **Commit:** ec9f603 (included in Task 1)

## Verification Results

- Zero lib files (`src/lib/**/*.ts`) import from `@/lib/supabase/server`: PASSED
- Zero page files (`src/app/{dashboard,portal,contractor,admin}/**/*.tsx`) import from `@/lib/supabase/server`: PASSED
- `createServiceClient` in src/lib: 7 lib files (excluding with-org.ts definition): PASSED
- `createPublicClient` in src/lib: 22 lib files (excluding with-org.ts definition): PASSED
- `createPublicClient` in src/app pages: 17 page files: PASSED
- TypeScript compilation (`npx tsc --noEmit`): PASSED
- `src/lib/supabase/server.ts` still exists (not deleted): PASSED

## Self-Check: PASSED

Files verified to exist:
- src/lib/supabase/with-org.ts: EXISTS
- src/lib/supabase/cached-queries.ts: EXISTS (uses createPublicClient)
- src/lib/portal/ticket-queries.ts: EXISTS (uses createServiceClient)
- src/lib/units/timeline-queries.ts: EXISTS (type references fixed)

Commits verified:
- ec9f603: feat(37-04): migrate lib utility files to with-org.ts clients
- b8823c9: feat(37-04): migrate server component pages to createPublicClient
- d83ead6: fix(37-04): fix remaining createClient type references in timeline-queries.ts
