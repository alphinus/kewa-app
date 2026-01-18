-- KEWA Renovations Operations System
-- Migration: 022_rbac.sql
-- AUTH-01, AUTH-02: Role-Based Access Control with 5 roles

-- =============================================
-- USER ROLE ENUM
-- =============================================

CREATE TYPE user_role AS ENUM (
  'admin',
  'property_manager',
  'accounting',
  'tenant',
  'external_contractor'
);

-- =============================================
-- AUTH METHOD ENUM
-- =============================================

CREATE TYPE auth_method AS ENUM (
  'pin',
  'email_password',
  'magic_link'
);

-- =============================================
-- ROLES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name user_role UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_internal BOOLEAN DEFAULT false, -- Can access internal dashboard
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 5 roles
INSERT INTO roles (name, display_name, description, is_internal) VALUES
  ('admin', 'Administrator', 'Full system access, manages all settings', true),
  ('property_manager', 'Property Manager', 'Manages properties, projects, and work orders', true),
  ('accounting', 'Accounting', 'Manages costs, invoices, and payments', true),
  ('tenant', 'Tenant', 'Views own unit, creates tickets', false),
  ('external_contractor', 'External Contractor', 'Views and responds to assigned work orders', false)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- PERMISSIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'projects:create'
  name TEXT NOT NULL,
  description TEXT,
  resource TEXT NOT NULL, -- e.g., 'projects'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROLE-PERMISSION JUNCTION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- =============================================
-- SEED PERMISSIONS
-- =============================================

INSERT INTO permissions (code, name, resource, action, description) VALUES
  -- Properties
  ('properties:read', 'View Properties', 'properties', 'read', 'View property details'),
  ('properties:create', 'Create Properties', 'properties', 'create', 'Create new properties'),
  ('properties:update', 'Update Properties', 'properties', 'update', 'Edit property details'),
  ('properties:delete', 'Delete Properties', 'properties', 'delete', 'Delete properties'),

  -- Units
  ('units:read', 'View Units', 'units', 'read', 'View unit details'),
  ('units:create', 'Create Units', 'units', 'create', 'Create new units'),
  ('units:update', 'Update Units', 'units', 'update', 'Edit unit details'),
  ('units:delete', 'Delete Units', 'units', 'delete', 'Delete units'),

  -- Projects
  ('projects:read', 'View Projects', 'projects', 'read', 'View project details'),
  ('projects:create', 'Create Projects', 'projects', 'create', 'Create new projects'),
  ('projects:update', 'Update Projects', 'projects', 'update', 'Edit project details'),
  ('projects:delete', 'Delete Projects', 'projects', 'delete', 'Delete projects'),
  ('projects:archive', 'Archive Projects', 'projects', 'archive', 'Archive/restore projects'),

  -- Tasks
  ('tasks:read', 'View Tasks', 'tasks', 'read', 'View task details'),
  ('tasks:create', 'Create Tasks', 'tasks', 'create', 'Create new tasks'),
  ('tasks:update', 'Update Tasks', 'tasks', 'update', 'Edit task details'),
  ('tasks:delete', 'Delete Tasks', 'tasks', 'delete', 'Delete tasks'),
  ('tasks:complete', 'Complete Tasks', 'tasks', 'complete', 'Mark tasks as complete'),

  -- Work Orders
  ('work_orders:read', 'View Work Orders', 'work_orders', 'read', 'View work order details'),
  ('work_orders:create', 'Create Work Orders', 'work_orders', 'create', 'Create new work orders'),
  ('work_orders:update', 'Update Work Orders', 'work_orders', 'update', 'Edit work order details'),
  ('work_orders:delete', 'Delete Work Orders', 'work_orders', 'delete', 'Delete work orders'),
  ('work_orders:respond', 'Respond to Work Orders', 'work_orders', 'respond', 'Accept/reject work orders'),

  -- Partners
  ('partners:read', 'View Partners', 'partners', 'read', 'View partner details'),
  ('partners:create', 'Create Partners', 'partners', 'create', 'Create new partners'),
  ('partners:update', 'Update Partners', 'partners', 'update', 'Edit partner details'),
  ('partners:delete', 'Delete Partners', 'partners', 'delete', 'Delete partners'),

  -- Costs
  ('costs:read', 'View Costs', 'costs', 'read', 'View cost details'),
  ('costs:create', 'Create Costs', 'costs', 'create', 'Create invoices/expenses'),
  ('costs:update', 'Update Costs', 'costs', 'update', 'Edit cost entries'),
  ('costs:delete', 'Delete Costs', 'costs', 'delete', 'Delete cost entries'),
  ('costs:approve', 'Approve Costs', 'costs', 'approve', 'Approve invoices for payment'),
  ('costs:export', 'Export Costs', 'costs', 'export', 'Export cost data to CSV'),

  -- Reports
  ('reports:read', 'View Reports', 'reports', 'read', 'View reports'),
  ('reports:create', 'Generate Reports', 'reports', 'create', 'Generate new reports'),

  -- Users
  ('users:read', 'View Users', 'users', 'read', 'View user details'),
  ('users:create', 'Create Users', 'users', 'create', 'Create new users'),
  ('users:update', 'Update Users', 'users', 'update', 'Edit user details'),
  ('users:delete', 'Delete Users', 'users', 'delete', 'Delete users'),

  -- Tenants
  ('tenants:read', 'View Tenants', 'tenants', 'read', 'View tenant details'),
  ('tenants:manage', 'Manage Tenants', 'tenants', 'manage', 'Create/edit/delete tenants'),

  -- Tickets
  ('tickets:read', 'View Tickets', 'tickets', 'read', 'View tenant tickets'),
  ('tickets:create', 'Create Tickets', 'tickets', 'create', 'Create new tickets'),
  ('tickets:update', 'Update Tickets', 'tickets', 'update', 'Edit tickets'),
  ('tickets:convert', 'Convert Tickets', 'tickets', 'convert', 'Convert ticket to work order'),

  -- Audit
  ('audit:read', 'View Audit Logs', 'audit', 'read', 'View audit trail'),

  -- Settings
  ('settings:read', 'View Settings', 'settings', 'read', 'View system settings'),
  ('settings:update', 'Update Settings', 'settings', 'update', 'Edit system settings')

