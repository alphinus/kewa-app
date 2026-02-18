---
phase: 35-schema-foundation
verified: 2026-02-18T00:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 35: Schema Foundation Verification Report

**Phase Goal:** Database schema supports multi-tenant data model with organizations, mandates, owners, tenancies, and organization_id on all tenant tables
**Verified:** 2026-02-18
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                        | Status     | Evidence                                                                                         |
|----|--------------------------------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------------|
| 1  | organizations table exists with slug, is_active, and Swiss legal fields (uid, vat_number, commercial_register, bank_account, country) | VERIFIED | 073_org_foundation.sql lines 11-23: all fields present, UNIQUE on slug                        |
| 2  | organization_members table exists with UNIQUE(organization_id, user_id) and partial index on is_default     | VERIFIED   | 073_org_foundation.sql lines 32-47: UNIQUE constraint line 39, partial index lines 45-47        |
| 3  | owners table exists with owner_type CHECK (person, company, community, stwe_association) and nullable user_id FK | VERIFIED | 073_org_foundation.sql lines 55-74: CHECK on lines 59, user_id nullable line 68               |
| 4  | mandates table exists with mandate_type CHECK (rental, stwe, mixed), start_date, end_date, is_active        | VERIFIED   | 073_org_foundation.sql lines 82-98: mandate_type CHECK line 88, start_date/end_date lines 89-90 |
| 5  | tenancies table exists with Swiss law fields (base_rent, ancillary_costs, deposit_amount, notice_period_months, reference_interest_rate, contract_type) | VERIFIED | 074_tenancies.sql lines 14-36: all 6 Swiss rental law fields present                    |
| 6  | All new tables use English column names — no German column names                                             | VERIFIED   | German terms appear only in SQL comments (-- Nettomiete) and COMMENT ON strings, never as identifiers |
| 7  | Every table in the D2 per-organization list has a nullable organization_id UUID column referencing organizations(id) | VERIFIED | 075_org_id_columns.sql: 62 ALTER TABLE statements, 64 CONCURRENTLY indexes, 0 NOT NULL constraints |
| 8  | properties table has mandate_id UUID FK, property_type CHECK (rental/stwe/mixed), and Swiss Grundbuch fields | VERIFIED   | 075_org_id_columns.sql lines 14-24: mandate_id, property_type CHECK, land_registry_nr, municipality, parcel_nr |
| 9  | All CREATE INDEX statements in 075 use CONCURRENTLY — no table locks                                         | VERIFIED   | 64 CREATE INDEX CONCURRENTLY confirmed, zero non-CONCURRENTLY indexes in 075                    |
| 10 | set_org_context('uuid') sets transaction-local config; current_organization_id() returns that UUID            | VERIFIED   | 076_rls_helpers.sql line 29: set_config('app.current_organization_id', org_id::text, true) with LOCAL=true |
| 11 | current_organization_id() returns NULL (not error) when no org context is set                                | VERIFIED   | 076_rls_helpers.sql line 15: NULLIF(current_setting('app.current_organization_id', true), '')::UUID |
| 12 | Inserting a building with property_id auto-populates building.organization_id from that property; BEFORE (not AFTER) trigger | VERIFIED | 077_org_sync_triggers.sql lines 21-35: trg_buildings_org_id BEFORE INSERT OR UPDATE OF property_id |
| 13 | STWE fields on units (ownership_fraction, ownership_period_start, ownership_period_end as DATE columns, stwe_owner_id) and properties (renewal_fund_balance, renewal_fund_target) use English names, no DATERANGE | VERIFIED | 078_stwe_and_parking.sql: all 6 fields present with English identifiers, no DATERANGE type |

**Score:** 13/13 truths verified

---

## Required Artifacts

