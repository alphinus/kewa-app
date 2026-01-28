---
phase: 20-supplier-advanced
plan: 02
subsystem: inventory-tracking
completed: 2026-01-28
duration: 17 min
tags: [api, ui, dashboard, inventory, alerts, consumption]

requires:
  - phase: 20
    plan: 01
    reason: "inventory_movements table, current_inventory_levels view, get_reorder_alerts function"
  - phase: 19
    plan: 03
    reason: "Deliveries table for inventory movement FK"

provides:
  - Inventory movement API routes with auto-calculated consumption metrics
  - Reorder alerts API with urgency classification
  - Inventory tracking UI components (form, level card, alert list)
  - Dashboard pages for inventory overview and property detail
  - Movement history with consumption rate display

affects:
  - phase: 20
    plan: 03
    reason: "Analytics pages will use inventory data for trend analysis"

tech-stack:
  patterns:
    - auto-calculation: "Consumption metrics calculated on movement creation"
    - color-coding: "Level percentage determines card/badge colors (green/amber/red)"
    - insufficient-data: "Displays 'Keine Verbrauchsdaten' when daily_usage_rate is null"

key-files:
  created:
    - src/lib/suppliers/inventory-queries.ts: "Helpers for previous reading lookup and consumption calculation"
    - src/lib/suppliers/alert-calculations.ts: "Reorder alert fetching and urgency utilities"
    - src/app/api/inventory-movements/route.ts: "GET (list) and POST (create) endpoints"
    - src/app/api/inventory-movements/[id]/route.ts: "GET, PATCH, DELETE for individual movements"
    - src/app/api/reorder-alerts/route.ts: "GET endpoint calling get_reorder_alerts RPC"
    - src/components/suppliers/InventoryMovementForm.tsx: "Form for recording tank readings"
    - src/components/suppliers/InventoryLevelCard.tsx: "Card showing level percentage and consumption"
    - src/components/suppliers/ReorderAlertList.tsx: "Alert list sorted by urgency"
    - src/app/dashboard/lieferanten/bestand/page.tsx: "Inventory overview with alerts and property grid"
    - src/app/dashboard/lieferanten/bestand/[propertyId]/page.tsx: "Property detail with movement history"
  modified:
    - src/components/suppliers/index.ts: "Added barrel exports for inventory components"

decisions:
  - decision: "Auto-calculate consumption on movement creation"
    rationale: "Ensures consistent calculation logic, no client-side math required"
    alternatives: "Client-side calculation (inconsistency risk)"
  - decision: "Delivery movements set consumption fields to null"
    rationale: "Deliveries add to tank, not consumption events"
    alternatives: "Calculate negative consumption for deliveries (confusing semantics)"
  - decision: "Color-coded level percentage thresholds"
    rationale: "Visual urgency indication: green >50%, amber 20-50%, red <20%"
    alternatives: "Single color for all levels"
  - decision: "Insufficient data message for missing usage rate"
    rationale: "Less than 2 readings cannot calculate consumption trend"
    alternatives: "Hide consumption fields (less transparent)"
---

# Phase 20 Plan 02: Inventory Tracking API and Dashboard Summary

**One-liner:** Inventory movement API with auto-calculated consumption, reorder alerts endpoint, and dashboard pages showing tank levels with color-coded urgency.

## What Was Built

Created complete inventory tracking system with API routes for movement CRUD, reorder alerts, and dashboard pages for monitoring pellet consumption across properties.

**API Routes:**
- `/api/inventory-movements` — GET (list with property filter) and POST (create with auto-calculated consumption)
- `/api/inventory-movements/[id]` — GET, PATCH (with recalculation), DELETE for individual movements
- `/api/reorder-alerts` — GET endpoint calling `get_reorder_alerts` RPC with urgency classification

**UI Components:**
- `InventoryMovementForm` — Form for recording tank readings with property selector, date, level, capacity, type
- `InventoryLevelCard` — Card showing current level, percentage (color-coded), daily usage rate, projected empty date
- `ReorderAlertList` — Alert list sorted by urgency (critical/warning/normal) with property details

**Dashboard Pages:**
- `/dashboard/lieferanten/bestand` — Overview page with reorder alerts and property grid
- `/dashboard/lieferanten/bestand/[propertyId]` — Property detail with current level and movement history table

**Helper Libraries:**
- `inventory-queries.ts` — Previous reading lookup, consumption calculation, current levels query
- `alert-calculations.ts` — Reorder alert fetching with property name join, urgency color/label utilities

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create inventory movement and reorder alert API routes | 205d4da | inventory-queries.ts, alert-calculations.ts, 3 API routes |
| 2 | Create inventory components and dashboard pages | 893fc67 | 3 components, 2 pages, index.ts |

## Technical Details

**Consumption calculation logic:**
- On movement creation, query previous reading before given date
- Calculate `days_since_last` (date diff), `consumption_amount` (level decrease), `daily_usage_rate` (amount / days)
- Delivery movements set consumption fields to null (deliveries add to tank, not consumption)
- Less than 2 readings results in null usage rate (insufficient data for trend)

