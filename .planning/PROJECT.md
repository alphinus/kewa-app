# Renovation Operations Platform

## What This Is

Eine mandantenfähige Immobilienverwaltungs- und Renovations-Plattform. Branchenstandard-Hierarchie (Verwaltung → Mandat → Eigentümer → Liegenschaft → Gebäude → Einheit → Mietverhältnis), standardisierte Projektvorlagen (WBS), externes Handwerker-Portal via Magic-Link, vollständige Kostenübersicht mit Offerten→Rechnungen→Zahlungen, automatische Zustandshistorie ("Digital Twin") pro Raum/Wohnung, Property-Dashboard mit Heatmap-Visualisierung, Stammdaten-Verwaltung für Partner und Templates, Mieter-Portal mit Ticket-System, und PWA mit Offline-Sync. Datentrennung via Supabase RLS auf 62 Tabellen mit 248 Policies. KEWA AG ist der initiale Mandant.

## Core Value

Immobilienverwaltungen haben volle Transparenz und Kontrolle über alle Renovationen — mit standardisierten Workflows, mandantenfähiger Datentrennung, externer Handwerker-Integration, Kostenübersicht und automatischer Zustandshistorie.

## Current State (v5.0 In Progress)

**Tech Stack:** Next.js 16.1.6 + React 19 + Supabase + Tailwind CSS 4
**Codebase:** ~130,000+ LOC TypeScript, ~850+ files
**Status:** v5.0 Unified Auth & RBAC in progress

## Current Milestone: v5.0 Unified Auth & RBAC

**Goal:** Komplettes Auth-System auf Supabase Auth migrieren, Rollen org-basiert machen, RLS auf JWT umstellen, Legacy-Auth-Code bereinigen.

**Target features:**
- Supabase Auth für alle Nutzertypen (Email/Passwort, Magic-Link, Email)
- Org-basierte Rollen via organization_members (5 Rollen pro Org)
- RLS-Policies auf auth.uid() + JWT claims umstellen
- 34 API-Routen von ALLOWED_ROLES auf org-basierte Berechtigungen migrieren
- Legacy-Code entfernen (users.role, visible_to_imeri)

**Previous Milestones:**
- v4.0 Multi-Tenant Data Model & Navigation (shipped 2026-02-19) — See milestones/v4.0-ROADMAP.md
- v3.1 Production Hardening (shipped 2026-02-17) — See milestones/v3.1-ROADMAP.md
- v3.0 Tenant & Offline (shipped 2026-02-03) — See milestones/v3.0-ROADMAP.md
- v2.2 Extensions (shipped 2026-01-29) — See milestones/v2.2-ROADMAP.md
- v2.1 Master Data Management (shipped 2026-01-25) — See milestones/v2.1-ROADMAP.md
- v2.0 Advanced Features (shipped 2026-01-19) — See milestones/v2.0-ROADMAP.md
- v1.0 MVP (shipped 2025-03-XX) — See milestones/v1.0-ROADMAP.md

## Requirements

### Validated

**v1:**
- ✓ PIN-basierte Anmeldung (KEWA AG + Imeri) — v1
- ✓ 7-Tage Session-Persistenz mit httpOnly Cookie — v1
- ✓ Grafische Gebäudeansicht (5 Ebenen) — v1
- ✓ Task-CRUD mit Priorität, Fälligkeit, Status — v1
- ✓ Foto-Upload (vorher/nachher) — v1
- ✓ Sprachnotizen mit Transkription — v1
- ✓ Wöchentliche Berichte — v1

