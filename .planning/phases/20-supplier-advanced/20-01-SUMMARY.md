---
phase: 20-supplier-advanced
plan: 01
subsystem: inventory-tracking
completed: 2026-01-28
duration: 5 min
tags: [database, migrations, analytics, types, recharts]

requires:
  - phase: 19
    plan: 01
    reason: "purchase_orders and deliveries tables"

provides:
  - inventory_movements table with level tracking and usage rate calculation
  - purchase_order_allocations table with validation trigger
  - current_inventory_levels view with stock-out projection
  - delivery_price_history view with unit price calculation
  - seasonal_consumption view for monthly aggregates
  - get_reorder_alerts function with urgency classification
  - TypeScript types for all inventory and allocation entities
  - recharts charting library

affects:
  - phase: 20
    plan: 02
    reason: "API and UI depend on these tables, views, and types"
  - phase: 20
    plan: 03
    reason: "Price analytics and allocations depend on these schemas"

tech-stack:
  added:
    - recharts: "Chart library for price trends and consumption graphs"
  patterns:
    - views: "DISTINCT ON for current state per entity (current_inventory_levels)"
    - analytics: "Aggregated views for reporting (seasonal_consumption, delivery_price_history)"
    - validation-triggers: "Allocation totals validation before insert/update"
    - computed-columns: "level_percentage, days_until_empty calculated in database"

key-files:
  created:
    - supabase/migrations/054_inventory_movements.sql: "Inventory tracking table with tank levels and consumption"
    - supabase/migrations/055_purchase_order_allocations.sql: "Multi-property PO allocation with validation"
    - supabase/migrations/056_inventory_views_functions.sql: "Analytics views and reorder alert function"
  modified:
    - src/types/suppliers.ts: "Added Phase 20 inventory tracking and allocation types"
    - package.json: "Added recharts dependency"

decisions:
  - decision: "inventory_movements as append-only log"
    rationale: "Enables historical trend analysis and consumption tracking over time"
    alternatives: "Single current_level row per property"
  - decision: "Validation trigger on purchase_order_allocations"
    rationale: "Prevents over-allocation at database level before API validation"
    alternatives: "API-only validation (weaker guarantee)"
  - decision: "Computed level_percentage column"
    rationale: "Database calculates percentage for consistent logic across queries"
    alternatives: "Client-side or API calculation (inconsistency risk)"
  - decision: "get_reorder_alerts returns urgency classification"
    rationale: "Single function provides alerts with context, reducing API complexity"
    alternatives: "Separate queries for critical/warning/normal"
  - decision: "recharts over Chart.js/Recharts alternatives"
    rationale: "React-first API, good documentation, smaller bundle than Chart.js"
    alternatives: "Chart.js, Victory"
---

# Phase 20 Plan 01: Inventory Schema and Analytics Foundation Summary

**One-liner:** Database schema for inventory movements, multi-property allocations, analytics views (price history, seasonal consumption, reorder alerts), extended types, and recharts installed.

## What Was Built

Created foundational database layer for Phase 20 Supplier Advanced features with three migration files, analytics views/functions, extended TypeScript types, and installed charting library.

**Database schema:**
- `inventory_movements` table tracks tank levels, consumption amounts, and daily usage rates
- `purchase_order_allocations` table splits multi-property orders with validation trigger
- `current_inventory_levels` view returns latest level per property with projected empty date
- `delivery_price_history` view calculates unit price (CHF/tonne) for each delivery
- `seasonal_consumption` view aggregates monthly consumption and pricing
- `get_reorder_alerts` function returns properties below threshold with urgency classification

**TypeScript types:**
- InventoryMovement, CreateInventoryMovementInput
- PurchaseOrderAllocation, CreateAllocationInput
- CurrentInventoryLevel, ReorderAlert
- PriceHistoryPoint, SeasonalConsumption
- API response types for all new entities

**Dependencies:**
- recharts (v3.7.0) for price trend charts and consumption graphs

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create inventory_movements and purchase_order_allocations tables | 606ba15 | 054_inventory_movements.sql, 055_purchase_order_allocations.sql |
| 2 | Create analytics views, extend types, install recharts | 8b21ce3 | 056_inventory_views_functions.sql, src/types/suppliers.ts, package.json |

## Technical Details

**inventory_movements table:**
- Tracks delivery, reading, and adjustment movement types
- Stores tank_level, tank_capacity, consumption_amount, daily_usage_rate
- Computed level_percentage column: (tank_level / tank_capacity) * 100
- Constraint: delivery type requires delivery_id
- Indexes: property_id, movement_date DESC, delivery_id

