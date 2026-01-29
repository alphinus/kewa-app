-- KEWA Renovations Operations System
-- Migration: 062_tenant_portal.sql
-- Purpose: Tenant portal schema - tickets, messages, attachments, categories, app settings
-- Phase: 26-tenant-portal-core, Plan: 01

-- =============================================
-- ENUMS
-- =============================================

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'offen',
    'in_bearbeitung',
    'geschlossen',
    'storniert'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_urgency AS ENUM (
    'notfall',
    'dringend',
    'normal'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_sender_type AS ENUM (
    'tenant',
    'operator'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- APP_SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE app_settings IS 'Key-value configuration store for admin-configurable settings';
COMMENT ON COLUMN app_settings.key IS 'Setting key (primary identifier)';
COMMENT ON COLUMN app_settings.value IS 'Setting value stored as text';
COMMENT ON COLUMN app_settings.value_type IS 'Type hint for parsing value';
COMMENT ON COLUMN app_settings.description IS 'Human-readable description of setting';
COMMENT ON COLUMN app_settings.updated_by IS 'User who last updated this setting';

-- Seed default settings
INSERT INTO app_settings (key, value, value_type, description) VALUES
  ('company_name', 'KEWA AG', 'string', 'Firmenname im Mieterportal'),
  ('support_email', 'info@kewa.ch', 'string', 'Support-Email'),
  ('notfall_phone', '+41 XX XXX XX XX', 'string', 'Notfall-Telefonnummer')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- TICKET_CATEGORIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ticket_categories IS 'Admin-configurable categories for tenant tickets';
COMMENT ON COLUMN ticket_categories.name IS 'Internal identifier (kebab-case)';
COMMENT ON COLUMN ticket_categories.display_name IS 'User-facing category label';
COMMENT ON COLUMN ticket_categories.sort_order IS 'Display order in category picker';
COMMENT ON COLUMN ticket_categories.is_active IS 'Whether category is available for new tickets';

-- Seed default categories
INSERT INTO ticket_categories (name, display_name, sort_order) VALUES
  ('heizung', 'Heizung', 1),
  ('wasser_sanitaer', 'Wasser/Sanitär', 2),
  ('elektrik', 'Elektrik', 3),
  ('allgemein', 'Allgemein', 4)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- TICKETS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES ticket_categories(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency ticket_urgency NOT NULL DEFAULT 'normal',
  status ticket_status NOT NULL DEFAULT 'offen',
  assigned_to UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tickets IS 'Tenant maintenance tickets';
COMMENT ON COLUMN tickets.ticket_number IS 'Auto-generated display number (T-YYYYMMDD-XXXX)';
COMMENT ON COLUMN tickets.category_id IS 'Category for classification';
COMMENT ON COLUMN tickets.unit_id IS 'Unit where issue is located';
COMMENT ON COLUMN tickets.created_by IS 'Tenant who created ticket';
COMMENT ON COLUMN tickets.urgency IS 'Urgency level (Notfall triggers immediate notification)';
COMMENT ON COLUMN tickets.status IS 'Current ticket status';
COMMENT ON COLUMN tickets.assigned_to IS 'Operator assigned to ticket (nullable)';
COMMENT ON COLUMN tickets.closed_at IS 'When ticket was marked closed';
COMMENT ON COLUMN tickets.cancelled_at IS 'When ticket was cancelled by tenant';
COMMENT ON COLUMN tickets.last_message_at IS 'Timestamp of most recent message (for sorting)';

-- =============================================
-- TICKET_MESSAGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type message_sender_type NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ticket_messages IS 'Message thread for ticket communication';
COMMENT ON COLUMN ticket_messages.sender_type IS 'Whether message is from tenant or operator';
COMMENT ON COLUMN ticket_messages.created_by IS 'User who sent message';
COMMENT ON COLUMN ticket_messages.read_at IS 'When message was marked read (NULL = unread)';
COMMENT ON COLUMN ticket_messages.read_by IS 'User who marked message as read';

-- =============================================
-- TICKET_ATTACHMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ticket_attachments IS 'Photo/document attachments for tickets and messages';
COMMENT ON COLUMN ticket_attachments.ticket_id IS 'Ticket this attachment belongs to';
COMMENT ON COLUMN ticket_attachments.message_id IS 'Message this attachment belongs to (nullable for initial ticket photos)';
COMMENT ON COLUMN ticket_attachments.storage_path IS 'Path in Supabase Storage media bucket';
COMMENT ON COLUMN ticket_attachments.file_name IS 'Original filename';

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_unit ON tickets(unit_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status) WHERE status != 'geschlossen';
CREATE INDEX IF NOT EXISTS idx_tickets_urgency ON tickets(urgency) WHERE urgency = 'notfall';
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_last_message ON tickets(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_unread ON ticket_messages(ticket_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message ON ticket_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_active ON ticket_categories(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generate ticket number in format T-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_sequence INTEGER;
  v_ticket_number TEXT;
BEGIN
  -- Format today's date as YYYYMMDD
  v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- Count tickets created today + 1
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM tickets
  WHERE created_at::DATE = CURRENT_DATE;

  -- Format as T-YYYYMMDD-XXXX (zero-padded to 4 digits)
  v_ticket_number := 'T-' || v_date || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_ticket_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_ticket_number() IS 'Auto-generates unique ticket number with daily sequence';

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-generate ticket number on insert
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

COMMENT ON FUNCTION set_ticket_number() IS 'Trigger function to auto-generate ticket_number';

-- Update last_message_at when message is added
CREATE OR REPLACE FUNCTION update_ticket_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tickets
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_last_message
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_message();

COMMENT ON FUNCTION update_ticket_last_message() IS 'Updates ticket.last_message_at when new message is added';

-- Auto-transition to 'in_bearbeitung' when operator replies
CREATE OR REPLACE FUNCTION auto_transition_in_bearbeitung()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'operator' THEN
    UPDATE tickets
    SET status = 'in_bearbeitung',
        updated_at = NOW()
    WHERE id = NEW.ticket_id
      AND status = 'offen';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_transition_in_bearbeitung
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_transition_in_bearbeitung();

COMMENT ON FUNCTION auto_transition_in_bearbeitung() IS 'Auto-transitions ticket to in_bearbeitung when operator sends first reply';

-- Updated_at triggers
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ticket_categories_updated_at
  BEFORE UPDATE ON ticket_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
