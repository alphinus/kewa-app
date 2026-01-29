# Domain Pitfalls: v3.0 Tenant Portal + Offline PWA + UX Polish

**Domain:** Property management app with new user class, offline retrofit, UI refactoring
**Researched:** 2026-01-29
**Milestone:** v3.0 Tenant & Offline
**Confidence:** HIGH (verified against codebase, official docs, and multiple sources)

## Priority Summary

| # | Pitfall | Severity | Phase Impact | Detection Difficulty |
|---|---------|----------|-------------|---------------------|
| 1 | RLS policies are dead code — anon key bypasses all isolation | CRITICAL | Tenant Portal | Low (code inspection) |
| 2 | Service worker replacement destroys push notifications | CRITICAL | Offline PWA | High (only manifests in production) |
| 3 | Session JWT incompatible with Supabase RLS auth.uid() | CRITICAL | Tenant Portal | Medium (silent data leak) |
| 4 | Server Components cannot render offline | CRITICAL | Offline PWA | Low (architectural) |
| 5 | Tenant sees admin data through shared API routes | CRITICAL | Tenant Portal | Medium (requires security audit) |
| 6 | IndexedDB sync queue loses writes on conflict | MODERATE | Offline PWA | High (race condition) |
| 7 | Middleware routing gap between /dashboard and /tenant | MODERATE | Tenant Portal | Medium |
| 8 | iOS service worker cache eviction breaks offline | MODERATE | Offline PWA | High (device-specific) |
| 9 | UX refactoring breaks existing workflows | MODERATE | UX Polish | Medium |
| 10 | Swiss DSG tenant data handling requirements | MODERATE | Tenant Portal | Low (compliance) |
| 11 | Offline queue grows unbounded with media | MODERATE | Offline PWA | Medium |
| 12 | Three auth methods sharing one session system | LOW | Tenant Portal | Low |
| 13 | Workbox precache bloats initial install | LOW | Offline PWA | Low |
| 14 | prompt() and alert() still in codebase | LOW | UX Polish | Low |

---

## Critical Pitfalls

### 1. RLS Policies Are Dead Code -- Anon Key Bypasses All Isolation

**Severity:** CRITICAL
**Applies to:** Tenant Portal

**What goes wrong:** Migration `029_rls_policies.sql` defines tenant data isolation policies using `auth.uid()`. However, the app uses custom auth (PIN/email/magic-link) with the Supabase **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Migration `004_disable_rls.sql` granted `GRANT ALL ON ... TO anon, authenticated`. The RLS policies call `is_internal_user(auth.uid())` and `is_tenant_of_unit(auth.uid(), id)`, but `auth.uid()` returns NULL for anon-key connections because no Supabase Auth session exists. This means:

- All RLS policies that check `auth.uid()` silently fail
- The `anon` role has GRANT ALL on core tables from migration 004
- Tenant data isolation does NOT exist at the database level
- A tenant user hitting any API endpoint can potentially read all data

**Evidence from codebase:**
- `src/lib/supabase/server.ts` line 9: uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `src/lib/supabase/client.ts` line 6: same anon key
- No `accessToken` hook or `setAuth` calls anywhere in the codebase
- No custom JWT signing with Supabase's secret anywhere
- RLS policies in `029_rls_policies.sql` all reference `auth.uid()`

**Why it happens:** The original system was admin-only (2 internal users). RLS was added as future-proofing but never activated because no external users accessed the database directly. Now that tenants need data isolation, the gap becomes a security breach.

**Warning signs:**
- A tenant API endpoint returns data from other tenants' units
- Supabase logs show all queries executing as `anon` role
- `auth.uid()` returns NULL in RLS policy evaluations

**Prevention:**
1. **Do NOT rely on RLS for tenant isolation.** The custom auth system doesn't integrate with Supabase Auth, so `auth.uid()` will always be NULL.
2. **Implement application-layer isolation.** Every tenant API route must filter by the tenant's `user_id` from the session JWT (which IS validated by the middleware). Add `WHERE` clauses scoping to the tenant's linked units via `tenant_users` table.
3. **Create dedicated tenant query functions** in `src/lib/tenant/` that always join through `tenant_users` to the session user. Never expose raw table queries to tenant routes.
4. **Alternatively, bridge the auth systems:** Mint Supabase-compatible JWTs signed with the Supabase JWT secret (from Dashboard > Settings > API), including `sub` = user_id and `role` = 'authenticated'. Pass via the `accessToken` hook on the Supabase client. This activates RLS but requires significant refactoring.
5. **Recommendation:** Application-layer isolation is simpler and safer for this 2-admin + tenants system. RLS bridge is over-engineering for the user count.

