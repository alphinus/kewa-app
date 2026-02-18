-- KEWA v4.0: Multi-Tenant RLS Policies
-- Migration: 083_rls_policies.sql
-- Purpose: Drop legacy RLS policies/functions, enable RLS on 62 tables, create RESTRICTIVE org-scoped policies, seed Imeri test org, verify cross-tenant isolation
-- Requirements: RLS-01, RLS-05
-- Phase 37: RLS Enablement & Context Wiring


-- ============================================================
-- SECTION 1: Drop existing policies and legacy functions
-- Tears down all policies from 029_rls_policies.sql, 044_buildings_rls.sql, 060_inspection_advanced.sql
-- and drops unreferenced legacy helper functions
-- ============================================================

-- From 029_rls_policies.sql: units (2 policies)
DROP POLICY IF EXISTS internal_full_access_units ON units;
DROP POLICY IF EXISTS tenant_own_units ON units;

-- From 029_rls_policies.sql: rooms (2 policies)
DROP POLICY IF EXISTS internal_full_access_rooms ON rooms;
DROP POLICY IF EXISTS tenant_own_rooms ON rooms;

-- From 029_rls_policies.sql: tasks (2 policies)
DROP POLICY IF EXISTS internal_full_access_tasks ON tasks;
DROP POLICY IF EXISTS tenant_own_tasks ON tasks;

-- From 029_rls_policies.sql: work_orders (3 policies)
DROP POLICY IF EXISTS internal_full_access_work_orders ON work_orders;
DROP POLICY IF EXISTS contractor_own_work_orders ON work_orders;
DROP POLICY IF EXISTS contractor_update_work_orders ON work_orders;

-- From 029_rls_policies.sql: renovation_projects (2 policies)
DROP POLICY IF EXISTS internal_full_access_renovation_projects ON renovation_projects;
DROP POLICY IF EXISTS tenant_own_renovation_projects ON renovation_projects;

-- From 029_rls_policies.sql: media (3 policies)
DROP POLICY IF EXISTS internal_full_access_media ON media;
DROP POLICY IF EXISTS tenant_own_media ON media;
DROP POLICY IF EXISTS contractor_work_order_media ON media;

-- From 029_rls_policies.sql: condition_history (2 policies)
DROP POLICY IF EXISTS internal_full_access_condition_history ON condition_history;
DROP POLICY IF EXISTS tenant_own_condition_history ON condition_history;

-- From 044_buildings_rls.sql: buildings (4 policies)
DROP POLICY IF EXISTS "buildings_select_all" ON buildings;
DROP POLICY IF EXISTS "buildings_insert_all" ON buildings;
DROP POLICY IF EXISTS "buildings_update_all" ON buildings;
DROP POLICY IF EXISTS "buildings_delete_all" ON buildings;

-- From 060_inspection_advanced.sql: inspection_portal_tokens (4 policies)
DROP POLICY IF EXISTS "Authenticated users can view inspection portal tokens" ON inspection_portal_tokens;
DROP POLICY IF EXISTS "Authenticated users can insert inspection portal tokens" ON inspection_portal_tokens;
DROP POLICY IF EXISTS "Authenticated users can delete inspection portal tokens" ON inspection_portal_tokens;
DROP POLICY IF EXISTS "Public can read via valid token" ON inspection_portal_tokens;

-- Drop legacy helper functions (confirmed unreferenced in codebase)
DROP FUNCTION IF EXISTS is_internal_user(UUID);
DROP FUNCTION IF EXISTS is_tenant_of_unit(UUID, UUID);
DROP FUNCTION IF EXISTS is_contractor_for_work_order(UUID, UUID);


-- ============================================================
-- SECTION 2: Enable RLS on all 62 tenant tables
-- RLS enablement is idempotent; safe to re-run on already-protected tables
-- ============================================================

-- Core property hierarchy (5 tables)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

-- Projects and tasks hierarchy (12 tables)
ALTER TABLE renovation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_quality_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_events ENABLE ROW LEVEL SECURITY;

-- Financial and procurement (11 tables)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;

-- Change orders and inspections (8 tables)
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_order_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_order_approval_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;

