-- KEWA v4.0: Multi-Tenant Schema Foundation
-- Migration: 077_org_sync_triggers.sql
-- BEFORE INSERT/UPDATE triggers: auto-propagate organization_id through hierarchy
-- Requirements: SCHEMA-07
-- Phase 35: Schema Foundation
--
-- IMPORTANT: All triggers use BEFORE (not AFTER) to set NEW.organization_id in-memory.
-- Column-specific UPDATE triggers prevent infinite loops:
--   BEFORE INSERT OR UPDATE OF property_id (fires only when property_id changes, not org_id)
-- NEVER update the same table inside the trigger function — use NEW.field instead.
--
-- Polymorphic tables (media, audit_logs, comments, condition_history, storage_metadata)
-- are excluded here — no single FK to join. Backfill handled in Phase 36.
--
-- Direct-org tables with no hierarchical parent (purchase_orders, partners, kb_categories,
-- notifications, push_subscriptions, etc.) are also excluded. Backfill in Phase 36.

-- ============================================================
-- LEVEL 1: buildings inherits from properties
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_property()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM properties WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_buildings_org_id ON buildings;
CREATE TRIGGER trg_buildings_org_id
  BEFORE INSERT OR UPDATE OF property_id ON buildings
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_property();

-- ============================================================
-- LEVEL 2: units inherits from buildings
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_building()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.building_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM buildings WHERE id = NEW.building_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_units_org_id ON units;
CREATE TRIGGER trg_units_org_id
  BEFORE INSERT OR UPDATE OF building_id ON units
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_building();

-- ============================================================
-- LEVEL 3: rooms, renovation_projects, tickets inherit from units
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_unit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM units WHERE id = NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rooms_org_id ON rooms;
CREATE TRIGGER trg_rooms_org_id
  BEFORE INSERT OR UPDATE OF unit_id ON rooms
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_unit();

DROP TRIGGER IF EXISTS trg_renovation_projects_org_id ON renovation_projects;
CREATE TRIGGER trg_renovation_projects_org_id
  BEFORE INSERT OR UPDATE OF unit_id ON renovation_projects
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_unit();

DROP TRIGGER IF EXISTS trg_tickets_org_id ON tickets;
CREATE TRIGGER trg_tickets_org_id
  BEFORE INSERT OR UPDATE OF unit_id ON tickets
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_unit();

-- ============================================================
-- LEVEL 3b: components inherit from rooms
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_room()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.room_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM rooms WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_components_org_id ON components;
CREATE TRIGGER trg_components_org_id
  BEFORE INSERT OR UPDATE OF room_id ON components
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_room();

-- ============================================================
-- LEVEL 4a: projects (runtime WBS) inherit from renovation_projects
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_renovation_project()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM renovation_projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- project_phases: project_id FK to renovation_projects
DROP TRIGGER IF EXISTS trg_project_phases_org_id ON project_phases;
CREATE TRIGGER trg_project_phases_org_id
  BEFORE INSERT OR UPDATE OF project_id ON project_phases
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_renovation_project();

-- project_quality_gates: project_id FK to renovation_projects
DROP TRIGGER IF EXISTS trg_project_quality_gates_org_id ON project_quality_gates;
CREATE TRIGGER trg_project_quality_gates_org_id
  BEFORE INSERT OR UPDATE OF project_id ON project_quality_gates
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_renovation_project();

-- approval_thresholds: project_id FK to renovation_projects
DROP TRIGGER IF EXISTS trg_approval_thresholds_org_id ON approval_thresholds;
CREATE TRIGGER trg_approval_thresholds_org_id
  BEFORE INSERT OR UPDATE OF project_id ON approval_thresholds
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_renovation_project();

-- ============================================================
-- LEVEL 4b: project_packages inherit from project_phases
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_project_phase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phase_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM project_phases WHERE id = NEW.phase_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_packages_org_id ON project_packages;
CREATE TRIGGER trg_project_packages_org_id
  BEFORE INSERT OR UPDATE OF phase_id ON project_packages
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_project_phase();

-- ============================================================
-- LEVEL 5: tasks inherit from projects (renovation_projects via renovation_project_id)
-- NOTE: tasks.renovation_project_id is the FK to renovation_projects
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_for_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.renovation_project_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM renovation_projects WHERE id = NEW.renovation_project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_org_id ON tasks;
CREATE TRIGGER trg_tasks_org_id
  BEFORE INSERT OR UPDATE OF renovation_project_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_for_task();

-- task_photos and task_audio inherit from tasks
CREATE OR REPLACE FUNCTION sync_org_id_from_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM tasks WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_photos_org_id ON task_photos;
CREATE TRIGGER trg_task_photos_org_id
  BEFORE INSERT OR UPDATE OF task_id ON task_photos
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_task();

