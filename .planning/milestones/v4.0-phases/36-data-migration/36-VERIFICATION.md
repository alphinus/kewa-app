---
phase: 36-data-migration
verified: 2026-02-18T09:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Run supabase db reset and validate row counts"
    expected: "2 orgs, 4 owners, 4 mandates, 17 org_members, 7 properties, 13+ users, hauswart has 13 permissions, zero NULL organization_id across 56 tables"
    why_human: "Docker Desktop was not running during execution — all three summaries confirm supabase db reset was deferred. SQL was statically verified only."
---

# Phase 36: Data Migration Verification Report

**Phase Goal:** All existing data belongs to KEWA AG organization with no NULL organization_id values remaining
**Verified:** 2026-02-18T09:00:00Z
**Status:** passed (with one human verification item for runtime confirmation)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Organization "KeWa AG" exists with slug "kewa-ag" and UUID 00000000-0000-0000-0010-000000000001 | VERIFIED | `080_seed_organizations.sql` L18-28: INSERT with exact UUID, name 'KeWa AG', slug 'kewa-ag' |
| 2 | KEWA AG owners (3) and GIMBA AG owner (1) exist with correct org assignment | VERIFIED | `080_seed_organizations.sql` L48-104: 4 owner INSERTs with correct organization_id FK |
| 3 | 4 mandates exist with correct owner chain and mandate_type | VERIFIED | `080_seed_organizations.sql` L112-165: 4 mandate INSERTs (rental x3, stwe x1) |
| 4 | All D5 users seeded with correct role_id and auth_method, cross-org users have 2 org_members rows | VERIFIED | `080_seed_organizations.sql` L174-531: 2 UPDATEs + 10 INSERTs + 17 org_members rows including is_default=false for cross-org |
| 5 | hauswart role exists with 13 permissions (no financial access) | VERIFIED | `079_hauswart_role.sql` L43-61: cross-join INSERT for exactly 13 permission codes, no costs/invoices/payments codes |
| 6 | All 7 properties have mandate_id and property_type set, zero NULL organization_id | VERIFIED | `081_seed_properties.sql` L31-249: 2 existing properties UPDATEd, 5 new properties INSERTed, all with mandate_id and property_type |
| 7 | Flat backfill covers all 56 non-template tables with `WHERE organization_id IS NULL` idempotency guard | VERIFIED | `081_seed_properties.sql` L262-353: DO block explicitly updates all 56 tables; template tables intentionally excluded |
| 8 | 082 verification DO block fails loudly if any NULL organization_id remains before ALTER | VERIFIED | `082_not_null_constraints.sql` L15-44: FOREACH loop raises EXCEPTION on first table with NULL count > 0 |
| 9 | NOT NULL constraints applied to all 56 non-template tables + properties.mandate_id + properties.property_type | VERIFIED | `082_not_null_constraints.sql` L71-142: 56 explicit ALTER TABLE organization_id SET NOT NULL + 2 for properties.mandate_id/property_type = 58 total ALTERs |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/079_hauswart_role.sql` | hauswart ENUM value, missing permissions, role record, 13 role_permissions | VERIFIED | 62 lines, contains ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hauswart', INSERT 5 permissions, INSERT role, cross-join permission assignment |
| `supabase/migrations/080_seed_organizations.sql` | Organizations, owners, mandates, users, org_members | VERIFIED | 532 lines, contains 'kewa-ag', 'gimba-ag', all sections complete |
| `supabase/migrations/081_seed_properties.sql` | Property/building/unit hierarchy + 56-table backfill | VERIFIED | 487 lines, contains 'Leweg 4', DO $$ backfill block with 56 UPDATE statements, WHERE organization_id IS NULL on all |
| `supabase/migrations/082_not_null_constraints.sql` | Verification DO block + NOT NULL on 56 tables | VERIFIED | 150 lines, contains SET NOT NULL, verification loop raises EXCEPTION on NULL, 58 ALTER TABLE statements |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `080_seed_organizations.sql` | organizations table | INSERT with deterministic UUIDs | VERIFIED | Pattern `00000000-0000-0000-0010-000000000001` present at L21 |
| `080_seed_organizations.sql` | organization_members table | INSERT mapping users to orgs | VERIFIED | 17 INSERT INTO organization_members statements (8 direct KEWA + 3 email-lookup KEWA + 4 direct GIMBA + 2 cross-org GIMBA) |
| `079_hauswart_role.sql` | roles + role_permissions tables | INSERT role + permission mapping | VERIFIED | INSERT INTO roles at L33, INSERT INTO role_permissions at L42 |
| `081_seed_properties.sql` | properties table | INSERT new + UPDATE existing with organization_id and mandate_id | VERIFIED | Pattern `00000000-0000-0000-0013` present at L57, both UPDATE statements for existing properties present |
| `081_seed_properties.sql` | all 56 tenant tables | flat UPDATE SET organization_id WHERE organization_id IS NULL | VERIFIED | DO block contains 56 UPDATE statements; count confirmed by grep |
| `081_seed_properties.sql` | tenant_users table | UPDATE unit_id assignments for Mueller, Schmidt, Weber | VERIFIED | L362-384: 3 UPDATE tenant_users + 1 INSERT for Markus Huber |
| `082_not_null_constraints.sql` | all 56 tenant tables | ALTER TABLE ... ALTER COLUMN organization_id SET NOT NULL | VERIFIED | 56 organization_id ALTER TABLE statements confirmed by count |
| `082_not_null_constraints.sql` | properties table | ALTER TABLE properties ALTER COLUMN mandate_id/property_type SET NOT NULL | VERIFIED | L72-73 explicit |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MIGR-01 | 36-01-PLAN.md | Seed KEWA AG organization, owners, mandates, users mapped to org_members | SATISFIED | `079_hauswart_role.sql` + `080_seed_organizations.sql`: organizations, owners, mandates, users, 17 org_members all present |
| MIGR-02 | 36-02-PLAN.md | Backfill organization_id across all tenant tables; mandate_id + property_type on properties | SATISFIED | `081_seed_properties.sql`: 56-table DO block backfill, properties all have mandate_id and property_type |
| MIGR-03 | 36-03-PLAN.md | Apply NOT NULL constraints after backfill verification | SATISFIED | `082_not_null_constraints.sql`: verification gate + 58 ALTER TABLE statements (56 org_id + 2 properties columns) |

No orphaned requirements — REQUIREMENTS.md maps only MIGR-01, MIGR-02, MIGR-03 to Phase 36, and all three are claimed by plans and verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | No TODOs, no empty implementations, no placeholder returns detected in any of the 4 migration files |

**Notable deviations auto-fixed (not anti-patterns):**
- `081_seed_properties.sql`: `contract_type` corrected from 'unlimited' (plan spec error) to 'residential' (matches 074 CHECK constraint). Rule 1 auto-fix.
- `081_seed_properties.sql`: Tenancy idempotency uses `WHERE NOT EXISTS` instead of bare `ON CONFLICT DO NOTHING` (tenancies has no unique constraint to conflict on). Rule 1 auto-fix.

### Human Verification Required

#### 1. Runtime Database Verification

**Test:** Start Docker Desktop, run `npx supabase db reset` from the project root, then execute the following SQL:
```sql
-- Organizations, owners, mandates
SELECT count(*) FROM organizations;       -- Expected: 2
SELECT count(*) FROM owners;              -- Expected: 4
SELECT count(*) FROM mandates;            -- Expected: 4

