# Phase 41: v4.0 Bug Fixes & Cleanup - Research

**Researched:** 2026-02-18
**Domain:** Supabase RLS, Next.js API routes, TypeScript — no new libraries
**Confidence:** HIGH — all findings verified directly from codebase

## Summary

This phase fixes four concrete bugs/debt items identified by the v4.0 milestone audit. All fixes are small, surgical code changes — no new dependencies, no new patterns. The full implementation is verifiable by reading 5 files. Research resolves exactly what to change in each file and why.

**INT-01 (signature upload RLS):** `signature-utils.ts` calls `createPublicClient()` which has no `set_org_context` RPC call, so `current_organization_id()` returns NULL in Postgres, causing the storage INSERT RLS policy to reject uploads. The fix: accept a pre-built supabase client (already org-scoped) as a parameter instead of creating its own.

**INT-02 (hauswart 403 on /api/properties and /api/buildings):** Both routes declare `const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']` and check `ALLOWED_ROLES.includes(userRole)` where `userRole` comes from `x-user-role` header. The middleware sets `x-user-role = session.role` which is typed as `'kewa' | 'imeri'` (legacy field). Hauswart users have `roleName = 'hauswart'` in `x-user-role-name` but the route reads `x-user-role`, not `x-user-role-name`. The permission check path (middleware ROUTE_PERMISSIONS) is not blocking hauswart — the double-check ALLOWED_ROLES guard in the route handler body IS the blocker if a hauswart user's legacy `role` column is not `'kewa'`/`'imeri'`. The audit identifies the pattern as broken tech debt regardless. Fix: replace `ALLOWED_ROLES.includes(userRole)` with `isInternalRole(roleName)` where `roleName` is read from `x-user-role-name` header. This is already the pattern used in parking, comments, work-orders, and auth routes.

**Tech debt — cached-queries.ts:** Three functions (`getCachedUnitsWithRooms`, `getCachedUnitConditionSummary`, `getCachedActiveProjectCount`) call `createPublicClient()`. `createPublicClient()` does NOT call `set_org_context`, so RLS USING clauses on `units`, `rooms`, `unit_condition_summary`, and `renovation_projects` filter all rows returning empty arrays. These are server-side React cache() wrappers — they need an org-scoped client. The correct client for server components is `createOrgClient` but that requires a `NextRequest` object. For server components, a different approach is needed: accept orgId and call `set_org_context` directly, or use `createServiceClient()` scoped with RPC. Recommended: accept orgId param, create a cookie-based client, call `set_org_context` inline (same pattern as `createOrgClient` but without the NextRequest dependency).

**Tech debt — PropertySelector.tsx orphan:** `src/components/navigation/PropertySelector.tsx` is confirmed orphaned — zero imports in the entire codebase. The file is self-contained with no dependents.

**Primary recommendation:** Execute four isolated fixes in one plan. Each fix is 5-20 lines of change. No cascading effects.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STOR-02 | Storage RLS policies enforce org-prefixed paths on 4 buckets | INT-01 fix ensures signature upload client has org context set via set_org_context RPC, making current_organization_id() return correctly |
| NAV-03 | /objekte drill-down 5 levels accessible to all internal roles | INT-02 fix ensures hauswart (an internal role per isInternalRole()) is not blocked at /api/properties and /api/buildings |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | existing | Supabase server client | Already installed, used everywhere |
| `@supabase/supabase-js` | existing | Service client | Already installed |
| `react` | existing | `cache()` for server components | Already installed |

No new packages needed. All fixes use existing imports.

**Installation:** None required.

## Architecture Patterns

### Pattern 1: org-scoped client injection (INT-01 fix)

**What:** Pass the Supabase client from the API route handler into utility functions instead of having utilities create their own clients. This is the established pattern for all other upload utilities.

**When to use:** Any utility function called from an API route that needs org-scoped storage or DB access.

