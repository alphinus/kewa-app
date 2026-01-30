# Phase 28: Offline Data Sync - Research

**Researched:** 2026-01-30
**Domain:** Offline-first architecture with IndexedDB, sync queues, conflict resolution
**Confidence:** HIGH

## Summary

Offline data sync for Next.js 16 + React 19 + Supabase requires careful coordination between three layers: IndexedDB for local persistence (via Dexie.js), sync queue for mutation tracking, and conflict resolution on reconnect. The ecosystem has converged on proven patterns: Dexie.js for IndexedDB abstraction, Last-Write-Wins for simple conflict resolution, exponential backoff for retries, and client-side image compression before storage.

**Key architecture decisions:**
- **Local-first data flow**: IndexedDB is the source of truth even when online. Supabase is the sync target.
- **Hybrid caching**: Automatic on entity view + explicit pinning (from 28-CONTEXT.md).
- **Last-Write-Wins conflict resolution**: Server `updated_at` timestamp is authority. Simple, predictable, sufficient for single-user workflows.
- **Sequential photo uploads**: One at a time on reconnect. Client-side compression (1920px max, 80% JPEG) before IndexedDB storage.

**Primary recommendation:** Use Dexie.js 4.2.1 + dexie-react-hooks 4.2.0 for IndexedDB layer, browser-image-compression for photo handling, custom sync queue with exponential backoff (no third-party sync library needed), and integrate with existing ConnectivityContext from Phase 27.

## Standard Stack

The established libraries for offline data sync in React/Next.js apps:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dexie | 4.2.1 | IndexedDB abstraction | Industry standard for IndexedDB in modern apps. Promise-based API, reactive queries, schema versioning, transaction support. Already approved in STATE.md. |
| dexie-react-hooks | 4.2.0 | React integration | Official React bindings. `useLiveQuery()` provides reactive IndexedDB queries that re-render on data changes. Already approved in STATE.md. |
| browser-image-compression | ^2.0.2 | Client-side image compression | Zero dependencies, configurable quality/dimensions, handles EXIF rotation, Canvas-based compression. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications | Already integrated in Phase 25-02. Used for sync feedback, conflict notifications, retry failures. |
| @supabase/ssr | 0.8.0 | Supabase client | Already integrated. Provides timestamp authority via `updated_at` columns for conflict resolution. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dexie.js | idb (minimal wrapper) | Too low-level. Missing schema versioning, reactive queries, transaction helpers. |
| Dexie.js | RxDB | Too heavyweight. Adds RxJS dependency (10KB+), CRDTs unnecessary for single-user app. Overkill for Phase 28 scope. |
| browser-image-compression | compressor.js | Similar API, less actively maintained. browser-image-compression has better TypeScript support. |
| Custom sync queue | Background Sync API | Not reliable across all browsers. Requires service worker integration. Phase 27 service worker is minimal (runtime caching only). Adding Background Sync adds complexity without sufficient benefit. |

**Installation:**
```bash
npm install dexie@4.2.1 dexie-react-hooks@4.2.0 browser-image-compression
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts              # Dexie database schema and versioning
│   │   ├── operations.ts          # CRUD helpers (read, write, delete cached entities)
│   │   └── sync-queue.ts          # Sync queue management (enqueue, process, retry)
│   └── sync/
│       ├── conflict-resolver.ts   # Last-Write-Wins logic
│       ├── photo-uploader.ts      # Sequential photo upload with compression
│       └── retry-strategy.ts      # Exponential backoff implementation
├── hooks/
│   ├── useOfflineEntity.ts        # Hook to read cached entities with useLiveQuery
│   ├── useSyncStatus.ts           # Hook to get pending operations count
│   └── useOfflineSubmit.ts        # Hook to queue form submissions
└── components/
    ├── SyncStatusBadge.tsx        # Header badge showing pending operations count
    └── StalenessIndicator.tsx     # "Zuletzt synchronisiert" timestamp (offline only)
```

### Pattern 1: IndexedDB Schema Design (Dexie)
**What:** Define schema with auto-increment primary keys, indexes for common queries, and NO indexes on blob data.

**When to use:** Initial database setup in `lib/db/schema.ts`.

