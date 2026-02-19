---
phase: 40-storage-multi-tenancy
verified: 2026-02-18T00:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 9/11
  gaps_closed:
    - "Tenant portal ticket attachments store files at {orgId}/tickets/{ticketId}/... path"
    - "Inspection signatures store files at {orgId}/inspections/{inspectionId}/signature.png"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open a tenant portal ticket, open a message thread, attach a photo via the message reply input, submit"
    expected: "Photo uploaded and stored at {orgId}/tickets/{ticketId}/messages/{messageId}/{uuid}.ext — visible in thread"
    why_human: "Client component with file state and authenticated fetch chain; cannot be exercised by grep"
  - test: "Complete an inspection, capture a signature"
    expected: "Signature stored at {orgId}/inspections/{inspectionId}/signature.png, signed URL returned and rendered immediately"
    why_human: "Requires org context, completed inspection state, and canvas capture — cannot be grepped"
---

# Phase 40: Storage Multi-Tenancy Verification Report

**Phase Goal:** File storage is organization-isolated with RLS enforcement on storage buckets
**Verified:** 2026-02-18
**Status:** passed
**Re-verification:** Yes — after gap closure (previous score 9/11, now 11/11)

## Re-verification Summary

Both gaps from the initial verification are confirmed fixed:

**Gap 1 — MessageInput.tsx missing orgId (was: Blocker, now: CLOSED)**

`src/components/portal/MessageInput.tsx` now declares `orgId: string` in `MessageInputProps` (line 10) and the component signature at line 19. The call at line 76 is `uploadTicketAttachment(file, orgId, ticketId, messageId)` — argument order is correct. The single caller at `src/app/portal/tickets/[id]/page.tsx` line 152-153 passes `orgId={ticket.organization_id}`. The chain is fully wired.

**Gap 2 — Signature route empty string fallback (was: Warning, now: CLOSED)**

`src/app/api/inspections/[id]/signature/route.ts` lines 70-73 now read:
```
const orgId = req.headers.get('x-organization-id')
if (!orgId) {
  return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
}
```
No `|| ''` fallback. Hard 401 guard identical to all other upload routes.

**No regressions detected.** Previously verified artifacts (paths.ts, 084_storage_rls.sql, six internal API routes, contractor upload, ticket-to-WO copy, migration script) are unchanged.

---

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | buildStoragePath(orgId, ...segments) returns orgId as first path segment | VERIFIED | paths.ts line 31: `[orgId, ...segments].join('/')` |
| 2   | Storage RLS policies on all 4 buckets enforce (storage.foldername(name))[1] = current_organization_id()::text | VERIFIED | 084_storage_rls.sql: 16 CREATE POLICY statements, all 4 buckets, exact pattern confirmed |
| 3   | Old unscoped storage policies from 041 and 059 are dropped | VERIFIED | 084_storage_rls.sql: 8 DROP POLICY IF EXISTS statements for all legacy policies |
| 4   | Task photo uploads store files at {orgId}/{taskId}/{photoType}/{uuid}.{ext} | VERIFIED | api/photos/route.ts line 239: `taskPhotoPath(orgId, taskId, photoType, fileId, extension)`, orgId guarded at line 152-154 |
| 5   | Task audio uploads store files at {orgId}/{taskId}/{audioType}/{uuid}.{ext} | VERIFIED | api/audio/route.ts: `taskAudioPath(orgId, taskId, audioType, fileId, extension)`, same guard pattern |
| 6   | Change order photo uploads store files at {orgId}/change_orders/{coId}/photos/{ts}-{name} | VERIFIED | change-orders/[id]/photos/route.ts: `changeOrderPhotoPath(orgId, id, timestamp, filename)` with orgId guard |
| 7   | KB attachment uploads store files at {orgId}/kb_articles/{articleId}/attachments/{uuid}.{ext} | VERIFIED | knowledge/[id]/attachments/route.ts: `kbAttachmentPath(orgId, articleId, fileId, ext)` with orgId guard |
| 8   | Inspection item photo uploads store files at {orgId}/{inspectionId}/items/{uuid}.webp | VERIFIED | inspections/[id]/photos/route.ts: `inspectionItemPhotoPath(orgId, id, uuid)` with orgId guard |
| 9   | Inspection defect photo uploads store files at {orgId}/{inspectionId}/defects/{uuid}.webp | VERIFIED | inspections/[id]/defects/[defectId]/photos/route.ts: `inspectionDefectPhotoPath(orgId, id, uuid)` with orgId guard |
| 10  | Contractor uploads store files at {orgId}/work_orders/{woId}/... path | VERIFIED | contractor-upload.ts: orgId as first param to generateStoragePath, orgId from workOrder.organization_id |
| 11  | Tenant portal ticket attachments store files at {orgId}/tickets/{ticketId}/... path | VERIFIED | MessageInput.tsx line 76: `uploadTicketAttachment(file, orgId, ticketId, messageId)` — orgId prop now present; attachments/route.ts line 101: same call with orgId from ticket.organization_id |
| 12  | Inspection signatures store files at {orgId}/inspections/{inspectionId}/signature.png | VERIFIED | signature/route.ts lines 70-73: hard 401 guard, no `\|\| ''` fallback; signature-utils.ts line 39: `inspectionSignaturePath(orgId, inspectionId)` |
| 13  | Ticket-to-work-order file copy uses org-prefixed destination paths | VERIFIED | ticket-to-work-order.ts: destPath with orgId from ticket.organization_id as first segment |
| 14  | All existing files in buckets are copied to org-prefixed paths (migration script) | VERIFIED | migrate_storage_paths.ts: recursive listing, idempotency check, copy+remove per file across all 4 buckets |
| 15  | All DB records with storage_path columns are updated to org-prefixed paths | VERIFIED | migrate_storage_paths.ts: covers task_photos, task_audio, media, kb_attachments, ticket_attachments, change_order_photos |
| 16  | JSONB checklist_items photo_storage_paths updated | VERIFIED | migrate_storage_paths.ts: migrateChecklistItemPhotos() with in-memory mutation + update |
| 17  | Old files at non-prefixed paths are removed after successful copy | VERIFIED | migrate_storage_paths.ts: remove() called after copy(), non-fatal on remove failure |

