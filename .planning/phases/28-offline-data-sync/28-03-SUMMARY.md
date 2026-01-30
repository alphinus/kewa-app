---
phase: 28-offline-data-sync
plan: 03
subsystem: sync
tags: [conflict-resolution, photo-queue, offline, compression, lww, canvas-api]

# Dependency graph
requires:
  - phase: 28-02
    provides: Sync queue with processSyncQueue integration
  - phase: 28-01
    provides: Dexie photoQueue table and cacheEntityOnView operations
provides:
  - Last-Write-Wins conflict detection comparing local/server timestamps
  - Photo compression using existing Canvas API (1920px max / 80% quality)
  - Sequential photo upload queue with exponential backoff retry
  - useOfflinePhoto hook for photo capture with online/offline handling
  - Complete offline sync pipeline: data queue → photo queue
affects: [photo-forms, inspection-workflows, work-order-photos, task-attachments]

# Tech tracking
tech-stack:
  added: []
  patterns: [Last-Write-Wins conflict resolution, Sequential photo upload, Client-side Canvas compression, Partial sync (form data independent of photos)]

key-files:
  created:
    - src/lib/sync/conflict-resolver.ts
    - src/lib/sync/photo-uploader.ts
    - src/hooks/useOfflinePhoto.ts
  modified:
    - src/lib/db/sync-queue.ts
    - src/contexts/ConnectivityContext.tsx

key-decisions:
  - "Server wins in LWW conflict resolution with 4-second auto-dismiss toast"
  - "Photos compress to 1920px max / 80% quality using existing Canvas API (no new npm packages)"
  - "Sequential photo upload (one at a time) to avoid overwhelming mobile connections"
  - "Failed photos retry independently from form data (partial sync works)"
  - "Photo queue processes AFTER sync queue on reconnect"

patterns-established:
  - "Conflict detection after sync: Compare timestamps post-submission, not during"
  - "Cache server response always: Even when local wins, cache includes server computed fields"
  - "Operation-specific sync handling: Create caches, update detects conflicts, delete removes cache"
  - "Photo compression before storage: Compress at queue time, not upload time"
  - "Online direct upload: Skip queue when online, compress and upload immediately"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 28 Plan 03: Conflict Detection and Photo Queue Summary

**Last-Write-Wins conflict detection with server timestamp authority, offline photo capture with Canvas compression to 1920px/80%, and sequential upload queue completing Phase 28 offline sync**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30T13:30:20Z
- **Completed:** 2026-01-30T13:35:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Conflict resolution compares local/server updated_at timestamps post-sync
- Server wins notified via auto-dismiss toast ("Ihre Aenderungen wurden ueberschrieben")
- Photo compression to 1920px max / 80% quality using existing imageCompression.ts (Canvas API)
- Sequential photo upload with exponential backoff retry (independent from form data sync)
- Complete reconnect pipeline: sync queue → photo queue orchestrated by ConnectivityContext

## Task Commits

Each task was committed atomically:

1. **Task 1: Conflict resolver and sync queue integration** - `df215cd` (feat)
2. **Task 2: Photo queue with compression and sequential upload** - `67e6f99` (feat)

## Files Created/Modified

**Created:**
- `src/lib/sync/conflict-resolver.ts` - detectAndResolveConflict comparing timestamps, LWW resolution
- `src/lib/sync/photo-uploader.ts` - queueOfflinePhoto, processPhotoQueue with Canvas compression
- `src/hooks/useOfflinePhoto.ts` - React hook for photo capture with online/offline routing

**Modified:**
- `src/lib/db/sync-queue.ts` - Integrated conflict detection for update operations, cache handling for create/delete
- `src/contexts/ConnectivityContext.tsx` - Added processPhotoQueue call after processSyncQueue on reconnect

## Decisions Made

**Conflict resolution strategy:**
- Last-Write-Wins with server timestamp authority
- Comparison happens AFTER sync succeeds (not during)
- Server response always cached (includes computed fields even when local wins)
- Auto-dismiss toast notification (4 seconds): "Ihre Aenderungen wurden ueberschrieben"
- No blocking modal or acknowledgment required

**Photo compression approach:**
- Use existing `src/lib/imageCompression.ts` (Canvas API) instead of browser-image-compression
- Compress to 1920px max on longest edge (override default 720px for offline photos)
- 80% quality JPEG or WebP (browser-dependent)
- Compression happens at queue time (before IndexedDB storage), not upload time
- Avoids npm package bloat and uses proven existing utility

**Sequential photo upload:**
- One photo at a time (FIFO processing)
- Avoids overwhelming mobile connections with parallel uploads
- Per-photo progress callback (not used in background sync, available for UI)
- Exponential backoff retry with 8 max attempts per photo

**Partial sync independence:**
- Form data syncs first (critical payload)
- Photos sync second (secondary payload)
- Failed photo doesn't block form data sync
- Each photo retries independently with its own exponential backoff

**Photo queue orchestration:**
- ConnectivityContext on reconnect: processSyncQueue → processPhotoQueue
- Toast on photo completion: "{N} Foto(s) synchronisiert"
- Failed photo toast: "Foto konnte nicht hochgeladen werden: {fileName} -- wird erneut versucht"

**Operation-specific cache handling:**
- Create operations: Cache new entity data from server response
- Update operations: Detect conflict, cache winner data
- Delete operations: Remove entity from cachedEntities table

## Deviations from Plan

None - plan executed exactly as written. Plan correctly specified using existing imageCompression.ts utility instead of installing browser-image-compression.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 28 complete.** All 7 offline requirements (OFFL-05 through OFFL-11) addressed:
- OFFL-05: Entity caching (28-01)
- OFFL-06: Staleness indicator (28-01)
- OFFL-07: Form queueing (28-02)
- OFFL-08: Sync status badge (28-02)
- OFFL-09: Retry strategy (28-02)
- OFFL-10: Conflict detection (28-03)
- OFFL-11: Photo queue (28-03)

**Integration examples for feature work:**

```typescript
// Offline entity reading
const { entity, isOffline, cachedAt } = useOfflineEntity('workOrder', id)
<StalenessIndicator isOnline={!isOffline} cachedAt={cachedAt} />

// Offline form submission
const { submit, isOnline } = useOfflineSubmit({
  operation: 'update',
  entityType: 'workOrder',
  endpoint: `/api/work-orders/${id}`,
  method: 'PUT',
})
await submit({ status: 'completed', updated_at: new Date().toISOString() })

// Offline photo capture
const { queuePhoto, pendingPhotoCount } = useOfflinePhoto('workOrder', id)
await queuePhoto(file)
```

**Key capabilities:**
- Transparent online/offline data access via useOfflineEntity
- Submit-or-queue API via useOfflineSubmit
- Photo capture with automatic compression and queueing
- Automatic conflict resolution and sync on reconnect
- Live sync status in header badge

**Next phases can now:**
- Integrate offline support into existing forms (work orders, tasks, notes)
- Add photo upload to inspection workflows
- Build offline-first inspection checklists
- Add manual sync management UI if needed

**No blockers.** Offline foundation complete.

---
*Phase: 28-offline-data-sync*
*Completed: 2026-01-30*
