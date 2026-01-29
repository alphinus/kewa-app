# Technology Stack: v3.0 Tenant Portal + Offline PWA + UX Polish

**Project:** KEWA Renovation Operations System
**Milestone:** v3.0
**Researched:** 2026-01-29
**Mode:** Stack dimension of ecosystem research

## Executive Summary

v3.0 adds three capabilities to an existing 100K+ LOC Next.js 16 codebase: a tenant self-service portal, offline PWA support, and UX polish. The existing stack already handles tenant auth (email+password, RBAC, permissions), so the tenant portal is primarily a UI/routing concern with new database tables for tickets. Offline PWA is the significant new technical surface -- requiring service worker expansion, IndexedDB for local data, and a sync queue. UX polish needs a toast notification library for user feedback but no other new dependencies.

**Key finding:** The existing codebase has more scaffolding for v3.0 than expected. Tenant auth, RBAC permissions for tickets, tenant-unit linking, and service worker registration are all already built. The new stack additions are minimal and targeted.

---

## Recommended Additions

### 1. Dexie.js -- IndexedDB Wrapper for Offline Data

| Property | Value |
|----------|-------|
| Package | `dexie` |
| Version | 4.2.1 |
| Purpose | Client-side IndexedDB database for offline data storage and sync queue |
| Confidence | HIGH (npm registry, official docs verified) |

**Why Dexie over alternatives:**

- **Not idb-keyval:** idb-keyval is key-value only. KEWA needs structured data (tickets, work orders, sync queue entries) with queries, indexes, and transactions. idb-keyval cannot do WHERE clauses or compound indexes.
- **Not raw IndexedDB:** The IndexedDB API is notoriously verbose and callback-heavy. Dexie wraps it with promises, schema versioning, and a fluent query API. No reason to hand-write what Dexie solves.
- **Not PouchDB:** PouchDB targets CouchDB replication. KEWA uses Supabase/Postgres. PouchDB's sync model is incompatible. Dexie works with any backend via manual sync.
- **Dexie specifically:** 13,800+ GitHub stars, 787K weekly downloads, built-in schema migrations, React hooks via `dexie-react-hooks`, observable queries via `useLiveQuery()`. The reactive queries mean components auto-update when IndexedDB data changes -- critical for showing sync status.

**What it provides:**
- Structured offline data storage with indexes and queries
- Schema versioning (important as offline schema evolves)
- `useLiveQuery()` hook for reactive UI updates from IndexedDB
- Transaction support for atomic offline operations
- Cross-tab/worker observation (service worker writes, UI reacts)

### 2. dexie-react-hooks -- React Hooks for Dexie

| Property | Value |
|----------|-------|
| Package | `dexie-react-hooks` |
| Version | 4.2.0 |
| Purpose | React hooks (`useLiveQuery`) for reactive IndexedDB queries |
| Confidence | HIGH (npm registry, official docs verified) |

**Why a separate package:**
Dexie core is framework-agnostic. The React hooks package adds `useLiveQuery()`, `useObservable()`, and others. This is the official pattern -- Dexie core + framework-specific hooks.

**What it provides:**
- `useLiveQuery()`: Observable IndexedDB queries that re-render components on data change
- Works across tabs and service workers -- if the SW writes to IndexedDB, the UI tab sees it immediately
- RAM-sparse: only the queried data is in memory, not the entire database

### 3. Sonner -- Toast Notifications for UX Feedback

| Property | Value |
|----------|-------|
| Package | `sonner` |
| Version | 2.0.7 |
| Purpose | Toast notifications for user feedback (sync status, errors, confirmations) |
| Confidence | HIGH (npm registry verified) |

**Why Sonner:**
- Zero dependencies, lightweight
- No hooks or complex setup -- call `toast()` from anywhere
- Stacking animation out of the box
- TypeScript-first
- Works with Next.js App Router (client component only, which is fine for toasts)
- The app currently has NO toast/notification UI for user actions (only push notifications). Every form submission, sync event, and error needs visual feedback.

**Why not react-hot-toast:**
Both are good. Sonner is newer (v2.0), has stacking animations, and zero-config setup. react-hot-toast is 5KB and battle-tested but lacks built-in stacking. For a new addition in 2026, Sonner is the community consensus.

