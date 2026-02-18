-- KEWA v4.0: Multi-Tenant Data Migration
-- Migration: 079_hauswart_role.sql
-- Creates: hauswart ENUM value, missing permissions, role record, role_permissions
-- Requirements: D9 (hauswart role)
-- Phase 36: Data Migration & Backfill

-- =============================================
-- STEP 1: Add hauswart ENUM value
-- NOTE: ADD VALUE cannot run inside a BEGIN/COMMIT block (PostgreSQL restriction).
-- This file has no explicit transaction wrapper — safe.
-- =============================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hauswart';

-- =============================================
-- STEP 2: Insert missing permissions that hauswart needs
-- The following codes are NOT in 022_rbac.sql:
--   buildings:read, rooms:read, inspections:read/create/update
-- =============================================

INSERT INTO permissions (code, name, resource, action, description) VALUES
  ('buildings:read',      'View Buildings',       'buildings',    'read',   'View building details'),
  ('rooms:read',          'View Rooms',            'rooms',        'read',   'View room details'),
  ('inspections:read',    'View Inspections',      'inspections',  'read',   'View inspection details'),
  ('inspections:create',  'Create Inspections',    'inspections',  'create', 'Create new inspections'),
  ('inspections:update',  'Update Inspections',    'inspections',  'update', 'Edit inspection details')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- STEP 3: Insert hauswart role record
-- =============================================

INSERT INTO roles (name, display_name, description, is_internal) VALUES
  ('hauswart', 'Hauswart', 'Gebaeudeunterhalt, Inspektionen und Meldungen', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- STEP 4: Assign 13 permissions to hauswart role
-- Explicit list: no financial access (costs, invoices, payments, reports, settings, users)
-- =============================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hauswart'
  AND p.code IN (
    'properties:read',
    'buildings:read',
    'units:read',
    'rooms:read',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'work_orders:read',
    'inspections:read',
    'inspections:create',
    'inspections:update',
    'tickets:read',
    'tickets:update'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