-- Media, audit, and communication (5 tables)
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_metadata ENABLE ROW LEVEL SECURITY;

-- Knowledge base (6 tables)
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_dashboard_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_attachments ENABLE ROW LEVEL SECURITY;

-- Notifications and tickets (8 tables)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_work_orders ENABLE ROW LEVEL SECURITY;

-- Additional per-org tables (3 tables)
ALTER TABLE condition_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Template tables (6 tables) — organization_id may be NULL for system templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_quality_gates ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 3: Standard RESTRICTIVE policies for 56 tenant tables
-- Each table gets 4 policies: SELECT, INSERT, UPDATE, DELETE
-- All scoped to organization_id = current_organization_id()
-- Total: 56 tables x 4 policies = 224 policies
-- ============================================================

-- properties
CREATE POLICY "properties_org_select" ON properties
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "properties_org_insert" ON properties
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "properties_org_update" ON properties
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "properties_org_delete" ON properties
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- buildings
CREATE POLICY "buildings_org_select" ON buildings
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "buildings_org_insert" ON buildings
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "buildings_org_update" ON buildings
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "buildings_org_delete" ON buildings
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- units
CREATE POLICY "units_org_select" ON units
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "units_org_insert" ON units
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "units_org_update" ON units
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "units_org_delete" ON units
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- rooms
CREATE POLICY "rooms_org_select" ON rooms
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "rooms_org_insert" ON rooms
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "rooms_org_update" ON rooms
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "rooms_org_delete" ON rooms
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- components
CREATE POLICY "components_org_select" ON components
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "components_org_insert" ON components
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "components_org_update" ON components
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "components_org_delete" ON components
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- renovation_projects
CREATE POLICY "renovation_projects_org_select" ON renovation_projects
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "renovation_projects_org_insert" ON renovation_projects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "renovation_projects_org_update" ON renovation_projects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "renovation_projects_org_delete" ON renovation_projects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- projects
CREATE POLICY "projects_org_select" ON projects
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "projects_org_insert" ON projects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "projects_org_update" ON projects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "projects_org_delete" ON projects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- project_phases
CREATE POLICY "project_phases_org_select" ON project_phases
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "project_phases_org_insert" ON project_phases
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "project_phases_org_update" ON project_phases
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "project_phases_org_delete" ON project_phases
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- project_packages
CREATE POLICY "project_packages_org_select" ON project_packages
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "project_packages_org_insert" ON project_packages
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "project_packages_org_update" ON project_packages
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "project_packages_org_delete" ON project_packages
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- project_quality_gates
CREATE POLICY "project_quality_gates_org_select" ON project_quality_gates
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "project_quality_gates_org_insert" ON project_quality_gates
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "project_quality_gates_org_update" ON project_quality_gates
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "project_quality_gates_org_delete" ON project_quality_gates
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- tasks
CREATE POLICY "tasks_org_select" ON tasks
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "tasks_org_insert" ON tasks
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "tasks_org_update" ON tasks
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "tasks_org_delete" ON tasks
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- task_photos
CREATE POLICY "task_photos_org_select" ON task_photos
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "task_photos_org_insert" ON task_photos
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "task_photos_org_update" ON task_photos
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "task_photos_org_delete" ON task_photos
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- task_audio
CREATE POLICY "task_audio_org_select" ON task_audio
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "task_audio_org_insert" ON task_audio
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "task_audio_org_update" ON task_audio
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "task_audio_org_delete" ON task_audio
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- task_dependencies
CREATE POLICY "task_dependencies_org_select" ON task_dependencies
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "task_dependencies_org_insert" ON task_dependencies
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "task_dependencies_org_update" ON task_dependencies
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "task_dependencies_org_delete" ON task_dependencies
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- work_orders
CREATE POLICY "work_orders_org_select" ON work_orders
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "work_orders_org_insert" ON work_orders
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "work_orders_org_update" ON work_orders
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "work_orders_org_delete" ON work_orders
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- work_order_events
CREATE POLICY "work_order_events_org_select" ON work_order_events
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "work_order_events_org_insert" ON work_order_events
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "work_order_events_org_update" ON work_order_events
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "work_order_events_org_delete" ON work_order_events
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- offers
CREATE POLICY "offers_org_select" ON offers
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "offers_org_insert" ON offers
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "offers_org_update" ON offers
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "offers_org_delete" ON offers
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- invoices
CREATE POLICY "invoices_org_select" ON invoices
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "invoices_org_insert" ON invoices
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "invoices_org_update" ON invoices
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "invoices_org_delete" ON invoices
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- expenses
CREATE POLICY "expenses_org_select" ON expenses
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "expenses_org_insert" ON expenses
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "expenses_org_update" ON expenses
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "expenses_org_delete" ON expenses
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- payments
CREATE POLICY "payments_org_select" ON payments
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "payments_org_insert" ON payments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "payments_org_update" ON payments
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "payments_org_delete" ON payments
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- partners
CREATE POLICY "partners_org_select" ON partners
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "partners_org_insert" ON partners
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "partners_org_update" ON partners
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "partners_org_delete" ON partners
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- purchase_orders
CREATE POLICY "purchase_orders_org_select" ON purchase_orders
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "purchase_orders_org_insert" ON purchase_orders
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "purchase_orders_org_update" ON purchase_orders
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "purchase_orders_org_delete" ON purchase_orders
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- deliveries
CREATE POLICY "deliveries_org_select" ON deliveries
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "deliveries_org_insert" ON deliveries
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "deliveries_org_update" ON deliveries
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "deliveries_org_delete" ON deliveries
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- inventory_movements
CREATE POLICY "inventory_movements_org_select" ON inventory_movements
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "inventory_movements_org_insert" ON inventory_movements
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inventory_movements_org_update" ON inventory_movements
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inventory_movements_org_delete" ON inventory_movements
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- purchase_order_allocations
CREATE POLICY "purchase_order_allocations_org_select" ON purchase_order_allocations
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "purchase_order_allocations_org_insert" ON purchase_order_allocations
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "purchase_order_allocations_org_update" ON purchase_order_allocations
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "purchase_order_allocations_org_delete" ON purchase_order_allocations
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- approval_thresholds
CREATE POLICY "approval_thresholds_org_select" ON approval_thresholds
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "approval_thresholds_org_insert" ON approval_thresholds
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "approval_thresholds_org_update" ON approval_thresholds
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "approval_thresholds_org_delete" ON approval_thresholds
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- change_orders
CREATE POLICY "change_orders_org_select" ON change_orders
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "change_orders_org_insert" ON change_orders
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "change_orders_org_update" ON change_orders
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "change_orders_org_delete" ON change_orders
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- change_order_versions
CREATE POLICY "change_order_versions_org_select" ON change_order_versions
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "change_order_versions_org_insert" ON change_order_versions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "change_order_versions_org_update" ON change_order_versions
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "change_order_versions_org_delete" ON change_order_versions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- change_order_photos
CREATE POLICY "change_order_photos_org_select" ON change_order_photos
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "change_order_photos_org_insert" ON change_order_photos
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "change_order_photos_org_update" ON change_order_photos
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "change_order_photos_org_delete" ON change_order_photos
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- change_order_approval_tokens
CREATE POLICY "change_order_approval_tokens_org_select" ON change_order_approval_tokens
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "change_order_approval_tokens_org_insert" ON change_order_approval_tokens
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "change_order_approval_tokens_org_update" ON change_order_approval_tokens
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "change_order_approval_tokens_org_delete" ON change_order_approval_tokens
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- inspections
CREATE POLICY "inspections_org_select" ON inspections
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "inspections_org_insert" ON inspections
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inspections_org_update" ON inspections
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inspections_org_delete" ON inspections
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- inspection_defects
CREATE POLICY "inspection_defects_org_select" ON inspection_defects
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "inspection_defects_org_insert" ON inspection_defects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inspection_defects_org_update" ON inspection_defects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inspection_defects_org_delete" ON inspection_defects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- inspection_portal_tokens
CREATE POLICY "inspection_portal_tokens_org_select" ON inspection_portal_tokens
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "inspection_portal_tokens_org_insert" ON inspection_portal_tokens
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inspection_portal_tokens_org_update" ON inspection_portal_tokens
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inspection_portal_tokens_org_delete" ON inspection_portal_tokens
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- inspection_templates
CREATE POLICY "inspection_templates_org_select" ON inspection_templates
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "inspection_templates_org_insert" ON inspection_templates
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inspection_templates_org_update" ON inspection_templates
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "inspection_templates_org_delete" ON inspection_templates
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- media
CREATE POLICY "media_org_select" ON media
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "media_org_insert" ON media
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "media_org_update" ON media
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "media_org_delete" ON media
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- audit_logs
CREATE POLICY "audit_logs_org_select" ON audit_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "audit_logs_org_insert" ON audit_logs
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "audit_logs_org_update" ON audit_logs
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "audit_logs_org_delete" ON audit_logs
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- comments
CREATE POLICY "comments_org_select" ON comments
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "comments_org_insert" ON comments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "comments_org_update" ON comments
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "comments_org_delete" ON comments
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- magic_link_tokens
CREATE POLICY "magic_link_tokens_org_select" ON magic_link_tokens
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "magic_link_tokens_org_insert" ON magic_link_tokens
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "magic_link_tokens_org_update" ON magic_link_tokens
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "magic_link_tokens_org_delete" ON magic_link_tokens
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- storage_metadata
CREATE POLICY "storage_metadata_org_select" ON storage_metadata
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "storage_metadata_org_insert" ON storage_metadata
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "storage_metadata_org_update" ON storage_metadata
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "storage_metadata_org_delete" ON storage_metadata
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- kb_categories
CREATE POLICY "kb_categories_org_select" ON kb_categories
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "kb_categories_org_insert" ON kb_categories
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_categories_org_update" ON kb_categories
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_categories_org_delete" ON kb_categories
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- kb_articles
CREATE POLICY "kb_articles_org_select" ON kb_articles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "kb_articles_org_insert" ON kb_articles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_articles_org_update" ON kb_articles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_articles_org_delete" ON kb_articles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- kb_articles_history
CREATE POLICY "kb_articles_history_org_select" ON kb_articles_history
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "kb_articles_history_org_insert" ON kb_articles_history
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_articles_history_org_update" ON kb_articles_history
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_articles_history_org_delete" ON kb_articles_history
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- kb_workflow_transitions
CREATE POLICY "kb_workflow_transitions_org_select" ON kb_workflow_transitions
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "kb_workflow_transitions_org_insert" ON kb_workflow_transitions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_workflow_transitions_org_update" ON kb_workflow_transitions
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_workflow_transitions_org_delete" ON kb_workflow_transitions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- kb_dashboard_shortcuts
CREATE POLICY "kb_dashboard_shortcuts_org_select" ON kb_dashboard_shortcuts
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "kb_dashboard_shortcuts_org_insert" ON kb_dashboard_shortcuts
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_dashboard_shortcuts_org_update" ON kb_dashboard_shortcuts
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_dashboard_shortcuts_org_delete" ON kb_dashboard_shortcuts
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- kb_attachments
CREATE POLICY "kb_attachments_org_select" ON kb_attachments
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "kb_attachments_org_insert" ON kb_attachments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_attachments_org_update" ON kb_attachments
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "kb_attachments_org_delete" ON kb_attachments
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- notifications
CREATE POLICY "notifications_org_select" ON notifications
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "notifications_org_insert" ON notifications
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "notifications_org_update" ON notifications
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "notifications_org_delete" ON notifications
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- user_notifications
CREATE POLICY "user_notifications_org_select" ON user_notifications
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "user_notifications_org_insert" ON user_notifications
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "user_notifications_org_update" ON user_notifications
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "user_notifications_org_delete" ON user_notifications
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- push_subscriptions
CREATE POLICY "push_subscriptions_org_select" ON push_subscriptions
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "push_subscriptions_org_insert" ON push_subscriptions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "push_subscriptions_org_update" ON push_subscriptions
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "push_subscriptions_org_delete" ON push_subscriptions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- notification_preferences
CREATE POLICY "notification_preferences_org_select" ON notification_preferences
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "notification_preferences_org_insert" ON notification_preferences
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "notification_preferences_org_update" ON notification_preferences
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "notification_preferences_org_delete" ON notification_preferences
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- tickets
CREATE POLICY "tickets_org_select" ON tickets
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "tickets_org_insert" ON tickets
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "tickets_org_update" ON tickets
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "tickets_org_delete" ON tickets
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- ticket_messages
CREATE POLICY "ticket_messages_org_select" ON ticket_messages
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "ticket_messages_org_insert" ON ticket_messages
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "ticket_messages_org_update" ON ticket_messages
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "ticket_messages_org_delete" ON ticket_messages
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- ticket_attachments
CREATE POLICY "ticket_attachments_org_select" ON ticket_attachments
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "ticket_attachments_org_insert" ON ticket_attachments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "ticket_attachments_org_update" ON ticket_attachments
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "ticket_attachments_org_delete" ON ticket_attachments
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- ticket_work_orders
CREATE POLICY "ticket_work_orders_org_select" ON ticket_work_orders
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "ticket_work_orders_org_insert" ON ticket_work_orders
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "ticket_work_orders_org_update" ON ticket_work_orders
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "ticket_work_orders_org_delete" ON ticket_work_orders
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- condition_history
CREATE POLICY "condition_history_org_select" ON condition_history
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "condition_history_org_insert" ON condition_history
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "condition_history_org_update" ON condition_history
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "condition_history_org_delete" ON condition_history
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- app_settings
CREATE POLICY "app_settings_org_select" ON app_settings
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "app_settings_org_insert" ON app_settings
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "app_settings_org_update" ON app_settings
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "app_settings_org_delete" ON app_settings
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- tenant_users
CREATE POLICY "tenant_users_org_select" ON tenant_users
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "tenant_users_org_insert" ON tenant_users
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "tenant_users_org_update" ON tenant_users
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "tenant_users_org_delete" ON tenant_users
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());


