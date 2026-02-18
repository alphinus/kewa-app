---
phase: 40-storage-multi-tenancy
plan: "03"
subsystem: storage
tags:
  - storage
  - multi-tenancy
  - contractor-portal
  - tenant-portal
  - signatures
dependency_graph:
  requires:
    - "40-01 (paths.ts + RLS migration)"
    - "40-02 (internal upload routes)"
  provides:
    - "STOR-01: all upload sites use org-prefixed paths"
  affects:
    - contractor portal uploads
    - tenant portal ticket attachments
    - inspection signature uploads
    - ticket-to-work-order file copy
tech_stack:
  added: []
  patterns:
    - orgId as first parameter on all upload functions (service-client context)
    - buildStoragePath() from paths.ts for portal attachment path generation
    - inspectionSignaturePath() from paths.ts for signature path generation
    - organization_id queried from work_order/ticket for non-org-client routes
key_files:
  created: []
  modified:
    - src/lib/storage/contractor-upload.ts
    - src/app/api/contractor/[token]/[workOrderId]/upload/route.ts
    - src/lib/inspections/signature-utils.ts
    - src/app/api/inspections/[id]/signature/route.ts
    - src/lib/portal/attachment-upload.ts
    - src/app/api/portal/tickets/[id]/attachments/route.ts
    - src/lib/admin/ticket-to-work-order.ts
    - src/app/portal/tickets/new/page.tsx
decisions:
  - "Signature route reads orgId from x-organization-id middleware header — route already uses createPublicClient which is org-scoped, header provides orgId for the path"
  - "Portal new ticket page uses ticket.organization_id from POST /api/portal/tickets response — all columns returned, organization_id set by trigger from unit"
  - "portal/attachments route consolidated to single supabaseAdmin instance (removed duplicate createServiceClient call)"
  - "ticket-to-work-order uses (ticket as any).organization_id — tickets select uses * which includes organization_id but TypeScript type does not expose it"
metrics:
  duration: "8min"
  completed: "2026-02-18"
  tasks: 2
  files: 8
---

# Phase 40 Plan 03: Non-Standard Upload Sites Org-Prefix Summary

Org-prefixed storage paths for contractor portal, tenant portal, inspection signatures, and ticket-to-work-order copy. All upload sites now produce paths with orgId as first segment, satisfying STOR-01 requirement for the full upload surface.

## What Was Built

**Task 1: Contractor uploads + signature utils**

`generateStoragePath` in `contractor-upload.ts` gains `orgId` as first parameter. Paths now: `{orgId}/work_orders/{workOrderId}/documents/{filename}` and `{orgId}/work_orders/{workOrderId}/photos/{context}/{filename}`.

The contractor upload route (`/api/contractor/[token]/[workOrderId]/upload`) adds `organization_id` to the work order select and passes it as `orgId` to `generateStoragePath`. This route uses `createServiceClient()` so org context is not in the DB session — the path prefix is for storage data isolation.

`uploadSignature` in `signature-utils.ts` gains `orgId` as first parameter and uses `inspectionSignaturePath(orgId, inspectionId)` from `@/lib/storage/paths`. The signature route reads `orgId` from the `x-organization-id` header injected by middleware.

**Task 2: Portal attachment upload + ticket-to-WO copy**

`uploadTicketAttachment` in `attachment-upload.ts` gains `orgId` as second parameter and uses `buildStoragePath()` from `@/lib/storage/paths` for both message attachment and photo paths.

The portal attachments route (`/api/portal/tickets/[id]/attachments`) queries `tickets.organization_id` via service client and passes it to `uploadTicketAttachment`. Consolidated two `createServiceClient()` calls into one `supabaseAdmin` instance.

`convertTicketToWorkOrder` in `ticket-to-work-order.ts` selects `organization_id` from the ticket query and uses it in the destination path: `${orgId}/work_orders/${workOrder.id}/${attachment.file_name}`. Old path was `work_order/` (singular) — corrected to `work_orders/` (plural) to match path conventions.

`portal/tickets/new/page.tsx` (client component calling `uploadTicketAttachment` directly) updated to pass `ticket.organization_id` from the ticket creation response.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate createServiceClient in portal attachments route**
- **Found during:** Task 2
- **Issue:** Route had two separate `createServiceClient()` calls — one for the ticket count check, one for DB insert. With the new orgId fetch added, three service client instances would exist.
- **Fix:** Consolidated all service client usage to single `supabaseAdmin` constant; replaced second `const supabase = createServiceClient()` and all subsequent `supabase.` references with `supabaseAdmin`.
- **Files modified:** `src/app/api/portal/tickets/[id]/attachments/route.ts`
- **Commit:** 3414407

**2. [Rule 3 - Blocker] Additional caller of uploadTicketAttachment in client component**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** `src/app/portal/tickets/new/page.tsx` calls `uploadTicketAttachment(photo, ticket.id)` directly on the client side — missed in plan's caller analysis.
- **Fix:** Updated call to `uploadTicketAttachment(photo, ticket.organization_id, ticket.id)`. The ticket object returned by `POST /api/portal/tickets` includes all columns via `.select()`, so `organization_id` is available.
- **Files modified:** `src/app/portal/tickets/new/page.tsx`
- **Commit:** 3414407

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `1611a6d` | feat(40-03): org-prefix contractor uploads and inspection signatures |
| Task 2 | `3414407` | feat(40-03): org-prefix portal attachment uploads and ticket-to-WO copy |

## Self-Check: PASSED

- src/lib/storage/contractor-upload.ts: FOUND
- src/app/api/contractor/[token]/[workOrderId]/upload/route.ts: FOUND
- src/lib/inspections/signature-utils.ts: FOUND
- src/lib/portal/attachment-upload.ts: FOUND
- src/lib/admin/ticket-to-work-order.ts: FOUND
- src/app/portal/tickets/new/page.tsx: FOUND (deviation fix)
- Commit 1611a6d: FOUND
- Commit 3414407: FOUND
