-- KEWA Liegenschafts-Aufgabenverwaltung
-- Initial database schema: Building hierarchy and task management
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE (PIN Authentication)
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('kewa', 'imeri')),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BUILDINGS TABLE
-- =============================================
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- UNITS TABLE (Wohnungen + Gemeinschaftsraeume)
-- =============================================
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('apartment', 'common_area', 'building')),
  floor INTEGER,
  position TEXT,
  tenant_name TEXT,
  tenant_visible_to_imeri BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_units_building_id ON units(building_id);

-- =============================================
-- PROJECTS TABLE
-- =============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  visible_to_imeri BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_unit_id ON projects(unit_id);
CREATE INDEX idx_projects_status ON projects(status);

-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completion_note TEXT,
  recurring_type TEXT DEFAULT 'none' CHECK (recurring_type IN ('none', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DATA
-- =============================================

-- Insert users (placeholder PIN hashes - will be set properly in auth plan)
-- PIN hash placeholder: these are NOT real bcrypt hashes, just placeholders
INSERT INTO users (id, pin_hash, role, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', '$placeholder_kewa$', 'kewa', 'KEWA AG'),
  ('00000000-0000-0000-0000-000000000002', '$placeholder_imeri$', 'imeri', 'Imeri');

-- Insert building
INSERT INTO buildings (id, name, address) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Liegenschaft KEWA', NULL);

-- Insert apartments (13 total)
-- EG (Erdgeschoss): 3 apartments
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', 'EG Links', 'apartment', 0, 'left'),
  ('00000000-0000-0000-0001-000000000001', 'EG Mitte', 'apartment', 0, 'middle'),
  ('00000000-0000-0000-0001-000000000001', 'EG Rechts', 'apartment', 0, 'right');

-- 1.OG: 3 apartments
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', '1.OG Links', 'apartment', 1, 'left'),
  ('00000000-0000-0000-0001-000000000001', '1.OG Mitte', 'apartment', 1, 'middle'),
  ('00000000-0000-0000-0001-000000000001', '1.OG Rechts', 'apartment', 1, 'right');

-- 2.OG: 3 apartments
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', '2.OG Links', 'apartment', 2, 'left'),
  ('00000000-0000-0000-0001-000000000001', '2.OG Mitte', 'apartment', 2, 'middle'),
  ('00000000-0000-0000-0001-000000000001', '2.OG Rechts', 'apartment', 2, 'right');

-- 3.OG: 3 apartments
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', '3.OG Links', 'apartment', 3, 'left'),
  ('00000000-0000-0000-0001-000000000001', '3.OG Mitte', 'apartment', 3, 'middle'),
  ('00000000-0000-0000-0001-000000000001', '3.OG Rechts', 'apartment', 3, 'right');

-- Dach (Attic): 1 apartment
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Dachwohnung', 'apartment', 4, NULL);

-- Insert common areas (9 total)
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Keller', 'common_area', -1, NULL),
  ('00000000-0000-0000-0001-000000000001', 'Waschkueche', 'common_area', -1, NULL),
  ('00000000-0000-0000-0001-000000000001', 'Veloraum', 'common_area', -1, NULL),
  ('00000000-0000-0000-0001-000000000001', 'Heizungsraum', 'common_area', -1, NULL),
  ('00000000-0000-0000-0001-000000000001', 'Pelletraum', 'common_area', -1, NULL),
  ('00000000-0000-0000-0001-000000000001', 'Treppenhaus', 'common_area', NULL, NULL),
  ('00000000-0000-0000-0001-000000000001', 'Trockenraum', 'common_area', -1, NULL),
  ('00000000-0000-0000-0001-000000000001', 'Magazin', 'common_area', -1, NULL),
  ('00000000-0000-0000-0001-000000000001', 'Gartenbereich', 'common_area', NULL, NULL);

-- Insert "Gesamtes Gebaeude" (entire building) as special unit
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Gesamtes Gebaeude', 'building', NULL, NULL);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE users IS 'Users with PIN-based authentication (KEWA AG and Imeri)';
COMMENT ON TABLE buildings IS 'Property/Liegenschaft managed by KEWA AG';
COMMENT ON TABLE units IS 'Individual units: apartments, common areas, or the entire building';
COMMENT ON TABLE projects IS 'Work projects within a unit (e.g., Badezimmer, Kueche)';
COMMENT ON TABLE tasks IS 'Individual tasks within a project';

COMMENT ON COLUMN units.unit_type IS 'apartment: Wohnung, common_area: Gemeinschaftsraum, building: entire building';
COMMENT ON COLUMN units.tenant_visible_to_imeri IS 'Whether tenant name is visible to Imeri';
COMMENT ON COLUMN projects.visible_to_imeri IS 'Whether project is visible to Imeri';
COMMENT ON COLUMN tasks.recurring_type IS 'none: one-time, weekly/monthly: recurring task';
