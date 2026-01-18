-- KEWA Renovations Operations System
-- Migration: 023_users_auth.sql
-- AUTH-03, AUTH-04: Extend users table for multi-auth support

-- =============================================
-- EXTEND USERS TABLE
-- =============================================

-- Add auth fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id),
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password_hash TEXT, -- For email+password auth
ADD COLUMN IF NOT EXISTS auth_method auth_method DEFAULT 'pin',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================
-- MIGRATE EXISTING USERS TO ROLES
-- =============================================

-- KEWA -> admin role
UPDATE users u
SET role_id = r.id, auth_method = 'pin'
FROM roles r
WHERE u.role = 'kewa' AND r.name = 'admin';

-- Imeri -> property_manager role
UPDATE users u
SET role_id = r.id, auth_method = 'pin'
FROM roles r
WHERE u.role = 'imeri' AND r.name = 'property_manager';

-- =============================================
-- INDEXES FOR AUTH FIELDS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_method ON users(auth_method);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =============================================
-- UPDATED_AT TRIGGER FOR USERS
-- =============================================

-- Reuse the existing update_updated_at_column function from 001_initial_schema.sql
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TENANT-UNIT RELATIONSHIP TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Primary tenant for the unit
  move_in_date DATE,
  move_out_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_unit ON tenant_users(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_active ON tenant_users(unit_id)
  WHERE move_out_date IS NULL;

-- =============================================
-- HELPER FUNCTION: Get user with role and permissions
-- =============================================

CREATE OR REPLACE FUNCTION get_user_with_permissions(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  role_name user_role,
  role_display_name TEXT,
  permissions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    r.name AS role_name,
    r.display_name AS role_display_name,
    ARRAY_AGG(p.code) AS permissions
  FROM users u
  JOIN roles r ON u.role_id = r.id
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  WHERE u.id = p_user_id AND u.is_active = true
  GROUP BY u.id, r.name, r.display_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Check if user has permission
-- =============================================

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users u
    JOIN role_permissions rp ON u.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id
      AND u.is_active = true
      AND p.code = p_permission_code
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN users.role_id IS 'FK to roles table, replaces legacy role column';
COMMENT ON COLUMN users.email IS 'Email for email+password and magic link auth';
COMMENT ON COLUMN users.email_verified IS 'Whether email has been verified';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash for email+password auth';
COMMENT ON COLUMN users.auth_method IS 'Which auth method this user uses';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
COMMENT ON COLUMN users.login_count IS 'Total number of successful logins';
COMMENT ON COLUMN users.is_active IS 'Whether account is active (can login)';

COMMENT ON TABLE tenant_users IS 'Links tenant users to their units';
COMMENT ON COLUMN tenant_users.is_primary IS 'Primary contact for the unit';
COMMENT ON COLUMN tenant_users.move_in_date IS 'Lease start date';
COMMENT ON COLUMN tenant_users.move_out_date IS 'Lease end date (null if active)';

COMMENT ON FUNCTION get_user_with_permissions IS 'Returns user with role and all permissions';
COMMENT ON FUNCTION user_has_permission IS 'Check if user has specific permission';
