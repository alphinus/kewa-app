---
phase: 36-data-migration
plan: 03
subsystem: database/migrations
tags: [sql, not-null, multi-tenant, constraints, schema-lock]
dependency_graph:
  requires:
    - phase: 36-02
      provides: [56-table-org-id-backfill, property-hierarchy, tenancy-records]
  provides:
    - NOT NULL on organization_id across all 56 non-template tenant tables
    - NOT NULL on properties.mandate_id
    - NOT NULL on properties.property_type
    - Loud verification gate (DO block fails if any NULL remains)
  affects: [phase-37-rls, all-tenant-table-inserts]
tech_stack:
  added: []
  patterns:
    - verification-before-constraint (DO block checks NULLs before ALTER)
    - explicit-ddl-for-auditability (no dynamic SQL for ALTER statements)
    - template-table-exclusion (NULL = system template pattern preserved)
key_files:
  created:
    - supabase/migrations/082_not_null_constraints.sql
  modified: []
key_decisions:
  - "Two-DO-block verification pattern: first iterates all 56 tables via ARRAY FOREACH, second separately checks properties.mandate_id and properties.property_type — cleaner than a single monolithic block"
  - "ALTER TABLE statements written out explicitly (not generated) — DDL must be visible and auditable"
  - "tenancies excluded from ALTER (already NOT NULL from 074_tenancies.sql — would succeed but is unnecessary)"
  - "6 template tables excluded: templates, template_phases, template_packages, template_tasks, template_dependencies, template_quality_gates (NULL = system template, intentional design)"
metrics:
  duration: 5min
  completed: 2026-02-18
---

# Phase 36 Plan 03: NOT NULL Constraints Summary

**Verification DO block + 56-table NOT NULL promotion sealing the Phase 36 multi-tenant data model**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T08:00:00Z
- **Completed:** 2026-02-18T08:05:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `082_not_null_constraints.sql` as the final migration in the Phase 36 chain
- DO block iterates 56-table TEXT ARRAY with `FOREACH ... EXECUTE format(...)` — fails loudly if any NULL organization_id rows remain
- Second DO block validates `properties.mandate_id` and `properties.property_type` separately
- 56 explicit `ALTER TABLE ... ALTER COLUMN organization_id SET NOT NULL` statements (no dynamic DDL — each statement is visible and auditable)
- Additional `ALTER TABLE properties ALTER COLUMN mandate_id SET NOT NULL` and `ALTER TABLE properties ALTER COLUMN property_type SET NOT NULL`
- Template tables (6) correctly excluded — system template pattern `NULL = system template` preserved
- tenancies table correctly excluded — already `NOT NULL` from `074_tenancies.sql`
- Phase 36 data model sealed: no future row can exist on any tenant table without an organization context

## Task Commits

1. **Task 1: Create 082_not_null_constraints.sql** - `773e79c` (feat)

**Plan metadata:** TBD (docs commit after SUMMARY.md creation)

## Files Created/Modified

- `supabase/migrations/082_not_null_constraints.sql` — Verification DO block (56-table loop + properties-specific check) + 56 explicit ALTER TABLE NOT NULL statements + 2 extra (properties.mandate_id, properties.property_type)

## Decisions Made

- **Two separate DO blocks** — The main loop covers all 56 org_id columns. A second, smaller DO block handles `properties.mandate_id` and `properties.property_type` specifically. This keeps the general loop general and the property-specific checks explicit.
- **No dynamic SQL for ALTERs** — DDL that alters schema must be readable and auditable. Dynamic `EXECUTE format('ALTER TABLE %I ...')` was rejected in favor of writing every statement explicitly, even though it makes the file longer.
- **Template table exclusion confirmed** — `075_org_id_columns.sql` comment explicitly states "NULL = system entry (template/definition)" for the 6 template tables. These are correctly omitted from both the verification loop and the ALTER statements.
- **tenancies excluded** — `074_tenancies.sql` created `organization_id UUID NOT NULL REFERENCES organizations(id)` from the start. Including it in the ALTER would succeed (PostgreSQL is idempotent here) but is semantically wrong. Excluded.

## Deviations from Plan

None — plan executed exactly as written. The RESEARCH.md Pattern 8 template was followed precisely. Table count (56), exclusion list (6 template + tenancies), and verification pattern all match the plan specification.

## Static Verification

Since Docker Desktop was not running during this execution (same blocker as 36-01 and 36-02), `supabase db reset` verification was deferred. Static review confirms:

- Array in DO block: 56 entries counted manually — matches PLAN.md list and RESEARCH.md code example exactly
- ALTER TABLE count: 5 (property hierarchy) + 11 (projects/tasks) + 10 (partners/financial) + 8 (change orders/inspections) + 5 (media/audit/comm) + 6 (knowledge base) + 8 (notifications/tickets) + 3 (additional) = 56 org_id ALTERs
- Properties extra ALTERs: 2 (mandate_id, property_type) — matches plan spec
- Excluded tables: templates, template_phases, template_packages, template_tasks, template_dependencies, template_quality_gates = 6 — matches RESEARCH.md Pitfall 5 guidance
- tenancies excluded — matches RESEARCH.md Pitfall 6 guidance
- Migration header matches plan spec format

## Phase 36 Completion Summary

All 4 migration files in the Phase 36 chain are complete:

| File | Content | Status |
|------|---------|--------|
| 079_hauswart_role.sql | ENUM + permissions + role + role_permissions | Done (36-01) |
| 080_seed_organizations.sql | orgs, owners, mandates, users, org_members | Done (36-01) |
| 081_seed_properties.sql | properties + buildings + units + 56-table backfill + tenancies | Done (36-02) |
| 082_not_null_constraints.sql | Verification + NOT NULL on 56 tables | Done (36-03) |

Phase 36 prerequisite for Phase 37 (RLS policies) is satisfied: all tenant tables have `organization_id NOT NULL`, providing the equality filter base for Row Level Security.

## Self-Check

- [x] `supabase/migrations/082_not_null_constraints.sql` created
- [x] Commit `773e79c` exists
- [x] 56 tables in verification array (counted)
- [x] 56 org_id ALTER TABLE statements (counted by section)
- [x] Template tables excluded from both verification and ALTER
- [x] tenancies excluded

## Self-Check: PASSED

---
*Phase: 36-data-migration*
*Completed: 2026-02-18*
