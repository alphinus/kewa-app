-- Parking spots extension for units table
-- Migration: 039_parking_spots.sql
-- Adds parking_spot type and parking-specific fields

-- =============================================
-- PARKING STATUS ENUM
-- =============================================
CREATE TYPE parking_status AS ENUM ('free', 'occupied', 'maintenance');

COMMENT ON TYPE parking_status IS 'Parking spot status: free, occupied by tenant, or under maintenance';

-- =============================================
-- EXTEND UNITS TABLE
-- =============================================

-- Add parking_spot to unit_type CHECK constraint
-- Note: PostgreSQL requires DROP/ADD for CHECK constraint modification
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_unit_type_check;
ALTER TABLE units ADD CONSTRAINT units_unit_type_check
  CHECK (unit_type IN ('apartment', 'common_area', 'building', 'parking_spot'));

-- Add parking-specific fields
ALTER TABLE units
ADD COLUMN IF NOT EXISTS parking_number INTEGER,
ADD COLUMN IF NOT EXISTS parking_status parking_status DEFAULT 'free';

-- Index for parking queries (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_units_parking_status
  ON units(parking_status)
  WHERE unit_type = 'parking_spot';

CREATE INDEX IF NOT EXISTS idx_units_parking_number
  ON units(building_id, parking_number)
  WHERE unit_type = 'parking_spot';

COMMENT ON COLUMN units.parking_number IS 'Parking spot number (1-8), only for unit_type=parking_spot';
COMMENT ON COLUMN units.parking_status IS 'Parking spot status: free, occupied, maintenance';

-- =============================================
-- SEED 8 PARKING SPOTS
-- =============================================
INSERT INTO units (building_id, name, unit_type, parking_number, parking_status)
SELECT
  b.id,
  'Parkplatz ' || n,
  'parking_spot',
  n,
  'free'
FROM buildings b
CROSS JOIN generate_series(1, 8) AS n
WHERE b.id = '00000000-0000-0000-0001-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM units u
    WHERE u.building_id = b.id AND u.unit_type = 'parking_spot'
  );

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON CONSTRAINT units_unit_type_check ON units IS
  'Unit types: apartment, common_area, building, parking_spot';
