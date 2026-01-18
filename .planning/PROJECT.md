# KEWA Renovation Operations System

## What This Is

Eine umfassende Web-App für KEWA AG zur Planung, Ausführung und Kontrolle von Renovationen. Standardisierte Projektvorlagen, externe Handwerker via Magic-Link Portal, automatische Historie pro Wohnung/Raum, vollständige Kostenübersicht, und starke Visualisierung. Aufbauend auf dem v1 Task-Management-System.

## Core Value

KEWA AG hat volle Transparenz und Kontrolle über alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenübersicht und automatischer Zustandshistorie.

## Current Milestone: v2.0 Renovation Operations

**Goal:** Transformation von einfacher Task-App zu vollständigem Renovations-Management-System

**Scope:** 127 Requirements in 12 Phasen (7-18)

**Key Features:**
- Multi-Role RBAC (Admin, Manager, Accounting, Tenant, Contractor)
- Externe Handwerker via Magic-Link Portal mit PDF-Aufträgen
- Template-System für Renovationen (WBS mit Abhängigkeiten)
- Vollständige Kostenübersicht (Offerten → Rechnungen → Zahlungen)
- "Digital Twin" — automatische Zustandsableitung pro Raum/Wohnung
- Dashboard mit Heatmap, Timeline, Kosten-Aggregation
- Parkplätze + Auslastungs-Tracking
- Mieter-Tickets (Phase 3)
- Offline-Support (Phase 3)
- Push-Notifications (Phase 2)

**Source:** KEWA-RENOVATION-OPS-SPEC_v1_2026-01-18.md + Original v2.0 Scope

## Current State (v1 Shipped)

**Tech Stack:** Next.js 16 + React 19 + Supabase + Tailwind CSS 4
**Codebase:** 12,116 LOC TypeScript, 117 files
**Status:** Ready for production deployment

## Requirements

### Validated (v1)

**Authentifizierung:**
- ✓ PIN-basierte Anmeldung (KEWA AG + Imeri) — v1
- ✓ Unterschiedliche Berechtigungen je nach Rolle — v1
- ✓ 7-Tage Session-Persistenz mit httpOnly Cookie — v1

**Gebäudestruktur:**
- ✓ Grafische Gebäudeansicht (4 Stockwerke + Dach) — v1
- ✓ 13 Wohnungen + 9 Gemeinschaftsräume — v1
- ✓ Mieternamen + Sichtbarkeitseinstellung — v1
- ✓ Farbkodierte Fortschrittsbalken — v1

**Aufgaben:**
- ✓ Task-CRUD mit Priorität, Fälligkeit, Status — v1
- ✓ Foto-Upload (vorher/nachher) — v1
- ✓ Wiederkehrende Aufgaben — v1
- ✓ Sprachnotizen mit Transkription (KEWA AG) — v1

**Dashboards & Berichte:**
- ✓ KEWA AG + Imeri Dashboards — v1
- ✓ Wöchentliche Berichte — v1
- ✓ Projekt-Archivierung — v1

### Active (v2.0)

See `.planning/REQUIREMENTS.md` for full 127 requirements across 3 phases:

**Phase 1 MVP (86 req):**
- Datenmodell (15): Property, Building, Unit, Room, Project, Task, WorkOrder, Partner, Offer, Invoice, Expense, Payment, Media, AuditLog
- RBAC (9): 5 Rollen + 3 Auth-Methoden + Audit
- Templates (6): WBS mit Phasen, Paketen, Tasks, Quality Gates
- External Portal (16): Magic-Link, PDF, Accept/Reject, Tracking
- Cost Model (9): Offer → Invoice → Payment + Expenses + CSV Export
- History (5): Digital Twin, automatische Condition Updates
- Dashboard (18): Heatmap, Drilldown, Parkplätze, Auslastung, Kommentare
- Tech Debt (4): Middleware, Turbopack, Session, Docs

**Phase 2 Extensions (19 req):**
- Change Orders, Lieferanten-Modul, Inspection, Push, Knowledge Base

**Phase 3 Advanced (16 req):**
- Tenant Portal, Offline Support, Integrationen, UX Polish

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
- 13 Wohnungen über 5 Ebenen
- 9 Gemeinschaftsräume
- 8 Parkplätze
- Räume mit Condition-Tracking (old/partial/new)

## Constraints

- **Tech Stack**: Next.js 16 + Supabase + Vercel
- **Auth**: PIN (intern) + Email (Mieter) + Magic-Link (Contractors)
- **Audit**: Alle Änderungen geloggt
- **Schweizer Kontext**: Datenschutz, Datentrennung
- **External Access**: Token-basiert, ablaufend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PIN statt Login (intern) | Zwei interne Nutzer, maximale Einfachheit | ✓ v1 |
| Supabase für Backend | Datenbank + Storage + Auth in einem | ✓ v1 |
| Next.js 16 + Vercel | Moderne Stack, einfaches Deployment | ✓ v1 |
| Magic-Link für Contractors | Kein Login nötig, sicher, trackbar | — v2.0 |
| Template-System (WBS) | Standardisierte Renovationen, weniger Fehler | — v2.0 |
| Digital Twin (Condition) | Automatische Historie, keine manuelle Pflege | — v2.0 |
| Kosten-Workflow | Offer → Invoice → Payment = Buchhaltungsrealität | — v2.0 |
| Mieter-Portal in Phase 3 | MVP-Fokus auf Renovation, Mieter später | — v2.0 |

---
*Last updated: 2026-01-18 after v2.0 milestone definition*
*Source: KEWA-RENOVATION-OPS-SPEC_v1 + Original v2.0 Scope*
