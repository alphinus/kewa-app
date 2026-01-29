# Project Research Summary

**Project:** KEWA Renovation Operations System -- v3.0 Tenant & Offline
**Domain:** Residential property management (Swiss context), PWA offline retrofit, UX polish
**Researched:** 2026-01-29
**Confidence:** MEDIUM-HIGH

## Executive Summary

v3.0 adds three capabilities to an existing 100K+ LOC Next.js 16 codebase: a tenant self-service portal, offline PWA support, and UX polish. Research reveals the existing codebase has far more v3.0 scaffolding than expected. Tenant auth (email+password), RBAC with tenant role and ticket permissions, the `tenant_users` junction table, and service worker registration are all already built. The tenant portal is primarily a UI/routing concern with new database tables for tickets. The Swiss property management market confirms that tenant self-service portals (damage reporting, communication, document access) are table stakes -- platforms like aroov, TenantCloud, and Buildium all offer them. KEWA's small portfolio (2 internal users, ~20-40 tenants) means the portal should be minimal: ticket creation, status tracking, messaging. No rent payments, no lease signing, no community features.

The significant new technical surface is offline PWA support. The existing service worker handles only push notifications (47 lines). It must be expanded with caching strategies, IndexedDB for local data via Dexie.js, and a sync queue for offline mutations. The critical architectural decision is the service worker approach: **manual expansion of the existing `public/sw.js` is recommended over Serwist**, because Serwist requires webpack while the project uses Turbopack (Next.js 16 default). The `@serwist/turbopack` package exists but has known issues with `process.env` being undefined in workers. Manual SW expansion avoids build tooling conflicts entirely and is sufficient for KEWA's narrow offline scope (queue ticket submissions, cache recent data, show online/offline indicators). Only 3 new npm packages are needed: `dexie`, `dexie-react-hooks`, and `sonner`.

The primary risks are (1) tenant data isolation -- RLS policies exist but are dead code because the app uses custom JWT auth with Supabase's anon key, making `auth.uid()` always NULL, so all isolation must be application-layer; (2) service worker merge -- adding caching to the existing push-only SW must preserve push notification handlers or notifications silently break; and (3) iOS cache eviction -- Safari aggressively evicts service worker caches, so IndexedDB (more persistent) should store critical offline data, not the Cache API alone.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, React 19, Supabase, custom JWT auth via jose/bcryptjs, Tailwind 4) requires no changes. Three targeted additions:

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `dexie` | 4.2.1 | IndexedDB wrapper for offline data + sync queue | Structured queries, schema versioning, cross-tab observation, 787K weekly downloads |
| `dexie-react-hooks` | 4.2.0 | `useLiveQuery()` for reactive IndexedDB queries | Components auto-update when offline data changes; official Dexie React bindings |
| `sonner` | 2.0.7 | Toast notifications for user feedback | Zero dependencies, 12KB, `toast()` callable from anywhere, no existing toast UI in app |

**Anti-recommendations:** No Serwist/next-pwa (Turbopack conflict), no PouchDB (CouchDB-only sync model), no framer-motion (30KB for cosmetic animations), no react-query/SWR (Dexie handles offline data), no Supabase Auth (conflicts with existing custom JWT).

**Researcher Disagreement -- Service Worker Tooling:**
The STACK researcher recommends manual SW expansion (no Serwist) due to the Turbopack conflict. The ARCHITECTURE researcher recommends Serwist despite the webpack requirement. **Resolution: Manual approach wins.** The project's `next.config.ts` already has `turbopack: { root: __dirname }`. Switching to `next build --webpack` is a regression against Next.js 16's direction, slows builds, and the `@serwist/turbopack` alternative has reported issues. The offline scope is narrow enough (queue mutations, cache API responses) that native Cache API + Background Sync API + Dexie covers everything without a framework. If specific Workbox strategies are needed, `importScripts()` from CDN inside `public/sw.js` provides them with zero build coupling.

