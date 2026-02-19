---
phase: 40-storage-multi-tenancy
plan: 02
subsystem: api
tags: [storage, multi-tenancy, supabase, nextjs, typescript]

# Dependency graph
requires:
  - phase: 40-01
    provides: typed path builders (taskPhotoPath, taskAudioPath, changeOrderPhotoPath, kbAttachmentPath, inspectionItemPhotoPath, inspectionDefectPhotoPath) in src/lib/storage/paths.ts
provides:
  - All 6 internal upload API routes use org-prefixed storage paths via typed path builders
  - x-organization-id header extraction pattern established for upload POST handlers
affects:
  - 40-03 (external/portal upload routes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Upload routes extract x-organization-id header immediately after userId/userRole checks, return 401 if missing"
    - "storagePath assigned via typed path builder from @/lib/storage/paths — never hand-rolled inline"

key-files:
  created: []
  modified:
    - src/app/api/photos/route.ts
    - src/app/api/audio/route.ts
    - src/app/api/change-orders/[id]/photos/route.ts
    - src/app/api/knowledge/[id]/attachments/route.ts
    - src/app/api/inspections/[id]/photos/route.ts
    - src/app/api/inspections/[id]/defects/[defectId]/photos/route.ts

key-decisions:
  - "40-02: orgId extracted from x-organization-id header (set by middleware on all /api/* routes) — no DB lookup needed"
  - "40-02: orgId guard returns 401 (same as auth failure) — missing org context is treated as unauthorized"

patterns-established:
  - "Extract orgId from header after userId/userRole; all three checked before any business logic in POST handlers"

requirements-completed:
  - STOR-01

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 40 Plan 02: Storage Multi-Tenancy Upload Routes Summary

**6 internal upload routes updated to use org-prefixed storage paths via typed builders from paths.ts, eliminating all hardcoded unscoped path strings**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T00:00:00Z
- **Completed:** 2026-02-18T00:08:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Task photo uploads now store at `{orgId}/{taskId}/{photoType}/{uuid}.{ext}` via `taskPhotoPath()`
- Task audio uploads now store at `{orgId}/{taskId}/{audioType}/{uuid}.{ext}` via `taskAudioPath()`
- Change order photos now store at `{orgId}/change_orders/{coId}/photos/{ts}-{name}` via `changeOrderPhotoPath()`
- KB article attachments now store at `{orgId}/kb_articles/{articleId}/attachments/{uuid}.{ext}` via `kbAttachmentPath()`
- Inspection item photos now store at `{orgId}/{inspectionId}/items/{uuid}.webp` via `inspectionItemPhotoPath()`
- Inspection defect photos now store at `{orgId}/{inspectionId}/defects/{uuid}.webp` via `inspectionDefectPhotoPath()`

## Task Commits

Each task was committed atomically:

1. **Task 1: Update task photo and audio upload routes** - `3f124af` (feat)
2. **Task 2: Update change order, KB, and inspection upload routes** - `fb157d8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/api/photos/route.ts` - Added taskPhotoPath import, orgId extraction, org-prefixed storagePath
- `src/app/api/audio/route.ts` - Added taskAudioPath import, orgId extraction, org-prefixed storagePath
- `src/app/api/change-orders/[id]/photos/route.ts` - Added changeOrderPhotoPath import, orgId extraction, org-prefixed storagePath
- `src/app/api/knowledge/[id]/attachments/route.ts` - Added kbAttachmentPath import, orgId extraction, org-prefixed storagePath
- `src/app/api/inspections/[id]/photos/route.ts` - Added inspectionItemPhotoPath import, orgId extraction, org-prefixed storagePath
- `src/app/api/inspections/[id]/defects/[defectId]/photos/route.ts` - Added inspectionDefectPhotoPath import, orgId extraction, org-prefixed storagePath

## Decisions Made

- orgId extracted from `x-organization-id` header (guaranteed present by middleware on all `/api/*` routes for authenticated users). No DB lookup needed.
- Missing orgId returns 401 (same as auth failure) — missing org context is treated as unauthorized, consistent with OrgContextMissingError handling already in these routes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 internal upload routes now org-scoped. Storage RLS from 40-01 (migration 084) will enforce `(storage.foldername(name))[1] = current_organization_id()::text`
- Ready for Plan 40-03: external/portal upload routes (contractor/portal routes use service_role client, different pattern)

---
*Phase: 40-storage-multi-tenancy*
*Completed: 2026-02-18*
