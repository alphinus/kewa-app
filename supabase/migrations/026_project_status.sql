-- KEWA Renovations Operations System
-- Migration: 026_project_status.sql
-- STAT-02: RenovationProject status transition enforcement

-- =============================================
-- RENOVATION PROJECT STATUS TRANSITION VALIDATION
-- =============================================

-- Valid RenovationProject status transitions
CREATE OR REPLACE FUNCTION validate_project_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "planned": ["active"],
    "active": ["blocked", "finished"],
    "blocked": ["active", "finished"],
    "finished": ["approved", "active"],
    "approved": []
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  -- Skip if status not changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions
  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT));

  -- Check if transition is valid (approved is final)
  IF array_length(allowed_next, 1) = 0 OR array_length(allowed_next, 1) IS NULL THEN
    IF OLD.status::TEXT = 'approved' THEN
      RAISE EXCEPTION 'Cannot change status of approved project';
    END IF;
  END IF;

  IF NOT (NEW.status::TEXT = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid project status transition: % -> %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next, ', ');
  END IF;

  -- Auto-set timestamps based on status
  CASE NEW.status
    WHEN 'active' THEN
      IF NEW.actual_start_date IS NULL THEN
        NEW.actual_start_date = CURRENT_DATE;
      END IF;
    WHEN 'finished' THEN
      IF NEW.actual_end_date IS NULL THEN
        NEW.actual_end_date = CURRENT_DATE;
      END IF;
    WHEN 'approved' THEN
      NEW.approved_at = NOW();
    ELSE
      -- No special handling
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status transitions
DROP TRIGGER IF EXISTS projects_status_transition ON renovation_projects;
CREATE TRIGGER projects_status_transition
  BEFORE UPDATE OF status ON renovation_projects
  FOR EACH ROW EXECUTE FUNCTION validate_project_status_transition();

-- =============================================
-- HELPER: Check if transition is valid
-- =============================================

CREATE OR REPLACE FUNCTION can_transition_project(
  p_project_id UUID,
  p_new_status renovation_status
) RETURNS BOOLEAN AS $$
DECLARE
  current_status renovation_status;
  valid_transitions JSONB := '{
    "planned": ["active"],
    "active": ["blocked", "finished"],
    "blocked": ["active", "finished"],
    "finished": ["approved", "active"],
    "approved": []
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  SELECT status INTO current_status FROM renovation_projects WHERE id = p_project_id;

  IF current_status IS NULL THEN
    RETURN FALSE;
  END IF;

  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT));

  -- Approved is terminal - no transitions allowed
  IF array_length(allowed_next, 1) = 0 OR array_length(allowed_next, 1) IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_new_status::TEXT = ANY(allowed_next);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER: Get allowed next statuses
-- =============================================

CREATE OR REPLACE FUNCTION get_allowed_project_transitions(
  p_project_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  current_status renovation_status;
  valid_transitions JSONB := '{
    "planned": ["active"],
    "active": ["blocked", "finished"],
    "blocked": ["active", "finished"],
    "finished": ["approved", "active"],
    "approved": []
  }'::JSONB;
BEGIN
  SELECT status INTO current_status FROM renovation_projects WHERE id = p_project_id;

  IF current_status IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  RETURN ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION validate_project_status_transition IS
  'Enforces valid RenovationProject status transitions: planned->active->blocked/finished->approved (terminal)';
COMMENT ON FUNCTION can_transition_project IS
  'Check if a renovation project can transition to a new status';
COMMENT ON FUNCTION get_allowed_project_transitions IS
  'Get array of allowed next statuses for a renovation project';
