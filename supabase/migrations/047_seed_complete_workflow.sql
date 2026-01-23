-- KEWA Renovations Operations System
-- Migration: 047_seed_complete_workflow.sql
-- Seed data for complete renovation workflow testing

-- =============================================
-- ZWEITE PROPERTY UND BUILDING
-- =============================================

-- Property: Neubau Zürich West
INSERT INTO properties (id, name, address)
VALUES (
  '00000000-0000-0000-0002-000000000001',
  'Neubau Zürich West',
  'Industriestrasse 88, 8005 Zürich'
)
ON CONFLICT (id) DO NOTHING;

-- Verknüpfe zweites Building mit neuer Property
UPDATE buildings
SET property_id = '00000000-0000-0000-0002-000000000001'
WHERE id = '00000000-0000-0000-0001-000000000001'
  AND property_id IS NULL;

-- =============================================
-- ROOMS FÜR UNITS (VERSCHIEDENE ZUSTÄNDE)
-- =============================================

-- Rooms für "EG Links" (Unit 1)
INSERT INTO rooms (id, unit_id, name, room_type, condition, area_sqm, notes)
VALUES
  -- EG Links
  ('dddddddd-dddd-dddd-0001-000000000001', '00000000-0000-0000-0001-000000000001', 'Badezimmer', 'bathroom', 'old', 6.5, 'Fliesen aus 1995'),
  ('dddddddd-dddd-dddd-0001-000000000002', '00000000-0000-0000-0001-000000000001', 'Küche', 'kitchen', 'partial', 12.0, 'Geräte erneuert 2020'),
  ('dddddddd-dddd-dddd-0001-000000000003', '00000000-0000-0000-0001-000000000001', 'Wohnzimmer', 'living_room', 'old', 24.5, 'Parkett abgenutzt'),
  ('dddddddd-dddd-dddd-0001-000000000004', '00000000-0000-0000-0001-000000000001', 'Schlafzimmer', 'bedroom', 'old', 14.0, NULL),
  ('dddddddd-dddd-dddd-0001-000000000005', '00000000-0000-0000-0001-000000000001', 'Flur', 'hallway', 'old', 8.5, NULL)
ON CONFLICT (id) DO NOTHING;

-- Rooms für "EG Rechts" (Unit 2)
INSERT INTO rooms (id, unit_id, name, room_type, condition, area_sqm, notes)
VALUES
  ('dddddddd-dddd-dddd-0002-000000000001', '00000000-0000-0000-0001-000000000002', 'Badezimmer', 'bathroom', 'partial', 7.0, 'Sanitärobjekte 2018 erneuert'),
  ('dddddddd-dddd-dddd-0002-000000000002', '00000000-0000-0000-0001-000000000002', 'Küche', 'kitchen', 'old', 10.5, NULL),
  ('dddddddd-dddd-dddd-0002-000000000003', '00000000-0000-0000-0001-000000000002', 'Wohnzimmer', 'living_room', 'old', 22.0, NULL),
  ('dddddddd-dddd-dddd-0002-000000000004', '00000000-0000-0000-0001-000000000002', 'Schlafzimmer 1', 'bedroom', 'old', 12.5, NULL),
  ('dddddddd-dddd-dddd-0002-000000000005', '00000000-0000-0000-0001-000000000002', 'Schlafzimmer 2', 'bedroom', 'old', 10.0, NULL),
  ('dddddddd-dddd-dddd-0002-000000000006', '00000000-0000-0000-0001-000000000002', 'Flur', 'hallway', 'partial', 9.0, 'Neu gestrichen 2021')
ON CONFLICT (id) DO NOTHING;

-- Rooms für "1.OG Links" (Unit 3)
INSERT INTO rooms (id, unit_id, name, room_type, condition, area_sqm, notes)
VALUES
  ('dddddddd-dddd-dddd-0003-000000000001', '00000000-0000-0000-0001-000000000003', 'Badezimmer', 'bathroom', 'old', 6.0, 'Sanierung dringend'),
  ('dddddddd-dddd-dddd-0003-000000000002', '00000000-0000-0000-0001-000000000003', 'Küche', 'kitchen', 'old', 11.0, 'Original 1992'),
  ('dddddddd-dddd-dddd-0003-000000000003', '00000000-0000-0000-0001-000000000003', 'Wohnzimmer', 'living_room', 'old', 26.0, NULL),
  ('dddddddd-dddd-dddd-0003-000000000004', '00000000-0000-0000-0001-000000000003', 'Schlafzimmer', 'bedroom', 'old', 15.5, NULL),
  ('dddddddd-dddd-dddd-0003-000000000005', '00000000-0000-0000-0001-000000000003', 'Flur', 'hallway', 'old', 7.5, NULL)
