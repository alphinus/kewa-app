# Architecture Patterns

**Domain:** Tenant Portal + Offline PWA + UX Polish for Renovation Operations System
**Researched:** 2026-01-29
**Confidence:** HIGH (based on codebase analysis + verified external sources)

## Executive Summary

The existing KEWA architecture is well-structured for these additions. The auth system already defines the `tenant` role, `email_password` auth method, `tenant_users` junction table, and ticket permissions in the RBAC schema. The service worker (`sw.js`) handles only push notifications today and must be expanded for offline caching. The key architectural challenge is integrating three new capabilities (tenant portal, offline sync, UX fixes) without disrupting the existing internal dashboard, contractor portal, and notification infrastructure.

---

## Integration Points

### Existing Architecture Map

```
src/
  app/
    layout.tsx              <-- Root: PushProvider wraps everything
    login/                  <-- PIN + email login page
    dashboard/              <-- Internal app (admin, property_manager, accounting)
      layout.tsx            <-- BuildingProvider + Header + MobileNav
      [feature]/page.tsx    <-- ~60 pages
    contractor/[token]/     <-- Magic-link contractor portal
      layout.tsx            <-- Minimal header, mobile-first
      [workOrderId]/        <-- Work order detail pages
    portal/                 <-- Change order + inspection approval portals
      change-orders/[token]/
      inspections/[token]/
    api/
      auth/                 <-- login, logout, register, session, magic-link
      [feature]/            <-- ~90 API routes
  middleware.ts             <-- Session + RBAC for /dashboard, /api, /contractor
  lib/
    auth.ts                 <-- PIN/password hash, session creation
    session.ts              <-- JWT validation, cookie management
    permissions.ts          <-- RBAC permission checks
    magic-link.ts           <-- Token validation for contractors
  contexts/
    BuildingContext.tsx      <-- Property filtering (dashboard only)
    PushContext.tsx          <-- Service worker registration + push subscription
  hooks/
    useSession.ts           <-- Client-side session fetch
public/
  sw.js                     <-- Push notification handlers only (47 lines)
```

### Integration Point 1: Authentication (Tenant Portal)

**Current state:**
- `middleware.ts` handles three route groups: `/dashboard/*` (session + internal role), `/api/*` (session + permissions), `/contractor/*` (magic-link token)
- Session JWT contains: `userId`, `role` (legacy: kewa/imeri), `roleId`, `roleName` (admin/property_manager/accounting/tenant/external_contractor), `permissions[]`
- `validateSession()` in `session.ts` rejects non-kewa/imeri legacy roles (line 92: `if (sessionPayload.role !== 'kewa' && sessionPayload.role !== 'imeri')`)
- Email+password login already works in `/api/auth/login` via `handleEmailAuth()`
- User registration already creates tenant users with `tenant_users` junction table

**Required changes:**
- Extend `validateSession()` / `validateSessionWithRBAC()` to accept tenant sessions (the legacy role field mapping needs a tenant-compatible value)
- Add `/tenant/*` route group to middleware matcher
- Add tenant-specific middleware handler (session-based, not magic-link)
- The `isInternalRole()` check correctly returns false for tenants (no change needed)

**Risk:** LOW. The auth infrastructure is 90% ready. The gap is the legacy role field -- tenants are mapped to `'imeri'` in `register.ts` (line 121), which is a hack that must be fixed cleanly.

### Integration Point 2: Service Worker (Offline PWA)

**Current state:**
- `public/sw.js` is 47 lines of plain JavaScript handling only push events (`push`, `notificationclick`, `pushsubscriptionchange`)
- Registered in `PushContext.tsx` via `navigator.serviceWorker.register('/sw.js')`
- `next.config.ts` sets `Cache-Control: no-cache` and `Service-Worker-Allowed: /` headers
- No `manifest.json` exists
- No PWA metadata in root layout
- No caching, no IndexedDB, no offline fallback

**Required changes:**
- Migrate from hand-written `sw.js` to Serwist-managed service worker
- Preserve existing push notification handlers in the new SW
- Add precaching for app shell (HTML, CSS, JS)
- Add runtime caching strategies (stale-while-revalidate for assets, network-first for API)
- Add IndexedDB stores for offline data and sync queue
- Add web app manifest
- Update `next.config.ts` to use `withSerwistInit` wrapper
- Build must use `--webpack` flag (Serwist requires webpack; Next.js 16 defaults to Turbopack)

