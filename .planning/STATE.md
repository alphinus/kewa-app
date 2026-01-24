# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** v2.1 Master Data Management — Phase 15 Complete

## Current Position

Phase: 15 of 17 (Einheiten-Verwaltung)
Plan: 4 of 4 in current phase
Status: Phase complete
Last activity: 2026-01-24 — Completed 15-04-PLAN.md (Unit Detail Page)

Progress: [██████████░░] 57% (13/23 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13 (v2.1)
- Average duration: 10 min
- Total execution time: 2.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 13 | 4/4 | 36min | 9min |
| 14 | 5/5 | 60min | 12min |
| 15 | 4/4 | 34min | 9min |
| 16 | 0/4 | - | - |
| 17 | 0/6 | - | - |

**Recent Trend:**
- Last 5 plans: 15-04 (8min), 15-03 (10min), 15-02 (8min), 15-01 (8min), 14-05 (19min)
- Trend: Consistent delivery

*Updated after each plan completion*

## v2.0 Milestone Summary

**Shipped:** 2026-01-19
**Phases:** 7-12.3 (9 phases, 31 plans)
**Requirements:** 91/92 (99%) — 1 deferred (EXT-15)

Key features delivered: RBAC, Contractor Portal, Templates, Cost Module, Digital Twin, Property Dashboard

## Accumulated Context

### Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 13-01 | Email validation required for contractors, optional for suppliers | Contractors need email for work order notifications, suppliers may only need phone contact |
| 13-01 | Admin-only DELETE with soft validation warning for active work orders | Admin override needed for data cleanup, but logged warning prevents accidental deletions |
| 13-01 | Manual validation pattern (no Zod) | Consistency with existing expenses/invoices codebase patterns |
| 13-03 | Conditional email validation in PartnerForm | Email required for contractors (work order notifications), optional for suppliers (phone contact sufficient) |
| 13-03 | Trade categories required for contractors only | Suppliers don't need trade specialization, only contractors need this for work order filtering |
| 13-03 | Active status toggle only in edit mode | New partners default to active; toggle shown in edit to allow deactivation without deletion |
| 13-03 | Created missing PartnerList and page.tsx (Rule 3) | Plan 13-02 dependencies missing, blocking form integration - created inline to unblock |
| 13-04 | Trade filtering fallback shows all partners if no matches | Prevents empty dropdown when trade categories don't perfectly match, allows manual override |
| 13-04 | Partner interface aligned with database schema | Use trade_categories (not trades), is_active, nullable email for consistency |
| 14-02 | BuildingSelectionId type exported for consistent typing | String, 'all', or null covers all selection states |
| 14-02 | Initial load auto-selects first building (not 'all') | Global view requires explicit user action per CONTEXT.md |
| 14-02 | Placeholder view for 'all' selection | Full data loading support in 14-03 |
| 14-01 | DELETE restricted to kewa role only | Cascade delete is destructive - admin-only for safety |
| 14-01 | Cascade warning log but proceed with delete | Admin override pattern consistent with partners API |
| 14-03 | Client-side filtering for building_id via unit relation | Supabase doesn't support nested relation filtering in query builder |
| 14-03 | 'all' or missing building_id returns unfiltered data | Backward compatibility with existing API consumers |
| 14-05 | Liegenschaft converted to client component | Server components can't access BuildingContext; client-side API fetching required |
| 14-05 | Heatmap shows prompt when 'all' selected | Heatmap is building-specific view, can't aggregate across buildings |
| 15-01 | Extended Unit fields optional for backward compat | DB columns may not exist yet; optional prevents runtime errors |
| 15-01 | PATCH replaces PUT for REST consistency | Partial updates are the common case for unit edits |
| 15-01 | DELETE restricted to kewa role for safety | Cascade delete destructive; admin override with warning log |
| 15-02 | unit_id required for room listing | Rooms only make sense in unit context; prevents expensive full-table scans |
| 15-02 | condition not updatable via API | Condition is managed by Digital Twin automation from completed projects |
| 15-02 | kewa-only DELETE with history warning | Cascade delete of history is destructive; admin override but logged |
| 15-03 | Unit list filters to apartments and common areas only | Parking spots shown in separate section on liegenschaft page |
| 15-03 | View button navigates to existing wohnungen/[id] detail page | Reuse existing unit detail page rather than creating new one |
| 15-03 | Vacancy auto-derived when no tenant name, with manual override | Matches CONTEXT.md vacancy logic requirements |
| 15-04 | View button navigates to /dashboard/einheiten/[id] | Dedicated unit management page with room CRUD |
| 15-04 | Condition shown but not editable | Managed by Digital Twin automation from completed projects |
| 15-04 | Link to wohnungen/[id] for full timeline view | Reuse existing detailed timeline page |

### Pending Todos

None yet.

### Blockers/Concerns

- Migrations 045, 046 exist but are not committed (SEED-01)

## Session Continuity

Last session: 2026-01-24
Stopped at: Completed 15-04-PLAN.md (Unit Detail Page)
Resume file: None

---
*Next: Plan Phase 16 (Template-Management)*