**purchase_order_allocations table:**
- Splits POs across multiple properties with allocated_quantity and allocated_amount
- Validation trigger prevents SUM(allocated_amount) exceeding purchase_orders.total_amount
- Links to deliveries when delivered=true
- Indexes: purchase_order_id, property_id

**Analytics views:**
- `current_inventory_levels`: DISTINCT ON (property_id) for latest reading with projected_empty_date
- `delivery_price_history`: Joins deliveries and purchase_orders to calculate unit_price
- `seasonal_consumption`: GROUP BY property_id, year, month for aggregates

**Reorder alerts function:**
- Accepts threshold_pct parameter (default 25%)
- Returns properties with level_percentage <= threshold
- Urgency: 'critical' if days_until_empty <= 7, 'warning' if <= 14, else 'normal'
- Orders by days_until_empty ASC NULLS LAST

**Type coverage:**
- All database entities have matching TypeScript interfaces
- Create input types for API endpoints
- View types match query shapes
- API response types wrap entities with pagination metadata

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **inventory_movements as append-only log**
   - Enables historical trend analysis
   - Supports consumption tracking over time
   - Alternative: Single current_level row per property (loses history)

2. **Validation trigger on purchase_order_allocations**
   - Database-level guarantee prevents over-allocation
   - Raises exception before data written
   - Alternative: API-only validation (weaker consistency)

3. **Computed level_percentage column**
   - Database calculates for all queries consistently
   - GENERATED ALWAYS AS STORED
   - Alternative: Client-side calculation (inconsistency risk)

4. **get_reorder_alerts function returns urgency**
   - Single query provides alerts with context
   - Reduces API complexity (no multiple queries)
   - Alternative: Separate queries for critical/warning/normal

5. **recharts over Chart.js**
   - React-first API (JSX components)
   - Good TypeScript support
   - Smaller bundle than Chart.js
   - Alternative: Victory, Chart.js

## Integration Points

**Upstream dependencies:**
- `purchase_orders` table (19-01) for allocations FK
- `deliveries` table (19-01) for inventory_movements FK and price history JOIN
- `properties` table for property_id FK across all tables

**Downstream consumers (Phase 20-02, 20-03):**
- Inventory API will query current_inventory_levels view
- Reorder alerts API will call get_reorder_alerts function
- Price analytics will query delivery_price_history view
- Seasonal charts will use seasonal_consumption view
- Multi-property order flow will create purchase_order_allocations rows

**Type exports:**
- API routes will import InventoryMovement, PurchaseOrderAllocation types
- UI components will use ReorderAlert, PriceHistoryPoint shapes
- Forms will use CreateInventoryMovementInput, CreateAllocationInput

## Files Changed

**Created:**
- `supabase/migrations/054_inventory_movements.sql` (95 lines)
- `supabase/migrations/055_purchase_order_allocations.sql` (102 lines)
- `supabase/migrations/056_inventory_views_functions.sql` (103 lines)

**Modified:**
- `src/types/suppliers.ts` (+186 lines for Phase 20 types)
- `package.json` (+1 dependency: recharts)
- `package-lock.json` (+36 packages)

**Total:** 3 new files, 2 modified files, 486 lines added

## Verification

All verifications passed:
- ✓ Migration files parse valid SQL syntax
- ✓ `npx tsc --noEmit` passes (no type errors)
- ✓ `grep -c "InventoryMovement" src/types/suppliers.ts` returns 7
- ✓ `grep -c "PurchaseOrderAllocation" src/types/suppliers.ts` returns 2
- ✓ `grep -c "ReorderAlert" src/types/suppliers.ts` returns 3
- ✓ `grep "recharts" package.json` shows recharts in dependencies

## Next Phase Readiness

**Ready for Phase 20-02:**
- All tables, views, and functions exist for API implementation
- TypeScript types match database schema
- Recharts available for chart components
- No blockers

**Phase 20-02 will build:**
- GET /api/inventory/movements — list movements with property join
- POST /api/inventory/movements — create reading/adjustment
- GET /api/inventory/levels — query current_inventory_levels view
- GET /api/inventory/alerts — call get_reorder_alerts function
- Inventory tracking UI and reorder alerts dashboard

**Phase 20-03 will build:**
- GET /api/analytics/price-history — query delivery_price_history
- GET /api/analytics/seasonal — query seasonal_consumption
- POST /api/purchase-orders/:id/allocations — create allocations
- Price trend charts using recharts
- Seasonal consumption charts using recharts
- Multi-property order allocation UI

## Metrics

- **Duration:** 5 minutes
- **Tasks completed:** 2/2
- **Commits:** 2
- **Files created:** 3
- **Files modified:** 2
- **Lines added:** 486
- **Deviations:** 0

---

*Phase 20-01 complete. Foundation layer ready for API and UI implementation.*
