# Roadmap: KEWA v2.0 Renovation Operations System

**Created:** 2026-01-18
**Milestone:** v2.0
**Requirements:** 127 total (86 MVP + 19 Phase 2 + 16 Phase 3 + 6 NFR)

---

## Overview

| Macro-Phase | Phases | Requirements | Focus |
|-------------|--------|--------------|-------|
| MVP (Phase 1) | 7-12.2 | 86 | Core system, external contractors, costs, dashboard |
| Extensions (Phase 2) | 13-15 | 19 | Change orders, suppliers, push, knowledge base |
| Advanced (Phase 3) | 16-18 | 16 | Tenant portal, offline, integrations |

---

## MVP Phases (Phase 1 Scope)

### Phase 7: Foundation & Data Model

**Goal:** Solides Fundament — Datenmodell, Rollen, Audit-Logging, Tech Debt bereinigt

**Requirements:**
- DEBT-01 to DEBT-04 (Tech Debt fixes)
- DATA-01 to DATA-15 (All entities)
- AUTH-01 to AUTH-09 (RBAC & multi-auth)
- STAT-01 to STAT-04 (Status workflows)
- NFR-01 to NFR-06 (Non-functional)

**Success Criteria:**
- [ ] Alle 15 Entities in Supabase migriert
- [ ] 5 Rollen mit korrekten Permissions
- [ ] PIN + Email + Magic-Link Auth parallel funktional
- [ ] Audit-Log schreibt alle Änderungen
- [ ] Tech Debt (Middleware, Turbopack, Session) behoben

**Requirements Count:** 38

---

### Phase 8: Template System

**Goal:** Wiederverwendbare Renovations-Vorlagen mit WBS-Struktur

**Requirements:**
- TMPL-01 to TMPL-06

**Success Criteria:**
- [x] Template-Library mit mind. 3 Vorlagen (Komplett, Bad, Küche)
- [x] WBS: Phasen → Pakete → Tasks mit Abhängigkeiten
- [x] Quality Gates definierbar mit Evidenz-Anforderungen
- [x] Template anwendbar auf neue Projekte

**Requirements Count:** 6
**Status:** ✓ Complete (2026-01-18)

---

### Phase 9: External Contractor Portal

**Goal:** Handwerker können Aufträge via Magic-Link annehmen/ablehnen

**Requirements:**
- EXT-01 to EXT-16

**Success Criteria:**
- [x] WorkOrder-Erstellung mit allen Pflichtfeldern
- [x] PDF-Generierung funktional
- [x] Email mit Magic-Link versendet (mailto)
- [x] Contractor-Portal: View, Accept, Reject, Price, Upload
- [x] Tracking: Viewed-Status, Erinnerungen, Deadline

**Requirements Count:** 16
**Status:** ✓ Complete (2026-01-18)
**Note:** EXT-15 (Automatic Reminders) deferred — requires background job infrastructure

---

### Phase 10: Cost & Finance

**Goal:** Vollständige Kostenübersicht: Offerten → Rechnungen → Zahlungen

**Requirements:**
- COST-01 to COST-06
- RENT-01 to RENT-03

**Success Criteria:**
- [x] Kosten-Workflow: Offer → Contract → Invoice → Payment
- [x] Manuelle Expenses erfassbar (Bar, Spesen)
- [x] Aggregation nach Projekt, Unit, Room, Partner
- [x] Varianz Offerte vs Rechnung sichtbar
- [x] CSV-Export für Buchhaltung
- [x] Mietzins pro Unit + Investment-Übersicht

**Requirements Count:** 9
**Status:** ✓ Complete (2026-01-18)

---

### Phase 11: History & Digital Twin

**Goal:** Automatische Zustandsverfolgung — Unit-Timeline und Raum-Condition

**Requirements:**
- HIST-01 to HIST-05

