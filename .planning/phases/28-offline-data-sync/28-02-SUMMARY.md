---
phase: 28-offline-data-sync
plan: 02
subsystem: sync
tags: [offline, sync-queue, exponential-backoff, retry, indexeddb, dexie, react-hooks]

# Dependency graph
requires:
  - phase: 28-01
    provides: Dexie IndexedDB schema with syncQueue table
  - phase: 27-03
    provides: ConnectivityContext for online/offline events
provides:
  - Sync queue operations with CRUD (enqueue, process, retry, discard)
  - Exponential backoff retry strategy (max 8 attempts)
  - useOfflineSubmit hook for transparent online/offline submission
  - useSyncStatus hook with reactive pending/failed counts
  - SyncStatusBadge component in header
  - Auto-sync on reconnect via ConnectivityContext
affects: [28-03, offline-forms, work-order-mutations, task-mutations]

# Tech tracking
tech-stack:
  added: []
  patterns: [Exponential backoff retry, Sequential queue processing, Transparent submit-or-queue API, Reactive sync status with useLiveQuery]

key-files:
  created:
    - src/lib/sync/retry-strategy.ts
    - src/lib/db/sync-queue.ts
    - src/hooks/useOfflineSubmit.ts
    - src/hooks/useSyncStatus.ts
    - src/components/SyncStatusBadge.tsx
  modified:
    - src/contexts/ConnectivityContext.tsx
    - src/components/navigation/header.tsx

key-decisions:
  - "Exponential backoff sequence: 0ms, 10ms, 20ms, 40ms, 80ms, 160ms, 320ms, 640ms (max 8 attempts)"
  - "Sequential queue processing (FIFO) to preserve order for dependent mutations"
  - "Failed items persist with status='failed' for user retry or discard action"
  - "Last sync time stored in localStorage (not IndexedDB) for simplicity"
  - "Sync triggers automatically on reconnect via ConnectivityContext"
  - "Badge shows regardless of online/offline state (user needs visibility during sync)"

patterns-established:
  - "Submit-or-queue pattern: useOfflineSubmit attempts direct fetch when online, falls back to queue on failure or offline"
  - "Resilient queue processing: Failed items don't abort queue, each processed independently"
  - "Reactive UI updates: useSyncStatus uses useLiveQuery for automatic re-render on queue changes"
  - "Separation of concerns: Retry strategy isolated from queue logic"

# Metrics
duration: 7min
completed: 2026-01-30
---

# Phase 28 Plan 02: Sync Queue System Summary

**Offline form submissions queue in IndexedDB with automatic background sync on reconnect, exponential backoff retry, and live header status badge**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-30T13:16:55Z
- **Completed:** 2026-01-30T13:24:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Sync queue stores offline mutations (operation, endpoint, method, payload) in IndexedDB
- Queue processes sequentially on reconnect with exponential backoff (max 8 attempts)
- Failed items persist with error details for retry or discard
- Header badge shows live pending count with spinning icon during sync
- useOfflineSubmit provides single API for transparent submit-or-queue behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Sync queue operations and retry strategy** - `1151879` (feat)
2. **Task 2: Offline submit hook, sync status hook, badge, and auto-sync wiring** - `1cee612` (feat)

## Files Created/Modified

**Created:**
- `src/lib/sync/retry-strategy.ts` - Exponential backoff with wait() and executeWithRetry()
- `src/lib/db/sync-queue.ts` - Sync queue CRUD operations (enqueue, process, retry, discard, counts)
- `src/hooks/useOfflineSubmit.ts` - Transparent online/offline submission hook
- `src/hooks/useSyncStatus.ts` - Reactive pending/failed counts via useLiveQuery
- `src/components/SyncStatusBadge.tsx` - Header badge with blue spinner for pending, red for failed

**Modified:**
- `src/contexts/ConnectivityContext.tsx` - Added processSyncQueue call on reconnect
- `src/components/navigation/header.tsx` - Added SyncStatusBadge component

## Decisions Made

**Exponential backoff strategy:**
- Max 8 attempts (depth 0-7) with sequence: 0ms, 10ms, 20ms, 40ms, 80ms, 160ms, 320ms, 640ms
- Depth 0 has no delay (first attempt is immediate)
- Total max retry time: ~1.27 seconds for network failures

**Sequential queue processing:**
- Process items in FIFO order (NOT parallel)
- Order matters for dependent mutations (e.g., create work order → add task)
- Failed items don't abort queue (resilient processing)

**Failed item handling:**
- Items with status='failed' remain in queue for user action
- Provides retry (reset to pending) or discard (delete) operations
- Toast notification on final failure: "Synchronisierung fehlgeschlagen: {entityType}"

**Last sync time storage:**
- Stored in localStorage (key: 'kewa_last_sync_time')
- Not IndexedDB - simple string for metadata
- Updated after successful processSyncQueue with synced > 0

**Auto-sync on reconnect:**
- ConnectivityContext handleOnline callback triggers processSyncQueue
- Only triggers if not initial mount (prevents sync on page load)
- Wrapped in try-catch to prevent sync errors breaking connectivity context

**Badge visibility:**
- Shows when pendingCount > 0 OR failedCount > 0
- Visible regardless of online/offline state
- User needs to see pending count even when back online during sync

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 1 - Bug] Fixed undefined return type from db.syncQueue.add()**
- **Found during:** Task 1 type checking
- **Issue:** Dexie's add() method returns `number | undefined`, plan assumed `number`
- **Fix:** Added undefined check after add() with error throw if undefined
- **Files modified:** src/lib/db/sync-queue.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 1151879 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Single type safety fix. No scope changes.

## Issues Encountered

None - plan executed as specified after type fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 28-03 (Conflict Detection):**
- Sync queue returns response JSON from processSyncQueue (needed for conflict detection)
- Failed items tracked separately from pending (allows conflict UI to filter)
- useOfflineSubmit provides transparent API for forms to adopt

**Integration points for future work:**
- Forms can use useOfflineSubmit({ operation, entityType, endpoint, method, payload })
- Conflict detection can read response JSON from successful sync
- Failed sync items can be surfaced in settings/admin UI for manual resolution

**No blockers.** Plan 28-03 can proceed with conflict detection logic.

---
*Phase: 28-offline-data-sync*
*Completed: 2026-01-30*
