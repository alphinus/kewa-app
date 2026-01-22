# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** v2.1 Master Data Management — Stammdaten-Verwaltung

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements for v2.1
Last activity: 2026-01-22 — Milestone v2.1 started

Progress: [░░░░░░░░░░░░] 0% v2.1 starting

## v2.0 Milestone Summary

**Shipped:** 2026-01-19
**Phases:** 7-12.3 (9 phases, 31 plans)
**Requirements:** 91/92 (99%) — 1 deferred (EXT-15)

**Key Features Delivered:**
- Multi-Role RBAC (Admin, Manager, Accounting, Tenant, Contractor)
- External Contractor Portal (Magic-Link, PDF, Accept/Reject, Counter-Offers)
- Template System (WBS with phases, packages, tasks, dependencies)
- Cost & Finance (Offer → Invoice → Payment, CSV Export, Investment)
- Digital Twin (automatic room condition tracking)
- Property Dashboard (heatmap, occupancy, drilldown, comments)

## Archives

**v2.0 artifacts in `.planning/milestones/`:**
- `v2.0-ROADMAP.md` — Full phase details
- `v2.0-REQUIREMENTS.md` — All v2.0 requirements
- `v2.0-MILESTONE-AUDIT.md` — Verification report

**v1 artifacts in `.planning/milestones/`:**
- `v1-ROADMAP.md` — Full phase details
- `v1-REQUIREMENTS.md` — All v1 requirements
- `v1-MILESTONE-AUDIT.md` — Verification report

## Pending Setup Tasks

Before production deployment:
- Apply all migrations (001-044) to Supabase
- Create storage buckets (task-photos, task-audio, documents, media)
- Configure .env.local with Supabase credentials
- Configure OPENAI_API_KEY for transcription
- Update PIN hashes in users table
- Apply RLS policies via Supabase Dashboard
- Deploy to Vercel

## Known Issues / Tech Debt

- EXT-15: Automatic reminders deferred (requires background job infrastructure)
- QualityGateEditor/QualityGateProgress/DependencyEditor components ready but not wired
- CommentList/CommentForm components ready but not integrated into views
- Task room_id must be manually assigned for condition triggers
- Mock occupancy history data (needs occupancy_history table)
- Logo placeholder in contractor portal layout

## Next Steps

Choose one:

1. **Deploy MVP to Production**
   - Apply migrations to Supabase
   - Configure environment
   - Deploy to Vercel
   - User acceptance testing

2. **Start v2.1 Extensions**
   - `/gsd:discuss-milestone` — thinking partner for v2.1 scope
   - `/gsd:new-milestone` — create roadmap for Phase 2 (Phases 13-15)

**Recommended:** `/clear` first for fresh context window

## UAT Blocker Fixes

**09-06-PLAN.md:** Fixed middleware to validate path-based magic link tokens
- Middleware now extracts token from URL path, not query params
- Token validation happens before session check
- First-time contractor access now works without prior authentication
- Commit: a337996

**09-07-PLAN.md:** Integrated WorkOrderForm and WorkOrderSendDialog into admin UI
- Added "Auftrag erstellen" button to project detail page
- Created work order list page at /dashboard/auftraege
- Created work order create page with form integration
- Created work order detail page with send dialog
- Commits: acdb4b2, 9a0f807, c2cde63, 34a6a37

## Session Continuity

Last session: 2026-01-22
Stopped at: Starting v2.1 milestone — defining requirements
Resume file: None
