---
phase: 20-supplier-advanced
plan: 03
subsystem: analytics-allocations
completed: 2026-01-28
duration: 25 min
tags: [analytics, charts, recharts, allocations, multi-property, shadcn-ui]

requires:
  - phase: 20
    plan: 01
    reason: "delivery_price_history, seasonal_consumption views, purchase_order_allocations table"
  - phase: 19
    plan: 01
    reason: "purchase_orders and deliveries tables for analytics joins"

provides:
  - Price history analytics API with supplier/property/date filtering
  - Seasonal consumption analytics API with property filtering
  - Multi-property purchase order allocation API with validation
  - PriceHistoryChart component (Recharts LineChart with CHF formatting)
  - ConsumptionPatternChart component (Recharts AreaChart with gradient)
  - MultiPropertyOrderForm component with client-side validation
  - Analytics dashboard pages for price trends and consumption patterns
  - Missing shadcn/ui components (CardTitle, CardDescription, Label, Select, Alert)

affects:
  - phase: 20
    plan: 02
    reason: "Shares same supplier analytics foundation"

tech-stack:
  added:
    - "@radix-ui/react-select": "Headless select component for dropdowns"
    - "class-variance-authority": "CSS variant utilities for components"
  patterns:
    - recharts-charts: "LineChart for price trends, AreaChart for consumption"
    - german-month-names: "Utility function for localizing month labels"
    - allocation-validation: "Client + server validation prevents over-allocation"
    - shadcn-ui-components: "Label, Select, Alert components following shadcn/ui patterns"

key-files:
  created:
    - src/lib/suppliers/analytics-queries.ts: "Query functions for price history, consumption, allocations"
    - src/app/api/suppliers/analytics/price-history/route.ts: "GET endpoint for delivery price trends"
    - src/app/api/suppliers/analytics/consumption/route.ts: "GET endpoint for seasonal consumption"
    - src/app/api/purchase-orders/[id]/allocations/route.ts: "GET/POST endpoints for PO allocations"
    - src/components/suppliers/PriceHistoryChart.tsx: "Recharts LineChart for price over time"
    - src/components/suppliers/ConsumptionPatternChart.tsx: "Recharts AreaChart for seasonal patterns"
    - src/components/suppliers/MultiPropertyOrderForm.tsx: "Form for allocating PO across properties"
    - src/app/dashboard/lieferanten/analytics/preise/page.tsx: "Price development dashboard page"
    - src/app/dashboard/lieferanten/analytics/verbrauch/page.tsx: "Seasonal consumption dashboard page"
    - src/components/ui/label.tsx: "Form label component"
    - src/components/ui/select.tsx: "Radix UI select dropdown component"
    - src/components/ui/alert.tsx: "Alert component with variants"
  modified:
    - src/components/suppliers/index.ts: "Export new chart and form components"
    - src/components/ui/card.tsx: "Added CardTitle and CardDescription exports"
    - package.json: "Added @radix-ui/react-select and class-variance-authority"

decisions:
  - decision: "Enrich API responses with joined names (supplier, property) in API layer"
    rationale: "Views don't include names, so API enriches to avoid client-side joins"
    alternatives: "Extend views to include names (more complex view definitions)"
  - decision: "Auto-calculate allocated_amount from quantity * unit_price in form"
    rationale: "Reduces user error, ensures consistency with PO unit price"
    alternatives: "Manual amount entry (prone to calculation errors)"
  - decision: "Client-side validation + server-side DB trigger for allocation totals"
    rationale: "Defense in depth: prevent UI submission and DB-level guarantee"
    alternatives: "Server-only validation (worse UX, delayed feedback)"
  - decision: "German month names via getMonthName() utility function"
    rationale: "Simple object lookup for consistent localization"
    alternatives: "Intl.DateTimeFormat (heavier, not needed for just month names)"
  - decision: "Create missing shadcn/ui components (Label, Select, Alert) during execution"
    rationale: "Plan assumed components existed, adding them unblocks progress (Rule 2: Missing Critical)"
    alternatives: "Error and require user to add components (blocks task completion)"
---

# Phase 20 Plan 03: Price Analytics and Multi-Property Allocations Summary

**One-liner:** Price history and seasonal consumption analytics with Recharts visualizations, multi-property PO allocation with validation, plus missing shadcn/ui components.

