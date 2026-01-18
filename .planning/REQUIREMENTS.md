# Requirements: KEWA v2.0 Renovation Operations System

**Defined:** 2026-01-18
**Source:** KEWA-RENOVATION-OPS-SPEC_v1_2026-01-18.md + Original v2.0 Scope
**Core Value:** KEWA AG hat volle Transparenz und Kontrolle über alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenübersicht und automatischer Zustandshistorie.

---

## Phase 1: MVP (Kern-System)

### Datenmodell & Infrastruktur

- [x] **DATA-01**: Property (Liegenschaft) Entity mit Basis-Attributen
- [x] **DATA-02**: Building Entity (optional, für Multi-Building Properties)
- [x] **DATA-03**: Unit (Wohnung) Entity mit Mietzins-Feld
- [x] **DATA-04**: Room (Raum/Zone) Entity mit Typ (Bad, Küche, etc.)
- [x] **DATA-05**: Component Entity (optional: Boden, Wände, Fenster, etc.)
- [x] **DATA-06**: RenovationProject Entity mit Status-Workflow
- [x] **DATA-07**: Task Entity mit Abhängigkeiten und Checklisten-Funktion
- [x] **DATA-08**: WorkOrder/Ticket Entity für externe Aufträge
- [x] **DATA-09**: Partner Entity (Handwerker/Lieferanten) mit Kategorien
- [x] **DATA-10**: Offer (Offerte) Entity
- [x] **DATA-11**: Invoice (Rechnung) Entity mit PDF-Speicherung
- [x] **DATA-12**: Expense (Spesen/Barzahlung) Entity
- [x] **DATA-13**: Payment Entity mit Methode (bar/Überweisung/etc.)
- [x] **DATA-14**: Media Entity (Fotos/Videos) mit vorher/nachher Metadaten
- [x] **DATA-15**: AuditLog Entity für alle Änderungen (Pflicht)

### RBAC & Authentifizierung

- [x] **AUTH-01**: Admin-Rolle (KEWA) mit Vollzugriff
- [x] **AUTH-02**: Property/Project Manager Rolle
- [x] **AUTH-03**: Accounting Rolle (Kosten/Rechnungen)
- [x] **AUTH-04**: Tenant Rolle (read-only auf eigene Inhalte)
- [x] **AUTH-05**: External Contractor Rolle (nur eigene Aufträge)
- [x] **AUTH-06**: Jede Änderung erzeugt AuditLog-Eintrag
- [x] **AUTH-07**: PIN-Auth für interne Nutzer (bestehend)
- [x] **AUTH-08**: Email+Passwort-Auth für Mieter
- [x] **AUTH-09**: Magic-Link-Auth für externe Handwerker

### Status-Workflows

- [x] **STAT-01**: WorkOrder Status: draft → sent → viewed → accepted/rejected → in_progress → done → inspected → closed
- [x] **STAT-02**: RenovationProject Status: planned → active → blocked → finished → approved
- [x] **STAT-03**: Room/Unit Condition: old | partial | new (ableitbar)
- [x] **STAT-04**: Condition-Tracking mit Datum, Quell-Projekt, Media-Referenzen

### Template-System

- [x] **TMPL-01**: Template-Library für Komplett-Renovationen
- [x] **TMPL-02**: Template-Library für Einzel-Raum-Renovationen (Bad, Küche, etc.)
- [x] **TMPL-03**: Templates enthalten Phasen → Pakete → Tasks (WBS)
- [x] **TMPL-04**: Task-Abhängigkeiten und geschätzte Dauer
- [x] **TMPL-05**: Quality Gates (Abnahme-Checkpoints) mit Evidenz-Anforderungen
- [x] **TMPL-06**: Mapping-Regeln: Abschluss triggert Raum/Unit Condition Update

### Externe Handwerker: Link-Portal

- [x] **EXT-01**: WorkOrder-Erstellung aus Projekt/Task mit Partner-Zuweisung
- [x] **EXT-02**: WorkOrder enthält: Scope, Location, Zeitfenster, Anhänge, Notizen
- [x] **EXT-03**: PDF-Generierung des WorkOrders
- [x] **EXT-04**: Email-Versand via lokalen Email-Client (mailto)
- [x] **EXT-05**: Magic-Link (Token) zur Web-Seite im Email
- [x] **EXT-06**: Contractor Web-Portal: Details + Anhänge anzeigen
- [x] **EXT-07**: Contractor: "Accept" / "Reject" Buttons
- [x] **EXT-08**: Contractor: Preisvorschlag (Betrag + Kommentar)
- [x] **EXT-09**: Contractor: Zeitfenster-Vorschlag
- [x] **EXT-10**: Contractor: Fragen/Kommentar-Feld
- [x] **EXT-11**: Contractor: Dokumente hochladen (Offerte/Rechnung)
- [x] **EXT-12**: Contractor: Fotos hochladen
- [x] **EXT-13**: Tracking: "Viewed" = Magic-Link geöffnet
- [x] **EXT-14**: Zeitgestempelte Events im Log
- [ ] **EXT-15**: Automatische Erinnerungen (24h + 48h) — DEFERRED (requires background jobs)
- [x] **EXT-16**: Annahme-Deadline (z.B. 72h)

