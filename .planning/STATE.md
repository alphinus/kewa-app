# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-16)

**Core value:** KEWA AG hat jederzeit volle Transparenz darüber, welche Arbeiten Imeri erledigt hat — mit Fotobeweis und Zeitstempel.
**Current focus:** Phase 4 — Voice Notes (IN PROGRESS)

## Current Position

Phase: 4 of 6 (Voice Notes)
Plan: 1 of 2 complete
Status: In progress
Last activity: 2026-01-17 — Completed 04-01-PLAN.md (Audio Storage Infrastructure)

Progress: █████████░ 56% (9/16 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 12 min
- Total execution time: 1.85 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3/3 | 43 min | 14 min |
| 2. Task Management | 3/3 | 24 min | 8 min |
| 3. Photo Documentation | 2/2 | 39 min | 20 min |
| 4. Voice Notes | 1/2 | 3 min | 3 min |

**Recent Trend:**
- Last 5 plans: 02-03 (12 min), 03-01 (4 min), 03-02 (35 min), 04-01 (3 min)
- Trend: API-only plans are fast, UI plans take longer

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Decision | Phase-Plan | Rationale |
|----------|------------|-----------|
| Next.js 16 (latest) | 01-01 | create-next-app installed latest version, backward compatible |
| Deterministic UUIDs for seed data | 01-01 | Predictable references in tests and migrations |
| jose for JWT (not jsonwebtoken) | 01-02 | Edge runtime compatible, ESM-native |
| Duplicate session validation in middleware | 01-02 | bcrypt unavailable in Edge, use jose directly |
| 7-day session cookies | 01-02 | Balance between security and convenience for mobile workers |
| 48px touch targets | 01-03 | All interactive elements min 48px height for mobile usability |
| Bottom navigation pattern | 01-03 | Mobile-native pattern, more accessible than hamburger menu |
| Dashboard at /dashboard path | 01-03 | Route group caused routing conflicts, simpler as actual path |
| Manual aggregation for task counts | 02-01 | Supabase nested select + JS aggregation, simpler than RPC |
| Task sorting order | 02-01 | due_date (nulls last), priority (urgent first), created_at |
| Auto-set completed_at on status change | 02-01 | PUT endpoint handles timestamp automatically |
| Slide-up modal for mobile forms | 02-02 | Native mobile pattern, items-end on mobile, items-center on desktop |
| Status toggle in edit form | 02-02 | Cleaner UI, prevents accidental status changes |
| Task grouping by due date | 02-03 | 5 categories (Ueberfaellig, Heute, Diese Woche, Spaeter, Ohne Datum) |
| Expandable cards on mobile | 02-03 | Tap to expand shows details, desktop has hover-reveal complete button |
| Parallel API fetching for dashboard | 02-03 | Promise.all for open + completed tasks, faster load time |
| Max 2 photos per type per task | 03-01 | Enforced at API level for flexibility, prevents storage bloat |
| 720px max dimension, 0.8 quality WebP | 03-01 | Balance between visual quality and file size (~50-100KB) |
| 1 hour signed URL expiry | 03-01 | Balance between caching and security |
| Role-based photo upload | 03-01 | KEWA=explanation only, Imeri=completion only |
| Preview before upload | 03-02 | User can verify image quality before uploading |
| Upload retry (3 attempts) | 03-02 | Handle poor network conditions on construction sites |
| Vorher/Nachher labels | 03-02 | Clearer than Erklaerung/Erledigung for photo comparison |
| Action bar at bottom-16 | 03-02 | Positioned above MobileNav to avoid overlap |
| Max 1 audio per type per task | 04-01 | Simpler than photos, one voice note per purpose is sufficient |
| 10MB audio file size limit | 04-01 | Audio files are larger than compressed images |
| Transcription status workflow | 04-01 | explanation=pending (will be transcribed), emergency=completed |

### Pending Todos

- Apply migration 001_initial_schema.sql to Supabase
- Apply migration 003_task_photos.sql to Supabase
- Apply migration 005_task_audio.sql to Supabase
- Create 'task-photos' storage bucket with policies
- Create 'task-audio' storage bucket with policies
- Configure .env.local with actual Supabase credentials
- Update placeholder PIN hashes in users table with real bcrypt hashes

### Blockers/Concerns

- Supabase project needs to be created and migrations applied before testing API endpoints
- Storage buckets 'task-photos' and 'task-audio' must be created manually with correct policies
- Next.js 16 middleware deprecation warning (works but may need migration to proxy pattern)
- Next.js Turbopack has intermittent build race conditions (use NEXT_TURBOPACK=0 for reliable builds)

## Phase 4 In Progress

Phase 4 (Voice Notes) IN PROGRESS:
1. **04-01:** ✓ Audio storage schema + TypeScript types + CRUD API
2. **04-02:** - Audio recording UI + playback components

**Delivered so far:**
- Audio API: GET/POST/DELETE /api/audio
- task_audio table with transcription workflow support
- TypeScript types: AudioType, TranscriptionStatus, TaskAudio, etc.

**New files:**
- supabase/migrations/005_task_audio.sql
- src/app/api/audio/route.ts
- src/app/api/audio/[id]/route.ts

## Session Continuity

Last session: 2026-01-17 18:35
Stopped at: Completed 04-01-PLAN.md (Audio Storage Infrastructure)
Resume file: None - ready for 04-02 (Audio UI)
