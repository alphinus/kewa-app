-- KEWA Renovations Operations System
-- Migration: 029_rls_policies.sql
-- NFR-02: RLS policies for tenant data isolation

-- =============================================
-- ENABLE ROW LEVEL SECURITY ON TENANT-SENSITIVE TABLES
-- =============================================

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE renovation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTION: Check if user is internal
-- =============================================

CREATE OR REPLACE FUNCTION is_internal_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = p_user_id AND r.is_internal = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Check if user is tenant of unit
-- =============================================

CREATE OR REPLACE FUNCTION is_tenant_of_unit(p_user_id UUID, p_unit_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.unit_id = p_unit_id
      AND tu.user_id = p_user_id
      AND (tu.move_out_date IS NULL OR tu.move_out_date > CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Check if user is contractor for work order
-- =============================================

CREATE OR REPLACE FUNCTION is_contractor_for_work_order(p_user_id UUID, p_work_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN partners p ON wo.partner_id = p.id
    JOIN users u ON u.email = p.email
    WHERE wo.id = p_work_order_id
      AND u.id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UNITS POLICIES
-- =============================================

-- Policy: Internal users see all units
DROP POLICY IF EXISTS internal_full_access_units ON units;
CREATE POLICY internal_full_access_units ON units
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see only their units
DROP POLICY IF EXISTS tenant_own_units ON units;
CREATE POLICY tenant_own_units ON units
  FOR SELECT
  TO authenticated
  USING (is_tenant_of_unit(auth.uid(), id));

-- =============================================
-- ROOMS POLICIES
-- =============================================

-- Policy: Internal users see all rooms
DROP POLICY IF EXISTS internal_full_access_rooms ON rooms;
CREATE POLICY internal_full_access_rooms ON rooms
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see rooms in their units
DROP POLICY IF EXISTS tenant_own_rooms ON rooms;
CREATE POLICY tenant_own_rooms ON rooms
  FOR SELECT
  TO authenticated
  USING (is_tenant_of_unit(auth.uid(), unit_id));

-- =============================================
-- TASKS POLICIES
-- =============================================

-- Policy: Internal users see all tasks
DROP POLICY IF EXISTS internal_full_access_tasks ON tasks;
CREATE POLICY internal_full_access_tasks ON tasks
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see tasks in their units (via project)
DROP POLICY IF EXISTS tenant_own_tasks ON tasks;
CREATE POLICY tenant_own_tasks ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN units u ON p.unit_id = u.id
      WHERE p.id = tasks.project_id
        AND is_tenant_of_unit(auth.uid(), u.id)
    )
  );

-- =============================================
-- WORK ORDERS POLICIES
-- =============================================

-- Policy: Internal users see all work orders
DROP POLICY IF EXISTS internal_full_access_work_orders ON work_orders;
CREATE POLICY internal_full_access_work_orders ON work_orders
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Contractors see only their assigned work orders
DROP POLICY IF EXISTS contractor_own_work_orders ON work_orders;
CREATE POLICY contractor_own_work_orders ON work_orders
  FOR SELECT
  TO authenticated
  USING (is_contractor_for_work_order(auth.uid(), id));

-- Policy: Contractors can update their assigned work orders (respond)
DROP POLICY IF EXISTS contractor_update_work_orders ON work_orders;
CREATE POLICY contractor_update_work_orders ON work_orders
  FOR UPDATE
  TO authenticated
  USING (is_contractor_for_work_order(auth.uid(), id))
  WITH CHECK (is_contractor_for_work_order(auth.uid(), id));

-- =============================================
-- RENOVATION PROJECTS POLICIES
-- =============================================

-- Policy: Internal users see all renovation projects
DROP POLICY IF EXISTS internal_full_access_renovation_projects ON renovation_projects;
CREATE POLICY internal_full_access_renovation_projects ON renovation_projects
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see renovation projects in their units
DROP POLICY IF EXISTS tenant_own_renovation_projects ON renovation_projects;
CREATE POLICY tenant_own_renovation_projects ON renovation_projects
  FOR SELECT
  TO authenticated
  USING (is_tenant_of_unit(auth.uid(), unit_id));

-- =============================================
-- MEDIA POLICIES
-- =============================================

-- Policy: Internal users see all media
DROP POLICY IF EXISTS internal_full_access_media ON media;
CREATE POLICY internal_full_access_media ON media
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see media attached to their unit's entities
DROP POLICY IF EXISTS tenant_own_media ON media;
CREATE POLICY tenant_own_media ON media
  FOR SELECT
  TO authenticated
  USING (
    (entity_type = 'room' AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = media.entity_id
        AND is_tenant_of_unit(auth.uid(), r.unit_id)
    ))
    OR
    (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = media.entity_id
        AND is_tenant_of_unit(auth.uid(), p.unit_id)
    ))
  );

-- Policy: Contractors see media attached to their work orders
DROP POLICY IF EXISTS contractor_work_order_media ON media;
CREATE POLICY contractor_work_order_media ON media
  FOR SELECT
  TO authenticated
  USING (
    entity_type = 'work_order'
    AND is_contractor_for_work_order(auth.uid(), entity_id)
  );

-- =============================================
-- CONDITION HISTORY POLICIES
-- =============================================

-- Policy: Internal users see all condition history
DROP POLICY IF EXISTS internal_full_access_condition_history ON condition_history;
CREATE POLICY internal_full_access_condition_history ON condition_history
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see condition history for their unit's rooms
DROP POLICY IF EXISTS tenant_own_condition_history ON condition_history;
CREATE POLICY tenant_own_condition_history ON condition_history
  FOR SELECT
  TO authenticated
  USING (
    entity_type = 'room' AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = condition_history.entity_id
        AND is_tenant_of_unit(auth.uid(), r.unit_id)
    )
  );

-- =============================================
-- BYPASS POLICY FOR SERVICE ROLE
-- =============================================

-- Note: Supabase service role bypasses RLS by default
-- These policies only affect authenticated users via anon/authenticated keys

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION is_internal_user IS
  'Check if user has an internal role (admin, manager, accounting)';
COMMENT ON FUNCTION is_tenant_of_unit IS
  'Check if user is a current tenant of the specified unit';
COMMENT ON FUNCTION is_contractor_for_work_order IS
  'Check if user is the contractor assigned to the work order';
