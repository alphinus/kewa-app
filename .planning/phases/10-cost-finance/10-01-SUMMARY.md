---
phase: 10
plan: 01
name: Invoice Approval Workflow
subsystem: cost-management
tags: [invoice, approval, workflow, api, ui]

dependency-graph:
  requires:
    - 07-03 (Cost & Finance Model - invoices table)
    - 09-01 (Work order creation)
  provides:
    - Invoice CRUD API routes
    - Invoice approval/dispute workflow
    - Invoice list and detail pages
  affects:
    - 10-02 (Payment recording)
    - 10-03 (Cost aggregation)

tech-stack:
  added: []
  patterns:
    - Invoice status workflow (received -> under_review -> approved/disputed)
    - Audit logging for status changes
    - Status timeline visualization

key-files:
  created:
    - src/lib/costs/invoice-queries.ts
    - src/app/api/invoices/route.ts
    - src/app/api/invoices/[id]/route.ts
    - src/app/api/invoices/[id]/approve/route.ts
    - src/app/api/invoices/[id]/dispute/route.ts
    - src/components/costs/InvoiceList.tsx
    - src/components/costs/InvoiceApprovalActions.tsx
    - src/app/dashboard/kosten/rechnungen/page.tsx
    - src/app/dashboard/kosten/rechnungen/[id]/page.tsx
  modified:
    - src/components/costs/InvoiceDetail.tsx
    - src/components/costs/index.ts

decisions:
  - Single approval step workflow (admin/manager approves)
  - Dispute with required reason captured in internal_notes
  - Status timeline showing 4-step progression
  - German labels throughout (Freigeben, Beanstanden, etc.)

metrics:
  duration: 45 minutes
  completed: 2026-01-18
---

# Phase 10 Plan 01: Invoice Approval Workflow Summary

Invoice approval workflow from received through approved status, with side-by-side offer/invoice comparison and status timeline visualization.

## Changes Made

### API Layer

1. **Invoice Queries Library** (`src/lib/costs/invoice-queries.ts`)
   - `getInvoiceWithRelations(id)` - fetches invoice with partner, offer, work_order, project
   - `getInvoicesByFilters()` - list with status, project, partner, date range filters
   - `getInvoiceStatusCounts()` - dashboard stats
   - Helper functions: `formatCHF()`, `formatSwissDate()`, `getInvoiceStatusLabel()`, `getInvoiceStatusColor()`

2. **Invoices CRUD Routes** (`src/app/api/invoices/route.ts`)
   - GET: List invoices with filters and pagination
   - POST: Create invoice with duplicate detection

3. **Single Invoice Routes** (`src/app/api/invoices/[id]/route.ts`)
   - GET: Invoice with all relations
   - PATCH: Update internal_notes, status to under_review
   - DELETE: Remove received invoices only (admin only)

4. **Approve Route** (`src/app/api/invoices/[id]/approve/route.ts`)
   - POST: Sets status to approved with timestamp and user
   - Validates must be in under_review status
   - Creates audit log entry

5. **Dispute Route** (`src/app/api/invoices/[id]/dispute/route.ts`)
   - POST: Sets status to disputed with reason
   - Appends dispute reason to internal_notes with timestamp
   - Creates audit log entry

### UI Components

6. **InvoiceList** (`src/components/costs/InvoiceList.tsx`)
   - Table with columns: Datum, Nr., Partner, Projekt, Betrag, Status
   - Status badges with color coding
   - Filters: status dropdown, project select, date range
   - Pagination with offset/limit
   - Click row to navigate to detail

7. **InvoiceApprovalActions** (`src/components/costs/InvoiceApprovalActions.tsx`)
   - "Freigeben" button with confirmation dialog
   - "Beanstanden" button with reason modal
   - Loading states and error handling

8. **InvoiceDetail Enhancement** (`src/components/costs/InvoiceDetail.tsx`)
   - Added StatusTimeline showing 4-step workflow progression
   - Added "Pruefung starten" button for received invoices
   - Integrated InvoiceApprovalActions for under_review status
   - Status-specific hints for disputed invoices

### Pages

9. **Invoices List Page** (`src/app/dashboard/kosten/rechnungen/page.tsx`)
   - Server component with status counts
   - Stats cards: Offen, In Pruefung, Freigegeben, Beanstandet
   - InvoiceList with project filter dropdown

10. **Invoice Detail Page** (`src/app/dashboard/kosten/rechnungen/[id]/page.tsx`)
    - Server component fetching single invoice
    - Breadcrumb navigation back to list
    - Full InvoiceDetail with approval workflow

## Verification Results

- [x] GET /api/invoices returns filtered list with pagination
- [x] GET /api/invoices/[id] returns invoice with offer comparison data
- [x] POST /api/invoices/[id]/approve changes status to 'approved'
- [x] POST /api/invoices/[id]/dispute changes status to 'disputed'
- [x] Invoice list shows status badges correctly
- [x] Invoice detail shows offer vs invoice amounts side-by-side
- [x] Only authorized roles can approve/dispute (kewa only)
- [x] TypeScript compiles without errors in invoice files

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Single approval step | Simpler workflow, matches context decision |
| Dispute reason required | Structured feedback for partner |
| Status timeline 4 steps | Clear visualization of workflow |
| German labels throughout | KEWA operates in Switzerland |
| Duplicate invoice detection | Prevents accidental double-entry |
| Audit logging on status change | Required for COST-01 compliance |

## Technical Notes

- Invoice status workflow: `received -> under_review -> approved/disputed`
- Database triggers auto-calculate `tax_amount`, `total_amount`, `variance_amount`
- Variance shows difference between invoice and linked offer
- Internal notes accumulate dispute reasons with timestamps

## Next Phase Readiness

Ready for Plan 10-02 (Payment recording):
- Invoice can reach 'approved' status
- PaymentModal already exists in InvoiceDetail
- Payment trigger will update invoice status to 'paid'
