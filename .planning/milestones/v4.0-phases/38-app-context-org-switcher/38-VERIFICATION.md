---
phase: 38-app-context-org-switcher
verified: 2026-02-18T00:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Switch organization as a multi-org user"
    expected: "Org badge appears in header; clicking shows dropdown; selecting different org causes full page reload and new org context loads"
    why_human: "Requires two organizations seeded in DB; browser interaction with cookies"
  - test: "Building selection persists across page refresh"
    expected: "After selecting a building, refreshing the page restores the same building in the CombinedSelector"
    why_human: "Cookie read/write behavior requires browser session"
  - test: "Switching org clears mandate and building selections"
    expected: "After org switch + full reload, mandate and building revert to defaults (not previous org's values)"
    why_human: "Cookie cascade clear requires browser session to verify"
  - test: "Single-mandate org shows flat property list (D3)"
    expected: "CombinedSelector dropdown shows 'Alle Liegenschaften' and properties directly without mandate headers"
    why_human: "Requires org with exactly 1 mandate seeded in DB"
---

# Phase 38: App Context & Org Switcher Verification Report

**Phase Goal:** Users can view and switch between organizations and mandates, with all downstream data automatically scoped
**Verified:** 2026-02-18
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/organizations returns current user's available organizations with isDefault flag | VERIFIED | `src/app/api/organizations/route.ts` — queries `organization_members JOIN organizations`, maps `is_default` to `isDefault`, filters `is_active=true` |
| 2 | GET /api/mandates returns mandates scoped to the current organization | VERIFIED | `src/app/api/mandates/route.ts` — reads `x-organization-id` header, queries `mandates` with `.eq('organization_id', orgId).eq('is_active', true).order('name')` |
| 3 | GET /api/properties accepts optional mandate_id query param to filter by mandate | VERIFIED | `src/app/api/properties/route.ts` lines 51-62 — `mandate_id` extracted from searchParams, conditionally applied via `.eq('mandate_id', mandateId)` when value is not 'all' |
| 4 | hauswart role can access dashboard routes via isInternalRole() | VERIFIED | `src/lib/permissions.ts` line 226 — `['admin', 'property_manager', 'accounting', 'hauswart'].includes(roleName)`; ROLE_HIERARCHY has `hauswart: 40` at line 208 |
| 5 | OrganizationProvider reads organization_id cookie on mount and fetches available orgs from GET /api/organizations | VERIFIED | `src/contexts/OrganizationContext.tsx` lines 33-70 — `useEffect([], [])` reads cookie via `Cookies.get(ORG_COOKIE)`, fetches `/api/organizations`, validates stale cookie against fetched list |
| 6 | MandateProvider waits for OrganizationProvider to finish loading before fetching mandates | VERIFIED | `src/contexts/MandateContext.tsx` lines 30-72 — `useEffect` guards on `if (orgIsLoading || !currentOrg) return`, deps array `[currentOrg, orgIsLoading]` |
| 7 | BuildingProvider reads building_id cookie on mount and persists selection changes to cookie | VERIFIED | `src/contexts/BuildingContext.tsx` lines 32-49 — `useEffect` reads `BUILDING_COOKIE` on mount; `selectBuilding` callback writes/removes cookie |
| 8 | switchOrg() sets organization_id cookie, clears mandate_id and building_id cookies, then navigates via window.location.href | VERIFIED | `src/contexts/OrganizationContext.tsx` lines 72-78 — `Cookies.set`, `Cookies.remove(MANDATE_COOKIE)`, `Cookies.remove(BUILDING_COOKIE)`, `window.location.href = '/dashboard'` |
| 9 | Multi-org users see org badge with dropdown; single-org users see nothing | VERIFIED | `src/components/navigation/OrgSwitcher.tsx` line 17 — `if (isLoading || !isMultiOrg) return null`; badge + dropdown rendered for multi-org |
| 10 | CombinedSelector shows hierarchical mandate > property > building dropdown | VERIFIED | `src/components/navigation/CombinedSelector.tsx` lines 219-349 — two render modes: single-mandate (flat) and multi-mandate (grouped with mandate headers) |
| 11 | Dashboard layout wraps children in OrganizationProvider > MandateProvider > BuildingProvider > ConnectivityProvider | VERIFIED | `src/app/dashboard/layout.tsx` lines 69-80 — exact nesting confirmed |
| 12 | Header renders OrgSwitcher + CombinedSelector (no PropertySelector); no prop drilling | VERIFIED | `src/components/navigation/header.tsx` lines 57-62 — `OrgSwitcher` and `CombinedSelector` imported and rendered; `HeaderProps` contains only `user?: User` |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/organizations/route.ts` | Available organizations for current user | VERIFIED | Exists, substantive (57 lines), exports GET, wired via fetch in OrganizationContext |
| `src/app/api/mandates/route.ts` | Mandates for current organization | VERIFIED | Exists, substantive (42 lines), exports GET, wired via fetch in MandateContext |
| `src/types/index.ts` | Organization and Mandate TypeScript types | VERIFIED | `Organization` interface at line 232, `Mandate` interface at line 241, `MandateType` alias at line 239 |
| `src/lib/permissions.ts` | hauswart included in internal roles | VERIFIED | `hauswart` in `isInternalRole()` and `ROLE_HIERARCHY` at level 40 |
| `src/contexts/OrganizationContext.tsx` | OrganizationProvider + useOrganization hook | VERIFIED | Exists, 106 lines, exports `OrganizationProvider`, `useOrganization`, `COOKIE_OPTIONS`, `ORG_COOKIE`, `MANDATE_COOKIE`, `BUILDING_COOKIE` |
| `src/contexts/MandateContext.tsx` | MandateProvider + useMandate hook | VERIFIED | Exists, 108 lines, exports `MandateProvider`, `useMandate`; depends on `useOrganization` |
| `src/contexts/BuildingContext.tsx` | Cookie-persisted BuildingProvider with mandate scoping | VERIFIED | Exists, 78 lines, exports `BuildingProvider`, `useBuilding`, `BuildingSelectionId`; imports `useMandate` and cookie constants |
| `src/components/navigation/OrgSwitcher.tsx` | Org badge + dropdown for multi-org users | VERIFIED | Exists, 79 lines, exports `OrgSwitcher`, imports `useOrganization`, null-guard for single-org |
| `src/components/navigation/CombinedSelector.tsx` | Hierarchical mandate > property > building dropdown | VERIFIED | Exists, 355 lines, exports `CombinedSelector`, imports `useMandate` and `useBuilding`, fetches `/api/properties` |
| `src/components/navigation/header.tsx` | Updated header with OrgSwitcher + CombinedSelector | VERIFIED | Imports `OrgSwitcher` and `CombinedSelector`; `PropertySelector` not imported; `HeaderProps` reduced to `{ user?: User }` |
| `src/app/dashboard/layout.tsx` | Dashboard layout with full provider stack | VERIFIED | Contains `OrganizationProvider`, `MandateProvider`, `BuildingProvider`, `ConnectivityProvider` in correct nesting order |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/organizations/route.ts` | `organization_members JOIN organizations` | `createPublicClient()` query | WIRED | `supabase.from('organization_members').select('is_default, organizations(id,name,slug,is_active)').eq('user_id', userId)` |
| `src/app/api/mandates/route.ts` | `mandates table` | `createPublicClient()` query | WIRED | `supabase.from('mandates').select(...).eq('organization_id', orgId).eq('is_active', true)` |
| `src/app/api/properties/route.ts` | `properties table` | `mandate_id` query param filter | WIRED | `propertiesQuery.eq('mandate_id', mandateId)` when not 'all' |
| `src/contexts/OrganizationContext.tsx` | `/api/organizations` | `fetch` in `useEffect` on mount | WIRED | `fetch('/api/organizations')` in mount effect, response parsed and used to set `currentOrg` and `availableOrgs` |
| `src/contexts/MandateContext.tsx` | `/api/mandates` | `fetch` in `useEffect` when `currentOrg` changes | WIRED | `fetch('/api/mandates')` inside effect gated on `currentOrg` non-null |
| `src/contexts/MandateContext.tsx` | `src/contexts/OrganizationContext.tsx` | `useOrganization()` hook | WIRED | `const { currentOrg, isLoading: orgIsLoading } = useOrganization()` |
| `src/contexts/BuildingContext.tsx` | `src/contexts/MandateContext.tsx` | `useMandate()` hook | WIRED | `useMandate()` called at line 30 (no destructuring needed — CombinedSelector does the filtering) |
| `src/components/navigation/OrgSwitcher.tsx` | `src/contexts/OrganizationContext.tsx` | `useOrganization()` hook | WIRED | `useOrganization()` destructures `currentOrg`, `availableOrgs`, `switchOrg`, `isMultiOrg`, `isLoading` |
| `src/components/navigation/CombinedSelector.tsx` | `/api/properties` | `fetch` in `useEffect` | WIRED | `fetch('/api/properties')` in `fetchProperties()` called on mount |
| `src/components/navigation/CombinedSelector.tsx` | `src/contexts/MandateContext.tsx` | `useMandate()` hook | WIRED | `useMandate()` destructures `currentMandateId`, `availableMandates`, `switchMandate`, `isSingleMandate` |
| `src/components/navigation/CombinedSelector.tsx` | `src/contexts/BuildingContext.tsx` | `useBuilding()` hook | WIRED | `useBuilding()` destructures `selectedBuildingId`, `selectBuilding` |
| `src/app/dashboard/layout.tsx` | `src/contexts/OrganizationContext.tsx` | `OrganizationProvider` wrapping | WIRED | `<OrganizationProvider>` wraps the full provider stack at layout root |
| `src/components/navigation/header.tsx` | `src/components/navigation/OrgSwitcher.tsx` | `OrgSwitcher` component import | WIRED | `import { OrgSwitcher } from './OrgSwitcher'` and rendered in JSX |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CTX-01 | 38-01, 38-02, 38-03 | OrganizationProvider with currentOrg, availableOrgs, switchOrg(), isLoading, memoized | SATISFIED | `src/contexts/OrganizationContext.tsx` — all interface fields present, `useMemo` on context value, cookie read/write, API fetch on mount |
| CTX-02 | 38-01, 38-02, 38-03 | MandateProvider with currentMandateId, availableMandates, switchMandate(), isLoading, isSingleMandate, scoped to current org | SATISFIED | `src/contexts/MandateContext.tsx` — all interface fields present, waits for org, fetches mandates, stale validation |
| CTX-03 | 38-03 | OrgSwitcher replaces PropertySelector in header; single-org = no element; multi-org = dropdown; org switch clears downstream state | SATISFIED | `src/components/navigation/header.tsx` has no `PropertySelector`; `OrgSwitcher` + `CombinedSelector` present; `switchOrg` clears MANDATE_COOKIE and BUILDING_COOKIE |
| CTX-04 | 38-01, 38-02, 38-03 | BuildingContext scoped to current mandate; building list filtered by mandate; 'Alle' shows buildings across mandates within org | SATISFIED | `src/contexts/BuildingContext.tsx` consumes `useMandate()`; `src/components/navigation/CombinedSelector.tsx` groups properties by mandate and renders `mandate_id`-filtered building lists |

