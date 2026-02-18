-- KEWA v4.0: Multi-Tenant Schema Foundation
-- Migration: 075_org_id_columns.sql
-- Adds organization_id (nullable) to all per-organization tables
-- Requirements: SCHEMA-04
-- Phase 35: Schema Foundation
-- NOTE: All columns nullable — Phase 36 will backfill then add NOT NULL
-- NOTE: CREATE INDEX CONCURRENTLY used throughout to avoid table locks on production

-- ============================================================
-- SECTION 1: Core property hierarchy
-- ============================================================

-- properties: organization_id + mandate_id + property_type + Grundbuch fields (D3, D9)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS mandate_id UUID REFERENCES mandates(id),
  ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'rental'
    CHECK (property_type IN ('rental', 'stwe', 'mixed')),
  ADD COLUMN IF NOT EXISTS land_registry_nr TEXT,     -- Grundbuchnummer (D9)
  ADD COLUMN IF NOT EXISTS municipality TEXT,          -- Gemeinde (D9)
  ADD COLUMN IF NOT EXISTS parcel_nr TEXT;             -- Parzellennummer (D9)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_mandate ON properties(mandate_id);

ALTER TABLE buildings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_org ON buildings(organization_id);

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_org ON units(organization_id);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_org ON rooms(organization_id);

-- ============================================================
-- SECTION 2: Projects and tasks hierarchy
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org ON projects(organization_id);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_org ON tasks(organization_id);

ALTER TABLE task_dependencies
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_dependencies_org ON task_dependencies(organization_id);

ALTER TABLE renovation_projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_renovation_projects_org ON renovation_projects(organization_id);

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_org ON work_orders(organization_id);

ALTER TABLE work_order_events
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_order_events_org ON work_order_events(organization_id);

-- ============================================================
-- SECTION 3: Partners and financial tables
-- ============================================================

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partners_org ON partners(organization_id);

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_org ON offers(organization_id);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org ON invoices(organization_id);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_org ON expenses(organization_id);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_org ON payments(organization_id);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id);

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deliveries_org ON deliveries(organization_id);

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_movements_org ON inventory_movements(organization_id);

ALTER TABLE purchase_order_allocations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_order_allocations_org ON purchase_order_allocations(organization_id);

ALTER TABLE approval_thresholds
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_thresholds_org ON approval_thresholds(organization_id);

-- ============================================================
-- SECTION 4: Change orders and inspections
-- ============================================================

ALTER TABLE change_orders
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_orders_org ON change_orders(organization_id);

ALTER TABLE change_order_versions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_order_versions_org ON change_order_versions(organization_id);

ALTER TABLE change_order_photos
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_order_photos_org ON change_order_photos(organization_id);

ALTER TABLE change_order_approval_tokens
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_order_approval_tokens_org ON change_order_approval_tokens(organization_id);

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_org ON inspections(organization_id);

ALTER TABLE inspection_defects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspection_defects_org ON inspection_defects(organization_id);

ALTER TABLE inspection_portal_tokens
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspection_portal_tokens_org ON inspection_portal_tokens(organization_id);

ALTER TABLE inspection_templates
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspection_templates_org ON inspection_templates(organization_id);

-- ============================================================
-- SECTION 5: Media, audit, and communication
-- ============================================================

ALTER TABLE media
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_org ON media(organization_id);

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_org ON comments(organization_id);

ALTER TABLE magic_link_tokens
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magic_link_tokens_org ON magic_link_tokens(organization_id);

ALTER TABLE storage_metadata
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_metadata_org ON storage_metadata(organization_id);

-- ============================================================
-- SECTION 6: Knowledge base
-- ============================================================

ALTER TABLE kb_categories
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_categories_org ON kb_categories(organization_id);

ALTER TABLE kb_articles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_articles_org ON kb_articles(organization_id);

ALTER TABLE kb_articles_history
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_articles_history_org ON kb_articles_history(organization_id);

ALTER TABLE kb_workflow_transitions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_workflow_transitions_org ON kb_workflow_transitions(organization_id);

ALTER TABLE kb_dashboard_shortcuts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_dashboard_shortcuts_org ON kb_dashboard_shortcuts(organization_id);

ALTER TABLE kb_attachments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_attachments_org ON kb_attachments(organization_id);

-- ============================================================
-- SECTION 7: Notifications and tickets
-- ============================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_org ON notifications(organization_id);

ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_notifications_org ON user_notifications(organization_id);

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_push_subscriptions_org ON push_subscriptions(organization_id);

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_preferences_org ON notification_preferences(organization_id);

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_org ON tickets(organization_id);

ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_messages_org ON ticket_messages(organization_id);

ALTER TABLE ticket_attachments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_attachments_org ON ticket_attachments(organization_id);

ALTER TABLE ticket_work_orders
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_work_orders_org ON ticket_work_orders(organization_id);

-- ============================================================
-- SECTION 8: Global+Org Extension tables
-- NULL = system entry (template/definition), UUID = org-specific entry
-- ============================================================

-- templates and WBS hierarchy: NULL = system template, UUID = org copy
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_org ON templates(organization_id);

ALTER TABLE template_phases
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_phases_org ON template_phases(organization_id);

ALTER TABLE template_packages
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_packages_org ON template_packages(organization_id);

ALTER TABLE template_tasks
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_tasks_org ON template_tasks(organization_id);

ALTER TABLE template_dependencies
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_dependencies_org ON template_dependencies(organization_id);

ALTER TABLE template_quality_gates
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_quality_gates_org ON template_quality_gates(organization_id);

ALTER TABLE project_phases
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_phases_org ON project_phases(organization_id);

ALTER TABLE project_packages
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_packages_org ON project_packages(organization_id);

ALTER TABLE project_quality_gates
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_quality_gates_org ON project_quality_gates(organization_id);

-- ============================================================
-- SECTION 9: Additional per-org tables (confirmed via migration audit)
-- ============================================================

-- components (010_component.sql) — per-org building/unit components
ALTER TABLE components
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_components_org ON components(organization_id);

-- condition_history (027_condition_tracking.sql) — per-org
ALTER TABLE condition_history
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_condition_history_org ON condition_history(organization_id);

-- task_photos (003_task_photos.sql) — per-org via tasks
ALTER TABLE task_photos
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_photos_org ON task_photos(organization_id);

-- task_audio (005_task_audio.sql) — per-org via tasks
ALTER TABLE task_audio
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_audio_org ON task_audio(organization_id);

-- app_settings (062_tenant_portal.sql) — per-org (each org has their own company_name for tenant portal)
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_settings_org ON app_settings(organization_id);

-- tenant_users (023_users_auth.sql) — per-org (tenant-unit relationship is org-scoped)
ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_users_org ON tenant_users(organization_id);