**Current broken pattern:**
```typescript
// src/lib/inspections/signature-utils.ts — CURRENT (broken)
export async function uploadSignature(
  orgId: string,
  inspectionId: string,
  dataUrl: string
): Promise<string> {
  const supabase = await createPublicClient() // no set_org_context!
  // ...storage upload fails RLS
}
```

**Fixed pattern:**
```typescript
// src/lib/inspections/signature-utils.ts — FIXED
import type { SupabaseClient } from '@supabase/supabase-js'

export async function uploadSignature(
  supabase: SupabaseClient,
  orgId: string,
  inspectionId: string,
  dataUrl: string
): Promise<string> {
  // supabase is already org-scoped — set_org_context already called by route
  // ...storage upload passes RLS
}
```

**Caller (route.ts) — FIXED:**
```typescript
// src/app/api/inspections/[id]/signature/route.ts
const orgId = req.headers.get('x-organization-id')
if (!orgId) { return NextResponse.json({ error: 'Organization context required' }, { status: 401 }) }

const supabase = await createOrgClient(req) // org-scoped, set_org_context called
const storagePath = await uploadSignature(supabase, orgId, inspectionId, image_data_url)
```

**Note:** `getSignatureUrl` only reads (createSignedUrl) — RLS SELECT policies are read-friendly and don't require org context for signed URL generation. However it should also be updated for consistency: pass the supabase client in.

### Pattern 2: isInternalRole() instead of hardcoded ALLOWED_ROLES (INT-02 fix)

**What:** Replace `const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']` + `ALLOWED_ROLES.includes(userRole)` with `isInternalRole(roleName)` where `roleName = request.headers.get('x-user-role-name')`.

**The middleware already sets x-user-role-name:** Line 111 in `src/middleware.ts`:
```typescript
response.headers.set('x-user-role-name', session.roleName)
```

`session.roleName` for hauswart = `'hauswart'`. `isInternalRole('hauswart')` returns `true` (line 226 in permissions.ts includes `'hauswart'`).

**Current broken pattern (properties/route.ts and buildings/route.ts):**
```typescript
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']
const userRole = request.headers.get('x-user-role') as Role | null
if (!ALLOWED_ROLES.includes(userRole)) { return 403 }
```

**Fixed pattern:**
```typescript
import { isInternalRole } from '@/lib/permissions'

const roleName = request.headers.get('x-user-role-name')
if (!roleName || !isInternalRole(roleName)) {
  return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
}
```

**Same fix applies to:** `/api/buildings/route.ts` (line 15 has identical `ALLOWED_ROLES: ['kewa', 'imeri']`).

**Scope decision:** The audit specifically names `/api/properties` and `/api/buildings` as the INT-02 culprits affecting CombinedSelector. Do NOT change all other routes with ALLOWED_ROLES — that would be scope creep. The phase target is the two routes blocking hauswart dashboard load.

### Pattern 3: org-scoped server component queries (cached-queries fix)

**What:** cached-queries.ts runs in server components and needs org context. Cannot use `createOrgClient(request)` because server components don't have `NextRequest`. Must use an alternative approach.

**Option A — accept orgId, create server client, call set_org_context:**
```typescript
// cached-queries.ts — FIXED
export const getCachedUnitsWithRooms = cache(async (buildingId: string, orgId: string): Promise<UnitWithRooms[]> => {
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, { cookies: { ... } })
  await supabase.rpc('set_org_context', { org_id: orgId })
  // ...query
})
```

**Option B — use createServiceClient() which bypasses RLS (simpler but less secure):**
```typescript
// cached-queries.ts — ALTERNATIVE
export const getCachedUnitsWithRooms = cache(async (buildingId: string): Promise<UnitWithRooms[]> => {
  const supabase = createServiceClient() // bypasses RLS — returns data for any org
  // ...query filtered by buildingId which implicitly scopes to one org
})
```

