-- KEWA Renovations Operations System
-- Migration: 028_audit_triggers.sql
-- NFR-01: Automatic audit logging for all tables

-- =============================================
-- GENERIC AUDIT TRIGGER FUNCTION
-- =============================================

-- Generic audit trigger function for all tables
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_action audit_action;
  v_user_id UUID;
  v_changed_fields TEXT[];
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_values := to_jsonb(NEW);
    v_old_values := NULL;
    -- Try to get user from created_by field
    BEGIN
      v_user_id := (v_new_values->>'created_by')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    -- Try to get user from updated_by or created_by
    BEGIN
      v_user_id := COALESCE(
        (v_new_values->>'updated_by')::UUID,
        (v_new_values->>'created_by')::UUID
      );
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    -- Calculate changed fields
    SELECT array_agg(key) INTO v_changed_fields
    FROM (
      SELECT key
      FROM jsonb_object_keys(v_new_values) AS key
      WHERE v_old_values->key IS DISTINCT FROM v_new_values->key
        AND key NOT IN ('updated_at') -- Exclude auto-updated timestamp
    ) AS changed_keys;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
    v_user_id := NULL;
  END IF;

  -- Insert audit log (skip if only updated_at changed)
  IF TG_OP != 'UPDATE' OR array_length(v_changed_fields, 1) > 0 THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      old_values,
      new_values,
      changed_fields
    ) VALUES (
      TG_TABLE_NAME,
      COALESCE((NEW).id, (OLD).id),
      v_action,
      v_user_id,
      v_old_values,
      v_new_values,
      v_changed_fields
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ADD AUDIT TRIGGERS TO ALL IMPORTANT TABLES
-- =============================================

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'properties',
    'buildings',
    'units',
    'rooms',
    'components',
    'renovation_projects',
    'tasks',
    'work_orders',
    'partners',
    'offers',
    'invoices',
    'expenses',
    'payments',
    'media',
    'users'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Drop existing trigger if exists
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON %I', t, t);

    -- Create new trigger
    EXECUTE format('
      CREATE TRIGGER audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()
    ', t, t);

    RAISE NOTICE 'Created audit trigger for table: %', t;
  END LOOP;
END;
$$;

-- =============================================
-- ADD AUDIT TRIGGERS TO JUNCTION TABLES
-- =============================================

-- Task dependencies
DROP TRIGGER IF EXISTS audit_task_dependencies ON task_dependencies;
CREATE TRIGGER audit_task_dependencies
  AFTER INSERT OR UPDATE OR DELETE ON task_dependencies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Condition history (also track changes to history itself for integrity)
DROP TRIGGER IF EXISTS audit_condition_history ON condition_history;
CREATE TRIGGER audit_condition_history
  AFTER INSERT OR UPDATE OR DELETE ON condition_history
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================
-- HELPER: Audit trigger for status changes only
-- =============================================

-- More lightweight audit for high-frequency status updates
CREATE OR REPLACE FUNCTION audit_status_change_function()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Try to get user
    BEGIN
      v_user_id := COALESCE(
        (to_jsonb(NEW)->>'updated_by')::UUID,
        (to_jsonb(NEW)->>'created_by')::UUID
      );
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      old_values,
      new_values,
      changed_fields
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'update',
      v_user_id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      ARRAY['status']
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION audit_trigger_function IS
  'Generic audit trigger that logs INSERT/UPDATE/DELETE operations to audit_logs table';
COMMENT ON FUNCTION audit_status_change_function IS
  'Lightweight audit trigger for status-only changes (high-frequency updates)';