ON CONFLICT (id) DO NOTHING;

-- Rooms für "1.OG Rechts" (Unit 4)
INSERT INTO rooms (id, unit_id, name, room_type, condition, area_sqm, notes)
VALUES
  ('dddddddd-dddd-dddd-0004-000000000001', '00000000-0000-0000-0001-000000000004', 'Badezimmer', 'bathroom', 'new', 7.5, 'Komplett renoviert 2023'),
  ('dddddddd-dddd-dddd-0004-000000000002', '00000000-0000-0000-0001-000000000004', 'Küche', 'kitchen', 'new', 13.0, 'Neue Einbauküche 2023'),
  ('dddddddd-dddd-dddd-0004-000000000003', '00000000-0000-0000-0001-000000000004', 'Wohnzimmer', 'living_room', 'new', 28.0, 'Parkett neu verlegt'),
  ('dddddddd-dddd-dddd-0004-000000000004', '00000000-0000-0000-0001-000000000004', 'Schlafzimmer 1', 'bedroom', 'new', 16.0, NULL),
  ('dddddddd-dddd-dddd-0004-000000000005', '00000000-0000-0000-0001-000000000004', 'Schlafzimmer 2', 'bedroom', 'new', 12.0, NULL),
  ('dddddddd-dddd-dddd-0004-000000000006', '00000000-0000-0000-0001-000000000004', 'Flur', 'hallway', 'new', 10.5, NULL),
  ('dddddddd-dddd-dddd-0004-000000000007', '00000000-0000-0000-0001-000000000004', 'Balkon', 'balcony', 'good', 5.0, NULL)
ON CONFLICT (id) DO NOTHING;

-- Rooms für "Dachwohnung" (Unit 5)
INSERT INTO rooms (id, unit_id, name, room_type, condition, area_sqm, notes)
VALUES
  ('dddddddd-dddd-dddd-0005-000000000001', '00000000-0000-0000-0001-000000000005', 'Badezimmer', 'bathroom', 'good', 8.0, 'Modernisiert 2019'),
  ('dddddddd-dddd-dddd-0005-000000000002', '00000000-0000-0000-0001-000000000005', 'Küche', 'kitchen', 'good', 14.5, 'Modernisiert 2019'),
  ('dddddddd-dddd-dddd-0005-000000000003', '00000000-0000-0000-0001-000000000005', 'Wohnzimmer', 'living_room', 'good', 32.0, 'Dachschräge'),
  ('dddddddd-dddd-dddd-0005-000000000004', '00000000-0000-0000-0001-000000000005', 'Schlafzimmer 1', 'bedroom', 'good', 18.0, NULL),
  ('dddddddd-dddd-dddd-0005-000000000005', '00000000-0000-0000-0001-000000000005', 'Schlafzimmer 2', 'bedroom', 'good', 14.0, NULL),
  ('dddddddd-dddd-dddd-0005-000000000006', '00000000-0000-0000-0001-000000000005', 'Büro', 'office', 'good', 10.0, NULL),
  ('dddddddd-dddd-dddd-0005-000000000007', '00000000-0000-0000-0001-000000000005', 'Flur', 'hallway', 'good', 12.0, NULL),
  ('dddddddd-dddd-dddd-0005-000000000008', '00000000-0000-0000-0001-000000000005', 'Dachterrasse', 'balcony', 'good', 25.0, 'Traumhafte Aussicht')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- RENOVATION PROJECT (AUS TEMPLATE)
-- =============================================

-- Aktives Projekt für "1.OG Links" mit Komplett-Renovation Template
INSERT INTO renovation_projects (
  id,
  unit_id,
  template_id,
  name,
  description,
  status,
  planned_start_date,
  planned_end_date,
  estimated_cost,
  visible_to_imeri
)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '00000000-0000-0000-0001-000000000003',  -- 1.OG Links
  '00000000-0000-0000-0008-000000000001',  -- Komplett-Renovation Template
  'Komplett-Renovation 1.OG Links',
  'Vollständige Renovation der Wohnung inkl. Bad, Küche, Böden und Malerarbeiten',
  'active',
  CURRENT_DATE + INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '45 days',
  45000.00,
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- ZUSÄTZLICHE WORK ORDERS
-- =============================================