## What Was Built

Created analytics APIs for price trends and seasonal consumption, multi-property purchase order allocation with validation, chart components using Recharts, analytics dashboard pages, and missing UI components.

**Analytics APIs:**
- `GET /api/suppliers/analytics/price-history` — returns price trends with supplier/property/date filters, enriched with supplier and property names
- `GET /api/suppliers/analytics/consumption` — returns seasonal consumption by month with German month names and property filter
- `GET /api/purchase-orders/[id]/allocations` — lists allocations for a purchase order with property join
- `POST /api/purchase-orders/[id]/allocations` — creates allocation with database trigger validation

**Query functions (analytics-queries.ts):**
- `getPriceHistory(supabase, filters)` — queries delivery_price_history view with optional filters
- `getSeasonalConsumption(supabase, propertyId?)` — queries seasonal_consumption view
- `getMonthName(month)` — returns German month name for month number (1-12)
- `getAllocations(supabase, purchaseOrderId)` — fetches allocations with property join
- `createAllocation(supabase, input)` — inserts allocation, database trigger validates total

**Chart components:**
- `PriceHistoryChart` — Recharts LineChart with CHF/tonne YAxis, date XAxis (de-CH format), custom tooltip, empty state
- `ConsumptionPatternChart` — Recharts AreaChart with gradient fill, German month labels, quantity YAxis, custom tooltip, empty state

**Multi-property allocation form:**
- Add/remove allocation rows with property selector, quantity input, auto-calculated amount
- Fetches existing allocations on mount, displays summary section
- Client-side validation prevents over-allocation, disables submit when remaining < 0
- German labels throughout (Verteilung auf Liegenschaften, Menge, Betrag)

**Dashboard pages:**
- `/dashboard/lieferanten/analytics/preise` — Price development page with supplier dropdown, date range filters, displays PriceHistoryChart
- `/dashboard/lieferanten/analytics/verbrauch` — Seasonal consumption page with property filter, summary statistics cards, displays ConsumptionPatternChart

**UI components (shadcn/ui pattern):**
- `CardTitle` and `CardDescription` added to card.tsx
- `Label` component for form labels
- `Select` component using Radix UI with SelectTrigger, SelectContent, SelectItem
- `Alert` component with variants (default, destructive) using class-variance-authority

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create analytics and allocation API routes | f7bf087 | analytics-queries.ts, price-history/route.ts, consumption/route.ts, allocations/route.ts |
| 2 | Create chart components, allocation form, and dashboard pages | 12f35fe | PriceHistoryChart.tsx, ConsumptionPatternChart.tsx, MultiPropertyOrderForm.tsx, preise/page.tsx, verbrauch/page.tsx, index.ts |
| Fix | Add missing UI components and fix TypeScript errors | 4b71464 | card.tsx, label.tsx, select.tsx, alert.tsx, package.json, chart fixes |

## Technical Details

**Price history API:**
- Queries delivery_price_history view (joins deliveries + purchase_orders)
- Filters: supplier_id, property_id, date_from, date_to
- Enriches with supplier.company_name and property.name via separate queries
- Returns { prices: PriceHistoryPoint[], filters_applied }

**Seasonal consumption API:**
- Queries seasonal_consumption view (monthly aggregates from delivery_price_history)
- Optional property_id filter
- Enriches each row with monthName (German) via getMonthName()
- Returns { consumption: SeasonalConsumption[], property_id }

**Allocation API:**
- GET: Fetches allocations with property and delivery joins
- POST: Validates property exists, creates allocation
- Database trigger (055_purchase_order_allocations.sql) validates SUM(allocated_amount) <= purchase_orders.total_amount
- Returns 400 if trigger raises exception (over-allocation)

