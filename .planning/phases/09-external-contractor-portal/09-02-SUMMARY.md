---
phase: 09
plan: 02
subsystem: contractor-portal
tags: [dashboard, magic-link, status-tracking, mobile-ui]
dependency-graph:
  requires:
    - 07-02 (work_orders table)
    - 07-04 (magic_link_tokens table)
    - 09-01 (work order types)
  provides:
    - contractor dashboard view
    - status-aware token validation
    - auto-viewed tracking
    - request-link workflow
  affects:
    - 09-03 (counter-offer flow uses dashboard)
    - 09-04 (contractor uploads extend dashboard)
tech-stack:
  patterns:
    - grouped-dashboard-sections
    - status-aware-expiry
    - client-side-tracking
key-files:
  created:
    - src/lib/contractor/queries.ts
    - src/app/contractor/[token]/dashboard-section.tsx
    - src/app/contractor/[token]/mark-viewed-tracker.tsx
    - src/app/contractor/[token]/request-link-form.tsx
    - src/app/contractor/[token]/[workOrderId]/page.tsx
    - src/app/contractor/[token]/contractor.css
    - src/app/api/contractor/[token]/mark-viewed/route.ts
    - src/app/api/contractor/[token]/status/route.ts
    - src/app/api/contractor/request-link/route.ts
  modified:
    - src/lib/magic-link.ts
    - src/app/contractor/[token]/page.tsx
    - src/app/contractor/[token]/work-order-card.tsx
    - src/app/contractor/[token]/token-error.tsx
    - src/app/contractor/[token]/layout.tsx
decisions:
  - Query by partner email to show ALL work orders (not single)
  - Status-aware token expiry (active work orders never time-expire)
  - Auto-mark 'sent' as 'viewed' on dashboard load
  - Compact card variant for dashboard list
  - Predefined rejection reasons with optional custom text
metrics:
  duration: ~45 minutes
  completed: 2026-01-18
---

# Phase 9 Plan 2: Contractor Dashboard Transformation Summary

Dashboard-based contractor portal showing ALL work orders grouped by status with auto-viewed tracking.

## What Was Built

### Contractor Queries Library (Task 1)
Created `src/lib/contractor/queries.ts` with:
- `getContractorWorkOrders(email)` - Fetches ALL work orders for partner email
- `groupWorkOrdersByStatus(workOrders)` - Groups into needsAction/inProgress/completed
- `getContractorWorkOrderById(id, email)` - Single work order with ownership check
- Uses Supabase `!inner` join on partners table for email filtering

### Status-Aware Token Validation (Task 2)
Enhanced `src/lib/magic-link.ts` with:
- `validateContractorAccess(token)` - New function for dashboard access
- Status-aware expiry: active work orders (viewed/accepted/in_progress) never time-expire
- Closed work orders return `work_order_closed` error
- Time-based expiry only applies to draft/sent status tokens

### Dashboard Page Transformation (Task 3)
Rewrote `src/app/contractor/[token]/page.tsx`:
- Queries ALL work orders by contractor email (not single work order)
- Groups work orders into three sections: action needed, in progress, completed
- Renders DashboardSection components for each group
- Includes MarkViewedTracker for auto-marking sent orders

### Dashboard Section Component (Task 4)
Created `src/app/contractor/[token]/dashboard-section.tsx`:
- Collapsible sections with count badges
- Color-coded headers: orange (action), purple (progress), gray (completed)
- Completed section collapsed by default
- Empty state handling

### Enhanced Work Order Card (Task 5)
Updated `src/app/contractor/[token]/work-order-card.tsx`:
- Added `variant` prop: 'compact' or 'full'
- Compact variant for dashboard list with pulsing action indicator
- Links to detail view page
- Predefined rejection reasons (capacity, location, scope, other)
- German translations for all labels

### Auto-Viewed Tracking (Task 6)
Created client component `mark-viewed-tracker.tsx` and API:
- `MarkViewedTracker` fires API call on mount
- `POST /api/contractor/[token]/mark-viewed` updates status and viewed_at
- Only updates orders in 'sent' status to 'viewed'

### Request Link Form (Task 7)
Created `src/app/contractor/[token]/request-link-form.tsx`:
- Shown for expired or closed work order tokens
- Email input for contractor contact
- Creates audit log entry via `/api/contractor/request-link`
- Shows confirmation message after submission

### Work Order Detail Route (Task 8)
Created `src/app/contractor/[token]/[workOrderId]/page.tsx`:
- Full work order details with all actions
- Back to dashboard link
- Status-specific action hints
- Validates contractor ownership via email

### Status Update API
Created `src/app/api/contractor/[token]/status/route.ts`:
- Validates token and contractor ownership
- Enforces valid status transitions
- Updates status-specific fields (accepted_at, rejected_at, etc.)

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Query by partner email | Shows ALL contractor work orders, not just token-linked one |
| Status-aware token expiry | Contractors can bookmark and return while work is active |
| Auto-mark viewed on load | Implements EXT-13 tracking requirement |
| Predefined rejection reasons | Standardizes rejection data for reporting |
| External CSS file | Avoids styled-jsx which requires client component |

## Requirements Addressed

- **EXT-06**: Portal displays details and attachments for work order
- **EXT-13**: Tracking - Viewed status set when magic link opened

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] styled-jsx build error**
- Found during: Build verification
- Issue: Next.js 16 requires styled-jsx in client components, layout.tsx is server
- Fix: Converted to external contractor.css file
- Commit: d85d435

**2. [Rule 3 - Blocking] Type export missing**
- Found during: Build verification
- Issue: DependencyType not exported from templates.ts
- Fix: Added re-export for API routes
- Commit: d85d435

**3. [Rule 3 - Blocking] Supabase nested relation type**
- Found during: Build verification
- Issue: !inner join returns array, code expected object
- Fix: Added Array.isArray check in tasks API
- Commit: d85d435

## Files Modified

### Created (9 files)
- `src/lib/contractor/queries.ts` - Contractor query utilities
- `src/app/contractor/[token]/dashboard-section.tsx` - Section component
- `src/app/contractor/[token]/mark-viewed-tracker.tsx` - Auto-viewed tracking
- `src/app/contractor/[token]/request-link-form.tsx` - Request new link form
- `src/app/contractor/[token]/[workOrderId]/page.tsx` - Detail page
- `src/app/contractor/[token]/contractor.css` - Mobile styles
- `src/app/api/contractor/[token]/mark-viewed/route.ts` - Mark viewed API
- `src/app/api/contractor/[token]/status/route.ts` - Status update API
- `src/app/api/contractor/request-link/route.ts` - Request link API

### Modified (5 files)
- `src/lib/magic-link.ts` - Added validateContractorAccess
- `src/app/contractor/[token]/page.tsx` - Dashboard transformation
- `src/app/contractor/[token]/work-order-card.tsx` - Compact/full variants
- `src/app/contractor/[token]/token-error.tsx` - work_order_closed error
- `src/app/contractor/[token]/layout.tsx` - CSS import

## Commits

| Hash | Message |
|------|---------|
| dd4e78d | feat(09-02): create contractor queries library |
| 8007604 | feat(09-02): add validateContractorAccess with status-aware expiry |
| 4db48cd | feat(09-02): transform contractor portal to dashboard view |
| d85d435 | fix(09-02): resolve build errors in contractor portal |

## Next Phase Readiness

Plan 09-02 complete. Portal now shows dashboard of ALL contractor work orders grouped by status.

**Ready for:**
- 09-03: Response Actions & Counter-Offer Flow (depends on dashboard)
- 09-04: Contractor File Uploads (extends dashboard)