| Artifact                                        | Provides                                                   | Status     | Details                                                                     |
|-------------------------------------------------|------------------------------------------------------------|------------|-----------------------------------------------------------------------------|
| `supabase/migrations/073_org_foundation.sql`    | organizations, organization_members, owners, mandates tables | VERIFIED | 99 lines, all 4 tables, 8 indexes, IF NOT EXISTS throughout                |
| `supabase/migrations/074_tenancies.sql`         | tenancies table with Swiss rental law fields               | VERIFIED   | 43 lines, tenancies table, 4 indexes, contract_type CHECK                  |
| `supabase/migrations/075_org_id_columns.sql`    | organization_id on all 62 per-organization tables          | VERIFIED   | 309 lines, 62 ALTER TABLE, 64 CONCURRENTLY indexes, 0 NOT NULL            |
| `supabase/migrations/076_rls_helpers.sql`       | current_organization_id() and set_org_context() functions  | VERIFIED   | 47 lines, both functions SECURITY DEFINER, NULLIF pattern, LOCAL flag      |
| `supabase/migrations/077_org_sync_triggers.sql` | 37 BEFORE triggers propagating org_id through hierarchy    | VERIFIED   | 501 lines, 37 CREATE TRIGGER, all BEFORE (no AFTER), no recursive UPDATEs |
| `supabase/migrations/078_stwe_and_parking.sql`  | STWE fields on units/properties, parking unit_type renamed | VERIFIED   | 88 lines, 6 STWE columns, parking_spot renamed, new CHECK constraint       |

---

## Key Link Verification

| From                              | To                          | Via                                                       | Status   | Details                                                                 |
|-----------------------------------|-----------------------------|-----------------------------------------------------------|----------|-------------------------------------------------------------------------|
| organization_members.organization_id | organizations(id)        | FK ON DELETE CASCADE                                      | WIRED    | 073_org_foundation.sql line 34: REFERENCES organizations(id) ON DELETE CASCADE |
| owners.organization_id            | organizations(id)           | FK ON DELETE CASCADE                                      | WIRED    | 073_org_foundation.sql line 57: REFERENCES organizations(id) ON DELETE CASCADE |
| mandates.owner_id                 | owners(id)                  | FK reference                                              | WIRED    | 073_org_foundation.sql line 85: REFERENCES owners(id)                  |
| tenancies.unit_id                 | units(id)                   | FK reference                                              | WIRED    | 074_tenancies.sql line 17: REFERENCES units(id)                        |
| properties.organization_id        | organizations(id)           | FK reference                                              | WIRED    | 075_org_id_columns.sql line 15: REFERENCES organizations(id)           |
| properties.mandate_id             | mandates(id)                | FK reference                                              | WIRED    | 075_org_id_columns.sql line 16: REFERENCES mandates(id)                |
| set_org_context()                 | current_organization_id()   | set_config('app.current_organization_id', org_id::text, true) | WIRED | 076_rls_helpers.sql line 29: set_config with true (LOCAL) flag        |
| trg_buildings_org_id              | properties.organization_id  | SELECT organization_id INTO NEW.organization_id FROM properties | WIRED | 077_org_sync_triggers.sql lines 24-27: correct SELECT INTO pattern    |
| trg_units_org_id                  | buildings.organization_id   | SELECT organization_id INTO NEW.organization_id FROM buildings | WIRED | 077_org_sync_triggers.sql lines 43-46: correct SELECT INTO pattern    |
| units.stwe_owner_id               | owners(id)                  | FK reference                                              | WIRED    | 078_stwe_and_parking.sql line 23: REFERENCES owners(id)                |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                                                   | Status    | Evidence                                                                                     |
|-------------|-------------|-------------------------------------------------------------------------------|-----------|----------------------------------------------------------------------------------------------|
| SCHEMA-01   | 35-01       | organizations and organization_members tables with indexes and UNIQUE constraint | SATISFIED | 073_org_foundation.sql: both tables with UNIQUE(organization_id, user_id) and partial index |
| SCHEMA-02   | 35-01       | owners and mandates tables with FK constraints and composite indexes           | SATISFIED | 073_org_foundation.sql: owners with owner_type CHECK, mandates with mandate_type CHECK and idx_mandates_org_active |
| SCHEMA-03   | 35-01       | tenancies table with organization_id, unit_id, indexes on org/unit/active      | SATISFIED | 074_tenancies.sql: 4 indexes including idx_tenancies_unit_active and idx_tenancies_org_active |
| SCHEMA-04   | 35-02       | nullable organization_id on all tenant tables; properties gets mandate_id, property_type | SATISFIED | 075_org_id_columns.sql: 62 tables covered (exceeds estimated 44), mandate_id and property_type on properties |
| SCHEMA-05   | 35-03       | current_organization_id() SECURITY DEFINER reading app.current_organization_id; set_org_context() with LOCAL flag | SATISFIED | 076_rls_helpers.sql: both functions, SECURITY DEFINER, NULLIF pattern, set_config with true |
| SCHEMA-06   | 35-04       | STWE fields on units and properties (NOTE: column names use English per CONTEXT.md D1, overriding German names in REQUIREMENTS.md) | SATISFIED | 078_stwe_and_parking.sql: ownership_fraction/ownership_period_start/ownership_period_end/stwe_owner_id on units; renewal_fund_balance/renewal_fund_target on properties |
| SCHEMA-07   | 35-03       | BEFORE INSERT/UPDATE triggers auto-propagating organization_id through hierarchy | SATISFIED | 077_org_sync_triggers.sql: 37 triggers, all BEFORE, column-specific UPDATE OF, no recursive UPDATEs |