**v2.0:**
- ✓ DATA-01 to DATA-15: Alle 15 Entities (Property, Unit, Room, Project, Task, WorkOrder, Partner, Offer, Invoice, Expense, Payment, Media, AuditLog) — v2.0
- ✓ AUTH-01 to AUTH-09: 5 Rollen + 3 Auth-Methoden + Audit-Logging — v2.0
- ✓ STAT-01 to STAT-04: Status-Workflows mit State Machine — v2.0
- ✓ TMPL-01 to TMPL-06: Template-System mit WBS, Quality Gates, Atomic Application — v2.0
- ✓ EXT-01 to EXT-14, EXT-16: Magic-Link Portal, PDF, Accept/Reject, Counter-Offers, Tracking — v2.0
- ✓ HIST-01 to HIST-05: Digital Twin, Timeline, Condition Automation — v2.0
- ✓ COST-01 to COST-06: Kosten-Workflow, Expenses, Aggregation, CSV Export — v2.0
- ✓ RENT-01 to RENT-03: Mietzins, Investment-Übersicht, Amortisation — v2.0
- ✓ DASH-01 to DASH-06: Property-Dashboard, Heatmap, Drilldown — v2.0
- ✓ PARK-01 to PARK-05: Parkplätze mit Status-Tracking — v2.0
- ✓ OCCU-01 to OCCU-04: Auslastungs-Dashboard — v2.0
- ✓ COMM-01 to COMM-03: Kommentar-System mit Visibility — v2.0
- ✓ DEBT-01 to DEBT-04: Tech Debt bereinigt — v2.0
- ✓ NFR-01 to NFR-06: Audit, Datenschutz, Storage, Security — v2.0

**v2.1:**
- ✓ PART-01 to PART-05: Partner CRUD, Dropdown, Trade Filtering — v2.1
- ✓ PROP-01 to PROP-05: Multi-Property, Building Context, Heatmap Filtering — v2.1
- ✓ UNIT-01 to UNIT-04: Unit/Room CRUD, Tenant Data, Condition Tracking — v2.1
- ✓ TMPL-01 to TMPL-05: Template UI, Create/Edit, Project Creation Flow — v2.1
- ✓ ADMN-01 to ADMN-03: Admin Dashboard, Quick Actions, Search — v2.1
- ✓ SEED-01 to SEED-04: Migrations, Seed Script, Setup Wizard, README — v2.1

**v2.2:**
- ✓ KNOW-01 to KNOW-10: Knowledge Base (articles, categories, search, attachments, versions, contractor visibility) — v2.2
- ✓ SUPP-01 to SUPP-12: Supplier Module (purchase orders, deliveries, consumption, reorder alerts, price analytics) — v2.2
- ✓ CHNG-01 to CHNG-10: Change Orders (workflow, counter-offers, PDF, portal approval) — v2.2
- ✓ INSP-01 to INSP-12: Inspection Workflow (checklists, defects, signatures, re-inspections, room conditions) — v2.2
- ✓ PUSH-01 to PUSH-12: Push Notifications (service worker, preferences, triggers, notification center) — v2.2

**v3.0:**
- ✓ TPRT-01 to TPRT-15: Tenant Portal (registration, tickets, messages, dashboard, notifications) — v3.0
- ✓ OFFL-01 to OFFL-12: Offline PWA (manifest, service worker, IndexedDB caching, sync queue, conflict resolution) — v3.0
- ✓ UXPL-01 to UXPL-10: UX Polish (toast notifications, skeleton loaders, empty states, breadcrumbs) — v3.0

**v3.1:**
- ✓ SEC-01 to SEC-09: Security Audit (CVE patching, CSP headers, rate limiting, error boundaries, env audit) — v3.1
- ✓ PERF-01 to PERF-07: Performance (Lighthouse baseline, bundle analysis, DB indexes, N+1 fix, lazy loading) — v3.1
- ✓ I18N-01 to I18N-03: German Umlauts (UTF-8 infrastructure, umlaut correction, DB collation) — v3.1

**v4.0:**
- ✓ SCHEMA-01 to SCHEMA-07: Schema Foundation (organizations, owners, mandates, tenancies, org_id columns, RLS helpers, sync triggers) — v4.0
- ✓ MIGR-01 to MIGR-03: Data Migration (KEWA AG seed, backfill, NOT NULL constraints) — v4.0
- ✓ RLS-01 to RLS-05: Row-Level Security (248 policies, middleware header, org-aware clients, API migration, isolation verification) — v4.0
- ✓ CTX-01 to CTX-04: Application Context (OrganizationProvider, MandateProvider, OrgSwitcher, BuildingContext scoping) — v4.0
- ✓ NAV-01 to NAV-04: Navigation Redesign (breadcrumbs, simplified footer, /objekte drill-down, URL redirects) — v4.0
- ✓ STOR-01 to STOR-03: Storage Multi-Tenancy (org-prefixed paths, storage RLS, file migration) — v4.0

