-- KEWA Renovations Operations System
-- Migration: 055_purchase_order_allocations.sql
-- Purpose: Multi-property purchase order allocations with quantity splits
-- Phase: 20-supplier-advanced, Plan: 01

-- =============================================
-- PURCHASE ORDER ALLOCATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_order_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id),
  building_id UUID REFERENCES buildings(id),
  delivery_id UUID REFERENCES deliveries(id),

  -- Allocation amounts
  allocated_quantity DECIMAL(12,2) NOT NULL CHECK (allocated_quantity > 0),
  allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount >= 0),

  -- Delivery status
  delivered BOOLEAN DEFAULT FALSE,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT building_requires_property CHECK (building_id IS NULL OR property_id IS NOT NULL)
);

-- =============================================
-- ALLOCATION VALIDATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION validate_allocation_totals()
RETURNS TRIGGER AS $$
DECLARE
  total_allocated DECIMAL(12,2);
  po_total_amount DECIMAL(12,2);
BEGIN
  -- Get total allocated amount for this purchase order
  SELECT COALESCE(SUM(allocated_amount), 0)
  INTO total_allocated
  FROM purchase_order_allocations
  WHERE purchase_order_id = NEW.purchase_order_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- Add current allocation
  total_allocated := total_allocated + NEW.allocated_amount;

  -- Get purchase order total
  SELECT total_amount INTO po_total_amount
  FROM purchase_orders
  WHERE id = NEW.purchase_order_id;

  -- Check if total exceeds PO amount
  IF total_allocated > po_total_amount THEN
    RAISE EXCEPTION 'Allocation exceeds purchase order total: allocated=% vs po_total=%',
      total_allocated, po_total_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ALLOCATION VALIDATION TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS purchase_order_allocations_validate ON purchase_order_allocations;
CREATE TRIGGER purchase_order_allocations_validate
  BEFORE INSERT OR UPDATE OF allocated_amount ON purchase_order_allocations
  FOR EACH ROW EXECUTE FUNCTION validate_allocation_totals();

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS purchase_order_allocations_updated_at ON purchase_order_allocations;
CREATE TRIGGER purchase_order_allocations_updated_at
  BEFORE UPDATE ON purchase_order_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_purchase_order_allocations_po ON purchase_order_allocations(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_allocations_property ON purchase_order_allocations(property_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE purchase_order_allocations IS 'Splits multi-property purchase orders across properties with quantity and amount allocation';
COMMENT ON COLUMN purchase_order_allocations.allocated_quantity IS 'Quantity allocated to this property (in PO units)';
COMMENT ON COLUMN purchase_order_allocations.allocated_amount IS 'Amount allocated to this property (in PO currency)';
COMMENT ON COLUMN purchase_order_allocations.delivered IS 'True when delivery_id is set and linked';
COMMENT ON COLUMN purchase_order_allocations.delivery_id IS 'Link to delivery for this allocation';
COMMENT ON FUNCTION validate_allocation_totals IS 'Validates that sum of allocated_amount does not exceed purchase_orders.total_amount';
