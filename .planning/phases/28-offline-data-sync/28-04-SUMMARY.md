---
phase: 28-offline-data-sync
plan: 04
type: execute
wave: 1
subsystem: offline-core
tags: [offline, caching, indexeddb, entity-detail-pages]

requires:
  - phase: 28-01
    provides: [dexie-schema, cacheEntityOnView, useOfflineEntity, StalenessIndicator]
  - phase: 28-02
    provides: [sync-queue-infrastructure]
  - phase: 28-03
    provides: [conflict-detection, photo-queue]

provides:
  - entity-caching-integration
  - property-offline-viewing
  - workorder-offline-viewing
  - unit-offline-viewing
  - task-offline-viewing

affects:
  - phase: 29
    reason: Gap closure complete, all offline features now wired into UI

tech-stack:
  added: []
  patterns:
    - network-first-cache-fallback
    - offline-page-load-detection
    - staleness-timestamp-display

key-files:
  created: []
  modified:
    - src/app/dashboard/liegenschaft/[id]/page.tsx
    - src/app/dashboard/auftraege/[id]/page.tsx
    - src/app/dashboard/einheiten/[id]/page.tsx
    - src/app/dashboard/aufgaben/[id]/page.tsx

decisions:
  - id: OFFL-04-01
    decision: Network-first strategy with cache fallback
    rationale: Always attempt fetch first to get fresh data, only fall back to cache on failure when offline
    alternatives: [cache-first, stale-while-revalidate]
    impact: Ensures users see live data when online, cached data only when truly offline

  - id: OFFL-04-02
    decision: Separate useEffect for offline page load
    rationale: Handle case where user navigates to detail page while already offline
    alternatives: [single-effect-with-complex-logic]
    impact: Cleaner separation of concerns, explicit handling of offline-first scenario

  - id: OFFL-04-03
    decision: Unit page shows only unit header offline (no rooms)
    rationale: Rooms are not independently cacheable entities, unit header is sufficient for offline viewing
    alternatives: [cache-rooms-as-children, show-error-for-rooms]
    impact: Graceful degradation - user sees unit info without room list when offline

  - id: OFFL-04-04
    decision: Task page shows only task entity offline (no photos/audio/role)
    rationale: Photos, audio, and user role require separate API calls that won't work offline
    alternatives: [cache-all-dependencies, show-error-for-missing-sections]
    impact: Graceful degradation - user sees task info without media/role sections when offline

metrics:
  duration: 17min
  completed: 2026-01-31
---

# Phase 28 Plan 04: Entity Detail Page Integration Summary

**One-liner:** Wire entity caching into 4 most-viewed detail pages with network-first fallback and staleness indicators

## What Was Built

Integrated offline entity caching into the 4 most-viewed entity detail pages (property, work order, unit, task), enabling users to view recently accessed data when offline.

**Core integration pattern (3 steps):**

1. **Import infrastructure:**
   - `cacheEntityOnView` from operations.ts
   - `useOfflineEntity` hook for reactive cache access
   - `StalenessIndicator` for timestamp display
   - `useConnectivity` for online/offline state

2. **Add caching on successful fetch + offline fallback:**
   - After fetch succeeds: `await cacheEntityOnView(entityType, id, data)`
   - In catch block: if `!isOnline && offlineCache.data`, populate state from cache
   - Separate `useEffect` for offline page load (already offline when component mounts)

3. **Add StalenessIndicator:**
   - Render `<StalenessIndicator cachedAt={offlineCache.cachedAt} />` below page header
   - Only renders when offline and cachedAt exists (live data indicator-free)

**Pages integrated:**

1. **Property detail** (`liegenschaft/[id]`)
   - Caches building entity
   - Shows staleness indicator below building name
   - Graceful offline: building info visible, delivery history unavailable

2. **Work order detail** (`auftraege/[id]`)
   - Caches work order entity
   - Shows staleness indicator below title/badges
   - Graceful offline: work order data visible, actions disabled

3. **Unit detail** (`einheiten/[id]`)
   - Caches unit entity only (not rooms)
   - Shows staleness indicator below unit name
   - Graceful offline: unit header visible, room list empty

4. **Task detail** (`aufgaben/[id]`)
   - Caches task entity only (not photos/audio/role)
   - Shows staleness indicator below task title
   - Graceful offline: task info visible, media sections unavailable

## Tasks Completed

| Task | Name                                      | Commit  | Files                                             |
|------|-------------------------------------------|---------|---------------------------------------------------|
| 1    | Property and work order page integration  | 00b717f | liegenschaft/[id]/page.tsx, auftraege/[id]/page.tsx |
| 2    | Unit and task page integration            | 67ab907 | einheiten/[id]/page.tsx, aufgaben/[id]/page.tsx   |

## Technical Implementation

**Network-first strategy:**
```typescript
try {
  const response = await fetch(`/api/entities/${id}`)
  const data = await response.json()
  setEntity(data)
  await cacheEntityOnView('entityType', id, data)
} catch (err) {
  if (!isOnline && offlineCache.data) {
    setEntity(offlineCache.data)
    setError(null)
  }
}
```

**Offline page load handler:**
```typescript
useEffect(() => {
  if (!isOnline && !entity && offlineCache.data && !offlineCache.isLoading) {
    setEntity(offlineCache.data)
    setLoading(false)
  }
}, [isOnline, entity, offlineCache.data, offlineCache.isLoading])
```

**Staleness indicator:**
```tsx
<div>
  <h1>{entity.name}</h1>
  <StalenessIndicator cachedAt={offlineCache.cachedAt} />
</div>
```

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**OFFL-04-01: Network-first strategy with cache fallback**
- Always attempt fetch first to get fresh data
- Only fall back to cache on failure when offline
- Ensures users see live data when online, cached data only when truly offline
- Alternatives: cache-first (stale data), stale-while-revalidate (complex)

**OFFL-04-02: Separate useEffect for offline page load**
- Handle case where user navigates to detail page while already offline
- Cleaner separation of concerns vs. complex single-effect logic
- Explicit handling of offline-first scenario

**OFFL-04-03: Unit page shows only unit header offline (no rooms)**
- Rooms are not independently cacheable entities
- Unit header is sufficient for offline viewing
- Graceful degradation - user sees unit info without room list when offline

**OFFL-04-04: Task page shows only task entity offline (no photos/audio/role)**
- Photos, audio, and user role require separate API calls that won't work offline
- Task entity is sufficient for offline viewing
- Graceful degradation - user sees task info without media/role sections when offline

## Files Changed

**Modified:**
- `src/app/dashboard/liegenschaft/[id]/page.tsx` - Property caching integration
- `src/app/dashboard/auftraege/[id]/page.tsx` - Work order caching integration
- `src/app/dashboard/einheiten/[id]/page.tsx` - Unit caching integration
- `src/app/dashboard/aufgaben/[id]/page.tsx` - Task caching integration

## Next Phase Readiness

**Gap closure complete:**
- Gap 1 (entity caching not called) - CLOSED
- All 4 most-viewed entity detail pages now cache data on view
- Users can read recently viewed entities offline
- Phase 28 offline infrastructure now fully integrated into UI

**Phase 29 preparation:**
- Offline foundation complete (caching, sync, conflict resolution, UI integration)
- Ready for milestone wrap-up and production verification

**No blockers or concerns.**

---

**Verification:** Gap 1 from 28-VERIFICATION.md closed. All entity detail pages cache data on view and fall back to IndexedDB when offline.