**Phase to address:** Tenant Portal -- must be solved before any tenant-facing feature ships.

---

### 2. Service Worker Replacement Destroys Push Notifications

**Severity:** CRITICAL
**Applies to:** Offline PWA

**What goes wrong:** The current `public/sw.js` handles only push notifications (push event, notificationclick, pushsubscriptionchange). Adding offline caching requires Workbox or Serwist, which typically **generates** a new service worker. If the new service worker replaces `sw.js` without preserving the push event handlers, all push notification subscriptions break. Users stop receiving notifications with no error. The push subscription endpoint in the database becomes stale.

Browsers only allow ONE service worker per scope. You cannot run two workers side by side.

**Evidence from codebase:**
- `public/sw.js`: 47 lines, handles push/notificationclick/pushsubscriptionchange only
- Service worker registered somewhere in the app (push notifications phase 24)
- No Workbox or caching logic exists yet

**Why it happens:** Workbox's `GenerateSW` mode creates an entirely new service worker file, overwriting existing handlers. Developers add offline caching, test it works, and don't notice push broke because push requires a real server to test.

**Warning signs:**
- Push notifications stop arriving after deploying offline support
- `navigator.serviceWorker.controller` changes scope or file
- Push subscription endpoint becomes invalid
- No errors in console (push simply stops working)

**Prevention:**
1. **Use Workbox InjectManifest mode, NOT GenerateSW.** InjectManifest lets you write your own service worker that includes BOTH Workbox caching AND existing push handlers.
2. **Keep the same scope** (`/`) and same filename (`sw.js`) or ensure proper migration.
3. **Merge into a single file:** Start with the existing push handlers in `sw.js`, then add Workbox imports:
   ```js
   // Existing push handlers (keep as-is)
   self.addEventListener('push', ...);
   self.addEventListener('notificationclick', ...);
   self.addEventListener('pushsubscriptionchange', ...);

   // NEW: Workbox caching
   import { precacheAndRoute } from 'workbox-precaching';
   precacheAndRoute(self.__WB_MANIFEST);
   // ... routing strategies
   ```
4. **Test push AFTER adding caching.** Verify push still works in production-like environment.
5. **Include `skipWaiting()` and `clientsClaim()` carefully** -- these can cause the new worker to take over immediately, which is desired for caching updates but must not disrupt push subscriptions.

**Phase to address:** Offline PWA -- the very first step must be merging the service worker, not replacing it.

---

### 3. Session JWT Incompatible with Supabase RLS auth.uid()

**Severity:** CRITICAL
**Applies to:** Tenant Portal

**What goes wrong:** The app's session system (`src/lib/session.ts`) creates JWTs with `jose` library signed with `SESSION_SECRET`. These are stored in an httpOnly cookie named `session`. Supabase RLS expects JWTs signed with Supabase's JWT secret (different key), containing `sub` claim = user UUID and `role` = 'authenticated'. The two JWT systems are completely independent -- the app JWT authenticates users at the middleware level, but Supabase has no awareness of user identity. All database queries run as anonymous.

**Evidence from codebase:**
- `src/lib/session.ts`: JWT created with `jose` using `SESSION_SECRET` env var
- `src/lib/supabase/server.ts`: Client uses anon key, no auth integration
- Session payload: `{ userId, role, roleId, roleName, permissions }` -- not Supabase-compatible format
- Middleware passes identity via headers (`x-user-id`, `x-user-role-name`) not via Supabase auth

**Why it happens:** The original design deliberately chose custom auth over Supabase Auth for simplicity (PIN auth, 2 users). This was the right call for v1. But it means the database layer has no user context.

**Prevention:**
- Same as Pitfall #1 -- tenant isolation must happen at the application layer (query scoping), not database layer (RLS).
- Every tenant query function must accept and enforce user_id from the validated session.
- The `getCurrentUser()` function in session.ts returns `{ id, role }` which is sufficient for application-layer filtering.

**Phase to address:** Tenant Portal -- architectural decision needed before implementation.

---

### 4. Server Components Cannot Render Offline

**Severity:** CRITICAL
**Applies to:** Offline PWA