-- ============================================================
-- SECTION 4: Modified SELECT policies for 6 template tables
-- SELECT allows NULL organization_id (system templates visible to all orgs)
-- INSERT/UPDATE/DELETE require strict org match
-- Total: 6 tables x 4 policies = 24 policies
-- ============================================================

-- templates
CREATE POLICY "templates_org_select" ON templates
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id() OR organization_id IS NULL);

CREATE POLICY "templates_org_insert" ON templates
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "templates_org_update" ON templates
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "templates_org_delete" ON templates
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- template_phases
CREATE POLICY "template_phases_org_select" ON template_phases
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id() OR organization_id IS NULL);

CREATE POLICY "template_phases_org_insert" ON template_phases
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_phases_org_update" ON template_phases
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_phases_org_delete" ON template_phases
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- template_packages
CREATE POLICY "template_packages_org_select" ON template_packages
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id() OR organization_id IS NULL);

CREATE POLICY "template_packages_org_insert" ON template_packages
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_packages_org_update" ON template_packages
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_packages_org_delete" ON template_packages
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- template_tasks
CREATE POLICY "template_tasks_org_select" ON template_tasks
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id() OR organization_id IS NULL);

CREATE POLICY "template_tasks_org_insert" ON template_tasks
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_tasks_org_update" ON template_tasks
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_tasks_org_delete" ON template_tasks
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- template_dependencies
CREATE POLICY "template_dependencies_org_select" ON template_dependencies
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id() OR organization_id IS NULL);

