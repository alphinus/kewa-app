# KEWA Liegenschafts-Aufgabenverwaltung

## What This Is

Eine Web-App zur Verwaltung von Handwerker-Aufgaben für eine Wohnliegenschaft. Die KEWA AG (Eigentümerin) weist dem Handwerker Imeri Arbeiten zu, dieser dokumentiert die Erledigung mit Fotos. Grafische Gebäudeansicht, Sprachnotizen mit automatischer Transkription, und wöchentliche Berichte inklusive.

## Core Value

KEWA AG hat jederzeit volle Transparenz darüber, welche Arbeiten Imeri erledigt hat — mit Fotobeweis und Zeitstempel.

## Current Milestone: v2.0 Multi-Tenant

**Goal:** Erweitere die App um Mieter-Ticketing, Parkplätze, Auslastungs-Tracking und Offline-Support.

**Target features:**
- Mieter-Ticket-System (integriert, Email+Passwort, kategorisierte Tickets)
- 8 Parkplätze mit Status-Tracking (frei/belegt/reparatur)
- Auslastungs-Dashboard für KEWA AG
- Push-Notifications für Imeri
- Offline-Support mit Sync
- Task-Kommentare für Kommunikation
- UX-Verbesserungen (Mobile, Fotos, Dashboard, Sprachnotizen)
- Tech Debt Fixes (Middleware, Turbopack, Session-Pattern)

## Current State (v1 Shipped)

**Tech Stack:** Next.js 16 + React 19 + Supabase + Tailwind CSS 4
**Codebase:** 12,116 LOC TypeScript, 117 files
**Status:** Ready for production deployment

## Requirements

### Validated

**Authentifizierung (v1):**
- ✓ PIN-basierte Anmeldung (ein PIN für KEWA AG, ein PIN für Imeri) — v1
- ✓ Unterschiedliche Berechtigungen je nach Rolle — v1
- ✓ 7-Tage Session-Persistenz mit httpOnly Cookie — v1

**Gebäudestruktur (v1):**
- ✓ Grafische Gebäudeansicht (4 Stockwerke + Dach, je 3 Wohnungen) — v1
- ✓ 13 Wohnungen als Einheiten + 9 Gemeinschaftsräume — v1
- ✓ Mieternamen pro Wohnung hinterlegbar (durch KEWA AG) — v1
- ✓ Farbkodierte Fortschrittsbalken pro Einheit — v1
- ✓ Sichtbarkeitseinstellung pro Einheit für Imeri — v1

**Projektstruktur (v1):**
- ✓ Projekte pro Einheit — v1
- ✓ Aufgaben innerhalb von Projekten — v1
- ✓ Hierarchie: Gebäude → Einheit → Projekt → Aufgabe — v1

**Aufgaben (v1):**
- ✓ Titel, Beschreibung, Fälligkeitsdatum, Priorität — v1
- ✓ Status: offen / erledigt — v1
- ✓ KEWA AG kann bis zu 2 Erklärungsbilder pro Aufgabe anhängen — v1
- ✓ Imeri kann bis zu 2 Erledigungsfotos pro Aufgabe hochladen — v1
- ✓ Kurznotiz bei Erledigung möglich — v1
- ✓ Wiederkehrende Aufgaben (wöchentlich/monatlich) — v1
- ✓ Vorher/Nachher Fotovergleich — v1

**Sprachnotizen (v1):**
- ✓ KEWA AG: Audio aufnehmen (max 1 Min) + automatische Transkription — v1
- ✓ Imeri kann Audio abspielen und Transkription lesen — v1
- ✓ Imeri: Notfall-Audio aufnehmen (nur Speicherung, keine Transkription) — v1
- ✓ KEWA AG sieht Übersicht aller Audio-Dateien — v1

**Dashboards (v1):**
- ✓ KEWA AG: Übersicht aller Einheiten mit Status — v1
- ✓ KEWA AG: Projekte und Aufgaben erstellen/bearbeiten — v1
- ✓ Imeri: Liste seiner offenen Aufgaben — v1
- ✓ Imeri: Aufgaben als erledigt markieren mit Foto-Upload — v1
- ✓ Mobile-optimiert (Touch-Targets ≥48px) — v1

**Berichte & Archivierung (v1):**
- ✓ Wöchentlicher Bericht mit erledigten Arbeiten und Fotos — v1
- ✓ Projekt-Archivierung nach Abschluss aller Aufgaben — v1

### Active

**Parkplätze (v2.0):**
- [ ] 8 Parkplätze rechts neben Gebäude, vertikal dargestellt
- [ ] Status pro Parkplatz: frei / belegt / reparatur
- [ ] Parkplätze beeinflussen Gesamtauslastung

**Auslastung (v2.0):**
- [ ] Auslastungs-Dashboard für KEWA AG
- [ ] Leerstehende Wohnungen reduzieren Auslastung
- [ ] Unbelegte Parkplätze reduzieren Auslastung
- [ ] Mock-Daten für Mieter zum Testen

