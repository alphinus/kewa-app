---
phase: 03-photo-documentation
plan: 01
subsystem: api
tags: [supabase-storage, image-compression, webp, canvas-api, multipart-form-data]

# Dependency graph
requires:
  - phase: 02-task-management
    provides: Tasks table and CRUD API to extend with photos
provides:
  - task_photos database schema with foreign keys
  - Browser-side image compression utility (Canvas API, WebP)
  - Photo upload API (POST /api/photos with multipart/form-data)
  - Photo list API (GET /api/photos?task_id)
  - Photo delete API (DELETE /api/photos/[id])
  - Role-based photo permissions (KEWA=explanation, Imeri=completion)
affects: [03-photo-documentation (UI), 04-sync-offline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Canvas API image compression (no external dependencies)
    - WebP with JPEG fallback for Safari compatibility
    - Multipart form-data handling in Next.js API routes
    - Signed URLs for secure storage access (1 hour expiry)

key-files:
  created:
    - supabase/migrations/003_task_photos.sql
    - src/lib/imageCompression.ts
    - src/app/api/photos/route.ts
    - src/app/api/photos/[id]/route.ts
  modified:
    - src/types/database.ts

key-decisions:
  - "Max 2 photos per type per task (enforced at API level, easier to change)"
  - "720px max dimension, 0.8 quality WebP (~50-100KB output)"
  - "Signed URLs with 1 hour expiry for storage access"
  - "Role-based upload: KEWA=explanation only, Imeri=completion only"
  - "Delete storage first, then DB (orphaned storage is okay, orphaned DB record is not)"

patterns-established:
  - "Photo storage path: {task_id}/{photo_type}/{uuid}.webp"
  - "Multipart form-data parsing with request.formData()"
  - "Transaction-safe upload: cleanup storage if DB insert fails"

# Metrics
duration: 4min
completed: 2026-01-16
---

# Phase 3 Plan 1: Photo Storage Infrastructure Summary

**Photo storage backend with task_photos schema, Canvas-based image compression, and CRUD API with role-based permissions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-16T15:14:20Z
- **Completed:** 2026-01-16T15:17:54Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- Created task_photos table with foreign keys to tasks and users
- Built browser-side image compression (720px max, WebP, no dependencies)
- Implemented photo upload API with multipart/form-data handling
- Role-based permissions: KEWA can only add explanation photos, Imeri can only add completion photos
- Photo delete API with ownership validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create task_photos database schema** - `7d83967` (feat)
2. **Task 2: Add photo types and compression utility** - `e20eef3` (feat)
3. **Task 3: Create photo upload and list API** - `4fc7156` (feat)
4. **Task 4: Create photo delete API** - `e2eff81` (feat)

## Files Created/Modified

- `supabase/migrations/003_task_photos.sql` - Task photos table with indexes and storage policy documentation
- `src/types/database.ts` - Added PhotoType, TaskPhoto, TaskPhotoWithUrl, CreatePhotoInput, PhotosResponse
- `src/lib/imageCompression.ts` - Canvas-based image compression with WebP support detection
- `src/app/api/photos/route.ts` - GET (list with signed URLs) and POST (upload with validation)
- `src/app/api/photos/[id]/route.ts` - DELETE with ownership check

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Max 2 photos per type per task | Enforced at API level for flexibility, prevents storage bloat |
| 720px max dimension, 0.8 quality | Balance between visual quality and file size (~50-100KB) |
| WebP with JPEG fallback | WebP is smaller but Safari < 14 needs JPEG fallback |
| 1 hour signed URL expiry | Balance between caching and security |
| Delete storage first, then DB | Orphaned storage is acceptable, orphaned DB records cause errors |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript type casting for Supabase nested selects:**
- Supabase returns nested relations with imprecise types
- Fixed with `as unknown as` cast pattern for project visibility check
- Same pattern used in existing task routes

## User Setup Required

**Supabase Storage bucket must be created manually:**

1. Go to Supabase Dashboard > Storage
2. Create bucket named `task-photos`
3. Set to private (not public)
4. Configure policies:
   - SELECT: authenticated users can read all
   - INSERT: authenticated users can upload
   - DELETE: users can only delete own uploads

See `supabase/migrations/003_task_photos.sql` comments for policy details.

## Next Phase Readiness

**Ready for:**
- Photo UI components (camera capture, gallery, upload progress)
- Photo attachment to task completion flow

**Prerequisites:**
- Migration 003_task_photos.sql applied to Supabase
- Storage bucket 'task-photos' created with policies

---
*Phase: 03-photo-documentation*
*Completed: 2026-01-16*
