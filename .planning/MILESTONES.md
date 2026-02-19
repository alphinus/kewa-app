# Project Milestones: KEWA Liegenschafts-Aufgabenverwaltung

## v3.0 Tenant & Offline (Shipped: 2026-02-03)

**Delivered:** Tenant self-service portal with maintenance ticket management, PWA with offline data sync and automatic background sync, and UX polish with skeleton loaders and toast notifications.

**Phases completed:** 25-29 (17 plans total)

**Key accomplishments:**

- Tenant Portal with WhatsApp-style message threads, real-time Supabase updates, QR multi-device login, German mobile-first UI
- PWA installable app with manifest, service worker caching for offline shell navigation, connectivity indicator
- Offline Data Sync with IndexedDB caching, form submission queue, automatic sync on reconnect, Last-Write-Wins conflict resolution
- Ticket-to-WorkOrder conversion with email and push notifications for tenants via Resend
- UX Pattern Library with skeleton loaders, empty states, error boundaries, confirmation dialogs, breadcrumbs, Sonner toasts

**Stats:**

- 77 commits
- 5 phases (25-29), 17 plans
- 37 requirements satisfied
- 5 days from milestone start to ship (2026-01-29 → 2026-02-03)

**Git range:** `feat(25-01)` → `docs(29): complete Tenant Extras & UX Improvements phase`

**What's next:** v3.1 (Integrations, Analytics) or production deployment with tenant onboarding

---

## v2.2 Extensions (Shipped: 2026-01-29)

**Delivered:** Knowledge Base with WYSIWYG editing, Supplier Management with purchase orders and deliveries, Change Orders with approval workflow, Inspection Workflow with checklists and signatures, Push Notifications with service worker.

**Phases completed:** 18-24 (25 plans total)

**Stats:**

- 7 phases (18-24), 25 plans
- 4 days from milestone start to ship (2026-01-26 → 2026-01-29)

**Git range:** `feat(18-01)` → `docs(24): complete Push Notifications phase`

---

## v2.1 Master Data Management (Shipped: 2026-01-25)

**Delivered:** Complete master data management — Partner/Contractor CRUD with WorkOrder integration, multi-property administration with context switching, unit and room management, template creation and editing UI, admin dashboard with setup wizard for first-time onboarding.

**Phases completed:** 13-17 (24 plans total)

**Key accomplishments:**

- Partner/Contractor master data with trade categories, active status, and WorkOrderForm dropdown integration
- Multi-property management with Property/Building hierarchy and BuildingContext for cross-app filtering
- Unit and room CRUD with tenant data (phone, email, move-in date, vacancy) and condition tracking
- Template UI with create/edit forms, drag-drop reordering, and template-first project creation flow
- Admin dashboard with counters, quick actions, search/filter on lists, and deployment README
- Setup wizard for first-time onboarding (creates property → building → partner)

**Stats:**

- 139 files created/modified
- ~75,000 lines of TypeScript (project total)
- ~24,800 lines added in v2.1
- 5 phases (13-17), 24 plans
- 84 commits
- 4 days from milestone start to ship (2026-01-22 → 2026-01-25)

**Git range:** `e347db6` → `995e8a1`

**What's next:** v2.2 Extensions (Change Orders, Suppliers, Inspection Workflow) or v3.0 Tenant Portal

---

## v2.0 Renovation Operations MVP (Shipped: 2026-01-19)

**Delivered:** Complete renovation management system with external contractor portal (magic-link), template-based WBS workflows, full cost tracking (offers → invoices → payments), digital twin with automatic condition tracking, and property dashboard with heatmap visualization.

**Phases completed:** 7-12.3 (31 plans total)

**Key accomplishments:**

- Multi-role RBAC system with 5 roles (Admin, Manager, Accounting, Tenant, Contractor) and 3 auth methods (PIN, Email, Magic-Link)
- External contractor portal with magic-link access, PDF work orders, accept/reject workflow, counter-offers, and document uploads
- Template system (WBS) with phases, packages, tasks, dependencies, and quality gates; atomic application via PostgreSQL function
- Cost & finance module with complete Offer → Invoice → Payment workflow, expense tracking, CSV export, and unit investment amortization
- Digital twin with automatic room/unit condition tracking derived from completed projects and timeline view
- Property dashboard with building heatmap, occupancy gauge, drilldown navigation, parking management, and comments system

**Stats:**

- 297 files created/modified
- ~51,000 lines of TypeScript (project total)
- ~70,524 lines added in v2.0
- 9 phases (7-12.3), 31 plans
- 255 commits
- 2 days from milestone start to ship (2026-01-18 → 2026-01-19)

**Git range:** `feat(07-01)` → `docs(12.3)`

**Deferred:** EXT-15 (automatic reminders) — requires background job infrastructure

**What's next:** v2.1 Extensions (Change Orders, Suppliers, Push Notifications, Knowledge Base) or production deployment

---

## v1 MVP (Shipped: 2026-01-17)

**Delivered:** Full task management app for KEWA AG property — PIN authentication, task CRUD with photo documentation, voice notes with German transcription, graphical building visualization, weekly reports, and project archiving.

