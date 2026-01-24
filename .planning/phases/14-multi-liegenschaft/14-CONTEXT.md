# Phase 14: Multi-Liegenschaft — Context

## Existing Infrastructure

Significant infrastructure already exists from earlier phases:

**APIs:**
- `GET/POST /api/properties` — List and create properties
- `GET/POST /api/buildings` — List and create buildings (with property filter)

**UI:**
- `/dashboard/admin/properties` — Full CRUD for properties and buildings
- `PropertySelector` component — Dropdown in header (KEWA role only)
- `BuildingSelector` component — Used on Liegenschaft page
- Database tables: `properties`, `buildings` with FK relationship

**What's missing:**
- UPDATE/DELETE APIs for properties/buildings
- Data scoping across other pages (projects, tasks, costs)
- Unified context switching behavior

---

## Decisions

### 1. Property Context Scope

**Which pages filter by selected property:**

| Page | Behavior |
|------|----------|
| Main Dashboard (`/dashboard`) | Global overview with property/building badge on each item |
| Projects (`/projekte`) | Filtered by selected building |
| Tasks (`/aufgaben`) | Filtered by selected building |
| Costs (`/kosten/*`) | Filtered by selected building |
| Liegenschaft (`/liegenschaft`) | Filtered (already implemented via URL param) |
| Partner (`/partner`) | Global (partners aren't building-specific) |
| Admin Properties (`/admin/properties`) | Global (this IS the all-properties view) |

### 2. Selector Behavior

**Visibility:**
- KEWA role only sees the Property Selector
- Imeri sees only their assigned building (no selector)
- Other roles (contractors, tenants) don't see selector

**Switch action:**
- Hard navigation: switching property redirects to `/dashboard`
- URL does NOT carry building param (selector state is separate from URL)
- Page data refetches based on selected building

**Persistence:**
- NO persistence across sessions
- Each login starts fresh with default selection
- Default: first property, first building (alphabetically)

**Global view:**
- "Alle Liegenschaften" option in selector dropdown
- When selected: pages show unfiltered data across all properties
- Items display their property/building context

### 3. No-Property State

**Empty state handling:**
- If no properties exist: show setup prompt with "Create first Liegenschaft" button
- Links to `/admin/properties` to create first property
- Dashboard is blocked until at least one property with one building exists

**Default selection:**
- Auto-select first property, first building (alphabetical)
- If user selects building that no longer exists: fall back to first available

---

## Implementation Notes

### Context Mechanism

Use a combination approach:
1. Server Components: Pass `buildingId` from cookie/header or fetch in component
2. Client Components: Read from context or prop drilling from layout
3. API calls: Include `?building_id=` query param where needed

### Data Model

Projects, Tasks, WorkOrders link to buildings via:
- `projects.building_id` (may need to add if missing)
- `tasks` → `projects` → `buildings`
- `work_orders` → `tasks` → `projects` → `buildings`

Costs link via:
- `expenses.project_id` → `projects.building_id`
- `invoices.work_order_id` → `work_orders` → chain to building

### API Changes Needed

1. Add `PATCH /api/properties/[id]` — Update property
2. Add `DELETE /api/properties/[id]` — Delete property (with cascade warning)
3. Add `PATCH /api/buildings/[id]` — Update building
4. Add `DELETE /api/buildings/[id]` — Delete building (with cascade warning)
5. Update list APIs to accept `building_id` filter where needed

---

## Out of Scope (Deferred)

- Imeri role getting their own building assignment UI
- Property-level permissions (all KEWA users see all properties)
- Building-to-building data transfer

---

*Created: 2026-01-24*
*Phase: 14 - Multi-Liegenschaft*
