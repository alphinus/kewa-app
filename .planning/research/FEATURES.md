# Feature Landscape: v3.0 Tenant Portal, Offline PWA, UX Polish

**Domain:** Residential property management (Swiss context)
**Researched:** 2026-01-29
**Confidence:** MEDIUM-HIGH (WebSearch ecosystem survey + codebase analysis)

## Executive Summary

The v3.0 milestone covers three distinct feature areas: a Tenant Portal for self-service interactions, Offline PWA support for field workers, and UX Polish across the existing app. Research shows tenant self-service portals are now table stakes in property management software (TenantCloud, Buildium, Plentific all offer them). Offline PWA is technically feasible with Next.js 16 + Supabase via IndexedDB sync queues, but requires significant infrastructure work. UX Polish addresses known issues from v2.2 UAT and common mobile-first patterns.

**Key insight for KEWA context:** The tenant portal should be minimal. KEWA manages residential tenants in Switzerland, not commercial properties. Tenants need to report issues and communicate -- they do NOT need rent payment, lease signing, or community features. The Swiss aroov platform (Garaio REM + Mobiliar) confirms the core Swiss tenant portal pattern: damage reporting, communication, document access.

**Existing infrastructure to leverage:**
- Contractor magic-link portal (portal routes, token auth) -- extend for tenant auth
- Comment system (entity-based comments with visibility control) -- extend for tenant messages
- Service worker (push notifications only) -- extend with caching + offline support
- `tenant` role already exists in RBAC with `TenantUser` junction table
- Unit already has `tenant_email`, `tenant_phone`, `tenant_name` fields
- RegisterRequest already supports `roleName: 'tenant'` with optional `unitId`

---

## 1. Tenant Portal

Self-service portal where tenants can report maintenance issues, communicate with KEWA, and access their unit information. Tenants authenticate via email (already supported in auth types) and see only their own unit data.

### Table Stakes

Features tenants expect from any property management portal. Missing = portal feels useless.

| Feature | Description | Complexity | Dependencies | Notes |
|---------|-------------|------------|--------------|-------|
| Tenant registration + login | Email/password registration, scoped to unit | Low | Existing `RegisterRequest` with `roleName: 'tenant'`, `unitId` | Auth infrastructure already built; needs tenant login UI |
| Maintenance ticket creation | Submit issue with category, description, optional photo | Medium | New `tickets` table; existing media system | Core value prop of tenant portal |
| Ticket status tracking | Tenant sees ticket status: submitted > acknowledged > in_progress > resolved | Low | Status enum on tickets table | Mirrors work order status pattern |
| Ticket photo upload | Attach photos showing the issue | Low | Existing Supabase storage + media pattern | Tenants upload from mobile camera |
| Ticket communication thread | Message back-and-forth on a ticket between tenant and KEWA | Medium | Extend existing comment system with `entity_type: 'ticket'` | Existing `CommentVisibility` supports internal/shared |
| Unit info view | Tenant sees their unit details, address, contact info for KEWA | Low | Read-only view of unit data filtered by `tenant_users` junction | Already have unit data model |
| Tenant dashboard | Landing page showing open tickets, recent messages, unit info | Low | Aggregation query | Simple overview page |
| Email notification on ticket updates | Tenant gets email when ticket status changes or KEWA replies | Medium | New email sending capability (not yet in codebase) | Critical -- tenants won't check portal constantly |
| German language UI | Portal in German (Kundenportal, Schadensmeldung, etc.) | Low | Already German throughout app | Swiss tenant context |
| Mobile-responsive layout | Portrait-first layout for phone usage from home | Low | Tailwind responsive already in use | Tenants = mobile-first from home |

### Differentiators

Features that elevate the portal beyond basic. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Ticket category with smart routing | Pre-defined categories (Heizung, Wasser, Elektrik, Allgemein) auto-suggest priority | Low | Category enum on tickets | Helps KEWA triage faster |
| Document access | Tenant can view shared documents (house rules, Hausordnung) | Medium | Extend knowledge base with `tenant_visible` flag | Similar to contractor-visible KB articles |
| Push notifications for tenants | Browser push when ticket status changes | Low | Existing push notification infrastructure | Service worker already deployed |
| Ticket urgency levels | Tenant selects urgency (Notfall / Dringend / Normal) | Low | Priority enum on tickets | Helps KEWA prioritize |
| Tenant profile self-service | Update phone number, email, emergency contact | Low | Update user record | Reduces admin data entry |
| Announcement board | KEWA posts announcements visible to all tenants (Hausmitteilung) | Medium | New announcements entity or reuse KB | Building-wide communication |
| Ticket-to-work-order conversion | KEWA converts tenant ticket into internal work order with one click | Medium | Link tickets.id to work_orders | Key workflow: ticket report -> work order -> contractor assignment |
| Seasonal info display | Show heating oil status, building maintenance schedule | Low | Read from existing supplier/schedule data | Swiss tenants care about Heizung |

