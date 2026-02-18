# Phase 38: Application Context & Org Switcher - Research

**Researched:** 2026-02-18
**Domain:** React Context providers, cookie-based state persistence, hierarchical UI selectors
**Confidence:** HIGH

## Summary

Phase 38 builds the client-side application context layer that sits between the existing RLS/middleware infrastructure (Phase 37) and the dashboard UI. The core work is three nested React context providers (Organization > Mandate > Building), two header components (OrgSwitcher + CombinedSelector), three cookies for state persistence, and two new API endpoints for fetching available orgs and mandates.

All decisions are locked via CONTEXT.md. The existing codebase already has the patterns needed: `BuildingContext.tsx` demonstrates the provider pattern, `PropertySelector.tsx` demonstrates the hierarchical dropdown pattern, `js-cookie` is already installed for client-side cookies, and `middleware.ts` already reads the `organization_id` cookie. No new dependencies are required.

**Primary recommendation:** Build providers from outer to inner (Organization first, then Mandate, then modify Building). The combined selector replaces PropertySelector using the same custom dropdown pattern. Use `createPublicClient()` for org/mandate API endpoints since these tables have no RLS policies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### D1: Combined Context Selector
One combined dropdown in the header replaces the current PropertySelector. Hierarchy inside the dropdown:

```
● Alle Mandate

MANDAT A
  Liegenschaft Seefeld
    ○ Gebäude 1
    ○ Gebäude 2
  Liegenschaft Oerlikon
    ○ Gebäude 1

MANDAT B
  Liegenschaft Wipkingen
    ○ Gebäude 1
```

- Trigger button shows current selection (e.g. "Seefeld / Gebäude 1")
- "Alle Mandate" option at top for cross-mandate overview
- Mandate names as group headers (not selectable items — they group the properties beneath)
- Properties nested under mandates, buildings under properties

#### D2: Org Switcher — Separate, Left-Aligned, Multi-Org Only

```
Header (multi-org user):
┌────────────────────────────────────────┐
│ [KEWA AG ▼]  [Seefeld / Geb 1 ▼]     │
└────────────────────────────────────────┘

Header (single-org user):
┌────────────────────────────────────────┐
│              [Seefeld / Geb 1 ▼]      │
└────────────────────────────────────────┘
```

- Single-org users: no org element visible at all
- Multi-org users: org name as clickable badge left of the context selector
- Click opens simple list of available orgs (radio-style selection)
- Org switch triggers full page navigation (`router.push('/dashboard')`)

#### D3: Single-Mandate Optimization
When a user's current org has only one mandate, the mandate grouping level is skipped in the combined selector. Dropdown shows directly:

```
● Alle Liegenschaften

Liegenschaft Seefeld
  ○ Gebäude 1
  ○ Gebäude 2
```

This matches the current PropertySelector behavior exactly — zero visual difference for users with one mandate.

#### D4: Cookie Persistence — Full State
Three cookies persist the user's context selection:

| Cookie | Value | Set When |
|--------|-------|----------|
| `organization_id` | UUID | Org switch (multi-org only); already read by middleware |
| `mandate_id` | UUID or `'all'` | Mandate selection in combined selector |
| `building_id` | UUID or `'all'` | Building selection in combined selector |

On page load:
1. Read cookies -> restore exact previous selection
2. If any cookie is stale (e.g. building no longer exists): fall back to "Alle" / first available
3. If no cookies (first visit): org from `organization_members.is_default`, then auto-select first building

#### D5: Org Switch Cascade — Full Page Navigation
Switching organization triggers:
1. Set `organization_id` cookie to new org UUID
2. Clear `mandate_id` and `building_id` cookies
3. `router.push('/dashboard')` — full page reload
4. Middleware picks up new org cookie -> sets x-organization-id header
5. All data re-fetches with new org context via RLS

#### D6: Mandate/Building Switch — In-Place
Switching mandate or building within the same org:
- Update cookie immediately
- Refresh data in-place (no page navigation)
- If mandate changes and current building is not in new mandate: reset to "Alle" or first building
- Building switch: content refreshes (same behavior as today)

#### D7: All Internal Roles Use Dashboard
The dashboard (`/dashboard/*`) serves all internal roles:
- Verwaltungspersonal (property management staff)
- Hauswarte (caretakers/janitors)
- Eventually Eigentuemer (property owners — read-only dashboard, deferred to v2)

