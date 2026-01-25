-- KEWA Renovations Operations System
-- Migration: 051_purchase_orders.sql
-- Purpose: Purchase Orders for supplier management
-- Phase: 19-supplier-core, Plan: 01

-- =============================================
-- PURCHASE ORDER STATUS ENUM
-- =============================================

DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM (
    'draft',
    'ordered',
    'confirmed',
    'delivered',
    'invoiced',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- SEQUENCE FOR ORDER NUMBERS
-- =============================================

CREATE SEQUENCE IF NOT EXISTS purchase_order_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- =============================================
-- PURCHASE ORDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  supplier_id UUID NOT NULL REFERENCES partners(id),

  -- Order identification
  order_number TEXT UNIQUE NOT NULL,

  -- Status workflow
  status purchase_order_status DEFAULT 'draft',

  -- Line items (JSONB array like offers)
  line_items JSONB DEFAULT '[]',

  -- Amounts
  total_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',

  -- Scheduling
  expected_delivery_date DATE,

  -- Notes
  notes TEXT,

  -- Status timestamps (auto-set by trigger)
  ordered_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  invoiced_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ORDER NUMBER GENERATOR
-- =============================================

CREATE OR REPLACE FUNCTION generate_purchase_order_number(p_year INTEGER DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  use_year INTEGER;
  seq_val BIGINT;
BEGIN
  use_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  seq_val := nextval('purchase_order_seq');
  RETURN 'PO-' || use_year || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STATUS TRANSITION VALIDATION
-- =============================================

CREATE OR REPLACE FUNCTION validate_purchase_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["ordered", "cancelled"],
    "ordered": ["confirmed", "cancelled"],
    "confirmed": ["delivered", "cancelled"],
    "delivered": ["invoiced"],
    "invoiced": [],
    "cancelled": []
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  -- Skip if status not changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions
  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT));

  -- Check if transition is valid
  IF NOT (NEW.status::TEXT = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next, ', ');
  END IF;

  -- Auto-set timestamps based on status
  CASE NEW.status
    WHEN 'ordered' THEN
      NEW.ordered_at = NOW();
    WHEN 'confirmed' THEN
      NEW.confirmed_at = NOW();
    WHEN 'delivered' THEN
      NEW.delivered_at = NOW();
    WHEN 'invoiced' THEN
      NEW.invoiced_at = NOW();
    WHEN 'cancelled' THEN
      NEW.cancelled_at = NOW();
    ELSE
      -- No special handling for draft
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status transitions
DROP TRIGGER IF EXISTS purchase_orders_status_transition ON purchase_orders;
CREATE TRIGGER purchase_orders_status_transition
  BEFORE UPDATE OF status ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION validate_purchase_order_status_transition();

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery ON purchase_orders(expected_delivery_date);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE purchase_orders IS 'Purchase orders to suppliers for materials and services';
COMMENT ON COLUMN purchase_orders.order_number IS 'Generated order number: PO-YYYY-NNNNN';
COMMENT ON COLUMN purchase_orders.supplier_id IS 'Reference to partners table (partner_type=supplier)';
COMMENT ON COLUMN purchase_orders.line_items IS 'JSONB array: [{id, description, quantity, unit, unit_price, total}]';
COMMENT ON COLUMN purchase_orders.total_amount IS 'Total order amount in specified currency';
COMMENT ON COLUMN purchase_orders.expected_delivery_date IS 'Expected delivery date from supplier';

COMMENT ON FUNCTION generate_purchase_order_number IS 'Generates order number: PO-YYYY-NNNNN using sequence';
COMMENT ON FUNCTION validate_purchase_order_status_transition IS 'Enforces valid status transitions: draft->ordered->confirmed->delivered->invoiced, cancellation allowed from draft/ordered/confirmed';