**Recommended: Option A** — keeps RLS enforced. The orgId is available in server components via cookie or passed from page component props.

**Callers to update:** `heatmap-queries.ts` and `dashboard-queries.ts` both call the cached functions. They run in server context and can read orgId from cookies.

**Caution:** `react cache()` deduplication is keyed by function arguments. Adding `orgId` as a parameter is required so cache doesn't return wrong-org data across requests.

### Pattern 4: file deletion (orphaned PropertySelector.tsx)

**What:** Delete `src/components/navigation/PropertySelector.tsx`.

**Verified orphaned:** `grep -r 'PropertySelector' src/` returns only the file itself (two matches: the interface declaration and the export function declaration). No imports anywhere in the codebase.

**Action:** `rm src/components/navigation/PropertySelector.tsx` — nothing else to update.

### Anti-Patterns to Avoid

- **Don't change ALL ALLOWED_ROLES routes:** The audit specifies exactly two routes as the INT-02 bug. Changing all 30+ routes using ALLOWED_ROLES pattern is out of scope for this phase.
- **Don't use createServiceClient for cached-queries:** It bypasses RLS entirely. RLS is the security boundary. Use Option A (set_org_context with orgId param).
- **Don't add orgId to cached-queries by reading directly from cookies() inside cache():** The `cookies()` call inside `cache()` would be called once and cached — subsequent requests with different orgIds would get the first org's data. The orgId MUST be a cache key parameter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Org context for storage | Custom auth header | `createOrgClient(req)` + pass client | Pattern is established in 120+ routes |
| Role checking | New permission system | `isInternalRole()` from permissions.ts | Already handles hauswart, accounting, all internal roles |
| Server-side org scoping | New cookie parser | `supabase.rpc('set_org_context', { org_id })` | This is the established RPC call |

## Common Pitfalls

### Pitfall 1: getSignatureUrl also uses createPublicClient
**What goes wrong:** Fixing only `uploadSignature` leaves `getSignatureUrl` still using `createPublicClient`. The signed URL creation (SELECT) works without org context in most cases (SELECT policies may differ from INSERT), but it's inconsistent.
**How to avoid:** Update both functions. Pass supabase client to both.
**Risk level:** Lower than upload — signed URL generation is typically less restrictive — but fix for consistency.

### Pitfall 2: react cache() keying with orgId
**What goes wrong:** If `getCachedUnitsWithRooms(buildingId)` is cached without `orgId`, a request from org A followed by a request from org B (same buildingId) within the same render tree returns org A's data to org B.
**Why it happens:** `cache()` is keyed by all arguments. Missing orgId means the cache hit ignores tenant isolation.
**How to avoid:** Always include orgId as a parameter. Verify callers pass orgId correctly.
**Warning signs:** Tests returning stale data, building pages showing wrong unit counts.

### Pitfall 3: TypeScript type mismatch on isInternalRole argument
**What goes wrong:** `x-user-role-name` is `string | null` from `request.headers.get()`. `isInternalRole()` accepts `string`. Null check required before calling.
**How to avoid:** Guard: `const roleName = request.headers.get('x-user-role-name'); if (!roleName || !isInternalRole(roleName)) { return 403 }`

### Pitfall 4: SupabaseClient type import for signature-utils
**What goes wrong:** Importing `SupabaseClient` from wrong package. The clients returned by `createOrgClient` are `SupabaseClient` from `@supabase/supabase-js` (extended by `@supabase/ssr`). Using the bare type from `@supabase/supabase-js` is correct.
**How to avoid:** Use `ReturnType<typeof createOrgClient>` to let TypeScript infer the exact type, or import `SupabaseClient` from `@supabase/supabase-js` which is what `createOrgClient` returns.

