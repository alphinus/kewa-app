-- KEWA Renovations Operations System
-- Migration: 016_audit_log.sql
-- DATA-15: Comprehensive audit logging

-- =============================================
-- AUDIT ACTION ENUM
-- =============================================

CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'archive', 'restore');

-- =============================================
-- AUDIT LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,

  -- Who changed it
  user_id UUID REFERENCES users(id),
  user_role TEXT,

  -- Change details
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],

  -- Context
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp (no updated_at - logs are immutable)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- =============================================
-- HELPER FUNCTION: Create audit log entry
-- =============================================

CREATE OR REPLACE FUNCTION create_audit_log(
  p_table_name TEXT,
  p_record_id UUID,
  p_action audit_action,
  p_user_id UUID,
  p_user_role TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_changed_fields TEXT[];
  v_log_id UUID;
BEGIN
  -- Calculate changed fields for update operations
  IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM (
      SELECT key
      FROM jsonb_object_keys(p_new_values) AS key
      WHERE p_old_values->key IS DISTINCT FROM p_new_values->key
    ) AS changed_keys;
  END IF;

  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    user_role,
    old_values,
    new_values,
    changed_fields,
    ip_address,
    user_agent
  ) VALUES (
    p_table_name,
    p_record_id,
    p_action,
    p_user_id,
    p_user_role,
    p_old_values,
    p_new_values,
    v_changed_fields,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Get history for a record
-- =============================================

CREATE OR REPLACE FUNCTION get_record_history(
  p_table_name TEXT,
  p_record_id UUID
) RETURNS TABLE (
  id UUID,
  action audit_action,
  user_id UUID,
  user_role TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.action,
    al.user_id,
    al.user_role,
    al.old_values,
    al.new_values,
    al.changed_fields,
    al.created_at
  FROM audit_logs al
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE audit_logs IS 'Immutable audit log for all data changes';
COMMENT ON COLUMN audit_logs.table_name IS 'Name of the table that was modified';
COMMENT ON COLUMN audit_logs.record_id IS 'UUID of the record that was modified';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: create, update, delete, archive, restore';
COMMENT ON COLUMN audit_logs.old_values IS 'JSONB snapshot of record before change (for update/delete)';
COMMENT ON COLUMN audit_logs.new_values IS 'JSONB snapshot of record after change (for create/update)';
COMMENT ON COLUMN audit_logs.changed_fields IS 'Array of field names that were changed';
COMMENT ON FUNCTION create_audit_log IS 'Helper to create audit log entries with automatic diff calculation';
COMMENT ON FUNCTION get_record_history IS 'Helper to retrieve full history for a record';
