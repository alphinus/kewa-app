# Renovation Operations Platform

## What This Is

Eine mandantenfähige Immobilienverwaltungs- und Renovations-Plattform. Branchenstandard-Hierarchie (Verwaltung → Mandat → Eigentümer → Liegenschaft → Gebäude → Einheit → Mietverhältnis), standardisierte Projektvorlagen (WBS), externes Handwerker-Portal via Magic-Link, vollständige Kostenübersicht mit Offerten→Rechnungen→Zahlungen, automatische Zustandshistorie ("Digital Twin") pro Raum/Wohnung, Property-Dashboard mit Heatmap-Visualisierung, Stammdaten-Verwaltung für Partner und Templates, Mieter-Portal mit Ticket-System, und PWA mit Offline-Sync. KEWA AG ist der initiale Mandant.

## Core Value

Immobilienverwaltungen haben volle Transparenz und Kontrolle über alle Renovationen — mit standardisierten Workflows, mandantenfähiger Datentrennung, externer Handwerker-Integration, Kostenübersicht und automatischer Zustandshistorie.

## Current Milestone: v4.0 Multi-Tenant Data Model & Navigation

**Goal:** Branchenstandard-Datenmodell mit mandantenfähiger Architektur, sauberer Liegenschaft→Gebäude-Hierarchie und redesignter Navigation.

**Target features:**
- Mandantenfähiges Datenmodell: Organizations, Owners, Mandates, Tenancies
- Saubere Property→Building-Hierarchie mit konsistenter Terminologie
- Supabase RLS für Mandanten-Isolation
- STWE-Vorbereitung (Wertquote, Eigentumsperiode als Felder)
- Navigation-Redesign: Footer vereinfacht, klares Drill-down
- Terminologie-Bereinigung im gesamten Code
- KEWA AG als Seed-Mandant migriert

## Current State (v3.1 Shipped)

**Tech Stack:** Next.js 16.1.6 + React 19 + Supabase + Tailwind CSS 4
**Codebase:** ~110,000+ LOC TypeScript, ~750+ files
**Status:** v3.1 Production Hardening shipped, deployed to Vercel production

**Shipped Features (v3.1):**
- Security hardened: 3 CVEs patched, CSP + security headers, Upstash rate limiting on 13 auth endpoints, error boundaries
- Performance optimized: 629KB bundle reduction via lazy loading, 18.7% LCP improvement, composite DB indexes, N+1 elimination
- German text corrected: 664 umlaut replacements across 198 files, UTF-8 infrastructure, database migration

**Previous Milestones:**
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

### Active

**v4.0 — Multi-Tenant Data Model & Navigation:**
- [ ] Mandantenfähiges Datenmodell (Organizations, Owners, Mandates, Tenancies)
- [ ] Property→Building-Hierarchie sauber getrennt
- [ ] Supabase RLS auf allen Tabellen
- [ ] STWE-Felder vorbereitet (Wertquote, Eigentumsperiode)
- [ ] Navigation-Redesign mit Drill-down
- [ ] Terminologie-Bereinigung (Liegenschaft ≠ Gebäude)
- [ ] KEWA AG als Seed-Mandant migriert

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

## Constraints

- **Tech Stack**: Next.js 16 + Supabase + Vercel
- **Auth**: PIN (intern) + Email (Mieter) + Magic-Link (Contractors)
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
| Multi-tenant via single DB + RLS | SaaS-typisch, einfacher zu betreiben als separate Instanzen | — v4.0 |
| Branchenstandard-Hierarchie | Verwaltung→Mandat→Eigentümer→Liegenschaft→Gebäude→Einheit nach Fairwalter/Rimo | — v4.0 |
| STWE-Felder vorbereiten, kein UI | Zukunftssicherheit für Schweizer Markt ohne Overhead jetzt | — v4.0 |
| Auth-Umbau auf später | Fokus v4.0 auf Datenmodell, Auth kommt in separatem Milestone | — v4.0 |

---
*Last updated: 2026-02-17 — v4.0 Multi-Tenant Data Model milestone started*
*Source: KEWA-RENOVATION-OPS-SPEC_v1 + Original v2.0 Scope*
