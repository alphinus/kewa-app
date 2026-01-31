# Roadmap: KEWA v3.0 Tenant & Offline

## Milestones

- **v1.0 MVP** - Phases 1-6 (shipped 2025-03-XX)
- **v2.0 Advanced Features** - Phases 7-12.3 (shipped 2026-01-19)
- **v2.1 Master Data Management** - Phases 13-17 (shipped 2026-01-25)
- **v2.2 Extensions** - Phases 18-24 (shipped 2026-01-29)
- **v3.0 Tenant & Offline** - Phases 25-29 (in progress)

## Overview

v3.0 adds a tenant-facing portal for maintenance ticket management, converts the app into a PWA with offline data access and background sync, and resolves UX debt carried from v2.2 UAT. The milestone starts with quick UX fixes (unblocking clean UAT baseline), builds tenant portal core (largest feature), layers PWA infrastructure, adds offline data sync (highest complexity), and finishes with tenant notifications and remaining UX polish.

## Phases

<details>
<summary>v1.0 MVP (Phases 1-6) - SHIPPED 2025-03-XX</summary>

See milestones/v1.0-ROADMAP.md

</details>

<details>
<summary>v2.0 Advanced Features (Phases 7-12.3) - SHIPPED 2026-01-19</summary>

See milestones/v2.0-ROADMAP.md

</details>

<details>
<summary>v2.1 Master Data Management (Phases 13-17) - SHIPPED 2026-01-25</summary>

See milestones/v2.1-ROADMAP.md

</details>

<details>
<summary>v2.2 Extensions (Phases 18-24) - SHIPPED 2026-01-29</summary>

### Phase 18: Knowledge Base
**Goal**: Users can create, organize, and search internal documentation and contractor-visible FAQs with WYSIWYG editing, version history, and approval workflow.
**Plans**: 5/5 complete

### Phase 19: Supplier Core
**Goal**: Users can manage suppliers, create purchase orders, and track deliveries to invoice.
**Plans**: 3/3 complete

### Phase 20: Supplier Advanced
**Goal**: Users can track consumption, receive reorder alerts, and analyze pricing trends.
**Plans**: 3/3 complete

### Phase 21: Change Orders
**Goal**: Users can create, approve, and track change orders with full cost impact visibility.
**Plans**: 4/4 complete

### Phase 22: Inspection Core
**Goal**: Users can conduct inspections with checklists, capture defects, and collect signatures.
**Plans**: 3/3 complete

### Phase 23: Inspection Advanced
**Goal**: Users can track re-inspections, generate protocols, and automate room conditions.
**Plans**: 3/3 complete

### Phase 24: Push Notifications
**Goal**: Users receive timely push notifications for workflow events with preference controls.
**Plans**: 4/4 complete

</details>

### v3.0 Tenant & Offline (In Progress)

**Milestone Goal:** Tenants can submit and track maintenance tickets through a dedicated portal. KEWA operators use the app offline with automatic data sync. UX debt from v2.2 is resolved.

---

### Phase 25: UX Polish (Known Issues)
**Goal**: v2.2 UAT issues are resolved and toast notification feedback is available across the app.
**Depends on**: Nothing (v3.0 starts here)
**Requirements**: UXPL-01, UXPL-02, UXPL-03, UXPL-04
**Success Criteria** (what must be TRUE):
  1. Invoice linking opens a search/select modal instead of browser prompt()
  2. Checklist items display their template-defined title and description
  3. Property detail page shows delivery history with dates, quantities, and linked orders
  4. Action feedback (save, delete, error) displays as toast notification via Sonner
  5. Toast notifications are German-language and appear consistently across all CRUD operations
**Plans**: 2 plans

Plans:
- [x] 25-01-PLAN.md -- Invoice modal, checklist titles, delivery history page
- [x] 25-02-PLAN.md -- Sonner integration, toast notifications across CRUD operations

---

### Phase 26: Tenant Portal Core
**Goal**: Tenants can register, log in, create maintenance tickets with category/urgency, communicate via message threads, and view a dashboard -- all within an isolated, German-language, mobile-first portal.
**Depends on**: Phase 25
**Requirements**: TPRT-01, TPRT-02, TPRT-03, TPRT-04, TPRT-05, TPRT-06, TPRT-07, TPRT-09, TPRT-10, TPRT-14, TPRT-15
**Success Criteria** (what must be TRUE):
  1. Tenant can register with email/password and is scoped to their unit; cannot see other tenants' data
  2. Tenant can create a ticket selecting category (Heizung, Wasser/Sanitaer, Elektrik, Allgemein) and urgency (Notfall, Dringend, Normal) with optional photo attachments
  3. Tenant can view their ticket list with current status and send/receive messages on each ticket
  4. Tenant sees a dashboard showing open ticket count, recent messages, and unit information
  5. Tenant portal renders in German, is mobile-responsive, and works portrait-first on phone screens
**Plans**: 4 plans

Plans:
- [x] 26-01-PLAN.md -- Database schema (tickets, ticket_messages, ticket_attachments, tenant_users), types, tenant API namespace
- [x] 26-02-PLAN.md -- Tenant auth (registration, login, session validation, route protection, data isolation)
- [x] 26-03-PLAN.md -- Ticket CRUD with category/urgency, status workflow, photo attachments, message threads
- [x] 26-04-PLAN.md -- Tenant dashboard, ticket list view, mobile-responsive layout, German UI