**Risk:** MEDIUM. The service worker transition from manual to Serwist is the riskiest integration. Push notification handlers must be preserved. The `--webpack` flag for build is a constraint that affects CI/CD.

### Integration Point 3: Data Layer (Tenant Isolation)

**Current state:**
- `tenant_users` table links users to units (with `is_primary`, `move_in_date`, `move_out_date`)
- Units belong to buildings, buildings belong to properties
- RLS is disabled (`004_disable_rls.sql` migration exists)
- All API routes query Supabase without tenant scoping -- they rely on middleware auth headers
- Permissions for tenant role: `units:read`, `tickets:create`, `tickets:read`

**Required changes:**
- New `tickets` table (does not exist yet)
- All tenant API endpoints must filter by `tenant_users.unit_id` JOIN
- Tenant must never see data from other units/buildings (application-level enforcement)

**Risk:** MEDIUM. Application-level filtering is pragmatic since RLS is globally disabled. But every tenant API endpoint must consistently apply the unit filter. Missing a filter equals a data leak.

### Integration Point 4: Middleware Router

**Current state:**
```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/((?!auth).*)',
    '/contractor/:path*'
  ]
}
```

**Required changes:**
```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tenant/:path*',        // NEW
    '/api/((?!auth).*)',
    '/contractor/:path*'
  ]
}
```

New handler function `handleTenantRoute()`: validates session cookie (not magic-link), checks `roleName === 'tenant'`, injects `x-tenant-user-id` and `x-tenant-unit-ids` headers.

### Integration Point 5: Root Layout (PWA)

**Current state:**
- Root layout wraps everything in `PushProvider`
- No manifest link
- No theme-color meta tag (only in contractor layout)

**Required changes:**
- Add manifest link: `<link rel="manifest" href="/manifest.json" />`
- Add PWA meta tags (theme-color, apple-mobile-web-app-capable)
- PushProvider stays (service worker registration moves to Serwist, but push subscription logic remains in PushContext)

---

## New Components

### Route Structure: Tenant Portal

```
src/app/tenant/
  layout.tsx                    <-- Tenant layout (simplified nav, no BuildingContext)
  page.tsx                      <-- Tenant dashboard (unit info, open tickets)
  login/page.tsx                <-- Tenant login (email + password only)
  tickets/
    page.tsx                    <-- Own ticket list
    new/page.tsx                <-- Create ticket (form + photo upload)
    [id]/page.tsx               <-- Ticket detail + message thread
  profile/
    page.tsx                    <-- Tenant profile, notification settings
```

**Rationale:** Separate `/tenant` route group (not under `/dashboard`) because:
1. Different layout (no BuildingContext, no admin nav, simplified mobile-first UI)
2. Different auth flow (email+password, not PIN)
3. Different data scope (own unit only, not all properties)
4. Follows existing pattern: `/dashboard` = internal, `/contractor` = external token-based, `/tenant` = external session-based

### API Routes: Tenant Portal

```
src/app/api/tenant/
  tickets/
    route.ts                    <-- GET (own), POST (create)
    [id]/route.ts               <-- GET detail, PUT update
    [id]/messages/route.ts      <-- GET/POST thread messages
  unit/
    route.ts                    <-- GET own unit info
  profile/
    route.ts                    <-- GET/PUT own profile
```

**Rationale:** Separate `/api/tenant/*` namespace enforces data isolation at the route level. These routes always filter by the authenticated tenant's `unit_id(s)`. Internal ticket management by KEWA staff uses separate `/api/tickets/*` routes with full access.

### Database: New Tables

```sql
-- Tenant support tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id UUID NOT NULL REFERENCES users(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  building_id UUID NOT NULL REFERENCES buildings(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,           -- 'maintenance', 'defect', 'request', 'complaint'
  priority TEXT DEFAULT 'normal',   -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'open',       -- 'open', 'in_progress', 'resolved', 'closed'
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket messages (thread between tenant and KEWA)
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,  -- Internal notes hidden from tenant
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket attachments (photos of issues)
CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ticket_messages(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Offline Infrastructure: New Modules

```
src/lib/offline/
  db.ts                         <-- IndexedDB schema (idb library wrapper)
  sync-queue.ts                 <-- Queued mutations store
  sync-engine.ts                <-- Background sync orchestrator
  conflict-resolver.ts          <-- Last-write-wins via updated_at
  online-detector.ts            <-- Navigator.onLine + fetch probe