**What it provides:**
- `toast.success()`, `toast.error()`, `toast.loading()` for sync status
- `toast.promise()` for async operations (submit ticket, sync data)
- Offline/online status toasts
- Action confirmation toasts

---

## Existing Stack -- No Changes Needed

These are already in `package.json` and fully sufficient for v3.0:

| Existing Technology | v3.0 Usage | Why No Change |
|---------------------|------------|---------------|
| `next` 16.1.2 | App Router for `/tenant` routes, `manifest.ts` metadata API | Already supports PWA manifest via `app/manifest.ts` convention |
| `react` 19.2.3 | Tenant portal UI components | Current |
| `@supabase/supabase-js` 2.90.1 | Ticket CRUD, tenant data | Already works for all data operations |
| `@supabase/ssr` 0.8.0 | Server-side Supabase client | Already used for auth and data |
| `jose` 6.1.3 | JWT session tokens for tenants | Already creates tenant sessions |
| `bcryptjs` 3.0.3 | Password hashing for tenant email auth | Already used in `/api/auth/login` for email+password |
| `tailwindcss` 4 | Tenant portal styling | Already the design system |
| `lucide-react` 0.562.0 | Icons for tenant UI | Already the icon library |
| `date-fns` 4.1.0 | Date formatting in tickets | Already used everywhere |
| `web-push` 3.6.7 | Tenant notifications | Already handles push subscriptions |
| `clsx` + `tailwind-merge` | Conditional classes | Already the styling utilities |

### Auth System -- Already Complete for Tenants

This is the most important finding. The existing auth system already supports tenant email+password authentication:

- `users` table has `email`, `password_hash`, `auth_method='email_password'`, `role_id` fields
- `roles` table has `tenant` role with permissions: `units:read`, `tickets:create`, `tickets:read`
- `tenant_users` table links users to units with `move_in_date`, `move_out_date`
- `/api/auth/login` handles email+password login with full RBAC session creation
- `/api/auth/register` creates tenant users with unit linking
- `LoginRequest` type already has `email` and `password` fields
- `PERMISSIONS` constants include `TICKETS_READ`, `TICKETS_CREATE`, `TICKETS_UPDATE`, `TICKETS_CONVERT`
- `ROLE_HIERARCHY` places tenant at level 20
- Middleware sets RBAC headers for all authenticated requests

**What IS needed:** The middleware currently blocks non-internal roles from `/dashboard` via `isInternalRole()`. A new `/tenant` route tree needs to be added to the middleware matcher, and tenant routes need their own layout. This is routing config, not a stack addition.

### Service Worker -- Exists, Needs Expansion

The existing `public/sw.js` handles push notifications only (push event, notificationclick, pushsubscriptionchange). PushContext.tsx registers the SW at `/sw.js` with `updateViaCache: 'none'`. For v3.0 offline support, this SW needs to be expanded to add:

1. Cache API handlers (fetch event interception)
2. Background sync event handlers
3. IndexedDB sync queue processing

This is code expansion of an existing file, not a stack change.

---

## Service Worker Strategy: Manual Expansion (No Serwist)

This is the most consequential architectural decision for v3.0.

### Recommendation: Manual service worker expansion

**Why NOT Serwist (`@serwist/next` v9.5.0):**

1. **Webpack requirement conflicts with project:** Serwist's `@serwist/next` requires webpack. Next.js 16.1.2 defaults to Turbopack. The project's `next.config.ts` already has `turbopack: { root: __dirname }` configuration. Using Serwist means `next build --webpack` (slower builds, against Next.js 16 direction). The `@serwist/turbopack` package (v9.5.0) exists but has reported issues with `process.env` being undefined in workers.

2. **Existing SW would need rewrite:** Serwist generates and manages the service worker from `app/sw.ts`. The existing `public/sw.js` with custom push notification logic and the PushContext registration pattern would need complete rewrite. Migration cost outweighs benefit.

3. **Precaching is not the goal:** Serwist's primary value is precaching build assets. KEWA is a data-heavy internal tool. Users need recent data, not cached HTML shells. The offline requirement is about queueing mutations and caching API responses.