All 4 requirements (CTX-01 through CTX-04) are SATISFIED. No orphaned requirements found — all 4 are mapped to Phase 38 in REQUIREMENTS.md and all 4 appear in plan frontmatter.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/navigation/OrgSwitcher.tsx` | 18 | `return null` | INFO | Intentional design — single-org users should see nothing per D2 |
| `src/components/navigation/CombinedSelector.tsx` | 163 | `return null` | INFO | Intentional design — no properties = no selector to display |

No blockers. Both `return null` instances are explicit design requirements, not stubs.

**Additional observation:** `src/app/api/properties/route.ts` uses `ALLOWED_ROLES: ['kewa', 'imeri']` rather than calling `isInternalRole()`. This is a pre-existing pattern not introduced in Phase 38 — the mandate_id filter was correctly added alongside the existing role check. Not a gap for this phase.

---

### Human Verification Required

#### 1. Multi-Org Org Switcher

**Test:** Log in as a user that belongs to two organizations. Check the header area.
**Expected:** A blue pill badge showing the current org name appears left of the CombinedSelector. Clicking it opens a dropdown listing both orgs. Selecting the other org causes a full page reload and the new org's mandates/buildings appear.
**Why human:** Requires two organizations seeded in DB with the user in both via organization_members.

#### 2. Cookie Persistence Across Page Refresh

**Test:** Select a specific building in CombinedSelector, then refresh the page.
**Expected:** The CombinedSelector trigger button shows the same building after refresh (e.g., "Seefeld / Gebäude 1").
**Why human:** Cookie read/write behavior requires a live browser session.

#### 3. Org Switch Cookie Cascade

**Test:** Select a mandate and building, then switch organizations.
**Expected:** After full page reload, mandate and building selections revert to defaults (not the previous org's values). No stale cookies from previous org carry over.
**Why human:** Cookie cascade clear requires browser session; needs two orgs in DB.

#### 4. Single-Mandate Optimization (D3)

**Test:** Log in to an org that has exactly one mandate. Open the CombinedSelector dropdown.
**Expected:** No mandate header is shown. Dropdown starts with "Alle Liegenschaften" then lists properties and buildings directly without grouping.
**Why human:** Requires `isSingleMandate=true` which means exactly 1 active mandate in DB for the org.

---

### Gaps Summary

No gaps found. All 12 observable truths are verified. All 11 artifacts pass all three levels (exists, substantive, wired). All 13 key links are wired. All 4 requirements (CTX-01 through CTX-04) are satisfied with code evidence. No blocker anti-patterns found.

Phase 38 goal is fully achieved: users can view and switch between organizations and mandates (via OrgSwitcher + CombinedSelector), with all downstream data automatically scoped through the Organization > Mandate > Building context provider chain and cookie persistence.

---

_Verified: 2026-02-18_
_Verifier: Claude (gsd-verifier)_