### Anti-Features

Features to deliberately NOT build. Either overkill for KEWA or out of scope.

| Anti-Feature | Why Avoid | What Instead |
|--------------|-----------|--------------|
| Online rent payment | Explicitly out of scope per PROJECT.md; CSV export for accounting suffices | Show rent amount read-only for info |
| Lease signing / document upload by tenant | Legal complexity; KEWA manages contracts offline | Document viewing only |
| Community forum / message board between tenants | Only ~20-40 tenants across properties; creates moderation burden | Announcements from KEWA only (one-way) |
| Tenant screening / application process | DigiRENT handles this in Swiss market; not KEWA's workflow | Out of scope entirely |
| Maintenance scheduling by tenant | KEWA decides scheduling; tenant just reports | Tenant sees status, not schedule |
| Multi-language support | German-only for Swiss context; KEWA tenants are local | German UI only |
| Chatbot / AI ticket triage | Over-engineering for small portfolio; KEWA reviews manually | Category selection by tenant |
| Tenant satisfaction surveys | Enterprise feature; verbal feedback sufficient for small portfolio | Out of scope |
| Automatic ticket-to-work-order conversion | PROJECT.md explicitly states "KEWA entscheidet manuell" | Manual conversion button |

---

## 2. Offline PWA Support

Progressive Web App with offline capability so field workers (contractors on construction sites, KEWA staff on property visits) can view and create data without connectivity. Sync when back online.

### Table Stakes

Minimum viable offline experience. Without these, offline mode is unusable.

| Feature | Description | Complexity | Dependencies | Notes |
|---------|-------------|------------|--------------|-------|
| PWA manifest + install prompt | `manifest.json` with icons, `display: standalone`, install banner | Low | New manifest file; Next.js metadata API | App must be installable to home screen |
| Offline page fallback | When offline and navigating to uncached page, show offline indicator | Low | Extend existing service worker with cache-first for app shell | Serwist or custom SW extension |
| App shell caching | Cache HTML, CSS, JS, fonts for offline navigation | Medium | Service worker precaching strategy | Static assets = CacheFirst; pages = NetworkFirst |
| Online/offline indicator | Visual indicator showing current connectivity status | Low | `navigator.onLine` + `online`/`offline` events | Banner or icon in header |
| Offline data reading | View previously loaded work orders, tasks, projects while offline | Medium | IndexedDB store for recently viewed entities | Cache on view; read from IDB when offline |
| Offline form queue | Create/edit operations queued when offline, synced when online | High | IndexedDB sync queue with operation log | Core offline-first pattern: write to IDB, replay on reconnect |
| Background sync | Queued operations automatically sync when connectivity returns | Medium | Background Sync API in service worker | Fire-and-forget sync on reconnect |
| Sync status indicator | Show pending sync count, last sync time, sync progress | Low | Read from IndexedDB queue length | User needs confidence data will sync |
| Conflict detection | Detect when server data changed while user was offline | Medium | Version field or `updated_at` timestamp comparison | Last-write-wins with user notification |

### Differentiators

Features that make offline genuinely useful vs. just tolerable.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Offline photo capture | Take photos while offline, queue for upload on reconnect | Medium | Blob storage in IndexedDB; sync queue for media | Critical for site inspections |
| Selective pre-caching | Pre-cache specific project/property data before going to site | Medium | User-triggered download of project bundle | "Download for offline" button |
| Offline inspection completion | Complete full inspection checklist offline with photos | High | Complex: checklist state + photos + signatures in IDB | High-value use case for site visits |
| Delta sync | Only sync changed fields, not full records | Medium | Track dirty fields per entity in IDB | Reduces data transfer on reconnect |
| Retry with exponential backoff | Failed syncs retry automatically with increasing delays | Low | Standard retry pattern in sync worker | Handles flaky connections gracefully |
| Offline search | Search cached entities while offline | Medium | IndexedDB indexes on key fields | Useful if many items cached |

### Anti-Features

Features to deliberately NOT build. Either technically problematic or unnecessary.

