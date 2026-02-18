---
phase: 41-bug-fixes-cleanup
plan: 01
subsystem: multi-tenant-integration
tags: [bug-fix, storage-rls, auth, cached-queries, org-context]
dependency_graph:
  requires: [phase-40-storage-multi-tenancy, phase-38-app-context-org-switcher]
  provides: [INT-01-resolved, INT-02-resolved, INT-03-resolved, PropertySelector-removed]
  affects: [signature-upload, properties-api, buildings-api, dashboard-heatmap, dashboard-summary]
tech_stack:
  added: []
  patterns: [client-injection, isInternalRole-authorization, orgId-cache-keying, cookie-orgId-in-server-components]
key_files:
  created: []
  modified:
    - src/lib/inspections/signature-utils.ts
    - src/app/api/inspections/[id]/signature/route.ts
    - src/app/api/properties/route.ts
    - src/app/api/buildings/route.ts
    - src/lib/supabase/cached-queries.ts
    - src/lib/dashboard/heatmap-queries.ts
    - src/lib/dashboard/dashboard-queries.ts
    - src/components/dashboard/BuildingHeatmap.tsx
    - src/components/dashboard/PropertyDashboard.tsx
  deleted:
    - src/components/navigation/PropertySelector.tsx
decisions:
  - "41-01: signature-utils functions accept SupabaseClient as first parameter — caller (route) is responsible for providing org-scoped client"
  - "41-01: properties and buildings routes use x-user-role-name + isInternalRole() — hauswart (level 40) now passes authorization"
  - "41-01: cached-queries.ts uses private createOrgScopedClient(orgId) helper — orgId as cache() argument ensures cross-tenant cache isolation"
  - "41-01: server components (BuildingHeatmap, PropertyDashboard) read orgId from organization_id cookie — no prop threading needed"
metrics:
  duration: 12min
  completed: 2026-02-18
  tasks: 3
  files_modified: 9
  files_deleted: 1
---

# Phase 41 Plan 01: Bug Fixes & Integration Cleanup Summary

**One-liner:** Org-scoped SupabaseClient injection in signature utils, isInternalRole authorization in properties/buildings APIs, and orgId-keyed React cache for cross-tenant isolation in dashboard queries.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix signature-utils.ts to accept org-scoped Supabase client (INT-01) | 54aa6c4 | signature-utils.ts, signature/route.ts |
| 2 | Replace ALLOWED_ROLES with isInternalRole, delete PropertySelector (INT-02) | addc27a | properties/route.ts, buildings/route.ts, PropertySelector.tsx (deleted) |
| 3 | Fix cached-queries.ts to use org-scoped client and propagate orgId through callers | 9719f53 | cached-queries.ts, heatmap-queries.ts, dashboard-queries.ts, BuildingHeatmap.tsx, PropertyDashboard.tsx |

## What Was Built

### INT-01: Signature Storage RLS Fix

`uploadSignature` and `getSignatureUrl` in `signature-utils.ts` previously created their own `createPublicClient()` — a client without org context, causing RLS INSERT failures on the `inspections` storage bucket.

**Fix:** Both functions now accept `SupabaseClient` as the first parameter. The signature route (`/api/inspections/[id]/signature/route.ts`) creates an org-scoped client via `createOrgClient(req)` and passes it to both functions. `OrgContextMissingError` is caught at the route boundary and returns 401.

### INT-02: Hauswart 403 on Properties/Buildings APIs

`/api/properties` and `/api/buildings` used a hardcoded `ALLOWED_ROLES: Role[] = ['kewa', 'imeri']` check against the `x-user-role` header. Hauswart role was excluded, causing CombinedSelector to fail to load for hauswart users.

**Fix:** Replaced with `x-user-role-name` header + `isInternalRole(roleName)` from `@/lib/permissions`. `isInternalRole` includes `hauswart` (added in Phase 38-01). `Role` type import removed from both files. `ALLOWED_ROLES` constant deleted.

**Also deleted:** `src/components/navigation/PropertySelector.tsx` — confirmed orphaned with zero imports anywhere in the codebase, replaced by `CombinedSelector.tsx` (Phase 38-03).

### INT-03: Cached Queries Server Component Regression

All three cached query functions (`getCachedUnitsWithRooms`, `getCachedUnitConditionSummary`, `getCachedActiveProjectCount`) used `createPublicClient()` internally — no org context set, returning empty arrays for org-scoped tables.

**Fix:**
- Added private `createOrgScopedClient(orgId)` helper in `cached-queries.ts` that creates a cookie-based SSR client and calls `set_org_context` RPC.
- All three cache functions now accept `orgId: string` as their second parameter. This is required — `orgId` must be a cache() argument (not read from cookies inside) to prevent cross-tenant cache hits between concurrent requests.
- `heatmap-queries.ts` and `dashboard-queries.ts` updated to accept and propagate `orgId`.
- `BuildingHeatmap.tsx` and `PropertyDashboard.tsx` (async server components) now read `orgId` from the `organization_id` cookie via `next/headers` and pass it through.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All plan verification criteria confirmed:

1. `npx tsc --noEmit --pretty` — zero errors across full project
2. `createPublicClient` in `signature-utils.ts` — 0 matches
3. `createPublicClient` in `cached-queries.ts` — 0 matches
4. `ALLOWED_ROLES` in `properties/route.ts` and `buildings/route.ts` — 0 matches each
5. `isInternalRole` in `properties/route.ts` — 3 matches; `buildings/route.ts` — 3 matches
6. `PropertySelector.tsx` — does not exist (deleted)
7. `set_org_context` in `cached-queries.ts` — 2 matches (comment + RPC call)
8. `SupabaseClient` in `signature-utils.ts` — 3 matches (import + both function signatures)

## Self-Check: PASSED

Files exist:
- src/lib/inspections/signature-utils.ts — FOUND
- src/app/api/inspections/[id]/signature/route.ts — FOUND
- src/app/api/properties/route.ts — FOUND
- src/app/api/buildings/route.ts — FOUND
- src/lib/supabase/cached-queries.ts — FOUND
- src/lib/dashboard/heatmap-queries.ts — FOUND
- src/lib/dashboard/dashboard-queries.ts — FOUND
- src/components/dashboard/BuildingHeatmap.tsx — FOUND
- src/components/dashboard/PropertyDashboard.tsx — FOUND
- src/components/navigation/PropertySelector.tsx — NOT FOUND (correctly deleted)

Commits exist:
- 54aa6c4 — FOUND
- addc27a — FOUND
- 9719f53 — FOUND
