---
phase: 39-navigation-redesign
plan: "03"
subsystem: navigation
tags:
  - objekte
  - building-detail
  - unit-detail
  - room-detail
  - heatmap
  - drill-down
  - client-components
dependency_graph:
  requires:
    - "Phase 39-02: DashboardBreadcrumbs + /objekte property list + property detail"
    - "GET /api/buildings/[id]"
    - "GET /api/buildings/[id]/heatmap"
    - "GET /api/units?building_id"
    - "GET /api/units/[id]"
    - "GET /api/rooms?unit_id"
    - "GET /api/rooms/[id]"
    - "GET /api/properties/[id]"
  provides:
    - "/dashboard/objekte/[propertyId]/[buildingId] building detail page (D5)"
    - "/dashboard/objekte/[propertyId]/[buildingId]/[unitId] unit detail page (D6)"
    - "/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId] room detail page"
  affects:
    - "src/app/dashboard/objekte/[propertyId]/[buildingId]/page.tsx"
    - "src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/page.tsx"
    - "src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId]/page.tsx"
tech_stack:
  added: []
  patterns:
    - "Tabbed UI: state-based tabs (heatmap/einheiten/info), no URL query param"
    - "Heatmap grid reused from liegenschaft/page.tsx (FLOOR_CONFIG, POSITION_ORDER, UnitCell, EmptyCell)"
    - "HeatmapUnit imported from @/lib/dashboard/heatmap-queries (type reuse, avoids duplication)"
    - "Client-side calculateConditionSummary from rooms array (mirrors einheiten/[id]/page.tsx)"
    - "Parallel fetch via Promise.all for building+property+heatmap+units"
    - "use(params) for async params in Next.js 15 app router throughout"
key_files:
  created:
    - src/app/dashboard/objekte/[propertyId]/[buildingId]/page.tsx
    - src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/page.tsx
    - src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId]/page.tsx
  modified: []
decisions:
  - "HeatmapUnit type imported from @/lib/dashboard/heatmap-queries instead of redefining locally — required for UnitDetailPanel type compatibility"
  - "getConditionColor helper removed (unused — UnitCell uses inline conditionColors map)"
  - "building.property_id (string|null) coerced to undefined with ?? for DeliveryList propertyId?: string"
metrics:
  duration: "15min"
  completed_date: "2026-02-18"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 39 Plan 03: Building / Unit / Room Drill-Down Pages Summary

Three new pages completing the full /objekte drill-down hierarchy: building detail with tabs (D5), unit detail with condition summary and room cards (D6), and room detail with condition and action links.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create building detail page with tabs (D5) | 0c26fbd | src/app/dashboard/objekte/[propertyId]/[buildingId]/page.tsx |
| 2 | Create unit detail and room detail pages (D6) | 98443ae | src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/page.tsx, src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId]/page.tsx |

## What Was Built

### Building Detail Page (D5) — src/app/dashboard/objekte/[propertyId]/[buildingId]/page.tsx

URL-driven building detail page with 3 tabs:

- `use(params)` to unwrap async `{ propertyId, buildingId }` — NO BuildingContext
- Fetches building, property, heatmap, and units in parallel via `Promise.all`
- `DashboardBreadcrumbs` with `labels={{ [propertyId]: property.name, [buildingId]: building.name }}`

**Heatmap tab:**
- FLOOR_CONFIG + POSITION_ORDER copied from `liegenschaft/page.tsx`
- `UnitCell` and `EmptyCell` sub-components
- Summary stats (unit count, avg renovation %, total rooms, renovated rooms)
- `UnitDetailPanel` for clicked unit detail (slide-in panel)
- `HeatmapUnit` type imported from `@/lib/dashboard/heatmap-queries` for type compatibility

**Einheiten tab:**
- `UnitList` component with units filtered to `apartment | common_area` (no parking)
- `onView` navigates to `/dashboard/objekte/[propertyId]/[buildingId]/[unitId]`
- `UnitForm` modal for create/edit

**Info tab:**
- Building name, address, property link, created/updated dates
- `DeliveryList` for delivery history (filtered by `property_id`)

### Unit Detail Page (D6) — src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/page.tsx

- `use(params)` to unwrap `{ propertyId, buildingId, unitId }` — no BuildingContext
- Fetches unit, rooms, property, building in parallel
- Header card: unit name, unit_type badge, floor label, position, tenant name
- Condition summary: `calculateConditionSummary()` computed client-side from rooms array (mirrors logic in `einheiten/[id]/page.tsx`) — `ConditionBadge`, renovation %, room count grid, colored progress bar
- Room cards grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`): each card links to room detail page, shows room name, type label, `ConditionBadge`, condition_updated_at
- "Raum hinzufügen" button opens `RoomForm` modal

### Room Detail Page — src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId]/page.tsx

- `use(params)` to unwrap `{ propertyId, buildingId, unitId, roomId }`
- Fetches room (with `condition_source_project`), property, building in parallel
- Breadcrumbs: uses `room.unit.name` for unitId label override
- Room condition card: colored badge (Neu/Teilsaniert/Unsaniert), condition_updated_at, source project link
- Action links card: "Aufgaben anzeigen" → `/dashboard/aufgaben?room_id=`, "Abnahmen anzeigen" → `/dashboard/abnahmen?room_id=`, conditional "Quellprojekt öffnen" link

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HeatmapUnit type reuse to avoid UnitDetailPanel incompatibility**
- **Found during:** Task 1
- **Issue:** Plan instructed copying `HeatmapUnit` interface inline, but `UnitDetailPanel` imports `HeatmapUnit` from `@/lib/dashboard/heatmap-queries`. Defining a local duplicate would cause a TypeScript structural type mismatch.
- **Fix:** Import `HeatmapUnit` from `@/lib/dashboard/heatmap-queries` instead of redefining it locally
- **Files modified:** src/app/dashboard/objekte/[propertyId]/[buildingId]/page.tsx
- **Commit:** 0c26fbd

**2. [Rule 1 - Bug] `building.property_id` null coercion for DeliveryList**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** `Building.property_id` is `string | null` but `DeliveryList.propertyId` is `string | undefined` — direct assignment causes TS error
- **Fix:** `building.property_id ?? undefined` converts null to undefined
- **Files modified:** src/app/dashboard/objekte/[propertyId]/[buildingId]/page.tsx
- **Commit:** 0c26fbd

## Verification Results

1. `npx tsc --noEmit` passes — no TypeScript errors
2. All three page files exist at correct nested paths
3. Building detail has 3-tab layout (`activeTab` state: heatmap/einheiten/info)
4. Unit detail has room cards linking to `/raum/[roomId]` drill-down
5. Room detail has condition card + action links
6. All pages use `DashboardBreadcrumbs` with `labels` UUID overrides
7. No page uses `useBuilding()` — grep confirms zero matches in `/dashboard/objekte/**`

## Self-Check

Files created:
- [x] src/app/dashboard/objekte/[propertyId]/[buildingId]/page.tsx
- [x] src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/page.tsx
- [x] src/app/dashboard/objekte/[propertyId]/[buildingId]/[unitId]/raum/[roomId]/page.tsx

Commits:
- [x] 0c26fbd — feat(39-03): create building detail page with Heatmap/Einheiten/Info tabs (D5)
- [x] 98443ae — feat(39-03): create unit detail and room detail pages (D6)

## Self-Check: PASSED