| Anti-Feature | Why Avoid | What Instead |
|--------------|-----------|--------------|
| Full offline-first architecture | Massive complexity (CRDT, full local DB mirroring); only 2 internal users + contractors | Selective caching of recently viewed + manual pre-cache |
| Real-time collaborative offline editing | CRDTs, operational transforms -- enormous complexity | Last-write-wins with conflict notification |
| Offline push notification delivery | Impossible by definition; push requires connectivity | Queue notifications server-side, deliver on reconnect |
| Offline PDF generation | @react-pdf/renderer is heavy for client-side; PDFs are view-only | Cache generated PDFs, don't generate offline |
| Offline authentication | Security concern; token refresh requires server | Use existing session token with extended TTL for offline |
| Full database mirror to IndexedDB | Storage quota issues (Safari: 50MB); unnecessary for small data set | Cache active project context only |
| Offline file upload background sync | Background Sync API is not reliable for large files across all browsers | Queue metadata; upload files when user is back online with explicit trigger |

---

## 3. UX Polish

Fixes for known UAT issues from v2.2 plus general UX improvements common in property management apps. Addresses mobile-first gaps and workflow friction.

### Table Stakes (Known Issues)

Issues explicitly carried forward from v2.2 UAT. Must fix.

| Feature | Description | Complexity | Dependencies | Notes |
|---------|-------------|------------|--------------|-------|
| Invoice linking modal | Replace `prompt()` with proper modal UI for linking invoices | Low | Existing invoice linking API | STATE.md UAT issue |
| Checklist item title display | Populate title/description from template into ChecklistItemResult | Low | Template lookup on inspection creation | STATE.md UAT issue |
| Property-level delivery history | Build delivery history page at property level | Low | Data model exists from Phase 19/20 | STATE.md UAT issue -- data ready, page missing |

### Table Stakes (UX Improvements)

Standard UX patterns missing from the current app that users expect.

| Feature | Description | Complexity | Dependencies | Notes |
|---------|-------------|------------|--------------|-------|
| Loading states | Skeleton loaders or spinners for all data fetches | Low | Global pattern or per-component | Replace empty states during load |
| Error handling UI | User-friendly error messages with retry option | Low | Toast/notification component | Replace raw error text |
| Empty states | Meaningful illustrations/messages when lists are empty | Low | Per-entity empty state messages | "Keine Projekte vorhanden" with CTA |
| Form validation feedback | Inline validation errors on form fields | Low | Per-form validation | Prevent submit of invalid data |
| Confirmation dialogs | Confirm before destructive actions (delete, archive) | Low | Reusable dialog component | Prevent accidental deletes |
| Breadcrumb navigation | Show location in hierarchy: Property > Unit > Project > Task | Low | Layout component | Deep nesting needs orientation |
| Toast notifications | Transient success/error messages after actions | Low | Toast component (e.g., sonner) | "Gespeichert", "Geloescht", etc. |
| Keyboard shortcuts | Common shortcuts (Escape to close modal, Enter to submit) | Low | Event listeners on modals/forms | Power user productivity |

### Differentiators (UX Enhancements)

Improvements that elevate the experience beyond functional.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Optimistic UI updates | Immediate visual feedback, revert on error | Medium | Per-mutation pattern | Feels instant instead of waiting for server |
| Quick actions from dashboard | One-click common actions (new ticket, new work order) | Low | Dashboard widget | Reduce clicks for frequent actions |
| Swipe gestures on mobile | Swipe to archive, swipe to complete on list items | Medium | Touch event handling or library | Mobile-first interaction pattern |
| Search across entities | Global search finding projects, tasks, partners, units | Medium | Combined full-text query or client-side | Currently no cross-entity search |
| Recent items / favorites | Quick access to recently viewed or pinned entities | Low | LocalStorage or DB table | Power user shortcut |
| Dark mode | System-aware dark color scheme | Medium | Tailwind dark: variant throughout app | Common user expectation |
| Bulk operations | Select multiple items for status change, archive, assign | Medium | Multi-select UI + batch API | Useful for task/ticket management |
| Data export improvements | Export filtered views as CSV/PDF | Low | Extend existing CSV export | Per-table export with current filters |
| Responsive tables | Horizontal scroll or card view for tables on mobile | Low | Tailwind responsive patterns | Many tables currently overflow on mobile |
| Pull-to-refresh on mobile | Swipe down to refresh data on mobile views | Low | Touch event handler | Standard mobile pattern |

### Anti-Features (UX)

