---
phase: 10
plan: 06
name: Unit Investment View and Rent Entry
subsystem: cost-finance
tags: [rent, investment, amortization, unit-costs, dashboard]
requirements-implemented: [RENT-01, RENT-02, RENT-03]
dependency-graph:
  requires: [10-04]
  provides: [unit-investment-view, rent-entry, amortization-calculation]
  affects: [12-dashboard-visualization]
tech-stack:
  added: []
  patterns: [server-components, client-modal, role-based-access]
key-files:
  created:
    - src/lib/costs/unit-cost-queries.ts
    - src/app/api/costs/unit/[id]/route.ts
    - src/app/api/units/[id]/rent/route.ts
    - src/components/costs/RentEditModal.tsx
    - src/components/costs/UnitInvestmentCard.tsx
    - src/components/costs/InvestmentOverview.tsx
    - src/app/dashboard/kosten/wohnungen/page.tsx
    - src/app/dashboard/kosten/wohnungen/[id]/page.tsx
  modified: []
decisions:
  - key: legacy-role-only
    choice: Use only kewa role for access control
    rationale: v2.0 RBAC (admin, manager, accounting) not yet in session system
  - key: null-to-undefined-building
    choice: Convert null building_name to undefined for UnitCosts type
    rationale: TypeScript type compatibility with optional string property
metrics:
  duration: 14m
  completed: 2026-01-18
---

# Phase 10 Plan 06: Unit Investment View and Rent Entry Summary

Unit investment dashboard showing rent vs renovation costs with amortization calculation, plus ability to enter/edit monthly rent amounts.

## Implementation

### Task 1: Unit Cost Queries
Created `/src/lib/costs/unit-cost-queries.ts` with:
- `getUnitCostSummary(unitId)` - from unit_costs view
- `getAllUnitCosts(buildingId?)` - all units with optional building filter
- `calculatePaybackPeriod(investment, monthlyRent)` - helper
- `getUnitProjectCosts(unitId)` - project breakdown
- `getUnitDirectExpenses(unitId)` - non-project expenses
- `getInvestmentSummaryStats()` - overview statistics
- `getBuildingsForFilter()` - building dropdown options

### Task 2: Unit Cost API Route
Created `/src/app/api/costs/unit/[id]/route.ts`:
- GET returns unit cost data from unit_costs view
- Includes rent_amount, total_investment, years_to_recover
- Returns project list with individual costs
- Returns direct expenses list
- Role-restricted to kewa (internal)

### Task 3: Rent Update API Route
Created `/src/app/api/units/[id]/rent/route.ts`:
- PATCH to update rent_amount
- GET to read current rent
- Validates positive number or null
- Creates audit log entry on update
- Role-restricted to kewa

### Task 4: RentEditModal Component
Created `/src/components/costs/RentEditModal.tsx`:
- Input for monthly rent in CHF
- Current value pre-filled
- Annual rent preview calculation
- Focus trap and escape key handling
- German labels throughout

### Task 5: UnitInvestmentCard Component
Created `/src/components/costs/UnitInvestmentCard.tsx`:
- Card displaying unit investment summary
- Sections: Mietzins (monatlich/jaehrlich), Renovationskosten, Amortisation
- Payback years highlighted with color coding (<10 green, 10-20 amber, >20 red)
- Edit rent button (pencil icon) with modal integration
- Compact/full variants for grid vs detail view

### Task 6: InvestmentOverview Component
Created `/src/components/costs/InvestmentOverview.tsx`:
- Grid of UnitInvestmentCard for all units
- Summary row: Total invested, Average payback, Units count
- Building filter dropdown
- Sort options: by name, by investment, by payback years
- Local state update on rent change

### Task 7: Units Investment List Page
Created `/src/app/dashboard/kosten/wohnungen/page.tsx`:
- Server component at /dashboard/kosten/wohnungen
- Fetches all unit costs via getAllUnitCosts()
- InvestmentOverview component with building filter
- Help text explaining amortization calculation

### Task 8: Unit Investment Detail Page
Created `/src/app/dashboard/kosten/wohnungen/[id]/page.tsx`:
- Server component for single unit
- UnitInvestmentCard (full size) with rent editing
- List of renovation projects with costs and status
- List of direct expenses with category and vendor
- Links to project and expense detail pages

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 721582e | feat(10-06): add unit cost query utilities |
| 2 | 4108cb0 | feat(10-06): add unit cost API route |
| 3 | 4b4bae1 | feat(10-06): add rent update API route |
| 4 | 241d0e7 | feat(10-06): add RentEditModal component |
| 5 | f3453f8 | feat(10-06): add UnitInvestmentCard component |
| 6 | 2add46f | feat(10-06): add InvestmentOverview component |
| 7 | f7eee8a | feat(10-06): add units investment list page |
| 8 | ca436a8 | feat(10-06): add unit investment detail page |

## Verification

- [x] Unit cost API returns accurate data from view
- [x] Rent can be entered and updated via modal
- [x] Amortization (years_to_recover) calculates correctly
- [x] Investment overview shows all units
- [x] Rent vs renovation comparison visible
- [x] Edit rent button opens modal
- [x] Audit log created on rent update
- [x] All amounts formatted in CHF
- [x] TypeScript compilation passes

## Deviations from Plan

### Role System Adaptation
**Found during:** Tasks 2, 3, 7, 8
**Issue:** Plan specified roles 'admin', 'manager', 'accounting' but Role type only has 'kewa' | 'imeri'
**Fix:** Used only 'kewa' role check with comments noting v2.0 will add more granular RBAC
**Files modified:** All API routes and pages

## Requirements Implemented

| ID | Description | Status |
|----|-------------|--------|
| RENT-01 | Mietzins pro Unit speicherbar | COMPLETE |
| RENT-02 | Dashboard: Miete vs Renovationskosten | COMPLETE |
| RENT-03 | Investment-Uebersicht pro Unit | COMPLETE |

## Next Phase Readiness

Phase 10 (Cost & Finance) complete:
- Plan 01: Invoice Submission & Approval - COMPLETE
- Plan 02: Manual Expense Entry - COMPLETE
- Plan 03: Payment Recording - COMPLETE
- Plan 04: Project Cost Dashboard - COMPLETE
- Plan 05: Accounting Export (CSV) - COMPLETE
- Plan 06: Unit Investment View - COMPLETE

Ready for Phase 11 (History & Digital Twin).