4. **KEWA's offline scope is narrow:** Offline support targets: (a) queue ticket submissions when offline, (b) cache recent API data for read access, (c) show offline/online indicators. This does not need a full PWA framework.

**Why manual SW expansion works:**

1. **Existing SW is already hand-written:** `public/sw.js` is 46 lines of clean code. Adding fetch event handlers and sync logic is straightforward.
2. **No build tooling conflict:** Hand-written `public/sw.js` works with both Turbopack and webpack. No build plugin needed.
3. **Cache API and Background Sync API are native browser APIs.** No wrapper needed for basic runtime caching strategies.
4. **Workbox CDN for specific strategies:** If needed, `importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js')` can be added inside the SW file. One line, no npm dependency, no build conflict.

**Background Sync browser support note:** The Background Sync API is only supported in Chromium browsers (Chrome, Edge, Samsung Internet). Firefox and Safari do not support it. The implementation must include a fallback: retry the sync queue every time the SW starts up or when the `online` event fires. This is the standard approach documented by Workbox.

**Confidence:** MEDIUM-HIGH. Manual approach is proven and recommended by Next.js official docs. More code to maintain, but scope is narrow enough.

---

## Web App Manifest -- Built-in Next.js Feature

No package needed. Next.js 16 App Router supports manifests via file convention:

```
app/manifest.ts  -->  generates /manifest.webmanifest automatically
```

The `MetadataRoute.Manifest` TypeScript type provides full type safety. Next.js auto-injects the `<link rel="manifest">` tag into `<head>`. Zero-dependency.

**What the manifest provides:**
- `name`, `short_name`: KEWA branding
- `start_url: '/'`
- `display: 'standalone'` for app-like experience
- `theme_color`, `background_color` matching Tailwind theme
- `icons` array (192x192 and 512x512 PNGs in `/public/`)
- iOS meta tags via layout.tsx viewport metadata

---

## Conflict Resolution Strategy: Last-Write-Wins

For the offline sync queue, the conflict resolution strategy:

**Last-Write-Wins (LWW) with server timestamp authority.**

**Why LWW is correct for KEWA:**
- KEWA has 2 internal users (admin, property manager) and tenants. Simultaneous conflicting edits to the same record are extremely unlikely.
- Tenants create tickets (write-only operation). They do not edit shared data concurrently.
- Internal users primarily work on desktop with stable connections. Offline mode is for mobile/field use.
- LWW with `updated_at` timestamps is simple, predictable, and sufficient.

**Why NOT CRDTs or OT:**
- CRDTs add significant complexity (custom data types, merge functions). Overkill for 2 internal users + tenant ticket creation.
- OT requires centralized transformation. Not needed when writes are independent.
- The data model is record-level (create ticket, update status), not field-level collaborative editing.

---

## Installation Commands

```bash
# New dependencies for v3.0
npm install dexie@^4.2.1 dexie-react-hooks@^4.2.0 sonner@^2.0.7
```

3 new packages total. Bundle impact:
- `dexie`: ~42KB minified (tree-shakeable, only loaded on client)
- `dexie-react-hooks`: ~3KB (React bindings only)
- `sonner`: ~12KB (zero dependencies)

No new dev dependencies needed.

---

## Anti-Recommendations

### DO NOT Add

| Library/Service | Why Not |
|-----------------|---------|
| `@serwist/next` / `serwist` | Conflicts with Turbopack config, replaces existing SW, overkill for narrow offline scope |
| `next-pwa` / `@ducanh2912/next-pwa` | Unmaintained / predecessor to Serwist, author recommends migration away |
| `workbox` (npm packages) | Build-time webpack plugins conflict with Turbopack. Use CDN `importScripts` in SW if needed |
| Supabase Auth (native) | Project uses custom JWT auth (`jose` + `bcryptjs`) with 3 auth methods. Supabase Auth would conflict with existing RBAC |
| PouchDB | Designed for CouchDB replication, incompatible with Supabase/Postgres backend |
| framer-motion | 30KB+ for cosmetic animations. Tailwind CSS 4 transitions are sufficient for UX polish scope |
| Supabase Realtime / WebSocket | Sync queue uses REST replay, not real-time streams. Tickets are request-response, not live chat |
| zod / form validation library | Existing codebase validates inline with TypeScript. Adding zod only for tenant forms creates inconsistency |
| react-query / SWR | Offline sync uses Dexie + custom sync queue, not cache-based data fetching |

