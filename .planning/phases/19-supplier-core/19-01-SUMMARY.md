---
phase: 19-supplier-core
plan: 01
completed: 2026-01-25
duration: 5min

provides:
  - "purchase_orders table with status workflow and order number generation"
  - "deliveries table with quantity variance tracking"
  - "TypeScript types for PurchaseOrder, Delivery, line items"
  - "GET /api/suppliers endpoint"

tech-stack:
  patterns:
    - "Status enum with FSM trigger validation"
    - "JSONB line_items (offers pattern)"
    - "Generated computed column (has_variance)"
    - "Constraint for hierarchical FK (building requires property)"

key-files:
  created:
    - supabase/migrations/051_purchase_orders.sql
    - supabase/migrations/052_deliveries.sql
    - src/types/suppliers.ts
    - src/app/api/suppliers/route.ts
---

# Phase 19 Plan 01: Data Model Foundation Summary

Database schema for supplier purchase orders and deliveries, with TypeScript types and supplier listing API.

## What Was Built

### Database Schema

**purchase_orders table:**
- Status enum: draft, ordered, confirmed, delivered, invoiced, cancelled
- Order number sequence: PO-YYYY-NNNNN (e.g., PO-2026-00001)
- Line items as JSONB array matching offers pattern
- Status transition trigger with timestamp auto-set
- Indexes on supplier_id, status, expected_delivery_date

**deliveries table:**
- Links to purchase_orders with foreign key
- Quantity tracking: ordered vs received
- `has_variance` computed column (auto-detects mismatches)
- Property/building association with constraint
- Invoice linkage for billing integration

### TypeScript Types

- `PurchaseOrderStatus` enum type
- `PurchaseOrderLineItem` interface
- `PurchaseOrder` entity with optional supplier join
- `Delivery` entity with optional joins for PO, property, building, invoice
- Input types: `CreatePurchaseOrderInput`, `CreateDeliveryInput`, etc.
- Response types: `SuppliersResponse`, `PurchaseOrdersResponse`, `DeliveriesResponse`

### API Endpoint

- `GET /api/suppliers` - Lists partners filtered by `partner_type='supplier'`
- Supports `is_active`, `limit`, `offset` query params
- Auth-protected (kewa, imeri roles)

## Verification

- [x] TypeScript compilation: `npx tsc --noEmit` passes
- [x] Purchase orders migration: syntax validated
- [x] Deliveries migration: syntax validated
- [ ] Database reset: Requires Docker (not available in this environment)

## Commits

| Hash | Description |
|------|-------------|
| fda29a1 | purchase_orders table with status workflow |
| f994425 | deliveries table with variance tracking |
| 144688e | TypeScript types and supplier API endpoint |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 19-02 (Purchase Order CRUD API). Provides:
- Database tables for purchase orders and deliveries
- TypeScript types for API layer
- Supplier listing endpoint for PO creation forms
