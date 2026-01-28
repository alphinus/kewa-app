-- KEWA Renovations Operations System
-- Migration: 060_inspection_advanced.sql
-- Purpose: Inspection portal tokens for client access and room condition update trigger
-- Phase: 23-inspection-advanced, Plan: 01

-- =============================================
-- INSPECTION PORTAL TOKENS TABLE
-- =============================================

-- Links magic link tokens to inspections for client portal access (similar to change_order_approval_tokens)
CREATE TABLE IF NOT EXISTS inspection_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL REFERENCES magic_link_tokens(token) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(token, inspection_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_inspection_portal_tokens_token ON inspection_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_inspection_portal_tokens_inspection ON inspection_portal_tokens(inspection_id);

-- =============================================
-- ROOM CONDITION UPDATE TRIGGER
-- =============================================

-- Updates room condition when inspection reaches 'signed' status
-- Maps inspection result to room condition:
--   passed -> new
--   passed_with_conditions -> partial
--   failed -> no change (keep current condition)
CREATE OR REPLACE FUNCTION update_room_condition_from_inspection()
RETURNS TRIGGER AS $$
DECLARE
  v_room_id UUID;
  v_new_condition room_condition;
  v_project_id UUID;
  v_old_condition room_condition;
BEGIN
  -- Only process when inspection reaches 'signed' status
  IF NEW.status = 'signed' AND OLD.status != 'signed' THEN
    -- Find project_id and room_id from work order
    IF NEW.work_order_id IS NOT NULL THEN
      SELECT project_id, room_id INTO v_project_id, v_room_id
      FROM work_orders WHERE id = NEW.work_order_id;
    ELSE
      v_project_id := NEW.project_id;
      v_room_id := NULL;
    END IF;

    -- Only update if single room identified via work_order
    IF v_room_id IS NOT NULL THEN
      -- Get current condition for history
      SELECT condition INTO v_old_condition FROM rooms WHERE id = v_room_id;

      -- Map overall_result to room condition
      CASE NEW.overall_result
        WHEN 'passed' THEN v_new_condition := 'new';
        WHEN 'passed_with_conditions' THEN v_new_condition := 'partial';
        ELSE v_new_condition := NULL; -- failed = no improvement
      END CASE;

      IF v_new_condition IS NOT NULL THEN
        -- Update room condition
        UPDATE rooms SET
          condition = v_new_condition,
          condition_updated_at = NOW(),
          condition_source_project_id = v_project_id
        WHERE id = v_room_id;

        -- Record in condition history
        INSERT INTO condition_history (
          entity_type, entity_id, old_condition, new_condition,
          source_project_id, source_work_order_id, notes, changed_by
        ) VALUES (
          'room', v_room_id, v_old_condition, v_new_condition,
          v_project_id, NEW.work_order_id,
          'Updated from inspection: ' || NEW.title,
          NEW.inspector_id
        );

        RAISE NOTICE 'Updated room % condition to % from inspection %', v_room_id, v_new_condition, NEW.id;
      END IF;
    ELSE
      RAISE NOTICE 'Inspection % has no direct room link, skipping condition update', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_update_room_condition ON inspections;
CREATE TRIGGER inspection_update_room_condition
  AFTER UPDATE OF status ON inspections
  FOR EACH ROW
  WHEN (NEW.status = 'signed' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_room_condition_from_inspection();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on inspection_portal_tokens
ALTER TABLE inspection_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage tokens
CREATE POLICY "Authenticated users can view inspection portal tokens"
  ON inspection_portal_tokens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inspection portal tokens"
  ON inspection_portal_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inspection portal tokens"
  ON inspection_portal_tokens FOR DELETE
  TO authenticated
  USING (true);

-- Public can read via valid token (for portal access)
CREATE POLICY "Public can read via valid token"
  ON inspection_portal_tokens FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM magic_link_tokens mlt
      WHERE mlt.token = inspection_portal_tokens.token
        AND mlt.expires_at > NOW()
        AND mlt.used_at IS NULL
    )
  );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE inspection_portal_tokens IS 'Links magic link tokens to inspections for client portal access (similar to change_order_approval_tokens)';
COMMENT ON COLUMN inspection_portal_tokens.token IS 'References the magic link token used for portal access';
COMMENT ON COLUMN inspection_portal_tokens.inspection_id IS 'The inspection accessible via this token';

COMMENT ON FUNCTION update_room_condition_from_inspection IS 'Updates room condition when inspection is signed. Maps passed->new, passed_with_conditions->partial, failed->no change';
COMMENT ON TRIGGER inspection_update_room_condition ON inspections IS 'Fires when inspection status changes to signed, updates linked room condition';
