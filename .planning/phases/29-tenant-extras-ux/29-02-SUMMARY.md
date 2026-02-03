---
phase: 29-tenant-extras-ux
plan: 02
subsystem: portal
tags: [ticket-conversion, profile-management, admin-ui, portal]
depends_on:
  requires: [29-01]
  provides: [ticket-to-work-order-api, profile-api, admin-ticket-detail]
  affects: [29-03]
tech-stack:
  added: []
  patterns: [service-function-pattern, dialog-component, form-validation-on-blur]
files:
  key-files:
    created:
      - supabase/migrations/070_ticket_work_order_link.sql
      - src/lib/admin/ticket-to-work-order.ts
      - src/app/api/admin/tickets/[id]/convert-to-wo/route.ts
      - src/app/api/admin/tickets/[id]/route.ts
      - src/components/admin/TicketConvertDialog.tsx
      - src/app/(dashboard)/dashboard/tickets/[id]/page.tsx
      - src/app/api/portal/profile/route.ts
      - src/app/portal/profile/page.tsx
      - src/components/portal/ProfileForm.tsx
    modified:
      - src/types/portal.ts
      - src/app/api/admin/tickets/route.ts
decisions:
  - id: work-order-type-manual
    context: Converting tickets to work orders
    decision: Operator manually selects work order type via dropdown
    rationale: No auto-mapping from ticket category per CONTEXT.md
  - id: photo-copy-not-link
    context: Ticket attachments during conversion
    decision: Copy files to new storage path, create new media records
    rationale: Work orders have independent lifecycle from tickets
  - id: phone-column-existing
    context: Profile updates
    decision: Use existing phone column on users table
    rationale: Phone column exists from initial schema
metrics:
  duration: 30min
  completed: 2026-02-03
---

# Phase 29 Plan 02: Ticket Conversion & Profile Management Summary

TPRT-12 ticket-to-work-order conversion and TPRT-13 tenant profile management.

## One-liner

Ticket-to-work-order conversion with photo copying, admin ticket detail page, and tenant profile form with phone/emergency contact editing.

## Delivered

### Database

- `ticket_work_orders` link table for conversion tracking
- Extended `tickets` table with `converted_to_wo_id` and `conversion_message` columns

### Conversion Service

- `convertTicketToWorkOrder()` service function in `src/lib/admin/ticket-to-work-order.ts`
- Validates ticket status (offen/in_bearbeitung only)
- Creates work order with operator-selected type and partner
- Copies ticket photos using Supabase storage.copy()
- Creates media records for copied files
- Links ticket to work order in tracking table
- Auto-closes ticket with German confirmation message

### Admin APIs

- `POST /api/admin/tickets/[id]/convert-to-wo` - Conversion endpoint
- `GET /api/admin/tickets/[id]` - Single ticket with full details and messages
- `PATCH /api/admin/tickets/[id]` - Update assigned_to
- Enhanced `GET /api/admin/tickets` with pagination and urgency ordering

### Admin UI

- `TicketConvertDialog` component with work order type and partner selectors
- Admin ticket detail page at `/dashboard/tickets/[id]`
- Conversion button visible only for convertible tickets
- "Bereits umgewandelt" badge for converted tickets
- Message thread display with attachments

### Profile APIs

- `GET /api/portal/profile` - Tenant profile with unit info
- `PATCH /api/portal/profile` - Update phone (email read-only)
- Phone validation with regex

### Profile UI

- Profile page at `/portal/profile`
- `ProfileForm` component with editable phone and emergency contact fields
- Read-only email, name, and unit displayed in gray boxes
- Validation on blur + submit with German error messages
- Toast feedback on save success/failure

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Manual work order type selection | CONTEXT.md specifies no auto-mapping from ticket category |
| Photo copy not link | Work orders have independent lifecycle, photos must persist |
| Use existing phone column | users table already has phone column from initial schema |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 29-03 (UX improvements) can proceed. No blockers.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 7aa89d7 | feat | Database schema and conversion service |
| ebc2e72 | feat | Admin ticket API endpoints |
| 6dd6919 | feat | Conversion UI and profile management |
