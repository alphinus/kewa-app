# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Immobilienverwaltungen haben volle Transparenz und Kontrolle ueber alle Renovationen -- mit standardisierten Workflows, mandantenfaehiger Datentrennung, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** v4.0 Multi-Tenant Data Model & Navigation -- Phase 35 in progress (Plan 01 complete)

## Current Position

Phase: 35 of 40 (Schema Foundation)
Plan: 01 complete, 02 next
Status: In progress
Last activity: 2026-02-18 -- Plan 35-01 complete: org foundation + tenancies migrations

Progress: [##############################..........] 34/40 phases across all milestones

## Milestones Completed

- v1.0 MVP (2025-03-XX) -- Phases 1-6
- v2.0 Advanced Features (2026-01-19) -- Phases 7-12.3
- v2.1 Master Data Management (2026-01-25) -- Phases 13-17
- v2.2 Extensions (2026-01-29) -- Phases 18-24
- v3.0 Tenant & Offline (2026-02-03) -- Phases 25-29
- v3.1 Production Hardening (2026-02-17) -- Phases 30-34

**Total:** 34 phases, 128 plans shipped across 6 milestones

## Performance Metrics

**Velocity:**
- Total plans completed: 128
- Metrics from previous milestones -- see milestone archives

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v4.0: PIN-based auth stays; RLS context via set_config()/current_setting() not auth.jwt()
- v4.0: Denormalize organization_id to all ~68 tables (direct equality > subquery joins)
- v4.0: Keep UUID PKs, use triggers for org_id sync (not compound PKs)
- v4.0: Zero-downtime migration: nullable > backfill > NOT NULL > RLS
- 35-01: owner_type and mandate_type use text + CHECK (not CREATE TYPE enum) -- consistent with schema style
- 35-01: DATERANGE avoided for temporal ranges; use two DATE columns (Supabase TS generation Pitfall 6)
- 35-01: tenancies.organization_id has no ON DELETE CASCADE -- intentional (org deletion must not cascade to tenancy history)

### Blockers/Concerns

- PgBouncer + SET LOCAL interaction needs validation in staging (SET LOCAL is transaction-scoped but PostgREST may not wrap each API call in explicit transaction)
- 7 tables already have RLS enabled (029_rls_policies.sql) using is_internal_user(auth.uid()) which returns NULL for PIN-auth -- need audit
- quality_gates table missing in production DB (migration 072 skipped)

### Tech Debt

- useInstallPrompt timer cleanup missing (warning severity)
- Emergency contact schema extension needed (info severity)

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 35-01-PLAN.md (org foundation + tenancies migrations)
Resume file: None

---
*v4.0 Multi-Tenant Data Model & Navigation -- Phase 35 Plan 01 complete, Plan 02 next*
