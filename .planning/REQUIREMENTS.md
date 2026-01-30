# Requirements: v3.0 Tenant & Offline

**Milestone:** v3.0 Tenant & Offline
**Created:** 2026-01-29
**Status:** Active

## Tenant Portal (TPRT)

- [x] **TPRT-01**: Tenant can register with email/password, scoped to their unit
- [x] **TPRT-02**: Tenant can log in via email/password and access tenant-only routes
- [x] **TPRT-03**: Tenant can create maintenance ticket with category, description, and optional photos
- [x] **TPRT-04**: Ticket follows status workflow (eingereicht → bestätigt → in Bearbeitung → erledigt)
- [x] **TPRT-05**: Tenant can view list of own tickets with status and last update
- [x] **TPRT-06**: Tenant can communicate with KEWA via message thread per ticket
- [x] **TPRT-07**: Tenant sees dashboard with open tickets, recent messages, and unit info
- [ ] **TPRT-08**: Tenant receives email notification when ticket status changes or KEWA replies
- [x] **TPRT-09**: Tenant can select ticket category (Heizung, Wasser/Sanitär, Elektrik, Allgemein)
- [x] **TPRT-10**: Tenant can select ticket urgency (Notfall, Dringend, Normal)
- [ ] **TPRT-11**: Tenant receives push notification for ticket updates (uses existing push infrastructure)
- [ ] **TPRT-12**: KEWA can convert tenant ticket to internal work order (manual, one-click)
- [ ] **TPRT-13**: Tenant can update own profile (phone, email, emergency contact)
- [x] **TPRT-14**: Tenant portal UI is German, mobile-responsive, portrait-first
- [x] **TPRT-15**: Tenant data isolation is enforced at application layer (all queries scoped via tenant_users)

## Offline PWA (OFFL)

- [x] **OFFL-01**: App has PWA manifest with icons and display: standalone for home screen install
- [x] **OFFL-02**: App shows install prompt / Add to Home Screen guidance
- [x] **OFFL-03**: Service worker caches app shell (HTML, CSS, JS, fonts) for offline navigation
- [x] **OFFL-04**: App shows online/offline visual indicator in header
- [ ] **OFFL-05**: Recently viewed entities are cached in IndexedDB for offline reading
- [ ] **OFFL-06**: Offline form submissions are queued in IndexedDB sync queue
- [ ] **OFFL-07**: Queued operations sync automatically when connectivity returns
- [ ] **OFFL-08**: App shows sync status indicator (pending count, last sync time)
- [ ] **OFFL-09**: Conflict detection compares updated_at timestamps with last-write-wins resolution
- [ ] **OFFL-10**: Offline photo capture queues photos for upload on reconnect
- [ ] **OFFL-11**: Failed syncs retry with exponential backoff
- [x] **OFFL-12**: Existing push notification handlers in service worker are preserved during SW expansion

## UX Polish (UXPL)

- [x] **UXPL-01**: Invoice linking uses proper modal UI (replaces prompt())
- [x] **UXPL-02**: Checklist item titles display from template (replaces "Item 1", "Item 2")
- [x] **UXPL-03**: Property-level delivery history page is built (data model exists)
- [x] **UXPL-04**: Toast notifications via Sonner for action feedback (Gespeichert, Gelöscht, Fehler)
- [ ] **UXPL-05**: Loading states (skeleton loaders or spinners) across data-fetching views
- [ ] **UXPL-06**: Empty states with meaningful messages and CTAs when lists are empty
- [ ] **UXPL-07**: Error handling UI with user-friendly messages and retry option
- [ ] **UXPL-08**: Confirmation dialogs before destructive actions (delete, archive)
- [ ] **UXPL-09**: Form validation shows inline errors on fields
- [ ] **UXPL-10**: Breadcrumb navigation in deep hierarchies (Property → Unit → Project → Task)

---

## Deferred (Post-v3.0)

*From research -- noted for v3.1+:*

- Full offline-first architecture (CRDTs, full DB mirror)
- Dark mode
- Swipe gestures on mobile
- Global cross-entity search
- Tenant document access (KB extension for tenants)
- Announcement board (Hausmitteilungen)
- Bulk operations (multi-select status change)
- Selective pre-caching ("Download for offline" button)
- Offline inspection completion
- Delta sync (dirty-field tracking)

## Out of Scope

- Online rent payment (CSV export for accounting suffices)
- Lease signing / document upload by tenants
- Community forum between tenants
- Tenant screening / application process
- Maintenance scheduling by tenants (KEWA decides)
- Multi-language i18n (German-only)
- AI chatbot / ticket triage
- Tenant satisfaction surveys
- Automatic ticket-to-work-order conversion (KEWA entscheidet manuell)
- Full offline PDF generation
- SMS notifications
- Native mobile app

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TPRT-01 | Phase 26 | Complete |
| TPRT-02 | Phase 26 | Complete |
| TPRT-03 | Phase 26 | Complete |
| TPRT-04 | Phase 26 | Complete |
| TPRT-05 | Phase 26 | Complete |
| TPRT-06 | Phase 26 | Complete |
| TPRT-07 | Phase 26 | Complete |
| TPRT-08 | Phase 29 | Pending |
| TPRT-09 | Phase 26 | Complete |
| TPRT-10 | Phase 26 | Complete |
| TPRT-11 | Phase 29 | Pending |
| TPRT-12 | Phase 29 | Pending |
| TPRT-13 | Phase 29 | Pending |
| TPRT-14 | Phase 26 | Complete |
| TPRT-15 | Phase 26 | Complete |
| OFFL-01 | Phase 27 | Complete |
| OFFL-02 | Phase 27 | Complete |
| OFFL-03 | Phase 27 | Complete |
| OFFL-04 | Phase 27 | Complete |
| OFFL-05 | Phase 28 | Pending |
| OFFL-06 | Phase 28 | Pending |
| OFFL-07 | Phase 28 | Pending |
| OFFL-08 | Phase 28 | Pending |
| OFFL-09 | Phase 28 | Pending |
| OFFL-10 | Phase 28 | Pending |
| OFFL-11 | Phase 28 | Pending |
| OFFL-12 | Phase 27 | Complete |
| UXPL-01 | Phase 25 | Complete |
| UXPL-02 | Phase 25 | Complete |
| UXPL-03 | Phase 25 | Complete |
| UXPL-04 | Phase 25 | Complete |
| UXPL-05 | Phase 29 | Pending |
| UXPL-06 | Phase 29 | Pending |
| UXPL-07 | Phase 29 | Pending |
| UXPL-08 | Phase 29 | Pending |
| UXPL-09 | Phase 29 | Pending |
| UXPL-10 | Phase 29 | Pending |

---

*Created: 2026-01-29*
*37 requirements across 3 categories*
