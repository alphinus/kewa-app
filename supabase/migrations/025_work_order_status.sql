-- KEWA Renovations Operations System
-- Migration: 025_work_order_status.sql
-- STAT-01: WorkOrder status transition enforcement

-- =============================================
-- WORK ORDER STATUS TRANSITION VALIDATION
-- =============================================

-- Valid WorkOrder status transitions
CREATE OR REPLACE FUNCTION validate_work_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected"],
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

-- Create trigger for status transitions
DROP TRIGGER IF EXISTS work_orders_status_transition ON work_orders;
CREATE TRIGGER work_orders_status_transition
  BEFORE UPDATE OF status ON work_orders
  FOR EACH ROW EXECUTE FUNCTION validate_work_order_status_transition();

-- =============================================
-- HELPER: Check if transition is valid
-- =============================================

-- Function to check if work order can transition
CREATE OR REPLACE FUNCTION can_transition_work_order(
  p_work_order_id UUID,
  p_new_status work_order_status
) RETURNS BOOLEAN AS $$
DECLARE
  current_status work_order_status;
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected"],
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

-- =============================================
-- HELPER: Get allowed next statuses
-- =============================================

CREATE OR REPLACE FUNCTION get_allowed_work_order_transitions(
  p_work_order_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  current_status work_order_status;
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected"],
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
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION validate_work_order_status_transition IS
  'Enforces valid WorkOrder status transitions: draft->sent->viewed->accepted/rejected->in_progress->done->inspected->closed';
COMMENT ON FUNCTION can_transition_work_order IS
  'Check if a work order can transition to a new status';
COMMENT ON FUNCTION get_allowed_work_order_transitions IS
  'Get array of allowed next statuses for a work order';
