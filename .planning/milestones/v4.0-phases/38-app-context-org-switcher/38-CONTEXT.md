# Phase 38 Context: Application Context & Org Switcher

## Phase Goal

Users can view and switch between organizations and mandates, with all downstream data automatically scoped.

## Requirements

CTX-01, CTX-02, CTX-03, CTX-04

## Decisions

### D1: Combined Context Selector

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

### D2: Org Switcher — Separate, Left-Aligned, Multi-Org Only

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

### D3: Single-Mandate Optimization

When a user's current org has only one mandate, the mandate grouping level is skipped in the combined selector. Dropdown shows directly:

```
● Alle Liegenschaften

Liegenschaft Seefeld
  ○ Gebäude 1
  ○ Gebäude 2
```

This matches the current PropertySelector behavior exactly — zero visual difference for users with one mandate.

### D4: Cookie Persistence — Full State

Three cookies persist the user's context selection:

| Cookie | Value | Set When |
|--------|-------|----------|
| `organization_id` | UUID | Org switch (multi-org only); already read by middleware |
| `mandate_id` | UUID or `'all'` | Mandate selection in combined selector |
| `building_id` | UUID or `'all'` | Building selection in combined selector |

On page load:
1. Read cookies → restore exact previous selection
2. If any cookie is stale (e.g. building no longer exists): fall back to "Alle" / first available
3. If no cookies (first visit): org from `organization_members.is_default`, then auto-select first building

### D5: Org Switch Cascade — Full Page Navigation

Switching organization triggers:
1. Set `organization_id` cookie to new org UUID
2. Clear `mandate_id` and `building_id` cookies
3. `router.push('/dashboard')` — full page reload
4. Middleware picks up new org cookie → sets x-organization-id header
5. All data re-fetches with new org context via RLS

This is acceptable because org switching is infrequent (rare admin action).

### D6: Mandate/Building Switch — In-Place

Switching mandate or building within the same org:
- Update cookie immediately
- Refresh data in-place (no page navigation)
- If mandate changes and current building is not in new mandate: reset to "Alle" or first building
- Building switch: content refreshes (same behavior as today)

### D7: All Internal Roles Use Dashboard

The dashboard (`/dashboard/*`) serves all internal roles:
- Verwaltungspersonal (property management staff)
- Hauswarte (caretakers/janitors)
- Eventually Eigentümer (property owners — read-only dashboard, deferred to v2)

RBAC controls what each role sees. Phase 38 context providers are role-agnostic — they provide the org/mandate/building scope, not the permissions.

### D8: Mixed Mandate Workflow

Users work both cross-mandate (overview) and within a single mandate (drill-down):
- Default: "Alle Mandate" selected → overview across everything
- Drill-down: select a specific mandate → buildings filtered to that mandate
- Quick switching between mandates via the combined selector

## Existing Architecture (Phase 37 State)

### What Exists

| Component | File | Current State |
|-----------|------|---------------|
| Dashboard layout | `src/app/dashboard/layout.tsx` | Client component, wraps in BuildingProvider > ConnectivityProvider |
| BuildingContext | `src/contexts/BuildingContext.tsx` | Pure useState, no persistence, no org awareness |
| PropertySelector | `src/components/navigation/PropertySelector.tsx` | Fetches GET /api/properties, groups by property > building |
| Header | `src/components/navigation/header.tsx` | Renders PropertySelector for internal users |
| Middleware | `src/middleware.ts` | Reads `organization_id` cookie, falls back to DB is_default lookup, sets x-organization-id header |
| with-org.ts | `src/lib/supabase/with-org.ts` | createOrgClient reads x-organization-id, calls set_org_context RPC |
| Session hook | `src/hooks/useSession.ts` | Returns role, userId, isInternal — no org info |
| Session API | `src/app/api/auth/session/route.ts` | No organizationId in response |

### What's Missing

- OrganizationProvider / OrganizationContext
- MandateProvider / MandateContext
- OrgSwitcher component
- Combined context selector (replacing PropertySelector)
- Cookie write for organization_id (read exists in middleware)
- Cookie read/write for mandate_id, building_id
- API endpoint for user's available organizations
- API endpoint for mandates within current org
- TypeScript types for Organization, OrganizationMember, Mandate
- Session response with organizationId field

### Provider Stack (Target)

```
DashboardLayout
  └── OrganizationProvider     ← NEW (reads org cookie, fetches available orgs)
        └── MandateProvider    ← NEW (fetches mandates for current org)
              └── BuildingProvider   ← MODIFIED (scoped to mandate selection)
                    └── ConnectivityProvider
                          └── DashboardLayoutInner
                                ├── Header (OrgSwitcher + CombinedSelector)
                                ├── main {children}
                                └── MobileNav
```

## Constraints

- Phase 38 does NOT change navigation routes (Phase 39)
- Phase 38 does NOT change storage paths (Phase 40)
- Phase 38 does NOT add breadcrumbs (Phase 39)
- Contractor/portal routes are unaffected (separate auth flows)
- RBAC permissions are unchanged — Phase 38 only adds org/mandate/building context
- The combined selector replaces PropertySelector but must handle the same edge cases (empty building list, auto-selection)

## Deferred Ideas

- Owner self-service portal dashboard (v2)
- Cross-mandate portfolio KPI view (v2)
- Mandate-level template libraries (v2)

---
*Created: 2026-02-18 — Phase 38 discuss-phase complete*