### DO NOT Change

| Current | Alternative | Why Keep Current |
|---------|-------------|------------------|
| Custom JWT auth (`jose`) | NextAuth / Auth.js | 3 auth methods (PIN, email, magic-link) already work. NextAuth adds complexity for no benefit |
| Hand-written SW (`public/sw.js`) | Serwist-generated | Existing push handlers, no Turbopack conflict |
| `public/sw.js` location | `app/sw.ts` (Serwist pattern) | Convention already established, PushContext already registers from `/sw.js` |

---

## Integration Points

### 1. Service Worker Merge Strategy

The existing `public/sw.js` (push-only, 46 lines) must be expanded. Merge strategy:

- **Keep:** All existing event handlers (push, notificationclick, pushsubscriptionchange)
- **Add:** `install` event for optional static asset pre-caching
- **Add:** `activate` event for cache cleanup on SW update
- **Add:** `fetch` event listener with caching strategy (network-first for API calls, cache-first for static assets)
- **Add:** `sync` event listener for Background Sync queue processing (with online-event fallback)
- **Add:** Dexie import for reading/writing sync queue from within the SW

**Dexie in service worker:** Dexie works in service workers. The same database definition used in the main thread can be imported in the SW. The SW reads the sync queue and replays pending mutations when online.

### 2. Middleware Extension for Tenant Routes

Current middleware matcher:
```typescript
matcher: ['/dashboard/:path*', '/api/((?!auth).*)', '/contractor/:path*']
```

Must add `/tenant/:path*`:
```typescript
matcher: ['/dashboard/:path*', '/api/((?!auth).*)', '/contractor/:path*', '/tenant/:path*']
```

A `handleTenantRoute()` function validates the session cookie and checks `roleName === 'tenant'`. The existing session infrastructure (JWT in httpOnly cookie) works identically for tenants -- the session is already created with tenant role data in `/api/auth/login`.

### 3. Dexie Database Schema

```typescript
// src/lib/offline/db.ts
import Dexie, { type EntityTable } from 'dexie'

interface SyncQueueEntry {
  id?: number          // auto-increment
  url: string          // API endpoint
  method: string       // POST, PUT, PATCH
  body: string         // JSON serialized request body
  timestamp: number    // Date.now() when queued
  retryCount: number   // number of failed sync attempts
  status: 'pending' | 'syncing' | 'failed'
}

interface CachedTicket {
  id: string
  title: string
  description: string
  status: string
  unit_id: string
  created_at: string
  updated_at: string
}

const db = new Dexie('kewa-offline') as Dexie & {
  syncQueue: EntityTable<SyncQueueEntry, 'id'>
  tickets: EntityTable<CachedTicket, 'id'>
}

db.version(1).stores({
  syncQueue: '++id, status, timestamp',
  tickets: 'id, unit_id, status, updated_at'
})

export { db }
```

### 4. Online/Offline Detection

Custom hook using native browser APIs:

```typescript
// src/hooks/useOnlineStatus.ts
// navigator.onLine + window 'online'/'offline' events
// Triggers toast notifications via Sonner
// Triggers sync queue processing when coming online
```

No library needed. Native browser APIs are sufficient.

### 5. Toast Integration (Sonner)

```typescript
// In root layout (client component wrapper):
import { Toaster } from 'sonner'

// Usage anywhere:
import { toast } from 'sonner'
toast.success('Ticket erstellt')
toast.error('Verbindungsfehler')
toast.loading('Daten werden synchronisiert...')
```

### 6. Manifest Integration