**Score:** 11/11 plan truths verified (2 previously failed, now verified)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/storage/paths.ts` | Centralised org-prefixed path builder | VERIFIED | All 12 exports: BUCKETS, BucketName, buildStoragePath, and 9 typed builders |
| `supabase/migrations/084_storage_rls.sql` | Storage RLS policies for 4 buckets | VERIFIED | 8 DROPs + 16 CREATEs, all use current_organization_id() |
| `src/app/api/photos/route.ts` | Org-prefixed task photo uploads | VERIFIED | taskPhotoPath import, orgId guard, path builder usage |
| `src/app/api/audio/route.ts` | Org-prefixed task audio uploads | VERIFIED | taskAudioPath import, orgId guard, path builder usage |
| `src/app/api/change-orders/[id]/photos/route.ts` | Org-prefixed change order photo uploads | VERIFIED | changeOrderPhotoPath import, orgId guard |
| `src/app/api/knowledge/[id]/attachments/route.ts` | Org-prefixed KB attachment uploads | VERIFIED | kbAttachmentPath import, orgId guard |
| `src/app/api/inspections/[id]/photos/route.ts` | Org-prefixed inspection item photo uploads | VERIFIED | inspectionItemPhotoPath import, orgId guard |
| `src/app/api/inspections/[id]/defects/[defectId]/photos/route.ts` | Org-prefixed inspection defect photo uploads | VERIFIED | inspectionDefectPhotoPath import, orgId guard |
| `src/lib/storage/contractor-upload.ts` | Org-prefixed contractor upload path generation | VERIFIED | orgId as first param to generateStoragePath |
| `src/lib/portal/attachment-upload.ts` | Org-prefixed portal ticket attachment uploads | VERIFIED | uploadTicketAttachment(file, orgId, ticketId, messageId?), buildStoragePath used |
| `src/lib/inspections/signature-utils.ts` | Org-prefixed signature upload | VERIFIED | inspectionSignaturePath(orgId, inspectionId) at line 39 |
| `src/lib/admin/ticket-to-work-order.ts` | Org-prefixed ticket-to-WO copy destination | VERIFIED | orgId from ticket.organization_id, destPath with orgId prefix |
| `supabase/scripts/migrate_storage_paths.ts` | One-shot migration script | VERIFIED | All 4 buckets, 6 tables, JSONB and array path types, idempotent |
| `src/components/portal/MessageInput.tsx` | Portal message reply attachment upload | VERIFIED | orgId prop added, uploadTicketAttachment(file, orgId, ticketId, messageId) — gap closed |
| `src/app/api/inspections/[id]/signature/route.ts` | Signature upload with orgId guard | VERIFIED | Hard 401 guard at lines 70-73, `\|\| ''` fallback removed — gap closed |

---

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| src/lib/storage/paths.ts | storage buckets | `[orgId, ...segments].join('/')` | WIRED | buildStoragePath line 31; orgId always first segment |
| supabase/migrations/084_storage_rls.sql | 076_rls_helpers.sql | current_organization_id() | WIRED | All 16 policies call current_organization_id()::text |
| src/app/api/photos/route.ts | src/lib/storage/paths.ts | import taskPhotoPath | WIRED | Line 3 import, line 239 usage |
| src/app/api/inspections/[id]/photos/route.ts | src/lib/storage/paths.ts | import inspectionItemPhotoPath | WIRED | Import and usage confirmed |
| src/app/api/contractor/[token]/[workOrderId]/upload/route.ts | src/lib/storage/contractor-upload.ts | generateStoragePath with orgId | WIRED | orgId from workOrder.organization_id passed as first arg |
| src/lib/portal/attachment-upload.ts | src/lib/storage/paths.ts | import buildStoragePath | WIRED | Import confirmed, lines 137-139 usage |
| src/components/portal/MessageInput.tsx | src/lib/portal/attachment-upload.ts | uploadTicketAttachment(file, orgId, ticketId, messageId) | WIRED | Line 76: correct 4-arg call; orgId prop wired from caller at portal/tickets/[id]/page.tsx line 153 |
| src/app/api/inspections/[id]/signature/route.ts | src/lib/inspections/signature-utils.ts | uploadSignature(orgId, inspectionId, ...) | WIRED | Hard 401 guard at line 70-73; orgId passed as first arg at line 76 |
| supabase/scripts/migrate_storage_paths.ts | storage buckets | storage.copy() then storage.remove() | WIRED | migrateBucket() with copy+remove pattern |
| supabase/scripts/migrate_storage_paths.ts | DB tables with storage_path | UPDATE table SET storage_path = new_path | WIRED | migrateStoragePathColumn() iterates all 6 tables |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| STOR-01 | 40-01, 40-02, 40-03 | Storage Path Convention — org-prefixed uploads for all upload sites | SATISFIED | paths.ts builder verified; all 9 internal API routes use typed path builders with orgId guard; MessageInput.tsx gap closed — uploadTicketAttachment now receives orgId prop; contractor, portal, and signature utils all org-prefixed |
| STOR-02 | 40-01 | Storage RLS Policies — enforce org folder via current_organization_id() | SATISFIED | 084_storage_rls.sql: 16 org-scoped policies across all 4 buckets, all using `(storage.foldername(name))[1] = current_organization_id()::text`; old unscoped policies dropped |
| STOR-03 | 40-04 | Existing File Migration — prefix paths, update DB references | SATISFIED | migrate_storage_paths.ts: all 4 buckets, 6 DB tables, JSONB checklist paths, defect photo arrays, signature paths; idempotent |

No orphaned requirements. All three IDs declared in plan frontmatter match the three IDs mapped to Phase 40 in REQUIREMENTS.md.

---

### Anti-Patterns Found

None detected in re-verification. The two previously identified anti-patterns (missing orgId arg in MessageInput.tsx, `|| ''` fallback in signature route) are both resolved.

---

### Human Verification Required

The following require a running application to confirm end-to-end:

**1. Message reply photo attachment flow**

**Test:** Open a tenant portal ticket, open a message thread, attach a photo via the message reply input, submit.
**Expected:** Photo uploaded and stored at `{orgId}/tickets/{ticketId}/messages/{messageId}/{uuid}.ext`, visible in thread without broken image link.
**Why human:** Client component with file state and authenticated fetch chain; cannot be exercised by grep.

**2. Signature upload on completed inspection**

**Test:** Complete an inspection, navigate to signature capture, draw a signature and save.
**Expected:** Signature stored at `{orgId}/inspections/{inspectionId}/signature.png`, signed URL returned and rendered immediately on the page.
**Why human:** Requires org context, completed inspection state, and canvas capture interaction.

---

## Gaps Summary

No gaps remain. Both previously identified gaps are closed:

1. **MessageInput.tsx orgId argument** — Fixed. `orgId: string` added to `MessageInputProps`; call is `uploadTicketAttachment(file, orgId, ticketId, messageId)`; caller passes `orgId={ticket.organization_id}`.

2. **Signature route 401 guard** — Fixed. `|| ''` fallback removed; hard 401 guard with `if (!orgId) return NextResponse.json({ error: 'Organization context required' }, { status: 401 })` matches all other upload routes.

Phase goal **"File storage is organization-isolated with RLS enforcement on storage buckets"** is achieved. All upload paths are org-prefixed, RLS policies enforce the prefix at the database level, and the one-shot migration script handles existing files.

---

_Verified: 2026-02-18_
_Verifier: Claude (gsd-verifier)_
_Re-verification after gap closure_
