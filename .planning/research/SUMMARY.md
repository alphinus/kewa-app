# Research Summary: KEWA Liegenschafts-Aufgabenverwaltung

**Synthesized:** 2026-01-16
**Confidence:** HIGH

## Executive Summary

Die KEWA-App ist ein Property-Task-Management-System für 2 Nutzer (Eigentümerin + Handwerker) mit klarem Fokus: Aufgaben zuweisen, mit Fotos dokumentieren, Transparenz schaffen. Der Tech-Stack (Next.js 15 + Supabase + Vercel) ist solide gewählt.

**Kritische Erkenntnisse:**

1. **Offline-First ist Pflicht** — Foto-Uploads auf Baustellen mit schlechtem Netz scheitern still. Imeri verliert Vertrauen binnen Tagen, wenn Fotos "verschwinden". IndexedDB-Queue + Client-seitige Kompression von Tag 1.

2. **Schweizerdeutsch-Transkription funktioniert nicht zuverlässig** — 15-30% Wortfehlerrate selbst mit optimierten Modellen. Spracheingabe nur für KEWA AG (Hochdeutsch), Imeri nur Audio-Speicherung ohne Transkription.

3. **Touch-Targets für Baustelle: 76dp minimum** — Standard 44px ist zu klein für Arbeitshandschuhe. Mobile-first bedeutet wirklich: Design für Imeris Smartphone mit Handschuhen.

4. **Einfachheit über alles** — Keine Settings, keine Konfiguration, ein klarer Pfad pro Screen. Imeri ist kein Tech-User.

---

## Key Findings by Dimension

### Stack (STACK.md)

| Bereich | Empfehlung | Confidence |
|---------|------------|------------|
| UI | shadcn/ui + Tailwind CSS 4 | HIGH |
| State | TanStack Query + Zustand | HIGH |
| Audio | react-audio-voice-recorder | HIGH |
| Speech-to-Text | Deepgram Nova-3 (DE) @ $0.004/min | HIGH |
| Bilder | Supabase Storage + Image Transformations | HIGH |
| Realtime | Supabase Postgres Changes | HIGH |
| Auth | Custom PIN + Cookie Sessions (kein Supabase Auth) | MEDIUM |

**Anti-Pattern:** Redux, MUI, NextAuth — alle Overkill für 2 Nutzer.

### Features (FEATURES.md)

**Table Stakes (Phase 1):**
- PIN-Auth, Task-CRUD, Foto-Upload, Dashboards, Mobile-Responsive

**Differentiators (Phase 2-3):**
- Grafische Gebäudeansicht (echtes UX-Differenzierungsmerkmal)
- Sprachnotizen mit Transkription
- Wöchentliche Berichte
- Wiederkehrende Aufgaben

**Anti-Features (NICHT bauen):**
- Multi-User-Management, Multi-Building, Tenant-Portal
- Invoicing, komplexes Scheduling, Analytics-Dashboards
- Push-Notifications (später), Offline-Sync (später)

### Architecture (ARCHITECTURE.md)

**Datenmodell:**
```
buildings → units → projects → tasks → task_photos/task_audio
```

**Auth-Pattern:**
- Custom PIN-Validation mit bcrypt
- HTTP-only Cookie Sessions (7 Tage)
- Service Role für alle DB-Operationen (bypass RLS)

**Storage:**
```
task-photos/{task_id}/before-{uuid}.jpg
task-audio/{task_id}/instruction-{uuid}.webm
```

**Build-Reihenfolge:**
1. Foundation (Supabase, Schema, Auth)
2. Core Data (UI, Task-CRUD, Rollen)
3. Files (Foto/Audio)
4. Polish (Realtime, Reports)

### Pitfalls (PITFALLS.md)

**Kritisch (Phase 1):**
| Pitfall | Prevention |
|---------|------------|
| Silent Upload Failures | Offline-Queue + IndexedDB + klare Status-Indikatoren |
| Touch-Targets zu klein | 76dp minimum, testen mit Handschuhen |
| Technische Fehlermeldungen | Human-readable + Action-Button |
| Desktop-First Design | Smartphone als Referenzgerät |

**Wichtig (Phase 2+):**
| Pitfall | Prevention |
|---------|------------|
| Swiss German STT | Nur Audio speichern, keine Transkription für Imeri |
| Web Speech API inkompatibel | Server-side Whisper statt Browser API |
| Building-Visualization Overengineering | CSS-Grid first, SVG später |

---

## Implications for Roadmap