### Historie & Digital Twin

- [x] **HIST-01**: Unit hat Timeline aller Projekte/WorkOrders/Kosten/Media
- [x] **HIST-02**: Unit-Übersicht zeigt Renovations-Fortschritt pro Raum
- [x] **HIST-03**: Raum-Condition wird aus abgeschlossenen Projekten abgeleitet
- [x] **HIST-04**: Automation: Projekt approved → Raum=new mit Datum+Media+Projekt-ID
- [x] **HIST-05**: Unit-Summary wird automatisch berechnet (% renoviert)

### Kostenmodell

- [x] **COST-01**: Workflow: Offer → WorkOrder/Contract → Invoice → Payment
- [x] **COST-02**: Manuelle Expense-Einträge (Barzahlungen, Spesen)
- [x] **COST-03**: Kosten-Aggregation nach: Projekt, Unit, Room, Trade, Partner
- [x] **COST-04**: Varianz: Offerte vs Rechnung
- [x] **COST-05**: Anhänge für Rechnungs-PDFs und Belege
- [x] **COST-06**: CSV-Export für Buchhaltung

### Mietzins

- [x] **RENT-01**: Mietzins pro Unit speicherbar
- [x] **RENT-02**: Dashboard zeigt: Miete vs Renovationskosten
- [x] **RENT-03**: Investment-Übersicht pro Unit

### Dashboard & Visualisierung

- [ ] **DASH-01**: Property-Level Übersicht
- [ ] **DASH-02**: Units Matrix/Heatmap: Units × Rooms mit Status-Farben
- [ ] **DASH-03**: Renovations-Fortschritt % pro Unit
- [ ] **DASH-04**: Timeline pro Unit (abgeschlossene Projekte)
- [ ] **DASH-05**: Kosten pro Unit/Projekt mit Filtern (Zeit, Partner, Trade)
- [ ] **DASH-06**: Drilldown: Property → Unit → Room → Project → Tasks/WorkOrders → Media/Kosten

### Parkplätze (Original v2.0)

- [ ] **PARK-01**: 8 Parkplätze werden rechts neben dem Gebäude vertikal angezeigt
- [ ] **PARK-02**: Parkplätze haben die gleiche Höhe wie das Gebäude (EG bis Dach)
- [ ] **PARK-03**: Jeder Parkplatz hat Status: frei / belegt / reparatur
- [ ] **PARK-04**: KEWA AG kann Parkplatz-Status ändern
- [ ] **PARK-05**: Parkplatz-Belegung beeinflusst Gesamtauslastung

### Auslastung (Original v2.0)

- [ ] **OCCU-01**: Auslastungs-Dashboard mit Gesamtauslastung
- [ ] **OCCU-02**: Leerstehende Wohnungen reduzieren Auslastung
- [ ] **OCCU-03**: Unbelegte Parkplätze reduzieren Auslastung
- [ ] **OCCU-04**: Auslastung als Prozent und visuell (Balken)

### Task-Kommentare (Original v2.0)

- [ ] **COMM-01**: Kommentare zu Tasks/WorkOrders schreiben
- [ ] **COMM-02**: Chronologische Anzeige mit Autor und Zeitstempel
- [ ] **COMM-03**: Interne Notizen (nur KEWA) vs externe Kommunikation

### Tech Debt (Original v2.0)

- [x] **DEBT-01**: Next.js Middleware-Warning behoben (Proxy-Pattern)
- [x] **DEBT-02**: Turbopack Build stabil (keine Race-Conditions)
- [x] **DEBT-03**: Session-Fetching-Pattern vereinheitlicht
- [x] **DEBT-04**: Phase 03 VERIFICATION.md erstellt

---

## Phase 2: Erweiterungen

### Change Orders

- [ ] **CHNG-01**: Contractor kann Zusatzkosten anfragen
- [ ] **CHNG-02**: KEWA kann Zusatzkosten genehmigen/ablehnen
- [ ] **CHNG-03**: Change Order History im Projekt

### Lieferanten-Modul (Pellets)

- [ ] **SUPP-01**: Supplier Partner-Typ
- [ ] **SUPP-02**: Purchase Order Flow: ordered → confirmed → delivered → invoiced → paid
- [ ] **SUPP-03**: Lieferanten-Stammdaten in Partner
- [ ] **SUPP-04**: Bestellung direkt an Pellet-Lieferant generieren

