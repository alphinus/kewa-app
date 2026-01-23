-- KEWA Renovations Operations System
-- Migration: 045_seed_partners_workorders.sql
-- Seed data for testing contractor portal flow

-- =============================================
-- TEST PARTNERS (Handwerker)
-- =============================================

INSERT INTO partners (id, partner_type, company_name, contact_name, email, phone, address, trade_categories, is_active, notes)
VALUES
  -- Plumber
  (
    '11111111-1111-1111-1111-111111111111',
    'contractor',
    'Müller Sanitär AG',
    'Hans Müller',
    'hans.mueller@sanitaer-mueller.ch',
    '+41 44 123 45 67',
    'Bahnhofstrasse 10, 8001 Zürich',
    ARRAY['plumbing']::trade_category[],
    true,
    'Zuverlässiger Partner seit 2020'
  ),
  -- Electrician
  (
    '22222222-2222-2222-2222-222222222222',
    'contractor',
    'Elektro Schneider GmbH',
    'Peter Schneider',
    'p.schneider@elektro-schneider.ch',
    '+41 44 234 56 78',
    'Industriestrasse 5, 8005 Zürich',
    ARRAY['electrical']::trade_category[],
    true,
    'Spezialisiert auf Smart Home'
  ),
  -- Multi-trade contractor
  (
    '33333333-3333-3333-3333-333333333333',
    'contractor',
    'Bau & Renovierung Weber',
    'Thomas Weber',
    'info@weber-bau.ch',
    '+41 44 345 67 89',
    'Werkstrasse 22, 8046 Zürich',
    ARRAY['general', 'painting', 'flooring', 'carpentry']::trade_category[],
    true,
    'Komplette Renovierungen aus einer Hand'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- TEST WORK ORDERS
-- =============================================

-- Work Order 1: Sent to plumber (status: sent, ready for contractor view)
INSERT INTO work_orders (
  id,
  partner_id,
  title,
  description,
  scope_of_work,
  status,
  requested_start_date,
  requested_end_date,
  access_token,
  token_expires_at,
  acceptance_deadline,
  estimated_cost,
  internal_notes
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Abfluss Dachwohnung reparieren',
  'Verstopfter Abfluss in der Dusche der Dachwohnung',
  E'Arbeitsumfang:\n- Abfluss inspizieren\n- Verstopfung beseitigen\n- Silikonfugen prüfen und ggf. erneuern\n- Funktionstest durchführen',
  'sent',
  CURRENT_DATE + INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '5 days',
  'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  450.00,
  'Mieter hat sich beschwert, dringend'
)
ON CONFLICT (id) DO NOTHING;

-- Work Order 2: Draft (not yet sent)
INSERT INTO work_orders (
  id,
  partner_id,
  title,
  description,
  scope_of_work,
  status,
  requested_start_date,
  requested_end_date,
  access_token,
  token_expires_at,
  estimated_cost,
  internal_notes
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'Elektroinstallation EG Links',
  'Zusätzliche Steckdosen in der Küche installieren',
  E'Arbeitsumfang:\n- 3 zusätzliche Steckdosen installieren\n- Sicherungskasten prüfen\n- Leitungen verlegen',
  'draft',
  CURRENT_DATE + INTERVAL '14 days',
  CURRENT_DATE + INTERVAL '16 days',
  'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  NULL,  -- Not sent yet, no expiry
  1200.00,
  'Warten auf Mieter-Bestätigung'
)
ON CONFLICT (id) DO NOTHING;

-- Work Order 3: Already viewed by contractor
INSERT INTO work_orders (
  id,
  partner_id,
  title,
  description,
  scope_of_work,
  status,
  requested_start_date,
  requested_end_date,
  access_token,
  token_expires_at,
  acceptance_deadline,
  viewed_at,
  estimated_cost,
  internal_notes
)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '33333333-3333-3333-3333-333333333333',
  'Badezimmer komplett renovieren',
  'Komplette Renovation des Badezimmers in 1. OG Links',
  E'Arbeitsumfang:\n- Alte Fliesen entfernen\n- Neue Fliesen verlegen (Boden + Wand)\n- Sanitärobjekte ersetzen (WC, Waschbecken, Dusche)\n- Neue Armaturen installieren\n- Malerarbeiten (Decke)',
  'viewed',
  CURRENT_DATE + INTERVAL '21 days',
  CURRENT_DATE + INTERVAL '35 days',
  'cccc3333-cccc-cccc-cccc-cccccccccccc',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '10 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  15000.00,
  'Grosses Projekt, Budget genehmigt'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE partners IS 'Test partners for contractor portal UAT';