**What goes wrong:** The existing app uses `'use client'` components extensively (dashboard pages, task lists, etc.) that fetch data via `/api/` routes. However, these client components still require the Next.js server to serve the initial HTML/JS bundles. When offline, if the page shell is not cached, the user sees nothing -- not even a loading state. Server Components (RSC) are worse: they execute on the server and stream HTML, which is impossible offline.

The fundamental architecture clash: Next.js is server-first. Offline is client-first. These two models need explicit bridging.

**Evidence from codebase:**
- `src/app/dashboard/page.tsx`: `'use client'` -- fetches via `/api/tasks`
- `src/app/dashboard/aufgaben/page.tsx`: `'use client'` -- fetches via `/api/tasks`
- All data comes from server-side Supabase queries
- No IndexedDB, no local data storage, no cache layer

**Why it happens:** The app was built server-first (correct for admin app with reliable internet). Offline support requires a fundamentally different data flow: read from local cache first, sync to server when possible.

**Warning signs:**
- Offline user sees blank page or browser error
- Cached page loads but data sections are empty
- Navigation between pages fails offline (needs server for RSC payloads)

**Prevention:**
1. **Cache the app shell.** Use Workbox to precache all static assets (JS, CSS, fonts) and the HTML skeleton. This ensures the app renders offline.
2. **Cache API responses.** Use Workbox's `StaleWhileRevalidate` strategy for `/api/` routes. Serve cached response immediately, update cache in background when online.
3. **Do NOT try to cache RSC payloads.** RSC responses are serialized React components -- they are not user data. Cache the raw API data instead.
4. **Add an offline data layer.** Use IndexedDB (via Dexie or idb) to store the last-fetched state of lists (tasks, tickets). Client components read from IndexedDB first, then fetch from server.
5. **Network-first for mutations.** Writes (POST/PUT/DELETE) queue in IndexedDB when offline, sync when online.
6. **Tenant portal can be simpler.** Tenants see limited data (their unit's tickets). Cache this small dataset aggressively.
7. **Scope offline support narrowly.** Not every page needs to work offline. Prioritize: ticket creation, ticket list, communication. Admin pages can require network.

**Phase to address:** Offline PWA -- must be the architectural foundation before any page-level work.

---

### 5. Tenant Sees Admin Data Through Shared API Routes

**Severity:** CRITICAL
**Applies to:** Tenant Portal

**What goes wrong:** All existing API routes (`/api/tasks`, `/api/units`, `/api/projects`, etc.) return ALL data because they were built for admin users. If tenant routes call these same endpoints, the tenant sees everything. The middleware checks permissions but the ROUTE_PERMISSIONS map (`src/lib/permissions.ts`) grants read access to anyone with `tasks:read` -- it doesn't scope by user identity.

**Evidence from codebase:**
- `src/app/api/tasks/route.ts` (inferred): Queries all tasks, filters by building/unit/status but NOT by user
- `src/lib/permissions.ts`: `ROUTE_PERMISSIONS` maps `'GET /api/tasks'` to `[PERMISSIONS.TASKS_READ]` -- any user with this permission sees all tasks
- Middleware sets `x-user-id` header but API routes don't use it for scoping
- `PERMISSIONS.TENANTS_READ` and `TICKETS_CREATE` exist but no tenant-specific API routes exist yet

**Why it happens:** Existing routes assume all users are internal. Adding a new user class requires either scoping existing routes (risky -- breaks admin functionality) or creating separate tenant routes.

**Prevention:**
1. **Create separate `/api/tenant/` route namespace.** Don't modify existing admin routes. New routes that always scope by tenant identity.
2. **Tenant routes always filter by tenant_users join.** Every query: `SELECT ... FROM tickets t JOIN tenant_users tu ON tu.unit_id = t.unit_id WHERE tu.user_id = $session.userId`.
3. **Add middleware matcher for `/tenant/` path.** Add to `config.matcher` in middleware.ts, verify tenant role.
4. **Tenant dashboard at `/tenant/` not `/dashboard/`.** Separate route trees prevent accidental data exposure through shared layouts.
5. **Never reuse admin query functions for tenant data.** Create `src/lib/tenant/` with dedicated query functions that enforce scoping.

**Phase to address:** Tenant Portal -- must be the data access pattern before building any UI.

---

## Moderate Pitfalls

### 6. IndexedDB Sync Queue Loses Writes on Conflict

**Severity:** MODERATE
**Applies to:** Offline PWA

**What goes wrong:** Tenant creates a ticket offline. Goes online. Another admin has modified the related data. Sync queue tries to POST the ticket but the referenced data has changed. Without conflict resolution, the write either fails silently (data loss) or creates inconsistent state.

For this app specifically: ticket creation is the primary offline use case. Tickets reference a unit_id (stable) and contain text/photos (no conflicts). The risk is lower than general-purpose offline sync but still present.

**Prevention:**
1. **Use client-generated UUIDs** for new records. Prevents duplicate creation on retry.
2. **Last-write-wins is acceptable** for this domain. Tenants create tickets, admins respond. No concurrent edits on the same entity.
3. **Validate on sync, not on create.** Store locally without validation, validate when syncing. If validation fails, show "could not sync" with option to edit and retry.
4. **Queue operations as idempotent.** POST with client-generated ID = PUT-or-create. Safe to retry.
5. **Store pending items visually distinct.** Tenant sees "Ticket (pending sync)" until confirmed.

**Phase to address:** Offline PWA -- sync queue implementation.

---

### 7. Middleware Routing Gap Between /dashboard and /tenant

**Severity:** MODERATE
**Applies to:** Tenant Portal

**What goes wrong:** Current middleware (`src/middleware.ts`) protects `/dashboard/*` (internal only) and `/contractor/*` (magic link). Adding `/tenant/*` requires careful middleware updates. If misconfigured:
- Tenant accesses `/dashboard/` (admin area) -- data leak
- Tenant gets redirected to wrong login page
- Tenant session not validated on `/tenant/*` routes

**Evidence from codebase:**
- `middleware.ts` line 68-72: `/dashboard` routes check `isInternalRole()` -- tenants would be rejected
- `middleware.ts` config.matcher: `['/dashboard/:path*', '/api/((?!auth).*)', '/contractor/:path*']` -- no `/tenant/` matcher
- Session validation returns `roleName` which could be 'tenant' -- properly identified but not routed

**Prevention:**
1. **Add `/tenant/:path*` to middleware config.matcher.**
2. **Add `handleTenantRoute()` handler** similar to `handleContractorRoute()`.
3. **Verify tenant role explicitly:** `if (session.roleName !== 'tenant') redirect to /login`.
4. **Test cross-path access:** Tenant hitting `/dashboard/*` must get redirected, not 403.
5. **Separate login flow for tenants.** Tenants use email+password (already in login route). Add `/login?mode=tenant` or separate `/tenant/login` page.

**Phase to address:** Tenant Portal -- first implementation step.

---

### 8. iOS Service Worker Cache Eviction Breaks Offline

**Severity:** MODERATE
**Applies to:** Offline PWA

**What goes wrong:** iOS Safari aggressively evicts service worker caches. Known WebKit bugs (Bug 190269, 199110) cause cache contents to disappear unexpectedly. PWA installed to home screen may lose all cached data after a few days of inactivity. Users who rely on offline access find the app broken after a weekend.

This is particularly relevant because tenants are "mobile-first, from home" users who may use iOS devices.

**Prevention:**
1. **Never assume cache persistence.** Always have a network fallback.
2. **Store critical data in IndexedDB, not Cache API.** IndexedDB is more persistent on iOS.
3. **Show clear state when cache is empty.** "Loading data..." not blank screen.
4. **Re-cache on every app open.** Don't rely on stale cache; refresh data proactively.
5. **Test on actual iOS devices.** Simulator doesn't reproduce eviction behavior.
6. **Set realistic expectations.** Offline support means "survives brief connectivity loss," not "works for days offline."

**Phase to address:** Offline PWA -- testing and validation phase.

---

### 9. UX Refactoring Breaks Existing Workflows

**Severity:** MODERATE
**Applies to:** UX Polish

**What goes wrong:** The UX polish phase fixes known issues (invoice modal uses `prompt()`, checklist titles show "Item 1", delivery history missing). Refactoring these touches components used by admins daily. Changing the invoice linking flow, for example, could break the accounting workflow that the 2 internal users rely on.

**Evidence from codebase (known UAT issues):**
- Invoice linking needs proper modal UI (currently uses `prompt()`)
- Checklist item titles need template lookup (shows "Item 1", "Item 2")
- Property-level delivery history page not built
- These touch: `InvoiceForm`, `ChecklistExecution`, `DeliveryList` components

**Prevention:**
1. **Test existing behavior first.** Before changing the invoice modal, document exactly how it works now. Verify the fix preserves the workflow.
2. **Refactor incrementally.** One component per plan, not a sweeping UI overhaul.
3. **Don't change patterns.** The codebase uses `'use client'` + fetch-to-API consistently. Don't introduce new patterns (React Query, Zustand) during polish.
4. **Keep the same URLs.** Don't rename routes during polish. Admin bookmarks and muscle memory depend on current paths.
5. **Regression test with both admin roles** (kewa + imeri) after each change.

**Phase to address:** UX Polish -- all plans in this phase.

---

### 10. Swiss DSG Tenant Data Handling Requirements

**Severity:** MODERATE
**Applies to:** Tenant Portal

**What goes wrong:** The Swiss Federal Act on Data Protection (FADP/DSG), in force since September 2023, requires transparency about personal data processing. Tenant portal handles personal data (name, email, unit address, communication content). Without compliance:
- Tenants must be informed how their data is processed (transparency principle)
- Tenants have right to access their data and right to object
- Data processing must be documented in a register of processing activities
- Penalties up to CHF 250,000 target the managing director personally

**Prevention:**
1. **Add privacy notice to tenant registration.** Inform what data is collected, why, and how long it's retained.
2. **Implement data export for tenants.** Tenant can download their data (tickets, communications).
3. **Limit data collection.** Only collect what's needed for ticket management. No tracking, no analytics on tenant behavior.
4. **Audit log tenant data access.** The audit system already exists -- ensure tenant data queries are logged.
5. **Data retention policy.** Define how long tenant data is kept after move-out. Auto-delete or anonymize after period.
6. **This is NOT a blocker.** Privacy notice + minimal data collection is sufficient for a small property management app. Don't over-engineer a GDPR-style consent management system.

**Phase to address:** Tenant Portal -- include privacy notice in registration flow.

---

### 11. Offline Queue Grows Unbounded with Media

**Severity:** MODERATE
**Applies to:** Offline PWA

**What goes wrong:** Tenant creates tickets with photos while offline. Each photo is 1-5MB. IndexedDB stores the queue. After creating 10 tickets with photos, the queue is 50MB+. Safari's IndexedDB quota is ~50MB. Queue writes fail silently. Tenant's tickets are lost.

**Prevention:**
1. **Compress photos before queueing.** Target 200KB max per photo (720px, 70% quality JPEG).
2. **Limit offline queue size.** Show warning at 80% capacity: "Offline storage almost full. Connect to sync."
3. **Sync photos separately from ticket data.** Queue the ticket text immediately (tiny), queue photos as separate sync items. If photo fails, ticket still exists.
4. **Monitor quota.** Use `navigator.storage.estimate()` to check available space before writing.
5. **Clear queue on successful sync.** Don't keep synced items in IndexedDB.

**Phase to address:** Offline PWA -- sync queue implementation.

---

### 12. Three Auth Methods Sharing One Session System

**Severity:** LOW
**Applies to:** Tenant Portal

**What goes wrong:** The app has three auth methods: PIN (internal), email+password (tenants), magic-link (contractors). All create the same session JWT format. This works but creates edge cases:
- What if a contractor's email is also registered as a tenant? Two identities, one email.
- Legacy `role` field in JWT is forced to 'kewa' or 'imeri' even for tenants (see `register/route.ts` line 121: `const legacyRole = roleName === 'accounting' ? 'kewa' : 'imeri'`).
- Session validation (`session.ts` line 92-93) rejects JWTs where `role` is not 'kewa' or 'imeri' -- this would break tenant sessions.

**Evidence from codebase:**
- `src/lib/session.ts` line 92: `if (sessionPayload.role !== 'kewa' && sessionPayload.role !== 'imeri') return null`
- `src/app/api/auth/register/route.ts` line 121: Forces legacy role to 'imeri' for tenants
- This means tenant sessions use `role: 'imeri'` (property_manager role) as legacy compat -- misleading but functional

**Prevention:**
1. **Update session validation to accept all roles.** Remove the 'kewa'/'imeri' restriction. Use `roleName` for authorization, not legacy `role`.
2. **Or keep the hack.** The legacy `role` field is only used for backward compat. The `roleName` field already carries 'tenant'. Just document that `role: 'imeri'` for tenants is intentional legacy compat.
3. **Prevent email collision.** Check both `users` table and `partners` table when registering a tenant. Disallow email that exists as contractor.

**Phase to address:** Tenant Portal -- session system update early in implementation.

---

### 13. Workbox Precache Bloats Initial Install

**Severity:** LOW
**Applies to:** Offline PWA

**What goes wrong:** Workbox's `precacheAndRoute(self.__WB_MANIFEST)` caches all build assets. A Next.js 16 app with 60+ pages and chunked builds can have 5-15MB of precache. Tenant on mobile data waits minutes for initial install. On iOS, this may exceed the cache budget.

**Prevention:**
1. **Don't precache everything.** Only precache: app shell (layout, navigation), tenant pages, critical API responses.
2. **Use runtime caching for admin pages.** Admin pages should not be precached -- they are not needed offline.
3. **Lazy-cache tenant routes.** Cache on first visit with `StaleWhileRevalidate`, not on install.
4. **Monitor precache size.** Keep under 2MB for initial install. Log precache manifest size in build.
5. **Use `navigateFallback` for offline navigation.** Cache one offline fallback page, not every route.

**Phase to address:** Offline PWA -- service worker configuration.

---

### 14. prompt() and alert() Still in Codebase

**Severity:** LOW
**Applies to:** UX Polish

**What goes wrong:** The known UAT issue mentions "invoice linking needs proper modal UI (currently uses prompt())". Using `prompt()` and `alert()` in a PWA is problematic because:
- They block the main thread
- They look different on every browser/OS
- Some PWA contexts suppress them entirely
- They cannot be styled or localized
- They break the mobile UX feel

**Evidence from codebase (STATE.md):**
- Invoice linking uses `prompt()` for modal input
- Likely `alert()` used for error/confirmation dialogs elsewhere

**Prevention:**
1. **Replace all `prompt()` with React modal components.** Use the existing Card/Modal pattern.
2. **Replace all `alert()` with toast notifications.** Non-blocking, dismissible.
3. **Search codebase for all `prompt(`, `alert(`, `confirm(`.** Replace systematically.
4. **This is the primary UX Polish deliverable.** Not a surprise pitfall, just documenting it as part of known debt.

**Phase to address:** UX Polish -- targeted fixes.

---

## Integration Pitfalls (Cross-Cutting)

### Service Worker Scope Collision

**What:** The current `sw.js` is registered at the root scope `/`. Workbox also needs root scope. Having two registrations or conflicting scopes causes undefined behavior.

**Prevention:** Always use ONE service worker at root scope. Merge all functionality into that single file.

### Offline + Auth = Session Expiry While Offline

**What:** Session JWT expires after 7 days (`SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7`). If tenant is offline for extended period, their session expires. When they go online to sync, all queued requests fail with 401. Queue is lost.

**Prevention:**
- Check session validity before attempting sync
- If expired, prompt re-login, then replay queue
- Store queue with enough context to retry after re-auth
- Consider longer session for tenant role (30 days) since they access less frequently

### Offline + Tenant Isolation = Cached Data Exposure

**What:** If service worker caches API responses aggressively, a shared/public device could expose one tenant's cached data to another tenant logging in on the same device.

**Prevention:**
- Clear all caches on logout (`caches.delete()` + IndexedDB clear)
- Include user identity in cache keys
- Never cache sensitive tenant data in the service worker Cache API -- use IndexedDB with explicit user scoping

### Push Notifications for Tenants

**What:** The existing push notification system is built for internal users. Tenants need notifications too (ticket response, maintenance update). But tenant notification preferences, subscription management, and quiet hours need separate handling.

**Prevention:**
- Extend `notifications` table to support tenant user IDs
- Add tenant-specific event triggers (ticket responded, maintenance scheduled)
- Tenant notification preferences should be minimal (on/off, not granular)
- Don't overcomplicate -- tenants get email notifications as fallback

---

## Pitfall Prevention Checklist by Phase

### Tenant Portal Phase
- [ ] Application-layer data isolation (not RLS) -- Pitfall #1, #3
- [ ] Separate `/api/tenant/` route namespace -- Pitfall #5
- [ ] Middleware `/tenant/*` matcher with role check -- Pitfall #7
- [ ] Session validation accepts tenant role -- Pitfall #12
- [ ] Privacy notice for tenant registration -- Pitfall #10
- [ ] Tenant query functions always scope by user_id -- Pitfall #1
- [ ] Cross-path access test (tenant cannot reach /dashboard) -- Pitfall #7

### Offline PWA Phase
- [ ] Service worker merge (InjectManifest, not GenerateSW) -- Pitfall #2
- [ ] Push notification handlers preserved -- Pitfall #2
- [ ] App shell precaching (limited scope) -- Pitfall #13
- [ ] API response caching with StaleWhileRevalidate -- Pitfall #4
- [ ] IndexedDB sync queue with client UUIDs -- Pitfall #6
- [ ] Photo compression before queueing -- Pitfall #11
- [ ] Session expiry handling in sync queue -- Integration pitfall
- [ ] Cache cleared on logout -- Integration pitfall
- [ ] iOS device testing -- Pitfall #8

### UX Polish Phase
- [ ] Replace all prompt()/alert()/confirm() -- Pitfall #14
- [ ] One component per refactoring step -- Pitfall #9
- [ ] Test with both admin roles after each change -- Pitfall #9
- [ ] Preserve existing URL structure -- Pitfall #9
- [ ] No new state management patterns -- Pitfall #9

---

## Sources

### Primary (HIGH Confidence -- Codebase Analysis)
- `src/middleware.ts` -- Auth routing, role checking, matcher config
- `src/lib/session.ts` -- JWT creation, validation, role restrictions
- `src/lib/permissions.ts` -- RBAC, route permissions, role hierarchy
- `src/app/api/auth/login/route.ts` -- PIN + email auth flows
- `src/app/api/auth/register/route.ts` -- Tenant registration with legacy role mapping
- `src/lib/supabase/server.ts` -- Anon key usage, no auth integration
- `public/sw.js` -- Push-only service worker (47 lines)
- `supabase/migrations/004_disable_rls.sql` -- RLS disabled, GRANT ALL to anon
- `supabase/migrations/029_rls_policies.sql` -- RLS policies using auth.uid() (inactive)

### Secondary (MEDIUM Confidence -- Official Documentation)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) -- Official Next.js PWA support
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS with custom auth
- [Supabase Custom Auth Discussion](https://github.com/orgs/supabase/discussions/1849) -- Integrating custom auth with RLS
- [Serwist (next-pwa successor)](https://javascript.plainenglish.io/building-a-progressive-web-app-pwa-in-next-js-with-serwist-next-pwa-successor-94e05cb418d7) -- Modern service worker tooling

### Tertiary (MEDIUM Confidence -- Community/Research)
- [PWA + Next.js 15/16: RSC & Offline-First](https://medium.com/@mernstackdevbykevin/progressive-web-app-next-js-15-16-react-server-components-is-it-still-relevant-in-2025-4dff01d32a5d) -- RSC caching pitfalls
- [LogRocket: Next.js 16 PWA with offline support](https://blog.logrocket.com/nextjs-16-pwa-offline-support) -- Practical implementation guide
- [Tenant Data Isolation Patterns](https://propelius.ai/blogs/tenant-data-isolation-patterns-and-anti-patterns) -- Multi-tenant anti-patterns
- [Tenant Isolation in Multi-Tenant Systems](https://securityboulevard.com/2025/12/tenant-isolation-in-multi-tenant-systems-architecture-identity-and-security/) -- Security boundaries
- [Swiss FADP Data Protection 2025](https://iclg.com/practice-areas/data-protection-laws-and-regulations/switzerland) -- DSG compliance requirements
- [iOS PWA Limitations 2025](https://ravi6997.medium.com/pwas-on-ios-in-2025-why-your-web-app-might-beat-native-0b1c35acf845) -- iOS cache eviction bugs
- [Offline-First Frontend Apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) -- IndexedDB sync patterns
- [Data Sync in PWAs: Conflict Resolution](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/) -- Sync queue strategies
- [Building Native-Like Offline Experience in Next.js PWAs](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas) -- Multi-layered offline architecture

---

**Research Confidence:**
- Tenant isolation pitfalls: HIGH (verified against actual codebase -- the RLS gap is provably real)
- Service worker merge pitfalls: HIGH (browser limitation -- one SW per scope is documented spec)
- Offline + Server Components: HIGH (architectural incompatibility is well-documented)
- Swiss DSG requirements: MEDIUM (legal requirements verified, specific applicability needs legal review)
- iOS cache eviction: MEDIUM (known WebKit bugs, device-specific testing needed)
- Sync conflict resolution: MEDIUM (patterns well-documented, specific risk is low for this use case)

**Research Date:** 2026-01-29