### Inspection/Abnahme Workflow

- [ ] **INSP-01**: Verbesserte Abnahme-Checklisten
- [ ] **INSP-02**: Abnahme-Protokoll mit Unterschrift
- [ ] **INSP-03**: Mängelliste mit Nachbesserungs-Workflow

### Push-Notifications (Original v2.0)

- [ ] **PUSH-01**: Push bei neuer Aufgabe/WorkOrder
- [ ] **PUSH-02**: Push bei Fälligkeitserinnerung
- [ ] **PUSH-03**: Push bei Contractor-Response
- [ ] **PUSH-04**: PWA-basierte Push-Notifications
- [ ] **PUSH-05**: Push an/ausschaltbar pro User

### Wissensdatenbank (Optional)

- [ ] **KNOW-01**: Knowledge Articles mit Kategorien
- [ ] **KNOW-02**: Perspektiven: Vermieter / Mieter
- [ ] **KNOW-03**: Kuratierte FAQ mit Quellen-Links
- [ ] **KNOW-04**: Kontextuelle Vorschläge in Projekt-Screens

---

## Phase 3: Fortgeschritten

### Mieter-Portal

- [ ] **TPRT-01**: Mieter können eigene Tickets erstellen
- [ ] **TPRT-02**: Ticket-Kategorien: Reparatur, Beschwerde, Anfrage
- [ ] **TPRT-03**: Mieter sehen nur eigene Daten
- [ ] **TPRT-04**: KEWA kann Ticket zu WorkOrder konvertieren

### Offline-Support (Original v2.0)

- [ ] **OFFL-01**: Offline-Anzeige von Aufgaben
- [ ] **OFFL-02**: Offline als erledigt markieren
- [ ] **OFFL-03**: Offline Foto-Upload (Queue)
- [ ] **OFFL-04**: Automatische Synchronisierung
- [ ] **OFFL-05**: Sync-Status klar erkennbar

### Integrationen

- [ ] **INTG-01**: Kalender-Integration
- [ ] **INTG-02**: Buchhaltungs-Export erweitert
- [ ] **INTG-03**: Document Store Integration

### UX-Verbesserungen (Original v2.0)

- [ ] **UXIM-01**: Mobile Navigation optimiert
- [ ] **UXIM-02**: Foto-Upload mit Fortschrittsanzeige
- [ ] **UXIM-03**: Foto-Galerie mit Vollbild-Ansicht
- [ ] **UXIM-04**: Dashboard-Filter und Sortierung

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Zahlungsabwicklung/Online-Payment | Nicht Teil dieser App, CSV-Export für Buchhaltung |
| Transkription für Dialekt | Schweizerdeutsch zu unzuverlässig |
| Native Mobile App | PWA-Ansatz bevorzugt |
| Vollautomatische Ticket→WorkOrder | KEWA entscheidet manuell |
| Rechtliche Beratung | Knowledge Base nur als FAQ, keine Rechtsberatung |

---

## Non-Functional Requirements

- [x] **NFR-01**: Audit-Logging für alle Schreiboperationen
- [x] **NFR-02**: Schweizer Kontext: Datenschutz, Datentrennung Mieter/Intern
- [x] **NFR-03**: Konfigurierbare Retention-Policy
- [x] **NFR-04**: File Storage für PDFs und Fotos
- [x] **NFR-05**: Token-basierter sicherer externer Zugriff (Magic Link, ablaufend)
- [x] **NFR-06**: Mobile-friendly Contractor Page

---

## Requirements Summary

| Phase | Category | Count |
|-------|----------|-------|
| 1 | Data Model | 15 |
| 1 | Auth/RBAC | 9 |
| 1 | Status Workflows | 4 |
| 1 | Templates | 6 |
| 1 | External Portal | 16 |
| 1 | History/Digital Twin | 5 |
| 1 | Cost Model | 6 |
| 1 | Rent | 3 |
| 1 | Dashboard | 6 |
| 1 | Parking | 5 |
| 1 | Occupancy | 4 |
| 1 | Comments | 3 |
| 1 | Tech Debt | 4 |
| **Phase 1 Total** | | **86** |
| 2 | Change Orders | 3 |
| 2 | Supplier Module | 4 |
| 2 | Inspection | 3 |
| 2 | Push Notifications | 5 |
| 2 | Knowledge Base | 4 |
| **Phase 2 Total** | | **19** |
| 3 | Tenant Portal | 4 |
| 3 | Offline Support | 5 |
| 3 | Integrations | 3 |
| 3 | UX Improvements | 4 |
| **Phase 3 Total** | | **16** |
| - | Non-Functional | 6 |
| **Grand Total** | | **127** |

---
*Requirements defined: 2026-01-18*
*Source: KEWA-RENOVATION-OPS-SPEC_v1 + Original v2.0 Scope*
