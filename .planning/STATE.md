# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** Milestone v2.2 Extensions — Phase 20 Complete, ready for Phase 21

## Current Position

Phase: 21 of 24 (Change Orders)
Plan: 2 of 4 executed
Status: In progress
Last activity: 2026-01-28 — Completed 21-02-PLAN.md

Progress: [████████░░] 46% (16/35 v2.2 plans)

## Milestones Completed

- v1.0 MVP (2025-03-XX) — Phases 1-6
- v2.0 Advanced Features (2026-01-19) — Phases 7-12.3
- v2.1 Master Data Management (2026-01-25) — Phases 13-17

## v2.2 Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 18 | Knowledge Base | 10 | Complete (5/5 plans) |
| 19 | Supplier Core | 7 | Complete (3/3 plans + UAT) |
| 20 | Supplier Advanced | 5 | Complete (3/3 plans) |
| 21 | Change Orders | 10 | In progress (2/4 plans) |
| 22 | Inspection Core | 8 | Not started |
| 23 | Inspection Advanced | 4 | Not started |
| 24 | Push Notifications | 12 | Not started |

## Performance Metrics

**Velocity:**
- Total plans completed: 16 (v2.2)
- Average duration: 11 min
- Total execution time: 169 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 18 | 5 | 49 min | 10 min |
| 19 | 3 | 27 min | 9 min |
| 20 | 3 | 47 min | 16 min |
| 21 | 2 | 25 min | 13 min |

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
- [20-01]: inventory_movements as append-only log for historical tracking
- [20-01]: Validation trigger on purchase_order_allocations prevents over-allocation
- [20-01]: Computed level_percentage column in database for consistency
- [20-01]: get_reorder_alerts returns urgency classification
- [20-01]: recharts over Chart.js for React-first API
- [20-02]: Auto-calculate consumption on movement creation for consistency
- [20-02]: Delivery movements set consumption to null (deliveries add to tank)
- [20-02]: Color-coded level percentage (green >50%, amber 20-50%, red <20%)
- [20-02]: "Keine Verbrauchsdaten" for insufficient readings (less than 2)
- [20-03]: Enrich API responses with joined names in API layer (views return IDs only)
- [20-03]: Auto-calculate allocated_amount from quantity * unit_price in form
- [20-03]: Client-side validation + server-side DB trigger for allocation totals
- [20-03]: German month names via getMonthName() utility function
- [21-01]: Temporal versioning table for counter-offers (change_order_versions stores OLD values)
- [21-01]: Status workflow enforced at database level via trigger (JSONB transition map)
- [21-01]: Approval thresholds configurable per-project with priority-based routing
- [21-01]: Line items can be negative (scope reductions/credits) - total preserves sign
- [21-01]: Work order deletion blocked if active change orders exist
- [21-01]: Soft-delete only (status=cancelled with mandatory reason)
- [21-02]: Optimistic locking via version check prevents concurrent revision conflicts (409 Conflict)
- [21-02]: Threshold routing queries project-specific thresholds first, falls back to global defaults
- [21-02]: Reject status requires comment for audit trail (400 error if missing)
- [21-02]: Cancel status requires cancelled_reason (400 error if missing)
- [21-02]: LineItemEditor supports negative amounts for credits (distinct from PurchaseOrder)
- [21-02]: Version history timeline shows amount changes between versions

### UAT Issues for Future Phases

- Invoice linking needs proper modal UI (currently uses prompt()) — requires invoice module
- Property-level delivery history page not yet built — data model ready

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 21-02-PLAN.md (Approval Workflow)
Resume file: None

---
*v2.2 Extensions milestone in progress. Phase 21 Change Orders halfway done (2/4 plans complete).*
