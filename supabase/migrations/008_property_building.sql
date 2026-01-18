-- KEWA Renovations Operations System
-- Migration: 008_property_building.sql
-- DATA-01: Property entity
-- DATA-02: Building enhancement with property relationship

-- =============================================
-- PROPERTY (Liegenschaft) ENTITY
-- =============================================

-- Property is the top-level entity (can contain multiple buildings)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BUILDING ENHANCEMENT
-- =============================================

-- Add property_id to buildings (nullable for migration)
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================
-- MIGRATION: Link existing building to default property
-- =============================================

-- Create default property for existing building
INSERT INTO properties (id, name, address)
SELECT
  gen_random_uuid(),
  'Liegenschaft KEWA',
  (SELECT address FROM buildings LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM properties);

-- Link existing building to the default property
UPDATE buildings
SET property_id = (SELECT id FROM properties LIMIT 1)
WHERE property_id IS NULL;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_buildings_property_id ON buildings(property_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

-- Reusable updated_at trigger function (if not exists from initial schema)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for properties
DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for buildings updated_at (since we added the column)
DROP TRIGGER IF EXISTS buildings_updated_at ON buildings;
CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE properties IS 'Property/Liegenschaft - top level entity that can contain multiple buildings';
COMMENT ON COLUMN buildings.property_id IS 'Foreign key to parent property';
COMMENT ON COLUMN buildings.updated_at IS 'Last modification timestamp';