**Phases completed:** 1-6 (17 plans total)

**Key accomplishments:**

- PIN-based authentication with role separation (KEWA AG vs Imeri), 7-day JWT sessions, and route protection
- Full task management with CRUD operations, priority/due dates, completion notes, and role-based dashboards
- Photo documentation with browser-side compression (720px WebP), before/after comparison view, and photo requirement for task completion
- Voice notes with OpenAI Whisper transcription for German (Hochdeutsch), 60-second max recording, and audio gallery
- Graphical building visualization with 5-floor grid, color-coded progress bars, tenant management, and visibility settings
- Reports & automation with weekly reports (photos + timestamps), recurring tasks (weekly/monthly), and project archiving

**Stats:**

- 117 files created/modified
- 12,116 lines of TypeScript
- 6 phases, 17 plans
- 2 days from project start to ship (2026-01-16 → 2026-01-17)

**Git range:** `feat(01-01)` → `docs(06)`

**What's next:** Deploy to Vercel, configure Supabase production environment, user acceptance testing with KEWA AG and Imeri.

---

## v3.1 Production Hardening (Shipped: 2026-02-17)

**Delivered:** Production-hardened app with security audit (CVE patching, CSP headers, rate limiting), performance optimization (629KB bundle reduction, 18.7% LCP improvement, database indexes), and German umlaut correction across entire codebase.

**Phases completed:** 30-34 (14 plans total)

**Key accomplishments:**

- Security hardened: Next.js 16.1.6 with 3 CVEs patched, CSP + security headers on all routes, Upstash rate limiting on 13 auth endpoints, error boundaries, env audit
- Performance baselined: Vercel Speed Insights + bundle analyzer integrated, Lighthouse CI with GitHub Actions, baseline metrics documented (LCP 3204ms, score 83)
- Database optimized: 3 composite indexes for dashboard queries, N+1 elimination via React cache() with TypeScript aggregates
- Bundle reduced 629KB (6x target): Recharts (337KB) and TipTap (292KB) lazy-loaded via next/dynamic, LCP improved 18.7% to 2605ms
- German umlauts corrected: 664 replacements across 198 source files, UTF-8 infrastructure (.editorconfig, encoding verification), database migration for German text

**Stats:**

- 50 commits
- 5 phases (30-34), 14 plans
- 19 requirements satisfied (SEC-01..09, PERF-01..07, I18N-01..03)
- 13 days from milestone start to ship (2026-02-05 → 2026-02-17)

**Git range:** `feat(30-01)` → `feat: correct German umlauts across entire codebase (Phase 34)`

**What's next:** Next milestone planning (integrations, analytics, or production onboarding)

---


## v4.0 Multi-Tenant Data Model & Navigation (Shipped: 2026-02-19)

**Delivered:** Branchenstandard multi-tenant data model with organization-scoped RLS on 62 tables, hierarchical navigation with /objekte drill-down, and org-isolated file storage.

**Phases completed:** 35-41 (24 plans total)

**Key accomplishments:**

- Multi-tenant schema: 5 new tables (organizations, organization_members, owners, mandates, tenancies) + organization_id on 62 existing tables + 37 BEFORE INSERT/UPDATE triggers auto-propagating org_id through property hierarchy
- Data migration: KEWA AG + Imeri Immobilien AG seeded with 4 owners, 4 mandates, 10 users, 17 org_members; full backfill + NOT NULL constraints on 56 tables
- Row-level security: 248 RESTRICTIVE policies on 62 tables, middleware x-organization-id header, 168 API/lib files migrated to org-aware Supabase clients (createOrgClient/createPublicClient/createServiceClient)
- Application context: OrganizationProvider > MandateProvider > BuildingProvider hierarchy with OrgSwitcher dropdown and CombinedSelector (mandate + building grouping)
- Navigation redesign: 5-item mobile footer with MehrBottomSheet, DashboardBreadcrumbs on 59 pages, /objekte drill-down (property > building > unit > room)
- Storage multi-tenancy: Org-prefixed storage paths on 4 buckets, storage RLS policies, file migration script
- Integration bug fixes: Signature storage RLS via client injection, hauswart isInternalRole() auth, cached-queries org-scoped with React cache()

**Stats:**

- 95 commits
- 7 phases (35-41), 24 plans
- 26 requirements satisfied (SCHEMA-01..07, MIGR-01..03, RLS-01..05, CTX-01..04, NAV-01..04, STOR-01..03)
- 305 files changed, +26,305 / -5,645 lines
- 2 days from milestone start to ship (2026-02-17 → 2026-02-18)

**Git range:** `docs: start milestone v4.0` → `docs(v4.0): milestone audit`

**Tech debt:** 6 items (34 routes retain legacy ALLOWED_ROLES, visible_to_imeri pattern, legacy users.role column, liegenschaft redirect ID mismatch, runtime DB verification deferred, manual storage migration ordering). None blocking.

**What's next:** Deploy migration chain (073-084) to staging, runtime verification, production deployment

---