### Pitfall 5: Signature route uses getCurrentUser() not createOrgClient
**What goes wrong:** The signature route (`/api/inspections/[id]/signature/route.ts`) currently authenticates via `getCurrentUser()` (cookie-based, returns `{ id, role }`), not via `createOrgClient`. To fix INT-01, the route must also call `createOrgClient(req)` to get an org-scoped client. The route already reads `orgId` from `x-organization-id` — it just needs to call `createOrgClient` and pass the resulting client to `uploadSignature`.
**How to avoid:** Add `createOrgClient(req)` call in the route handler (after the orgId check), pass the client to both `uploadSignature` and `getSignatureUrl`.

## Code Examples

### INT-01: Complete signature-utils.ts fix
```typescript
// Source: direct codebase analysis of src/lib/inspections/signature-utils.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import { inspectionSignaturePath } from '@/lib/storage/paths'

export async function uploadSignature(
  supabase: SupabaseClient,
  orgId: string,
  inspectionId: string,
  dataUrl: string
): Promise<string> {
  const matches = dataUrl.match(/^data:image\/png;base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid data URL format. Expected data:image/png;base64,...')
  }

  const base64Data = matches[1]
  const buffer = Buffer.from(base64Data, 'base64')

  const storagePath = inspectionSignaturePath(orgId, inspectionId)
  const { error } = await supabase
    .storage
    .from('inspections')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload signature: ${error.message}`)
  }

  return storagePath
}

export async function getSignatureUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from('inspections')
    .createSignedUrl(storagePath, 3600)

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  if (!data?.signedUrl) {
    throw new Error('No signed URL returned from storage')
  }

  return data.signedUrl
}
```

### INT-01: Signature route handler fix
```typescript
// Source: direct codebase analysis of src/app/api/inspections/[id]/signature/route.ts

// Add imports:
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'

// In POST handler, replace:
//   const storagePath = await uploadSignature(orgId, inspectionId, image_data_url)
//   const signatureUrl = await getSignatureUrl(storagePath)
// With:
const supabase = await createOrgClient(req)
const storagePath = await uploadSignature(supabase, orgId, inspectionId, image_data_url)
const signatureUrl = await getSignatureUrl(supabase, storagePath)
```

### INT-02: properties/route.ts fix
```typescript
// Source: direct codebase analysis of src/app/api/properties/route.ts

// Remove:
// const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']
// import type { Role } from '@/types'  (remove if unused after fix)

// Add:
import { isInternalRole } from '@/lib/permissions'

// In GET and POST handlers, replace:
// const userRole = request.headers.get('x-user-role') as Role | null
// if (!ALLOWED_ROLES.includes(userRole)) { ... }
// With:
const roleName = request.headers.get('x-user-role-name')
if (!roleName || !isInternalRole(roleName)) {
  return NextResponse.json(
    { error: 'Forbidden: Insufficient permissions' },
    { status: 403 }
  )
}
```

### cached-queries.ts fix (Option A)
```typescript
// Source: direct codebase analysis of src/lib/supabase/cached-queries.ts

import { cache } from 'react'
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { RoomCondition } from '@/types'

async function createOrgScopedClient(orgId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* server component */ }
        },
      },
    }
  )
  await supabase.rpc('set_org_context', { org_id: orgId })
  return supabase
}

export const getCachedUnitsWithRooms = cache(async (buildingId: string, orgId: string): Promise<UnitWithRooms[]> => {
  const supabase = await createOrgScopedClient(orgId)
  const { data, error } = await supabase
    .from('units')
    .select(`id, name, floor, position, unit_type, tenant_name, parking_status, rooms (id, name, room_type, condition)`)
    .eq('building_id', buildingId)
    .order('floor', { ascending: false })
  if (error) throw error
  return (data ?? []) as UnitWithRooms[]
})

