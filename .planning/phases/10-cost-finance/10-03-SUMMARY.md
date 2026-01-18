---
phase: 10
plan: 03
subsystem: costs
tags: [payments, invoices, mark-as-paid, api, components]
dependency-graph:
  requires: [10-RESEARCH, migration-020-payment, migration-018-invoice]
  provides: [payments-api, payment-modal, invoice-detail-component]
  affects: [10-04, 10-05, phase-12-dashboard]
tech-stack:
  added: []
  patterns: [database-trigger-side-effects, refresh-key-pattern, modal-focus-trap]
key-files:
  created:
    - src/lib/costs/payment-helpers.ts
    - src/app/api/payments/route.ts
    - src/app/api/payments/[id]/route.ts
    - src/components/costs/PaymentModal.tsx
    - src/components/costs/PaymentHistory.tsx
    - src/components/costs/InvoiceDetail.tsx
    - src/components/costs/index.ts
  modified: []
decisions:
  - "Full payment only for MVP (no partial payments) - simplifies workflow"
  - "Completed payments immutable - audit trail integrity"
  - "Database trigger handles invoice status update - atomic and reliable"
metrics:
  duration: "4m 39s"
  completed: "2026-01-18"
---

# Phase 10 Plan 03: Payment Recording (Mark as Paid) Summary

**One-liner:** Complete payment workflow with API, modal, and history components leveraging database triggers for automatic invoice status updates.

## What Was Built

### Payment Helpers (src/lib/costs/payment-helpers.ts)
- `formatPaymentMethod()` and `formatPaymentStatus()` for German labels
- `getDefaultPaymentDate()` returns today in ISO format
- `validatePaymentAmount()` validates against outstanding balance
- `formatCHF()` and `formatSwissDate()` for Swiss locale formatting
- `getPaymentMethodOptions()` for form select population

### Payments API (src/app/api/payments/)
- **GET /api/payments** - List payments with filters (invoice_id, date_from, date_to, status)
- **POST /api/payments** - Create payment (Mark as Paid)
  - Validates invoice is 'approved' status
  - Validates amount <= outstanding balance
  - Defaults: payment_date=today, payment_method='bank_transfer', status='completed'
- **GET /api/payments/[id]** - Get single payment with invoice relation
- **DELETE /api/payments/[id]** - Delete only pending/failed payments (immutable audit trail)

### UI Components (src/components/costs/)
- **PaymentModal** - "Als bezahlt markieren" modal with:
  - Invoice summary (number, partner, dates, amounts)
  - Pre-filled amount (outstanding), date (today)
  - Payment method select (default: Bankueberweisung)
  - Optional notes field
  - Focus trap and escape key handling
- **PaymentHistory** - Table showing:
  - Datum, Betrag, Methode, Referenz columns
  - Summary: total paid vs outstanding
  - "Vollstaendig bezahlt" indicator when outstanding=0
- **InvoiceDetail** - Full invoice display with:
  - Status badge with German labels and colors
  - Partner, project, work order context
  - Amount breakdown (Netto, MwSt, Total, Bezahlt, Offen)
  - Variance tracking vs offer amount
  - "Als bezahlt markieren" button when status='approved'
  - Integrated PaymentHistory with refresh on new payment

## Database Trigger Integration

The existing `update_invoice_paid_amount` trigger (migration 020) handles:
1. Summing completed payments to `invoice.amount_paid`
2. Updating `invoice.status` to 'paid' when fully paid
3. Setting `invoice.paid_at` timestamp

This means our API simply creates the payment record, and the trigger atomically updates the invoice - no manual sync required.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 576be2b | feat | Add payment helpers for cost management |
| 229755c | feat | Add payments API route (GET, POST) |
| 9cb2917 | feat | Add single payment API route (GET, DELETE) |
| 941fe00 | feat | Add PaymentModal component |
| 5cc282f | feat | Add PaymentHistory component |
| fe655c5 | feat | Add InvoiceDetail with payment integration |

## Verification

- [x] POST /api/payments creates payment record
- [x] Invoice.amount_paid updates automatically (trigger)
- [x] Invoice.status changes to 'paid' when fully paid (trigger)
- [x] Invoice.paid_at timestamp is set (trigger)
- [x] PaymentModal shows correct defaults
- [x] PaymentHistory displays after payment recorded
- [x] Cannot pay more than outstanding amount (API validation)
- [x] Cannot pay non-approved invoices (API validation)
- [x] Build succeeds with no TypeScript errors

## Decisions Made

1. **Full payment only for MVP** - No partial payments UI. Database supports it, but MVP uses single "Mark as Paid" with full outstanding amount as default. Simpler UX for typical renovation invoices.

2. **Completed payments are immutable** - Only pending/failed payments can be deleted. This maintains audit trail integrity for accounting.

3. **Database trigger for status sync** - Relying on existing `update_invoice_paid_amount` trigger rather than application-level status management. More reliable, atomic updates.

4. **RefreshKey pattern for payment history** - Incrementing refreshKey prop triggers re-fetch after new payment, avoiding stale data.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Plan 10-03 is complete. The payment workflow (COST-01) is now fully functional:
- Invoice approval (10-01) -> Payment recording (10-03)
- Invoice status automatically updates to 'paid'

Ready for:
- **Plan 10-04:** Project cost dashboard (uses project_costs view)
- **Plan 10-05:** Accounting export (CSV generation)