### Active

**v5.0 — Unified Auth & RBAC:**
- [ ] Supabase Auth Integration (Email/Passwort für Interne, Magic-Link für Contractors, Email für Mieter)
- [ ] Org-basierte Rollen (organization_members.role, 5 Rollen pro Org)
- [ ] RLS-Migration auf JWT (auth.uid() + JWT claims statt set_config/current_setting)
- [ ] API-Route Cleanup (34 Legacy ALLOWED_ROLES Routen → org-basierte Berechtigungen)
- [ ] Legacy-Cleanup (users.role Spalte droppen, visible_to_imeri entfernen)

### Future

- [ ] INTG-01 to INTG-03: Integrationen (Kalender, Buchhaltung)

### Deferred

- **EXT-15:** Automatic reminders (24h + 48h) — requires background job infrastructure (cron/queue)

### Out of Scope

- Online-Payment — CSV-Export für Buchhaltung reicht
- Native Mobile App — PWA-Ansatz bevorzugt
- Schweizerdeutsch-Transkription — zu unzuverlässig
- Vollautomatische Ticket→WorkOrder — KEWA entscheidet manuell
- Rechtliche Beratung — Knowledge Base nur als FAQ

## Context

**Plattform-Vision:**
- Mandantenfähige SaaS-Plattform für Immobilienverwaltungen
- KEWA AG ist initialer Mandant, Software soll verkaufbar sein
- Branchenstandard-Datenmodell nach Schweizer Immo-Software (Fairwalter, Rimo R5, ImmoTop2)

**Nutzer (pro Mandant):**
- Verwaltung (Admin): Verwaltet Mandate, Liegenschaften, Eigentümer
- Property/Project Manager: Erstellt Projekte, koordiniert Handwerker
- Accounting: Kosten, Rechnungen, Zahlungen
- Hauswart: Gebäudeverwaltung, Aufgaben vor Ort
- Externe Handwerker: Empfangen Aufträge via Magic-Link
- Eigentümer: Sieht eigene Liegenschaften (zukünftig)
- Mieter: Können Tickets erstellen, mobile-first

**Nutzungskontext:**
- Verwaltung: Desktop + Mobile
- Handwerker: Mobile-first, oft auf Baustelle
- Externe Contractors: Minimales Portal, kein Login nötig
- Mieter: Mobile-first, von zuhause

**Immobilien-Hierarchie:**
- Organization (Verwaltung) → Mandate → Owner (Eigentümer)
- Mandate → Property (Liegenschaft) → Building (Gebäude) → Unit (Einheit) → Room
- Tenancy (Mietverhältnis) als zeitgebundene Entität auf Unit
- STWE-Support vorbereitet (Wertquote, Eigentumsperiode)

**Known Tech Debt (from v4.0):**
- 34 API routes retain legacy ALLOWED_ROLES pattern (works via role='kewa' placeholder, breaks when users.role dropped) — **targeted by v5.0**
- visible_to_imeri business logic in 4 routes (pre-existing, not regression) — **targeted by v5.0**
- Legacy users.role column not dropped (deferred to auth milestone) — **targeted by v5.0**
- liegenschaft/[id] redirect ID mismatch (silent fallback)
- Runtime DB verification of migration chain 073-084 deferred
- Storage migration script must run before 084_storage_rls.sql

## Constraints