### Expected Features

**Tenant Portal -- Must Have (Table Stakes):**
- Tenant email+password registration and login (scoped to unit)
- Maintenance ticket creation with category, description, photos
- Ticket status tracking (eingereicht > bestaetigt > in Bearbeitung > erledigt)
- Communication thread per ticket (extends existing comment system)
- Tenant dashboard (open tickets, unit info)
- Email notification on ticket updates
- German language UI throughout
- Mobile-responsive portrait-first layout

**Tenant Portal -- Should Have (Differentiators):**
- Ticket categories with smart routing (Heizung, Wasser, Elektrik, Allgemein)
- Ticket urgency levels (Notfall / Dringend / Normal)
- Push notifications for tenants (existing infrastructure)
- Ticket-to-work-order conversion (manual, one-click for KEWA)
- Tenant profile self-service (update phone, email)

**Offline PWA -- Must Have:**
- PWA manifest with icons + install prompt (Next.js `app/manifest.ts` convention)
- App shell caching for offline navigation
- Online/offline visual indicator
- Offline data reading (IndexedDB cache of recently viewed items)
- Offline form queue (sync when online)
- Sync status indicator (pending count, last sync time)

**Offline PWA -- Should Have:**
- Offline photo capture (queue for upload)
- Retry with exponential backoff
- Conflict detection with LWW resolution

**UX Polish -- Must Have:**
- Fix 3 known UAT issues (invoice linking modal, checklist item titles, delivery history page)
- Toast notifications via Sonner
- Loading states (skeletons/spinners)
- Empty states with meaningful messages
- Error handling UI with retry

**Defer to Post-v3.0:**
- Full offline-first architecture (CRDTs, full DB mirror)
- Dark mode
- Swipe gestures
- Global cross-entity search
- Tenant document access (KB extension)
- Announcement board
- Bulk operations
- Online rent payment (explicitly out of scope per PROJECT.md)

### Architecture Approach

The architecture extends three existing patterns: (1) route-group isolation (`/dashboard` for internal, `/contractor` for magic-link, now `/tenant` for session-based tenant auth), (2) middleware-enforced RBAC with per-route-group handlers, and (3) the single service worker at root scope. Tenant data isolation is application-layer only -- every `/api/tenant/*` route filters through `tenant_users` join. RLS is dead code and should not be relied upon.

**Major Components:**

1. **Tenant Route Group** (`/tenant/*`) -- Separate layout, mobile-first, no BuildingContext. Includes login, dashboard, ticket CRUD, messaging, profile.
2. **Tenant API Namespace** (`/api/tenant/*`) -- Physically separate from internal routes. Every query scoped by authenticated tenant's `unit_id(s)` via `getTenantContext()` utility.
3. **Tickets Data Model** -- New tables: `tickets`, `ticket_messages`, `ticket_attachments`. Categories: maintenance, defect, request, complaint. Status: open > in_progress > resolved > closed.
4. **Offline Infrastructure** (`src/lib/offline/`) -- Dexie database (`db.ts`), sync queue (`sync-queue.ts`), sync engine (`sync-engine.ts`), conflict resolver (`conflict-resolver.ts`), online detector (`online-detector.ts`).
5. **Expanded Service Worker** (`public/sw.js`) -- Preserves existing push handlers. Adds: install/activate events, fetch interception (network-first for API, cache-first for static assets), sync event handler, Dexie import for queue processing.
6. **Toast/Feedback Layer** -- Sonner `<Toaster>` in root layout. Used for sync status, action confirmations, error messages, offline/online transitions.

