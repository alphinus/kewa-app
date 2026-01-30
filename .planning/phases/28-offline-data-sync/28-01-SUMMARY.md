---
phase: 28-offline-data-sync
plan: 01
subsystem: database
tags: [dexie, indexeddb, offline, caching, pwa]

# Dependency graph
requires:
  - phase: 27-pwa-foundation
    provides: Connectivity detection and offline badge infrastructure
provides:
  - Dexie IndexedDB schema with three tables (cachedEntities, syncQueue, photoQueue)
  - Entity caching operations with view-triggered caching and eviction
  - Reactive offline entity hooks using useLiveQuery
  - Staleness indicator showing timestamp when offline
affects: [28-02, 28-03, offline-forms, photo-queue]

# Tech tracking
tech-stack:
  added: [dexie@4.2.1, dexie-react-hooks@4.2.0]
  patterns: [IndexedDB entity caching, Two-level cache depth, Compound index queries, Pinned entity exemption]

key-files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/operations.ts
    - src/hooks/useOfflineEntity.ts
    - src/components/StalenessIndicator.tsx
  modified:
    - package.json

key-decisions:
  - "Cache limits: 50 properties, 200 units, 500 work orders, 1000 tasks/notes per type"
  - "Eviction strategy: 7-day retention window + count-based trimming for unpinned entities"
  - "Compound index [entityType+entityId] for efficient single-entity lookups"
  - "Compound index [parentType+parentId] for two-level caching (entity + children)"
  - "Staleness indicator only renders when offline (no indicator when online = live data)"

patterns-established:
  - "Reactive IndexedDB queries: useLiveQuery auto-updates React components on data changes"
  - "Cache on view: Entity caching triggered automatically when user views entity page"
  - "Pinned exempt: Pinned entities bypass both time-based and count-based eviction"
  - "Persistent storage request: Called on first pin to prevent browser eviction"

# Metrics
duration: 7min
completed: 2026-01-30
---

# Phase 28 Plan 01: IndexedDB Foundation Summary

**Dexie database with three indexed tables (cachedEntities, syncQueue, photoQueue), reactive hooks using useLiveQuery, and staleness indicator for offline-cached data**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-30T09:44:21Z
- **Completed:** 2026-01-30T09:51:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Dexie IndexedDB schema with compound indexes for efficient entity lookups
- Entity caching operations: view-triggered caching, read, pin/unpin, eviction
- Reactive hooks providing live IndexedDB data to React components
- Staleness indicator showing German-formatted relative timestamp when offline

## Task Commits

Each task was committed atomically:

1. **Task 1: Dexie database schema and entity caching operations** - `9e65344` (feat)
2. **Task 2: Offline entity hook and staleness indicator** - `5a0686e` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Dexie database with cachedEntities, syncQueue, photoQueue tables
- `src/lib/db/operations.ts` - CRUD operations: cacheEntityOnView, getCachedEntity, getCachedChildren, pinEntity, unpinEntity, evictStaleEntities
- `src/hooks/useOfflineEntity.ts` - React hooks: useOfflineEntity and useOfflineChildren with useLiveQuery
- `src/components/StalenessIndicator.tsx` - Conditional timestamp display ("Zuletzt synchronisiert: vor X")
- `package.json` - Added dexie@4.2.1 and dexie-react-hooks@4.2.0

## Decisions Made

**Cache limits per entity type:**
- Properties: 50
- Units: 200
- Work orders: 500
- Tasks: 1000
- Notes: 1000

**Eviction strategy:**
- Time-based: Remove unpinned entities not viewed in 7 days
- Count-based: Trim to max count per type (oldest viewedAt first)
- Pinned entities exempt from both rules

**IndexedDB schema design:**
- Compound index `[entityType+entityId]` for efficient single-entity queries
- Compound index `[parentType+parentId]` for two-level caching (entity + children)
- No indexing on blob or data fields (prevents performance issues)

**Staleness indicator UX:**
- Only renders when `isOnline === false` AND `cachedAt` is not null
- Uses date-fns German locale for relative timestamps
- Format: "Zuletzt synchronisiert: vor 3 Stunden"

**Persistent storage:**
- Requested on first pin action via `navigator.storage.persist()`
- Prevents browser from evicting IndexedDB under storage pressure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

IndexedDB foundation complete. Ready for:
- Plan 28-02: Sync queue and conflict resolution
- Plan 28-03: Photo queue with client-side compression

**Critical interfaces established:**
- `CachedEntity` interface defines entity cache structure
- `SyncQueueItem` interface ready for write operations (Plan 28-02)
- `PhotoQueueItem` interface ready for photo uploads (Plan 28-03)

**No blockers.**

---
*Phase: 28-offline-data-sync*
*Completed: 2026-01-30*