**PriceHistoryChart:**
- ResponsiveContainer with height 400
- XAxis: delivery_date formatted with toLocaleDateString('de-CH')
- YAxis: CHF/Tonne label, formatted with formatCHF utility
- Line: monotone type, blue (#3b82f6), strokeWidth 2, dots
- Custom tooltip shows formatted date and price
- Empty state: "Keine Preisdaten vorhanden"

**ConsumptionPatternChart:**
- ResponsiveContainer with height 400
- Gradient fill: linearGradient blue from 0.8 to 0.1 opacity
- XAxis: monthName (German)
- YAxis: "Durchschn. Menge (Tonnen)" label
- Area: monotone type, blue stroke, gradient fill
- Custom tooltip shows quantity with Tonnen suffix and delivery count
- Caption: "Durchschnittlicher Verbrauch pro Monat basierend auf historischen Lieferungen"

**MultiPropertyOrderForm:**
- Props: purchaseOrderId, totalQuantity, totalAmount, properties, onSuccess
- State: allocations array (new), existingAllocations (fetched on mount)
- Each row: property Select, quantity Input (step 0.01), amount Input (auto-calculated)
- Summary section: allocated/remaining quantity and amount, color-coded (red if over-allocated)
- Validation: disables submit if remaining < 0 or allocations.length === 0
- Save: POST each allocation sequentially, clear form on success

**Dashboard pages:**
- Both pages use Card components with CardHeader/CardContent structure
- Filter cards with Label + Select/Input components
- "Filter anwenden" Button triggers fetch
- Error Alert for API errors
- Loading states with Loader2 spinner
- Summary statistics cards (consumption page only)

**UI components:**
- Label: Simple label wrapper with peer-disabled styles
- Select: Radix UI primitive with custom styled Trigger/Content/Item
- Alert: cva-based variants (default, destructive) with AlertTitle and AlertDescription subcomponents
- CardTitle/CardDescription: h3 and p elements with appropriate styling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Missing shadcn/ui components**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Card component lacked CardTitle and CardDescription exports. Label, Select, Alert components didn't exist but were used in dashboard pages.
- **Fix:** Added CardTitle and CardDescription to card.tsx. Created label.tsx, select.tsx, alert.tsx following shadcn/ui patterns with Radix UI and class-variance-authority.
- **Files modified:** card.tsx, label.tsx (new), select.tsx (new), alert.tsx (new), package.json
- **Commit:** 4b71464
- **Rationale:** Components are critical for form UI and charts to function. Plan assumed they existed. Adding them unblocks task completion.

**2. [Rule 1 - Bug] Button variant "outline" not supported**
- **Found during:** TypeScript compilation
- **Issue:** MultiPropertyOrderForm used `variant="outline"` but Button only supports 'primary', 'secondary', 'danger', 'ghost'
- **Fix:** Changed to `variant="secondary"`
- **Files modified:** MultiPropertyOrderForm.tsx
- **Commit:** 4b71464

**3. [Rule 2 - Missing Critical] Missing TypeScript types for chart tooltips**
- **Found during:** TypeScript compilation
- **Issue:** CustomTooltip functions used implicit `any` type for parameters
- **Fix:** Added explicit type signature `{ active?: boolean; payload?: any[] }`
- **Files modified:** PriceHistoryChart.tsx, ConsumptionPatternChart.tsx
- **Commit:** 4b71464

**4. [Rule 2 - Missing Critical] Missing npm packages**
- **Found during:** TypeScript compilation
- **Issue:** @radix-ui/react-select and class-variance-authority not installed
- **Fix:** Installed packages via npm
- **Files modified:** package.json, package-lock.json
- **Commit:** 4b71464

## Decisions Made

1. **Enrich API responses with joined names in API layer**
   - Views only return IDs, not names
   - API queries suppliers.company_name and properties.name separately
   - Alternative: Extend views to include names (more complex view SQL)

2. **Auto-calculate allocated_amount from quantity * unit_price**
   - Form calculates amount when user enters quantity
   - Reduces user error, ensures consistency with PO unit price
   - Alternative: Manual amount entry (prone to calculation mistakes)

3. **Client-side validation + server-side DB trigger**
   - Form validates remaining >= 0, disables submit
   - Database trigger validates SUM(allocated_amount) <= total_amount
   - Defense in depth: good UX (immediate feedback) + data integrity (DB-level guarantee)
   - Alternative: Server-only validation (worse UX, delayed error feedback)

4. **German month names via getMonthName() utility**
   - Simple object lookup MONTH_NAMES[month]
   - Returns 'Januar', 'Februar', etc.
   - Alternative: Intl.DateTimeFormat (heavier, not needed for just month names)

5. **Create missing shadcn/ui components during execution**
   - Plan assumed Label, Select, Alert components existed
   - Adding them unblocks task completion (Rule 2: Missing Critical)
   - Followed shadcn/ui patterns: Radix UI primitives, cva for variants
   - Alternative: Error and require user to add components (blocks progress)

## Integration Points

**Upstream dependencies:**
- `delivery_price_history` view (20-01) for price analytics
- `seasonal_consumption` view (20-01) for consumption analytics
- `purchase_order_allocations` table (20-01) with validation trigger
- `purchase_orders` table (19-01) for allocation FK and total_amount
- `deliveries` table (19-01) for price history and consumption data
- `partners` table for supplier names
- `properties` table for property names

**Downstream consumers:**
- Supplier dashboard will link to /analytics/preise and /analytics/verbrauch pages
- Purchase order detail page can embed MultiPropertyOrderForm
- Reorder workflow might use allocation API to split bulk orders

**Type exports:**
- PriceHistoryPoint, SeasonalConsumption, PurchaseOrderAllocation from suppliers.ts
- Property from database.ts
- API response shapes for analytics endpoints

## Files Changed

**Created (analytics):**
- `src/lib/suppliers/analytics-queries.ts` (180 lines)
- `src/app/api/suppliers/analytics/price-history/route.ts` (106 lines)
- `src/app/api/suppliers/analytics/consumption/route.ts` (76 lines)
- `src/app/api/purchase-orders/[id]/allocations/route.ts` (219 lines)

**Created (charts):**
- `src/components/suppliers/PriceHistoryChart.tsx` (115 lines)
- `src/components/suppliers/ConsumptionPatternChart.tsx` (98 lines)
- `src/components/suppliers/MultiPropertyOrderForm.tsx` (362 lines)

**Created (dashboard pages):**
- `src/app/dashboard/lieferanten/analytics/preise/page.tsx` (158 lines)
- `src/app/dashboard/lieferanten/analytics/verbrauch/page.tsx` (169 lines)

**Created (UI components):**
- `src/components/ui/label.tsx` (21 lines)
- `src/components/ui/select.tsx` (135 lines)
- `src/components/ui/alert.tsx` (61 lines)

**Modified:**
- `src/components/suppliers/index.ts` (+3 exports)
- `src/components/ui/card.tsx` (+47 lines for CardTitle and CardDescription)
- `package.json` (+2 dependencies)
- `package-lock.json` (+39 packages)

**Total:** 12 new files, 3 modified files, 1625 lines added

## Verification

All verifications passed:
- ✓ `npx tsc --noEmit` passes (no TypeScript errors in plan files)
- ✓ Price history API exports GET method
- ✓ Consumption API exports GET method
- ✓ Allocations API exports GET and POST methods
- ✓ PriceHistoryChart imports from 'recharts' (LineChart)
- ✓ ConsumptionPatternChart imports from 'recharts' (AreaChart)
- ✓ Price analytics page fetches from /api/suppliers/analytics/price-history
- ✓ Consumption page fetches from /api/suppliers/analytics/consumption
- ✓ All 3 components export correctly from barrel file
- ✓ Charts render with proper CHF formatting and German labels
- ✓ Empty states shown when no data available
- ✓ Multi-property allocation form validates totals

## Next Phase Readiness

**Ready for Phase 20 completion:**
- All Phase 20 plans (01, 02, 03) complete
- Inventory tracking, analytics, and allocation features built
- Dashboard pages ready for navigation integration
- No blockers

**Phase 21 (Change Orders) will build:**
- Change order request workflow (contractor-initiated)
- Review and approval flow (imeri/kewa roles)
- Budget impact calculation
- Change order history and audit trail

**Future enhancements (not in current scope):**
- Price trend prediction using historical data
- Consumption forecasting for seasonal planning
- Bulk allocation UI for creating multiple allocations at once
- Export analytics data to CSV/Excel
- Email notifications for low inventory alerts

## Metrics

- **Duration:** 25 minutes
- **Tasks completed:** 2/2 + 1 fix
- **Commits:** 3
- **Files created:** 12
- **Files modified:** 3
- **Lines added:** 1625
- **Deviations:** 4 (all auto-fixed)

---

*Phase 20-03 complete. Price analytics and multi-property allocations ready. Phase 20 Supplier Advanced milestone complete.*
