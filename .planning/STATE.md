# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-18)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** v2.0 Renovation Operations System — Phase 9 IN PROGRESS

## Current Position

Phase: 9 of 18 (External Contractor Portal)
Plan: 2 of 5 complete
Status: In progress - Wave 1 complete
Last activity: 2026-01-18 — Completed 09-02-PLAN.md (Contractor Dashboard Transformation)

Progress: [==] 40% (2/5 plans complete in Phase 9)

## Phase 9 Plans

| Plan | Name | Wave | Scope | Status |
|------|------|------|-------|--------|
| 09-01 | WorkOrder Creation & PDF Generation | 1 | medium | COMPLETE |
| 09-02 | Contractor Dashboard Transformation | 1 | medium | COMPLETE |
| 09-03 | Response Actions & Counter-Offer Flow | 2 | medium | Pending |
| 09-04 | Contractor File Uploads | 2 | medium | Pending |
| 09-05 | Tracking & Event Logging | 3 | small | Pending |

**Wave 1:** COMPLETE (Plans 01-02)
**Wave 2:** Pending (Plans 03-04) — parallel execution
**Wave 3:** Pending (Plan 05)

## v2.0 Milestone Scope

**Goal:** Transformation von Task-App zu vollstaendigem Renovations-Management-System

**Requirements:** 127 total
- Phase 1 MVP: 86 (Phases 7-12)
- Phase 2 Extensions: 19 (Phases 13-15)
- Phase 3 Advanced: 16 (Phases 16-18)

**Key Features:**
- Multi-Role RBAC (Admin, Manager, Accounting, Tenant, Contractor)
- Externe Handwerker via Magic-Link Portal
- Template-System (WBS mit Abhaengigkeiten)
- Kosten-Workflow (Offer -> Invoice -> Payment)
- Digital Twin (automatische Raum-Condition)
- Dashboard (Heatmap, Timeline, Kosten)
- Parkplaetze + Auslastung
- Push-Notifications (Phase 2)
- Mieter-Tickets (Phase 3)
- Offline-Support (Phase 3)

**Source:** KEWA-RENOVATION-OPS-SPEC_v1 + Original v2.0 Scope

## Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 7 | Foundation & Data Model | 38 | COMPLETE |
| 8 | Template System | 6 | COMPLETE |
| 9 | External Contractor Portal | 16 | In Progress |
| 10 | Cost & Finance | 9 | Pending |
| 11 | History & Digital Twin | 5 | Pending |
| 12 | Dashboard & Visualization | 18 | Pending |
| **MVP Total** | | **92** | |
| 13 | Change Orders & Suppliers | 7 | Pending |
| 14 | Inspection & Push | 8 | Pending |
| 15 | Knowledge Base | 4 | Pending |
| **Phase 2 Total** | | **19** | |
| 16 | Tenant Portal | 4 | Pending |
| 17 | Offline Support | 5 | Pending |
| 18 | Integrations & UX | 7 | Pending |
| **Phase 3 Total** | | **16** | |

## Archives

v1 artifacts in `.planning/milestones/`:
- `v1-ROADMAP.md` — Full phase details
- `v1-REQUIREMENTS.md` — All v1 requirements
- `v1-MILESTONE-AUDIT.md` — Verification report

## Pending Setup Tasks

Before production deployment:
- Apply all migrations (001-036) to Supabase
- Create storage buckets (task-photos, task-audio, documents, media)
- Configure .env.local with Supabase credentials
- Configure OPENAI_API_KEY for transcription
- Update PIN hashes in users table
- Apply RLS policies via Supabase Dashboard
- Deploy to Vercel

## Known Issues

- ~~Next.js 16 middleware deprecation warning (DEBT-01)~~ FIXED
- ~~Turbopack intermittent build race conditions (DEBT-02)~~ FIXED
- ~~Inconsistent session fetching pattern (DEBT-03)~~ FIXED
- Next.js 16 middleware.ts file convention deprecated (proxy.ts migration future)
- Type errors in 07-04 auth routes (non-blocking, to be addressed)
- ~~Type export issues in templates.ts (TemplateCategory, TemplateScope need re-export)~~ FIXED (09-02)