CREATE POLICY "template_dependencies_org_insert" ON template_dependencies
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_dependencies_org_update" ON template_dependencies
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_dependencies_org_delete" ON template_dependencies
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());

-- template_quality_gates
CREATE POLICY "template_quality_gates_org_select" ON template_quality_gates
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (organization_id = current_organization_id() OR organization_id IS NULL);

CREATE POLICY "template_quality_gates_org_insert" ON template_quality_gates
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_quality_gates_org_update" ON template_quality_gates
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "template_quality_gates_org_delete" ON template_quality_gates
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());


-- ============================================================
-- SECTION 5: Seed Imeri Immobilien AG + Cross-tenant isolation verification
-- ============================================================

-- Seed Imeri Immobilien AG as permanent second test organization (idempotent)
INSERT INTO organizations (id, name, slug, created_at)
SELECT
  '00000000-0000-0000-0010-000000000003'::UUID,
  'Imeri Immobilien AG',
  'imeri-immobilien-ag',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0010-000000000003'::UUID
);

-- Cross-tenant isolation verification DO-block
-- Tests SELECT, INSERT, UPDATE, DELETE isolation across org boundaries
-- RAISE EXCEPTION aborts migration if any cross-tenant access succeeds
DO $$
DECLARE
  v_kewa_org_id UUID := '00000000-0000-0000-0010-000000000001'::UUID;
  v_imeri_org_id UUID := '00000000-0000-0000-0010-000000000003'::UUID;
  v_cross_count BIGINT;
  v_rows_affected BIGINT;