**Key Architecture Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Service worker tooling | Manual expansion (no Serwist) | Turbopack compatibility, narrow offline scope, existing SW preservation |
| Tenant data isolation | Application-layer filtering | RLS is dead code (anon key, auth.uid()=NULL); app-layer is pragmatic for 2+N users |
| Offline data store | Dexie.js (IndexedDB) | Structured queries, schema versioning, reactive hooks, cross-tab observation |
| Conflict resolution | Last-write-wins (LWW) | Tenants create tickets (write-only); concurrent edits near-impossible with 2 internal users |
| PWA manifest | Next.js `app/manifest.ts` | Zero dependencies, built-in type safety, auto-injected into `<head>` |
| Caching strategy | Network-first for API, cache-first for static assets | Fresh data preferred; static assets rarely change |

### Critical Pitfalls

| # | Pitfall | Severity | Prevention |
|---|---------|----------|------------|
| 1 | **RLS policies are dead code** -- anon key bypasses all isolation, `auth.uid()` returns NULL | CRITICAL | Application-layer filtering in every `/api/tenant/*` route; dedicated tenant query functions that always join through `tenant_users` |
| 2 | **Service worker replacement destroys push notifications** -- only one SW per scope, replacing `sw.js` silently kills push | CRITICAL | Merge into single file; expand existing `public/sw.js` with caching logic alongside existing push handlers; test push after adding caching |
| 3 | **Session JWT incompatible with Supabase RLS** -- custom JWT (jose) not recognized by Supabase `auth.uid()` | CRITICAL | Same as #1; do not rely on RLS; use application-layer isolation |
| 4 | **Server Components cannot render offline** -- RSC requires server; offline needs client-first data flow | CRITICAL | Cache app shell statically; use IndexedDB for offline data; client components read from IDB first; scope offline narrowly |
| 5 | **Tenant sees admin data through shared API routes** -- existing routes return all data, no user scoping | CRITICAL | Separate `/api/tenant/*` namespace; never reuse admin query functions for tenant data |
| 6 | **iOS Safari cache eviction** -- WebKit aggressively evicts SW caches after days of inactivity | MODERATE | Store critical data in IndexedDB (more persistent); never assume cache persistence; re-cache on every app open |
| 7 | **Offline queue grows unbounded with media** -- photos in IndexedDB hit Safari's ~50MB quota | MODERATE | Compress photos to 200KB before queueing; monitor quota via `navigator.storage.estimate()`; sync photos separately from ticket text |
| 8 | **Session expiry while offline** -- 7-day JWT expires during extended offline; sync queue fails with 401 | MODERATE | Check session validity before sync; prompt re-login then replay queue; consider 30-day session for tenant role |

## Implications for Roadmap

### Phase 1: UX Polish (Known Issues)

**Rationale:** Fix v2.2 UAT bugs first. Quick wins that restore user trust before introducing new features. These are small, isolated fixes with no architectural dependencies.
**Delivers:** Fixed invoice linking modal (replace `prompt()`), populated checklist item titles from templates, property-level delivery history page.
**Features from FEATURES.md:** UX Polish table stakes (known issues).
**Pitfalls to avoid:** #9 (UX refactoring breaks existing workflows) -- refactor one component at a time, test with both admin roles, preserve URL structure.

### Phase 2: Tenant Portal Core

**Rationale:** The primary new feature of v3.0. Auth infrastructure is 90% built. This phase establishes the tenant route group, data model, and isolation pattern that everything else builds on. Must ship before offline because offline ticket creation depends on the ticket data model.
**Delivers:** Tenant login, dashboard, ticket CRUD (create/list/detail), messaging thread, photo attachments, push notifications for new tickets.
**Features from FEATURES.md:** All tenant portal table stakes.
**Stack used:** Existing auth (jose, bcryptjs), existing Supabase, new `tickets`/`ticket_messages`/`ticket_attachments` tables.
**Pitfalls to avoid:** #1 (RLS dead code -- use app-layer isolation), #5 (shared API routes -- create `/api/tenant/*` namespace), #7 (middleware gap -- add `/tenant/*` matcher), #12 (session validation -- update to accept tenant role), #10 (Swiss DSG -- add privacy notice to registration).

