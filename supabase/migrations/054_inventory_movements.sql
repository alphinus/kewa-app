-- KEWA Renovations Operations System
-- Migration: 054_inventory_movements.sql
-- Purpose: Inventory tracking for supplier consumables (oil, pellets)
-- Phase: 20-supplier-advanced, Plan: 01

-- =============================================
-- MOVEMENT TYPE ENUM
-- =============================================

DO $$ BEGIN
  CREATE TYPE inventory_movement_type AS ENUM (
    'delivery',
    'reading',
    'adjustment'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- INVENTORY MOVEMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  property_id UUID NOT NULL REFERENCES properties(id),
  building_id UUID REFERENCES buildings(id),
  delivery_id UUID REFERENCES deliveries(id),

  -- Movement tracking
  movement_type inventory_movement_type NOT NULL,
  movement_date DATE NOT NULL,

  -- Tank level tracking
  tank_level DECIMAL(12,2) NOT NULL,
  tank_capacity DECIMAL(12,2),
  level_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN tank_capacity > 0 THEN (tank_level / tank_capacity) * 100 ELSE NULL END
  ) STORED,

  -- Consumption calculations
  days_since_last DECIMAL(8,2),
  consumption_amount DECIMAL(12,2),
  daily_usage_rate DECIMAL(8,4),

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT building_requires_property CHECK (building_id IS NULL OR property_id IS NOT NULL),
  CONSTRAINT delivery_requires_delivery_id CHECK (movement_type != 'delivery' OR delivery_id IS NOT NULL)
);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS inventory_movements_updated_at ON inventory_movements;
CREATE TRIGGER inventory_movements_updated_at
  BEFORE UPDATE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_inventory_movements_property ON inventory_movements(property_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_delivery ON inventory_movements(delivery_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE inventory_movements IS 'Tracks inventory levels and consumption for supplier consumables (oil, pellets)';
COMMENT ON COLUMN inventory_movements.movement_type IS 'Type of movement: delivery (auto from deliveries), reading (manual tank check), adjustment (correction)';
COMMENT ON COLUMN inventory_movements.movement_date IS 'Date when movement/reading occurred';
COMMENT ON COLUMN inventory_movements.tank_level IS 'Current tank level in tonnes';
COMMENT ON COLUMN inventory_movements.tank_capacity IS 'Total tank capacity in tonnes (optional)';
COMMENT ON COLUMN inventory_movements.level_percentage IS 'Computed: (tank_level / tank_capacity) * 100';
COMMENT ON COLUMN inventory_movements.days_since_last IS 'Days elapsed since previous reading/delivery';
COMMENT ON COLUMN inventory_movements.consumption_amount IS 'Quantity consumed since last reading (in tonnes)';
COMMENT ON COLUMN inventory_movements.daily_usage_rate IS 'Computed: consumption_amount / days_since_last';
COMMENT ON COLUMN inventory_movements.delivery_id IS 'Link to delivery if movement_type=delivery';
