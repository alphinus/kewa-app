-- KEWA v4.0: Multi-Tenant Data Migration
-- Migration: 082_not_null_constraints.sql
-- Applies: NOT NULL constraints on organization_id across 56 tables + properties.mandate_id + properties.property_type
-- Requirements: MIGR-03
-- Phase 36: Data Migration & Backfill
-- IMPORTANT: This migration will FAIL if any table has NULL organization_id rows.
-- Run 081_seed_properties.sql first to ensure complete backfill.

-- ============================================================
-- SECTION 1: Verification DO block
-- Iterates all 56 non-template tenant tables and raises an
-- exception if any NULL organization_id values remain.
-- ============================================================

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'properties', 'buildings', 'units', 'rooms', 'components',
    'renovation_projects', 'projects', 'project_phases', 'project_packages',
    'project_quality_gates', 'tasks', 'task_photos', 'task_audio',
    'task_dependencies', 'work_orders', 'work_order_events', 'offers',
    'invoices', 'expenses', 'payments', 'partners', 'purchase_orders',
    'deliveries', 'inventory_movements', 'purchase_order_allocations',
    'approval_thresholds', 'change_orders', 'change_order_versions',
    'change_order_photos', 'change_order_approval_tokens', 'inspections',
    'inspection_defects', 'inspection_portal_tokens', 'inspection_templates',
    'media', 'audit_logs', 'comments', 'magic_link_tokens', 'storage_metadata',
    'kb_categories', 'kb_articles', 'kb_articles_history', 'kb_workflow_transitions',
    'kb_dashboard_shortcuts', 'kb_attachments', 'notifications', 'user_notifications',
    'push_subscriptions', 'notification_preferences', 'tickets', 'ticket_messages',
    'ticket_attachments', 'ticket_work_orders', 'condition_history', 'app_settings',
    'tenant_users'
  ];
  tbl TEXT;
  null_count BIGINT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE organization_id IS NULL', tbl) INTO null_count;
    IF null_count > 0 THEN
      RAISE EXCEPTION 'Table % has % NULL organization_id rows — backfill incomplete. Run 081_seed_properties.sql first.', tbl, null_count;
    END IF;
  END LOOP;
  RAISE NOTICE 'Verification passed: all % tables have zero NULL organization_id values', array_length(tables, 1);
END $$;

-- Verify properties-specific columns
DO $$
DECLARE
  null_count BIGINT;
BEGIN
  SELECT count(*) INTO null_count FROM properties WHERE mandate_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'properties.mandate_id has % NULL rows — backfill incomplete', null_count;
  END IF;

  SELECT count(*) INTO null_count FROM properties WHERE property_type IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'properties.property_type has % NULL rows — backfill incomplete', null_count;
  END IF;

  RAISE NOTICE 'properties.mandate_id and properties.property_type verified: zero NULL values';
END $$;

-- ============================================================
-- SECTION 2: Apply NOT NULL constraints
-- Explicit DDL for all 56 non-template tenant tables.
-- Written out explicitly for auditability — no dynamic SQL for ALTER.
-- ============================================================

-- Core property hierarchy
ALTER TABLE properties ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE properties ALTER COLUMN mandate_id SET NOT NULL;
ALTER TABLE properties ALTER COLUMN property_type SET NOT NULL;
ALTER TABLE buildings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE units ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE rooms ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE components ALTER COLUMN organization_id SET NOT NULL;

-- Projects and tasks hierarchy
ALTER TABLE renovation_projects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE project_phases ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE project_packages ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE project_quality_gates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE task_photos ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE task_audio ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE task_dependencies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE work_orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE work_order_events ALTER COLUMN organization_id SET NOT NULL;

-- Partners and financial tables
ALTER TABLE partners ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE offers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE deliveries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE inventory_movements ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE purchase_order_allocations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE approval_thresholds ALTER COLUMN organization_id SET NOT NULL;

-- Change orders and inspections
ALTER TABLE change_orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE change_order_versions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE change_order_photos ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE change_order_approval_tokens ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE inspections ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE inspection_defects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE inspection_portal_tokens ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE inspection_templates ALTER COLUMN organization_id SET NOT NULL;

-- Media, audit, and communication
ALTER TABLE media ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE comments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE magic_link_tokens ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE storage_metadata ALTER COLUMN organization_id SET NOT NULL;

-- Knowledge base
ALTER TABLE kb_categories ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE kb_articles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE kb_articles_history ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE kb_workflow_transitions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE kb_dashboard_shortcuts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE kb_attachments ALTER COLUMN organization_id SET NOT NULL;

-- Notifications and tickets
ALTER TABLE notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE user_notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE push_subscriptions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE ticket_messages ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE ticket_attachments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE ticket_work_orders ALTER COLUMN organization_id SET NOT NULL;

-- Additional per-org tables
ALTER TABLE condition_history ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tenant_users ALTER COLUMN organization_id SET NOT NULL;

-- Phase 36 complete: All organization_id columns are NOT NULL.
-- 6 template tables intentionally excluded (NULL = system template):
--   templates, template_phases, template_packages, template_tasks,
--   template_dependencies, template_quality_gates
-- tenancies excluded (already NOT NULL from 074_tenancies.sql).
-- Next: Phase 37 (RLS policies on all tenant tables).