-- Users and org_members
SELECT count(*) FROM organization_members; -- Expected: 17

-- Hauswart permissions
SELECT count(*) FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'hauswart');
-- Expected: 13

-- Properties
SELECT count(*) FROM properties;         -- Expected: 7

-- Zero NULLs across all 56 tables (the 082 verification DO block serves as the test)
-- Migration applying cleanly = all NULLs resolved

-- NOT NULL enforcement test
INSERT INTO properties (name, organization_id) VALUES ('test', NULL);
-- Expected: ERROR: null value in column "organization_id" violates not-null constraint
```
**Expected:** All counts match, NULL insert rejected, migration chain applies without errors.
**Why human:** Docker Desktop was not running during execution of all three plans. Every SUMMARY explicitly states "`supabase db reset` could not be executed." All verification is static. The migrations are internally consistent and correct by analysis, but runtime confirmation is required for 100% confidence.

### Gaps Summary

No gaps identified. All four migration files exist, are substantive (not stubs), and are correctly wired:

- `079_hauswart_role.sql` — hauswart ENUM, 5 new permissions, role record, 13 permission assignments
- `080_seed_organizations.sql` — 2 orgs, 4 owners, 4 mandates, 10 new users + 2 updates, 17 org_members
- `081_seed_properties.sql` — 5 new properties with buildings/units, 2 existing property backfills, 56-table flat UPDATE, tenant assignments, tenancy records
- `082_not_null_constraints.sql` — verification gate raises EXCEPTION on any NULL, then 58 explicit ALTER TABLE statements

The only caveat is the deferred runtime verification — Docker Desktop was unavailable during execution across all three plan waves, so `supabase db reset` was not run. The SQL is internally correct (namespace UUIDs consistent, FK ordering correct, idempotency guards on every insert, CHECK constraint values match schema definitions), but the database has not been reset against this full migration chain in a local Supabase instance.

All REQUIREMENTS.md requirement IDs assigned to Phase 36 (MIGR-01, MIGR-02, MIGR-03) are fully satisfied by artifacts with no orphaned requirements.

---
_Verified: 2026-02-18T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