### Phase 3: PWA Foundation + Offline Infrastructure

**Rationale:** Service worker changes affect the entire app. Better to have tenant portal stable first, then add offline capabilities. This phase lays the infrastructure: manifest, SW expansion, IndexedDB setup, online/offline detection.
**Delivers:** Installable PWA (manifest + install prompt), app shell caching, offline fallback page, online/offline indicator, toast notification system (Sonner), IndexedDB database setup (Dexie).
**Stack used:** Dexie 4.2.1, dexie-react-hooks 4.2.0, Sonner 2.0.7, native Cache API, native Background Sync API.
**Pitfalls to avoid:** #2 (SW replacement kills push -- merge into existing sw.js), #4 (RSC can't render offline -- cache app shell, IDB for data), #13 (precache bloat -- only cache app shell + critical paths, not all 60+ pages).

### Phase 4: Offline Data Sync + Sync Queue

**Rationale:** Depends on Phase 3 infrastructure (IndexedDB, SW, online detection) and Phase 2 data model (tickets). This is the highest-complexity phase. Separate from PWA foundation to reduce risk.
**Delivers:** Offline form queue, background sync, conflict detection (LWW), sync status indicator, offline data reading for recently viewed items.
**Pitfalls to avoid:** #6 (sync queue loses writes -- use client-generated UUIDs, idempotent operations), #8 (session expiry while offline -- check before sync, prompt re-login), #11 (unbounded media queue -- compress photos, monitor quota).

### Phase 5: Tenant Portal Extras + UX Improvements

**Rationale:** Polish and enhancement phase. All infrastructure is stable. Add differentiator features and app-wide UX improvements. Can be partially deferred if timeline is tight.
**Delivers:** Ticket categories with smart routing, urgency levels, ticket-to-work-order conversion, tenant profile self-service, loading states, empty states, error handling UI, confirmation dialogs, breadcrumb navigation.
**Features from FEATURES.md:** Tenant portal differentiators + UX Polish table stakes (improvements).
**Pitfalls to avoid:** #9 (UX refactoring breaks workflows -- incremental, test with both roles), #14 (replace remaining prompt()/alert()/confirm()).

### Phase Ordering Rationale

- **UAT fixes first:** The 3 known issues are small, isolated, and blocking user confidence. Clear them before new feature work.
- **Tenant portal before offline:** The ticket data model must exist before offline ticket creation can be built. Auth and routing changes are foundational.
- **PWA foundation before sync:** Installing the PWA, caching the shell, and setting up IndexedDB are prerequisites for the sync queue.
- **Sync queue separate from PWA foundation:** The sync queue is the highest-complexity piece. Isolating it in its own phase reduces blast radius if it takes longer than expected.
- **Extras last:** Differentiator features and polish improvements are low-risk and can be partially deferred without blocking the milestone.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (PWA Foundation):** Manual SW expansion strategy needs concrete implementation research -- fetch event interception patterns, cache versioning, Workbox CDN `importScripts` integration. The Background Sync API's Chromium-only support requires a fallback strategy using `online` events.
- **Phase 4 (Offline Data Sync):** Sync queue architecture, retry strategies, photo compression pipeline, IndexedDB quota management. This is the least-documented pattern for Next.js 16 specifically.