| Anti-Feature | Why Avoid | What Instead |
|--------------|-----------|--------------|
| Multi-language i18n | German-only context; i18n framework adds overhead for zero benefit | Hardcoded German strings |
| Animated transitions everywhere | Performance overhead on mobile; feels "enterprise" | Subtle transitions on modals/sheets only |
| Complex onboarding wizard for tenants | Tenants do one thing: report issues; zero learning curve needed | Simple login -> dashboard flow |
| Customizable dashboard widgets | 2 internal users; fixed dashboard layout sufficient | Pre-built dashboard sections |
| AI-powered anything | Over-engineering; KEWA is manual-decision-first | Standard search and filters |
| Real-time collaborative editing | Only 2 users; conflict probability near zero | Standard save/refresh pattern |

---

## Feature Dependencies

### Dependency Graph

```
Tenant Portal:
  - tenant role + auth (existing) -> tenant login UI
  - tickets table (new) -> ticket CRUD
  - comment system (existing) -> ticket communication
  - media system (existing) -> ticket photos
  - knowledge base (existing) -> tenant document access
  - push notifications (existing) -> tenant push alerts
  - email sending (NEW) -> ticket status emails

Offline PWA:
  - service worker (existing) -> extend with caching
  - manifest.json (NEW) -> PWA install
  - IndexedDB layer (NEW) -> offline data store
  - sync queue (NEW) -> offline mutation queue
  - Background Sync API -> automatic reconnect sync

UX Polish:
  - no new dependencies (fixes existing features)
  - toast library (sonner or similar) -> notification UI
```

### Cross-Feature Dependencies

| From | To | Relationship |
|------|----|-------------|
| Tenant Portal | Offline PWA | Tenant portal benefits from PWA install (home screen icon) |
| Tenant Portal | UX Polish | Polish should include tenant portal UI consistency |
| Offline PWA | Tenant Portal | Offline ticket creation is a differentiator, not table stakes |
| UX Polish | Everything | Polish applies to all existing features + new portal |

### Recommended Build Order

1. **UX Polish (known issues)** -- Fix v2.2 UAT bugs first (invoice modal, checklist titles, delivery history)
2. **Tenant Portal (core)** -- Registration, login, ticket creation, status tracking, communication
3. **Offline PWA (foundation)** -- Manifest, app shell caching, offline indicator, install prompt
4. **UX Polish (improvements)** -- Loading states, empty states, toast notifications, error handling
5. **Offline PWA (data sync)** -- IndexedDB, sync queue, background sync, conflict detection
6. **Tenant Portal (extras)** -- Document access, announcements, ticket-to-work-order conversion

**Rationale:** Fix known bugs first (quick wins, user trust). Tenant portal is the primary new feature with clear user value. PWA foundation is low-effort but visible (installable app). Then interleave polish and advanced offline as they're both refinement work.

---

## MVP Recommendation

### Must Have for v3.0

**Tenant Portal:**
1. Tenant email registration + login (scoped to unit)
2. Maintenance ticket creation with category, description, photos
3. Ticket status tracking (submitted > acknowledged > in_progress > resolved)
4. Communication thread per ticket
5. Tenant dashboard (open tickets, unit info)
6. Email notification on ticket updates (requires new email capability)

**Offline PWA:**
1. `manifest.json` with icons + install prompt
2. App shell caching (offline navigation works)
3. Online/offline indicator
4. Offline data reading for recently viewed items

**UX Polish:**
1. Fix all 3 carried UAT issues
2. Loading states across the app
3. Toast notifications for actions
4. Empty states with meaningful messages

### Defer to Post-v3.0

- Offline form queue + background sync (high complexity, limited user count)
- Offline photo capture and sync
- Full offline inspection workflow
- Dark mode (nice-to-have, not blocking)
- Swipe gestures (mobile enhancement)
- Global cross-entity search
- Tenant document access (depends on KB extension)
- Announcement board
- Bulk operations

---

## Swiss Context Considerations

| Consideration | Impact | Action |
|---------------|--------|--------|
| Datenschutz (Data Protection) | Tenant personal data must be protected; visible only to KEWA + tenant themselves | RLS policies on tenant data; tenant sees only own unit |
| Swiss hosting | Data should remain in Swiss/EU jurisdiction | Supabase project region (already configured) |
| Mietrecht (Tenancy Law) | Tenants entitled to habitable conditions; maintenance reporting is a right | Ticket system supports this legal requirement |
| German UI | All tenant-facing text in German | Schadensmeldung, Kundenportal, Reparaturanfrage, etc. |
| No automated decisions | Swiss context favors manual review over automation | KEWA manually converts tickets to work orders |

