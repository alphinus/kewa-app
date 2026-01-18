---
phase: 07-foundation-data-model
plan: 03
subsystem: database
tags: [postgresql, supabase, cost-tracking, invoices, payments, views]

# Dependency graph
requires:
  - phase: 07-02
    provides: partners, work_orders, renovation_projects tables
provides:
  - offers table with status workflow and tax calculation
  - invoices table with payment tracking and variance calculation
  - expenses table with category validation
  - payments table with invoice auto-update
  - cost aggregation views (project, unit, partner, trade)
  - TypeScript types for all cost entities
affects: [phase-10-cost-finance, phase-12-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Automatic tax/total calculation via PostgreSQL triggers
    - Variance tracking (invoice vs offer) with auto-population
    - Payment aggregation triggers updating invoice status
    - Validation triggers for business rules
    - Aggregation views for cost reporting

key-files:
  created:
    - supabase/migrations/017_offer.sql
    - supabase/migrations/018_invoice.sql
    - supabase/migrations/019_expense.sql
    - supabase/migrations/020_payment.sql
    - supabase/migrations/021_cost_views.sql
  modified:
    - src/types/index.ts
    - src/types/database.ts

key-decisions:
  - "Swiss VAT default: 7.7% tax rate in all cost entities"
  - "Tax calculation triggers: auto-compute tax_amount and total_amount on insert/update"
  - "Payment status cascade: payments trigger updates invoice status to paid/partially_paid"
  - "Expense validation: require at least one entity link (project, work_order, unit, or room)"
  - "Variance tracking: auto-calculate invoice vs offer variance when linked"

patterns-established:
  - "Cost entity trigger pattern: calculate_*_totals functions"
  - "Status cascade pattern: child entity changes update parent status"
  - "Aggregation view pattern: project_costs, unit_costs, partner_costs"
  - "Trade-based reporting: expense_by_trade, invoice_by_trade views"

# Metrics
duration: 6min
completed: 2026-01-18
---

# Phase 7 Plan 3: Cost & Finance Model Summary

**Financial data model with offers, invoices, expenses, payments, and aggregation views for Phase 10 cost workflow**

## Performance

- **Duration:** 6 min 26 sec
- **Started:** 2026-01-18T00:53:42Z
- **Completed:** 2026-01-18T01:00:08Z
- **Tasks:** 6/6
- **Files modified:** 7

## Accomplishments

- Created complete cost tracking schema: Offers, Invoices, Expenses, Payments
- Implemented automatic tax calculation (7.7% Swiss VAT default)
- Added variance tracking between offers and invoices
- Created payment triggers that auto-update invoice status
- Built 7 aggregation views for cost reporting by project, unit, partner, and trade
- Added comprehensive TypeScript types for all cost entities

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Offer Entity** - `9d94565` (feat)
2. **Task 2: Create Invoice Entity** - `2dc1df8` (feat)
3. **Task 3: Create Expense Entity** - `c132837` (feat)
4. **Task 4: Create Payment Entity** - `679945e` (feat)
5. **Task 5: Create Cost Aggregation Views** - `1768aa7` (feat)
6. **Task 6: Update TypeScript Types** - `baeab3d` (feat)

## Files Created/Modified

**Created:**
- `supabase/migrations/017_offer.sql` - Offer entity with status workflow and tax calculation
- `supabase/migrations/018_invoice.sql` - Invoice entity with payment tracking and variance
- `supabase/migrations/019_expense.sql` - Expense entity with category validation
- `supabase/migrations/020_payment.sql` - Payment entity with invoice auto-update
- `supabase/migrations/021_cost_views.sql` - 7 aggregation views for reporting

**Modified:**
- `src/types/index.ts` - Added 6 cost-related enums
- `src/types/database.ts` - Added 17 new interfaces for cost entities

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Swiss VAT 7.7% default | KEWA operates in Switzerland, standard rate |
| Auto-calculate tax/total | Reduces errors, ensures consistency |
| Invoice variance tracking | Critical for budget control vs accepted offers |
| Expense entity validation | Prevents orphan expenses, ensures traceability |
| Multiple aggregation views | Supports Phase 10 cost workflow and Phase 12 dashboard |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all migrations created successfully, TypeScript types validated.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Phase 10 (Cost & Finance): Full cost workflow with offer acceptance, invoice approval, payment tracking
- Phase 12 (Dashboard): Cost aggregation views ready for visualization

**Dependencies:**
- Requires Phase 07-02 migrations (partners, work_orders, renovation_projects) to run first
- Migrations are numbered 017-021 to run after 07-02 migrations (008-016)

---
*Phase: 07-foundation-data-model*
*Completed: 2026-01-18*