// Same pattern for getCachedUnitConditionSummary and getCachedActiveProjectCount
```

### Callers of cached-queries that need orgId
```typescript
// src/lib/dashboard/heatmap-queries.ts — must pass orgId to getCachedUnitsWithRooms
// src/lib/dashboard/dashboard-queries.ts — must pass orgId to getCachedUnitConditionSummary and getCachedActiveProjectCount
// These functions need to accept orgId and propagate it through
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Utility functions create their own Supabase clients | Caller passes org-scoped client | Utilities work with RLS |
| Hardcoded `['kewa', 'imeri']` role arrays | `isInternalRole(roleName)` | Roles add without code changes |
| createPublicClient in server components | createOrgClient or set_org_context + cookied client | Server components return tenant data |

## Open Questions

1. **What orgId source do dashboard-queries.ts callers use?**
   - What we know: `heatmap-queries.ts` and `dashboard-queries.ts` are called from server components (page.tsx files). Those pages have access to cookies via `next/headers`.
   - What's unclear: Do the calling page.tsx files currently receive orgId from context/cookies, or must they be modified to read and pass it?
   - Recommendation: Check `src/app/dashboard/` pages that call `fetchDashboardSummary` and `fetchHeatmapData` to see if orgId is already available in their scope. If not, read from `cookies().get('organization_id')` at the page level.

2. **Does hauswart user's `users.role` column hold `'kewa'`/`'imeri'` or something else?**
   - What we know: `session.ts` validates role must be `'kewa' | 'imeri'`. If hauswart user has `role = 'hauswart'`, login fails validation and they can't get a session at all.
   - What's unclear: The 079_hauswart_role.sql migration adds 'hauswart' to the `user_role` ENUM but doesn't insert any hauswart users. How hauswart users are created (what `role` value they get) is not defined in code.
   - Recommendation: The ALLOWED_ROLES fix is still correct tech debt to clean up regardless. The deeper session validation issue (if hauswart users can't log in at all) is a separate concern not in this phase's scope, but should be noted.

## Sources

### Primary (HIGH confidence)
- Direct codebase — `src/lib/inspections/signature-utils.ts` — confirms createPublicClient usage
- Direct codebase — `src/app/api/inspections/[id]/signature/route.ts` — confirms route structure and orgId extraction
- Direct codebase — `src/app/api/properties/route.ts` — confirms ALLOWED_ROLES pattern and both GET/POST affected
- Direct codebase — `src/app/api/buildings/route.ts` — same ALLOWED_ROLES pattern, also affected
- Direct codebase — `src/lib/supabase/with-org.ts` — confirms createOrgClient calls set_org_context, createPublicClient does not
- Direct codebase — `src/lib/supabase/cached-queries.ts` — confirms createPublicClient usage in all 3 cache functions
- Direct codebase — `src/lib/permissions.ts` — confirms isInternalRole() includes 'hauswart', and the function signature
- Direct codebase — `src/middleware.ts` — confirms x-user-role-name header is set from session.roleName
- Direct codebase — `src/components/navigation/PropertySelector.tsx` — confirmed no imports in codebase
- Direct codebase — `src/lib/session.ts` — confirms x-user-role is always 'kewa'|'imeri' legacy value
- `.planning/v4.0-MILESTONE-AUDIT.md` — authoritative source of INT-01, INT-02 bug descriptions
- `supabase/migrations/079_hauswart_role.sql` — confirms hauswart permissions include properties:read

### Secondary (MEDIUM confidence)
- `src/lib/dashboard/heatmap-queries.ts` and `dashboard-queries.ts` — callers of cached-queries identified, full update scope understood

## Metadata

**Confidence breakdown:**
- INT-01 fix (signature client injection): HIGH — root cause confirmed by code, fix pattern used in 100+ routes
- INT-02 fix (ALLOWED_ROLES → isInternalRole): HIGH — both affected files confirmed, isInternalRole pattern verified in permissions.ts
- cached-queries fix: HIGH for diagnosis (createPublicClient confirmed), MEDIUM for callers (need to check page-level orgId availability)
- PropertySelector deletion: HIGH — no imports confirmed by grep

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable codebase, no fast-moving dependencies)