- **Tech Stack**: Next.js 16 + Supabase + Vercel
- **Auth**: PIN (intern) + Email (Mieter) + Magic-Link (Contractors)
- **Multi-Tenancy**: Single DB + Supabase RLS (organization_id on all tables)
- **Audit**: Alle Änderungen geloggt
- **Schweizer Kontext**: Datenschutz, Datentrennung, 8.0% VAT
- **External Access**: Token-basiert, ablaufend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PIN statt Login (intern) | Zwei interne Nutzer, maximale Einfachheit | ✓ v1 |
| Supabase für Backend | Datenbank + Storage + Auth in einem | ✓ v1 |
| Next.js 16 + Vercel | Moderne Stack, einfaches Deployment | ✓ v1 |
| Magic-Link für Contractors | Kein Login nötig, sicher, trackbar | ✓ v2.0 |
| Template-System (WBS) | Standardisierte Renovationen, weniger Fehler | ✓ v2.0 |
| Digital Twin (Condition) | Automatische Historie, keine manuelle Pflege | ✓ v2.0 |
| Kosten-Workflow | Offer → Invoice → Payment = Buchhaltungsrealität | ✓ v2.0 |
| @react-pdf/renderer | No Puppeteer needed, React-native syntax, ESM-compatible | ✓ v2.0 |
| State Machine via JSONB | Declarative transitions, trigger enforcement | ✓ v2.0 |
| CSS Gantt over library | Simpler, no license, full control | ✓ v2.0 |
| Server Components for Dashboard | Direct DB access, no client-side query overhead | ✓ v2.0 |
| Swiss VAT 8.0% default | 2024 Swiss VAT rate for invoices | ✓ v2.0 |
| BuildingContext for filtering | Cross-app building selection with 'all' option | ✓ v2.1 |
| Template-first project flow | Select template before project details (KEWA workflow) | ✓ v2.1 |
| Setup wizard for onboarding | Guided first-time setup for new deployments | ✓ v2.1 |
| Mieter-Portal in Phase 3 | MVP-Fokus auf Renovation, Mieter später | ✓ v3.0 |
| Application-layer tenant isolation | Simpler than RLS, consistent auth pattern | ✓ v3.0 |
| Manual service worker (no Serwist) | Turbopack conflict avoidance | ✓ v3.0 |
| Last-Write-Wins conflict resolution | Server timestamp authority, simple sync | ✓ v3.0 |
| Network-first API, cache-first static | Optimized for field workers with intermittent connectivity | ✓ v3.0 |
| Upstash Redis for rate limiting | Serverless-compatible, no Docker needed | ✓ v3.1 |
| CSP with unsafe-inline/unsafe-eval | Next.js compatibility requires it | ✓ v3.1 |
| Dictionary-based umlaut replacement | Avoids false positives on English words | ✓ v3.1 |
| Lazy load Recharts + TipTap | Largest client bundles (629KB combined) | ✓ v3.1 |
| React cache() for query dedup | Request-level caching without external deps | ✓ v3.1 |
| Composite indexes over single-column | Multi-filter dashboard queries need compound indexes | ✓ v3.1 |
| Multi-tenant via single DB + RLS | SaaS-typisch, einfacher zu betreiben als separate Instanzen | ✓ v4.0 |
| Branchenstandard-Hierarchie | Verwaltung→Mandat→Eigentümer→Liegenschaft→Gebäude→Einheit nach Fairwalter/Rimo | ✓ v4.0 |
| STWE-Felder vorbereiten, kein UI | Zukunftssicherheit für Schweizer Markt ohne Overhead jetzt | ✓ v4.0 |
| Auth-Umbau auf später | Fokus v4.0 auf Datenmodell, Auth kommt in separatem Milestone | ✓ v4.0 → v5.0 |
| set_config/current_setting for RLS | PIN auth has no JWT claims; transaction-local config works with PgBouncer | ✓ v4.0 |
| Denormalized org_id on 62 tables | Direct equality faster than subquery joins for RLS policies | ✓ v4.0 |
| Triggers for org_id sync | Automatic propagation through hierarchy, no compound PKs needed | ✓ v4.0 |
| Zero-downtime migration strategy | nullable → backfill → NOT NULL → RLS avoids locking | ✓ v4.0 |
| Org-prefixed storage paths | {org_id}/{property_id}/{building_id}/{entity_type}/{filename} | ✓ v4.0 |

---
*Last updated: 2026-02-19 — v5.0 Unified Auth & RBAC milestone started*
*Source: KEWA-RENOVATION-OPS-SPEC_v1 + Original v2.0 Scope*
