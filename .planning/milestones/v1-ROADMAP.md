# Milestone v1: MVP

**Status:** ✅ SHIPPED 2026-01-17
**Phases:** 1-6
**Total Plans:** 17

## Overview

Von Null zur vollständigen Task-Management-App für KEWA AG und Handwerker Imeri. Zuerst die Basis (Auth + Datenstruktur), dann der Core Loop (Tasks erstellen und erledigen), gefolgt von Foto-Dokumentation (der Kernwert), Sprachnotizen, grafischer Gebäudeansicht, und schliesslich Berichte und Archivierung.

## Phases

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

Plans:
- [x] 01-01: Supabase Setup + Schema ✓
- [x] 01-02: PIN Auth + Sessions ✓
- [x] 01-03: Base Layout + Mobile Components ✓

**Completed:** 2026-01-16

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

Plans:
- [x] 02-01: Task CRUD API + Database ✓
- [x] 02-02: KEWA Dashboard ✓
- [x] 02-03: Imeri Dashboard ✓

**Completed:** 2026-01-16

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

Plans:
- [x] 03-01: Storage Setup + Upload API ✓
- [x] 03-02: Photo UI Components ✓

**Completed:** 2026-01-17

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

Plans:
- [x] 04-01: Audio Recording + Storage ✓
- [x] 04-02: Speech-to-Text Integration ✓
- [x] 04-03: Audio Player + Gallery ✓

**Completed:** 2026-01-17

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

Plans:
- [x] 05-01: Unit Detail API ✓
- [x] 05-02: Building Grid Components ✓
- [x] 05-03: Building Page + Modal ✓

**Completed:** 2026-01-17

### Phase 6: Reports & Advanced

**Goal**: Wöchentliche Berichte, wiederkehrende Aufgaben, Archivierung
**Depends on**: Phase 3, Phase 4
**Requirements**: TASK-05, TASK-06, REPORT-01, REPORT-02
**Success Criteria** (what must be TRUE):
  1. KEWA AG kann wiederkehrende Aufgaben erstellen (wöchentlich/monatlich)
  2. Imeri kann Kurznotiz bei Erledigung hinzufügen
  3. System generiert wöchentlichen Bericht mit Fotos und Zeitstempeln
  4. Abgeschlossene Projekte werden archiviert

Plans:
- [x] 06-01: Recurring Tasks ✓
- [x] 06-02: Weekly Report Generator ✓
- [x] 06-03: Archiving System ✓

**Completed:** 2026-01-17

---

## Milestone Summary

**Key Decisions:**

- Next.js 16 (latest) instead of 15 — create-next-app installed latest version
- jose for JWT (not jsonwebtoken) — Edge runtime compatible
- 7-day session cookies — Balance between security and convenience
- 48px touch targets — Mobile-first for construction site usage
- Bottom navigation pattern — Native mobile, more accessible than hamburger
- Canvas API for image compression — No external dependencies, 720px WebP
- OpenAI Whisper for German transcription — Best Hochdeutsch support
- Fire-and-forget pattern for async tasks — Non-blocking transcription and recurring

**Issues Resolved:**

- Next.js middleware Edge runtime compatibility (jose instead of bcrypt)
- Supabase nested select type casting
- Action bar positioning above MobileNav
- Photo duplicate display in task detail

**Issues Deferred:**

- Push notifications — v1.1+
- Offline mode with sync — v1.1+
- Multiple workers support — out of scope

**Technical Debt Incurred:**

- Phase 03 missing formal VERIFICATION.md (functionality verified via E2E flows)
- Inconsistent session fetching pattern (some pages use fetch instead of useSession hook)

---

*For current project status, see .planning/PROJECT.md*
