---
phase: 39-navigation-redesign
plan: "04"
subsystem: navigation
tags:
  - redirects
  - url-migration
  - objekte
  - next-config
  - client-redirect
dependency_graph:
  requires:
    - "Phase 39-03: /objekte drill-down hierarchy (building/unit/room detail)"
    - "GET /api/buildings/[id]"
    - "GET /api/units/[id]"
  provides:
    - "HTTP 308 redirects: /liegenschaft, /gebaude, /einheiten → /objekte"
    - "Client redirect stubs: liegenschaft/[id], einheiten/[id], wohnungen/[id], liegenschaft/[id]/einheit/[unitId]/raum/[roomId]"
    - "All internal links updated to /objekte paths"
  affects:
    - next.config.ts
    - src/app/dashboard/liegenschaft/page.tsx
    - src/app/dashboard/liegenschaft/[id]/page.tsx
    - src/app/dashboard/gebaude/page.tsx
    - src/app/dashboard/einheiten/page.tsx
    - src/app/dashboard/einheiten/[id]/page.tsx
    - src/app/dashboard/wohnungen/[id]/page.tsx
    - src/app/dashboard/liegenschaft/[id]/einheit/[unitId]/raum/[roomId]/page.tsx
    - src/app/dashboard/projekte/[id]/page.tsx
    - src/components/dashboard/BuildingSelector.tsx
    - src/components/ui/breadcrumbs.tsx
    - src/components/ui/empty-state.tsx
tech_stack:
  added: []
  patterns:
    - "next.config.ts redirects(): permanent HTTP 308 for static route aliases"
    - "Client redirect stub: useEffect fetch chain to resolve IDs before router.replace()"
    - "Server redirect stub: next/navigation redirect() for list pages (fallback to config redirect)"
    - "projekte detail page: extend Supabase query with building(property_id) join to build full /objekte path"
key_files:
  created: []
  modified:
    - next.config.ts
    - src/app/dashboard/liegenschaft/page.tsx
    - src/app/dashboard/liegenschaft/[id]/page.tsx
    - src/app/dashboard/gebaude/page.tsx
    - src/app/dashboard/einheiten/page.tsx
    - src/app/dashboard/einheiten/[id]/page.tsx
    - src/app/dashboard/wohnungen/[id]/page.tsx
    - src/app/dashboard/liegenschaft/[id]/einheit/[unitId]/raum/[roomId]/page.tsx
    - src/app/dashboard/projekte/[id]/page.tsx
    - src/components/dashboard/BuildingSelector.tsx
    - src/components/ui/breadcrumbs.tsx
    - src/components/ui/empty-state.tsx
decisions:
  - "projekte/[id] query extended with building(property_id) join — avoids client-side fallback, builds full /objekte path server-side"
  - "BuildingSelector legacy component updated to push /dashboard/objekte (was /liegenschaft?building=) — CombinedSelector from Phase 38 handles building context now"
  - "Server redirect stubs kept as fallback even though next.config.ts handles the same routes — defense in depth"
metrics:
  duration: "4min"
  completed_date: "2026-02-18"
  tasks_completed: 2
  files_created: 0
  files_modified: 12
---

# Phase 39 Plan 04: URL Redirects and Internal Link Migration Summary

HTTP 308 redirects for old static routes, client redirect stubs for ID-parameterized old routes that resolve building/property context, and all internal links migrated to /objekte paths.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add next.config.ts redirects and client redirect stubs | 67da586 | next.config.ts, liegenschaft/page.tsx, liegenschaft/[id]/page.tsx, gebaude/page.tsx, einheiten/page.tsx, einheiten/[id]/page.tsx, wohnungen/[id]/page.tsx, liegenschaft/[id]/einheit/[unitId]/raum/[roomId]/page.tsx |
| 2 | Update all internal links to use /objekte paths (D8) | c9ae9e8 | projekte/[id]/page.tsx, BuildingSelector.tsx, breadcrumbs.tsx, empty-state.tsx |

## What Was Built

### Static Redirects (next.config.ts)

Three permanent HTTP 308 redirects added via `async redirects()`:
- `/dashboard/liegenschaft` → `/dashboard/objekte`
- `/dashboard/gebaude` → `/dashboard/objekte`
- `/dashboard/einheiten` → `/dashboard/objekte`

### Server Redirect Stubs (fallback for list pages)