**Success Criteria:**
- [x] Unit-Timeline zeigt alle Projekte/WorkOrders/Kosten/Media
- [x] Renovations-Fortschritt pro Raum ableitbar
- [x] Automation: Projekt approved → Room Condition = new
- [x] Unit-Summary (% renoviert) berechnet sich automatisch

**Requirements Count:** 5
**Status:** ✓ Complete (2026-01-18)

---

### Phase 12: Dashboard & Visualization

**Goal:** Visuelle Übersicht — Heatmap, Parkplätze, Auslastung, Kommentare

**Requirements:**
- DASH-01 to DASH-06
- PARK-01 to PARK-05
- OCCU-01 to OCCU-04
- COMM-01 to COMM-03

**Success Criteria:**
- [x] Property-Level Dashboard mit Heatmap (Units × Rooms)
- [x] Drilldown: Property → Unit → Room → Project → Tasks
- [x] 8 Parkplätze vertikal neben Gebäude
- [x] Auslastung berechnet aus Wohnungen + Parkplätzen
- [x] Kommentare auf Tasks/WorkOrders mit Timestamps

**Requirements Count:** 18
**Status:** ✓ Complete (2026-01-18)

---

## MVP Gap Closure Phases

### Phase 12.1: Project Detail & Navigation

**Goal:** Enable navigation to project details and template application

**Gap Closure:**
- INT-01: No project detail page
- Flow 1: Create Project → Apply Template

**Success Criteria:**
- [ ] Project detail page at `/dashboard/projekte/[id]`
- [ ] "Vorlage anwenden" button links to apply-template page
- [ ] Project list cards navigate to detail page

**Scope:** Small (1 page + navigation links)

---

### Phase 12.2: Invoice Creation UI

**Goal:** Enable invoice creation from completed work orders

**Gap Closure:**
- INT-02: No invoice creation UI
- Flow 2: Work Order → Invoice

**Success Criteria:**
- [ ] InvoiceForm component with work order pre-fill
- [ ] "Neue Rechnung" page at `/dashboard/kosten/rechnungen/neu`
- [ ] "Rechnung erstellen" action from completed work orders

**Scope:** Small (1 form + 1 page + action button)

---

## Extension Phases (Phase 2 Scope)

### Phase 13: Change Orders & Suppliers

**Goal:** Nachträge und Lieferanten-Bestellungen (Pellets)

**Requirements:**
- CHNG-01 to CHNG-03
- SUPP-01 to SUPP-04

**Success Criteria:**
- [ ] Contractor kann Zusatzkosten anfragen
- [ ] KEWA kann genehmigen/ablehnen
- [ ] Supplier Purchase Order Flow vollständig
- [ ] Pellet-Bestellung generierbar

**Requirements Count:** 7

---

### Phase 14: Inspection & Push Notifications

**Goal:** Verbesserte Abnahme + Push-Benachrichtigungen

**Requirements:**
- INSP-01 to INSP-03
- PUSH-01 to PUSH-05

**Success Criteria:**
- [ ] Abnahme-Checklisten mit Protokoll
- [ ] Mängelliste mit Nachbesserungs-Workflow
- [ ] Push bei neuer Aufgabe/WorkOrder
- [ ] Push bei Contractor-Response
- [ ] PWA-basierte Push funktional

**Requirements Count:** 8

---

### Phase 15: Knowledge Base

**Goal:** Kuratierte FAQ für Vermieter/Mieter (CH-Recht)

**Requirements:**
- KNOW-01 to KNOW-04

**Success Criteria:**
- [ ] Knowledge Articles mit Kategorien
- [ ] Perspektiven: Vermieter / Mieter
- [ ] Kontextuelle Vorschläge in Projekt-Screens

**Requirements Count:** 4

---

## Advanced Phases (Phase 3 Scope)

### Phase 16: Tenant Portal

**Goal:** Mieter können Tickets erstellen, nur eigene Daten sehen

**Requirements:**
- TPRT-01 to TPRT-04