-- Work Order 4: In Progress - Malerarbeiten
INSERT INTO work_orders (
  id,
  partner_id,
  title,
  description,
  scope_of_work,
  status,
  requested_start_date,
  requested_end_date,
  actual_start_date,
  access_token,
  token_expires_at,
  acceptance_deadline,
  viewed_at,
  accepted_at,
  estimated_cost,
  internal_notes
)
VALUES (
  'dddd4444-dddd-dddd-dddd-dddddddddddd',
  '33333333-3333-3333-3333-333333333333',  -- Weber Bau
  'Malerarbeiten EG Links',
  'Wände und Decken in allen Räumen streichen',
  E'Arbeitsumfang:\n- Wände spachteln und schleifen\n- Grundierung auftragen\n- 2x Deckfarbe streichen (weiss)\n- Fensterrahmen und Türen streichen',
  'in_progress',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '3 days',
  CURRENT_DATE - INTERVAL '2 days',
  'dddd4444-dddd-dddd-dddd-dddddddddddd',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP - INTERVAL '7 days',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  3800.00,
  'Mieter ausgezogen, freier Zugang'
)
ON CONFLICT (id) DO NOTHING;

-- Work Order 5: Completed - Elektroinstallation
INSERT INTO work_orders (
  id,
  partner_id,
  title,
  description,
  scope_of_work,
  status,
  requested_start_date,
  requested_end_date,
  actual_start_date,
  actual_end_date,
  access_token,
  token_expires_at,
  viewed_at,
  accepted_at,
  estimated_cost,
  actual_cost,
  internal_notes
)
VALUES (
  'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
  '22222222-2222-2222-2222-222222222222',  -- Elektro Schneider
  'Zusätzliche Steckdosen Dachwohnung',
  'Installation von zusätzlichen Steckdosen im Büro',
  E'Arbeitsumfang:\n- 4 Doppelsteckdosen installieren\n- Leitungen verlegen\n- Anschluss an Sicherungskasten\n- Funktionstest',
  'completed',
  CURRENT_DATE - INTERVAL '14 days',
  CURRENT_DATE - INTERVAL '12 days',
  CURRENT_DATE - INTERVAL '14 days',
  CURRENT_DATE - INTERVAL '12 days',
  'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP - INTERVAL '20 days',
  CURRENT_TIMESTAMP - INTERVAL '18 days',
  950.00,
  920.00,
  'Schnell und sauber erledigt'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- EXPENSES (FÜR KOSTEN-DASHBOARD)
-- =============================================

-- Expense 1: Material für Renovation Projekt
INSERT INTO expenses (
  id,
  renovation_project_id,
  title,
  description,
  category,
  amount,
  payment_method,
  vendor_name,
  receipt_number,
  trade_category,
  notes
)
VALUES (
  'ffff0001-ffff-ffff-ffff-ffffffffffff',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Farbe und Spachtelmasse',
  '50L Wandfarbe weiss, 25kg Spachtelmasse',
  'material',
  680.50,
  'company_card',
  'Baumarkt Zürich',
  'BM-2024-0156',
  'painting',
  'Für Malerarbeiten 1.OG Links'
)
ON CONFLICT (id) DO NOTHING;

-- Expense 2: Equipment rental
INSERT INTO expenses (
  id,
  renovation_project_id,
  title,
  description,
  category,
  amount,
  payment_method,
  vendor_name,
  receipt_number,
  notes
)
VALUES (
  'ffff0002-ffff-ffff-ffff-ffffffffffff',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Gerüst Miete 2 Wochen',
  'Fahrgerüst für Malerarbeiten',
  'equipment_rental',
  450.00,
  'company_card',
  'Gerüstbau Meier AG',
  'GM-2024-0089',
  'Inkl. Aufbau und Abbau'
)
ON CONFLICT (id) DO NOTHING;

-- Expense 3: Disposal
INSERT INTO expenses (
  id,
  work_order_id,
  unit_id,
  title,
  description,
  category,
  amount,
  payment_method,
  vendor_name,
  trade_category,
  notes
)
VALUES (
  'ffff0003-ffff-ffff-ffff-ffffffffffff',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '00000000-0000-0000-0001-000000000003',
  'Entsorgung alte Fliesen',
  'Container für Bauschutt und alte Fliesen',
  'disposal',
  320.00,
  'cash',
  'Entsorgung Zürich Nord',
  'demolition',
  'Barzahlung vor Ort'
)
ON CONFLICT (id) DO NOTHING;

-- Expense 4: Travel expense
INSERT INTO expenses (
  id,
  renovation_project_id,
  title,
  description,
  category,
  amount,
  payment_method,
  notes
)
VALUES (
  'ffff0004-ffff-ffff-ffff-ffffffffffff',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Fahrtkosten Baumarkt',
  'Materialbesorgung 3x Fahrt',
  'travel',
  85.50,
  'personal_reimbursement',
  'Erstattung an Projektleiter'
)
ON CONFLICT (id) DO NOTHING;

-- Expense 5: Small tools
INSERT INTO expenses (
  id,
  renovation_project_id,
  title,
  description,
  category,
  amount,
  payment_method,
  vendor_name,
  receipt_number,
  notes
)
VALUES (
  'ffff0005-ffff-ffff-ffff-ffffffffffff',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Kleinwerkzeug',
  'Diverse Spachtel, Pinsel, Abdeckmaterial',
  'material',
  165.80,
  'petty_cash',
  'Baumarkt Oerlikon',
  'BO-2024-1247',
  'Portokasse'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- INVOICES (FÜR KOSTEN-DASHBOARD)
-- =============================================

-- Invoice 1: Completed work order (paid)
INSERT INTO invoices (
  id,
  partner_id,
  work_order_id,
  invoice_number,
  title,
  description,
  amount,
  tax_rate,
  status,
  invoice_date,
  due_date,
  received_at,
  approved_at,
  paid_at,
  document_storage_path,
  internal_notes
)
VALUES (
  'gggg0001-gggg-gggg-gggg-gggggggggggg',
  '22222222-2222-2222-2222-222222222222',  -- Elektro Schneider
  'eeee5555-eeee-eeee-eeee-eeeeeeeeeeee',
  'ES-2024-0089',
  'Steckdosen Installation Dachwohnung',
  'Installation von 4 Doppelsteckdosen gemäss Auftrag',
  920.00,
  7.7,
  'paid',
  CURRENT_DATE - INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '20 days',
  CURRENT_TIMESTAMP - INTERVAL '10 days',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  'invoices/2024/es-2024-0089.pdf',
  'Rechnung korrekt, prompt bezahlt'
)
ON CONFLICT (id) DO NOTHING;

-- Invoice 2: Pending approval
INSERT INTO invoices (
  id,
  partner_id,
  work_order_id,
  invoice_number,
  title,
  description,
  amount,
  tax_rate,
  status,
  invoice_date,
  due_date,
  received_at,
  document_storage_path,
  internal_notes
)
VALUES (
  'gggg0002-gggg-gggg-gggg-gggggggggggg',
  '33333333-3333-3333-3333-333333333333',  -- Weber Bau
  'dddd4444-dddd-dddd-dddd-dddddddddddd',
  'WB-2024-0156',
  'Malerarbeiten EG Links - Zwischenrechnung',
  'Malerarbeiten 60% Fertigstellung',
  2280.00,
  7.7,
  'under_review',
  CURRENT_DATE - INTERVAL '2 days',
  CURRENT_DATE + INTERVAL '28 days',
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  'invoices/2024/wb-2024-0156.pdf',
  'Zwischenrechnung prüfen'
)
ON CONFLICT (id) DO NOTHING;

-- Invoice 3: Approved, waiting for payment
INSERT INTO invoices (
  id,
  partner_id,
  work_order_id,
  invoice_number,
  title,
  description,
  amount,
  tax_rate,
  status,
  invoice_date,
  due_date,
  received_at,
  approved_at,
  document_storage_path,
  internal_notes
)
VALUES (
  'gggg0003-gggg-gggg-gggg-gggggggggggg',
  '11111111-1111-1111-1111-111111111111',  -- Müller Sanitär
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'MS-2024-0234',
  'Abflussreparatur Dachwohnung',
  'Verstopfung beseitigt, Silikonfugen erneuert',
  480.00,
  7.7,
  'approved',
  CURRENT_DATE - INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '25 days',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'invoices/2024/ms-2024-0234.pdf',
  'Zur Zahlung freigegeben'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- CONDITION HISTORY (FÜR TIMELINE)
-- =============================================

-- History 1: Badezimmer 1.OG Rechts wurde 2023 renoviert
INSERT INTO condition_history (
  id,
  entity_type,
  entity_id,
  old_condition,
  new_condition,
  notes,
  changed_at
)
VALUES (
  'hhhh0001-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  'room',
  'dddddddd-dddd-dddd-0004-000000000001',  -- Badezimmer 1.OG Rechts
  'old',
  'new',
  'Komplett-Renovation mit neuen Fliesen und Sanitärobjekten',
  CURRENT_TIMESTAMP - INTERVAL '6 months'
)
ON CONFLICT (id) DO NOTHING;

-- History 2: Küche 1.OG Rechts wurde 2023 renoviert
INSERT INTO condition_history (
  id,
  entity_type,
  entity_id,
  old_condition,
  new_condition,
  notes,
  changed_at
)
VALUES (
  'hhhh0002-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  'room',
  'dddddddd-dddd-dddd-0004-000000000002',  -- Küche 1.OG Rechts
  'old',
  'new',
  'Neue Einbauküche installiert',
  CURRENT_TIMESTAMP - INTERVAL '5 months'
)
ON CONFLICT (id) DO NOTHING;

-- History 3: Wohnzimmer 1.OG Rechts Parkett verlegt
INSERT INTO condition_history (
  id,
  entity_type,
  entity_id,
  old_condition,
  new_condition,
  notes,
  changed_at
)
VALUES (
  'hhhh0003-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  'room',
  'dddddddd-dddd-dddd-0004-000000000003',  -- Wohnzimmer 1.OG Rechts
  'old',
  'new',
  'Neues Eichenparkett verlegt und versiegelt',
  CURRENT_TIMESTAMP - INTERVAL '5 months'
)
ON CONFLICT (id) DO NOTHING;

-- History 4: Dachwohnung Badezimmer modernisiert 2019
INSERT INTO condition_history (
  id,
  entity_type,
  entity_id,
  old_condition,
  new_condition,
  notes,
  changed_at
)
VALUES (
  'hhhh0004-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  'room',
  'dddddddd-dddd-dddd-0005-000000000001',  -- Badezimmer Dachwohnung
  'old',
  'partial',
  'Sanitärobjekte erneuert, Fliesen belassen',
  CURRENT_TIMESTAMP - INTERVAL '5 years'
)
ON CONFLICT (id) DO NOTHING;

-- History 5: Dachwohnung Küche modernisiert 2019
INSERT INTO condition_history (
  id,
  entity_type,
  entity_id,
  old_condition,
  new_condition,
  notes,
  changed_at
)
VALUES (
  'hhhh0005-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  'room',
  'dddddddd-dddd-dddd-0005-000000000002',  -- Küche Dachwohnung
  'old',
  'partial',
  'Küchengeräte ausgetauscht, Möbel belassen',
  CURRENT_TIMESTAMP - INTERVAL '5 years'
)
ON CONFLICT (id) DO NOTHING;

-- History 6: EG Rechts Flur gestrichen 2021
INSERT INTO condition_history (
  id,
  entity_type,
  entity_id,
  old_condition,
  new_condition,
  notes,
  changed_at
)
VALUES (
  'hhhh0006-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
  'room',
  'dddddddd-dddd-dddd-0002-000000000006',  -- Flur EG Rechts
  'old',
  'partial',
  'Neu gestrichen in Warmgrau',
  CURRENT_TIMESTAMP - INTERVAL '3 years'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN properties.id IS 'Seed: 2 properties for multi-property testing';
COMMENT ON TABLE rooms IS 'Seeded with complete room sets for all units';
COMMENT ON TABLE renovation_projects IS 'Seeded with 1 active project using template';
COMMENT ON TABLE work_orders IS 'Seeded with 5 work orders (draft, sent, viewed, in_progress, completed)';
COMMENT ON TABLE expenses IS 'Seeded with 5 expenses across different categories';
COMMENT ON TABLE invoices IS 'Seeded with 3 invoices (paid, under_review, approved)';
COMMENT ON TABLE condition_history IS 'Seeded with 6 historical condition changes';
