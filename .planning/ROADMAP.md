# Roadmap: KEWA Liegenschafts-Aufgabenverwaltung

## Overview

Von Null zur vollständigen Task-Management-App für KEWA AG und Handwerker Imeri. Zuerst die Basis (Auth + Datenstruktur), dann der Core Loop (Tasks erstellen und erledigen), gefolgt von Foto-Dokumentation (der Kernwert), Sprachnotizen, grafischer Gebäudeansicht, und schliesslich Berichte und Archivierung.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - Auth, Datenstruktur, Mobile-First Basis ✓
- [x] **Phase 2: Task Management** - Aufgaben-CRUD, Dashboards, Kernfunktionalität ✓
- [ ] **Phase 3: Photo Documentation** - Fotobeweis für erledigte Arbeiten
- [ ] **Phase 4: Voice Notes** - Sprachnotizen mit Transkription für KEWA AG
- [ ] **Phase 5: Building Visualization** - Grafische Gebäudeansicht, Fortschrittsbalken
- [ ] **Phase 6: Reports & Advanced** - Wöchentliche Berichte, wiederkehrende Aufgaben

## Phase Details

### Phase 1: Foundation
**Goal**: Arbeitsfähige Basis — Authentifizierung, Datenbank-Schema, Mobile-First UI
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, STRUC-01, STRUC-02, DASH-07
**Success Criteria** (what must be TRUE):
  1. User kann sich mit korrektem PIN anmelden (KEWA oder Imeri)
  2. User sieht nur die Funktionen seiner Rolle
  3. Session bleibt nach Browser-Refresh aktiv (7-Tage Cookie)
  4. Datenbank bildet Gebäude → Einheit → Projekt → Aufgabe ab
  5. App ist touch-optimiert (76dp Targets)
**Research**: Unlikely (Supabase + Next.js established patterns)
**Plans**: TBD

Plans:
- [x] 01-01: Supabase Setup + Schema ✓
- [x] 01-02: PIN Auth + Sessions ✓
- [x] 01-03: Base Layout + Mobile Components ✓

### Phase 2: Task Management
**Goal**: Kernfunktionalität — KEWA erstellt Tasks, Imeri erledigt sie
**Depends on**: Phase 1
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. KEWA AG kann Aufgaben erstellen, bearbeiten, löschen
  2. KEWA AG sieht Übersicht aller Einheiten mit Status
  3. Imeri sieht Liste seiner offenen Aufgaben
  4. Imeri kann Aufgabe als erledigt markieren
  5. Aufgaben haben Titel, Beschreibung, Fälligkeit, Priorität
**Research**: Unlikely (standard CRUD patterns)
**Plans**: TBD

Plans:
- [x] 02-01: Task CRUD API + Database ✓
- [x] 02-02: KEWA Dashboard ✓
- [x] 02-03: Imeri Dashboard ✓

### Phase 3: Photo Documentation
**Goal**: Fotobeweis für erledigte Arbeiten — der Kernwert der App
**Depends on**: Phase 2
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03
**Success Criteria** (what must be TRUE):
  1. KEWA AG kann bis zu 2 Erklärungsfotos pro Aufgabe anhängen
  2. Imeri kann bis zu 2 Erledigungsfotos pro Aufgabe hochladen
  3. Fotos werden komprimiert vor Upload (720px, WebP)
  4. Before/After-Fotos werden nebeneinander angezeigt
  5. Upload funktioniert auch bei schlechtem Netz (Retry-Logic)
**Research**: Likely (image compression libraries)
**Research topics**: Browser-seitige Bildkompression mit Next.js 15, WebP Conversion, Supabase Storage Policies
**Plans**: TBD

Plans:
- [ ] 03-01: Storage Setup + Upload API
- [ ] 03-02: Photo UI Components

### Phase 4: Voice Notes
**Goal**: Spracheingabe für KEWA AG, Audio-Wiedergabe für Imeri
**Depends on**: Phase 2
**Requirements**: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, DASH-06
**Success Criteria** (what must be TRUE):
  1. KEWA AG kann Audio aufnehmen (max 1 Min)
  2. KEWA AG's Audio wird automatisch transkribiert (Hochdeutsch)
  3. Imeri kann KEWA's Audio abspielen und Transkription lesen
  4. Imeri kann Notfall-Audio aufnehmen (nur Speicherung, keine Transkription)
  5. KEWA AG sieht Übersicht aller Audio-Dateien
**Research**: Likely (Speech-to-Text API)
**Research topics**: Deepgram Nova-3 vs OpenAI Whisper API, MediaRecorder API Kompatibilität, Audio-Formate (WebM vs MP3)
**Plans**: TBD

Plans:
- [ ] 04-01: Audio Recording + Storage
- [ ] 04-02: Speech-to-Text Integration
- [ ] 04-03: Audio Player + Gallery

### Phase 5: Building Visualization
**Goal**: Grafische Gebäudeansicht mit Fortschrittsanzeige
**Depends on**: Phase 2
**Requirements**: STRUC-03, STRUC-04, STRUC-05, DASH-05
**Success Criteria** (what must be TRUE):
  1. KEWA AG sieht grafische Gebäudeansicht (4 Stockwerke + Dach)
  2. Wohnungen zeigen Fortschrittsbalken (Farb-Kodierung)
  3. KEWA AG kann Mieternamen pro Wohnung hinterlegen
  4. KEWA AG kann Sichtbarkeit für Imeri einstellen
  5. Klick auf Einheit führt zur Detail-Ansicht
**Research**: Unlikely (CSS Grid patterns)
**Plans**: TBD

Plans:
- [ ] 05-01: Building Grid Component
- [ ] 05-02: Progress + Tenant UI

### Phase 6: Reports & Advanced
**Goal**: Wöchentliche Berichte, wiederkehrende Aufgaben, Archivierung
**Depends on**: Phase 3, Phase 4
**Requirements**: TASK-05, TASK-06, REPORT-01, REPORT-02
**Success Criteria** (what must be TRUE):
  1. KEWA AG kann wiederkehrende Aufgaben erstellen (wöchentlich/monatlich)
  2. Imeri kann Kurznotiz bei Erledigung hinzufügen
  3. System generiert wöchentlichen Bericht mit Fotos und Zeitstempeln
  4. Abgeschlossene Projekte werden archiviert
**Research**: Unlikely (report generation patterns)
**Plans**: TBD

Plans:
- [ ] 06-01: Recurring Tasks
- [ ] 06-02: Weekly Report Generator
- [ ] 06-03: Archiving System

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✓ Complete | 2026-01-16 |
| 2. Task Management | 3/3 | ✓ Complete | 2026-01-16 |
| 3. Photo Documentation | 0/2 | Not started | - |
| 4. Voice Notes | 0/3 | Not started | - |
| 5. Building Visualization | 0/2 | Not started | - |
| 6. Reports & Advanced | 0/3 | Not started | - |