## Accumulated Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| Response headers for user context | 07-01 | Next.js 16 deprecated request header mutation |
| Disable parallelServerCompiles | 07-01 | Prevents build race conditions |
| Unified session.ts module | 07-01 | Single source of truth, Edge-compatible |
| Swiss VAT 7.7% default | 07-03 | KEWA operates in Switzerland |
| Auto-calculate tax/total via triggers | 07-03 | Reduces errors, ensures consistency |
| Payment status cascade | 07-03 | Payments auto-update invoice status |
| Expense requires entity link | 07-03 | Prevents orphan expenses |
| Task v2.0 fields optional | 07-02 | Backward compatibility with existing API |
| Polymorphic media attachments | 07-02 | entity_type/entity_id pattern for flexibility |
| Multi-trade via array | 07-02 | Partners can have multiple trade skills |
| Room condition prep | 07-02 | Ready for Digital Twin (Phase 11) |
| 5 roles with granular permissions | 07-04 | RBAC system for fine-grained access control |
| 3 auth methods (PIN, Email, Magic Link) | 07-04 | Different user types need different auth flows |
| State machine via JSONB transition map | 07-05 | Declarative, easy to modify, trigger enforcement |
| Terminal 'approved' state for projects | 07-05 | Prevents accidental changes to finalized projects |
| Generic audit trigger for all tables | 07-05 | DRY - one function handles INSERT/UPDATE/DELETE |
| RLS with helper functions | 07-05 | Cleaner policy definitions, reusable across tables |
| System settings as key-value JSONB | 07-05 | Flexible configuration without schema changes |
| 44px minimum touch target | 07-05 | Apple HIG recommends 44pt for touch accessibility |
| 3-level WBS hierarchy | 08-01 | Standard PM structure: Phase > Package > Task |
| Template scope distinction | 08-01 | unit vs room scope for different template types |
| Duration calculation strategy | 08-01 | MAX for package (tasks overlap), SUM for phase |
| Soft-blocking quality gates | 08-01 | Gates advisory by default, optional blocking |
| Auto-generate WBS codes in editor | 08-02 | Reduce user error, maintain hierarchy consistency |
| Admin-only template write ops | 08-02 | Non-admin users can view but not edit templates |
| Atomic template application via PG function | 08-03 | Ensures all-or-nothing for phases, packages, tasks, deps, gates |
| Kahn's algorithm for cycle detection | 08-03 | O(V+E) complexity, clear cycle identification |
| Wizard pattern for template application | 08-03 | Complex process benefits from guided flow with preview |
| CSS Gantt over external library | 08-04 | Simpler, no license, full control |
| Lazy load GanttPreview | 08-04 | Improves initial page load performance |
| Week-based time scale | 08-04 | Matches Swiss construction planning practices |
| null approved_by = auto-approval | 08-04 | Distinguishes system from manual approval |
| @react-pdf/renderer for PDF | 09-01 | No Puppeteer needed, React-native syntax, ESM-compatible |
| 72h default acceptance deadline | 09-01 | Standard business response window for contractors |
| Mailto links instead of SMTP | 09-01 | Simpler deployment, user controls sending |
| Supabase array relation transform | 09-01 | Use first() helper to extract single elements |
| Query by partner email for dashboard | 09-02 | Shows ALL contractor work orders, not just token-linked |
| Status-aware token expiry | 09-02 | Active work orders never time-expire (contractor can bookmark) |
| Auto-mark viewed on dashboard load | 09-02 | Implements EXT-13 tracking requirement |
| Predefined rejection reasons | 09-02 | Standardizes rejection data for reporting |

## Session Continuity

Last session: 2026-01-18
Stopped at: Completed 09-02-PLAN.md (Contractor Dashboard Transformation)
Resume file: None

## Next Step

Continue Phase 9 execution. Wave 2 (Plans 03-04: Response Actions & Counter-Offer Flow, Contractor File Uploads) ready to execute in parallel.