Basierend auf Research, empfohlene Phasen-Struktur:

### Phase 1: Foundation + Core Task Loop
**Ziel:** Arbeitsfähiges System — KEWA erstellt Tasks, Imeri sieht sie

- Supabase Setup (DB, Storage, Realtime Publication)
- Custom PIN Auth mit Cookie Sessions
- Building/Unit/Project/Task Schema
- Mobile-first UI Components (76dp touch targets)
- KEWA Dashboard: Task-CRUD
- Imeri Dashboard: Task-Liste
- **Pitfall-Prevention:** Offline-Queue-Architektur von Tag 1

**Rationale:** Core Loop muss zuerst funktionieren. Auth + Data + Basic UI.

### Phase 2: Photo Documentation
**Ziel:** Fotobeweis für erledigte Arbeiten

- Supabase Storage Buckets
- Client-seitige Bildkompression (720px, WebP)
- Foto-Upload mit Retry-Logic
- Photo Gallery pro Task
- Before/After Darstellung (einfach, side-by-side)
- **Pitfall-Prevention:** Compression + Offline-Queue + Clear Status

**Rationale:** Fotos sind Kernwert ("Fotobeweis"). Ohne Fotos kein Vertrauen.

### Phase 3: Voice Notes + Reports
**Ziel:** Spracheingabe für KEWA, Berichte für Transparenz

- Audio Recording (MediaRecorder API)
- Deepgram Integration (nur KEWA AG, Hochdeutsch)
- Audio-Speicherung für Imeri (keine Transkription)
- Audio Playback Component
- Wöchentlicher Report Generator
- **Pitfall-Prevention:** Whisper/Deepgram server-side, nicht Web Speech API

**Rationale:** Voice ist Convenience, nicht Core. Reports sind dokumentierte Transparenz.

### Phase 4: Building View + Polish
**Ziel:** Grafische Übersicht, Feinschliff

- Grafische Gebäudeansicht (CSS Grid first, dann polish)
- Mieternamen pro Wohnung
- Fortschrittsbalken pro Einheit
- Wiederkehrende Aufgaben
- Realtime Task Updates
- Archivierung abgeschlossener Projekte
- **Pitfall-Prevention:** Time-box Visualization auf max 1 Woche

**Rationale:** Polish nach Core. Building View ist Differentiator, nicht Blocker.

### Phase Ordering Rationale

1. **Auth vor allem** — Ohne Auth keine Rollen, keine geschützten Routen
2. **Tasks vor Fotos** — Task-Struktur muss existieren bevor Fotos angehängt werden
3. **Fotos vor Audio** — Fotos sind Kernwert, Audio ist Enhancement
4. **Reports vor Building View** — Reports liefern echten Business Value, Building View ist UX Polish

### Research Flags für Phasen

- **Phase 1:** Standard Patterns, keine tiefere Research nötig
- **Phase 2:** Image Compression Libraries — validieren welche mit Next.js 15 kompatibel
- **Phase 3:** Deepgram vs OpenAI Whisper — testen mit echten deutschen Sprachproben
- **Phase 4:** CSS Grid vs SVG für Building — Decision based on complexity

---

## Confidence Assessment

| Bereich | Level | Grund |
|---------|-------|-------|
| Stack Recommendations | HIGH | 2025 Best Practices verifiziert |
| Feature Prioritization | HIGH | Klare Table Stakes vs Differentiators |
| Architecture Patterns | HIGH | Supabase + Next.js offizielle Docs |
| Pitfall Prevention | HIGH | Mehrere autoritative Quellen |
| Phase Structure | MEDIUM | Basiert auf Dependency-Analyse |

---

## Open Questions for Planning

1. **Imeri's Gerät** — iOS oder Android? Safari vs Chrome?
2. **PIN-Länge** — 4-stellig oder 6-stellig?
3. **Offline-Tiefe** — Reicht "Queue + Retry" oder braucht es echten Offline-Mode?
4. **Report-Format** — PDF-Export oder nur In-App-Ansicht?

---

## Files in this Research

| File | Purpose |
|------|---------|
| STACK.md | Tech-Stack Empfehlungen mit Versionen und Rationale |
| FEATURES.md | Feature-Kategorisierung (Table Stakes / Differentiators / Anti) |
| ARCHITECTURE.md | System-Architektur, Schema, Data Flow |
| PITFALLS.md | 16 dokumentierte Risiken mit Prevention Strategies |
| SUMMARY.md | Diese Zusammenfassung mit Roadmap-Implikationen |
