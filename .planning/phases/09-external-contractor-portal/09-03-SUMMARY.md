---
phase: 09
plan: 03
subsystem: contractor-portal
tags: [work-orders, counter-offer, response-flow, api]
dependency-graph:
  requires: [09-01, 09-02]
  provides: [counter-offer-flow, reject-modal, response-form]
  affects: [09-05, 10-01]
tech-stack:
  added: []
  patterns: [counter-offer-status-enum, status-transition-extension]
key-files:
  created:
    - supabase/migrations/037_work_order_extensions.sql
    - src/lib/contractor/constants.ts
    - src/app/api/contractor/[token]/[workOrderId]/respond/route.ts
    - src/app/contractor/[token]/[workOrderId]/response-form.tsx
    - src/app/contractor/[token]/[workOrderId]/reject-modal.tsx
    - src/app/contractor/[token]/[workOrderId]/counter-offer-form.tsx
    - src/components/admin/work-orders/CounterOfferReview.tsx
    - src/app/api/work-orders/[id]/counter-offer/route.ts
  modified:
    - src/app/api/contractor/[token]/status/route.ts
    - src/lib/contractor/queries.ts
    - src/app/contractor/[token]/[workOrderId]/page.tsx
    - src/app/contractor/[token]/work-order-card.tsx
decisions:
  - id: counter-offer-pending-state
    summary: Counter-offers stay in 'viewed' status with counter_offer_status='pending' for KEWA review
  - id: viewed-to-viewed-transition
    summary: Allow viewed->viewed transition to support counter-offer updates
  - id: rejection-reasons-constant
    summary: Predefined rejection reasons in constants file for consistency
metrics:
  duration: 12m 28s
  completed: 2026-01-18
---

# Phase 9 Plan 3: Response Actions & Counter-Offer Flow Summary

**One-liner:** Full contractor response flow with accept/reject/counter-offer actions and KEWA admin review UI.

## What Was Built

### Database Extensions
- `counter_offer_status` enum (pending, approved, rejected)
- New columns: `counter_offer_status`, `counter_offer_responded_at`, `counter_offer_response_notes`
- Updated status transition function to allow `viewed` -> `viewed` for counter-offer updates

### Contractor Response API
- `POST /api/contractor/[token]/[workOrderId]/respond`
- Actions: `accept`, `reject`, `counter_offer`
- Accept: Sets status to 'accepted', copies proposed values
- Reject: Sets status to 'rejected', requires reason
- Counter-offer: Keeps 'viewed' status, sets `counter_offer_status='pending'`

### Rejection Reasons Constants
- Predefined reasons: capacity, location, scope, timeline, price, other
- German labels and descriptions
- Shared between API and UI components

### Contractor UI Components
- **ResponseForm**: Main response interface with quick accept, counter-offer button, reject button
- **RejectModal**: Modal with reason selection, custom text for "other"
- **CounterOfferForm**: Side-by-side comparison with difference highlighting

### KEWA Admin Review
- **CounterOfferReview**: Shows when `counter_offer_status='pending'`
- Comparison table: KEWA offer vs contractor proposal
- Actions: Approve (accept counter-offer), Reject (send back), Close (cancel order)
- `POST /api/work-orders/[id]/counter-offer` admin endpoint

## Requirements Implemented

| Requirement | Description | Status |
|-------------|-------------|--------|
| EXT-07 | Accept/Reject buttons | Done |
| EXT-08 | Contractor can propose price with comment | Done |
| EXT-09 | Contractor can propose different dates | Done |
| EXT-10 | Question/comment field available | Done |

## API Endpoints

### Contractor Response
```
POST /api/contractor/[token]/[workOrderId]/respond
Body: {
  action: 'accept' | 'reject' | 'counter_offer',
  proposed_cost?: number,
  proposed_start_date?: string,
  proposed_end_date?: string,
  contractor_notes?: string,
  rejection_reason?: string  // required for reject
}
```

### Admin Counter-Offer Response
```
POST /api/work-orders/[id]/counter-offer
Body: {
  action: 'approve' | 'reject' | 'close',
  notes?: string
}
```

## Decisions Made

1. **Counter-offer pending state**: Counter-offers keep work order in 'viewed' status with separate `counter_offer_status='pending'`. This allows clear distinction between awaiting initial response vs awaiting KEWA decision.

2. **viewed->viewed transition**: Allow same-status transition for counter-offer updates. Contractor can submit multiple counter-offers if KEWA rejects first one.

3. **Rejection reasons as constant**: Centralized in `@/lib/contractor/constants.ts` for consistency across API validation and UI display.

4. **KEWA closes via rejection**: When KEWA closes a work order after counter-offer, it transitions to 'rejected' status with reason noting KEWA closure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type narrowing in contractor-upload.ts**
- Found during: Build verification
- Issue: Type inference failed for `allowedTypes.includes()` with union type
- Fix: Use specific `ALLOWED_MIME_TYPES.document` for document validation
- Note: This was a cross-plan fix (file from 09-04)

**2. [Rule 1 - Bug] Fixed session import in counter-offer API**
- Found during: Build verification
- Issue: `getSession` doesn't exist in session module
- Fix: Use `validateSession` with cookies() pattern

## Testing Notes

To verify:
1. Contractor can accept work order -> status changes to 'accepted'
2. Contractor can reject with reason -> status changes to 'rejected', reason recorded
3. Contractor can propose different price/dates -> counter_offer_status='pending'
4. KEWA can approve counter-offer -> status changes to 'accepted'
5. KEWA can reject counter-offer -> contractor can respond again
6. KEWA can close work order entirely

## Next Phase Readiness

- Counter-offer flow ready for integration with tracking (09-05)
- Response actions feed into event logging
- Admin review component ready for work order detail pages