DROP TRIGGER IF EXISTS trg_task_audio_org_id ON task_audio;
CREATE TRIGGER trg_task_audio_org_id
  BEFORE INSERT OR UPDATE OF task_id ON task_audio
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_task();

-- task_dependencies: task_id FK to tasks
-- NOTE: task_dependencies.task_id is "the task that has a dependency" per 012_task_enhancements
DROP TRIGGER IF EXISTS trg_task_dependencies_org_id ON task_dependencies;
CREATE TRIGGER trg_task_dependencies_org_id
  BEFORE INSERT OR UPDATE OF task_id ON task_dependencies
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_task();

-- ============================================================
-- LEVEL 6: work_orders inherit from tasks
-- NOTE: work_orders.task_id FK to tasks (per 013_work_order.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_task_for_wo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM tasks WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_orders_org_id ON work_orders;
CREATE TRIGGER trg_work_orders_org_id
  BEFORE INSERT OR UPDATE OF task_id ON work_orders
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_task_for_wo();

-- ============================================================
-- LEVEL 7: work_order children inherit from work_orders
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_work_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.work_order_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM work_orders WHERE id = NEW.work_order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_order_events_org_id ON work_order_events;
CREATE TRIGGER trg_work_order_events_org_id
  BEFORE INSERT OR UPDATE OF work_order_id ON work_order_events
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_work_order();

DROP TRIGGER IF EXISTS trg_offers_org_id ON offers;
CREATE TRIGGER trg_offers_org_id
  BEFORE INSERT OR UPDATE OF work_order_id ON offers
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_work_order();

DROP TRIGGER IF EXISTS trg_change_orders_org_id ON change_orders;
CREATE TRIGGER trg_change_orders_org_id
  BEFORE INSERT OR UPDATE OF work_order_id ON change_orders
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_work_order();

-- magic_link_tokens: work_order_id FK (optional — only set for work_order_access purpose)
DROP TRIGGER IF EXISTS trg_magic_link_tokens_org_id ON magic_link_tokens;
CREATE TRIGGER trg_magic_link_tokens_org_id
  BEFORE INSERT OR UPDATE OF work_order_id ON magic_link_tokens
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_work_order();

-- ticket_work_orders: junction table; use work_order_id as primary org source
DROP TRIGGER IF EXISTS trg_ticket_work_orders_org_id ON ticket_work_orders;
CREATE TRIGGER trg_ticket_work_orders_org_id
  BEFORE INSERT OR UPDATE OF work_order_id ON ticket_work_orders
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_work_order();

-- invoices: dual-parent — work_order_id preferred, renovation_project_id as fallback
-- NOTE: invoices uses renovation_project_id (not project_id) per 018_invoice.sql
CREATE OR REPLACE FUNCTION sync_org_id_for_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.work_order_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM work_orders WHERE id = NEW.work_order_id;
  ELSIF NEW.renovation_project_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM renovation_projects WHERE id = NEW.renovation_project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_org_id ON invoices;
CREATE TRIGGER trg_invoices_org_id
  BEFORE INSERT OR UPDATE OF work_order_id, renovation_project_id ON invoices
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_for_invoice();

-- expenses: dual-parent — renovation_project_id preferred, work_order_id as fallback
-- NOTE: expenses uses renovation_project_id per 019_expense.sql; also has unit_id/room_id
CREATE OR REPLACE FUNCTION sync_org_id_for_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.renovation_project_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM renovation_projects WHERE id = NEW.renovation_project_id;
  ELSIF NEW.work_order_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM work_orders WHERE id = NEW.work_order_id;
  ELSIF NEW.unit_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM units WHERE id = NEW.unit_id;
  ELSIF NEW.room_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM rooms WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_org_id ON expenses;
CREATE TRIGGER trg_expenses_org_id
  BEFORE INSERT OR UPDATE OF renovation_project_id, work_order_id, unit_id, room_id ON expenses
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_for_expense();

-- payments inherit from invoices
CREATE OR REPLACE FUNCTION sync_org_id_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM invoices WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_org_id ON payments;
CREATE TRIGGER trg_payments_org_id
  BEFORE INSERT OR UPDATE OF invoice_id ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_invoice();

-- ============================================================
-- LEVEL 8: change_order children inherit from change_orders
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_change_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.change_order_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM change_orders WHERE id = NEW.change_order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_change_order_versions_org_id ON change_order_versions;
CREATE TRIGGER trg_change_order_versions_org_id
  BEFORE INSERT OR UPDATE OF change_order_id ON change_order_versions
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_change_order();

DROP TRIGGER IF EXISTS trg_change_order_photos_org_id ON change_order_photos;
CREATE TRIGGER trg_change_order_photos_org_id
  BEFORE INSERT OR UPDATE OF change_order_id ON change_order_photos
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_change_order();

DROP TRIGGER IF EXISTS trg_change_order_approval_tokens_org_id ON change_order_approval_tokens;
CREATE TRIGGER trg_change_order_approval_tokens_org_id
  BEFORE INSERT OR UPDATE OF change_order_id ON change_order_approval_tokens
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_change_order();

-- ============================================================
-- LEVEL 7b: inspections inherit from work_orders or renovation_projects
-- NOTE: inspections.project_id FK is to renovation_projects (059_inspections.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_for_inspection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.work_order_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM work_orders WHERE id = NEW.work_order_id;
  ELSIF NEW.project_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM renovation_projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inspections_org_id ON inspections;
CREATE TRIGGER trg_inspections_org_id
  BEFORE INSERT OR UPDATE OF work_order_id, project_id ON inspections
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_for_inspection();

-- inspection children inherit from inspections
CREATE OR REPLACE FUNCTION sync_org_id_from_inspection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inspection_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM inspections WHERE id = NEW.inspection_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inspection_defects_org_id ON inspection_defects;
CREATE TRIGGER trg_inspection_defects_org_id
  BEFORE INSERT OR UPDATE OF inspection_id ON inspection_defects
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_inspection();

DROP TRIGGER IF EXISTS trg_inspection_portal_tokens_org_id ON inspection_portal_tokens;
CREATE TRIGGER trg_inspection_portal_tokens_org_id
  BEFORE INSERT OR UPDATE OF inspection_id ON inspection_portal_tokens
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_inspection();

-- ============================================================
-- LEVEL 7c: ticket children inherit from tickets
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM tickets WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_messages_org_id ON ticket_messages;
CREATE TRIGGER trg_ticket_messages_org_id
  BEFORE INSERT OR UPDATE OF ticket_id ON ticket_messages
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_ticket();

DROP TRIGGER IF EXISTS trg_ticket_attachments_org_id ON ticket_attachments;
CREATE TRIGGER trg_ticket_attachments_org_id
  BEFORE INSERT OR UPDATE OF ticket_id ON ticket_attachments
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_ticket();

-- ============================================================
-- LEVEL 7d: purchase_order children inherit from purchase_orders
-- NOTE: purchase_orders itself has no hierarchical parent — it is a direct-org table.
-- It will be backfilled in Phase 36. Its children CAN inherit via trigger.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_purchase_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.purchase_order_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM purchase_orders WHERE id = NEW.purchase_order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deliveries_org_id ON deliveries;
CREATE TRIGGER trg_deliveries_org_id
  BEFORE INSERT OR UPDATE OF purchase_order_id ON deliveries
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_purchase_order();

DROP TRIGGER IF EXISTS trg_purchase_order_allocations_org_id ON purchase_order_allocations;
CREATE TRIGGER trg_purchase_order_allocations_org_id
  BEFORE INSERT OR UPDATE OF purchase_order_id ON purchase_order_allocations
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_purchase_order();

-- ============================================================
-- LEVEL 8: kb_articles inherit from kb_categories
-- NOTE: kb_categories is a direct-org table (backfill in Phase 36).
-- kb_articles CAN inherit from kb_categories via trigger.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_org_id_from_kb_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM kb_categories WHERE id = NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kb_articles_org_id ON kb_articles;
CREATE TRIGGER trg_kb_articles_org_id
  BEFORE INSERT OR UPDATE OF category_id ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_kb_category();

-- kb children inherit from kb_articles
CREATE OR REPLACE FUNCTION sync_org_id_from_kb_article()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.article_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM kb_articles WHERE id = NEW.article_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kb_articles_history_org_id ON kb_articles_history;
CREATE TRIGGER trg_kb_articles_history_org_id
  BEFORE INSERT OR UPDATE OF article_id ON kb_articles_history
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_kb_article();

DROP TRIGGER IF EXISTS trg_kb_workflow_transitions_org_id ON kb_workflow_transitions;
CREATE TRIGGER trg_kb_workflow_transitions_org_id
  BEFORE INSERT OR UPDATE OF article_id ON kb_workflow_transitions
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_kb_article();

DROP TRIGGER IF EXISTS trg_kb_attachments_org_id ON kb_attachments;
CREATE TRIGGER trg_kb_attachments_org_id
  BEFORE INSERT OR UPDATE OF article_id ON kb_attachments
  FOR EACH ROW EXECUTE FUNCTION sync_org_id_from_kb_article();
