# Requirements: KEWA Renovation Operations System

**Defined:** 2026-01-22
**Milestone:** v2.1 Master Data Management
**Core Value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen

## v2.1 Requirements

Requirements for v2.1 Master Data Management. Each maps to roadmap phases.

### Partner/Handwerker (PART)

- [ ] **PART-01**: Admin kann Partner-Liste mit allen Handwerkern anzeigen
- [ ] **PART-02**: Admin kann neuen Partner erstellen (Firma, Kontakt, Email, Gewerke)
- [ ] **PART-03**: Admin kann Partner-Daten bearbeiten
- [ ] **PART-04**: Admin kann Partner deaktivieren/aktivieren
- [ ] **PART-05**: Partner-Dropdown in WorkOrderForm zeigt verfuegbare Partner

### Liegenschaften (PROP)

- [ ] **PROP-01**: Admin kann Liegenschaft-Liste mit allen Properties anzeigen
- [ ] **PROP-02**: Admin kann neue Liegenschaft erstellen
- [ ] **PROP-03**: Admin kann Gebaeude zu Liegenschaft hinzufuegen
- [ ] **PROP-04**: Admin kann aktive Liegenschaft im Header wechseln
- [ ] **PROP-05**: Dashboard/Heatmap zeigt gewaehlte Liegenschaft

### Einheiten (UNIT)

- [ ] **UNIT-01**: Admin kann Wohnungen/Einheiten zu Gebaeude hinzufuegen
- [ ] **UNIT-02**: Admin kann Einheit-Details bearbeiten (Name, Etage, Mieter)
- [ ] **UNIT-03**: Admin kann Raeume zu Einheit hinzufuegen
- [ ] **UNIT-04**: Raeume werden fuer Condition-Tracking verwendet

### Templates (TMPL)

- [ ] **TMPL-01**: Admin kann Template-Liste mit allen Vorlagen anzeigen
- [ ] **TMPL-02**: Admin kann Template-Details ansehen (Phasen, Pakete, Tasks)
- [ ] **TMPL-03**: Admin kann neues Template erstellen
- [ ] **TMPL-04**: Admin kann Template bearbeiten (Phasen/Pakete/Tasks hinzufuegen)
- [ ] **TMPL-05**: Admin kann Template beim Projekt-Erstellen auswaehlen

### Admin-Dashboard (ADMN)

- [ ] **ADMN-01**: Uebersichts-Dashboard zeigt Zaehler (Liegenschaften, Partner, Projekte)
- [ ] **ADMN-02**: Quick-Actions fuer haeufige Admin-Tasks
- [ ] **ADMN-03**: Such-/Filterfunktion auf Partner- und Template-Listen

### Onboarding (SEED)

- [ ] **SEED-01**: Migrations 045, 046 sind committed und dokumentiert
- [ ] **SEED-02**: Demo-Daten-Script fuer Testzwecke
- [ ] **SEED-03**: Setup-Wizard beim ersten Login (Liegenschaft, Gebaeude, Partner)
- [ ] **SEED-04**: README mit Deployment-Anleitung

## Future Requirements (v2.2+)

Deferred to future releases. Tracked but not in current roadmap.

### Extended Features

- **EXT-15**: Automatic reminders (24h + 48h) — requires background job infrastructure
- **CHNG-01 to CHNG-03**: Change Orders
- **SUPP-01 to SUPP-04**: Lieferanten-Modul (Pellets)
- **INSP-01 to INSP-03**: Inspection/Abnahme Workflow
- **PUSH-01 to PUSH-05**: Push-Notifications
- **KNOW-01 to KNOW-04**: Knowledge Base

## Out of Scope

Explicitly excluded for v2.1.

| Feature | Reason |
|---------|--------|
| Tenant Portal | v3.0 scope — MVP focuses on admin/internal users |
| Offline Support | Complex PWA implementation deferred |
| External Integrations | Calendar/accounting integrations deferred |
| Template Import/Export | Nice-to-have, not critical for v2.1 |
| Bulk Partner Import | Single-entry sufficient for initial rollout |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PART-01 | Phase 13 | Pending |
| PART-02 | Phase 13 | Pending |
| PART-03 | Phase 13 | Pending |
| PART-04 | Phase 13 | Pending |
| PART-05 | Phase 13 | Pending |
| PROP-01 | Phase 14 | Pending |
| PROP-02 | Phase 14 | Pending |
| PROP-03 | Phase 14 | Pending |
| PROP-04 | Phase 14 | Pending |
| PROP-05 | Phase 14 | Pending |
| UNIT-01 | Phase 15 | Pending |
| UNIT-02 | Phase 15 | Pending |
| UNIT-03 | Phase 15 | Pending |
| UNIT-04 | Phase 15 | Pending |
| TMPL-01 | Phase 16 | Pending |
| TMPL-02 | Phase 16 | Pending |
| TMPL-03 | Phase 16 | Pending |
| TMPL-04 | Phase 16 | Pending |
| TMPL-05 | Phase 16 | Pending |
| ADMN-01 | Phase 17 | Pending |
| ADMN-02 | Phase 17 | Pending |
| ADMN-03 | Phase 17 | Pending |
| SEED-01 | Phase 17 | Pending |
| SEED-02 | Phase 17 | Pending |
| SEED-03 | Phase 17 | Pending |
| SEED-04 | Phase 17 | Pending |

**Coverage:**
- v2.1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after roadmap creation*