src/hooks/
  useOfflineStatus.ts           <-- Online/offline state hook
  useOfflineData.ts             <-- Read from IndexedDB with network fallback

src/contexts/
  OfflineContext.tsx             <-- Sync status, queue depth, last sync time

src/app/~offline/
  page.tsx                      <-- Serwist offline fallback page
```

### Service Worker: Expanded

```
src/app/sw.ts                   <-- Serwist source (replaces public/sw.js)
  - Serwist precaching + runtime caching (defaultCache)
  - Push notification handlers (migrated from existing sw.js)
  - Background sync event handler
  - Offline fallback routing to /~offline

public/manifest.json            <-- PWA web app manifest (NEW)
```

---

## Data Flow

### Tenant Portal Data Flow

```
Tenant Browser
  |
  |--> /tenant/login (email + password)
  |      |--> POST /api/auth/login { email, password }
  |      |      |--> Supabase: users WHERE email AND auth_method='email_password'
  |      |      |--> JWT: { userId, role, roleName:'tenant', permissions }
  |      |      |--> Set session cookie
  |      |--> Redirect to /tenant
  |
  |--> /tenant/tickets (list)
  |      |--> middleware: validate session, check roleName='tenant'
  |      |--> Set headers: x-tenant-unit-ids
  |      |--> GET /api/tenant/tickets
  |             |--> Filter: tickets WHERE unit_id IN (tenant's unit_ids)
  |
  |--> /tenant/tickets/new (create)
         |--> POST /api/tenant/tickets { title, description, category, photos }
                |--> Validate unit_id belongs to tenant
                |--> Create ticket + upload attachments
                |--> Trigger push notification to KEWA admin
```

### Offline Data Flow

```
User Action (create ticket, update status, etc.)
  |
  |--> Write to IndexedDB (optimistic, immediate)
  |      |--> UI updates instantly from local store
  |
  |--> Check navigator.onLine
  |      |
  |      |--> ONLINE:
  |      |      |--> POST to API
  |      |      |--> Success: Mark synced in IndexedDB
  |      |      |--> Failure (network): Add to sync queue
  |      |
  |      |--> OFFLINE:
  |             |--> Add to sync queue in IndexedDB
  |             |--> Queue entry: { id, operation, endpoint, payload, timestamp, retries }
  |
  |--> Connection restored (online event)
         |--> Sync engine processes queue (FIFO)
         |--> For each entry:
         |      |--> Send to API
         |      |--> 200: Remove from queue, update synced flag
         |      |--> 409: Apply LWW conflict resolution
         |      |--> 5xx: Retry with exponential backoff (max 3)
         |--> Pull latest data from server
         |--> Reconcile local IndexedDB with server state
```

### Conflict Resolution: Last-Write-Wins

LWW with `updated_at` is sufficient for KEWA because:
1. Tenants only edit their own tickets (no concurrent multi-user edits)
2. Internal users manage tickets on the admin side (different fields typically)
3. Low data complexity (text tickets, not collaborative documents)

```
Conflict detected (server returns 409):
  |--> Compare local.updated_at vs server.updated_at
  |      |--> Server newer: Discard local, accept server version
  |      |--> Local newer: Re-send local version (force)
  |      |--> Equal: Accept server (deterministic tiebreak)
  |--> Update IndexedDB with winner
  |--> Toast: "Daten aktualisiert" (non-blocking)
```

---

## Service Worker Migration Plan

### Current sw.js (47 lines, push only)

```javascript
// Three event listeners:
self.addEventListener('push', ...)           // Show notification
self.addEventListener('notificationclick', ...) // Navigate to URL
self.addEventListener('pushsubscriptionchange', ...) // Re-subscribe
```

### Target sw.ts (Serwist-managed)

```typescript
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [{
      url: "/~offline",
      matcher({ request }) { return request.destination === "document"; },
    }],
  },
});

serwist.addEventListeners();

