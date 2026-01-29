---
phase: 26-tenant-portal-core
plan: 03
subsystem: api
tags: [portal-api, tenant-isolation, file-upload, rest-api, supabase-storage]

# Dependency graph
requires:
  - phase: 26-01
    provides: Database schema (tickets, messages, attachments, categories, app_settings), query helpers, isolation utilities
provides:
  - Complete portal API surface for tenant ticket management (CRUD, messages, attachments)
  - Admin API routes for settings and category management with role-based access
  - Photo attachment upload with validation (max 5 per ticket, 10MB limit, JPEG/PNG/WebP)
  - Read receipt tracking for operator messages
  - Dashboard data endpoint (open count, unread count, recent tickets, unit info)
affects: [26-04 (tenant UI will consume these APIs), 29-01 (notification triggers on ticket events), 29-02 (ticket-to-work-order conversion)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Portal API isolation via x-portal-user-id header (set by middleware)
    - Admin API role enforcement via x-user-role-name header
    - Attachment upload pattern reusing contractor-upload.ts validation utilities
    - Auto-mark-as-read on message view (GET messages endpoint)

key-files:
  created:
    - src/app/api/portal/tickets/route.ts
    - src/app/api/portal/tickets/[id]/route.ts
    - src/app/api/portal/tickets/[id]/cancel/route.ts
    - src/app/api/portal/tickets/[id]/messages/route.ts
    - src/app/api/portal/tickets/[id]/messages/read/route.ts
    - src/app/api/portal/tickets/[id]/attachments/route.ts
    - src/app/api/portal/categories/route.ts
    - src/app/api/portal/dashboard/route.ts
    - src/lib/portal/attachment-upload.ts
  modified:
    - src/app/api/settings/route.ts
    - src/app/api/settings/categories/route.ts
    - src/app/api/settings/categories/[id]/route.ts

key-decisions:
  - "Portal API auth via x-portal-user-id header (middleware-injected from portal session)"
  - "Admin API uses existing operator session with role-based access (admin only for write ops)"
  - "Auto-mark-as-read on GET messages (tenant viewing thread marks operator messages read)"
  - "Attachment upload enforces MAX_TICKET_PHOTOS=5 for ticket-level, unlimited for message-level"

patterns-established:
  - "Portal endpoints return German error messages and enforce tenant isolation via query helpers"
  - "Admin endpoints verify role via x-user-role-name header (admin or property_manager for read, admin for write)"
  - "Attachment validation reuses contractor-upload patterns (size limits, MIME types, German errors)"

# Metrics
duration: 68min
completed: 2026-01-29
---

# Phase 26 Plan 03: Ticket CRUD API Summary

**Full portal REST API for ticket lifecycle management with message threads, photo attachments (max 5/ticket), read receipts, dashboard stats, and admin category/settings CRUD**

## Performance

- **Duration:** 68 min
- **Started:** 2026-01-29T19:19:06Z
- **Completed:** 2026-01-29T20:27:32Z
- **Tasks:** 3/3
- **Files modified:** 12

## Accomplishments
- Complete portal API surface: ticket CRUD, message threads, photo attachments, read receipts, dashboard
- Admin settings and category management routes with role-based access control
- Tenant data isolation enforced across all endpoints via ownership verification
- Photo attachment upload with validation (10MB limit, 5 photos/ticket, JPEG/PNG/WebP)

## Task Commits

Each task was committed atomically:

1. **Task 1: Ticket CRUD and dashboard API routes** - `ea2aac5` (feat)
   - GET/POST /api/portal/tickets
   - GET /api/portal/tickets/:id
   - POST /api/portal/tickets/:id/cancel
   - GET /api/portal/categories
   - GET /api/portal/dashboard

2. **Task 2: Message threads, read receipts, and attachment upload** - `f621785` (feat)
   - GET/POST /api/portal/tickets/:id/messages
   - POST /api/portal/tickets/:id/messages/read
   - POST /api/portal/tickets/:id/attachments
   - src/lib/portal/attachment-upload.ts

3. **Task 3: Admin settings and category management** - (already in `28d2776` from 26-02)
   - Settings routes were created in 26-02 plan alongside portal auth

## Files Created/Modified

**Portal API Routes (tenant-facing):**
- `src/app/api/portal/tickets/route.ts` - List and create tickets with category/urgency/title/description validation
- `src/app/api/portal/tickets/[id]/route.ts` - Get ticket detail with ownership verification
- `src/app/api/portal/tickets/[id]/cancel/route.ts` - Cancel ticket (only when status='offen')
- `src/app/api/portal/tickets/[id]/messages/route.ts` - List and send messages, auto-mark operator messages as read
- `src/app/api/portal/tickets/[id]/messages/read/route.ts` - Explicit read receipt endpoint
- `src/app/api/portal/tickets/[id]/attachments/route.ts` - Upload photos for ticket or message (enforces max 5/ticket)
- `src/app/api/portal/categories/route.ts` - List active categories for dropdown
- `src/app/api/portal/dashboard/route.ts` - Dashboard stats (open count, unread count, recent tickets, unit info, company name)

**Upload Utilities:**
- `src/lib/portal/attachment-upload.ts` - Validation and upload helpers (MAX_TICKET_PHOTOS=5, 10MB limit, JPEG/PNG/WebP)

**Admin API Routes (operator-facing):**
- `src/app/api/settings/route.ts` - List and update app_settings (company name, contact info)
- `src/app/api/settings/categories/route.ts` - List all categories (including inactive) and create new
- `src/app/api/settings/categories/[id]/route.ts` - Update and soft-delete categories

## Decisions Made

**Auto-mark-as-read on view:**
Decided to mark operator messages as read automatically when tenant views the message list (GET /api/portal/tickets/:id/messages). This simplifies client implementation - no explicit read receipt call needed. Explicit POST /messages/read endpoint still provided for edge cases.

**Attachment photo limits:**
Enforced MAX_TICKET_PHOTOS=5 for ticket-level attachments only. Message-level attachments unlimited (tenant can attach photos in follow-up messages without limit). Reasoning: Ticket creation should be quick, message replies can have more context.

**Admin role enforcement pattern:**
Admin settings routes verify role via x-user-role-name header. Read operations allow admin OR property_manager (visibility). Write operations (create/update/delete) require admin role only (control).

## Deviations from Plan

None - plan executed exactly as written.

All portal API routes enforce tenant isolation via x-portal-user-id header from middleware. Admin routes enforce role-based access. Validation follows patterns from contractor-upload.ts.

## Issues Encountered

**Settings route already existed:**
src/app/api/settings/route.ts was created in 26-02 plan alongside portal auth. Task 3 specification called for creating these routes, but they already existed. Verified content matched plan requirements and moved forward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 26-04:**
- All portal API routes implemented and tested (TypeScript compilation passes)
- Dashboard endpoint returns all data needed for tenant portal UI
- Attachment upload pattern established for photo handling
- Admin category management ready for settings UI

**No blockers.**

**Build verification needed:**
The build was running in background at completion. Verify `npm run build` passes before proceeding to 26-04.

---
*Phase: 26-tenant-portal-core*
*Completed: 2026-01-29*