**Reorder alert urgency:**
- Critical: `days_until_empty <= 7`
- Warning: `days_until_empty <= 14`
- Normal: `days_until_empty > 14`
- Alerts sorted by urgency first, then by days remaining

**Color coding:**
- Green (`>50%`): Healthy stock level
- Amber (`20-50%`): Monitor for upcoming order
- Red (`<20%`): Critical low level, immediate action needed

**Movement types:**
- `reading` — Manual tank reading (calculates consumption)
- `adjustment` — Correction reading (calculates consumption)
- `delivery` — Auto-created from delivery recording (no consumption calculation)

**API validation:**
- Property existence check before insert
- Building-property relationship validation if building_id provided
- Delivery type requires delivery_id
- Recalculation of consumption on PATCH if tank_level or movement_date changed

**UI features:**
- Inline form on overview page (can add reading without navigating away)
- Property detail pre-fills property in form
- "Keine Verbrauchsdaten" message when `daily_usage_rate` is null
- Movement history table shows consumption amount, daily rate, and notes
- Insufficient data warning on property detail when less than 2 readings

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **Auto-calculate consumption on movement creation**
   - Server-side calculation ensures consistency
   - No client-side math required
   - Alternative: Client-side calculation (risk of inconsistency)

2. **Delivery movements set consumption to null**
   - Deliveries add to tank, not consumption events
   - Prevents confusing negative consumption values
   - Alternative: Calculate negative consumption (semantically unclear)

3. **Color-coded level percentage thresholds**
   - Visual urgency: green >50%, amber 20-50%, red <20%
   - Matches alert urgency thresholds
   - Alternative: Single color for all levels (less informative)

4. **"Keine Verbrauchsdaten" for insufficient readings**
   - Transparent about why no usage rate shown
   - Less than 2 readings cannot establish trend
   - Alternative: Hide consumption fields (less user-friendly)

5. **Recalculate consumption on movement update**
   - If tank_level or movement_date changed, consumption metrics must update
   - Maintains data integrity
   - Alternative: Manual recalculation trigger (error-prone)

## Integration Points

**Upstream dependencies:**
- `inventory_movements` table (20-01) for movement storage
- `current_inventory_levels` view (20-01) for latest level per property
- `get_reorder_alerts` function (20-01) for alert query
- `properties` table for property_id FK and name join
- `deliveries` table (19-03) for delivery_id FK

**Downstream consumers:**
- Phase 20-03 will use movement data for price analytics and trend charts
- Delivery recording (19-03) creates inventory movements with `movement_type='delivery'`

**Component usage:**
- `InventoryMovementForm` used on both overview and property detail pages
- `InventoryLevelCard` linked to property detail page via property_id
- `ReorderAlertList` displays alerts on overview page

## Files Changed

**Created:**
- `src/lib/suppliers/inventory-queries.ts` (149 lines)
- `src/lib/suppliers/alert-calculations.ts` (90 lines)
- `src/app/api/inventory-movements/route.ts` (279 lines)
- `src/app/api/inventory-movements/[id]/route.ts` (223 lines)
- `src/app/api/reorder-alerts/route.ts` (64 lines)
- `src/components/suppliers/InventoryMovementForm.tsx` (258 lines)
- `src/components/suppliers/InventoryLevelCard.tsx` (164 lines)
- `src/components/suppliers/ReorderAlertList.tsx` (148 lines)
- `src/app/dashboard/lieferanten/bestand/page.tsx` (232 lines)
- `src/app/dashboard/lieferanten/bestand/[propertyId]/page.tsx` (365 lines)

**Modified:**
- `src/components/suppliers/index.ts` (+5 exports)

**Total:** 10 new files, 1 modified file, 1,972 lines added

## Verification

All verifications passed:
- ✓ `npx tsc --noEmit` passes (no type errors)
- ✓ All API routes export correct HTTP methods
- ✓ `grep` confirms supabase queries reference correct tables/views
- ✓ `grep` confirms RPC call to `get_reorder_alerts`
- ✓ `grep` confirms fetch calls in dashboard pages target correct API routes
- ✓ Components render without build errors

## Next Phase Readiness

**Ready for Phase 20-03:**
- Inventory data available via API for analytics queries
- Movement history supports price trend analysis
- Consumption patterns can be charted
- No blockers

**Phase 20-03 will build:**
- Price analytics API querying `delivery_price_history` view
- Seasonal consumption API querying `seasonal_consumption` view
- Purchase order allocation API with multi-property order splitting
- Price trend charts using recharts
- Seasonal consumption charts using recharts

## Metrics

- **Duration:** 17 minutes
- **Tasks completed:** 2/2
- **Commits:** 2
- **Files created:** 10
- **Files modified:** 1
- **Lines added:** 1,972
- **Deviations:** 0

---

*Phase 20-02 complete. Inventory tracking API and dashboard ready for user testing.*
