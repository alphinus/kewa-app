-- KEWA v4.0: Multi-Tenant Data Migration
-- Migration: 081_seed_properties.sql
-- Creates: New property/building/unit hierarchies, backfills organization_id on all existing data
-- Requirements: MIGR-02
-- Phase 36: Data Migration & Backfill
--
-- UUID Namespaces used:
--   0013 = Properties (new)
--   0014 = Buildings (new)
--   0015 = Units (new, Leweg 4)
--   0016 = Units (new, all other properties)
--
-- Organizations (from 080_seed_organizations.sql):
--   KEWA AG:  00000000-0000-0000-0010-000000000001
--   GIMBA AG: 00000000-0000-0000-0010-000000000002
--
-- Mandates (from 080_seed_organizations.sql):
--   00000000-0000-0000-0012-000000000001 = Eigenverwaltung KEWA  (rental, owner: KeWa AG)
--   00000000-0000-0000-0012-000000000002 = Mandat Brunner        (rental, owner: Erbengemeinschaft Brunner)
--   00000000-0000-0000-0012-000000000003 = STWE Pensionskasse ZH (stwe,   owner: Pensionskasse Zuerich)
--   00000000-0000-0000-0012-000000000004 = Verwaltung Graber     (rental, owner: Graber Immobilien GmbH)

-- ============================================================
-- SECTION 1: Backfill existing properties
-- ============================================================
-- Two existing properties need organization_id, mandate_id, property_type backfilled.
-- ORDER: Do this FIRST so the flat backfill DO block below is a no-op for properties.

-- 1a. "Neubau Zürich West" — deterministic UUID from 047_seed_complete_workflow.sql
--     Belongs to STWE Pensionskasse ZH mandate
UPDATE properties SET
  organization_id = '00000000-0000-0000-0010-000000000001',
  mandate_id      = '00000000-0000-0000-0012-000000000003',
  property_type   = 'stwe'
WHERE id = '00000000-0000-0000-0002-000000000001'
  AND organization_id IS NULL;

-- 1b. "Liegenschaft KEWA" — auto-generated UUID from 008_property_building.sql
--     Rename to "Wohnanlage Seefeld" and assign to Eigenverwaltung KEWA mandate.
--     This building (00000000-0000-0000-0001-000000000001) has 13 apartments + common areas
--     representing the Seefeld complex. All existing renovation/task data stays intact.
UPDATE properties SET
  name          = 'Wohnanlage Seefeld',
  address       = 'Seefeldstrasse 120, 8008 Zuerich',
  organization_id = '00000000-0000-0000-0010-000000000001',
  mandate_id    = '00000000-0000-0000-0012-000000000001',
  property_type = 'rental'
WHERE name = 'Liegenschaft KEWA'
  AND organization_id IS NULL;

-- ============================================================
-- SECTION 2: New KEWA AG properties — Leweg 4 Buelach (D4 detailed)
-- ============================================================

-- Property 1: Leweg 4, 8180 Buelach
INSERT INTO properties (id, name, address, organization_id, mandate_id, property_type)
VALUES (
  '00000000-0000-0000-0013-000000000001',
  'Leweg 4',
  'Leweg 4, 8180 Buelach',
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0012-000000000001',
  'rental'
) ON CONFLICT (id) DO NOTHING;

