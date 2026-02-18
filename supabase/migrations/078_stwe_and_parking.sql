-- KEWA v4.0: Multi-Tenant Schema Foundation
-- Migration: 078_stwe_and_parking.sql
-- Adds STWE preparation fields (English names per D1) and normalizes parking unit_type
-- Requirements: SCHEMA-06
-- Phase 35: Schema Foundation
--
-- NAMING: English column names required per CONTEXT.md D1.
-- REQUIREMENTS.md SCHEMA-06 uses German names — those are OVERRIDDEN by D1.
-- Use: ownership_fraction, ownership_period_start, ownership_period_end
--      renewal_fund_balance, renewal_fund_target

-- ============================================================
-- SECTION 1: STWE fields on units table (D6)
-- ============================================================

ALTER TABLE units
  -- Wertquote / Ownership fraction (e.g., 0.2500 = 25% of building)
  ADD COLUMN IF NOT EXISTS ownership_fraction DECIMAL(5,4),
  -- Eigentumsperiode as two DATE columns (NOT DATERANGE — Supabase TS gen issue, see RESEARCH.md Pitfall 6)
  ADD COLUMN IF NOT EXISTS ownership_period_start DATE,
  ADD COLUMN IF NOT EXISTS ownership_period_end DATE,
  -- STWE unit-owner FK — owners table created in migration 073
  ADD COLUMN IF NOT EXISTS stwe_owner_id UUID REFERENCES owners(id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_stwe_owner
  ON units(stwe_owner_id) WHERE stwe_owner_id IS NOT NULL;

COMMENT ON COLUMN units.ownership_fraction IS
  'STWE: Ownership fraction of the building (e.g., 0.2500 = 25%). Wertquote in Swiss law.';
COMMENT ON COLUMN units.ownership_period_start IS
  'STWE: Start of ownership period. Part of Eigentumsperiode. Two columns used instead of DATERANGE for TypeScript compatibility.';
COMMENT ON COLUMN units.ownership_period_end IS
  'STWE: End of ownership period. NULL = ongoing ownership.';
COMMENT ON COLUMN units.stwe_owner_id IS
  'STWE: Reference to the owner entity (Stockwerkeigentuemer). Nullable: only set for STWE units.';

-- ============================================================
-- SECTION 2: STWE fields on properties table (D6)
-- ============================================================

ALTER TABLE properties
  -- Erneuerungsfonds (renewal fund) — common in STWE condominiums
  ADD COLUMN IF NOT EXISTS renewal_fund_balance DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_fund_target DECIMAL(12,2);

COMMENT ON COLUMN properties.renewal_fund_balance IS
  'STWE: Current balance of the renewal fund (Erneuerungsfonds). English name per D1.';
COMMENT ON COLUMN properties.renewal_fund_target IS
  'STWE: Target balance for the renewal fund. NULL = no target set.';

-- ============================================================
-- SECTION 3: Parking unit_type extension (D7)
-- ============================================================
-- Current constraint (migration 039): CHECK (unit_type IN ('apartment', 'common_area', 'building', 'parking_spot'))
-- Target: CHECK (unit_type IN ('apartment', 'common_area', 'building', 'parking', 'garage', 'storage'))
--
-- CRITICAL ORDER:
-- 1. Drop old constraint first
-- 2. Rename data (UPDATE)
-- 3. Add new constraint
-- This order ensures the UPDATE doesn't violate either constraint during transition.

-- Step 1: Drop old CHECK constraint
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_unit_type_check;

-- Step 2: Rename existing parking_spot rows to parking
-- (Migration 039 seeded 8 parking spots as 'parking_spot')
UPDATE units SET unit_type = 'parking' WHERE unit_type = 'parking_spot';

-- Step 3: Add new CHECK constraint with expanded values
ALTER TABLE units ADD CONSTRAINT units_unit_type_check
  CHECK (unit_type IN ('apartment', 'common_area', 'building', 'parking', 'garage', 'storage'));

COMMENT ON CONSTRAINT units_unit_type_check ON units IS
  'Unit types: apartment, common_area, building (common), parking, garage, storage';

-- Step 4: Update partial indexes that filtered on old unit_type value
-- Migration 039 created two partial indexes filtering on unit_type = 'parking_spot'
DROP INDEX IF EXISTS idx_units_parking_status;
DROP INDEX IF EXISTS idx_units_parking_number;

-- Recreate with corrected type name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_parking_status
  ON units(parking_status) WHERE unit_type = 'parking';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_parking_number
  ON units(building_id, parking_number) WHERE unit_type = 'parking';
