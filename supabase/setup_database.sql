-- =============================================
-- KEWA App - Complete Database Setup
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. INITIAL SCHEMA (001)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('kewa', 'imeri')),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUILDINGS TABLE
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNITS TABLE
CREATE TABLE IF NOT EXISTS units (
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

CREATE INDEX IF NOT EXISTS idx_units_building_id ON units(building_id);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  visible_to_imeri BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_unit_id ON projects(unit_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
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

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. SEED DATA
-- =============================================

-- Insert users (will update PINs later)
INSERT INTO users (id, pin_hash, role, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', '$placeholder$', 'kewa', 'KEWA AG'),
  ('00000000-0000-0000-0000-000000000002', '$placeholder$', 'imeri', 'Imeri')
ON CONFLICT (id) DO NOTHING;

-- Insert building
INSERT INTO buildings (id, name, address) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Liegenschaft KEWA', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert apartments (13 total)
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', 'EG Links', 'apartment', 0, 'left'),
  ('00000000-0000-0000-0001-000000000001', 'EG Mitte', 'apartment', 0, 'middle'),
  ('00000000-0000-0000-0001-000000000001', 'EG Rechts', 'apartment', 0, 'right'),
  ('00000000-0000-0000-0001-000000000001', '1.OG Links', 'apartment', 1, 'left'),
  ('00000000-0000-0000-0001-000000000001', '1.OG Mitte', 'apartment', 1, 'middle'),
  ('00000000-0000-0000-0001-000000000001', '1.OG Rechts', 'apartment', 1, 'right'),
  ('00000000-0000-0000-0001-000000000001', '2.OG Links', 'apartment', 2, 'left'),
  ('00000000-0000-0000-0001-000000000001', '2.OG Mitte', 'apartment', 2, 'middle'),
  ('00000000-0000-0000-0001-000000000001', '2.OG Rechts', 'apartment', 2, 'right'),
  ('00000000-0000-0000-0001-000000000001', '3.OG Links', 'apartment', 3, 'left'),
  ('00000000-0000-0000-0001-000000000001', '3.OG Mitte', 'apartment', 3, 'middle'),
  ('00000000-0000-0000-0001-000000000001', '3.OG Rechts', 'apartment', 3, 'right'),
  ('00000000-0000-0000-0001-000000000001', 'Dachwohnung', 'apartment', 4, NULL)
ON CONFLICT DO NOTHING;

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
  ('00000000-0000-0000-0001-000000000001', 'Gartenbereich', 'common_area', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Insert "Gesamtes Gebaeude" as special unit
INSERT INTO units (building_id, name, unit_type, floor, position) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Gesamtes Gebaeude', 'building', NULL, NULL)
ON CONFLICT DO NOTHING;

-- =============================================
-- 3. PIN HASHES (002)
-- =============================================
-- KEWA AG: PIN 1234
-- Imeri: PIN 5678

UPDATE users
SET pin_hash = '$2b$10$Dm5ReFjXek0mmz7irIZxyOuQlutv/XyFrlvQBU7NjpHY2ErPIQQAu'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE users
SET pin_hash = '$2b$10$.h6hfq1Ji6ChcKXFk6UPR.1NZpmsDuNldUS7w3XN5TGqPwAiQx9QS'
WHERE id = '00000000-0000-0000-0000-000000000002';

-- =============================================
-- 4. TASK PHOTOS TABLE (003)
-- =============================================

CREATE TABLE IF NOT EXISTS task_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('explanation', 'completion')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_type ON task_photos(task_id, photo_type);

-- =============================================
-- 5. TASK AUDIO TABLE (005)
-- =============================================

CREATE TABLE IF NOT EXISTS task_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  audio_type TEXT NOT NULL CHECK (audio_type IN ('explanation', 'emergency')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration_seconds INTEGER,
  transcription TEXT,
  transcription_status TEXT NOT NULL DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_audio_task_id ON task_audio(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audio_uploaded_by ON task_audio(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_audio_created_at ON task_audio(created_at);

-- =============================================
-- 6. ARCHIVE TRACKING (006)
-- =============================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at);

UPDATE projects
SET archived_at = created_at
WHERE status = 'archived' AND archived_at IS NULL;

-- =============================================
-- 7. DISABLE RLS (App handles auth via middleware)
-- =============================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_audio DISABLE ROW LEVEL SECURITY;

-- Grant access to anon and authenticated roles
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON buildings TO anon, authenticated;
GRANT ALL ON units TO anon, authenticated;
GRANT ALL ON projects TO anon, authenticated;
GRANT ALL ON tasks TO anon, authenticated;
GRANT ALL ON task_photos TO anon, authenticated;
GRANT ALL ON task_audio TO anon, authenticated;

-- =============================================
-- 8. STORAGE BUCKETS (004)
-- =============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-audio', 'task-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task-photos
DROP POLICY IF EXISTS "Authenticated users can read photos" ON storage.objects;
CREATE POLICY "Authenticated users can read photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-photos');

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-photos');

DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-photos');

-- Storage policies for task-audio
DROP POLICY IF EXISTS "Authenticated users can read audio" ON storage.objects;
CREATE POLICY "Authenticated users can read audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-audio');

DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-audio');

DROP POLICY IF EXISTS "Authenticated users can delete audio" ON storage.objects;
CREATE POLICY "Authenticated users can delete audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-audio');

-- =============================================
-- DONE!
-- =============================================
-- Database setup complete.
--
-- Login credentials:
-- KEWA AG: PIN 1234
-- Imeri: PIN 5678
