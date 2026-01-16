# KEWA Liegenschafts-Aufgabenverwaltung

## What This Is

Eine Web-App zur Verwaltung von Handwerker-Aufgaben für eine Wohnliegenschaft. Die KEWA AG (Eigentümerin) weist dem Handwerker Imeri Arbeiten zu, dieser dokumentiert die Erledigung mit Fotos. Grafische Gebäudeansicht, Sprachnotizen und wöchentliche Berichte inklusive.

## Core Value

KEWA AG hat jederzeit volle Transparenz darüber, welche Arbeiten Imeri erledigt hat — mit Fotobeweis und Zeitstempel.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Authentifizierung:**
- [ ] PIN-basierte Anmeldung (ein PIN für KEWA AG, ein PIN für Imeri)
- [ ] Unterschiedliche Berechtigungen je nach Rolle

**Gebäudestruktur:**
- [ ] Grafische Gebäudeansicht (4 Stockwerke + Dach, je 3 Wohnungen)
- [ ] 13 Wohnungen als Einheiten (EG: 3, 1.OG: 3, 2.OG: 3, 3.OG: 3, Dach: 1)
- [ ] Gemeinschaftsräume: Keller, Waschküche, Veloraum, Heizungsraum, Pelletraum, Treppenhaus, Trockenraum, Magazin, Gartenbereich
- [ ] Gesamtes Objekt als eigene Einheit für gebäudeweite Aufgaben
- [ ] Mieternamen pro Wohnung hinterlegbar (durch KEWA AG)

**Projektstruktur:**
- [ ] Projekte pro Einheit (z.B. "Badezimmer", "Küche", "Balkon")
- [ ] Aufgaben innerhalb von Projekten
- [ ] Hierarchie: Gebäude → Einheit → Projekt → Aufgabe

**Aufgaben (Tasks):**
- [ ] Titel, Beschreibung, Fälligkeitsdatum, Priorität
- [ ] Status: offen / erledigt
- [ ] KEWA AG kann bis zu 2 Bilder pro Aufgabe anhängen (zur Erklärung)
- [ ] Imeri kann bis zu 2 Fotos pro Aufgabe hochladen (Dokumentation der Erledigung)
- [ ] Kurznotiz bei Erledigung möglich (optional)
- [ ] Wiederkehrende Aufgaben (wöchentlich/monatlich)

**Sprachnotizen:**
- [ ] KEWA AG: Audio aufnehmen (max 1 Min) + automatische Transkription
- [ ] Transkription wird Aufgabenbeschreibung
- [ ] Audio-Datei wird gespeichert
- [ ] Imeri kann Audio abspielen und Text lesen
- [ ] Imeri: Audio aufnehmen nur in Ausnahmefällen (max 1 Min, nur Speicherung, keine Transkription)

**KEWA AG Dashboard:**
- [ ] Übersicht aller Einheiten mit Fortschrittsbalken
- [ ] Projekte und Aufgaben erstellen/bearbeiten
- [ ] Wöchentlicher Bericht (automatisch generiert) — welche Arbeiten erledigt
- [ ] Sichtbarkeitseinstellung: Imeri sieht Projekte+Aufgaben oder nur Aufgaben
- [ ] Übersicht aller Audio-Dateien (inkl. Imeris Notfall-Audios)

**Imeri Dashboard:**
- [ ] Liste seiner offenen Aufgaben (einfach und übersichtlich)
- [ ] Aufgaben als erledigt markieren
- [ ] Foto-Upload bei Erledigung
- [ ] Audio abspielen von KEWA AG
- [ ] Notfall-Audio aufnehmen (Ausnahme, nicht Standard)

**Archivierung:**
- [ ] Erledigte Aufgaben bleiben sichtbar bis alle Projekte einer Einheit abgeschlossen
- [ ] Dann Archivierung
- [ ] Wöchentliche Berichte für KEWA AG

### Out of Scope

- Push-Benachrichtigungen — später ergänzen
- Mehrere Handwerker — nur Imeri als einziger Arbeiter
- Komplexe Benutzerverwaltung — nur zwei PINs
- Mehrere Liegenschaften — nur dieses eine Gebäude
- Zahlungsabwicklung/Rechnungen — nicht Teil dieser App
- Transkription von Imeris Audio — Dialekt zu schwierig

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

- **Tech Stack**: Next.js + Supabase + Vercel — bereits entschieden
- **Authentifizierung**: Simpel mit PIN, keine komplexe User-Verwaltung
- **Audio**: Max 1 Minute pro Aufnahme
- **Fotos**: Max 2 pro Aufgabe (je Richtung)
- **Speech-to-Text**: Nur für KEWA AG (Hochdeutsch), nicht für Imeri

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PIN statt Login | Zwei Nutzer, maximale Einfachheit | — Pending |
| Supabase für Backend | Datenbank + Storage + ggf. Auth in einem | — Pending |
| Next.js + Vercel | Moderne Stack, einfaches Deployment | — Pending |
| Keine Transkription für Imeri | Dialekt schwer zu transkribieren | — Pending |
| Grafische Gebäudeansicht als Kernfeature | Wichtig für KEWA AG Übersicht | — Pending |

---
*Last updated: 2025-01-16 after initialization*
