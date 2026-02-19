---
phase: 40-storage-multi-tenancy
plan: 01
subsystem: storage
tags: [storage, rls, multi-tenancy, path-builder]
dependency_graph:
  requires:
    - 076_rls_helpers.sql (current_organization_id function)
    - 041_storage_buckets.sql (task-photos, task-audio buckets)
    - 059_inspections.sql (inspections bucket)
  provides:
    - src/lib/storage/paths.ts (centralised org-prefixed path builder)
    - supabase/migrations/084_storage_rls.sql (Storage RLS for all 4 buckets)
  affects:
    - All 8 upload call sites (Plans 40-02 and 40-03 will consume paths.ts)
    - storage.objects table (16 new policies replace 8 unscoped policies)
tech_stack:
  added: []
  patterns:
    - buildStoragePath(orgId, ...segments) — org-prefix enforced at call site
    - (storage.foldername(name))[1] = current_organization_id()::text — Storage RLS enforcement
key_files:
  created:
    - src/lib/storage/paths.ts
    - supabase/migrations/084_storage_rls.sql
  modified: []
decisions:
  - inspectionSignaturePath uses 'inspections' literal sub-folder ({orgId}/inspections/{id}/signature.png) to match research convention; differs from item/defect paths that use inspectionId as direct sub-folder
  - 059_inspections.sql used storage.policies table inserts (not CREATE POLICY on storage.objects) — DROP POLICY IF EXISTS for inspections policies are safety-only and will no-op on live DB
  - media bucket has no prior CREATE POLICY statements — 4 new policies are net-new (not replacements)
metrics:
  duration: 2min
  completed: 2026-02-18
  tasks_completed: 2
  files_created: 2
---

# Phase 40 Plan 01: Storage Path Builder and RLS Foundation Summary

Storage multi-tenancy foundation established: org-prefixed TypeScript path builder and 16 org-scoped Storage RLS policies across all four storage buckets.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create centralised storage path builder | 8ee923b | src/lib/storage/paths.ts |
| 2 | Create Storage RLS migration | a155e23 | supabase/migrations/084_storage_rls.sql |

## What Was Built

### Task 1: `src/lib/storage/paths.ts`

Centralised path builder exporting:

- `BUCKETS` — const object mapping `media`, `taskPhotos`, `taskAudio`, `inspections` to their bucket IDs
- `BucketName` — type derived from BUCKETS values
- `buildStoragePath(orgId, ...segments)` — core function; joins `[orgId, ...segments]` with `/`
- 11 typed builders: `taskPhotoPath`, `taskAudioPath`, `workOrderDocumentPath`, `workOrderPhotoPath`, `changeOrderPhotoPath`, `kbAttachmentPath`, `ticketPhotoPath`, `ticketMessageAttachmentPath`, `inspectionItemPhotoPath`, `inspectionDefectPhotoPath`, `inspectionSignaturePath`

All builders produce paths with orgId as first segment. TypeScript compilation clean.

### Task 2: `supabase/migrations/084_storage_rls.sql`

- 8 `DROP POLICY IF EXISTS` statements removing unscoped policies from 041 (task-photos/task-audio) and safety drops for 059 (inspections)
- 16 `CREATE POLICY` statements: SELECT, INSERT, UPDATE, DELETE for each of `media`, `task-photos`, `task-audio`, `inspections`
- All 16 policies enforce: `(storage.foldername(name))[1] = current_organization_id()::text`

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions Made

1. `inspectionSignaturePath` uses `{orgId}/inspections/{inspectionId}/signature.png` — the `inspections` literal sub-folder distinguishes it from item/defect paths (`{orgId}/{inspectionId}/items/...`). This matches the research file's "New Path Convention" section exactly.

2. `059_inspections.sql` used the deprecated `storage.policies` table insert approach (not `CREATE POLICY` on `storage.objects`). The two DROP POLICY statements for inspection policies in 084 are safety-only — they will no-op on a live database that ran 059. The bucket-level policies are still correctly replaced by the new org-scoped ones.

3. `media` bucket had no prior unscoped `CREATE POLICY` statements in any migration — the 4 new policies are net-new additions (no DROP needed for media).

## Self-Check: PASSED

- FOUND: src/lib/storage/paths.ts
- FOUND: supabase/migrations/084_storage_rls.sql
- FOUND: .planning/phases/40-storage-multi-tenancy/40-01-SUMMARY.md
- FOUND: commit 8ee923b (Task 1 — paths.ts)
- FOUND: commit a155e23 (Task 2 — 084_storage_rls.sql)
