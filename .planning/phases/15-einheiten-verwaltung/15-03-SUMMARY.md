---
phase: 15
plan: 03
subsystem: units
tags: [ui, crud, building-context, forms]

dependency_graph:
  requires:
    - phase: 14
      reason: "BuildingContext for building-scoped filtering"
    - phase: 15-01
      reason: "Unit API endpoints for CRUD operations"
  provides:
    - unit-list-page
    - unit-create-edit-form
    - unit-card-component
  affects:
    - phase: 15-04
      reason: "Room UI will follow same patterns"

tech_stack:
  added: []
  patterns:
    - "Building-scoped data fetching with useBuilding hook"
    - "Modal form pattern following PartnerForm"
    - "Grid list with card components"

file_tracking:
  key_files:
    created:
      - src/app/dashboard/einheiten/page.tsx
      - src/components/units/UnitForm.tsx
      - src/components/units/UnitList.tsx
      - src/components/units/UnitCard.tsx
    modified: []

decisions:
  - id: 15-03-01
    decision: "Unit list filters to apartments and common areas only"
    rationale: "Parking spots shown in separate section on liegenschaft page"
  - id: 15-03-02
    decision: "View button navigates to existing wohnungen/[id] detail page"
    rationale: "Reuse existing unit detail page rather than creating new one"
  - id: 15-03-03
    decision: "Vacancy auto-derived when no tenant name, with manual override"
    rationale: "Matches CONTEXT.md vacancy logic requirements"

metrics:
  duration: "10 min"
  completed: "2026-01-24"
---

# Phase 15 Plan 03: Unit Management UI Summary

Unit list page at /dashboard/einheiten with create/edit forms using BuildingContext.

## What Was Built

### UnitCard Component (src/components/units/UnitCard.tsx)
- Displays unit number or name as title
- Shows size class badge (3.5-Zi., etc.)
- Floor label using getFloorLabel helper (EG, 1.OG, UG, DG)
- Tenant name or amber "Leerstand" badge when vacant
- Room count display
- View and Edit action buttons

### UnitList Component (src/components/units/UnitList.tsx)
- Responsive grid layout (1/2/3 columns for mobile/tablet/desktop)
- Maps units array to UnitCard components
- Empty state with icon and helpful message

### UnitForm Component (src/components/units/UnitForm.tsx)
- Modal form following PartnerForm pattern exactly
- Unit fields section: name, number, floor dropdown, size class dropdown, unit type radio
- Tenant section: vacancy toggle, name, phone, email, move-in date
- Conditional tenant fields shown only when not vacant
- Email validation when provided
- POST to /api/units for create, PATCH to /api/units/:id for edit

### Einheiten Page (src/app/dashboard/einheiten/page.tsx)
- Building-scoped using useBuilding hook
- Shows prompt when 'all' or no building selected
- Fetches units filtered by building_id
- Filters to apartments and common areas (excludes parking)
- Loading skeleton during data fetch
- Error state with retry button
- Create button opens empty form
- Edit button on card opens populated form
- View button navigates to /dashboard/wohnungen/[id]

## Key Links Verified

| From | To | Via | Pattern |
|------|-----|-----|---------|
| einheiten/page.tsx | BuildingContext | useBuilding hook | useBuilding() |
| UnitForm.tsx | /api/units | fetch POST/PATCH | /api/units |

## Decisions Made

1. **Unit list excludes parking spots** - Parking shown separately on liegenschaft heatmap page
2. **View reuses existing detail page** - Navigate to /dashboard/wohnungen/[id] instead of creating new detail page
3. **Vacancy auto-derived with override** - is_vacant computed from tenant presence but user can toggle

## Deviations from Plan

None - plan executed exactly as written.

## Files Created

- `src/app/dashboard/einheiten/page.tsx` (261 lines)
- `src/components/units/UnitForm.tsx` (378 lines)
- `src/components/units/UnitList.tsx` (59 lines)
- `src/components/units/UnitCard.tsx` (136 lines)

## Commits

| Hash | Message |
|------|---------|
| 9873015 | feat(15-03): create UnitCard and UnitList components |
| f61b276 | feat(15-03): create UnitForm component for unit create/edit |
| e3cf52c | feat(15-03): create einheiten page with building context |

## Next Phase Readiness

Ready for 15-04 (Room UI) - patterns established:
- Building-scoped data fetching pattern
- Modal form pattern
- Card/list component pattern
- All unit CRUD operations functional