-- Building: Leweg 4 MFH
INSERT INTO buildings (id, name, address, property_id, organization_id)
VALUES (
  '00000000-0000-0000-0014-000000000001',
  'Leweg 4',
  'Leweg 4, 8180 Buelach',
  '00000000-0000-0000-0013-000000000001',
  '00000000-0000-0000-0010-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- 10 units (3 per floor EG/OG1/OG2 + 1 Dachwohnung)
-- EG (floor 0): 3 apartments
INSERT INTO units (id, building_id, name, unit_type, floor, organization_id)
VALUES
  ('00000000-0000-0000-0015-000000000001', '00000000-0000-0000-0014-000000000001',
   '2.5-Zimmer-Wohnung EG links',   'apartment', 0, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0015-000000000002', '00000000-0000-0000-0014-000000000001',
   '3.5-Zimmer-Wohnung EG mitte',   'apartment', 0, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0015-000000000003', '00000000-0000-0000-0014-000000000001',
   '4.5-Zimmer-Wohnung EG rechts',  'apartment', 0, '00000000-0000-0000-0010-000000000001'),
-- OG1 (floor 1): 3 apartments
  ('00000000-0000-0000-0015-000000000004', '00000000-0000-0000-0014-000000000001',
   '2.5-Zimmer-Wohnung 1. OG links',  'apartment', 1, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0015-000000000005', '00000000-0000-0000-0014-000000000001',
   '3.5-Zimmer-Wohnung 1. OG mitte',  'apartment', 1, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0015-000000000006', '00000000-0000-0000-0014-000000000001',
   '4.5-Zimmer-Wohnung 1. OG rechts', 'apartment', 1, '00000000-0000-0000-0010-000000000001'),
-- OG2 (floor 2): 3 apartments
  ('00000000-0000-0000-0015-000000000007', '00000000-0000-0000-0014-000000000001',
   '2.5-Zimmer-Wohnung 2. OG links',  'apartment', 2, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0015-000000000008', '00000000-0000-0000-0014-000000000001',
   '3.5-Zimmer-Wohnung 2. OG mitte',  'apartment', 2, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0015-000000000009', '00000000-0000-0000-0014-000000000001',
   '4.5-Zimmer-Wohnung 2. OG rechts', 'apartment', 2, '00000000-0000-0000-0010-000000000001'),
-- DG (floor 3): Dachwohnung
  ('00000000-0000-0000-0015-000000000010', '00000000-0000-0000-0014-000000000001',
   'Dachwohnung',                        'apartment', 3, '00000000-0000-0000-0010-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 2b: New KEWA AG property — Limmatstrasse 42
-- ============================================================

INSERT INTO properties (id, name, address, organization_id, mandate_id, property_type)
VALUES (
  '00000000-0000-0000-0013-000000000002',
  'Limmatstrasse 42',
  'Limmatstrasse 42, 8005 Zuerich',
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0012-000000000001',
  'rental'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO buildings (id, name, address, property_id, organization_id)
VALUES (
  '00000000-0000-0000-0014-000000000002',
  'Limmatstrasse 42',
  'Limmatstrasse 42, 8005 Zuerich',
  '00000000-0000-0000-0013-000000000002',
  '00000000-0000-0000-0010-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- 4 representative units, floors 0-3
INSERT INTO units (id, building_id, name, unit_type, floor, organization_id)
VALUES
  ('00000000-0000-0000-0016-000000000001', '00000000-0000-0000-0014-000000000002',
   '3.5-Zimmer-Wohnung EG',   'apartment', 0, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0016-000000000002', '00000000-0000-0000-0014-000000000002',
   '3.5-Zimmer-Wohnung 1. OG', 'apartment', 1, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0016-000000000003', '00000000-0000-0000-0014-000000000002',
   '4.5-Zimmer-Wohnung 2. OG', 'apartment', 2, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0016-000000000004', '00000000-0000-0000-0014-000000000002',
   '3.5-Zimmer-Wohnung 3. OG', 'apartment', 3, '00000000-0000-0000-0010-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 2c: New KEWA AG property — MFH Oerlikon
-- ============================================================

INSERT INTO properties (id, name, address, organization_id, mandate_id, property_type)
VALUES (
  '00000000-0000-0000-0013-000000000003',
  'MFH Oerlikon',
  'Schwamendingenstrasse 28, 8050 Zuerich',
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0012-000000000002',
  'rental'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO buildings (id, name, address, property_id, organization_id)
VALUES (
  '00000000-0000-0000-0014-000000000003',
  'MFH Oerlikon',
  'Schwamendingenstrasse 28, 8050 Zuerich',
  '00000000-0000-0000-0013-000000000003',
  '00000000-0000-0000-0010-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- 6 representative units, floors 0-2 (2 per floor)
INSERT INTO units (id, building_id, name, unit_type, floor, organization_id)
VALUES
  ('00000000-0000-0000-0016-000000000005', '00000000-0000-0000-0014-000000000003',
   '3.5-Zimmer-Wohnung EG links',  'apartment', 0, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0016-000000000006', '00000000-0000-0000-0014-000000000003',
   '4.5-Zimmer-Wohnung EG rechts', 'apartment', 0, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0016-000000000007', '00000000-0000-0000-0014-000000000003',
   '3.5-Zimmer-Wohnung 1. OG links',  'apartment', 1, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0016-000000000008', '00000000-0000-0000-0014-000000000003',
   '4.5-Zimmer-Wohnung 1. OG rechts', 'apartment', 1, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0016-000000000009', '00000000-0000-0000-0014-000000000003',
   '3.5-Zimmer-Wohnung 2. OG links',  'apartment', 2, '00000000-0000-0000-0010-000000000001'),
  ('00000000-0000-0000-0016-000000000010', '00000000-0000-0000-0014-000000000003',
   '4.5-Zimmer-Wohnung 2. OG rechts', 'apartment', 2, '00000000-0000-0000-0010-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 3: New GIMBA AG properties
-- ============================================================

-- Property 4: Bundesplatz 8, 3011 Bern
INSERT INTO properties (id, name, address, organization_id, mandate_id, property_type)
VALUES (
  '00000000-0000-0000-0013-000000000004',
  'Bundesplatz 8',
  'Bundesplatz 8, 3011 Bern',
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0012-000000000004',
  'rental'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO buildings (id, name, address, property_id, organization_id)
VALUES (
  '00000000-0000-0000-0014-000000000004',
  'Bundesplatz 8',
  'Bundesplatz 8, 3011 Bern',
  '00000000-0000-0000-0013-000000000004',
  '00000000-0000-0000-0010-000000000002'
) ON CONFLICT (id) DO NOTHING;

-- 4 representative units
INSERT INTO units (id, building_id, name, unit_type, floor, organization_id)
VALUES
  ('00000000-0000-0000-0016-000000000011', '00000000-0000-0000-0014-000000000004',
   '3.5-Zimmer-Wohnung EG',    'apartment', 0, '00000000-0000-0000-0010-000000000002'),
  ('00000000-0000-0000-0016-000000000012', '00000000-0000-0000-0014-000000000004',
   '4.5-Zimmer-Wohnung 1. OG', 'apartment', 1, '00000000-0000-0000-0010-000000000002'),
  ('00000000-0000-0000-0016-000000000013', '00000000-0000-0000-0014-000000000004',
   '3.5-Zimmer-Wohnung 2. OG', 'apartment', 2, '00000000-0000-0000-0010-000000000002'),
  ('00000000-0000-0000-0016-000000000014', '00000000-0000-0000-0014-000000000004',
   '4.5-Zimmer-Wohnung 3. OG', 'apartment', 3, '00000000-0000-0000-0010-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Property 5: Siedlung Wabern, 3084 Wabern
INSERT INTO properties (id, name, address, organization_id, mandate_id, property_type)
VALUES (
  '00000000-0000-0000-0013-000000000005',
  'Siedlung Wabern',
  'Eichholzstrasse 12, 3084 Wabern',
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0012-000000000004',
  'rental'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO buildings (id, name, address, property_id, organization_id)
VALUES (
  '00000000-0000-0000-0014-000000000005',
  'Siedlung Wabern',
  'Eichholzstrasse 12, 3084 Wabern',
  '00000000-0000-0000-0013-000000000005',
  '00000000-0000-0000-0010-000000000002'
) ON CONFLICT (id) DO NOTHING;

-- 4 representative units
INSERT INTO units (id, building_id, name, unit_type, floor, organization_id)
VALUES
  ('00000000-0000-0000-0016-000000000015', '00000000-0000-0000-0014-000000000005',
   '3.5-Zimmer-Wohnung EG',    'apartment', 0, '00000000-0000-0000-0010-000000000002'),
  ('00000000-0000-0000-0016-000000000016', '00000000-0000-0000-0014-000000000005',
   '3.5-Zimmer-Wohnung 1. OG', 'apartment', 1, '00000000-0000-0000-0010-000000000002'),
  ('00000000-0000-0000-0016-000000000017', '00000000-0000-0000-0014-000000000005',
   '4.5-Zimmer-Wohnung 2. OG', 'apartment', 2, '00000000-0000-0000-0010-000000000002'),
  ('00000000-0000-0000-0016-000000000018', '00000000-0000-0000-0014-000000000005',
   '4.5-Zimmer-Wohnung 3. OG', 'apartment', 3, '00000000-0000-0000-0010-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 4: Flat backfill of all existing data (D6)
-- ============================================================
-- All existing rows belong to KEWA AG. Flat UPDATE with single UUID.
-- WHERE organization_id IS NULL ensures idempotency.
-- EXCLUDED tables (NULL = system entry):
--   templates, template_phases, template_packages, template_tasks,
--   template_dependencies, template_quality_gates
-- NOTE: properties were backfilled in Section 1 with specific mandate_id assignments.
--       The UPDATE here for properties will be a no-op (already set above).

DO $$
DECLARE
  kewa_id UUID := '00000000-0000-0000-0010-000000000001';
BEGIN
  -- Core property hierarchy (properties already done in Section 1, no-op here)
  UPDATE properties            SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE buildings             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE units                 SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE rooms                 SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE components            SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Renovation and project hierarchy
  UPDATE renovation_projects   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE projects              SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE project_phases        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE project_packages      SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE project_quality_gates SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Tasks hierarchy
  UPDATE tasks                 SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE task_photos           SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE task_audio            SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE task_dependencies     SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Work orders
  UPDATE work_orders           SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE work_order_events     SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Financial tables
  UPDATE offers                SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE invoices              SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE expenses              SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE payments              SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Partners and procurement
  UPDATE partners              SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE purchase_orders       SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE deliveries            SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inventory_movements   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE purchase_order_allocations SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE approval_thresholds   SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Change orders
  UPDATE change_orders              SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE change_order_versions      SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE change_order_photos        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE change_order_approval_tokens SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Inspections
  UPDATE inspections               SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inspection_defects        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inspection_portal_tokens  SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE inspection_templates      SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Media, audit, communication
  UPDATE media                     SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE audit_logs                SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE comments                  SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE magic_link_tokens         SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE storage_metadata          SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Knowledge base
  UPDATE kb_categories             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_articles               SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_articles_history       SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_workflow_transitions   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_dashboard_shortcuts    SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE kb_attachments            SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Notifications
  UPDATE notifications             SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE user_notifications        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE push_subscriptions        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE notification_preferences  SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Tickets
  UPDATE tickets                   SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE ticket_messages           SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE ticket_attachments        SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE ticket_work_orders        SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- Other per-org tables
  UPDATE condition_history         SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE app_settings              SET organization_id = kewa_id WHERE organization_id IS NULL;
  UPDATE tenant_users              SET organization_id = kewa_id WHERE organization_id IS NULL;

  -- NOTE: templates, template_phases, template_packages, template_tasks,
  --       template_dependencies, template_quality_gates are intentionally EXCLUDED.
  --       organization_id = NULL means "system template" for these tables per 075_org_id_columns.sql.

  RAISE NOTICE 'Backfill complete: all 56 non-template tables updated to KEWA AG';
END $$;

-- ============================================================
-- SECTION 5: Tenant user unit assignments (D5)
-- ============================================================
-- Overwrite the random unit assignments from 063_seed_tenant_portal.sql
-- with deterministic unit assignments per the showcase user matrix.

-- Hans Mueller → Leweg 4, 3.5-Zimmer EG mitte (unit 0015-...002)
UPDATE tenant_users SET
  unit_id = '00000000-0000-0000-0015-000000000002'
WHERE user_id = (SELECT id FROM users WHERE email = 'mueller@example.com')
  AND unit_id != '00000000-0000-0000-0015-000000000002';

-- Anna Schmidt → Limmatstrasse 42, 3.5-Zimmer EG (unit 0016-...001)
UPDATE tenant_users SET
  unit_id = '00000000-0000-0000-0016-000000000001'
WHERE user_id = (SELECT id FROM users WHERE email = 'schmidt@example.com')
  AND unit_id != '00000000-0000-0000-0016-000000000001';

-- Peter Weber → Wohnanlage Seefeld, first unit in building 00000000-0000-0000-0001-000000000001
-- The existing "Liegenschaft KEWA" building (now Wohnanlage Seefeld) retains its units.
-- Assign Weber to the first apartment unit in that building.
UPDATE tenant_users SET
  unit_id = (
    SELECT u.id FROM units u
    WHERE u.building_id = '00000000-0000-0000-0001-000000000001'
      AND u.unit_type = 'apartment'
    ORDER BY u.floor, u.name
    LIMIT 1
  )
WHERE user_id = (SELECT id FROM users WHERE email = 'weber@example.com');

-- Markus Huber (00000000-0000-0000-0020-000000000007) → Bundesplatz 8 (unit 0016-...011)
-- GIMBA AG tenant — insert new row if not already present
INSERT INTO tenant_users (user_id, unit_id, organization_id, is_primary, move_in_date)
VALUES (
  '00000000-0000-0000-0020-000000000007',
  '00000000-0000-0000-0016-000000000011',
  '00000000-0000-0000-0010-000000000002',
  true,
  '2024-01-01'
) ON CONFLICT (user_id, unit_id) DO NOTHING;

-- ============================================================
-- SECTION 6: Tenancy records (Swiss rental law fields)
-- ============================================================
-- contract_type uses CHECK constraint from 074_tenancies.sql:
--   'residential', 'commercial', 'parking', 'storage'
-- (NOT 'unlimited' — that refers to duration, captured via end_date = NULL)
-- deposit_amount = 3x base_rent per OR 257e

-- Hans Mueller → Leweg 4, 3.5-Zimmer EG mitte
-- Guard: only insert if no active tenancy already exists for this unit
INSERT INTO tenancies (
  organization_id, unit_id, tenant_name, tenant_email,
  base_rent, ancillary_costs, deposit_amount,
  notice_period_months, reference_interest_rate, contract_type,
  start_date, end_date, is_active
)
SELECT
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0015-000000000002',
  'Hans Mueller', 'mueller@example.com',
  1450.00, 220.00, 4350.00,
  3, 1.50, 'residential',
  '2024-01-01', NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM tenancies
  WHERE unit_id = '00000000-0000-0000-0015-000000000002' AND is_active = true
);

-- Anna Schmidt → Limmatstrasse 42, 3.5-Zimmer EG
INSERT INTO tenancies (
  organization_id, unit_id, tenant_name, tenant_email,
  base_rent, ancillary_costs, deposit_amount,
  notice_period_months, reference_interest_rate, contract_type,
  start_date, end_date, is_active
)
SELECT
  '00000000-0000-0000-0010-000000000001',
  '00000000-0000-0000-0016-000000000001',
  'Anna Schmidt', 'schmidt@example.com',
  1680.00, 280.00, 5040.00,
  3, 1.50, 'residential',
  '2024-01-01', NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM tenancies
  WHERE unit_id = '00000000-0000-0000-0016-000000000001' AND is_active = true
);

-- Peter Weber → Wohnanlage Seefeld (first apartment unit in building 00000000-0000-0000-0001-000000000001)
INSERT INTO tenancies (
  organization_id, unit_id, tenant_name, tenant_email,
  base_rent, ancillary_costs, deposit_amount,
  notice_period_months, reference_interest_rate, contract_type,
  start_date, end_date, is_active
)
SELECT
  '00000000-0000-0000-0010-000000000001',
  u.id,
  'Peter Weber',
  'weber@example.com',
  1950.00, 320.00, 5850.00,
  3, 1.50, 'residential',
  '2024-01-01', NULL, true
FROM units u
WHERE u.building_id = '00000000-0000-0000-0001-000000000001'
  AND u.unit_type = 'apartment'
  AND NOT EXISTS (
    SELECT 1 FROM tenancies t
    WHERE t.unit_id = u.id AND t.is_active = true
  )
ORDER BY u.floor, u.name
LIMIT 1;

-- Markus Huber → Bundesplatz 8 (unit 0016-...011)
INSERT INTO tenancies (
  organization_id, unit_id, tenant_name, tenant_email,
  base_rent, ancillary_costs, deposit_amount,
  notice_period_months, reference_interest_rate, contract_type,
  start_date, end_date, is_active
)
SELECT
  '00000000-0000-0000-0010-000000000002',
  '00000000-0000-0000-0016-000000000011',
  'Markus Huber', 'huber@example.com',
  1550.00, 250.00, 4650.00,
  3, 1.50, 'residential',
  '2024-01-01', NULL, true
WHERE NOT EXISTS (
  SELECT 1 FROM tenancies
  WHERE unit_id = '00000000-0000-0000-0016-000000000011' AND is_active = true
);