ON CONFLICT (code) DO NOTHING;

-- =============================================
-- ASSIGN PERMISSIONS TO ROLES
-- =============================================

-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Property Manager: most except user management and settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'property_manager'
  AND p.code NOT LIKE 'users:%'
  AND p.code NOT LIKE 'settings:%'
  AND p.code != 'audit:read'
ON CONFLICT DO NOTHING;

-- Accounting: costs, reports, read-only on projects/work orders
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'accounting'
  AND (
    p.code LIKE 'costs:%'
    OR p.code LIKE 'reports:%'
    OR p.code IN ('projects:read', 'work_orders:read', 'partners:read', 'units:read', 'properties:read')
  )
ON CONFLICT DO NOTHING;

-- Tenant: own unit, create tickets
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'tenant'
  AND p.code IN ('units:read', 'tickets:create', 'tickets:read')
ON CONFLICT DO NOTHING;

-- External Contractor: own work orders only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'external_contractor'
  AND p.code IN ('work_orders:read', 'work_orders:respond')
ON CONFLICT DO NOTHING;

-- =============================================
-- INDEXES FOR ROLES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_internal ON roles(is_internal);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE roles IS 'System roles for RBAC';
COMMENT ON COLUMN roles.name IS 'Role identifier matching user_role enum';
COMMENT ON COLUMN roles.is_internal IS 'True for roles that can access internal dashboard';
COMMENT ON TABLE permissions IS 'Granular permissions for resource:action pairs';
COMMENT ON COLUMN permissions.code IS 'Permission code in format resource:action';
COMMENT ON TABLE role_permissions IS 'Junction table linking roles to their permissions';
