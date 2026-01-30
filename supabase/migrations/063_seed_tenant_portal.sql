/**
 * Migration: 063_seed_tenant_portal
 * Description: Seed data for tenant portal (users, tickets, messages, attachments)
 * Phase: 26 - Tenant Portal Core
 * Created: 2026-01-29
 */

-- =============================================
-- TENANT USERS
-- =============================================

-- Create tenant role if it doesn't exist
INSERT INTO roles (name, display_name, description)
VALUES ('tenant', 'Mieter', 'Tenant portal user with limited access to their own tickets')
ON CONFLICT (name) DO NOTHING;

-- Create tenant users with pre-hashed password 'test1234'
-- Bcrypt hash for 'test1234' with cost 10
WITH tenant_role AS (
  SELECT id FROM roles WHERE name = 'tenant'
),
tenant_users_insert AS (
  INSERT INTO users (email, password_hash, pin_hash, role, auth_method, display_name, role_id, is_active, email_verified)
  SELECT
    email,
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' as password_hash, -- 'test1234'
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' as pin_hash, -- placeholder (not used for tenants)
    'kewa' as role, -- legacy column (NOT NULL), value unused with role_id system
    'email_password'::auth_method as auth_method,
    display_name,
    (SELECT id FROM tenant_role),
    true,
    true
  FROM (VALUES
    ('mueller@example.com', 'Hans Mueller'),
    ('schmidt@example.com', 'Anna Schmidt'),
    ('weber@example.com', 'Peter Weber')
  ) AS v(email, display_name)
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email
)
-- Link tenants to units
INSERT INTO tenant_users (user_id, unit_id, is_primary, move_in_date)
SELECT
  u.id,
  units.id,
  true,
  CURRENT_DATE - INTERVAL '6 months'
FROM tenant_users_insert u
CROSS JOIN LATERAL (
  SELECT id FROM units ORDER BY random() LIMIT 1
) units
ON CONFLICT (user_id, unit_id) DO NOTHING;

-- =============================================
-- TICKETS
-- =============================================

-- Create tickets for tenants (mix of statuses and urgencies)
WITH tenant_data AS (
  SELECT
    u.id as user_id,
    tu.unit_id,
    cat.id as category_id,
    cat.name as category_name
  FROM users u
  JOIN tenant_users tu ON tu.user_id = u.id
  JOIN roles r ON r.id = u.role_id AND r.name = 'tenant'
  CROSS JOIN ticket_categories cat
  WHERE cat.is_active = true
  LIMIT 6
)
INSERT INTO tickets (
  category_id,
  unit_id,
  created_by,
  title,
  description,
  urgency,
  status,
  created_at,
  updated_at,
  last_message_at
)
-- Insert tickets one at a time to avoid trigger duplicate ticket_number issue
DO $seed$
DECLARE
  v_user_id UUID;
  v_unit_id UUID;
  v_cat_id UUID;
BEGIN
  -- Get first tenant
  SELECT u.id, tu.unit_id INTO v_user_id, v_unit_id
  FROM users u JOIN tenant_users tu ON tu.user_id = u.id
  JOIN roles r ON r.id = u.role_id AND r.name = 'tenant'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No tenant users found, skipping ticket seed';
    RETURN;
  END IF;

  -- Ticket 1: Heizung (notfall, offen)
  SELECT id INTO v_cat_id FROM ticket_categories WHERE name = 'heizung';
  INSERT INTO tickets (category_id, unit_id, created_by, title, description, urgency, status)
  VALUES (v_cat_id, v_unit_id, v_user_id,
    'Heizung funktioniert nicht',
    'Seit gestern bleibt die Heizung kalt, obwohl das Thermostat voll aufgedreht ist.',
    'notfall', 'offen');

  -- Ticket 2: Wasser (normal, in_bearbeitung)
  SELECT id INTO v_cat_id FROM ticket_categories WHERE name = 'wasser_sanitaer';
  INSERT INTO tickets (category_id, unit_id, created_by, title, description, urgency, status)
  VALUES (v_cat_id, v_unit_id, v_user_id,
    'Wasserhahn tropft in der Kueche',
    'Der Wasserhahn im Spuelbecken tropft staendig.',
    'normal', 'in_bearbeitung');

  -- Ticket 3: Elektrik (dringend, offen)
  SELECT id INTO v_cat_id FROM ticket_categories WHERE name = 'elektrik';
  INSERT INTO tickets (category_id, unit_id, created_by, title, description, urgency, status)
  VALUES (v_cat_id, v_unit_id, v_user_id,
    'Steckdose im Wohnzimmer defekt',
    'Die Steckdose neben dem Fernseher funktioniert nicht mehr.',
    'dringend', 'offen');

  -- Ticket 4: Allgemein (normal, geschlossen)
  SELECT id INTO v_cat_id FROM ticket_categories WHERE name = 'allgemein';
  INSERT INTO tickets (category_id, unit_id, created_by, title, description, urgency, status, closed_at)
  VALUES (v_cat_id, v_unit_id, v_user_id,
    'Tuerklingel ohne Funktion',
    'Die Tuerklingel funktioniert nicht. Besucher muessen mich per Telefon anrufen.',
    'normal', 'geschlossen', NOW());
