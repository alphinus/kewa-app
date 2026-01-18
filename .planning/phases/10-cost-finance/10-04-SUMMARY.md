---
phase: 10
plan: 04
name: Project Cost Dashboard
subsystem: cost-finance
tags: [dashboard, cost-aggregation, project-costs, swiss-formatting]

dependency-graph:
  requires: [10-01, 10-02, 10-03]
  provides: [project-cost-overview, work-order-cost-breakdown, cost-formatting-utilities]
  affects: [10-05, 12-dashboard]

tech-stack:
  added: []
  patterns: [aggregation-views, supabase-array-relation-handling, swiss-formatting]

key-files:
  created:
    - src/lib/costs/formatters.ts
    - src/lib/costs/project-cost-queries.ts
    - src/app/api/costs/project/[id]/route.ts
    - src/components/costs/WorkOrderCostRow.tsx
    - src/components/costs/ProjectCostSummary.tsx
    - src/components/costs/ProjectCostDashboard.tsx
    - src/app/dashboard/kosten/page.tsx
    - src/app/dashboard/kosten/projekte/[id]/page.tsx
  modified: []

decisions:
  - key: swiss-formatting-centralized
    rationale: Created formatters.ts with all Swiss formatting utilities (CHF, dates, numbers) for consistency
  - key: supabase-array-handling
    rationale: Supabase returns arrays for to-one relations; explicit extraction needed
  - key: no-link-to-detail
    rationale: Work order rows in dashboard don't link out - all info visible inline
  - key: offer-invoice-side-by-side
    rationale: Per CONTEXT.md - simple comparison without highlighted variance

metrics:
  duration: 25min
  completed: 2026-01-18
---

# Phase 10 Plan 04: Project Cost Dashboard Summary

**One-liner:** Project cost dashboard with work order breakdown showing offers vs invoices side-by-side, Swiss CHF formatting, and aggregation from project_costs view.

## What Was Built

### 1. Cost Formatting Utilities (formatters.ts)
- `formatCHF()` - Swiss currency format with Intl.NumberFormat
- `formatVariance()` - Positive/negative variance with sign prefix
- `formatSwissDate()` - DD.MM.YYYY format
- `formatSwissNumber()` - Comma decimal separator for CSV export
- Status translation functions for German labels

### 2. Project Cost Queries (project-cost-queries.ts)
- `getProjectCostSummary()` - Fetches from project_costs view
- `getProjectWorkOrdersWithCosts()` - Work orders with offers/invoices joined
- `getProjectExpenses()` - Expenses linked to project
- `getProjectCostBreakdown()` - Combines all queries into single response
- `getAllProjectCostSummaries()` - For overview page listing
- `getCostStatistics()` - Dashboard-level totals

### 3. API Route (/api/costs/project/[id])
- GET endpoint returning complete cost breakdown
- Uses getProjectCostBreakdown for efficient single query
- Returns summary, work orders, expenses, and calculated totals

### 4. WorkOrderCostRow Component
- Table row for work order cost display
- Columns: Auftrag, Raum, Offerte, Rechnung, Status
- Offer amount from accepted offer
- Invoice amount with invoice number
- Status badge (invoice status or work order status)

### 5. ProjectCostSummary Component
- Summary cards: Budget, Offerten, Rechnungen, Bezahlt, Ausgaben
- Variance from budget with color-coded status
- Count subtitles (e.g., "3 akzeptiert")
- Outstanding amount highlighting

### 6. ProjectCostDashboard Component
- Full dashboard combining summary + details
- Work orders table with footer totals
- Expenses table with category badges
- Grand total card at bottom

### 7. Cost Overview Page (/dashboard/kosten)
- Quick stats: Total invoiced, paid, outstanding, expenses
- Projects table with cost summaries
- Links to individual project cost views
- Quick action cards for expenses and invoices

### 8. Project Cost Detail Page (/dashboard/kosten/projekte/[id])
- Server component with breadcrumb navigation
- ProjectCostDashboard for full breakdown
- Links back to overview and to project detail

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 8c240b4 | feat | Add cost formatting utilities |
| fe08b1a | feat | Add project cost query utilities |
| 9a4e754 | feat | Add project cost API route |
| 03373ab | feat | Add WorkOrderCostRow component |
| 62af9a3 | feat | Add ProjectCostSummary component |
| d724201 | feat | Add ProjectCostDashboard component |
| 6735d41 | feat | Add cost overview page |
| b338167 | feat | Add project cost detail page |
| 25e0849 | fix | Fix Supabase array relation type handling |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase Array Relation Types**
- **Found during:** Task 2 verification
- **Issue:** Supabase returns arrays for to-one relations (unit, building, room, partner)
- **Fix:** Added explicit array handling with first() extraction pattern
- **Files modified:** src/lib/costs/project-cost-queries.ts
- **Commit:** 25e0849

## Verification

- [x] Project cost API returns aggregated data correctly
- [x] Summary cards show accurate totals
- [x] Work orders displayed as line items
- [x] Offer and invoice amounts shown side-by-side
- [x] Expenses listed separately with totals
- [x] All amounts formatted in CHF
- [x] Navigation to related entities works
- [x] TypeScript compiles without errors in new files

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| COST-01 | Partial | Workflow visibility - dashboard shows invoice status |
| COST-03 | Complete | Aggregation by project with work order breakdown |
| COST-04 | Complete | Offer vs invoice side-by-side (no highlighted variance) |

## Next Phase Readiness

Ready to proceed:
- 10-05 (Accounting Export) can use formatters.ts utilities
- Phase 12 dashboard can embed cost summary components

No blockers identified.