RBAC controls what each role sees. Phase 38 context providers are role-agnostic.

#### D8: Mixed Mandate Workflow
Users work both cross-mandate (overview) and within a single mandate (drill-down):
- Default: "Alle Mandate" selected -> overview across everything
- Drill-down: select a specific mandate -> buildings filtered to that mandate
- Quick switching between mandates via the combined selector

### Claude's Discretion
No discretion areas defined — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)
- Owner self-service portal dashboard (v2)
- Cross-mandate portfolio KPI view (v2)
- Mandate-level template libraries (v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CTX-01 | OrganizationProvider with currentOrg, availableOrgs, switchOrg(), isLoading | Provider pattern from BuildingContext.tsx; cookie read via js-cookie; API endpoint GET /api/organizations uses createPublicClient() to query organization_members JOIN organizations |
| CTX-02 | MandateProvider with currentMandate, availableMandates, switchMandate('all' or mandateId), isLoading | Nested provider pattern; mandates filtered by current org from OrganizationContext; API endpoint GET /api/mandates uses createPublicClient() with WHERE organization_id filter |
| CTX-03 | OrgSwitcher component replacing PropertySelector in header | Two components: OrgSwitcher (simple radio list for multi-org) + CombinedSelector (hierarchical dropdown replacing PropertySelector); existing custom dropdown pattern in PropertySelector.tsx |
| CTX-04 | BuildingContext scoping to current mandate | Modify existing BuildingProvider to consume MandateContext; filter buildings by mandate_id through properties table; existing API /api/properties already returns properties with buildings |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.2.3 | Context providers, hooks (createContext, useContext, useMemo, useCallback) | Already in use; standard provider pattern |
| Next.js 16 | 16.1.6 | App Router, useRouter for org switch navigation | Already in use |
| js-cookie | 3.0.5 | Client-side cookie read/write | Already installed and used in PushContext.tsx |
| @types/js-cookie | 3.0.6 | TypeScript types for js-cookie | Already installed |
| lucide-react | 0.562.0 | Icons for selector UI (Building2, ChevronDown, Layers, Check) | Already in use throughout app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | 0.8.0 | Server-side Supabase client for API routes | createPublicClient() for org/mandate queries |
| sonner | (installed) | Toast notifications for context switch feedback | Org switch confirmation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| js-cookie | document.cookie | js-cookie already installed, provides cleaner API with options |
| Custom dropdown | @radix-ui/react-popover | Not installed; existing PropertySelector pattern works fine for the hierarchical UI |
| Zustand for state | React Context | Context is sufficient; only 3 provider values, no complex state management needed |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── contexts/
│   ├── OrganizationContext.tsx  # NEW: org provider + hook
│   ├── MandateContext.tsx       # NEW: mandate provider + hook
│   └── BuildingContext.tsx      # MODIFIED: reads mandate from MandateContext
├── components/navigation/
│   ├── header.tsx               # MODIFIED: renders OrgSwitcher + CombinedSelector
│   ├── OrgSwitcher.tsx          # NEW: multi-org badge/dropdown
│   ├── CombinedSelector.tsx     # NEW: replaces PropertySelector
│   └── PropertySelector.tsx     # DEPRECATED after CombinedSelector is complete
├── app/api/
│   ├── organizations/route.ts   # NEW: GET available orgs for current user
│   └── mandates/route.ts        # NEW: GET mandates for current org
├── types/
│   └── index.ts                 # MODIFIED: add Organization, OrganizationMember, Mandate types
└── app/dashboard/
    └── layout.tsx               # MODIFIED: wrap with OrganizationProvider > MandateProvider
```

### Pattern 1: Nested Provider Stack
**What:** Three providers nested in order, each consuming the parent's value
**When to use:** When context values form a dependency chain (org -> mandate -> building)
**Example:**
```typescript
// src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()

  if (loading) return <LoadingSkeleton />

  return (
    <OrganizationProvider>
      <MandateProvider>
        <BuildingProvider>
          <ConnectivityProvider>
            <DashboardLayoutInner user={session.user}>
              {children}
            </DashboardLayoutInner>
          </ConnectivityProvider>
        </BuildingProvider>
      </MandateProvider>
    </OrganizationProvider>
  )
}
```

### Pattern 2: Cookie-Synced Provider
**What:** Provider reads cookie on mount, writes cookie on state change
**When to use:** For persisting user selection across page loads
**Example:**
```typescript
// Pattern for OrganizationProvider
'use client'
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import Cookies from 'js-cookie'

