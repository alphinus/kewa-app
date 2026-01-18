-- KEWA Renovations Operations System
-- Migration: 009_unit_room.sql
-- DATA-03: Unit rent tracking
-- DATA-04: Room entity with type classification

-- =============================================
-- ROOM TYPE ENUM
-- =============================================

-- Room types for classification
CREATE TYPE room_type AS ENUM (
  'bathroom',
  'kitchen',
  'bedroom',
  'living_room',
  'hallway',
  'balcony',
  'storage',
  'laundry',
  'garage',
  'office',
  'other'
);

-- =============================================
-- ROOM CONDITION ENUM (for Digital Twin - Phase 11)
-- =============================================

CREATE TYPE room_condition AS ENUM ('old', 'partial', 'new');

-- =============================================
-- UNIT ENHANCEMENT: Rent tracking
-- =============================================

ALTER TABLE units
ADD COLUMN IF NOT EXISTS rent_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rent_currency TEXT DEFAULT 'CHF',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at trigger to units
DROP TRIGGER IF EXISTS units_updated_at ON units;
CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROOMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type room_type NOT NULL DEFAULT 'other',

  -- Digital Twin condition tracking (Phase 11)
  condition room_condition DEFAULT 'old',
  condition_updated_at TIMESTAMPTZ,
  condition_source_project_id UUID,  -- Which project updated the condition

  -- Physical attributes
  area_sqm DECIMAL(8,2),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_rooms_unit_id ON rooms(unit_id);
CREATE INDEX IF NOT EXISTS idx_rooms_condition ON rooms(condition);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON rooms(room_type);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS rooms_updated_at ON rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE rooms IS 'Individual rooms within a unit for granular tracking';
COMMENT ON COLUMN rooms.room_type IS 'Classification of room type';
COMMENT ON COLUMN rooms.condition IS 'Digital Twin: current condition (old/partial/new)';
COMMENT ON COLUMN rooms.condition_source_project_id IS 'Project that last updated the condition';
COMMENT ON COLUMN units.rent_amount IS 'Monthly rent for this unit in CHF';
COMMENT ON COLUMN units.rent_currency IS 'Currency for rent (default CHF)';