**Mieter-Ticket-System (v2.0):**
- [ ] Mieter-Authentifizierung mit Email + Passwort
- [ ] Ticket-Kategorien: Reparaturen, Beschwerden, Anfragen
- [ ] Mieter sehen nur eigene Tickets
- [ ] KEWA AG kann Tickets zu Imeri-Aufgaben machen (manuell)
- [ ] Jede Partei sieht nur eigene Daten

**Push-Notifications (v2.0):**
- [ ] Imeri erhält Benachrichtigung bei neuen Aufgaben
- [ ] Erinnerung an Fälligkeitsdaten

**Offline-Support (v2.0):**
- [ ] Imeri kann ohne Internet arbeiten
- [ ] Automatischer Sync bei Verbindung

**Task-Kommentare (v2.0):**
- [ ] Kommunikation zwischen KEWA AG und Imeri auf Aufgaben

**UX-Verbesserungen (v2.0):**
- [ ] Mobile UX optimieren
- [ ] Foto-Handling verbessern
- [ ] Dashboard-Verbesserungen
- [ ] Sprachnotizen-UX verbessern

**Tech Debt (v2.0):**
- [ ] Next.js Middleware-Warning beheben (Proxy-Pattern)
- [ ] Turbopack Build-Race-Conditions stabilisieren
- [ ] Session-Pattern vereinheitlichen
- [ ] Phase 03 VERIFICATION.md nachholen

### Out of Scope

- Mehrere Handwerker — nur Imeri als einziger Arbeiter
- Mehrere Liegenschaften — nur dieses eine Gebäude
- Zahlungsabwicklung/Rechnungen — nicht Teil dieser App
- Transkription von Imeris Audio — Dialekt zu schwierig (15-30% WER)
- Automatische Ticket-zu-Aufgabe Konvertierung — KEWA AG entscheidet manuell

## Context

**Nutzer:**
- KEWA AG: Eigentümerin der Liegenschaft, erstellt und verwaltet Aufgaben
- Imeri: Handwerker, erledigt Aufgaben vor Ort, dokumentiert mit Fotos
- Mieter: Wohnungsmieter, können Tickets erstellen (neu in v2.0)
- Imeri spricht Dialekt, daher keine Speech-to-Text für seine Aufnahmen

**Nutzungskontext:**
- Alle nutzen primär Smartphone (mobile-first)
- KEWA AG auch am Desktop/Browser
- Imeri ist vor Ort auf der Baustelle
- Mieter nutzen App von zuhause

**Gebäude:**
- 13 Wohnungen über 5 Ebenen (EG bis Dach)
- 9 Gemeinschaftsräume
- 8 Parkplätze (neu in v2.0)
- Gebäude als Ganzes für übergreifende Aufgaben

## Constraints

- **Tech Stack**: Next.js 16 + Supabase + Vercel
- **Authentifizierung**: PIN für KEWA AG + Imeri, Email+Passwort für Mieter
- **Audio**: Max 1 Minute pro Aufnahme, 10MB max
- **Fotos**: Max 2 pro Aufgabe (je Richtung), 720px komprimiert
- **Speech-to-Text**: Nur für KEWA AG (Hochdeutsch via OpenAI Whisper)
- **Datentrennung**: Mieter sehen nur eigene Tickets, keine fremden Daten

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PIN statt Login | Zwei Nutzer, maximale Einfachheit | ✓ Funktioniert gut |
| Supabase für Backend | Datenbank + Storage in einem | ✓ Gute Developer Experience |
| Next.js 16 + Vercel | Moderne Stack, einfaches Deployment | ✓ create-next-app installierte v16 |
| Keine Transkription für Imeri | Schweizerdeutsch zu fehlerhaft | ✓ Imeri kann Audio aufnehmen ohne Transkription |
| Grafische Gebäudeansicht | Wichtig für KEWA AG Übersicht | ✓ 5-Stockwerk Grid mit Fortschrittsbalken |
| jose statt jsonwebtoken | Edge Runtime kompatibel | ✓ Middleware funktioniert |
| Canvas API für Bildkompression | Keine externen Dependencies | ✓ 720px WebP, ~50-100KB |
| OpenAI Whisper für Transkription | Beste Deutsch-Unterstützung | ✓ Fire-and-forget Pattern |
| Fire-and-forget für async Tasks | Nicht blockierend | ✓ Recurring + Transcription nutzen Pattern |

| Integriertes Mieter-System | Shared Backend, einheitliche Datenbasis, einfacher zu warten | — Pending |
| Email+Passwort für Mieter | Professioneller als PIN, ermöglicht Passwort-Reset | — Pending |
| Manuelles Ticket-zu-Aufgabe | KEWA AG behält Kontrolle über Imeri-Aufgaben | — Pending |
| Parkplätze mit simplem Status | Volle Aufgabenverwaltung wäre Overkill | — Pending |

---
*Last updated: 2026-01-18 after v2.0 milestone start*
