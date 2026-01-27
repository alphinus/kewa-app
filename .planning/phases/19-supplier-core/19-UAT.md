# Phase 19: Supplier Core — User Acceptance Testing

**Started:** 2026-01-25
**Completed:** 2026-01-27
**Status:** PASSED (with notes)

## Success Criteria (from ROADMAP.md)

1. User can create a supplier (as Partner with type='supplier') with contact info
2. User can create a purchase order with line items, quantities, and delivery date
3. User can record delivery confirmation with actual quantities and delivery note
4. User can link deliveries to invoices for payment tracking
5. User can view order history per supplier and per property

## Test Results

| # | Test | Expected | Status | Notes |
|---|------|----------|--------|-------|
| 1 | Create supplier | Partner form with type='supplier', saved to DB | PASS | Fixed: inline SupplierForm on lieferanten page, added footer nav |
| 2 | Create purchase order | PO with line items, delivery date, order number generated | PASS | Fixed: DB migrations applied, route conflict resolved |
| 3 | Record delivery | Delivery form with quantities, variance detection | PASS | Status transitions (draft->ordered->confirmed->delivered) all work, delivery recorded with property/building assignment |
| 4 | Link delivery to invoice | Invoice association on delivery record | PARTIAL | API validates correctly (UUID format, invoice existence, supplier match). prompt() placeholder needs proper modal when invoice module is built |
| 5 | View supplier order history | Orders listed per supplier with expandable details | PASS | Supplier detail page shows contact info, stats (total/delivered/open/revenue), full order history table |
| 6 | View property order history | Orders listed per property | PARTIAL | Data model supports property_id on deliveries, DeliveryList accepts propertyId prop. No dedicated property-level delivery history UI yet |

## Session Log

- Test 1: PASS - Supplier creation via inline form on lieferanten page
- Test 2: PASS - PO created after DB migration fix and route conflict resolution
- Test 3: PASS - Full status workflow tested: Entwurf -> Bestellt -> Bestaetigt -> Geliefert. Delivery recorded with date, delivery note number, quantity, property, building
- Test 4: PARTIAL - Invoice linking API works but requires UUID input. Uses window.prompt() as placeholder. Needs invoice module for full test
- Test 5: PASS - Supplier detail page shows 4 orders, 1 delivered, 3 open, CHF 372.00 total
- Test 6: PARTIAL - Deliveries store property_id but no dedicated property history page exists

## Issues Found & Fixed

| # | Severity | Description | Root Cause | Fix |
|---|----------|-------------|------------|-----|
| 1 | Medium | "Neuer Lieferant" creates contractor | PartnerForm ignores create param | Replaced with inline SupplierForm on lieferanten page |
| 2 | Medium | Lieferanten hidden in UI | No footer nav entry | Added Truck icon + link to mobile-nav.tsx |
| 3 | Critical | DB tables missing | Migrations 051/052 never applied | Applied manually + migration history repaired |
| 4 | Critical | Next.js route conflict | [buildingId] vs [id] slug under /api/buildings/ | Moved heatmap route to [id]/heatmap/, deleted [buildingId] dir |
| 5 | Critical | Status transition trigger error | Windows \r in JSON string | Created migration 053_fix_status_trigger.sql, pushed via CLI |
| 6 | Low | Invoice link uses prompt() | Placeholder implementation | Needs proper modal + invoice module (future phase) |
| 7 | Low | No property delivery history page | Not implemented in Phase 19 scope | Data model ready, UI needs dedicated page (future phase) |

## Verdict

Phase 19 Supplier Core is **ACCEPTED** with notes:
- Core CRUD (suppliers, purchase orders, deliveries) works end-to-end
- Status transition FSM (draft->ordered->confirmed->delivered->invoiced) validated
- Invoice linking mechanism built but depends on future invoice module
- Property-level delivery view needs dedicated UI page in future phase

---
*Phase: 19-supplier-core*