---

### Phase 27: PWA Foundation
**Goal**: The app is installable as a standalone PWA with offline shell navigation and online/offline status awareness, without breaking existing push notification functionality.
**Depends on**: Phase 26
**Requirements**: OFFL-01, OFFL-02, OFFL-03, OFFL-04, OFFL-12
**Success Criteria** (what must be TRUE):
  1. App can be installed to home screen via manifest and launches in standalone display mode
  2. App shows install prompt or Add to Home Screen guidance on first eligible visit
  3. App shell (HTML, CSS, JS, fonts) loads from cache when device is offline
  4. Header displays a visual indicator showing current online/offline connectivity state
  5. Existing push notification subscription, delivery, and click handling continue to work after service worker expansion
**Plans**: 3 plans

Plans:
- [x] 27-01-PLAN.md -- PWA manifest with icons, display: standalone, install prompt / A2HS guidance
- [x] 27-02-PLAN.md -- Service worker expansion (cache-first static, network-first API), preserve push handlers
- [x] 27-03-PLAN.md -- Online/offline detection provider, header connectivity indicator

---

### Phase 28: Offline Data Sync
**Goal**: Users can read recently viewed data and submit forms while offline, with automatic background sync, conflict resolution, and retry on reconnect.
**Depends on**: Phase 27
**Requirements**: OFFL-05, OFFL-06, OFFL-07, OFFL-08, OFFL-09, OFFL-10, OFFL-11
**Success Criteria** (what must be TRUE):
  1. Recently viewed entities (properties, units, work orders) are readable from IndexedDB when offline
  2. Form submissions made offline are queued and sync automatically when connectivity returns
  3. Sync status indicator shows pending operation count and last successful sync time
  4. Conflicts are detected via updated_at timestamp comparison and resolved with last-write-wins; user is notified of overwritten changes
  5. Photos captured offline are queued and uploaded on reconnect; failed syncs retry with exponential backoff
**Plans**: 5 plans

Plans:
- [x] 28-01-PLAN.md -- Dexie IndexedDB setup, entity caching layer for offline reads
- [x] 28-02-PLAN.md -- Sync queue, background sync on reconnect, sync status indicator
- [x] 28-03-PLAN.md -- Conflict detection (LWW), offline photo queue, exponential backoff retry
- [ ] 28-04-PLAN.md -- Entity caching integration (wire cacheEntityOnView + offline fallback into detail pages)
- [ ] 28-05-PLAN.md -- Form + photo integration (wire useOfflineSubmit + useOfflinePhoto into task forms and photo upload)

---

### Phase 29: Tenant Extras & UX Improvements
**Goal**: Tenants receive email and push notifications for ticket updates, KEWA can convert tickets to work orders, tenants can manage their profile, and the app has consistent loading/empty/error states with form validation and breadcrumb navigation.
**Depends on**: Phase 28
**Requirements**: TPRT-08, TPRT-11, TPRT-12, TPRT-13, UXPL-05, UXPL-06, UXPL-07, UXPL-08, UXPL-09, UXPL-10
**Success Criteria** (what must be TRUE):
  1. Tenant receives email notification when ticket status changes or KEWA replies to a message
  2. Tenant receives push notification for ticket updates using existing push infrastructure
  3. KEWA operator can convert a tenant ticket to an internal work order with one click
  4. Tenant can update their profile (phone, email, emergency contact) from the portal
  5. App displays skeleton loaders during data fetching, meaningful empty states with CTAs, user-friendly error messages with retry, confirmation dialogs before destructive actions, inline form validation errors, and breadcrumb navigation in deep hierarchies
**Plans**: 3 plans

Plans:
- [ ] 29-01-PLAN.md -- Tenant email notifications (status change, reply), push notification integration
- [ ] 29-02-PLAN.md -- Ticket-to-work-order conversion, tenant profile management
- [ ] 29-03-PLAN.md -- Loading states, empty states, error handling, confirmation dialogs, form validation, breadcrumbs

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 18. Knowledge Base | v2.2 | 5/5 | Complete | 2026-01-26 |
| 19. Supplier Core | v2.2 | 3/3 | Complete | 2026-01-27 |
| 20. Supplier Advanced | v2.2 | 3/3 | Complete | 2026-01-28 |
| 21. Change Orders | v2.2 | 4/4 | Complete | 2026-01-28 |
| 22. Inspection Core | v2.2 | 3/3 | Complete | 2026-01-28 |
| 23. Inspection Advanced | v2.2 | 3/3 | Complete | 2026-01-28 |
| 24. Push Notifications | v2.2 | 4/4 | Complete | 2026-01-29 |
| 25. UX Polish | v3.0 | 2/2 | Complete | 2026-01-29 |
| 26. Tenant Portal Core | v3.0 | 4/4 | Complete | 2026-01-29 |
| 27. PWA Foundation | v3.0 | 3/3 | Complete | 2026-01-30 |
| 28. Offline Data Sync | v3.0 | 3/5 | Gap closure | - |
| 29. Tenant Extras & UX | v3.0 | 0/3 | Not started | - |

---

*Created: 2026-01-29*
*37 requirements mapped across 5 phases (25-29)*
