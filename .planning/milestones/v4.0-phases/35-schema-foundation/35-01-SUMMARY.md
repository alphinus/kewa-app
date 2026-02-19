---
phase: 35-schema-foundation
plan: 01
subsystem: database
tags: [postgres, supabase, multi-tenant, migrations, sql]

# Dependency graph
requires: []
provides:
  - organizations table (slug, is_active, Swiss legal fields: uid, vat_number, commercial_register, bank_account, country)
  - organization_members table (UNIQUE on org+user, partial index on is_default, role_id FK)
  - owners table (owner_type CHECK: person/company/community/stwe_association, nullable user_id)
  - mandates table (mandate_type CHECK: rental/stwe/mixed, temporal start_date/end_date)
  - tenancies table (Swiss rental law fields: base_rent, ancillary_costs, deposit_amount, notice_period_months, reference_interest_rate)
affects:
  - 35-02 (adds organization_id FK to properties, buildings, units)
  - 35-03 (adds organization_id FK to tasks, projects, work orders)
  - 35-04 (STWE schema extensions referencing organizations)
  - All subsequent phases that denormalize organization_id

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IF NOT EXISTS on all DDL for idempotent migrations"
    - "text + CHECK for enum-like columns (no CREATE TYPE) — consistent with existing schema"
    - "Temporal contracts: end_date NULL = ongoing, no DATERANGE to avoid Supabase TS generation issues"
    - "Partial index on is_default for efficient user default org lookup"

key-files:
  created:
    - supabase/migrations/073_org_foundation.sql
    - supabase/migrations/074_tenancies.sql
  modified: []

key-decisions:
  - "All column names in English (D1 locked) — no German terms as column names"
  - "owner_type and mandate_type use text + CHECK, not CREATE TYPE enum (consistent with existing schema style)"
  - "organization_members.user_id nullable FK deferred (owner portal is future feature)"
  - "tenancies.organization_id has no ON DELETE CASCADE — intentional, org deletion should not cascade to tenancy records"
  - "DATERANGE avoided for ownership_period; use two DATE columns per RESEARCH.md Pitfall 6 (Supabase TS generation)"

patterns-established:
  - "Migration header comment block: KEWA v4.0, migration name, creates, requirements, phase"
  - "Index naming: idx_{table}_{column(s)} pattern"
  - "Swiss legal field pattern on org tables: uid, vat_number, commercial_register, bank_account, country"

requirements-completed: [SCHEMA-01, SCHEMA-02, SCHEMA-03]

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 35 Plan 01: Schema Foundation — Org, Owner, Mandate, Tenancy Tables Summary

**Two idempotent migration files establishing the multi-tenant boundary: organizations with Swiss legal fields, organization_members with role+default tracking, owners with 4-type classification, mandates with temporal contracts, and tenancies with Swiss rental law fields — all English column names.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-18T00:00:00Z
- **Completed:** 2026-02-18T00:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Migration 073 creates organizations, organization_members, owners, mandates — the top-level multi-tenant boundary that all Phase 35 plans reference
- Migration 074 creates tenancies with Swiss rental law fields (base_rent, ancillary_costs, deposit_amount, notice_period_months, reference_interest_rate) and contract_type CHECK
- All 5 new tables use IF NOT EXISTS for idempotency and are deployable to production without data changes to existing tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 073_org_foundation.sql** - `6b909f8` (feat)
2. **Task 2: Create 074_tenancies.sql** - `2c01bb7` (feat)

## Files Created/Modified

- `supabase/migrations/073_org_foundation.sql` - organizations, organization_members, owners, mandates tables with all indexes
- `supabase/migrations/074_tenancies.sql` - tenancies table with Swiss rental law fields and 4 indexes

## Decisions Made

- All column names in English per D1 (locked decision). German terms appear only in SQL comments for context, never as column identifiers.
- text + CHECK used for owner_type and mandate_type (consistent with existing schema style — not CREATE TYPE enum).
- tenancies.organization_id has no ON DELETE CASCADE because org deletion should not silently delete tenancy history.
- DATERANGE type avoided; two DATE columns used for temporal ranges (RESEARCH.md Pitfall 6: DATERANGE causes Supabase TypeScript generation failures).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 073 and 074 are the prerequisite foundation for plans 02-04 which add organization_id FKs to all existing tables
- organizations(id) is ready for FK references
- Plan 35-02 (properties, buildings, units migration) can proceed immediately

---
*Phase: 35-schema-foundation*
*Completed: 2026-02-18*