```typescript
// app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KEWA Renovation Operations',
    short_name: 'KEWA',
    description: 'Renovations-Management-System fuer KEWA AG',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e40af',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Tenant auth needs | HIGH | Verified by reading: auth.ts, session.ts, middleware.ts, login route, register route, RBAC migrations, permissions.ts. Email+password auth fully built. |
| Dexie recommendation | HIGH | npm registry verified (4.2.1, 787K weekly downloads), React hooks verified (4.2.0), well-documented API |
| Sonner recommendation | HIGH | npm registry verified (2.0.7, zero deps), community consensus for 2026, no existing toast library in codebase |
| Manual SW over Serwist | MEDIUM-HIGH | Turbopack conflict verified via multiple sources. @serwist/turbopack has known issues. Manual approach documented by Next.js official docs. Risk: more code to maintain, mitigated by narrow scope. |
| LWW conflict resolution | HIGH | Correct for KEWA's user model (2 internal users + tenants with write-only tickets) |
| No manifest package | HIGH | Verified via official Next.js docs: `app/manifest.ts` convention auto-generates manifest |
| Background Sync fallback | HIGH | MDN docs confirm limited browser support. Workbox docs document the fallback pattern. |

---

## Sources

**Official Documentation:**
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) -- manifest.ts convention, service worker setup, Serwist recommendation
- [Next.js Manifest File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) -- MetadataRoute.Manifest type
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview) -- NetworkFirst, CacheFirst, StaleWhileRevalidate patterns
- [Workbox Background Sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync) -- Queue and retry pattern
- [Background Synchronization API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) -- Browser support, API reference
- [Dexie.js Documentation](https://dexie.org) -- IndexedDB wrapper, schema versioning
- [dexie-react-hooks](https://dexie.org/docs/dexie-react-hooks/useLiveQuery()) -- useLiveQuery API
- [Sonner Documentation](https://sonner.emilkowal.ski/) -- Toast component API

**Package Registries (verified 2026-01-29):**
- [dexie@4.2.1 on npm](https://www.npmjs.com/package/dexie) -- 787K weekly downloads, 13.8K GitHub stars
- [dexie-react-hooks@4.2.0 on npm](https://www.npmjs.com/package/dexie-react-hooks) -- 71 dependents
- [sonner@2.0.7 on npm](https://www.npmjs.com/package/sonner) -- 2,451 dependents, zero dependencies
- [serwist@9.5.0 on npm](https://www.npmjs.com/package/serwist) -- evaluated and rejected
- [@serwist/turbopack@9.5.0 on npm](https://www.npmjs.com/package/@serwist/turbopack) -- experimental, known issues

**Ecosystem Research:**
- [Serwist Getting Started](https://serwist.pages.dev/docs/next/getting-started) -- webpack requirement documented
- [Serwist Turbopack Issue #54](https://github.com/serwist/serwist/issues/54) -- 56+ upvotes, status: backlog/planned
- [IndexedDB Library Comparison](https://npm-compare.com/dexie,idb-keyval,localforage) -- Dexie vs idb-keyval vs localforage
- [LogRocket: Next.js 16 PWA with Offline Support](https://blog.logrocket.com/nextjs-16-pwa-offline-support) -- Serwist + IndexedDB approach
- [Next.js PWA without Extra Packages](https://adropincalm.com/blog/nextjs-offline-service-worker/) -- Manual SW approach
- [Offline Conflict Resolution Strategies](https://www.adalo.com/posts/offline-vs-real-time-sync-managing-data-conflicts) -- LWW vs OT vs CRDTs

**Codebase Verification (read directly):**
- `src/lib/auth.ts` -- Custom JWT auth with bcryptjs, jose
- `src/lib/session.ts` -- Session validation, cookie management, RBAC support
- `src/middleware.ts` -- Route protection, contractor handling, internal role gating
- `src/lib/permissions.ts` -- RBAC constants including TICKETS_*, TENANTS_*, role hierarchy
- `src/lib/magic-link.ts` -- Magic link pattern (reference for tenant portal pattern)
- `src/contexts/PushContext.tsx` -- SW registration at `/sw.js`
- `src/app/api/auth/login/route.ts` -- Email+password auth handler (already handles tenants)
- `src/app/api/auth/register/route.ts` -- Tenant user creation with unit linking
- `src/types/auth.ts` -- TenantUser, TenantWithUnit types already defined
- `public/sw.js` -- Push-only service worker (46 lines)
- `next.config.ts` -- Turbopack config, SW cache headers
- `package.json` -- Current dependencies
- `supabase/migrations/023_users_auth.sql` -- tenant_users table, auth fields
- `supabase/migrations/022_rbac.sql` -- tenant role, ticket permissions
