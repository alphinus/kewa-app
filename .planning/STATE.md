# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-16)

**Core value:** KEWA AG hat jederzeit volle Transparenz darüber, welche Arbeiten Imeri erledigt hat — mit Fotobeweis und Zeitstempel.
**Current focus:** Phase 5 — Building Visualization

## Current Position

Phase: 5 of 6 (Building Visualization)
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-01-17 — Completed 05-02-PLAN.md (Floor Plan Renderer Component)

Progress: █████████████ 81% (13/16 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 11 min
- Total execution time: 2.53 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3/3 | 43 min | 14 min |
| 2. Task Management | 3/3 | 24 min | 8 min |
| 3. Photo Documentation | 2/2 | 39 min | 20 min |
| 4. Voice Notes | 3/3 | 32 min | 11 min |
| 5. Building Visualization | 2/3 | 9 min | 5 min |

**Recent Trend:**
- Last 5 plans: 04-02 (4 min), 04-03 (25 min), 05-01 (5 min), 05-02 (4 min)
- Trend: API-only plans are fast (3-5 min), UI component plans fast (4-5 min)

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
| German (Hochdeutsch) for transcription | 04-02 | KEWA speaks German, Imeri needs to read instructions |
| Fire-and-forget transcription | 04-02 | Upload completes immediately, transcription runs in background |
| Idempotent /transcribe endpoint | 04-02 | Safe to retry, returns existing result if completed |
| MediaRecorder with webm/mp4 preference | 04-03 | webm widely supported, mp4 fallback for Safari |
| 60-second max audio duration | 04-03 | Sufficient for explanations, prevents large files |
| Preview before audio upload | 04-03 | Users can verify recording quality before committing |
| Custom audio controls (48px targets) | 04-03 | Touch-friendly for mobile workers |
| Tap-to-expand gallery items | 04-03 | Mobile-friendly interaction for audio list |
| Combined storage bucket migration | 04-03 | Photos and audio buckets in single migration |
| Reuse aggregation pattern for unit detail | 05-01 | Same task stats approach as list endpoint for consistency |
| KEWA-only unit updates | 05-01 | Tenant info is sensitive, only KEWA can modify |
| Compact mode (60px) for grid cells | 05-02 | Fit more units on mobile screen |
| Dach spans full width | 05-02 | Building has single rooftop unit |
| Building unit blue highlight | 05-02 | Distinguish from regular common areas |
| Empty cell placeholders | 05-02 | Visual consistency when units missing |

### Pending Todos

- Apply migration 001_initial_schema.sql to Supabase
- Apply migration 003_task_photos.sql to Supabase
- Apply migration 004_storage_buckets.sql to Supabase (or create buckets manually)
- Apply migration 005_task_audio.sql to Supabase
- Configure .env.local with actual Supabase credentials
- Configure OPENAI_API_KEY for transcription
- Update placeholder PIN hashes in users table with real bcrypt hashes

### Blockers/Concerns

- Supabase project needs to be created and migrations applied before testing API endpoints
- Storage buckets 'task-photos' and 'task-audio' need 004_storage_buckets.sql migration applied
- OpenAI API key required for transcription to work (audio uploads work without it, transcription fails silently)
- Next.js 16 middleware deprecation warning (works but may need migration to proxy pattern)
- Next.js Turbopack has intermittent build race conditions (use NEXT_TURBOPACK=0 for reliable builds)

## Phase 5 Progress

Phase 5 (Building Visualization) IN PROGRESS:
1. **05-01:** Unit Detail API (COMPLETE)
2. **05-02:** Building Grid UI (COMPLETE)
3. **05-03:** Unit Detail Page (pending)

**Delivered so far:**
- GET /api/units/[id] with task statistics
- PUT /api/units/[id] for tenant_name and visibility (KEWA only)
- UpdateUnitInput and UnitResponse TypeScript types
- BuildingGrid component for floor-based apartment layout
- UnitCell component with progress bar
- CommonAreasList component for non-apartment units

**New files this phase:**
- src/app/api/units/[id]/route.ts
- src/components/building/UnitCell.tsx
- src/components/building/BuildingGrid.tsx
- src/components/building/CommonAreasList.tsx

## Session Continuity

Last session: 2026-01-17 20:42
Stopped at: Completed 05-02-PLAN.md (Floor Plan Renderer Component)
Resume file: None - ready for 05-03