**Example:**
```typescript
// Source: https://dexie.org/docs/Tutorial/Understanding-the-basics
import Dexie, { type EntityTable } from 'dexie'

interface CachedEntity {
  id: number
  entityType: 'property' | 'unit' | 'workOrder'
  entityId: string
  data: any
  cachedAt: number
  viewedAt: number
  pinned: boolean
}

interface SyncQueueItem {
  id?: number
  operation: 'create' | 'update' | 'delete'
  entityType: string
  entityId: string
  payload: any
  createdAt: number
  retryCount: number
  lastError?: string
}

interface PhotoQueueItem {
  id?: number
  entityType: string
  entityId: string
  blob: Blob
  fileName: string
  createdAt: number
  retryCount: number
}

const db = new Dexie('KeWaDB') as Dexie & {
  cachedEntities: EntityTable<CachedEntity, 'id'>
  syncQueue: EntityTable<SyncQueueItem, 'id'>
  photoQueue: EntityTable<PhotoQueueItem, 'id'>
}

// Schema with indexes - NEVER index blob data
db.version(1).stores({
  cachedEntities: '++id, entityType, entityId, viewedAt, pinned',
  syncQueue: '++id, createdAt, retryCount',
  photoQueue: '++id, createdAt, retryCount'
  // Note: blob field is NOT indexed to prevent performance issues
})

export { db }
```

