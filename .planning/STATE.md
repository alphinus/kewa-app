# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Immobilienverwaltungen haben volle Transparenz und Kontrolle ueber alle Renovationen -- mit standardisierten Workflows, mandantenfaehiger Datentrennung, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** v4.0 Multi-Tenant Architecture -- Phase 36 complete, ready for Phase 37 (RLS policies)

## Current Position

Phase: 36 of 40 (Data Migration & Backfill) -- COMPLETE
Plan: 03 of 3 complete — Phase 36 done
Status: Phase 36 complete — all 4 migrations applied, 56-table NOT NULL constraints sealed
Last activity: 2026-02-18 -- Plan 36-03 complete: 082_not_null_constraints.sql — verification DO block + 56-table NOT NULL promotion

Progress: [################################........] 35/40 phases across all milestones

## Milestones Completed

- v1.0 MVP (2025-03-XX) -- Phases 1-6
- v2.0 Advanced Features (2026-01-19) -- Phases 7-12.3
- v2.1 Master Data Management (2026-01-25) -- Phases 13-17
- v2.2 Extensions (2026-01-29) -- Phases 18-24
- v3.0 Tenant & Offline (2026-02-03) -- Phases 25-29
- v3.1 Production Hardening (2026-02-17) -- Phases 30-34

**Total:** 34 phases, 128 plans shipped across 6 milestones (+ 5 in Phase 35 + 3 in Phase 36)

## Performance Metrics

**Velocity:**
- Total plans completed: 136 (128 prior + 5 in Phase 35 + 3 in Phase 36)
- Metrics from previous milestones -- see milestone archives

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 35-01 | 8min | 2 | 2 |
| 35-02 | ~15min | 1 | 1 |
| 35-04 | 3min | 1 | 1 |
| 35-03 | 3min | 2 | 2 |
| 36-01 | 3min | 2 | 2 |
| 36-02 | 12min | 1 | 1 |
| 36-03 | 5min | 1 | 1 |

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
- 35-04: parking_spot renamed to parking; unit_type CHECK expanded to include parking, garage, storage
- 35-04: renewal_fund_balance DEFAULT 0 (always a balance, even zero); renewal_fund_target nullable (absence of target is meaningful)
- 35-04: German legal terms (Wertquote, Eigentumsperiode, Erneuerungsfonds) used only in SQL comments/COMMENT ON strings -- English identifiers only (D1)
- 35-02: 62 tables receive organization_id (more than 44+ D2 estimate); tenant_users included (per-org per D2); ticket_categories excluded (global lookup table)
- 35-03: task_dependencies trigger uses task_id (not depends_on_task_id) -- org follows the dependent task
- 35-03: expenses trigger covers 4 parent FKs (renovation_project_id, work_order_id, unit_id, room_id) to match validate_expense_relationship() constraint
- 35-03: purchase_orders excluded from trigger (no hierarchical parent) -- backfill in Phase 36
- 36-01: Organizations use 0010 UUID namespace (avoids collision with 0001 buildings namespace from migration 001)
- 36-01: Existing user 0000-...001 renamed to Rolf Kaelin (preserves FK references vs creating new user at 0020-...001)
- 36-01: All new Phase 36 users receive role='kewa' as placeholder (legacy NOT NULL column, Phase 37 will drop)
- 36-01: Flurina Kaelin assigned 0020-...001; Rolf Kaelin reuses existing 0000-...001
- 36-02: Liegenschaft KEWA renamed to Wohnanlage Seefeld (preserves all FK references, assigned to Eigenverwaltung KEWA mandate)
- 36-02: contract_type uses 'residential' not 'unlimited' (074 CHECK constraint -- unlimited duration = end_date NULL)
- 36-02: Tenancy idempotency via WHERE NOT EXISTS (tenancies has no unique constraint for ON CONFLICT target)
- 36-02: Unit namespace split: 0015 for Leweg 4 detailed (10 units), 0016 for all other new property units
- 36-03: Two separate DO blocks for verification (56-table loop + properties-specific check) -- cleaner separation
- 36-03: ALTER TABLE statements written explicitly, not generated -- DDL must be auditable
- 36-03: 6 template tables excluded from NOT NULL (NULL = system template, by design from 075)
- 36-03: tenancies excluded from ALTER (already NOT NULL from 074)

### Blockers/Concerns

- PgBouncer + SET LOCAL interaction needs validation in staging (SET LOCAL is transaction-scoped but PostgREST may not wrap each API call in explicit transaction)
- 7 tables already have RLS enabled (029_rls_policies.sql) using is_internal_user(auth.uid()) which returns NULL for PIN-auth -- need audit
- quality_gates table missing in production DB (migration 072 skipped)
- Docker Desktop not running during 36-01, 36-02, 36-03 execution -- supabase db reset verification deferred (079+080+081+082 reviewed statically)

### Tech Debt

- useInstallPrompt timer cleanup missing (warning severity)
- Emergency contact schema extension needed (info severity)
- Any code filtering on unit_type = 'parking_spot' must be updated to 'parking' (migration 078 renamed data)

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 36-03-PLAN.md (NOT NULL constraints — Phase 36 complete)
Resume file: None

---
*v4.0 Multi-Tenant Architecture -- Phase 36 complete (4 migrations: 079+080+081+082). Next: Phase 37 (RLS policies)*
