---
phase: 39-navigation-redesign
plan: "02"
subsystem: navigation
tags:
  - breadcrumbs
  - objekte
  - property-list
  - property-detail
  - client-components
dependency_graph:
  requires:
    - "Phase 38 MandateContext (availableMandates)"
    - "GET /api/properties"
    - "GET /api/properties/[id]"
    - "GET /api/buildings?property_id"
  provides:
    - "DashboardBreadcrumbs component for all dashboard pages"
    - "/dashboard/objekte property list page"
    - "/dashboard/objekte/[propertyId] property detail page"
  affects:
    - "src/components/navigation/DashboardBreadcrumbs.tsx"
    - "src/app/dashboard/objekte/page.tsx"
    - "src/app/dashboard/objekte/[propertyId]/page.tsx"
tech_stack:
  added: []
  patterns:
    - "Dashboard breadcrumbs with static segment label map + UUID override via labels prop"
    - "Property list grouped by mandate_id with single-mandate header suppression"
    - "Parallel fetch (property + buildings) with Promise.all in detail page"
    - "use(params) for async params in Next.js 15 app router"
key_files:
  created:
    - src/components/navigation/DashboardBreadcrumbs.tsx
    - src/app/dashboard/objekte/page.tsx
    - src/app/dashboard/objekte/[propertyId]/page.tsx
  modified: []
decisions:
  - "DashboardBreadcrumbs lives in navigation/ dir, separate from general-purpose ui/breadcrumbs.tsx"
  - "isSingleMandate derived from unique mandate_ids in fetched properties, not from availableMandates.length"
  - "unit_count displayed only when present in building objects (API-dependent) — safe fallback"
  - "Breadcrumb labels undefined until property loads, then set to { [propertyId]: property.name }"
metrics:
  duration: "4min"
  completed_date: "2026-02-18"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 39 Plan 02: Breadcrumbs and Objekte Route Hierarchy Summary

DashboardBreadcrumbs component and first two levels of the /objekte route hierarchy: property list grouped by mandate and property detail with building cards.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create DashboardBreadcrumbs component | 80dbef3 | src/components/navigation/DashboardBreadcrumbs.tsx |
| 2 | Create /objekte property list and property detail pages | ca3cbdd | src/app/dashboard/objekte/page.tsx, src/app/dashboard/objekte/[propertyId]/page.tsx |

## What Was Built

### DashboardBreadcrumbs (src/components/navigation/DashboardBreadcrumbs.tsx)

Purpose-built dashboard breadcrumb component per D3:

- Returns `null` on `/dashboard` (home page — no breadcrumbs)
- Always prepends "Übersicht" linking to `/dashboard`
- Static label map covers 14 known route segments with German labels
- `labels` prop accepts `Record<string, string>` for UUID overrides on drill-down pages
- ChevronRight (w-3.5 h-3.5) separators between items
- Last crumb is a non-clickable `<span>`, all others are `<Link>` elements
- Named export: `DashboardBreadcrumbs`

### /dashboard/objekte (src/app/dashboard/objekte/page.tsx)

Property list page per D4:

- Fetches `GET /api/properties` on mount
- Groups properties by `mandate_id` using `groupByMandate()` helper
- Single-mandate optimization: `isSingleMandate` derived from unique mandate_ids across fetched properties — hides mandate `<h2>` section headers when only 1 unique mandate
- Property cards navigate to `/dashboard/objekte/[propertyId]`
- Cards show: property name, address, building count (+ unit count when available in API response)
- Loading skeleton (animate-pulse), error state with retry button, empty state

### /dashboard/objekte/[propertyId] (src/app/dashboard/objekte/[propertyId]/page.tsx)

Property detail page (building list):

- `use(params)` to unwrap async params per Next.js 15 app router
- Fetches property info (`/api/properties/${propertyId}`) + buildings (`/api/buildings?property_id=${propertyId}`) in parallel via `Promise.all`
- Passes `labels={{ [propertyId]: property.name }}` to DashboardBreadcrumbs for UUID resolution
- Building cards navigate to `/dashboard/objekte/[propertyId]/[buildingId]`
- Unit count badge per building (from `BuildingWithUnitCount`)
- Loading skeleton, error with retry, empty state ("Keine Gebäude vorhanden")

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Safe unit_count handling on property list page**
- **Found during:** Task 2
- **Issue:** Plan states buildings from `/api/properties` have `unit_count`, but the actual API does `select('*')` on buildings with no unit join — `unit_count` is not present in the response
- **Fix:** `BuildingWithOptionalUnitCount` interface with `unit_count?: number`; unit count displayed only when at least one building has `unit_count` present; falls back to showing building count only
- **Files modified:** src/app/dashboard/objekte/page.tsx
- **Commit:** ca3cbdd (included in task commit)

## Verification Results

1. `npx tsc --noEmit` passes — no TypeScript errors
2. `DashboardBreadcrumbs.tsx` exists in `src/components/navigation/`
3. `/dashboard/objekte/page.tsx` fetches from `/api/properties` and groups by mandate_id
4. `/dashboard/objekte/[propertyId]/page.tsx` fetches buildings via `/api/buildings?property_id=${propertyId}`
5. Both pages render `DashboardBreadcrumbs`; property detail passes UUID label override

## Self-Check

Files created:
- [x] src/components/navigation/DashboardBreadcrumbs.tsx
- [x] src/app/dashboard/objekte/page.tsx
- [x] src/app/dashboard/objekte/[propertyId]/page.tsx

Commits:
- [x] 80dbef3 — feat(39-02): create DashboardBreadcrumbs component
- [x] ca3cbdd — feat(39-02): create /objekte property list and property detail pages

## Self-Check: PASSED
