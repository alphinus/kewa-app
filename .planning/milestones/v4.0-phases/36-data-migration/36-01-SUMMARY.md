---
phase: 36-data-migration
plan: 01
subsystem: database/migrations
tags: [sql, seed-data, rbac, multi-tenant, organizations, users]
dependency_graph:
  requires: [35-schema-foundation]
  provides: [hauswart-role, kewa-ag-org, gimba-ag-org, org-owners, org-mandates, org-members]
  affects: [roles, permissions, role_permissions, organizations, owners, mandates, users, organization_members]
tech_stack:
  added: []
  patterns: [deterministic-uuid-seeding, on-conflict-idempotency, cross-join-permission-assignment, email-lookup-for-existing-users]
key_files:
  created:
    - supabase/migrations/079_hauswart_role.sql
    - supabase/migrations/080_seed_organizations.sql
  modified: []
decisions:
  - "Used 0010 UUID namespace for organizations (avoids collision with 0001 buildings namespace)"
  - "Renamed existing user 00000000-0000-0000-0000-000000000001 to Rolf Kaelin (preserves FK references)"
  - "All new users receive role='kewa' placeholder (D8: legacy column NOT NULL, Phase 37 will drop)"
  - "Flurina Kaelin assigned 0020-...001 UUID; Rolf Kaelin reuses existing 0000-...001"
metrics:
  duration: "3 minutes"
  completed_date: "2026-02-18"
  tasks_completed: 2
  files_created: 2
---

# Phase 36 Plan 01: Hauswart Role + Master Data Seed Summary

**One-liner:** Hauswart ENUM value + 13 permissions + multi-tenant seed for 2 orgs, 4 owners, 4 mandates, 10 new users, 17 org_members rows using deterministic UUIDs.

## What Was Built

### 079_hauswart_role.sql
- `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hauswart'` — new ENUM value, outside transaction block (PostgreSQL requirement)
- INSERT 5 missing permissions: `buildings:read`, `rooms:read`, `inspections:read`, `inspections:create`, `inspections:update` (all absent from 022_rbac.sql)
- INSERT hauswart role record with `is_internal = true`
- Cross-join permission assignment for 13 codes: properties/buildings/units/rooms:read, tasks:read/create/update, work_orders:read, inspections:read/create/update, tickets:read/update
- No financial permissions (no costs:*, invoices:*, payments:*, reports:*, settings:*, users:*)

### 080_seed_organizations.sql
- 2 organizations with real Handelsregister data (KeWa AG CHE-135.108.414, GIMBA AG CHE-217.838.550)
- 4 owners: KeWa AG (company), Erbengemeinschaft Brunner (community), Pensionskasse Stadt Zuerich (company), Graber Immobilien GmbH (company)
- 4 mandates: Eigenverwaltung KEWA (rental), Mandat Brunner (rental), STWE Pensionskasse ZH (stwe), Verwaltung Graber (rental)
- 2 UPDATE: existing user renamed to Rolf Kaelin (admin), Imeri role changed to hauswart
- 10 INSERT users: Flurina Kaelin, Sandra Keller, Beat Steiner, Fritz Brunner (KEWA), Simon Graber, Lisa Meier, Markus Huber, Paolo Rossi (GIMBA), Mario Giacchino + Thomas Wyss (cross-org)
- UPDATE owners.user_id FK for Erbengemeinschaft Brunner → Fritz Brunner
- 17 organization_members rows: 11 KEWA + 6 GIMBA (Mario + Thomas in both)

## Verification Status

Docker Desktop not running — `supabase db reset` could not be executed. SQL reviewed statically:
- All UUIDs use correct namespace scheme (0010/0011/0012/0020)
- All INSERT patterns match existing migrations (022_rbac.sql, 063_seed_tenant_portal.sql)
- All ON CONFLICT clauses use specific column names per anti-pattern guidance
- Fritz Brunner inserted before owners.user_id UPDATE (correct ordering)
- Hauswart role INSERT after ENUM ADD VALUE (ENUM must exist first)
- 17 org_members count verified: 8 direct KEWA + 3 email-lookup KEWA + 4 direct GIMBA + 2 cross-org GIMBA

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create 079_hauswart_role.sql | 9090c2f | supabase/migrations/079_hauswart_role.sql |
| 2 | Create 080_seed_organizations.sql | f422640 | supabase/migrations/080_seed_organizations.sql |

## Self-Check: PASSED

- supabase/migrations/079_hauswart_role.sql: FOUND
- supabase/migrations/080_seed_organizations.sql: FOUND
- .planning/phases/36-data-migration/36-01-SUMMARY.md: FOUND
- Commit 9090c2f: FOUND
- Commit f422640: FOUND
