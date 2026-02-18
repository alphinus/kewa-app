---
phase: 41-bug-fixes-cleanup
verified: 2026-02-18T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 41: v4.0 Bug Fixes & Cleanup Verification Report

**Phase Goal:** Close integration bugs and tech debt identified by milestone audit — signature storage RLS, hauswart role access, cached-queries regression, orphaned file
**Verified:** 2026-02-18
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `signature-utils.ts` uses org-scoped Supabase client — signature uploads pass storage RLS | VERIFIED | `SupabaseClient` type on both `uploadSignature` and `getSignatureUrl` params; `createPublicClient` absent; route passes `createOrgClient(req)` result |
| 2 | hauswart role can access `/api/properties` and `/api/buildings` — CombinedSelector loads without 403 | VERIFIED | Both routes use `x-user-role-name` + `isInternalRole(roleName)`; `permissions.ts` line 226 explicitly includes `'hauswart'` in the allow list |
| 3 | `cached-queries.ts` uses org-scoped client — server components return tenant data | VERIFIED | Private `createOrgScopedClient(orgId)` helper calls `set_org_context` RPC; all three cache functions accept `orgId` as second parameter |
| 4 | `PropertySelector.tsx` deleted — no orphaned components | VERIFIED | Glob search returns zero results for `PropertySelector.tsx` anywhere under `src/` |
| 5 | All hardcoded `ALLOWED_ROLES` arrays in properties/buildings routes replaced with `isInternalRole()` calls | VERIFIED | Zero matches for `ALLOWED_ROLES` in both route files; three `isInternalRole` call sites in each file (import + GET + POST) |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/inspections/signature-utils.ts` | SupabaseClient injection, no createPublicClient | VERIFIED | Line 8: `import type { SupabaseClient }`, line 24: `supabase: SupabaseClient` (uploadSignature), line 64: `supabase: SupabaseClient` (getSignatureUrl). Zero `createPublicClient` references. |
| `src/app/api/inspections/[id]/signature/route.ts` | createOrgClient usage, passes supabase to utils | VERIFIED | Line 12: imports `createOrgClient, OrgContextMissingError`. Line 77: `createOrgClient(req)`. Line 80: `uploadSignature(supabase, ...)`. Line 91: `getSignatureUrl(supabase, ...)`. OrgContextMissingError caught at line 99. |
| `src/app/api/properties/route.ts` | isInternalRole authorization, no ALLOWED_ROLES | VERIFIED | Line 12: `import { isInternalRole }`. Lines 39, 123: `!isInternalRole(roleName)`. Zero `ALLOWED_ROLES` matches. Uses `x-user-role-name` header (not `x-user-role`). |
| `src/app/api/buildings/route.ts` | isInternalRole authorization, no ALLOWED_ROLES | VERIFIED | Line 12: `import { isInternalRole }`. Lines 34, 99: `!isInternalRole(roleName)`. Zero `ALLOWED_ROLES` matches. Uses `x-user-role-name` header. |
| `src/lib/supabase/cached-queries.ts` | Org-scoped cached queries with orgId parameter and set_org_context | VERIFIED | Lines 52–70: `createOrgScopedClient(orgId)` private helper creates SSR client and calls `supabase.rpc('set_org_context', { org_id: orgId })`. All three cache functions (`getCachedUnitsWithRooms`, `getCachedUnitConditionSummary`, `getCachedActiveProjectCount`) accept `orgId: string` as second parameter. |
| `src/components/navigation/PropertySelector.tsx` | File deleted (orphaned component) | VERIFIED | Glob returns no matches. File does not exist in codebase. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `signature/route.ts` | `signature-utils.ts` | `uploadSignature(supabase, ...)` | WIRED | Line 80: `await uploadSignature(supabase, orgId, inspectionId, image_data_url)` — org-scoped client passed as first arg |
| `signature/route.ts` | `signature-utils.ts` | `getSignatureUrl(supabase, ...)` | WIRED | Line 91: `await getSignatureUrl(supabase, storagePath)` — org-scoped client passed as first arg |
| `properties/route.ts` | `src/lib/permissions.ts` | `isInternalRole(roleName)` | WIRED | Line 12 import, called at lines 39 and 123 |
| `buildings/route.ts` | `src/lib/permissions.ts` | `isInternalRole(roleName)` | WIRED | Line 12 import, called at lines 34 and 99 |
| `heatmap-queries.ts` | `cached-queries.ts` | `getCachedUnitsWithRooms(buildingId, orgId)` | WIRED | Line 83: two-argument call confirmed; `orgId` propagated from `fetchHeatmapData` second parameter |
| `dashboard-queries.ts` | `cached-queries.ts` | `getCachedUnitConditionSummary(buildingId, orgId)` | WIRED | Line 41: two-argument call |
| `dashboard-queries.ts` | `cached-queries.ts` | `getCachedActiveProjectCount(unitIds, orgId)` | WIRED | Line 45: two-argument call |
| `BuildingHeatmap.tsx` | `heatmap-queries.ts` | reads orgId from `organization_id` cookie, passes to `fetchHeatmapData` | WIRED | Line 73: `const orgId = (await cookies()).get('organization_id')?.value ?? ''`; line 74: `fetchHeatmapData(buildingId, orgId)` |
| `PropertyDashboard.tsx` | `dashboard-queries.ts` | reads orgId from `organization_id` cookie, passes to `fetchDashboardSummary` | WIRED | Line 35: `const orgId = (await cookies()).get('organization_id')?.value ?? ''`; line 36: `fetchDashboardSummary(buildingId, orgId)` |

---

## Requirements Coverage

Phase 41 PLAN frontmatter declares: `STOR-02`, `NAV-03`.

REQUIREMENTS.md maps both as shared across phases (`STOR-02 | Phase 40 + 41`, `NAV-03 | Phase 39 + 41`). Phase 41's contribution to each is the integration bug fix layer — not the full requirement delivery.

| Requirement | Source Plan | Description | Phase 41 Scope | Status | Evidence |
|-------------|-------------|-------------|----------------|--------|----------|
| STOR-02 | 41-01-PLAN.md | Storage RLS policies validate first folder segment matches `current_organization_id()` | Fix client-side: signature route must pass org-scoped Supabase client so RLS INSERT check can pass (policies already exist from Phase 40 migration `084_storage_rls.sql`) | SATISFIED | `signature-utils.ts` accepts injected `SupabaseClient`; route creates org-scoped client via `createOrgClient(req)` and passes it to both upload/URL functions; RLS policies are in place at `supabase/migrations/084_storage_rls.sql` |
| NAV-03 | 41-01-PLAN.md | Objekte drill-down routes (Phase 39 primary delivery) | Fix integration gap: hauswart users were getting 403 on `/api/properties` + `/api/buildings`, blocking CombinedSelector from loading in nav for that role | SATISFIED | `isInternalRole` in `permissions.ts` explicitly includes `hauswart`; both API routes now use this check instead of hardcoded `ALLOWED_ROLES: ['kewa', 'imeri']` |

No orphaned requirements: REQUIREMENTS.md assigns no additional IDs to Phase 41 beyond what the PLAN declares.

---

## Anti-Patterns Found

Scan of all 9 modified files and the 1 deleted file:

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| — | — | — | No anti-patterns found |

- Zero `TODO/FIXME/HACK/PLACEHOLDER` comments in any modified file
- No stub return values (`return null`, `return {}`, `return []`) in implementation paths
- No empty handlers or console.log-only implementations
- `createPublicClient` fully removed from `signature-utils.ts` and `cached-queries.ts`
- `ALLOWED_ROLES` fully removed from both route files

---

## Human Verification Required

Two items require runtime confirmation and cannot be verified statically:

### 1. Signature Upload Storage RLS Pass

**Test:** As a logged-in user with org context set, navigate to a completed inspection and submit a signature via the signature canvas.
**Expected:** Signature saves without error; inspection status changes to `signed`; signed URL returns in response.
**Why human:** The RLS check `(storage.foldername(name))[1] = current_organization_id()::text` on the `inspections` bucket executes at the database level. Static analysis confirms the client is org-scoped and `set_org_context` is called, but the actual RLS pass/fail depends on the migration being applied to the live database and the org UUID matching the storage path prefix.

### 2. Hauswart Role CombinedSelector Load

**Test:** Log in as a hauswart user (role level 40). Navigate to any dashboard page that renders the CombinedSelector/navigation header.
**Expected:** Properties and buildings load without 403; selector displays property/building options normally.
**Why human:** `isInternalRole` includes `hauswart` in code, and middleware must inject the correct `x-user-role-name` header. Static analysis cannot verify that the middleware's header injection matches the role name string expected by the function — a mismatch in the header value would silently return 403.

---

## Gaps Summary

No gaps. All five success criteria from ROADMAP.md are fully implemented and wired in the codebase:

1. `signature-utils.ts` — `SupabaseClient` injected, `createPublicClient` removed, route creates org-scoped client and passes it through.
2. `isInternalRole` — includes `hauswart`, both API routes migrated from `ALLOWED_ROLES` + `x-user-role` to `isInternalRole` + `x-user-role-name`.
3. `cached-queries.ts` — `createOrgScopedClient(orgId)` calls `set_org_context` RPC; `orgId` is a cache() argument on all three functions.
4. `PropertySelector.tsx` — deleted; confirmed absent.
5. `ALLOWED_ROLES` — zero remaining instances in properties/buildings routes.

Two runtime behaviors (storage RLS INSERT and hauswart header matching) need human confirmation but are not classification-level gaps — the code is correctly structured to enable them.

---

_Verified: 2026-02-18_
_Verifier: Claude (gsd-verifier)_