BEGIN
  -- ------------------------------------------------
  -- Set context to KeWa AG and verify SELECT isolation
  -- ------------------------------------------------
  PERFORM set_org_context(v_kewa_org_id);

  -- SELECT test: KeWa context must not see other orgs' properties
  SELECT count(*) INTO v_cross_count
  FROM properties
  WHERE organization_id != v_kewa_org_id;

  IF v_cross_count > 0 THEN
    RAISE EXCEPTION 'ISOLATION FAILURE: KeWa context can SELECT % properties belonging to other organizations', v_cross_count;
  END IF;

  -- INSERT test: Attempt to insert a property with Imeri's org_id from KeWa context
  -- Expected: policy violation (WITH CHECK fails) — caught in nested block
  BEGIN
    INSERT INTO properties (
      id,
      organization_id,
      mandate_id,
      name,
      property_type,
      address_street,
      address_city,
      address_zip,
      address_country,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_imeri_org_id,
      (SELECT id FROM mandates WHERE organization_id = v_imeri_org_id LIMIT 1),
      'ISOLATION_TEST_SHOULD_NOT_EXIST',
      'residential',
      'Test Street 1',
      'Test City',
      '0000',
      'CH',
      NOW()
    );
    -- If we reach here, insert succeeded — isolation is broken
    RAISE EXCEPTION 'ISOLATION FAILURE: KeWa context successfully INSERTed a property with Imeri organization_id — cross-tenant write is possible';
  EXCEPTION
    WHEN check_violation OR insufficient_privilege THEN
      -- Expected: policy blocked the insert
      NULL;
  END;

  -- ------------------------------------------------
  -- Set context to Imeri AG and verify reverse SELECT isolation
  -- ------------------------------------------------
  PERFORM set_org_context(v_imeri_org_id);

  -- SELECT test (reverse): Imeri context must not see KeWa properties
  SELECT count(*) INTO v_cross_count
  FROM properties
  WHERE organization_id != v_imeri_org_id;

  IF v_cross_count > 0 THEN
    RAISE EXCEPTION 'ISOLATION FAILURE: Imeri context can SELECT % properties belonging to other organizations', v_cross_count;
  END IF;

  -- UPDATE test: Attempt to update a KeWa property from Imeri context
  -- Expected: 0 rows affected (RLS filters KeWa rows out of Imeri context)
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  UPDATE properties
  SET name = 'ISOLATION_TEST_TAMPERED'
  WHERE organization_id = v_kewa_org_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected > 0 THEN
    RAISE EXCEPTION 'ISOLATION FAILURE: Imeri context successfully UPDATEd % KeWa properties — cross-tenant write is possible', v_rows_affected;
  END IF;

  -- DELETE test: Attempt to delete a KeWa property from Imeri context
  -- Expected: 0 rows affected (RLS filters KeWa rows out of Imeri context)
  DELETE FROM properties
  WHERE organization_id = v_kewa_org_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected > 0 THEN
    RAISE EXCEPTION 'ISOLATION FAILURE: Imeri context successfully DELETEd % KeWa properties — cross-tenant delete is possible', v_rows_affected;
  END IF;

  -- ------------------------------------------------
  -- Reset context back to KeWa AG for safety
  -- ------------------------------------------------
  PERFORM set_org_context(v_kewa_org_id);

  RAISE NOTICE 'Cross-tenant isolation verified for all CRUD operations';
END $$;