**Phases with standard patterns (skip deep research):**
- **Phase 1 (UX Polish):** Replacing `prompt()` with modals, adding loading states, building a list page -- all standard React patterns.
- **Phase 2 (Tenant Portal Core):** CRUD app with auth, messaging, file upload. Well-documented, existing codebase patterns to follow (contractor portal is the template).
- **Phase 5 (Extras + UX):** Standard feature additions and UI improvements.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 3 new packages, all verified on npm with high adoption. Existing stack fully sufficient. |
| Features | MEDIUM-HIGH | Tenant portal features well-established in industry. Offline feature scope clear but implementation complexity is high. |
| Architecture | HIGH | Codebase directly inspected. Integration points well-understood. Tenant route group follows existing contractor portal pattern. |
| Pitfalls | HIGH | Critical pitfalls (#1, #2, #5) verified against actual source code. RLS gap is provably real. SW replacement risk is browser spec. |

**Overall confidence:** MEDIUM-HIGH

The tenant portal and UX polish phases are high-confidence (established patterns, existing infrastructure). The offline PWA phases are medium-confidence (well-documented patterns exist but Next.js 16 + Turbopack + manual SW is less trodden territory).

### Gaps to Address

- **Email sending capability:** Tenant ticket email notifications require email sending, which does not exist in the codebase. Research did not evaluate email providers (Resend, Postmark, SES). Address during Phase 2 planning.
- **Legacy role field hack:** Tenant sessions use `role: 'imeri'` for backward compatibility. Session validation (`session.ts` line 92) rejects non-kewa/non-imeri roles. This needs a clean fix, not just documenting the hack. Address during Phase 2 planning.
- **Background Sync browser support:** Chromium-only. Firefox and Safari do not support the Background Sync API. The fallback (retry on `online` event + SW startup) is documented but needs concrete implementation planning. Address during Phase 3 planning.
- **iOS device testing:** iOS Safari's cache eviction behavior can only be validated on real devices. Allocate testing time during Phase 3 verification.
- **Swiss DSG compliance specifics:** Privacy notice content, data retention periods, and tenant data export requirements need legal input. Not a technical blocker but must be addressed before tenant portal ships.

## Sources

### Primary (HIGH Confidence -- Codebase Analysis)
- `src/lib/auth.ts`, `src/lib/session.ts`, `src/middleware.ts` -- Custom auth, JWT, routing
- `src/lib/permissions.ts` -- RBAC constants, role hierarchy, route permissions
- `src/app/api/auth/login/route.ts`, `register/route.ts` -- Email+password auth flow
- `src/lib/supabase/server.ts`, `client.ts` -- Anon key usage, no Supabase Auth integration
- `public/sw.js` -- Push-only service worker (47 lines)
- `supabase/migrations/004_disable_rls.sql` -- RLS disabled, GRANT ALL to anon
- `supabase/migrations/029_rls_policies.sql` -- RLS policies using auth.uid() (dead code)
- `supabase/migrations/022_rbac.sql`, `023_users_auth.sql` -- Tenant role, permissions, tenant_users table

### Secondary (HIGH Confidence -- Official Documentation)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) -- Manifest, SW setup
- [Next.js Manifest File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) -- `app/manifest.ts`
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview) -- NetworkFirst, CacheFirst
- [Background Sync API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) -- Browser support, fallback patterns
- [Dexie.js Documentation](https://dexie.org) -- IndexedDB wrapper, useLiveQuery
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS with custom auth limitations

### Tertiary (MEDIUM Confidence -- Community/Ecosystem)
- [LogRocket: Next.js 16 PWA with Offline Support](https://blog.logrocket.com/nextjs-16-pwa-offline-support) -- Serwist + IndexedDB approach
- [Swiss Mobiliar / aroov](https://www.icmif.org/news_story/swiss-mobiliar-launches-tenant-portal-with-property-management-software-company/) -- Swiss tenant portal pattern
- [Serwist Turbopack Issue #54](https://github.com/serwist/serwist/issues/54) -- 56+ upvotes, status: backlog/planned
- [Swiss FADP/DSG 2025](https://iclg.com/practice-areas/data-protection-laws-and-regulations/switzerland) -- Data protection requirements
- [iOS PWA Limitations 2025](https://ravi6997.medium.com/pwas-on-ios-in-2025-why-your-web-app-might-beat-native-0b1c35acf845) -- Cache eviction bugs
- [GTCSys: PWA Data Sync & Conflict Resolution](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/) -- Sync queue strategies

---
*Research completed: 2026-01-29*
*Ready for roadmap: yes*