interface OrganizationContextValue {
  currentOrg: Organization | null
  availableOrgs: Organization[]
  switchOrg: (orgId: string) => void
  isLoading: boolean
  isMultiOrg: boolean
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // On mount: read cookie, fetch available orgs, resolve current
  useEffect(() => {
    const savedOrgId = Cookies.get('organization_id')
    fetchOrganizations(savedOrgId)
  }, [])

  const switchOrg = useCallback((orgId: string) => {
    Cookies.set('organization_id', orgId, { path: '/', sameSite: 'strict' })
    Cookies.remove('mandate_id', { path: '/' })
    Cookies.remove('building_id', { path: '/' })
    window.location.href = '/dashboard' // Full navigation per D5
  }, [])

  const value = useMemo(() => ({
    currentOrg,
    availableOrgs,
    switchOrg,
    isLoading,
    isMultiOrg: availableOrgs.length > 1,
  }), [currentOrg, availableOrgs, switchOrg, isLoading])

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}
```

### Pattern 3: Stale Cookie Validation
**What:** Validate cookie values against fetched data on mount
**When to use:** When a saved cookie reference (UUID) might point to a deleted/moved entity
**Example:**
```typescript
// Inside a provider's initialization
async function initialize(savedId: string | undefined) {
  const data = await fetchFromApi()
  const items = data.items

  if (savedId) {
    const found = items.find(item => item.id === savedId)
    if (found) {
      setCurrent(found) // Cookie was valid
      return
    }
    // Cookie was stale — fall through to default
  }

  // No cookie or stale: use first item or 'all' default
  if (items.length > 0) {
    setCurrent(items[0])
    Cookies.set('cookie_name', items[0].id, { path: '/' })
  }
}
```

### Pattern 4: Custom Hierarchical Dropdown (existing pattern)
**What:** Button trigger + absolute-positioned dropdown with backdrop overlay
**When to use:** For the combined context selector with nested mandate > property > building hierarchy
**Source:** `src/components/navigation/PropertySelector.tsx` (lines 122-234)
**Key behaviors:**
- Toggle open/close via button click
- Close on backdrop click (fixed inset-0 z-40)
- Content positioned absolute, left-0 top-full mt-2, z-50
- Max height with overflow-y-auto for scrollable lists
- Radio-style selection highlighting (bg-blue-50 for active)

### Anti-Patterns to Avoid
- **Fetching org data in every provider independently:** Each provider should only fetch its own level's data. OrganizationProvider fetches orgs. MandateProvider fetches mandates for the current org. BuildingProvider fetches buildings for the current mandate.
- **Using router.push() for mandate/building switch:** Per D6, mandate and building switches are in-place. Only org switch uses full navigation (D5).
- **Putting org/mandate state in URL params:** Decisions specify cookie persistence, not URL-based state. URL params would conflict with the middleware pattern that reads cookies.
- **Making MandateProvider or BuildingProvider fetch data without waiting for parent:** Each child provider must wait for its parent's loading to complete before fetching. Otherwise race conditions occur.
- **Storing mandate_id or building_id cookies as httpOnly:** These cookies need to be read client-side by the providers. Only session cookies should be httpOnly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-side cookie management | Manual `document.cookie` parsing | `js-cookie` (already installed) | Cookie encoding, path handling, SameSite attribute |
| Loading state management | Boolean flags with race conditions | Single `isLoading` flag set in fetch lifecycle | Provider consumers check isLoading before rendering |
| Context memoization | Passing new object references each render | `useMemo` on context value | Prevents entire subtree re-render on every parent render |

**Key insight:** The entire Phase 38 implementation uses patterns already established in the codebase. No new libraries, no new patterns -- just more instances of existing ones.

## Common Pitfalls

### Pitfall 1: Context Re-render Cascade
**What goes wrong:** Context value object is a new reference every render, causing all consumers to re-render even when values haven't changed.
**Why it happens:** Creating `{ currentOrg, availableOrgs, switchOrg, isLoading }` inline in JSX creates a new object every render.
**How to avoid:** Wrap context value in `useMemo` with proper dependency array. Wrap callback functions in `useCallback`.
**Warning signs:** Dashboard pages re-render constantly; laggy UI on any state change.

### Pitfall 2: Provider Loading Race Condition
**What goes wrong:** MandateProvider starts fetching before OrganizationProvider has finished loading. Fetches mandates with no org context.
**Why it happens:** Each provider's useEffect fires independently on mount.
**How to avoid:** MandateProvider's useEffect depends on `currentOrg` from OrganizationContext. Only fetch when `currentOrg` is non-null and org `isLoading` is false.
**Warning signs:** Mandates list is empty on first load but works on second visit (cookie already set).

### Pitfall 3: Stale Cookie After Entity Deletion
**What goes wrong:** User had building X selected (in cookie). Building X is deleted. On next page load, cookie points to non-existent building.
**Why it happens:** Cookie persists beyond the entity's lifetime.
**How to avoid:** Validate cookie value against fetched data during provider initialization (Pattern 3). Fall back to 'all' or first available if stale.
**Warning signs:** Blank/error state after admin deletes a building, resolved by clearing cookies.

### Pitfall 4: Org Switch Without Cookie Clear
**What goes wrong:** User switches from KEWA AG (mandate 1) to GIMBA AG. Mandate cookie still references KEWA's mandate ID. MandateProvider tries to load a mandate that belongs to a different org.
**Why it happens:** Org switch doesn't clear downstream cookies.
**How to avoid:** Per D5, `switchOrg()` must: (1) set org cookie, (2) clear mandate cookie, (3) clear building cookie, (4) full page navigation. The cascade is explicit.
**Warning signs:** "Not found" errors or empty data after org switch.

### Pitfall 5: isInternalRole() Missing hauswart
**What goes wrong:** Users with the `hauswart` role are redirected to login when accessing `/dashboard/*`. The middleware checks `isInternalRole(session.roleName)` which currently only includes `admin`, `property_manager`, `accounting`.
**Why it happens:** The `hauswart` role was added in migration 079 but `isInternalRole()` in `src/lib/permissions.ts` was not updated.
**How to avoid:** Add `'hauswart'` to the `isInternalRole()` function. Per D7, all internal roles use the dashboard.
**Warning signs:** Hauswart users get unauthorized redirect. This is a Phase 36/37 gap that Phase 38 must address.

### Pitfall 6: Cookie Path Mismatch
**What goes wrong:** Cookies set with no `path` option default to the current page path. Middleware reads cookies at `/` path. Cookie is invisible to middleware.
**Why it happens:** `js-cookie` defaults to current page path if `path` is not specified.
**How to avoid:** Always set `{ path: '/' }` when writing cookies. The existing middleware reads `request.cookies.get('organization_id')` which works across all paths only if the cookie was set at `/`.
**Warning signs:** Org context works on dashboard but not on API routes after setting cookie from a nested page.

### Pitfall 7: Double Fetch on Org Switch
**What goes wrong:** `router.push('/dashboard')` causes a client-side navigation, but the middleware needs the new cookie to set the x-organization-id header. If the page does a soft navigation, middleware may not re-run.
**Why it happens:** Next.js App Router soft navigation skips middleware for cached routes.
**How to avoid:** Use `window.location.href = '/dashboard'` instead of `router.push('/dashboard')` for org switch. This forces a full page reload, ensuring middleware runs with the new cookie.
**Warning signs:** After org switch, data still shows old org's data until manual refresh.

## Code Examples

### API Endpoint: GET /api/organizations
```typescript
// src/app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/with-org'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createPublicClient()

  // organization_members and organizations have NO RLS
  // Filter by user_id application-side
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      is_default,
      organizations (
        id,
        name,
        slug,
        is_active
      )
    `)
    .eq('user_id', userId)
    .eq('organizations.is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const organizations = data?.map(m => ({
    id: m.organizations.id,
    name: m.organizations.name,
    slug: m.organizations.slug,
    isDefault: m.is_default,
  })) || []

  return NextResponse.json({ organizations })
}
```

### API Endpoint: GET /api/mandates
```typescript
// src/app/api/mandates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/with-org'

export async function GET(request: NextRequest) {
  const orgId = request.headers.get('x-organization-id')
  if (!orgId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
  }

  const supabase = await createPublicClient()

  // mandates has NO RLS — filter by organization_id application-side
  const { data, error } = await supabase
    .from('mandates')
    .select('id, name, mandate_type, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ mandates: data || [] })
}
```

### Modified GET /api/properties (mandate filter)
```typescript
// The existing GET /api/properties needs an optional mandate_id query param
// to support filtering properties by mandate when a specific mandate is selected

// In the existing route handler, add:
const mandateId = request.nextUrl.searchParams.get('mandate_id')

let query = supabase.from('properties').select('*').order('name')
if (mandateId && mandateId !== 'all') {
  query = query.eq('mandate_id', mandateId)
}
// Properties table has RLS via organization_id, so org scoping is automatic
```

### TypeScript Types
```typescript
// Add to src/types/index.ts or src/types/database.ts

export interface Organization {
  id: string
  name: string
  slug: string
  isDefault?: boolean  // From organization_members.is_default
}

export interface Mandate {
  id: string
  name: string
  mandate_type: 'rental' | 'stwe' | 'mixed'
  is_active: boolean
}
```

### Cookie Constants
```typescript
// Centralized cookie configuration
export const CONTEXT_COOKIES = {
  ORGANIZATION_ID: 'organization_id',
  MANDATE_ID: 'mandate_id',
  BUILDING_ID: 'building_id',
} as const

export const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'strict' as const,
  expires: 365, // 1 year (same as device_id cookie in PushContext)
}
```

## Existing Code Analysis

### Files to CREATE
| File | Purpose |
|------|---------|
| `src/contexts/OrganizationContext.tsx` | OrganizationProvider + useOrganization hook |
| `src/contexts/MandateContext.tsx` | MandateProvider + useMandate hook |
| `src/components/navigation/OrgSwitcher.tsx` | Org badge/dropdown for multi-org users |
| `src/components/navigation/CombinedSelector.tsx` | Hierarchical mandate > property > building dropdown |
| `src/app/api/organizations/route.ts` | GET available organizations for current user |
| `src/app/api/mandates/route.ts` | GET mandates for current organization |

### Files to MODIFY
| File | Changes |
|------|---------|
| `src/app/dashboard/layout.tsx` | Wrap with OrganizationProvider > MandateProvider; adjust provider nesting order |
| `src/contexts/BuildingContext.tsx` | Read mandate from MandateContext; persist to/from building_id cookie; filter by mandate |
| `src/components/navigation/header.tsx` | Replace PropertySelector with OrgSwitcher + CombinedSelector; remove selectedBuildingId/onBuildingSelect props |
| `src/types/index.ts` | Add Organization, Mandate types; add SessionResponse.organizationId |
| `src/lib/permissions.ts` | Add 'hauswart' to isInternalRole() |
| `src/app/api/properties/route.ts` | Add optional mandate_id query parameter for filtering |

### Files to DEPRECATE (keep, but no longer imported)
| File | Reason |
|------|--------|
| `src/components/navigation/PropertySelector.tsx` | Replaced by CombinedSelector; keep for reference during development |

### Consumers of BuildingContext (must keep working)
These files import `useBuilding` and must continue working without changes:
- `src/app/dashboard/page.tsx` — uses `selectedBuildingId` for dashboard data filtering
- `src/app/dashboard/liegenschaft/page.tsx` — uses `selectedBuildingId` for heatmap data
- `src/app/dashboard/einheiten/page.tsx` — uses `selectedBuildingId` for unit list
- `src/app/dashboard/aufgaben/page.tsx` — uses `selectedBuildingId` for task filtering
- `src/app/dashboard/projekte/page.tsx` — uses `selectedBuildingId` for project filtering
- `src/components/dashboard/LiegenschaftContainer.tsx` — uses `selectedBuildingId` for building data

The `useBuilding()` hook interface (`selectedBuildingId`, `selectBuilding`, `isAllSelected`, `isLoading`) must remain unchanged. The modification is internal: BuildingProvider reads the mandate from MandateContext and fetches only buildings within that mandate scope.

### Database Schema (already exists)
| Table | RLS | Key Columns | Used By |
|-------|-----|-------------|---------|
| `organizations` | NO | id, name, slug, is_active | OrganizationProvider |
| `organization_members` | NO | organization_id, user_id, role_id, is_default | OrganizationProvider (user's available orgs) |
| `mandates` | NO | id, organization_id, owner_id, name, mandate_type, is_active | MandateProvider |
| `properties` | YES (org-scoped) | id, name, organization_id, mandate_id, property_type | CombinedSelector (grouped by mandate) |
| `buildings` | YES (org-scoped) | id, name, property_id, organization_id | CombinedSelector/BuildingProvider |

### Cookie Flow
```
1. Page load
   └─> Middleware reads organization_id cookie
       └─> Sets x-organization-id header
       └─> OrganizationProvider reads cookie via js-cookie
           └─> Fetches GET /api/organizations
           └─> Validates cookie against response
           └─> MandateProvider reads mandate_id cookie
               └─> Fetches GET /api/mandates
               └─> Validates cookie against response
               └─> BuildingProvider reads building_id cookie
                   └─> Fetches properties+buildings filtered by mandate
                   └─> Validates cookie against response

2. Org switch (rare)
   └─> Cookies.set('organization_id', newOrgId)
   └─> Cookies.remove('mandate_id')
   └─> Cookies.remove('building_id')
   └─> window.location.href = '/dashboard'  (full reload)

3. Mandate switch (in-place)
   └─> Cookies.set('mandate_id', mandateId)
   └─> Cookies.remove('building_id')
   └─> MandateProvider updates state
   └─> BuildingProvider re-fetches buildings for new mandate

4. Building switch (in-place)
   └─> Cookies.set('building_id', buildingId)
   └─> BuildingProvider updates state
   └─> Dashboard pages re-render with new building scope
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session-only BuildingContext (useState, no persistence) | Cookie-persisted BuildingContext reading from MandateContext | Phase 38 | Building selection survives page refresh |
| PropertySelector fetching all properties flat | CombinedSelector with mandate > property > building hierarchy | Phase 38 | Multi-mandate navigation possible |
| No org awareness in dashboard | OrganizationProvider + middleware cookie -> header flow | Phase 37-38 | Multi-org support enabled |

**Deprecated/outdated:**
- `PropertySelector.tsx`: Replaced by `CombinedSelector.tsx` in Phase 38

## Open Questions

1. **Properties API mandate filtering via query param vs. separate endpoint**
   - What we know: Existing GET /api/properties returns all properties with buildings (org-scoped via RLS). CombinedSelector needs properties grouped by mandate.
   - What's unclear: Should mandate filtering be a query param on the existing endpoint or a new endpoint returning the full hierarchy?
   - Recommendation: Add `?mandate_id=X` query param to existing GET /api/properties. This is backward-compatible and follows the existing `?building_id=X` pattern. The CombinedSelector can fetch all properties (no mandate_id param) and group client-side, or filter server-side when a mandate is selected.

2. **Session API organizationId field**
   - What we know: CONTEXT.md lists "Session response with organizationId field" as missing. The session API currently returns role, userId, roleName, isInternal, displayName.
   - What's unclear: Whether this is actually needed, since OrganizationProvider reads the org from cookies directly.
   - Recommendation: Not needed for Phase 38. OrganizationProvider reads the org cookie client-side and fetches available orgs from the API. Adding organizationId to the session response would be redundant and create a second source of truth.

3. **CombinedSelector data fetching strategy**
   - What we know: The selector needs mandate > property > building hierarchy. Properties and buildings are RLS-scoped to the current org (via middleware + x-organization-id header).
   - What's unclear: Whether CombinedSelector should fetch properties+buildings itself (like PropertySelector does) or read from BuildingProvider context.
   - Recommendation: CombinedSelector fetches directly from the existing GET /api/properties endpoint (which returns properties with nested buildings). It groups results by `mandate_id` using the mandates from MandateContext. The selector is the data source; the providers consume the selection.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/contexts/BuildingContext.tsx`, `src/components/navigation/PropertySelector.tsx`, `src/middleware.ts`, `src/lib/supabase/with-org.ts` — verified existing patterns
- Migration files: `073_org_foundation.sql`, `075_org_id_columns.sql`, `079_hauswart_role.sql`, `080_seed_organizations.sql`, `081_seed_properties.sql`, `083_rls_policies.sql` — verified schema structure and RLS configuration
- Package dependencies: `js-cookie@3.0.5`, `@types/js-cookie@3.0.6`, `@radix-ui/react-select@2.2.6`, `next@16.1.6`, `react@19.2.3` — verified installed versions
- Context7 `/llmstxt/nextjs_llms_txt` — Next.js cookies() API, middleware cookie handling

### Secondary (MEDIUM confidence)
- `isInternalRole()` in `src/lib/permissions.ts` — confirmed `hauswart` is missing from the list despite being `is_internal: true` in the database

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, no new dependencies
- Architecture: HIGH - Existing provider/selector patterns in codebase provide clear templates
- Pitfalls: HIGH - Identified from direct code analysis (cookie paths, race conditions, hauswart role gap)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable patterns, no fast-moving dependencies)
