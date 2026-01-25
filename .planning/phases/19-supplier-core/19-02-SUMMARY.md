---
phase: 19-supplier-core
plan: 02
completed: 2026-01-25
duration: 12min

provides:
  - "Purchase order CRUD API with status workflow"
  - "Status utilities with German labels and transition validation"
  - "PurchaseOrderForm component for creating orders with line items"
  - "PurchaseOrderList component with status filtering and pagination"
  - "PurchaseOrderStatusBadge component"
  - "LineItemEditor reusable component"

tech-stack:
  patterns:
    - "Status transition validation in API before database trigger"
    - "Line item JSONB with auto-calculated totals"
    - "Supplier join in API responses"
    - "German labels for status display"

key-files:
  created:
    - src/lib/suppliers/status-utils.ts
    - src/lib/suppliers/purchase-order-queries.ts
    - src/app/api/purchase-orders/route.ts
    - src/app/api/purchase-orders/[id]/route.ts
    - src/app/api/purchase-orders/[id]/status/route.ts
    - src/components/suppliers/PurchaseOrderStatusBadge.tsx
    - src/components/suppliers/LineItemEditor.tsx
    - src/components/suppliers/PurchaseOrderForm.tsx
    - src/components/suppliers/PurchaseOrderList.tsx
    - src/components/suppliers/index.ts
---

# Phase 19 Plan 02: Purchase Order CRUD Summary

Purchase order CRUD operations with status workflow, including API endpoints and UI components.

## What Was Built

### Status Utilities (src/lib/suppliers/status-utils.ts)

- German labels: Entwurf, Bestellt, Bestaetigt, Geliefert, Verrechnet, Storniert
- Tailwind colors for each status (gray, blue, purple, green, gray, red)
- Valid transitions: draft->ordered->confirmed->delivered->invoiced
- Cancellation allowed from draft, ordered, confirmed states
- `canTransitionTo()` function for validation
- `getNextActions()` for UI action buttons

### Query Helpers (src/lib/suppliers/purchase-order-queries.ts)

- `calculateLineItemsTotal()` - sum line items
- `createLineItem()` / `updateLineItem()` - with auto-calculated totals
- `createEmptyLineItem()` - for form initialization
- `formatCHF()` / `formatSwissDate()` - Swiss formatting
- `DEFAULT_UNITS` - Stueck, Stunden, Meter, m2, m3, kg, Liter, Pauschal

### API Endpoints

**GET /api/purchase-orders**
- Query params: supplier_id, status, limit, offset
- Returns purchase_orders with supplier join, total count
- Ordered by created_at DESC

**POST /api/purchase-orders**
- Creates new purchase order with line items
- Validates supplier exists and is type='supplier'
- Generates order number via RPC
- Calculates total from line items

**GET/PATCH/DELETE /api/purchase-orders/[id]**
- GET: Returns single PO with supplier join
- PATCH: Updates line_items, expected_delivery_date, notes (NOT status)
- DELETE: Only if status='draft'

**POST /api/purchase-orders/[id]/status**
- Validates transition using `canTransitionTo()`
- Returns German error message with valid transitions if invalid
- Database trigger sets timestamps automatically

### UI Components

**PurchaseOrderStatusBadge (34 lines)**
- Simple badge with German label and color
- Size variants: sm, md

**LineItemEditor (169 lines)**
- Add/edit/remove line items
- Auto-calculated totals
- Unit dropdown (Stueck, Stunden, etc.)
- Read-only mode support

**PurchaseOrderForm (292 lines)**
- Supplier dropdown (fetches active suppliers)
- Expected delivery date input
- Line items editor integration
- Total amount display
- Notes textarea
- Creates via POST /api/purchase-orders

**PurchaseOrderList (283 lines)**
- Status filter dropdown
- Pagination with Zurueck/Weiter buttons
- Skeleton loading state
- Click row to navigate to detail
- Empty state message

## Verification

- [x] TypeScript: `npx tsc --noEmit` passes
- [x] PurchaseOrderForm.tsx > 100 lines (292)
- [x] PurchaseOrderList.tsx > 80 lines (283)
- [x] Key link: PurchaseOrderForm -> /api/purchase-orders via fetch POST
- [x] Key link: Status route -> canTransitionTo from status-utils

## Commits

| Hash | Description |
|------|-------------|
| 47af459 | Status utilities and query helpers |
| e71db36 | Purchase order API routes |
| c1e8add | Purchase order UI components |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 19-03 (Delivery Tracking). Provides:
- Complete purchase order CRUD with status workflow
- Reusable LineItemEditor for delivery forms
- Status transition logic for delivery integration
