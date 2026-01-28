# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** Milestone v2.2 Extensions — Phase 23 Inspection Advanced in progress

## Current Position

Phase: 23 of 24 (Inspection Advanced) — IN PROGRESS
Plan: 2 of 3 executed
Status: In progress
Last activity: 2026-01-28 — Completed 23-02-PLAN.md

Progress: [██████████░] 66% (24/35 v2.2 plans)

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
| 21 | Change Orders | 10 | Complete (4/4 plans) |
| 22 | Inspection Core | 8 | Complete (4/4 plans) |
| 23 | Inspection Advanced | 4 | In progress (2/3 plans) |
| 24 | Push Notifications | 12 | Not started |

## Performance Metrics

**Velocity:**
- Total plans completed: 24 (v2.2)
- Average duration: 12 min
- Total execution time: 292 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 18 | 5 | 49 min | 10 min |
| 19 | 3 | 27 min | 9 min |
| 20 | 3 | 47 min | 16 min |
| 21 | 4 | 49 min | 12 min |
| 22 | 4 | 91 min | 23 min |
| 23 | 2 | 30 min | 15 min |

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
- [21-04]: Magic link tokens linked to change orders via change_order_approval_tokens join table
- [21-04]: Portal data endpoint validates token without consuming (read-only check)
- [21-04]: Approve/reject endpoints consume token to prevent reuse (mark as used)
- [21-04]: show_line_items_to_client controls financial detail visibility in portal
- [21-04]: Rejection requires comment for audit trail, approval comment optional
- [21-04]: 7-day token expiry for client approval workflow
- [22-01]: Status transition trigger validates inspection workflow (in_progress->completed->signed)
- [22-01]: Signature refusal escape hatch (signature_refused=true with mandatory reason)
- [22-01]: Defects have independent lifecycle not derived from linked task status
- [22-01]: Template checklist_sections copied to inspection checklist_items at creation
- [22-01]: Overall result auto-computed from defect severity (schwer+open=failed)
- [22-01]: Dedicated inspections storage bucket (not media bucket)
- [22-02]: Photo upload stores in inspections bucket with signed URLs (1-hour expiry)
- [22-02]: Auto-save with 3-second debounce for checklist partial progress
- [22-02]: Photo nudge prompts but doesn't require photos (dismissable)
- [22-02]: Touch-friendly UI with 48px min height on interactive elements
- [22-02]: Template filtering by trade category when work order selected
- [22-03]: Signature canvas uses react-signature-canvas with typed name (500x200px responsive)
- [22-03]: Signature refusal requires mandatory reason, keeps status at 'completed' (not 'signed')
- [22-03]: Completion warns about open defects with modal, requires acknowledge to proceed
- [22-03]: Defect actions prevent duplicate task creation via null check on action field
- [22-03]: Follow-up tasks created as subtasks on work order's task_id with severity-based priority
- [22-03]: Template editor uses button-based reorder (up/down arrows) not drag-and-drop
- [22-03]: PDF embeds signature PNG via signed URL, filename format: Abnahme-{title}-{date}.pdf
- [23-02]: inspection_portal_tokens join table links magic_link_tokens to inspections
- [23-02]: Portal validates token without consuming (read-only), acknowledge consumes token
- [23-02]: PDF signature embedded as base64 data URL (prevents URL expiry in saved PDFs)
- [23-02]: acknowledged_at and acknowledged_by_email track contractor portal acknowledgments

### UAT Issues for Future Phases

- Invoice linking needs proper modal UI (currently uses prompt()) — requires invoice module
- Property-level delivery history page not yet built — data model ready
- Checklist item titles need proper lookup from template (currently shows "Item 1", "Item 2")

### Pending Todos

- Enhance template population to copy title/description into ChecklistItemResult structure (22-02 minor issue)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 23-02-PLAN.md (Contractor Portal for Inspection Acknowledgment)
Resume file: None

---
*v2.2 Extensions milestone in progress. Phase 23 Inspection Advanced (2/3 plans complete). Next: Phase 23-03 or Phase 24 Push Notifications.*
