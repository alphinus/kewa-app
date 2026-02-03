# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen -- mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** Milestone v3.0 Tenant & Offline -- Phase 29 in progress

## Current Position

Phase: 29 of 29 (Tenant Extras & UX)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-03 -- Completed 29-01-PLAN.md (Tenant ticket notifications)

Progress: [████████░░] 82%

## Milestones Completed

- v1.0 MVP (2025-03-XX) -- Phases 1-6
- v2.0 Advanced Features (2026-01-19) -- Phases 7-12.3
- v2.1 Master Data Management (2026-01-25) -- Phases 13-17
- v2.2 Extensions (2026-01-29) -- Phases 18-24

## Performance Metrics

**Velocity:**
- Total plans completed: 15 (v3.0)
- Average duration: 20min
- Total execution time: 308min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 25 | 2 | 62min | 31min |
| 26 | 4 | 156min | 39min |
| 27 | 3 | 24min | 8min |
| 28 | 5 | 48min | 10min |
| 29 | 1 | 18min | 18min |

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

Phase 26-03 decisions:
- Portal API auth via x-portal-user-id header (middleware-injected from portal session)
- Admin API uses existing operator session with role-based access (admin only for write ops)
- Auto-mark-as-read on GET messages (tenant viewing thread marks operator messages read)
- Attachment upload enforces MAX_TICKET_PHOTOS=5 for ticket-level, unlimited for message-level

Phase 26-04 decisions:
- QR login tokens expire after 5 minutes to prevent replay attacks
- Message date grouping uses German labels (Heute, Gestern, DD.MM.YYYY) via date-fns locale
- Admin portal settings embedded in existing dashboard settings page (no new route needed)
- Seed data uses bcrypt-hashed password 'test1234' for all test tenants

Phase 27-01 decisions:
- Auto-show install toast after 2 seconds when beforeinstallprompt fires
- Session-based dismissal tracking (per-day) to re-prompt next session
- Manual install button only visible when browser supports install
- Solid brand color icons (#0f172a slate-900) without complex graphics

Phase 27-03 decisions:
- Operator app only - portal layout unchanged per CONTEXT.md (home Wi-Fi users)
- Initial mount 100ms delay prevents toasts on first page load
- Amber warning color for offline badge matching app design language

Phase 28-01 decisions:
- Cache limits: 50 properties, 200 units, 500 work orders, 1000 tasks/notes per type
- Eviction strategy: 7-day retention window + count-based trimming for unpinned entities
- Compound index [entityType+entityId] for efficient single-entity lookups
- Compound index [parentType+parentId] for two-level caching (entity + children)
- Staleness indicator only renders when offline (no indicator when online = live data)

Phase 28-02 decisions:
- Exponential backoff sequence: 0ms, 10ms, 20ms, 40ms, 80ms, 160ms, 320ms, 640ms (max 8 attempts)
- Sequential queue processing (FIFO) to preserve order for dependent mutations
- Failed items persist with status='failed' for user retry or discard action
- Last sync time stored in localStorage (not IndexedDB) for simplicity
- Sync triggers automatically on reconnect via ConnectivityContext
- Badge shows regardless of online/offline state (user needs visibility during sync)

Phase 28-03 decisions:
- Server wins in LWW conflict resolution with 4-second auto-dismiss toast
- Photos compress to 1920px max / 80% quality using existing Canvas API (no new npm packages)
- Sequential photo upload (one at a time) to avoid overwhelming mobile connections
- Failed photos retry independently from form data (partial sync works)
- Photo queue processes AFTER sync queue on reconnect

Phase 28-04 decisions:
- Network-first strategy with cache fallback (always attempt fetch first)
- Separate useEffect for offline page load detection
- Unit page shows only unit header offline (rooms not cached separately)
- Task page shows only task entity offline (photos/audio/role not available)

Phase 28-05 decisions:
- Task creation stays online-only (master data not created offline per CONTEXT.md)
- Task edit mode uses offline queueing for all updates
- Optimistic UI for queued submissions (immediate feedback)
- Photo upload falls back to queue if online upload fails while offline

Phase 29-01 decisions:
- Resend email client with graceful API key handling (logs warning, doesn't crash)
- Fire-and-forget pattern for both push and email notifications
- Reuse existing notification types (work_order_status) for ticket notifications
- Admin API uses kewa role check (legacy Role type) for consistency
- German email content with inline styles for email client compatibility

### UAT Issues (carried from v2.2 -- all resolved in Phase 25)

- ✓ Invoice linking with modal UI (resolved in 25-01)
- ✓ Checklist item titles from template (resolved in 25-01)
- ✓ Property-level delivery history page (resolved in 25-01)
- ✓ Blocking alert() dialogs replaced with toast notifications (resolved in 25-02)

### Blockers/Concerns

**Phase 26-01:** Docker unavailable during execution - migration 062 created but not verified. Recommendation: Run `npx supabase db reset` in next session to confirm migration applies cleanly.

**Phase 26-04:** Seed migration 063 created but not applied. API endpoints from 26-03 not verified to exist. Run database reset to apply all pending migrations before Phase 27.

**Phase 29-01:** Resend API key required for email notifications. Add RESEND_API_KEY to environment variables.

## Session Continuity

Last session: 2026-02-03
Stopped at: Completed 29-01-PLAN.md
Resume file: None

---
*Phase 29-01 Tenant Ticket Notifications complete. Resend email + React Email templates for ticket status and reply notifications. Admin ticket API endpoints for operator management. Next: 29-02 (if exists) or phase verification.*
