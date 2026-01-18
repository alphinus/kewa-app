-- KEWA Renovations Operations System
-- Migration: 027_condition_tracking.sql
-- STAT-03: Room/Unit condition enum and tracking
-- STAT-04: Condition updates linked to source project and media

-- =============================================
-- CONDITION HISTORY TABLE
-- =============================================

-- Tracks all condition changes over time
CREATE TABLE IF NOT EXISTS condition_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  entity_type TEXT NOT NULL CHECK (entity_type IN ('room', 'unit', 'component')),
  entity_id UUID NOT NULL,

  -- Condition change
  old_condition room_condition,
  new_condition room_condition NOT NULL,

  -- Source of change
  source_project_id UUID REFERENCES renovation_projects(id),
  source_work_order_id UUID REFERENCES work_orders(id),

  -- Evidence
  media_ids UUID[], -- Links to before/after media

  -- Notes
  notes TEXT,

  -- Metadata
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_condition_history_entity ON condition_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_condition_history_date ON condition_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_condition_history_project ON condition_history(source_project_id);
CREATE INDEX IF NOT EXISTS idx_condition_history_work_order ON condition_history(source_work_order_id);

-- =============================================
-- FUNCTION: Update room condition from project
-- =============================================

-- Called when project is approved to update affected room conditions
CREATE OR REPLACE FUNCTION update_room_condition_from_project(
  p_project_id UUID,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_room RECORD;
  v_old_condition room_condition;
BEGIN
  -- Get all rooms affected by this project's tasks
  FOR v_room IN
    SELECT DISTINCT r.id, r.condition
    FROM rooms r
    JOIN tasks t ON t.room_id = r.id
    WHERE t.renovation_project_id = p_project_id
      AND t.status = 'completed'
  LOOP
    v_old_condition := v_room.condition;

    -- Update room to 'new' condition
    UPDATE rooms
    SET condition = 'new',
        condition_updated_at = NOW(),
        condition_source_project_id = p_project_id
    WHERE id = v_room.id;

    -- Record history
    INSERT INTO condition_history (
      entity_type, entity_id, old_condition, new_condition,
      source_project_id, changed_by
    ) VALUES (
      'room', v_room.id, v_old_condition, 'new',
      p_project_id, p_user_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: Project approved -> update conditions
-- =============================================

CREATE OR REPLACE FUNCTION on_project_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM update_room_condition_from_project(NEW.id, NEW.approved_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_on_approved ON renovation_projects;
CREATE TRIGGER projects_on_approved
  AFTER UPDATE OF status ON renovation_projects
  FOR EACH ROW EXECUTE FUNCTION on_project_approved();

-- =============================================
-- FUNCTION: Manual condition update with history
-- =============================================

CREATE OR REPLACE FUNCTION update_room_condition(
  p_room_id UUID,
  p_new_condition room_condition,
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_work_order_id UUID DEFAULT NULL,
  p_media_ids UUID[] DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_old_condition room_condition;
BEGIN
  -- Get current condition
  SELECT condition INTO v_old_condition FROM rooms WHERE id = p_room_id;

  IF v_old_condition IS NULL THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- Skip if no change
  IF v_old_condition = p_new_condition THEN
    RETURN;
  END IF;

  -- Update room
  UPDATE rooms
  SET condition = p_new_condition,
      condition_updated_at = NOW(),
      condition_source_project_id = COALESCE(p_project_id, condition_source_project_id)
  WHERE id = p_room_id;

  -- Record history
  INSERT INTO condition_history (
    entity_type, entity_id, old_condition, new_condition,
    source_project_id, source_work_order_id, media_ids, notes, changed_by
  ) VALUES (
    'room', p_room_id, v_old_condition, p_new_condition,
    p_project_id, p_work_order_id, p_media_ids, p_notes, p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Update component condition with history
-- =============================================

CREATE OR REPLACE FUNCTION update_component_condition(
  p_component_id UUID,
  p_new_condition room_condition,
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_work_order_id UUID DEFAULT NULL,
  p_media_ids UUID[] DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_old_condition room_condition;
BEGIN
  -- Get current condition
  SELECT condition INTO v_old_condition FROM components WHERE id = p_component_id;

  IF v_old_condition IS NULL THEN
    RAISE EXCEPTION 'Component not found: %', p_component_id;
  END IF;

  -- Skip if no change
  IF v_old_condition = p_new_condition THEN
    RETURN;
  END IF;

  -- Update component
  UPDATE components
  SET condition = p_new_condition,
      condition_updated_at = NOW()
  WHERE id = p_component_id;

  -- Record history
  INSERT INTO condition_history (
    entity_type, entity_id, old_condition, new_condition,
    source_project_id, source_work_order_id, media_ids, notes, changed_by
  ) VALUES (
    'component', p_component_id, v_old_condition, p_new_condition,
    p_project_id, p_work_order_id, p_media_ids, p_notes, p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEW: Unit condition summary (Digital Twin)
-- =============================================

CREATE OR REPLACE VIEW unit_condition_summary AS
SELECT
  u.id as unit_id,
  u.name as unit_name,
  u.building_id,
  COUNT(r.id) as total_rooms,
  COUNT(CASE WHEN r.condition = 'new' THEN 1 END) as new_rooms,
  COUNT(CASE WHEN r.condition = 'partial' THEN 1 END) as partial_rooms,
  COUNT(CASE WHEN r.condition = 'old' THEN 1 END) as old_rooms,
  ROUND(
    COUNT(CASE WHEN r.condition = 'new' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(r.id), 0) * 100, 1
  ) as renovation_percentage,
  CASE
    WHEN COUNT(r.id) = 0 THEN NULL
    WHEN COUNT(CASE WHEN r.condition = 'new' THEN 1 END) = COUNT(r.id) THEN 'new'::room_condition
    WHEN COUNT(CASE WHEN r.condition = 'old' THEN 1 END) = COUNT(r.id) THEN 'old'::room_condition
    ELSE 'partial'::room_condition
  END as overall_condition,
  MAX(r.condition_updated_at) as last_condition_update
FROM units u
LEFT JOIN rooms r ON r.unit_id = u.id
GROUP BY u.id, u.name, u.building_id;

-- =============================================
-- VIEW: Room condition history with details
-- =============================================

CREATE OR REPLACE VIEW room_condition_timeline AS
SELECT
  ch.id,
  ch.entity_id as room_id,
  r.name as room_name,
  r.unit_id,
  u.name as unit_name,
  ch.old_condition,
  ch.new_condition,
  ch.source_project_id,
  rp.name as project_name,
  ch.source_work_order_id,
  wo.title as work_order_title,
  ch.media_ids,
  ch.notes,
  ch.changed_by,
  usr.display_name as changed_by_name,
  ch.changed_at
FROM condition_history ch
JOIN rooms r ON ch.entity_id = r.id AND ch.entity_type = 'room'
JOIN units u ON r.unit_id = u.id
LEFT JOIN renovation_projects rp ON ch.source_project_id = rp.id
LEFT JOIN work_orders wo ON ch.source_work_order_id = wo.id
LEFT JOIN users usr ON ch.changed_by = usr.id
ORDER BY ch.changed_at DESC;

-- =============================================
-- FUNCTION: Get condition history for entity
-- =============================================

CREATE OR REPLACE FUNCTION get_condition_history(
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS TABLE (
  id UUID,
  old_condition room_condition,
  new_condition room_condition,
  source_project_id UUID,
  source_work_order_id UUID,
  media_ids UUID[],
  notes TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.old_condition,
    ch.new_condition,
    ch.source_project_id,
    ch.source_work_order_id,
    ch.media_ids,
    ch.notes,
    ch.changed_by,
    ch.changed_at
  FROM condition_history ch
  WHERE ch.entity_type = p_entity_type
    AND ch.entity_id = p_entity_id
  ORDER BY ch.changed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE condition_history IS 'Tracks all room/unit/component condition changes with source and evidence links';
COMMENT ON COLUMN condition_history.entity_type IS 'Type of entity: room, unit, or component';
COMMENT ON COLUMN condition_history.media_ids IS 'Array of media IDs showing before/after evidence';
COMMENT ON FUNCTION update_room_condition_from_project IS 'Auto-update room conditions when project is approved';
COMMENT ON FUNCTION update_room_condition IS 'Manually update room condition with full history tracking';
COMMENT ON FUNCTION update_component_condition IS 'Manually update component condition with full history tracking';
COMMENT ON VIEW unit_condition_summary IS 'Digital Twin view: unit renovation status calculated from rooms';
COMMENT ON VIEW room_condition_timeline IS 'Timeline of all room condition changes with project/work order context';
