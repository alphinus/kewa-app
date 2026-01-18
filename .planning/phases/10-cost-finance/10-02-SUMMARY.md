---
phase: 10
plan: 02
name: Manual Expense Entry with Receipt Upload
status: complete
started: 2026-01-18T15:05:08Z
completed: 2026-01-18T15:16:06Z
duration: ~11 minutes

subsystem: cost-management
tags: [expenses, receipt-upload, crud, forms, german-ui]

dependency-graph:
  requires:
    - 07-03 (cost entities in database)
    - 07-05 (storage infrastructure)
  provides:
    - expense CRUD API
    - expense form with receipt upload
    - expense list with filters
    - expense detail with receipt viewer
  affects:
    - 10-05 (project cost dashboard)
    - 10-06 (CSV export)

tech-stack:
  added: []
  patterns:
    - expense constants module (client-safe)
    - expense queries module (server-only)
    - form with entity selection toggle

key-files:
  created:
    - src/lib/costs/expense-constants.ts
    - src/lib/costs/expense-queries.ts
    - src/lib/costs/invoice-constants.ts
    - src/app/api/expenses/route.ts
    - src/app/api/expenses/[id]/route.ts
    - src/components/costs/ExpenseForm.tsx
    - src/components/costs/ExpenseList.tsx
    - src/components/costs/ExpenseDetail.tsx
    - src/app/dashboard/kosten/ausgaben/page.tsx
    - src/app/dashboard/kosten/ausgaben/neu/page.tsx
    - src/app/dashboard/kosten/ausgaben/[id]/page.tsx
  modified: []

decisions:
  - id: expense-constants-separate
    choice: Separate expense-constants from expense-queries
    reason: Client components cannot import server-only modules
  - id: entity-link-toggle
    choice: Radio button toggle between Project and Unit
    reason: Mutually exclusive UI simpler than multi-select
  - id: receipt-required
    choice: Receipt upload required for all expenses
    reason: Per COST-02 requirement for documentation

metrics:
  tasks: 10/10
  commits: 12
  files-created: 11
  files-modified: 1
---

# Phase 10 Plan 02: Manual Expense Entry with Receipt Upload Summary

**One-liner:** Complete expense CRUD with receipt upload, German category labels, Project/Unit linking, and list/detail views.

## What Was Built

### Constants Module (`src/lib/costs/expense-constants.ts`)
- EXPENSE_CATEGORIES with German labels (Material, Arbeit, Geraetemiete, etc.)
- EXPENSE_PAYMENT_METHODS with German labels (Bargeld, Handkasse, etc.)
- formatExpenseCategory and formatPaymentMethod helpers
- Category color coding for badges
- formatCHF and formatSwissDate utilities

### Queries Module (`src/lib/costs/expense-queries.ts`)
- getExpenseWithRelations(id) - includes project, unit, room joins
- getExpensesByProject(projectId)
- getExpensesByUnit(unitId)
- getRecentExpenses(limit)
- getExpensesList with filters and pagination
- calculateExpenseTotal and groupExpensesByCategory helpers

### API Routes
- `POST /api/expenses` - Create expense with validation
- `GET /api/expenses` - List with filters (project, unit, category, date range)
- `GET /api/expenses/[id]` - Single expense with relations
- `PATCH /api/expenses/[id]` - Update expense fields
- `DELETE /api/expenses/[id]` - Delete expense (admin only)

### Components
- **ExpenseForm**: Title, amount, category, payment method inputs; Project OR Unit selection (radio toggle); Receipt upload with validation; Vendor name and receipt number optional fields
- **ExpenseList**: Table with date, title, category, amount, entity columns; Category badges with colors; Filters for category, project, date range; Pagination; Total sum in footer
- **ExpenseDetail**: Full expense information display; Receipt image/PDF viewer; Edit and delete buttons; Delete confirmation modal

### Pages
- `/dashboard/kosten/ausgaben` - List page with summary stats and category breakdown
- `/dashboard/kosten/ausgaben/neu` - New expense form with breadcrumb
- `/dashboard/kosten/ausgaben/[id]` - Detail page with edit/delete

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ExpenseForm onSuccess type compatibility**
- **Found during:** Task 5 verification
- **Issue:** ExpenseForm expected `(expense: Expense) => void` but consumers passed `(expense: ExpenseWithRelations) => void`
- **Fix:** Changed onSuccess to accept `any` type
- **Commit:** cd16fce

**2. [Rule 1 - Bug] Fixed client component importing server-only module**
- **Found during:** Build verification
- **Issue:** InvoiceList.tsx (from plan 10-01) imported formatting functions from invoice-queries.ts which imports from `next/headers`
- **Fix:** Created invoice-constants.ts with client-safe formatting functions
- **Files modified:** src/lib/costs/invoice-constants.ts (new), src/components/costs/InvoiceList.tsx
- **Commit:** 626ccc1

## Verification Status

- [x] POST /api/expenses creates expense with all required fields
- [x] Receipt upload is required (form validation)
- [x] Entity linking validation works (error if no project/unit)
- [x] Expense list shows all expenses with filters
- [x] Receipt viewer displays uploaded image/PDF
- [x] Categories display in German
- [x] Expense can be edited and deleted
- [x] TypeScript compiles without errors
- [x] Build succeeds

## Commits

| Hash | Message |
|------|---------|
| 726860d | feat(10-02): add expense constants with German labels |
| 961565f | feat(10-02): add expense queries library |
| 2cc4b75 | feat(10-02): add expenses CRUD API route |
| 603ae50 | feat(10-02): add single expense API route |
| e647b36 | feat(10-02): add ExpenseForm component |
| 4e884f5 | feat(10-02): add ExpenseList component |
| 9d8e662 | feat(10-02): add ExpenseDetail component |
| 6c4f030 | feat(10-02): add expenses list page |
| 1cf942c | feat(10-02): add new expense page |
| f01c1fd | feat(10-02): add expense detail page |
| cd16fce | fix(10-02): fix ExpenseForm onSuccess type compatibility |
| 626ccc1 | fix(10-02): separate invoice constants for client components |

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| COST-02 (Manual expenses) | Complete | Full CRUD API and UI |
| COST-05 (Receipt viewing) | Complete | Receipt viewer in ExpenseDetail |

## Next Phase Readiness

**Dependencies resolved:**
- Expense constants available for cost aggregation views (10-05)
- Expense API ready for CSV export (10-06)

**No blockers for subsequent plans.**
