# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** Milestone v2.2 Extensions — Phase 19 Complete, ready for Phase 20

## Current Position

Phase: 19 of 24 (Supplier Core) — VERIFIED
Plan: 3 of 3 executed + UAT passed
Status: Complete
Last activity: 2026-01-27 — Phase 19 UAT passed (4 PASS, 2 PARTIAL)

Progress: [███████░░░] 31% (11/35 v2.2 plans)

## Milestones Completed

- v1.0 MVP (2025-03-XX) — Phases 1-6
- v2.0 Advanced Features (2026-01-19) — Phases 7-12.3
- v2.1 Master Data Management (2026-01-25) — Phases 13-17

## v2.2 Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 18 | Knowledge Base | 10 | Complete (5/5 plans) |
| 19 | Supplier Core | 7 | Complete (3/3 plans + UAT) |
| 20 | Supplier Advanced | 5 | Not started |
| 21 | Change Orders | 10 | Not started |
| 22 | Inspection Core | 8 | Not started |
| 23 | Inspection Advanced | 4 | Not started |
| 24 | Push Notifications | 12 | Not started |

## Performance Metrics

**Velocity:**
- Total plans completed: 11 (v2.2)
- Average duration: 10 min
- Total execution time: 76 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 18 | 5 | 49 min | 10 min |
| 19 | 3 | 27 min | 9 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.2]: Research recommends MDX for knowledge base content (no CMS)
- [v2.2]: Supplier Module extends existing Partner entity
- [v2.2]: Push Notifications built last so all event sources exist
- [18-01]: Generated tsvector column with weighted search (title A, content B, tags C)
- [18-01]: Temporal tables pattern for version history
- [18-01]: Workflow FSM with trigger enforcement
- [18-02]: Tiptap with immediatelyRender: false for SSR safety
- [18-02]: Template scaffolds as Tiptap JSON with section headings
- [18-02]: Manual toolbar (no shadcn minimal-tiptap, no components.json)
- [18-03]: websearch_to_tsquery for safe FTS user input handling
- [18-03]: pg_trgm similarity for fuzzy autocomplete suggestions
- [18-03]: 300ms debounce for search suggestions
- [18-04]: Reuse media bucket for attachments at kb_articles/{id}/attachments/
- [18-04]: Signed URLs with 1-hour expiry for secure downloads
- [18-04]: Workflow transitions validated in API and database trigger
- [18-04]: Rejection requires comment for audit trail
- [18-05]: Category-based similarity for related articles (simpler than FTS overlap)
- [18-05]: Contractor portal hides internal metadata (author, dates, version history)
- [18-05]: Visibility filter IN ('contractors', 'both') for contractor access
- [19-01]: Purchase order sequence for order numbers (PO-YYYY-NNNNN)
- [19-01]: Deliveries has_variance computed column for mismatch detection
- [19-02]: Status transition validation in API before database trigger
- [19-03]: Delivery recording requires 'confirmed' PO status
- [19-03]: Invoice linking validates supplier match between delivery and invoice

### UAT Issues for Future Phases

- Invoice linking needs proper modal UI (currently uses prompt()) — requires invoice module
- Property-level delivery history page not yet built — data model ready

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-27
Stopped at: Phase 19 UAT complete — ready for Phase 20 (Supplier Advanced)
Resume file: None

---
*v2.2 Extensions milestone in progress. Phase 19 Supplier Core verified. Next: Phase 20 Supplier Advanced.*