**Success Criteria:**
- [ ] Mieter-Login mit Email+Passwort
- [ ] Ticket-Erstellung mit Kategorien
- [ ] Strikte Datenisolation
- [ ] KEWA kann Ticket zu WorkOrder konvertieren

**Requirements Count:** 4

---

### Phase 17: Offline Support

**Goal:** Feldarbeit ohne Internet — Queue + Sync

**Requirements:**
- OFFL-01 to OFFL-05

**Success Criteria:**
- [ ] Aufgaben offline anzeigbar
- [ ] Offline als erledigt markieren
- [ ] Foto-Upload in Queue
- [ ] Automatische Synchronisierung bei Verbindung
- [ ] Sync-Status klar erkennbar

**Requirements Count:** 5

---

### Phase 18: Integrations & UX Polish

**Goal:** Externe Integrationen + finaler UX-Schliff

**Requirements:**
- INTG-01 to INTG-03
- UXIM-01 to UXIM-04

**Success Criteria:**
- [ ] Kalender-Integration
- [ ] Erweiterter Buchhaltungs-Export
- [ ] Mobile Navigation optimiert
- [ ] Foto-Galerie mit Vollbild

**Requirements Count:** 7

---

## Traceability Matrix

| Phase | Requirements | Count | Status |
|-------|--------------|-------|--------|
| 7 | DEBT-01-04, DATA-01-15, AUTH-01-09, STAT-01-04, NFR-01-06 | 38 | ✓ Complete |
| 8 | TMPL-01-06 | 6 | ✓ Complete |
| 9 | EXT-01-16 | 16 | ✓ Complete |
| 10 | COST-01-06, RENT-01-03 | 9 | ✓ Complete |
| 11 | HIST-01-05 | 5 | ✓ Complete |
| 12 | DASH-01-06, PARK-01-05, OCCU-01-04, COMM-01-03 | 18 | ✓ Complete |
| 12.1 | INT-01 (Gap closure) | - | Pending |
| 12.2 | INT-02 (Gap closure) | - | Pending |
| **MVP Total** | | **92** | |
| 13 | CHNG-01-03, SUPP-01-04 | 7 | Pending |
| 14 | INSP-01-03, PUSH-01-05 | 8 | Pending |
| 15 | KNOW-01-04 | 4 | Pending |
| **Phase 2 Total** | | **19** | |
| 16 | TPRT-01-04 | 4 | Pending |
| 17 | OFFL-01-05 | 5 | Pending |
| 18 | INTG-01-03, UXIM-01-04 | 7 | Pending |
| **Phase 3 Total** | | **16** | |
| **Grand Total** | | **127** | |

---

## Dependencies

```
Phase 7 (Foundation) ─┬─> Phase 8 (Templates)
                      ├─> Phase 9 (Contractors) ─> Phase 13 (Change Orders)
                      ├─> Phase 10 (Costs)
                      ├─> Phase 11 (History)
                      └─> Phase 12 (Dashboard)

Phase 8 ─> Phase 9 (Templates used in WorkOrders)
Phase 9 ─> Phase 10 (WorkOrders create Costs)
Phase 10 + 11 ─> Phase 12 (Dashboard needs data)

Phase 12 ─> Phase 12.1, 12.2 (Gap Closure)
Phase 12.2 (MVP Complete) ─> Phase 13, 14, 15 (Extensions)

Phase 14 (Push) ─> Phase 16 (Tenant Portal can use Push)
Phase 7 (Auth) ─> Phase 17 (Offline needs auth sync)
```

---

## Milestones

| Milestone | After Phase | Deliverable |
|-----------|-------------|-------------|
| **MVP** | 12.2 | Vollständiges Renovations-Management mit externen Handwerkern |
| **v2.1** | 15 | Change Orders, Lieferanten, Push, Knowledge Base |
| **v2.2** | 18 | Mieter-Portal, Offline-Support, Integrationen |

---
*Roadmap created: 2026-01-18*
*Source: REQUIREMENTS.md v2.0*