END $seed$;

-- =============================================
-- TICKET MESSAGES
-- =============================================

-- Create messages for each ticket (tenant + operator conversation)
WITH ticket_data AS (
  SELECT
    t.id as ticket_id,
    t.created_by as tenant_id,
    t.created_at,
    COALESCE(
      (SELECT id FROM users WHERE email IN ('admin@kewa.ch', 'manager@kewa.ch') LIMIT 1),
      (SELECT u2.id FROM users u2 JOIN roles r2 ON r2.id = u2.role_id WHERE r2.name IN ('admin', 'kewa') LIMIT 1),
      (SELECT id FROM users WHERE id = '00000000-0000-0000-0000-000000000001')
    ) as operator_id
  FROM tickets t
  WHERE t.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
)
INSERT INTO ticket_messages (
  ticket_id,
  sender_type,
  created_by,
  content,
  read_at,
  read_by,
  created_at
)
SELECT
  td.ticket_id,
  'tenant'::message_sender_type,
  td.tenant_id,
  'Guten Tag, ich habe ein Problem gemeldet. Wann kann jemand vorbeikommen?',
  CASE WHEN random() > 0.3 THEN td.created_at + INTERVAL '2 hours' ELSE NULL END,
  CASE WHEN random() > 0.3 THEN td.operator_id ELSE NULL END,
  td.created_at + INTERVAL '5 minutes'
FROM ticket_data td

UNION ALL

SELECT
  td.ticket_id,
  'operator'::message_sender_type,
  td.operator_id,
  'Guten Tag! Wir haben Ihr Ticket erhalten und werden uns schnellstmoeglich darum kuemmern. Ein Techniker wird Sie in den naechsten 2 Werktagen kontaktieren.',
  td.created_at + INTERVAL '3 hours',
  td.tenant_id,
  td.created_at + INTERVAL '2 hours'
FROM ticket_data td

UNION ALL

SELECT
  td.ticket_id,
  'tenant'::message_sender_type,
  td.tenant_id,
  'Vielen Dank fuer die schnelle Rueckmeldung!',
  td.created_at + INTERVAL '4 hours',
  td.operator_id,
  td.created_at + INTERVAL '3 hours' + INTERVAL '30 minutes'
FROM ticket_data td
WHERE random() > 0.4;

-- =============================================
-- TICKET ATTACHMENTS
-- =============================================

-- Create some photo attachments for tickets
-- Note: These are dummy storage paths - actual files would need to be uploaded
WITH ticket_data AS (
  SELECT
    t.id as ticket_id,
    t.created_by as tenant_id
  FROM tickets t
  WHERE t.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  LIMIT 3
)
INSERT INTO ticket_attachments (
  ticket_id,
  message_id,
  uploaded_by,
  storage_path,
  file_name,
  file_size,
  mime_type,
  created_at
)
SELECT
  td.ticket_id,
  NULL, -- Attached at ticket creation
  td.tenant_id,
  'tickets/' || td.ticket_id || '/photos/' || gen_random_uuid() || '.jpg',
  'problem_foto_1.jpg',
  512000, -- 512KB
  'image/jpeg',
  CURRENT_TIMESTAMP - INTERVAL '10 days'
FROM ticket_data td;

-- Ticket numbers are auto-generated by the set_ticket_number trigger
