# KEWA Liegenschafts-Aufgabenverwaltung

## What This Is

Eine Web-App zur Verwaltung von Handwerker-Aufgaben für eine Wohnliegenschaft. Die KEWA AG (Eigentümerin) weist dem Handwerker Imeri Arbeiten zu, dieser dokumentiert die Erledigung mit Fotos. Grafische Gebäudeansicht, Sprachnotizen mit automatischer Transkription, und wöchentliche Berichte inklusive.

## Core Value

KEWA AG hat jederzeit volle Transparenz darüber, welche Arbeiten Imeri erledigt hat — mit Fotobeweis und Zeitstempel.

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

(None — v1.1 features to be defined)

### Out of Scope

- Push-Benachrichtigungen — später ergänzen
- Mehrere Handwerker — nur Imeri als einziger Arbeiter
- Komplexe Benutzerverwaltung — nur zwei PINs
- Mehrere Liegenschaften — nur dieses eine Gebäude
- Zahlungsabwicklung/Rechnungen — nicht Teil dieser App
- Transkription von Imeris Audio — Dialekt zu schwierig (15-30% WER)
- Vollständiger Offline-Mode — später mit Sync

## Context

**Nutzer:**
- KEWA AG: Eigentümerin der Liegenschaft, erstellt und verwaltet Aufgaben
- Imeri: Handwerker, erledigt Aufgaben vor Ort, dokumentiert mit Fotos
- Imeri spricht Dialekt, daher keine Speech-to-Text für seine Aufnahmen

**Nutzungskontext:**
- Beide nutzen primär Smartphone (mobile-first)
- KEWA AG auch am Desktop/Browser
- Imeri ist vor Ort auf der Baustelle

**Gebäude:**
- 13 Wohnungen über 5 Ebenen (EG bis Dach)
- 9 Gemeinschaftsräume
- Gebäude als Ganzes für übergreifende Aufgaben

## Constraints

- **Tech Stack**: Next.js 16 + Supabase + Vercel
- **Authentifizierung**: Simpel mit PIN, keine komplexe User-Verwaltung
- **Audio**: Max 1 Minute pro Aufnahme, 10MB max
- **Fotos**: Max 2 pro Aufgabe (je Richtung), 720px komprimiert
- **Speech-to-Text**: Nur für KEWA AG (Hochdeutsch via OpenAI Whisper)

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

---
*Last updated: 2026-01-17 after v1 milestone*
