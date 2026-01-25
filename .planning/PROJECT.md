# KEWA Renovation Operations System

## What This Is

Ein umfassendes Renovations-Management-System für KEWA AG. Standardisierte Projektvorlagen (WBS), externes Handwerker-Portal via Magic-Link, vollständige Kostenübersicht mit Offerten→Rechnungen→Zahlungen, automatische Zustandshistorie ("Digital Twin") pro Raum/Wohnung, Property-Dashboard mit Heatmap-Visualisierung, und komplette Stammdaten-Verwaltung für Partner, Liegenschaften und Templates.

## Core Value

KEWA AG hat volle Transparenz und Kontrolle über alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenübersicht und automatischer Zustandshistorie.

## Current State (v2.1 Shipped)

**Tech Stack:** Next.js 16 + React 19 + Supabase + Tailwind CSS 4
**Codebase:** ~75,000 LOC TypeScript, ~530 files
**Status:** v2.1 Master Data Management shipped

**Shipped Features (v2.1):**
- Partner/Contractor Master Data with trade categories and WorkOrder integration
- Multi-Property Management with BuildingContext for cross-app filtering
- Unit & Room CRUD with tenant data and condition tracking
- Template UI with create/edit, drag-drop reordering, and project creation flow
- Admin Dashboard with counters, quick actions, and search/filter
- Setup Wizard for first-time onboarding
- Demo data seed script and deployment README

**Previous Milestones:**
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

### Active (v2.2+)

**Phase 2 Extensions (19 req):**
- [ ] CHNG-01 to CHNG-03: Change Orders
- [ ] SUPP-01 to SUPP-04: Lieferanten-Modul (Pellets)
- [ ] INSP-01 to INSP-03: Inspection/Abnahme Workflow
- [ ] PUSH-01 to PUSH-05: Push-Notifications
- [ ] KNOW-01 to KNOW-04: Knowledge Base

**Phase 3 Advanced (16 req):**
- [ ] TPRT-01 to TPRT-04: Tenant Portal
- [ ] OFFL-01 to OFFL-05: Offline Support
- [ ] INTG-01 to INTG-03: Integrationen (Kalender, Buchhaltung)
- [ ] UXIM-01 to UXIM-04: UX-Verbesserungen

### Deferred

- **EXT-15:** Automatic reminders (24h + 48h) — requires background job infrastructure (cron/queue)

### Out of Scope

- Online-Payment — CSV-Export für Buchhaltung reicht
- Native Mobile App — PWA-Ansatz bevorzugt
- Schweizerdeutsch-Transkription — zu unzuverlässig
- Vollautomatische Ticket→WorkOrder — KEWA entscheidet manuell
- Rechtliche Beratung — Knowledge Base nur als FAQ

## Context

**Nutzer:**
- KEWA AG (Admin): Eigentümerin, verwaltet alles
- Property/Project Manager: Erstellt Projekte, koordiniert Handwerker
- Accounting: Kosten, Rechnungen, Zahlungen
- Externe Handwerker: Empfangen Aufträge via Magic-Link
- Mieter (Phase 3): Können Tickets erstellen

**Nutzungskontext:**
- KEWA AG: Desktop + Mobile
- Handwerker: Mobile-first, oft auf Baustelle
- Externe Contractors: Minimales Portal, kein Login nötig
- Mieter: Mobile-first, von zuhause

**Gebäude:**
- Multi-Property Support (expandable)
- Units with tenant data and vacancy tracking
- Rooms with Condition-Tracking (old/partial/new)

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
| Mieter-Portal in Phase 3 | MVP-Fokus auf Renovation, Mieter später | — Planned |

---
*Last updated: 2026-01-25 after v2.1 milestone complete*
*Source: KEWA-RENOVATION-OPS-SPEC_v1 + Original v2.0 Scope*
