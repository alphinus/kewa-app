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
SELECT
  td.category_id,
  td.unit_id,
  td.user_id,
  CASE
    WHEN td.category_name = 'heizung' THEN 'Heizung funktioniert nicht'
    WHEN td.category_name = 'wasser_sanitaer' THEN 'Wasserhahn tropft in der Kueche'
    WHEN td.category_name = 'elektrik' THEN 'Steckdose im Wohnzimmer defekt'
    ELSE 'Tuerklingel ohne Funktion'
  END as title,
  CASE
    WHEN td.category_name = 'heizung' THEN 'Seit gestern bleibt die Heizung kalt, obwohl das Thermostat voll aufgedreht ist. Es wird langsam sehr kalt in der Wohnung.'
    WHEN td.category_name = 'wasser_sanitaer' THEN 'Der Wasserhahn im Spuelbecken tropft staendig. Auch wenn man ihn fest zudreht, hoert das Tropfen nicht auf.'
    WHEN td.category_name = 'elektrik' THEN 'Die Steckdose neben dem Fernseher funktioniert nicht mehr. Andere Steckdosen im Raum funktionieren normal.'
    ELSE 'Die Tuerklingel funktioniert nicht. Besucher muessen mich per Telefon anrufen.'
  END as description,
  CASE (random() * 2)::int
    WHEN 0 THEN 'normal'::ticket_urgency
    WHEN 1 THEN 'dringend'::ticket_urgency
    ELSE 'notfall'::ticket_urgency
  END as urgency,
  CASE (random() * 2)::int
    WHEN 0 THEN 'offen'::ticket_status
    WHEN 1 THEN 'in_bearbeitung'::ticket_status
    ELSE 'geschlossen'::ticket_status
  END as status,
  CURRENT_TIMESTAMP - (random() * INTERVAL '14 days') as created_at,
  CURRENT_TIMESTAMP - (random() * INTERVAL '7 days') as updated_at,
  CURRENT_TIMESTAMP - (random() * INTERVAL '2 days') as last_message_at
FROM tenant_data td;

-- =============================================
-- TICKET MESSAGES
-- =============================================

-- Create messages for each ticket (tenant + operator conversation)
WITH ticket_data AS (
  SELECT
    t.id as ticket_id,
    t.created_by as tenant_id,
    t.created_at,
    (SELECT id FROM users WHERE email IN ('admin@kewa.ch', 'manager@kewa.ch') LIMIT 1) as operator_id
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

-- =============================================
-- UPDATE TICKET NUMBERS
-- =============================================

-- Generate proper ticket numbers for seeded tickets
-- Format: T-YYYYMMDD-XXXX
WITH numbered_tickets AS (
  SELECT
    id,
    'T-' || to_char(created_at, 'YYYYMMDD') || '-' ||
    LPAD(ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY created_at)::text, 4, '0') as ticket_number
  FROM tickets
  WHERE ticket_number LIKE 'T-%'
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
)
UPDATE tickets t
SET ticket_number = nt.ticket_number
FROM numbered_tickets nt
WHERE t.id = nt.id;

-- =============================================
-- COMMIT
-- =============================================

-- Add comment for tracking
COMMENT ON TABLE tickets IS 'Tenant portal tickets - seeded 2026-01-29';
