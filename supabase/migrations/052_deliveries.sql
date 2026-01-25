-- KEWA Renovations Operations System
-- Migration: 052_deliveries.sql
-- Purpose: Deliveries tracking for purchase orders
-- Phase: 19-supplier-core, Plan: 01

-- =============================================
-- DELIVERIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),

  -- Delivery details
  delivery_date DATE NOT NULL,
  delivery_note_number TEXT, -- Lieferschein-Nr.

  -- Quantity tracking
  quantity_ordered DECIMAL(12,2) NOT NULL,
  quantity_received DECIMAL(12,2) NOT NULL,
  quantity_unit TEXT NOT NULL DEFAULT 'Tonnen',

  -- Variance detection (computed column)
  has_variance BOOLEAN GENERATED ALWAYS AS (quantity_received != quantity_ordered) STORED,
  variance_note TEXT,

  -- Location association
  property_id UUID REFERENCES properties(id),
  building_id UUID REFERENCES buildings(id),

  -- Invoice linkage
  invoice_id UUID REFERENCES invoices(id),

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: building requires property
  CONSTRAINT building_requires_property CHECK (building_id IS NULL OR property_id IS NOT NULL)
);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS deliveries_updated_at ON deliveries;
CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_deliveries_purchase_order ON deliveries(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_property ON deliveries(property_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_invoice ON deliveries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date DESC);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE deliveries IS 'Tracks deliveries against purchase orders with quantity variance detection';
COMMENT ON COLUMN deliveries.delivery_note_number IS 'Supplier delivery note number (Lieferschein-Nr.)';
COMMENT ON COLUMN deliveries.quantity_ordered IS 'Quantity originally ordered for this delivery';
COMMENT ON COLUMN deliveries.quantity_received IS 'Actual quantity received';
COMMENT ON COLUMN deliveries.quantity_unit IS 'Unit of measurement (default: Tonnen for heating oil/pellets)';
COMMENT ON COLUMN deliveries.has_variance IS 'Computed: true when received differs from ordered';
COMMENT ON COLUMN deliveries.variance_note IS 'Explanation for quantity variance';
COMMENT ON COLUMN deliveries.property_id IS 'Property where delivery was made';
COMMENT ON COLUMN deliveries.building_id IS 'Specific building within property (requires property_id)';
COMMENT ON COLUMN deliveries.invoice_id IS 'Link to supplier invoice for this delivery';
