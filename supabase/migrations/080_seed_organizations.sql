-- KEWA v4.0: Multi-Tenant Data Migration
-- Migration: 080_seed_organizations.sql
-- Creates: Organizations, owners, mandates, users, organization_members seed data
-- Requirements: MIGR-01
-- Phase 36: Data Migration & Backfill

-- UUID Namespace Reference:
--   0010 = Organizations
--   0011 = Owners
--   0012 = Mandates
--   0020 = New users (Phase 36 seed)

-- =============================================
-- SECTION 1: Organizations (D1, D2)
-- =============================================

-- KEWA AG — Real Handelsregister data (D1)
INSERT INTO organizations (id, name, slug, uid, commercial_register, country, is_active)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  'KeWa AG',
  'kewa-ag',
  'CHE-135.108.414',
  'CH-130.3.026.656-4',
  'CH',
  true
)
ON CONFLICT (id) DO NOTHING;

-- GIMBA AG — Real Handelsregister data (D2)
INSERT INTO organizations (id, name, slug, uid, commercial_register, country, is_active)
VALUES (
  '00000000-0000-0000-0010-000000000002',
  'GIMBA AG',
  'gimba-ag',
  'CHE-217.838.550',
  'CH-290.3.020.028-0',
  'CH',
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SECTION 2: Owners (D3)
-- =============================================

-- KEWA AG Owner 1: KeWa AG itself (Eigenverwaltung)
INSERT INTO owners (id, organization_id, owner_type, name, address, postal_code, city, country)
VALUES (
  '00000000-0000-0000-0011-000000000001',
  '00000000-0000-0000-0010-000000000001',  -- KEWA AG
  'company',
  'KeWa AG',
  'Rietbrunnen 42',
  '8808',
  'Pfaeffikon SZ',
  'CH'
)
ON CONFLICT (id) DO NOTHING;

-- KEWA AG Owner 2: Erbengemeinschaft Brunner (Drittverwaltung)
-- user_id will be set after Fritz Brunner user is inserted (Section 5)
INSERT INTO owners (id, organization_id, owner_type, name, address, postal_code, city, country, phone, email)
VALUES (
  '00000000-0000-0000-0011-000000000002',
  '00000000-0000-0000-0010-000000000001',  -- KEWA AG
  'community',
  'Erbengemeinschaft Brunner',
  'Muehlegasse 12',
  '8001',
  'Zuerich',
  'CH',
  '+41 44 211 33 44',
  'fritz.brunner@bluewin.ch'
)
ON CONFLICT (id) DO NOTHING;

-- KEWA AG Owner 3: Pensionskasse Stadt Zuerich (institutional, no portal login)
INSERT INTO owners (id, organization_id, owner_type, name, address, postal_code, city, country)
VALUES (
  '00000000-0000-0000-0011-000000000003',
  '00000000-0000-0000-0010-000000000001',  -- KEWA AG
  'company',
  'Pensionskasse Stadt Zuerich',
  'Stadthausquai 17',
  '8001',
  'Zuerich',
  'CH'
)
ON CONFLICT (id) DO NOTHING;

-- GIMBA AG Owner: Graber Immobilien GmbH
INSERT INTO owners (id, organization_id, owner_type, name, address, postal_code, city, country)
VALUES (
  '00000000-0000-0000-0011-000000000004',
  '00000000-0000-0000-0010-000000000002',  -- GIMBA AG
  'company',
  'Graber Immobilien GmbH',
  'Hauptstrasse 15',
  '8455',
  'Ruedlingen',
  'CH'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SECTION 3: Mandates (D3)
-- All mandates: start_date = '2024-01-01', end_date = NULL (ongoing), is_active = true
-- =============================================

-- Mandate 1: Eigenverwaltung KEWA (KeWa AG as owner, rental)
INSERT INTO mandates (id, organization_id, owner_id, name, mandate_type, start_date, end_date, is_active)
VALUES (
  '00000000-0000-0000-0012-000000000001',
  '00000000-0000-0000-0010-000000000001',  -- KEWA AG org
  '00000000-0000-0000-0011-000000000001',  -- KeWa AG owner
  'Eigenverwaltung KEWA',
  'rental',
  '2024-01-01',
  NULL,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Mandate 2: Mandat Brunner (Erbengemeinschaft Brunner, rental)
INSERT INTO mandates (id, organization_id, owner_id, name, mandate_type, start_date, end_date, is_active)
VALUES (
  '00000000-0000-0000-0012-000000000002',
  '00000000-0000-0000-0010-000000000001',  -- KEWA AG org
  '00000000-0000-0000-0011-000000000002',  -- Erbengemeinschaft Brunner
  'Mandat Brunner',
  'rental',
  '2024-01-01',
  NULL,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Mandate 3: STWE Pensionskasse ZH (Pensionskasse Stadt Zuerich, stwe)
INSERT INTO mandates (id, organization_id, owner_id, name, mandate_type, start_date, end_date, is_active)
VALUES (
  '00000000-0000-0000-0012-000000000003',
  '00000000-0000-0000-0010-000000000001',  -- KEWA AG org
  '00000000-0000-0000-0011-000000000003',  -- Pensionskasse Stadt Zuerich
  'STWE Pensionskasse ZH',
  'stwe',
  '2024-01-01',
  NULL,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Mandate 4: Verwaltung Graber (Graber Immobilien GmbH, rental)
INSERT INTO mandates (id, organization_id, owner_id, name, mandate_type, start_date, end_date, is_active)
VALUES (
  '00000000-0000-0000-0012-000000000004',
  '00000000-0000-0000-0010-000000000002',  -- GIMBA AG org
  '00000000-0000-0000-0011-000000000004',  -- Graber Immobilien GmbH
  'Verwaltung Graber',
  'rental',
  '2024-01-01',
  NULL,
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SECTION 4: Users (D5)
-- All new users use role = 'kewa' as placeholder (D8: legacy column NOT NULL,
-- will be dropped in Phase 37).
-- PIN hash and password hash both use bcrypt('test1234') placeholder.
-- =============================================

-- Update existing user "KEWA AG" (ID ...0001) to Rolf Kaelin with admin role
-- (Re-using existing user preserves all FK references)
UPDATE users SET
  display_name = 'Rolf Kaelin',
  role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Update existing user Imeri (ID ...0002) to hauswart role (D5, D9)
UPDATE users SET
  role_id = (SELECT id FROM roles WHERE name = 'hauswart')
WHERE id = '00000000-0000-0000-0000-000000000002';

-- ---- New KEWA AG Users ----

-- Flurina Kaelin — admin, pin auth
INSERT INTO users (id, pin_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000001',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Flurina Kaelin',
  (SELECT id FROM roles WHERE name = 'admin'),
  'pin',
  true,
  false
)
ON CONFLICT (id) DO NOTHING;

-- Sandra Keller — accounting, email_password auth
INSERT INTO users (id, pin_hash, email, password_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000002',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'sandra.keller@kewa.ch',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Sandra Keller',
  (SELECT id FROM roles WHERE name = 'accounting'),
  'email_password',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Beat Steiner — hauswart, pin auth
INSERT INTO users (id, pin_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000003',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Beat Steiner',
  (SELECT id FROM roles WHERE name = 'hauswart'),
  'pin',
  true,
  false
)
ON CONFLICT (id) DO NOTHING;

-- Fritz Brunner — tenant, email_password auth (prepared for owner portal FK)
INSERT INTO users (id, pin_hash, email, password_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000004',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'fritz.brunner@bluewin.ch',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Fritz Brunner',
  (SELECT id FROM roles WHERE name = 'tenant'),
  'email_password',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ---- New GIMBA AG Users ----

-- Simon Graber — admin, pin auth (VR-Praesident GIMBA AG)
INSERT INTO users (id, pin_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000005',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Simon Graber',
  (SELECT id FROM roles WHERE name = 'admin'),
  'pin',
  true,
  false
)
ON CONFLICT (id) DO NOTHING;

-- Lisa Meier — property_manager, email_password auth
INSERT INTO users (id, pin_hash, email, password_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000006',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'lisa.meier@gimba.ch',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Lisa Meier',
  (SELECT id FROM roles WHERE name = 'property_manager'),
  'email_password',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Markus Huber — tenant, email_password auth
INSERT INTO users (id, pin_hash, email, password_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000007',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'markus.huber@example.com',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Markus Huber',
  (SELECT id FROM roles WHERE name = 'tenant'),
  'email_password',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Paolo Rossi — external_contractor, pin auth
INSERT INTO users (id, pin_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000008',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Paolo Rossi',
  (SELECT id FROM roles WHERE name = 'external_contractor'),
  'pin',
  true,
  false
)
ON CONFLICT (id) DO NOTHING;

-- ---- Cross-Organization Users ----

-- Mario Giacchino — external_contractor, pin auth (member of BOTH orgs)
INSERT INTO users (id, pin_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000009',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Mario Giacchino',
  (SELECT id FROM roles WHERE name = 'external_contractor'),
  'pin',
  true,
  false
)
ON CONFLICT (id) DO NOTHING;

-- Thomas Wyss — property_manager, email_password auth (member of BOTH orgs)
INSERT INTO users (id, pin_hash, email, password_hash, role, display_name, role_id, auth_method, is_active, email_verified)
VALUES (
  '00000000-0000-0000-0020-000000000010',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'thomas.wyss@treuhand.ch',
  '$2b$10$mZk/6eWmIPwvfwz/jkaBceGz2/l6YqX.KPI.FNGWZSMqOFIjsHXi2',
  'kewa',
  'Thomas Wyss',
  (SELECT id FROM roles WHERE name = 'property_manager'),
  'email_password',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SECTION 5: Update owner user_id FK
-- Set Fritz Brunner as the contact user for Erbengemeinschaft Brunner (owner portal FK)
-- =============================================

UPDATE owners
SET user_id = '00000000-0000-0000-0020-000000000004'  -- Fritz Brunner
WHERE id = '00000000-0000-0000-0011-000000000002';    -- Erbengemeinschaft Brunner

-- =============================================
-- SECTION 6: Organization Members (MIGR-01)
-- Map ALL users to their organization(s) with correct role_id and is_default flag.
-- Cross-org users (Mario, Thomas) appear in both orgs.
-- =============================================

-- ---- KEWA AG Members (organization_id = 0010-...001) ----

-- Rolf Kaelin (existing user ...0001, renamed) — admin
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM roles WHERE name = 'admin'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Imeri (existing user ...0002) — hauswart
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0000-000000000002',
  (SELECT id FROM roles WHERE name = 'hauswart'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Flurina Kaelin — admin
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0020-000000000001',
  (SELECT id FROM roles WHERE name = 'admin'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Sandra Keller — accounting
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0020-000000000002',
  (SELECT id FROM roles WHERE name = 'accounting'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Beat Steiner — hauswart
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0020-000000000003',
  (SELECT id FROM roles WHERE name = 'hauswart'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Fritz Brunner — tenant
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0020-000000000004',
  (SELECT id FROM roles WHERE name = 'tenant'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Mario Giacchino — external_contractor, is_default=true (KEWA is primary org)
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0020-000000000009',
  (SELECT id FROM roles WHERE name = 'external_contractor'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Thomas Wyss — property_manager, is_default=true (KEWA is primary org)
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0020-000000000010',
  (SELECT id FROM roles WHERE name = 'property_manager'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Existing tenant users from 063_seed_tenant_portal.sql (no deterministic UUIDs, lookup by email)

-- Hans Mueller — tenant
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
SELECT
  '00000000-0000-0000-0010-000000000001',
  u.id,
  (SELECT id FROM roles WHERE name = 'tenant'),
  true
FROM users u WHERE u.email = 'mueller@example.com'
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Anna Schmidt — tenant
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
SELECT
  '00000000-0000-0000-0010-000000000001',
  u.id,
  (SELECT id FROM roles WHERE name = 'tenant'),
  true
FROM users u WHERE u.email = 'schmidt@example.com'
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Peter Weber — tenant
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
SELECT
  '00000000-0000-0000-0010-000000000001',
  u.id,
  (SELECT id FROM roles WHERE name = 'tenant'),
  true
FROM users u WHERE u.email = 'weber@example.com'
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ---- GIMBA AG Members (organization_id = 0010-...002) ----

-- Simon Graber — admin
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0020-000000000005',
  (SELECT id FROM roles WHERE name = 'admin'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Lisa Meier — property_manager
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0020-000000000006',
  (SELECT id FROM roles WHERE name = 'property_manager'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Markus Huber — tenant
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0020-000000000007',
  (SELECT id FROM roles WHERE name = 'tenant'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Paolo Rossi — external_contractor
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0020-000000000008',
  (SELECT id FROM roles WHERE name = 'external_contractor'),
  true
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Mario Giacchino — external_contractor, is_default=false (KEWA is default)
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0020-000000000009',
  (SELECT id FROM roles WHERE name = 'external_contractor'),
  false
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Thomas Wyss — property_manager, is_default=false (KEWA is default)
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
VALUES (
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0020-000000000010',
  (SELECT id FROM roles WHERE name = 'property_manager'),
  false
)
ON CONFLICT (organization_id, user_id) DO NOTHING;