**Note on SCHEMA-06:** REQUIREMENTS.md specifies German column names (`wertquote`, `eigentumsperiode DATERANGE`, `erneuerungsfonds_balance`). CONTEXT.md Decision D1 (locked) overrides this with English names (`ownership_fraction`, `ownership_period_start DATE + ownership_period_end DATE`, `renewal_fund_balance`). No DATERANGE type is used per Research Pitfall 6. The implementation satisfies the intent of SCHEMA-06; the naming deviation is an intentional architectural decision documented in D1.

**Orphaned requirements:** None. All SCHEMA-01 through SCHEMA-07 are claimed by plans 35-01, 35-02, 35-03, and 35-04.

---

## Anti-Patterns Found

| File                          | Line(s) | Pattern           | Severity | Impact   |
|-------------------------------|---------|-------------------|----------|----------|
| 074_tenancies.sql             | 10-11, 23-26 | German terms in SQL comments (Nettomiete, Nebenkosten-Akonto, Mietkaution, Kuendigungsfrist) | INFO | No impact — comments only, column identifiers are English |
| 078_stwe_and_parking.sql      | 17, 19, 29, 31, 42, 47 | German terms in SQL comments and COMMENT ON strings (Wertquote, Eigentumsperiode, Erneuerungsfonds) | INFO | No impact — German terms in string values for Swiss law documentation; column identifiers are English |
| 073_org_foundation.sql        | 16      | German term in comment (Unternehmens-Identifikationsnummer) | INFO | No impact — comment only |

No blockers. No warnings. All INFO items are intentional: German terms appear exclusively in SQL comments and COMMENT ON string values to document Swiss legal equivalents for maintainers. No German terms appear as column identifiers anywhere.

---

## Human Verification Required

None required. All checks are verifiable programmatically via SQL text analysis.

The following items would need human verification if the migrations were deployed, but are out of scope for schema-only verification:

1. **Transaction scope isolation** — Verify set_org_context() does not leak across PgBouncer connections. Requires a live database with connection pool.
2. **Trigger cascade correctness** — Verify inserting a building actually propagates org_id to units, tasks, work_orders through the full 8-level hierarchy. Requires a live database.

---

## Summary

Phase 35 achieved its goal. The database schema now fully supports the multi-tenant data model:

- **Foundation tables** (073): organizations with Swiss legal fields, organization_members with role assignment, owners with type classification, mandates with temporal contracts — all using English identifiers.
- **Tenancies** (074): Swiss rental law fields (base_rent, ancillary_costs, deposit_amount, notice_period_months, reference_interest_rate) with English names, FK to units.
- **Organization isolation** (075): organization_id added as nullable UUID FK to 62 existing tables (exceeding the estimated 44), all with CONCURRENTLY indexes. Zero NOT NULL constraints — Phase 36 handles backfill.
- **RLS helpers** (076): current_organization_id() and set_org_context() with correct SECURITY DEFINER, NULLIF pattern, and LOCAL (transaction-scoped) set_config flag. PgBouncer-safe.
- **Sync triggers** (077): 37 BEFORE triggers covering the full property→building→unit→project→task→work_order hierarchy. Column-specific UPDATE OF prevents infinite loops. No AFTER triggers, no recursive UPDATEs.
- **STWE preparation** (078): English-named STWE fields (ownership_fraction, two DATE columns instead of DATERANGE, stwe_owner_id FK, renewal fund fields), parking unit_type normalized from parking_spot to parking.

All 6 migration files are substantive (not stubs), properly wired via FK constraints and trigger functions, and idempotent (IF NOT EXISTS throughout). All 7 requirements SCHEMA-01 through SCHEMA-07 are satisfied.

---

_Verified: 2026-02-18_
_Verifier: Claude (gsd-verifier)_
