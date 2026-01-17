# Requirements: KEWA Liegenschafts-Aufgabenverwaltung

**Defined:** 2025-01-16
**Core Value:** KEWA AG hat jederzeit volle Transparenz darüber, welche Arbeiten Imeri erledigt hat — mit Fotobeweis und Zeitstempel.

## v1 Requirements

Requirements für Initial-Release. Jedes mappt auf Roadmap-Phasen.

### Authentifizierung

- [x] **AUTH-01**: User kann sich mit PIN anmelden (KEWA AG und Imeri haben separate PINs) ✓
- [x] **AUTH-02**: User sieht nur die Funktionen seiner Rolle (KEWA AG: Admin, Imeri: Handwerker) ✓
- [x] **AUTH-03**: User-Session bleibt nach Browser-Refresh aktiv (7-Tage Cookie) ✓

### Gebäudestruktur

- [x] **STRUC-01**: System bildet Hierarchie ab: Gebäude → Einheit → Projekt → Aufgabe ✓
- [x] **STRUC-02**: System enthält alle 13 Wohnungen (EG-Dach) und 9 Gemeinschaftsräume ✓
- [x] **STRUC-03**: KEWA AG kann Mieternamen pro Wohnung hinterlegen ✓
- [x] **STRUC-04**: KEWA AG sieht grafische Gebäudeansicht (4 Stockwerke + Dach visuell) ✓
- [x] **STRUC-05**: KEWA AG sieht Fortschrittsbalken pro Einheit (Farb-Kodierung nach Status) ✓

### Aufgaben

- [x] **TASK-01**: User kann Aufgaben erstellen, lesen, bearbeiten und löschen ✓
- [x] **TASK-02**: User kann Aufgabenstatus setzen (offen / erledigt) ✓
- [x] **TASK-03**: User kann Fälligkeitsdatum pro Aufgabe setzen ✓
- [x] **TASK-04**: User kann Priorität pro Aufgabe setzen ✓
- [x] **TASK-05**: KEWA AG kann wiederkehrende Aufgaben erstellen (wöchentlich/monatlich) ✓
- [x] **TASK-06**: Imeri kann Kurznotiz bei Erledigung hinzufügen ✓

### Fotos

- [x] **PHOTO-01**: KEWA AG kann bis zu 2 Bilder pro Aufgabe anhängen (Erklärung) ✓
- [x] **PHOTO-02**: Imeri kann bis zu 2 Fotos pro Aufgabe hochladen (Dokumentation Erledigung) ✓
- [x] **PHOTO-03**: User sieht Vorher/Nachher-Fotos nebeneinander ✓

### Sprachnotizen

- [x] **AUDIO-01**: KEWA AG kann Audio aufnehmen (max 1 Minute pro Aufnahme) ✓
- [x] **AUDIO-02**: KEWA AG's Audio wird automatisch transkribiert (Hochdeutsch → Text) ✓
- [x] **AUDIO-03**: Imeri kann Audio aufnehmen in Ausnahmefällen (nur Speicherung, keine Transkription) ✓
- [x] **AUDIO-04**: Imeri kann KEWA AG's Audio abspielen und Transkription lesen ✓

### Dashboards

- [x] **DASH-01**: KEWA AG sieht Übersicht aller Einheiten mit Status ✓
- [x] **DASH-02**: KEWA AG kann Projekte und Aufgaben erstellen und bearbeiten ✓
- [x] **DASH-03**: Imeri sieht Liste seiner offenen Aufgaben ✓
- [x] **DASH-04**: Imeri kann Aufgaben als erledigt markieren mit Foto-Upload ✓
- [x] **DASH-05**: KEWA AG kann Sichtbarkeit einstellen (Imeri sieht Projekte+Aufgaben oder nur Aufgaben) ✓
- [x] **DASH-06**: KEWA AG sieht Übersicht aller Audio-Dateien (inkl. Imeris Notfall-Audios) ✓
- [x] **DASH-07**: App ist mobile-optimiert (Touch-Targets ≥76dp für Baustellennutzung) ✓

### Berichte & Archivierung

- [x] **REPORT-01**: System generiert wöchentlichen Bericht (erledigte Arbeiten mit Fotos/Zeitstempel) ✓
- [x] **REPORT-02**: Erledigte Projekte werden archiviert nach Abschluss aller Aufgaben ✓

## v2 Requirements

Deferred für spätere Releases. Nicht in aktueller Roadmap.

### Benachrichtigungen

- **NOTIF-01**: Push-Benachrichtigungen bei neuen Aufgaben
- **NOTIF-02**: E-Mail-Benachrichtigungen

### Offline

- **OFFLINE-01**: Vollständiger Offline-Mode mit Sync

## Out of Scope

Explizit ausgeschlossen. Dokumentiert um Scope Creep zu vermeiden.

| Feature | Reason |
|---------|--------|
| Multi-User-Management | Nur 2 Nutzer (zwei PINs genügen) |
| Mehrere Gebäude | Nur diese eine Liegenschaft |
| Tenant-Portal | Mieter sind keine App-Nutzer |
| Zahlungen/Rechnungen | Nicht Teil dieser App |
| Komplexes Scheduling | Ein Handwerker, einfache Due Dates reichen |
| Analytics-Dashboards | Wöchentlicher Bericht genügt |
| Inventory-Management | Handwerker verwaltet Material selbst |
| Transkription für Imeri | Schweizerdeutsch zu fehlerhaft (15-30% WER) |

## Traceability

Welche Phasen decken welche Requirements ab.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete ✓ |
| AUTH-02 | Phase 1 | Complete ✓ |
| AUTH-03 | Phase 1 | Complete ✓ |
| STRUC-01 | Phase 1 | Complete ✓ |
| STRUC-02 | Phase 1 | Complete ✓ |
| STRUC-03 | Phase 5 | Complete ✓ |
| STRUC-04 | Phase 5 | Complete ✓ |
| STRUC-05 | Phase 5 | Complete ✓ |
| TASK-01 | Phase 2 | Complete ✓ |
| TASK-02 | Phase 2 | Complete ✓ |
| TASK-03 | Phase 2 | Complete ✓ |
| TASK-04 | Phase 2 | Complete ✓ |
| TASK-05 | Phase 6 | Complete ✓ |
| TASK-06 | Phase 2 | Complete ✓ |
| PHOTO-01 | Phase 3 | Complete ✓ |
| PHOTO-02 | Phase 3 | Complete ✓ |
| PHOTO-03 | Phase 3 | Complete ✓ |
| AUDIO-01 | Phase 4 | Complete ✓ |
| AUDIO-02 | Phase 4 | Complete ✓ |
| AUDIO-03 | Phase 4 | Complete ✓ |
| AUDIO-04 | Phase 4 | Complete ✓ |
| DASH-01 | Phase 2 | Complete ✓ |
| DASH-02 | Phase 2 | Complete ✓ |
| DASH-03 | Phase 2 | Complete ✓ |
| DASH-04 | Phase 3 | Complete ✓ |
| DASH-05 | Phase 5 | Complete ✓ |
| DASH-06 | Phase 4 | Complete ✓ |
| DASH-07 | Phase 1 | Complete ✓ |
| REPORT-01 | Phase 6 | Complete ✓ |
| REPORT-02 | Phase 6 | Complete ✓ |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2025-01-16*
*Last updated: 2026-01-16 after roadmap creation*
