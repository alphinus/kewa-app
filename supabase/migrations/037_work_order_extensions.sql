-- KEWA Renovations Operations System
-- Migration: 037_work_order_extensions.sql
-- EXT-07/08/09/10: Counter-offer tracking and response flow extensions

-- =============================================
-- COUNTER-OFFER STATUS ENUM
-- =============================================

CREATE TYPE counter_offer_status AS ENUM (
  'pending',   -- Contractor submitted counter-offer, awaiting KEWA review
  'approved',  -- KEWA approved the counter-offer
  'rejected'   -- KEWA rejected the counter-offer
);

-- =============================================
-- EXTEND WORK ORDERS TABLE
-- =============================================

-- Counter-offer tracking columns
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS counter_offer_status counter_offer_status,
  ADD COLUMN IF NOT EXISTS counter_offer_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS counter_offer_response_notes TEXT;

-- =============================================
-- UPDATE STATUS TRANSITION FUNCTION
-- =============================================

-- Allow 'viewed' -> 'viewed' for counter-offer updates
-- Allow KEWA to set 'accepted' from counter-offer approval
CREATE OR REPLACE FUNCTION validate_work_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected", "viewed"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
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
    WHEN 'sent' THEN
      NEW.updated_at = NOW();
    WHEN 'viewed' THEN
      NEW.viewed_at = NOW();
    WHEN 'accepted' THEN
      NEW.accepted_at = NOW();
    WHEN 'rejected' THEN
      NEW.rejected_at = NOW();
    WHEN 'in_progress' THEN
      IF NEW.actual_start_date IS NULL THEN
        NEW.actual_start_date = CURRENT_DATE;
      END IF;
    WHEN 'done' THEN
      IF NEW.actual_end_date IS NULL THEN
        NEW.actual_end_date = CURRENT_DATE;
      END IF;
    ELSE
      -- No special handling
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update helper function to match
CREATE OR REPLACE FUNCTION can_transition_work_order(
  p_work_order_id UUID,
  p_new_status work_order_status
) RETURNS BOOLEAN AS $$
DECLARE
  current_status work_order_status;
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected", "viewed"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
  }'::JSONB;
BEGIN
  SELECT status INTO current_status FROM work_orders WHERE id = p_work_order_id;

  IF current_status IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_new_status::TEXT = ANY(
    ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT))
  );
END;
$$ LANGUAGE plpgsql;

-- Update get_allowed_work_order_transitions to match
CREATE OR REPLACE FUNCTION get_allowed_work_order_transitions(
  p_work_order_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  current_status work_order_status;
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected", "viewed"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
  }'::JSONB;
BEGIN
  SELECT status INTO current_status FROM work_orders WHERE id = p_work_order_id;

  IF current_status IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  RETURN ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INDEX
-- =============================================

CREATE INDEX IF NOT EXISTS idx_work_orders_counter_offer_status
  ON work_orders(counter_offer_status)
  WHERE counter_offer_status IS NOT NULL;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN work_orders.counter_offer_status IS 'Status of counter-offer: pending (awaiting KEWA), approved, rejected';
COMMENT ON COLUMN work_orders.counter_offer_responded_at IS 'Timestamp when KEWA responded to counter-offer';
COMMENT ON COLUMN work_orders.counter_offer_response_notes IS 'KEWA notes when responding to counter-offer';