### German Terminology for Tenant Portal

| Feature | German Term | Context |
|---------|-------------|---------|
| Tenant Portal | Mieterportal / Kundenportal | Portal header |
| Maintenance Request | Schadensmeldung / Reparaturanfrage | Ticket creation |
| Ticket | Meldung / Anfrage | Ticket entity |
| Status: Submitted | Eingereicht | First status |
| Status: Acknowledged | Bestaetigt | KEWA confirms receipt |
| Status: In Progress | In Bearbeitung | Work underway |
| Status: Resolved | Erledigt | Issue fixed |
| Urgency | Dringlichkeit | Priority selector |
| Emergency | Notfall | Highest priority |
| Category | Kategorie | Ticket category |
| Heating | Heizung | Category option |
| Water/Plumbing | Wasser/Sanitaer | Category option |
| Electrical | Elektrik | Category option |
| General | Allgemein | Default category |
| Documents | Dokumente | Document section |
| Announcements | Hausmitteilungen | Building announcements |

---

## Sources

### Tenant Portal
- [TenantCloud - Property Management Software](https://www.tenantcloud.com)
- [Veco Plus - Rise of Self-Service Portals](https://veco.software/news-insights/rise-of-self-service)
- [Plentific - Resident Portal](https://www.plentific.com/resident-portal-app/)
- [Buildium - Tenant Portal Definition](https://www.buildium.com/dictionary/tenant-portal/)
- [RealCube - Self-Service Portals](https://www.realcube.estate/blog/self-service-portals-empowering-tenants-and-reducing-operational-load)
- [Swiss Mobiliar / aroov - Swiss Tenant Portal](https://www.icmif.org/news_story/swiss-mobiliar-launches-tenant-portal-with-property-management-software-company/)
- [DigiRENT - Swiss Digital Rental](https://digirent.swiss/en/digirent)
- [Abacus AbaRealEstate - Swiss Property Management](https://www.abacus.ch/en/industry-solutions/real-estate/property-management/overview)
- [InvGate - Maintenance Ticketing System](https://blog.invgate.com/maintenance-ticketing-system)
- [Property Inspect - Maintenance Workflow](https://support.propertyinspect.com/en/articles/9976015-action-maintenance-workflow-system)
- [Buildium - Maintenance Workflows](https://www.buildium.com/blog/property-maintenance-management-workflows-101/)
- [Altamira - Property Management Ticketing](https://www.altamira.ai/blog/property-management-ticketing-systems/)

### Offline PWA
- [MDN - Service Workers for Offline](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers)
- [HTTP Archive - PWA Almanac 2025](https://almanac.httparchive.org/en/2025/pwa)
- [Microsoft - Background Syncs](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs)
- [web.dev - Offline Data in PWA](https://web.dev/learn/pwa/offline-data)
- [LogRocket - Offline-First Frontend Apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [GTCSys - PWA Data Sync & Conflict Resolution](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
- [LogRocket - Next.js 16 PWA Offline](https://blog.logrocket.com/nextjs-16-pwa-offline-support)
- [Next.js Official Docs - PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Medium - Offline-First PWA with Next.js, IndexedDB, Supabase (Jan 2026)](https://medium.com/@oluwadaprof/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9)

### UX Polish
- [Renting Well - Top PM Software for UX 2025](https://rentingwell.com/2025/05/25/top-property-management-software-for-ux-in-2025/)
- [RON Design Lab - Tenancy Property SaaS UX](https://rondesignlab.com/cases/tenancy-property-saas-ux-ui-design)
- [Proprli - Tenant Experience Platform](https://proprli.com/knowledge-center/tenant-experience-platform-improving-services-in-property-management/)
- [Suffescom - Property Management App Development 2026](https://www.suffescom.com/blog/develop-property-management-app)

---

## Metadata

**Confidence breakdown:**
- Tenant Portal: HIGH -- Well-established pattern; Swiss-specific examples found (aroov, DigiRENT); existing codebase has tenant role infrastructure ready
- Offline PWA: MEDIUM -- Pattern is well-documented but Next.js 16 App Router + offline has known challenges (Serwist compatibility, dynamic routes); IndexedDB sync is complex
- UX Polish: HIGH -- Known issues documented in STATE.md; standard UX patterns well-understood

**Research date:** 2026-01-29
**Valid until:** 2026-04-29 (feature patterns stable, 90-day relevance)
