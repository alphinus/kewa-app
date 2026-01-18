# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-18)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle über alle Renovationen — mit standardisierten Workflows, externer Handwerker-Integration, Kostenübersicht und automatischer Zustandshistorie.
**Current focus:** v2.0 Renovation Operations System — Phase 7 ready

## Current Position

Phase: 7 (Foundation & Data Model)
Plan: 3 of 5 complete (07-03 done, Wave 1 in progress)
Status: IN PROGRESS
Last activity: 2026-01-18 — Completed 07-03 Cost & Finance Model

Progress: █████░░░░░░░░░░░░ 20% (1/5 plans complete)

## Phase 7 Plans

| Plan | Name | Wave | Scope | Requirements |
|------|------|------|-------|--------------|
| 07-01 | Tech Debt Fixes | 1 | small | DEBT-01 to DEBT-04 |
| 07-02 | Core Data Model | 1 | large | DATA-01 to DATA-09, DATA-14, DATA-15 |
| 07-03 | Cost & Finance Model | 1 | medium | DATA-10 to DATA-13 | COMPLETE |
| 07-04 | RBAC & Multi-Auth | 2 | large | AUTH-01 to AUTH-09 |
| 07-05 | Status Workflows & NFR | 2 | medium | STAT-01 to STAT-04, NFR-01 to NFR-06 |

**Wave 1:** Plans 01-03 run in parallel (no dependencies)
**Wave 2:** Plans 04-05 run in parallel (depend on Wave 1)

## v2.0 Milestone Scope

**Goal:** Transformation von Task-App zu vollständigem Renovations-Management-System

**Requirements:** 127 total
- Phase 1 MVP: 86 (Phases 7-12)
- Phase 2 Extensions: 19 (Phases 13-15)
- Phase 3 Advanced: 16 (Phases 16-18)

**Key Features:**
- Multi-Role RBAC (Admin, Manager, Accounting, Tenant, Contractor)
- Externe Handwerker via Magic-Link Portal
- Template-System (WBS mit Abhängigkeiten)
- Kosten-Workflow (Offer → Invoice → Payment)
- Digital Twin (automatische Raum-Condition)
- Dashboard (Heatmap, Timeline, Kosten)
- Parkplätze + Auslastung
- Push-Notifications (Phase 2)
- Mieter-Tickets (Phase 3)
- Offline-Support (Phase 3)

**Source:** KEWA-RENOVATION-OPS-SPEC_v1 + Original v2.0 Scope

## Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 7 | Foundation & Data Model | 38 | ○ Ready |
| 8 | Template System | 6 | ○ Pending |
| 9 | External Contractor Portal | 16 | ○ Pending |
| 10 | Cost & Finance | 9 | ○ Pending |
| 11 | History & Digital Twin | 5 | ○ Pending |
| 12 | Dashboard & Visualization | 18 | ○ Pending |
| **MVP Total** | | **92** | |
| 13 | Change Orders & Suppliers | 7 | ○ Pending |
| 14 | Inspection & Push | 8 | ○ Pending |
| 15 | Knowledge Base | 4 | ○ Pending |
| **Phase 2 Total** | | **19** | |
| 16 | Tenant Portal | 4 | ○ Pending |
| 17 | Offline Support | 5 | ○ Pending |
| 18 | Integrations & UX | 7 | ○ Pending |
| **Phase 3 Total** | | **16** | |

## Archives

v1 artifacts in `.planning/milestones/`:
- `v1-ROADMAP.md` — Full phase details
- `v1-REQUIREMENTS.md` — All v1 requirements
- `v1-MILESTONE-AUDIT.md` — Verification report

## Pending Setup Tasks

Before production deployment:
- Apply all migrations (001-006) to Supabase
- Create storage buckets (task-photos, task-audio)
- Configure .env.local with Supabase credentials
- Configure OPENAI_API_KEY for transcription
- Update PIN hashes in users table
- Deploy to Vercel

## Known Issues

- Next.js 16 middleware deprecation warning (DEBT-01)
- Turbopack intermittent build race conditions (DEBT-02)
- Inconsistent session fetching pattern (DEBT-03)

## Accumulated Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| Swiss VAT 7.7% default | 07-03 | KEWA operates in Switzerland |
| Auto-calculate tax/total via triggers | 07-03 | Reduces errors, ensures consistency |
| Payment status cascade | 07-03 | Payments auto-update invoice status |
| Expense requires entity link | 07-03 | Prevents orphan expenses |

## Session Continuity

Last session: 2026-01-18T01:00:08Z
Stopped at: Completed 07-03-PLAN.md (Cost & Finance Model)
Resume file: None

## Next Step

**Continue Phase 7 execution** — Wave 1 plans 01-02 may be in progress, then Wave 2 (04-05)
