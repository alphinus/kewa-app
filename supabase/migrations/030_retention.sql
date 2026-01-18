-- KEWA Renovations Operations System
-- Migration: 030_retention.sql
-- NFR-03: Configurable retention for audit logs and tokens

-- =============================================
-- SYSTEM SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- =============================================
-- SEED DEFAULT RETENTION SETTINGS
-- =============================================

INSERT INTO system_settings (key, value, description) VALUES
  ('audit_log_retention_days', '365', 'Days to keep audit logs (0 = forever)'),
  ('magic_link_expiry_hours', '72', 'Hours until magic link expires'),
  ('magic_link_cleanup_days', '30', 'Days to keep expired magic links before deletion'),
  ('media_retention_days', '0', 'Days to keep media files (0 = forever)'),
  ('session_timeout_hours', '24', 'Hours until session expires'),
  ('condition_history_retention_days', '0', 'Days to keep condition history (0 = forever)')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- HELPER: Get setting value
-- =============================================

CREATE OR REPLACE FUNCTION get_setting(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM system_settings WHERE key = p_key;
  RETURN v_value;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER: Get setting as integer
-- =============================================

CREATE OR REPLACE FUNCTION get_setting_int(p_key TEXT, p_default INTEGER DEFAULT 0)
RETURNS INTEGER AS $$
DECLARE
  v_value INTEGER;
BEGIN
  SELECT (value #>> '{}')::INTEGER INTO v_value
  FROM system_settings WHERE key = p_key;

  RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Update setting
-- =============================================

CREATE OR REPLACE FUNCTION update_setting(
  p_key TEXT,
  p_value JSONB,
  p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO system_settings (key, value, updated_at, updated_by)
  VALUES (p_key, p_value, NOW(), p_user_id)
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW(),
      updated_by = EXCLUDED.updated_by;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Cleanup old audit logs
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  retention_days INTEGER;
  deleted_count INTEGER;
BEGIN
  retention_days := get_setting_int('audit_log_retention_days', 365);

  -- Skip cleanup if retention is 0 (forever)
  IF retention_days <= 0 THEN
    RETURN 0;
  END IF;

  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Cleanup expired magic links
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS INTEGER AS $$
DECLARE
  cleanup_days INTEGER;
  deleted_count INTEGER;
BEGIN
  cleanup_days := get_setting_int('magic_link_cleanup_days', 30);

  -- Always clean up if expired (even if cleanup_days is 0)
  IF cleanup_days <= 0 THEN
    cleanup_days := 30; -- Default to 30 days if not set
  END IF;

  -- Delete tokens that expired more than cleanup_days ago
  DELETE FROM magic_link_tokens
  WHERE expires_at < NOW() - (cleanup_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Cleanup old condition history (optional)
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_old_condition_history()
RETURNS INTEGER AS $$
DECLARE
  retention_days INTEGER;
  deleted_count INTEGER;
BEGIN
  retention_days := get_setting_int('condition_history_retention_days', 0);

  -- Skip cleanup if retention is 0 (forever)
  IF retention_days <= 0 THEN
    RETURN 0;
  END IF;

  DELETE FROM condition_history
  WHERE changed_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Run all cleanup tasks
-- =============================================

CREATE OR REPLACE FUNCTION run_cleanup_tasks()
RETURNS TABLE (
  task TEXT,
  deleted_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'audit_logs'::TEXT, cleanup_old_audit_logs()
  UNION ALL
  SELECT 'magic_link_tokens'::TEXT, cleanup_expired_magic_links()
  UNION ALL
  SELECT 'condition_history'::TEXT, cleanup_old_condition_history();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEW: Current retention settings
-- =============================================

CREATE OR REPLACE VIEW retention_settings AS
SELECT
  key,
  value,
  description,
  updated_at,
  u.display_name as updated_by_name
FROM system_settings s
LEFT JOIN users u ON s.updated_by = u.id
WHERE key LIKE '%retention%' OR key LIKE '%cleanup%' OR key LIKE '%expiry%'
ORDER BY key;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE system_settings IS 'System-wide configuration including retention policies';
COMMENT ON FUNCTION get_setting IS 'Get a setting value as JSONB';
COMMENT ON FUNCTION get_setting_int IS 'Get a setting value as integer with default';
COMMENT ON FUNCTION update_setting IS 'Update or insert a setting value';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Delete audit logs older than retention period';
COMMENT ON FUNCTION cleanup_expired_magic_links IS 'Delete magic link tokens that expired beyond cleanup period';
COMMENT ON FUNCTION cleanup_old_condition_history IS 'Delete condition history older than retention period';
COMMENT ON FUNCTION run_cleanup_tasks IS 'Run all cleanup tasks and return counts';
COMMENT ON VIEW retention_settings IS 'View of all retention-related settings';