// === PRESERVED: Push notification handlers (from existing sw.js) ===
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    tag: data.tag || `notification-${Date.now()}`,
    data: { url: data.url, notificationId: data.notificationId },
    requireInteraction: data.urgency === 'urgent',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: event.newSubscription,
        oldEndpoint: event.oldSubscription?.endpoint,
      }),
    })
  );
});
```

### next.config.ts Changes

```typescript
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: false,    // IMPORTANT: false to prevent form data loss
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  turbopack: { root: __dirname },
  experimental: {
    parallelServerCompiles: false,
    parallelServerBuildTraces: false,
  },
  // Note: sw.js headers now managed by Serwist
};

export default withSerwist(nextConfig);
```

### Build Script Change

```json
{
  "scripts": {
    "build": "next build --webpack"
  }
}
```

**Critical:** Serwist requires webpack for the build step. Dev mode continues with Turbopack since Serwist is disabled in dev.

---

## Data Isolation Strategy

### Application-Level Enforcement (Primary)

Every tenant-facing API route uses a shared context extractor:

```typescript
// src/lib/tenant-context.ts
async function getTenantContext(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const roleName = request.headers.get('x-user-role-name');

  if (roleName !== 'tenant') {
    return { error: 'Not a tenant', status: 403 };
  }

  const { data: tenantUnits } = await supabase
    .from('tenant_users')
    .select('unit_id, units(building_id)')
    .eq('user_id', userId)
    .is('move_out_date', null);  // Active tenancies only

  return {
    userId,
    unitIds: tenantUnits.map(t => t.unit_id),
    buildingIds: tenantUnits.map(t => t.units.building_id),
  };
}
```

Every `/api/tenant/*` route calls this and filters all queries by `unitIds`.

### Defense-in-Depth Layers

1. **Middleware header injection:** Tenant unit_ids passed via `x-tenant-unit-ids` header
2. **Route namespace isolation:** `/api/tenant/*` physically separate from internal routes
3. **Ownership verification:** Updates/deletes verify `ticket.tenant_user_id === session.userId`
4. **Internal-only fields:** `ticket_messages.is_internal` flag hides staff notes from tenant view
5. **Audit logging:** All tenant data access logged (Swiss Datenschutz compliance)

### Swiss Data Privacy (Datenschutz)

- Tenant personal data (email, name) stored with `is_active` flag for soft-delete
- Tenants see only their own unit/building data
- Internal notes (`is_internal: true`) never exposed to tenants
- 7-day session expiry (existing behavior, appropriate for tenants)
- Full audit trail for data access/modifications

---

## Build Order

### Phase 1: Tenant Portal Auth + Core (Build first)

**Why first:** Auth changes touch `middleware.ts` which is foundational. Establish the tenant route group, login flow, and data isolation pattern before building on top of it.

**Scope:**
- Fix legacy role mapping for tenant sessions in `session.ts`
- Extend middleware for `/tenant/*` routes with `handleTenantRoute()`
- Tenant login page (email+password, reuse existing flow)
- Tenant layout with simplified mobile-first navigation
- Tickets database migration (tickets, ticket_messages, ticket_attachments)
- Tenant context utility (`getTenantContext`)
- Tenant dashboard (unit info + ticket summary)
- Ticket CRUD (create, list, detail)
- Ticket messaging thread
- Photo attachments for tickets
- Push notification triggers for new tickets

**Dependencies:** Existing auth system (ready), RBAC schema (ready), tenant_users table (ready)

### Phase 2: Offline PWA Support (Build second)

**Why second:** Service worker changes affect the entire app. Better to have tenant portal stable first, then add offline capabilities across both internal dashboard and tenant portal.

**Scope:**
- Install @serwist/next + serwist + idb
- Migrate sw.js to Serwist-managed sw.ts
- Preserve push notification handlers
- Web app manifest (manifest.json)
- PWA meta tags in root layout
- Precaching for app shell
- Runtime caching strategies (stale-while-revalidate for assets, network-first for API)
- IndexedDB database setup (idb wrapper)
- Sync queue implementation
- Background sync engine
- Online/offline detection hook + context
- Offline fallback page (/~offline)
- Conflict resolution (LWW with updated_at)
- Build script update (--webpack flag)

**Dependencies:** Phase 1 complete (stable routes for caching)

### Phase 3: UX Polish (Build last)

**Why last:** Polish touches many existing components. Doing this after architectural changes (auth, SW) avoids merge conflicts and lets us polish the new tenant portal UI simultaneously.

**Scope:**
- Invoice linking modal (replace `prompt()`)
- Checklist item title lookup from templates (fix "Item 1", "Item 2" display)
- Property-level delivery history page
- General UX improvements across dashboard and tenant portal

**Dependencies:** All architectural changes complete

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Shared Routes with Role Checks
**What:** Putting tenant pages under `/dashboard` with `if (role === 'tenant')` conditionals.
**Why bad:** Tenant sees admin navigation, BuildingContext is unnecessary, data leak risk from shared components.
**Instead:** Separate `/tenant` route group with its own layout.

### Anti-Pattern 2: Cache All API Responses in Service Worker
**What:** Caching all API responses in the service worker runtime cache.
**Why bad:** Stale data served to users, cache invalidation nightmare, storage limits hit.
**Instead:** Cache only app shell and static assets in SW. Use IndexedDB for specific offline-needed data with explicit sync queue.

### Anti-Pattern 3: Dual Service Workers
**What:** Keeping `sw.js` for push and creating a second SW for caching.
**Why bad:** Only one service worker per scope. Second registration silently replaces the first.
**Instead:** Single Serwist-managed SW that handles both push events and caching.

### Anti-Pattern 4: RLS as Only Isolation
**What:** Relying solely on Supabase RLS for tenant data isolation.
**Why bad:** RLS is currently disabled globally (migration 004). Enabling now risks breaking all existing queries.
**Instead:** Application-level filtering in API routes. RLS can be considered as future hardening.

### Anti-Pattern 5: Same Login Page for PIN and Email
**What:** Adding email/password fields to the existing `/login` page used by KEWA staff.
**Why bad:** Confuses internal users (PIN entry) with tenants (email+password). Different UX expectations.
**Instead:** Separate `/tenant/login` page. Main `/login` stays PIN-only for internal users.

### Anti-Pattern 6: reloadOnOnline: true
**What:** Setting Serwist to auto-reload when coming back online.
**Why bad:** If tenant is filling out a ticket form offline and connection restores, forced reload destroys unsaved form data.
**Instead:** Set `reloadOnOnline: false`. Show non-intrusive toast "Verbindung wiederhergestellt" and sync in background.

---

## Technology Additions

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @serwist/next | latest | Service worker management for Next.js | HIGH |
| serwist | latest | Core service worker library (Workbox successor for Next.js) | HIGH |
| idb | ^8.x | IndexedDB wrapper with promise-based API | HIGH |

**Rejected alternatives:**

| Technology | Reason for Rejection |
|------------|---------------------|
| next-pwa | Unmaintained, requires webpack, Serwist is its maintained successor |
| workbox (direct) | Serwist wraps Workbox with Next.js-specific configuration |
| PouchDB | Overkill for sync queue pattern; idb is lighter |
| RxDB | Too heavy for ticket sync use case |

---

## Caching Strategy Detail

### Precache (Install time)

- App shell HTML
- Static CSS/JS bundles
- Font files
- Offline fallback page (`/~offline`)

### Runtime Cache

| Resource | Strategy | Rationale |
|----------|----------|-----------|
| Static assets (JS, CSS, images) | StaleWhileRevalidate | Fast load, background update |
| API data requests | NetworkFirst | Fresh data preferred, cached fallback |
| Navigation (pages) | NetworkFirst with offline fallback | Serve page if online, fallback if not |
| Font files | CacheFirst | Rarely change |
| Supabase Storage (photos) | CacheFirst | Immutable once uploaded |

### IndexedDB Stores

| Store | Purpose | Key |
|-------|---------|-----|
| `tickets` | Cached ticket data for offline viewing | `id` |
| `ticket-drafts` | Unsaved ticket drafts | `id` |
| `sync-queue` | Pending mutations to sync | `id` (auto-increment) |
| `metadata` | Last sync timestamp, app version | `key` |

---

## Sources

- Serwist official docs: https://serwist.pages.dev/docs/next/getting-started (HIGH confidence)
- LogRocket Next.js 16 PWA guide (Jan 2026): https://blog.logrocket.com/nextjs-16-pwa-offline-support (MEDIUM confidence)
- Next.js multi-tenant guide: https://nextjs.org/docs/app/guides/multi-tenant (HIGH confidence)
- Codebase analysis: middleware.ts, auth.ts, session.ts, permissions.ts, sw.js, RBAC migrations 022-024, notifications migration 061 (HIGH confidence - direct source code review)
