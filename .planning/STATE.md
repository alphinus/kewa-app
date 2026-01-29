# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen -- mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** Milestone v3.0 Tenant & Offline -- Phase 25 complete, Phase 26 next

## Current Position

Phase: 26 of 29 (Tenant Portal Core)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-01-29 -- Completed 26-02-PLAN.md

Progress: [██░░░░░░░░] 22%

## Milestones Completed

- v1.0 MVP (2025-03-XX) -- Phases 1-6
- v2.0 Advanced Features (2026-01-19) -- Phases 7-12.3
- v2.1 Master Data Management (2026-01-25) -- Phases 13-17
- v2.2 Extensions (2026-01-29) -- Phases 18-24

## Performance Metrics

**Velocity:**
- Total plans completed: 4 (v3.0)
- Average duration: 33min
- Total execution time: 134min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 25 | 2 | 62min | 31min |
| 26 | 2 | 72min | 36min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Carried forward from v2.2:

- Tiptap with immediatelyRender: false for SSR safety
- Service worker for push notifications (expand, do NOT replace)
- VAPID keys in environment secrets
- Supabase Realtime for live updates
- react-signature-canvas for digital signatures
- recharts for data visualization
- Fire-and-forget notification dispatch pattern

v3.0 architecture decisions:
- Application-layer tenant isolation only (RLS is dead code)
- Manual service worker expansion (no Serwist -- Turbopack conflict)
- Only 3 new packages: dexie@4.2.1, dexie-react-hooks@4.2.0, sonner@2.0.7
- Last-Write-Wins conflict resolution with server timestamp authority
- Network-first for API, cache-first for static assets

Phase 25-01 decisions:
- Client-side invoice search (50-item limit sufficient for supplier volumes)
- Component reuse pattern (DeliveryList reused on property page)
- German fallback language ("Punkt N" instead of "Item N")

Phase 25-02 decisions:
- Sonner toast library for non-blocking action feedback
- 4-second toast duration (longer than default 3s for German text readability)
- Top-right positioning (standard for desktop apps)
- German text with "ue/oe/ae" encoding to avoid umlaut issues

Phase 26-01 decisions:
- Ticket status workflow: 4 statuses (offen → in_bearbeitung → geschlossen, optional storniert)
- Ticket number format: T-YYYYMMDD-XXXX with daily sequence
- Tenant isolation at application layer (no RLS, consistent with Phase 1 decision)

Phase 26-02 decisions:
- Portal uses separate session cookie (portal_session) with 30-day expiration for mobile users
- Invite tokens are single-use JWTs with 7-day expiration enforced by password_hash check
- QR login tokens are short-lived (5 minutes) for multi-device access
- Portal routes completely isolated from operator routes via middleware

### UAT Issues (carried from v2.2 -- all resolved in Phase 25)

- ✓ Invoice linking with modal UI (resolved in 25-01)
- ✓ Checklist item titles from template (resolved in 25-01)
- ✓ Property-level delivery history page (resolved in 25-01)
- ✓ Blocking alert() dialogs replaced with toast notifications (resolved in 25-02)

### Blockers/Concerns

**Phase 26-01:** Docker unavailable during execution - migration 062 created but not verified. Recommendation: Run `npx supabase db reset` in next session to confirm migration applies cleanly.

## Session Continuity

Last session: 2026-01-29 18:39 UTC
Stopped at: Completed 26-02-PLAN.md (Tenant Auth)
Resume file: .planning/phases/26-tenant-portal-core/26-03-PLAN.md

---
*Phase 26 Plan 02 complete. Tenant authentication with invite-based registration, email+password login, and portal session management ready. Next: 26-03 (Ticket API) and 26-04 (Portal UI) can proceed (Wave 2-3).*
