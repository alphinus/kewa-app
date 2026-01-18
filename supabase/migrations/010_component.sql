-- KEWA Renovations Operations System
-- Migration: 010_component.sql
-- DATA-05: Component entity for granular tracking

-- =============================================
-- COMPONENT TYPE ENUM
-- =============================================

-- Component types for granular room element tracking
CREATE TYPE component_type AS ENUM (
  'floor',
  'walls',
  'ceiling',
  'windows',
  'doors',
  'electrical',
  'plumbing',
  'heating',
  'ventilation',
  'kitchen_appliances',
  'bathroom_fixtures',
  'other'
);

-- =============================================
-- COMPONENTS TABLE
-- =============================================

-- Optional granular tracking of room elements (Boden, Waende, Fenster)
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_type component_type NOT NULL,

  -- Condition tracking (reuses room_condition enum)
  condition room_condition DEFAULT 'old',
  condition_updated_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_components_room_id ON components(room_id);
CREATE INDEX IF NOT EXISTS idx_components_type ON components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_condition ON components(condition);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS components_updated_at ON components;
CREATE TRIGGER components_updated_at
  BEFORE UPDATE ON components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE components IS 'Optional granular tracking of room elements (floor, walls, windows, etc.)';
COMMENT ON COLUMN components.component_type IS 'Type of component within the room';
COMMENT ON COLUMN components.condition IS 'Current condition (old/partial/new)';