`liegenschaft/page.tsx`, `gebaude/page.tsx`, `einheiten/page.tsx` replaced with minimal server components calling `redirect('/dashboard/objekte')` from `next/navigation`. These serve as fallback if the config redirect doesn't fire (edge case).

### Client Redirect Stubs (ID-parameterized routes)

Four pages replaced with client components that resolve IDs to the full /objekte path:

**`liegenschaft/[id]/page.tsx`** (building ID → property):
- Fetch `GET /api/buildings/${id}` → extract `building.property_id`
- `router.replace(/dashboard/objekte/${propertyId}/${id})`

**`einheiten/[id]/page.tsx`** (unit ID → building → property):
- Fetch `GET /api/units/${id}` → `unit.building_id`
- Fetch `GET /api/buildings/${buildingId}` → `building.property_id`
- `router.replace(/dashboard/objekte/${propertyId}/${buildingId}/${id})`

**`wohnungen/[id]/page.tsx`** (identical logic to einheiten/[id]):
- Same two-step resolution: unit → building → property
- `router.replace(/dashboard/objekte/${propertyId}/${buildingId}/${id})`

**`liegenschaft/[id]/einheit/[unitId]/raum/[roomId]/page.tsx`** (building ID → property):
- Fetch `GET /api/buildings/${buildingId}` → `building.property_id`
- `router.replace(/dashboard/objekte/${propertyId}/${buildingId}/${unitId}/raum/${roomId})`

All stubs show "Weiterleitung..." loading text. On any error, fallback to `/dashboard/objekte`.

### Internal Link Updates (D8)

- **`BuildingSelector.tsx`**: `router.push('/dashboard/objekte')` — was `/dashboard/liegenschaft?building=${buildingId}`. Legacy component; CombinedSelector from Phase 38 is the current selection UI.
- **`projekte/[id]/page.tsx`**: Extended Supabase query with `building:buildings(id, property_id)` join on units. Unit link now builds `/dashboard/objekte/${property_id}/${building_id}/${unit_id}` when context is available, falls back to `/dashboard/objekte`.
- **`breadcrumbs.tsx`**: Updated JSDoc example hrefs from `/liegenschaft` to `/objekte`.
- **`empty-state.tsx`**: Updated JSDoc example href from `/liegenschaften/neu` to `/objekte`.

## Deviations from Plan

None — plan executed exactly as written. The projekte/[id] query extension was explicitly specified in the plan as the preferred approach when building/property context is unavailable.

## Verification Results

1. `npx tsc --noEmit` passes — no TypeScript errors
2. `next.config.ts` has `async redirects()` with 3 entries (liegenschaft, gebaude, einheiten → objekte)
3. `liegenschaft/[id]`, `einheiten/[id]`, `wohnungen/[id]` are client redirect stubs with `router.replace`
4. `liegenschaft/[id]/einheit/[unitId]/raum/[roomId]` is a client redirect stub
5. Grep confirms zero `/dashboard/liegenschaft|gebaude|einheiten|wohnungen` references across all src/ .tsx/.ts files (including non-redirect files)
6. All client stubs handle error with fallback to `/dashboard/objekte`

## Self-Check

Files modified (all exist and contain correct content):
- [x] next.config.ts — has `async redirects()` with 3 entries
- [x] src/app/dashboard/liegenschaft/page.tsx — server redirect stub
- [x] src/app/dashboard/liegenschaft/[id]/page.tsx — client redirect (building → property)
- [x] src/app/dashboard/gebaude/page.tsx — server redirect stub
- [x] src/app/dashboard/einheiten/page.tsx — server redirect stub
- [x] src/app/dashboard/einheiten/[id]/page.tsx — client redirect (unit → building → property)
- [x] src/app/dashboard/wohnungen/[id]/page.tsx — client redirect (unit → building → property)
- [x] src/app/dashboard/liegenschaft/[id]/einheit/[unitId]/raum/[roomId]/page.tsx — client redirect
- [x] src/app/dashboard/projekte/[id]/page.tsx — updated unit query + /objekte link
- [x] src/components/dashboard/BuildingSelector.tsx — push to /objekte
- [x] src/components/ui/breadcrumbs.tsx — JSDoc example updated
- [x] src/components/ui/empty-state.tsx — JSDoc example updated

Commits:
- [x] 67da586 — feat(39-04): add next.config.ts redirects and client redirect stubs for old routes
- [x] c9ae9e8 — feat(39-04): update all internal links to use /objekte paths (D8)

## Self-Check: PASSED