**Critical:** Do NOT index `blob` or `data` fields. [IndexedDB can store binary data but indexing it causes mysterious slowdowns and crashes](https://medium.com/dexie-js/keep-storing-large-images-just-dont-index-the-binary-data-itself-10b9d9c5c5d7).

### Pattern 2: Reactive Queries with useLiveQuery
**What:** Use `useLiveQuery()` from dexie-react-hooks to create reactive database queries that automatically re-render when data changes.

**When to use:** Any component that displays cached data from IndexedDB.

**Example:**
```typescript
// Source: https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/schema'

function useOfflineProperty(propertyId: string) {
  const cachedProperty = useLiveQuery(
    () => db.cachedEntities
      .where({ entityType: 'property', entityId: propertyId })
      .first(),
    [propertyId] // Dependencies array - CRITICAL for reactivity
  )

  // useLiveQuery returns undefined while loading
  if (!cachedProperty) return null

  return cachedProperty.data
}
```

**Best practices:**
- Always check for `undefined` before using query results (loading state)
- Include ALL external variables in dependencies array
- Use wrapper hooks for consistent loading/error handling

### Pattern 3: Sync Queue with Exponential Backoff
**What:** Queue offline mutations in IndexedDB, process on reconnect with exponential backoff retry.

**When to use:** Form submissions, status updates, notes, time entries while offline.

**Example:**
```typescript
// Source: https://advancedweb.hu/how-to-implement-an-exponential-backoff-retry-strategy-in-javascript/
async function processQueueItem(item: SyncQueueItem, depth = 0): Promise<void> {
  try {
    // Attempt to sync with Supabase
    await syncToSupabase(item)
    // Success - remove from queue
    await db.syncQueue.delete(item.id!)
  } catch (error) {
    // Max 8 attempts (depth 0-7)
    if (depth > 7) {
      await db.syncQueue.update(item.id!, {
        retryCount: depth,
        lastError: error.message
      })
      toast.error('Synchronisierung fehlgeschlagen: ' + item.entityType)
      throw error
    }

    // Exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms, 320ms, 640ms, 1280ms
    await wait(2 ** depth * 10)

    // Retry
    return processQueueItem(item, depth + 1)
  }
}
```

**Key insight:** Retry logic MUST NOT delay the first attempt. Only subsequent retries get exponential delay.

### Pattern 4: Last-Write-Wins Conflict Resolution
**What:** Compare `updated_at` timestamps. Server timestamp wins. Notify user with auto-dismiss toast.

**When to use:** On successful sync after offline period when entity was modified both locally and on server.

**Example:**
```typescript
// Source: https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79
async function resolveConflict(
  localEntity: any,
  serverEntity: any
): Promise<'local' | 'server'> {
  const localTime = new Date(localEntity.updated_at).getTime()
  const serverTime = new Date(serverEntity.updated_at).getTime()

  if (serverTime > localTime) {
    // Server wins - notify user
    toast('Ihre Aenderungen wurden ueberschrieben', { duration: 4000 })
    // Update local cache with server data
    await db.cachedEntities.update(localEntity.id, {
      data: serverEntity,
      cachedAt: Date.now()
    })
    return 'server'
  }

  return 'local'
}
```

**Important:** Server `updated_at` is authority. Database trigger ensures accurate timestamps (Supabase `moddatetime` extension).

### Pattern 5: Client-Side Image Compression
**What:** Compress photos to max 1920px and 80% JPEG quality before storing in IndexedDB.

**When to use:** Before queueing photos captured offline.

**Example:**
```typescript
// Source: https://www.npmjs.com/package/browser-image-compression
import imageCompression from 'browser-image-compression'

async function compressAndQueuePhoto(file: File, entityId: string) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8
  }

  const compressedFile = await imageCompression(file, options)
  const blob = await compressedFile.arrayBuffer()

  await db.photoQueue.add({
    entityType: 'workOrder',
    entityId,
    blob: new Blob([blob], { type: 'image/jpeg' }),
    fileName: file.name,
    createdAt: Date.now(),
    retryCount: 0
  })
}
```

**Why compress first:** Reduces IndexedDB storage pressure and upload time on slow mobile connections.

### Pattern 6: Avoiding SSR Hydration Mismatches
**What:** IndexedDB is browser-only. Prevent SSR hydration errors by deferring IndexedDB reads to `useEffect`.

**When to use:** All components using IndexedDB in Next.js.

**Example:**
```typescript
// Source: https://nextjs.org/docs/messages/react-hydration-error
'use client'

function PropertyDetailsOffline({ propertyId }: { propertyId: string }) {
  const [cachedData, setCachedData] = useState(null)

  useEffect(() => {
    // IndexedDB only accessed after hydration
    db.cachedEntities
      .where({ entityType: 'property', entityId: propertyId })
      .first()
      .then(setCachedData)
  }, [propertyId])

  // Always render same content on server and initial client render
  if (!cachedData) return <SkeletonLoader />

  return <PropertyDetails data={cachedData.data} />
}
```

**Alternative:** Use `dynamic()` with `{ ssr: false }` for components that ONLY work offline.

### Anti-Patterns to Avoid

- **Indexing blob data**: NEVER add blob/binary fields to Dexie schema index string. Causes performance degradation and crashes.
- **Catching errors without rethrowing in transactions**: Dexie transactions auto-rollback on uncaught errors. If you catch an error, you MUST rethrow it or return `Promise.reject(error)`.
- **Accessing IndexedDB during SSR**: Causes hydration mismatches. Always defer to `useEffect` or disable SSR for component.
- **Forgetting dependencies in useLiveQuery**: External variables MUST be in dependencies array or query won't react to changes.
- **Concurrent photo uploads**: Avoid parallel uploads on mobile connections. Sequential uploads are predictable and less bandwidth-intensive.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB schema versioning | Manual version checks and migrations | Dexie `db.version()` | Dexie handles schema upgrades declaratively. Supports upgrade functions for data migrations. Prevents IndexedDB version conflicts. |
| Reactive queries | Polling IndexedDB with setInterval | `useLiveQuery()` from dexie-react-hooks | Automatic re-rendering when IndexedDB data changes. Works across tabs/workers via Dexie 3.1+ change notifications. |
| Image compression | Canvas API with custom resize logic | browser-image-compression | Handles EXIF rotation, aspect ratio, quality optimization, Web Worker offloading. |
| Exponential backoff | Custom retry counters and setTimeout chains | Retry function with `2 ** depth * 10` formula | Well-tested pattern. Prevents infinite retries. Jitter optional (not needed for Phase 28). |
| Storage quota management | Custom eviction logic | StorageManager API + Dexie count queries | Browser handles LRU eviction. Request persistent storage for critical data via `navigator.storage.persist()`. |

**Key insight:** IndexedDB is complex and browser-inconsistent. Dexie.js abstracts these differences and provides schema versioning that prevents common upgrade failures. Attempting to hand-roll IndexedDB abstraction adds months to development and risks data corruption bugs.

## Common Pitfalls

### Pitfall 1: IndexedDB Transaction Auto-Commit
**What goes wrong:** Transaction commits prematurely when async operations occur outside transaction scope.

**Why it happens:** IndexedDB commits a transaction as soon as it isn't used within a tick. Any async API call (fetch, setTimeout, etc.) breaks the transaction chain.

**How to avoid:**
- Do NOT call any async API within a transaction scope unless it returns an IndexedDB promise
- Return promises to callers rather than awaiting them inside transactions
- If you must catch an error, rethrow it: `throw error` or `return Promise.reject(error)`

**Warning signs:** Data partially written to IndexedDB. No error thrown but transaction didn't complete all operations.

**Source:** [Dexie.js Best Practices](https://dexie.org/docs/Tutorial/Best-Practices)

### Pitfall 2: Schema Migration Breaking Existing Installs
**What goes wrong:** Changing an existing Dexie version causes IndexedDB upgrade failures for users with that version installed.

**Why it happens:** IndexedDB version numbers are sequential and permanent. Modifying a version that users already have causes version mismatch errors.

**How to avoid:**
- NEVER alter an existing `db.version(N).stores({...})` declaration
- Add a NEW version (`db.version(N+1)`) for schema changes
- Keep old versions in code as long as users have them installed
- Use `Version.upgrade()` to migrate data between versions

**Warning signs:** "VersionError: Version change transaction was aborted" in Sentry logs.

**Source:** [Dexie Version Management](https://dexie.org/docs/Dexie/Dexie.version())

### Pitfall 3: Storage Eviction Without User Warning
**What goes wrong:** Browser evicts IndexedDB data without notification when disk space is low. User loses offline data.

**Why it happens:** IndexedDB defaults to "best-effort" storage. Browser can delete it anytime.

**How to avoid:**
- Request persistent storage after user demonstrates repeated app usage: `await navigator.storage.persist()`
- Check storage quota before large operations: `await navigator.storage.estimate()`
- Fallback gracefully if data is evicted (re-cache from server on reconnect)

**Warning signs:** Users report "data disappeared" after using other apps. IndexedDB empty on app reopen.

**Source:** [Dexie StorageManager API](https://dexie.org/docs/StorageManager)

### Pitfall 4: Optimistic UI Without Rollback
**What goes wrong:** User sees submitted data as saved, but sync fails permanently. Data is lost.

**Why it happens:** Optimistic updates show success immediately. If sync fails and error handling is missing, user never knows.

**How to avoid:**
- Show "pending sync" badge on optimistically updated records
- Toast notification on sync failure: "Synchronisierung fehlgeschlagen"
- Keep failed items in sync queue with "retry" or "discard" options
- Never silently drop failed syncs

**Warning signs:** User complains "I submitted this yesterday but it's gone." No error was shown.

**Source:** [React Optimistic UI Patterns](https://react.dev/reference/react/useOptimistic)

### Pitfall 5: SSR Hydration Mismatch with IndexedDB
**What goes wrong:** Next.js throws "Text content does not match server-rendered HTML" error. App breaks on initial load.

**Why it happens:** IndexedDB doesn't exist during SSR. Component renders different content on server vs. client.

**How to avoid:**
- Defer IndexedDB reads to `useEffect` (runs client-only)
- Use `dynamic()` with `{ ssr: false }` for offline-only components
- Render same skeleton/loading state on server and initial client render
- NEVER check `navigator.onLine` or access `window.indexedDB` outside `useEffect`

**Warning signs:** Hydration errors in Next.js dev console. Component flashes different content on load.

**Source:** [Next.js Hydration Errors](https://nextjs.org/docs/messages/react-hydration-error)

### Pitfall 6: Treating Connectivity as Binary
**What goes wrong:** App shows "online" but API requests timeout. Sync fails despite connectivity indicator showing connected.

**Why it happens:** `navigator.onLine` only detects network interface status, not actual internet connectivity. User can be "online" but have no route to server.

**How to avoid:**
- Treat sync failures as expected even when `isOnline === true`
- Retry with exponential backoff regardless of connectivity state
- Show sync status based on actual sync success/failure, not just `navigator.onLine`
- Use timeout on API requests (5-10s) to detect slow/broken connections

**Warning signs:** User says "I'm connected to Wi-Fi but app says sync failed."

**Source:** Phase 27 ConnectivityContext already uses `navigator.onLine` (binary). Phase 28 sync logic MUST handle failures independently.

## Code Examples

Verified patterns from official sources:

### Dexie Database Initialization
```typescript
// Source: https://dexie.org/docs/Tutorial/Understanding-the-basics
import Dexie, { type EntityTable } from 'dexie'

const db = new Dexie('KeWaDB') as Dexie & {
  cachedEntities: EntityTable<CachedEntity, 'id'>
  syncQueue: EntityTable<SyncQueueItem, 'id'>
  photoQueue: EntityTable<PhotoQueueItem, 'id'>
}

db.version(1).stores({
  cachedEntities: '++id, entityType, entityId, viewedAt, pinned',
  syncQueue: '++id, createdAt',
  photoQueue: '++id, createdAt'
})

export { db }
```

### useLiveQuery for Reactive Data
```typescript
// Source: https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
import { useLiveQuery } from 'dexie-react-hooks'

function usePendingSyncCount() {
  const count = useLiveQuery(
    () => db.syncQueue.count()
  )
  return count ?? 0 // Default to 0 while loading
}
```

### Cache Entity on View
```typescript
// Source: Dexie CRUD patterns
async function cacheEntityOnView(
  entityType: string,
  entityId: string,
  data: any
) {
  const existing = await db.cachedEntities
    .where({ entityType, entityId })
    .first()

  if (existing) {
    // Update viewedAt timestamp for LRU eviction
    await db.cachedEntities.update(existing.id, {
      data,
      viewedAt: Date.now(),
      cachedAt: Date.now()
    })
  } else {
    await db.cachedEntities.add({
      entityType,
      entityId,
      data,
      cachedAt: Date.now(),
      viewedAt: Date.now(),
      pinned: false
    })
  }
}
```

### Process Sync Queue on Reconnect
```typescript
// Source: Exponential backoff + Dexie patterns
async function processSyncQueue() {
  const items = await db.syncQueue.orderBy('createdAt').toArray()

  for (const item of items) {
    try {
      await processQueueItemWithRetry(item)
    } catch (error) {
      console.error('Final sync failure:', error)
      // Keep in queue with error - user can retry or discard
    }
  }
}

async function processQueueItemWithRetry(
  item: SyncQueueItem,
  depth = 0
): Promise<void> {
  try {
    // Sync to Supabase
    const response = await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify(item.payload)
    })

    if (!response.ok) throw new Error(response.statusText)

    // Success - remove from queue
    await db.syncQueue.delete(item.id!)
  } catch (error) {
    if (depth > 7) {
      await db.syncQueue.update(item.id!, {
        retryCount: depth,
        lastError: error.message
      })
      throw error
    }

    await wait(2 ** depth * 10)
    return processQueueItemWithRetry(item, depth + 1)
  }
}
```

### Client-Side Photo Compression
```typescript
// Source: https://www.npmjs.com/package/browser-image-compression
import imageCompression from 'browser-image-compression'

async function compressPhoto(file: File): Promise<Blob> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8
  })

  return compressed
}
```

### Request Persistent Storage
```typescript
// Source: https://dexie.org/docs/StorageManager
async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false

  const isPersisted = await navigator.storage.persisted()
  if (isPersisted) return true

  // Request - browser may show permission prompt
  return await navigator.storage.persist()
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LocalStorage for offline data | IndexedDB via Dexie | ~2020 | LocalStorage max 5-10MB, synchronous API blocks UI. IndexedDB supports GBs, async, structured data. |
| Manual IndexedDB API | Dexie.js abstraction | ~2015 (Dexie v1) | Raw IndexedDB API is verbose and error-prone. Dexie reduces code 5-10x, handles browser inconsistencies. |
| Polling for data updates | Reactive queries (useLiveQuery) | 2021 (Dexie 3.1) | Polling wastes CPU. Reactive queries auto-update on changes via change notifications. |
| CRDTs for all conflicts | Last-Write-Wins for single-user apps | ~2023 | CRDTs add complexity and library weight (RxDB + RxJS). LWW sufficient for non-collaborative workflows. |
| Canvas-based image compression | browser-image-compression library | ~2019 | Canvas API requires manual EXIF handling, aspect ratio math, quality tuning. Library handles edge cases. |
| Service Worker Background Sync | App-level sync queue with exponential backoff | ~2024 | Background Sync API has poor Safari support (still not implemented). App-level queues work everywhere. |

**Deprecated/outdated:**
- **idb-keyval**: Simple key-value wrapper for IndexedDB. Lacks schema versioning and queries. Use Dexie for structured data.
- **PouchDB**: Designed for CouchDB sync. Heavy (150KB+), unmaintained since 2021. Use Dexie + custom Supabase sync.
- **localForage**: Abstraction over LocalStorage/IndexedDB. Doesn't support complex queries or schemas. Use Dexie directly.

## Open Questions

Things that couldn't be fully resolved:

1. **Cache eviction count limits**
   - What we know: Browser quota is at least 1GB per origin, up to 60% of disk space. LRU eviction when quota exceeded.
   - What's unclear: Optimal count limits per entity type (properties, units, work orders). Requires benchmarking IndexedDB storage usage per entity.
   - Recommendation: Start conservative (50 properties, 200 units, 500 work orders). Monitor storage usage with `navigator.storage.estimate()`. Adjust limits in Phase 28 verification based on real data sizes.

2. **Background Sync API for service worker integration**
   - What we know: Background Sync API queues sync events in service worker. Limited browser support (Safari still not implemented in 2026).
   - What's unclear: Whether Safari will add support in 2026. Current status shows "In Development" per WebKit tracker.
   - Recommendation: Phase 28 uses app-level sync queue (works everywhere). Defer Background Sync to Phase 29+ if Safari ships support.

3. **Persistent storage permission UX**
   - What we know: `navigator.storage.persist()` may prompt user (Firefox does, Chrome auto-grants based on engagement heuristics).
   - What's unclear: Exact engagement thresholds for Chrome auto-grant. Safari grants for Home Screen apps.
   - Recommendation: Request persistent storage after user pins an entity (demonstrates value). Show toast if permission denied, explaining data may be evicted.

4. **Photo compression quality vs. size tradeoff**
   - What we know: 80% JPEG quality and 1920px max are standard mobile app settings.
   - What's unclear: Optimal settings for construction inspection photos (may need higher quality for zooming on defects).
   - Recommendation: Start with 80%/1920px (Phase 28-CONTEXT decision). Add quality setting in Phase 28 verification if testers report photos are too compressed.

## Sources

### Primary (HIGH confidence)
- [Dexie.js Official Documentation](https://dexie.org/docs) - API reference, best practices, schema design
- [dexie-react-hooks Documentation](https://dexie.org/docs/dexie-react-hooks/useLiveQuery()) - useLiveQuery API and patterns
- [Next.js Hydration Errors](https://nextjs.org/docs/messages/react-hydration-error) - SSR pitfalls with client-only APIs
- [MDN Storage Quotas and Eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - Browser storage limits and persistence
- [Exponential Backoff Implementation](https://advancedweb.hu/how-to-implement-an-exponential-backoff-retry-strategy-in-javascript/) - Retry pattern with depth parameter

### Secondary (MEDIUM confidence)
- [Building Offline-First PWA with Next.js, IndexedDB, Supabase (Jan 2026)](https://medium.com/@oluwadaprof/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9) - Recent pattern from 2026 showing sync queue with Supabase
- [Offline-First Architecture (Medium, 2025)](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79) - Architectural principles, conflict resolution patterns
- [Offline-First Apps 2025 (LogRocket, Nov 2025)](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - Ecosystem state, IndexedDB vs. SQLite comparison
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic) - React 19 official pattern for optimistic updates
- [Supabase Replication Plugin for RxDB](https://rxdb.info/replication-supabase.html) - Conflict resolution with `_modified` timestamp pattern

### Tertiary (LOW confidence)
- [Dexie Best Practices Wiki](https://github.com/dexie/Dexie.js/wiki/Best-Practices) - Migrated to dexie.org, page unavailable during research. Need to verify on dexie.org.
- [IndexedDB Blob Storage (Dexie.js Medium)](https://medium.com/dexie-js/keep-storing-large-images-just-dont-index-the-binary-data-itself-10b9d9c5c5d7) - 403 error during fetch. Core advice verified via search results (don't index blobs).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Dexie.js is industry standard, official documentation comprehensive, version 4.2.1 already approved in STATE.md
- Architecture: HIGH - Patterns verified across multiple recent sources (2025-2026), matches Phase 28-CONTEXT decisions
- Pitfalls: HIGH - Documented in official Dexie.js sources and Next.js docs, specific to Phase 28 tech stack

**Research date:** 2026-01-30
**Valid until:** 2026-03-30 (60 days - Dexie.js is stable, offline-first patterns are mature)

**Key sources:**
- [Dexie.js Documentation](https://dexie.org/)
- [Background Sync API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [browser-image-compression (npm)](https://www.npmjs.com/package/browser-image-compression)
- [IndexedDB Storage Limits (RxDB)](https://rxdb.info/articles/indexeddb-max-storage-limit.html)
- [TanStack Query Optimistic Updates](https://tanstack.com/query/v4/docs/react/guides/optimistic-updates)
