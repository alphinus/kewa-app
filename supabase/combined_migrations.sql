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
-- Set PIN hashes for users
-- KEWA AG: PIN 1234
-- Imeri: PIN 5678

UPDATE users
SET pin_hash = '$2b$10$Dm5ReFjXek0mmz7irIZxyOuQlutv/XyFrlvQBU7NjpHY2ErPIQQAu'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE users
SET pin_hash = '$2b$10$.h6hfq1Ji6ChcKXFk6UPR.1NZpmsDuNldUS7w3XN5TGqPwAiQx9QS'
WHERE id = '00000000-0000-0000-0000-000000000002';
-- KEWA Liegenschafts-Aufgabenverwaltung
-- Task photos schema: Photo attachments for task documentation
-- Migration: 003_task_photos.sql

-- =============================================
-- TASK_PHOTOS TABLE
-- =============================================
-- Photos attached to tasks for documentation
-- KEWA adds 'explanation' photos, Imeri adds 'completion' photos

CREATE TABLE task_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('explanation', 'completion')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
-- For querying photos by task
CREATE INDEX idx_task_photos_task_id ON task_photos(task_id);

-- For querying photos by task and type (common query pattern)
CREATE INDEX idx_task_photos_type ON task_photos(task_id, photo_type);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE task_photos IS 'Photo attachments for task documentation - proof of work';
COMMENT ON COLUMN task_photos.photo_type IS 'explanation: added by KEWA to explain task, completion: added by Imeri as proof of completion';
COMMENT ON COLUMN task_photos.storage_path IS 'Path in Supabase Storage bucket (task-photos)';
COMMENT ON COLUMN task_photos.file_name IS 'Original filename for display purposes';
COMMENT ON COLUMN task_photos.file_size IS 'File size in bytes after compression';

-- =============================================
-- SUPABASE STORAGE BUCKET POLICY
-- =============================================
-- NOTE: The 'task-photos' bucket must be created manually in Supabase Dashboard
-- or via Supabase CLI with the following policies:
--
-- Bucket name: task-photos
-- Public: No (requires authentication)
--
-- Policies to configure:
-- 1. SELECT (download): Allow authenticated users to read all photos
--    Policy: authenticated
--    Target roles: authenticated
--
-- 2. INSERT (upload): Allow authenticated users to upload
--    Policy: authenticated
--    Target roles: authenticated
--    Folder path: Each user uploads to their task folder
--
-- 3. DELETE: Allow users to delete only their own uploads
--    Policy: User can delete own photos
--    Target roles: authenticated
--    Using expression: auth.uid() = owner
--
-- Storage path pattern: {task_id}/{photo_type}/{uuid}.webp
-- Example: 00000000-0000-0000-0000-000000000001/completion/abc123.webp
--
-- Max file size: 5MB (after compression typically 50-100KB)
-- Allowed MIME types: image/webp, image/jpeg
-- Disable RLS for all tables
-- Auth is handled at API level via middleware and session tokens
-- This simplifies database access for this internal business app

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated and anon roles
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON buildings TO anon, authenticated;
GRANT ALL ON units TO anon, authenticated;
GRANT ALL ON projects TO anon, authenticated;
GRANT ALL ON tasks TO anon, authenticated;
GRANT ALL ON task_photos TO anon, authenticated;
-- KEWA Liegenschafts-Aufgabenverwaltung
-- Storage buckets for photos and audio files
-- Migration: 004_storage_buckets.sql

-- =============================================
-- STORAGE BUCKETS
-- =============================================
-- Create storage buckets for task attachments

-- Task photos bucket (for explanation and completion photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Task audio bucket (for voice notes and emergency recordings)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-audio', 'task-audio', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES - TASK PHOTOS
-- =============================================

-- Allow authenticated users to read all photos
CREATE POLICY "Authenticated users can read photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-photos');

-- Allow authenticated users to delete their own photos
-- Note: We track ownership in our task_photos table, so allow all deletes for authenticated users
-- The API layer enforces ownership checks
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-photos');

-- =============================================
-- STORAGE POLICIES - TASK AUDIO
-- =============================================

-- Allow authenticated users to read all audio files
CREATE POLICY "Authenticated users can read audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-audio');

-- Allow authenticated users to upload audio
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-audio');

-- Allow authenticated users to delete their own audio
-- Note: We track ownership in our task_audio table, so allow all deletes for authenticated users
-- The API layer enforces ownership checks
CREATE POLICY "Authenticated users can delete audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-audio');
-- KEWA Liegenschafts-Aufgabenverwaltung
-- Task audio schema: Audio attachments for voice notes and instructions
-- Migration: 005_task_audio.sql

-- =============================================
-- TASK_AUDIO TABLE
-- =============================================
-- Audio attachments for tasks:
-- - KEWA adds 'explanation' audio (voice instructions, will be transcribed)
-- - Imeri adds 'emergency' audio (emergency recordings, no transcription)

CREATE TABLE task_audio (
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

-- =============================================
-- INDEXES
-- =============================================
-- For querying audio by task (primary use case)
CREATE INDEX idx_task_audio_task_id ON task_audio(task_id);

-- For querying audio by uploader (user's recordings)
CREATE INDEX idx_task_audio_uploaded_by ON task_audio(uploaded_by);

-- For chronological ordering
CREATE INDEX idx_task_audio_created_at ON task_audio(created_at);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE task_audio IS 'Audio attachments for tasks - voice notes and instructions';
COMMENT ON COLUMN task_audio.audio_type IS 'explanation: KEWA voice instructions (transcribed), emergency: Imeri emergency recordings';
COMMENT ON COLUMN task_audio.storage_path IS 'Path in Supabase Storage bucket (task-audio)';
COMMENT ON COLUMN task_audio.file_name IS 'Original filename for display purposes';
COMMENT ON COLUMN task_audio.file_size IS 'File size in bytes';
COMMENT ON COLUMN task_audio.duration_seconds IS 'Audio duration in seconds (may not be available for all formats)';
COMMENT ON COLUMN task_audio.transcription IS 'Text transcription of audio (filled by transcription service)';
COMMENT ON COLUMN task_audio.transcription_status IS 'Status of transcription: pending, processing, completed, or failed';

-- =============================================
-- SUPABASE STORAGE BUCKET POLICY
-- =============================================
-- NOTE: The 'task-audio' bucket must be created manually in Supabase Dashboard
-- or via Supabase CLI with the following policies:
--
-- Bucket name: task-audio
-- Public: No (requires authentication)
--
-- Policies to configure:
-- 1. SELECT (download): Allow authenticated users to read all audio files
--    Policy: authenticated
--    Target roles: authenticated
--
-- 2. INSERT (upload): Allow authenticated users to upload
--    Policy: authenticated
--    Target roles: authenticated
--
-- 3. DELETE: Allow users to delete only their own uploads
--    Policy: User can delete own audio
--    Target roles: authenticated
--    Using expression: auth.uid() = owner
--
-- Storage path pattern: {task_id}/{audio_type}/{uuid}.{ext}
-- Example: 00000000-0000-0000-0000-000000000001/explanation/abc123.webm
--
-- Max file size: 10MB
-- Max duration: 60 seconds (enforced at API level)
-- Allowed MIME types: audio/webm, audio/mp4, audio/mpeg, audio/wav
-- Archive tracking for projects
-- Migration: 006_archive_tracking.sql

-- Add archived_at column to track when a project was archived
ALTER TABLE projects
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient filtering of archived/non-archived projects
CREATE INDEX idx_projects_archived_at ON projects(archived_at);

-- Note: The check constraint for archived_at being set only when status='archived'
-- is enforced at the application level rather than database level to allow
-- atomic updates and better error handling.

-- Update existing archived projects (if any) to have archived_at timestamp
UPDATE projects
SET archived_at = created_at
WHERE status = 'archived' AND archived_at IS NULL;

-- Add comment
COMMENT ON COLUMN projects.archived_at IS 'Timestamp when project was archived. NULL for active projects.';
-- Test data for archiving feature testing
-- This migration adds sample projects and tasks

-- First, get unit IDs (we need to reference them)
-- Using a DO block to handle the dynamic unit lookup

DO $$
DECLARE
  unit_eg_links UUID;
  unit_waschkueche UUID;
  project_bad UUID;
  project_kueche UUID;
  project_wasch UUID;
BEGIN
  -- Get unit IDs
  SELECT id INTO unit_eg_links FROM units WHERE name = 'EG Links' LIMIT 1;
  SELECT id INTO unit_waschkueche FROM units WHERE name = 'Waschkueche' LIMIT 1;

  -- Skip if units not found
  IF unit_eg_links IS NULL THEN
    RAISE NOTICE 'Units not found, skipping test data';
    RETURN;
  END IF;

  -- Create test projects
  INSERT INTO projects (id, unit_id, name, description, status, visible_to_imeri)
  VALUES
    ('00000000-0000-0000-0002-000000000001', unit_eg_links, 'Badezimmer Renovation', 'Komplette Renovation des Badezimmers', 'active', true),
    ('00000000-0000-0000-0002-000000000002', unit_eg_links, 'Kueche Reparatur', 'Kleine Reparaturen in der Kueche', 'active', true),
    ('00000000-0000-0000-0002-000000000003', unit_waschkueche, 'Waschmaschine Wartung', 'Jaehrliche Wartung der Waschmaschinen', 'active', true)
  ON CONFLICT (id) DO NOTHING;

  project_bad := '00000000-0000-0000-0002-000000000001';
  project_kueche := '00000000-0000-0000-0002-000000000002';
  project_wasch := '00000000-0000-0000-0002-000000000003';

  -- Create test tasks
  -- Badezimmer: 2 completed tasks (can be archived)
  INSERT INTO tasks (project_id, title, description, status, priority, completed_at)
  VALUES
    (project_bad, 'Fliesen ersetzen', 'Defekte Fliesen im Duschbereich ersetzen', 'completed', 'high', NOW() - INTERVAL '2 days'),
    (project_bad, 'Silikon erneuern', 'Altes Silikon entfernen und neu auftragen', 'completed', 'normal', NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  -- Kueche: 1 open, 1 completed (cannot be archived)
  INSERT INTO tasks (project_id, title, description, status, priority, due_date)
  VALUES
    (project_kueche, 'Wasserhahn reparieren', 'Tropfender Wasserhahn', 'open', 'urgent', CURRENT_DATE + 3),
    (project_kueche, 'Schranktuer einstellen', 'Schranktuer haengt schief', 'completed', 'low', NULL)
  ON CONFLICT DO NOTHING;

  -- Waschkueche: All completed (can be archived)
  INSERT INTO tasks (project_id, title, description, status, priority, completed_at)
  VALUES
    (project_wasch, 'Filter reinigen', 'Flusenfilter aller Maschinen reinigen', 'completed', 'normal', NOW() - INTERVAL '3 days'),
    (project_wasch, 'Schlaeuche pruefen', 'Zu- und Abflusschlaeuche kontrollieren', 'completed', 'normal', NOW() - INTERVAL '3 days'),
    (project_wasch, 'Dichtungen pruefen', 'Tuerdichtungen auf Verschleiss pruefen', 'completed', 'normal', NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test data created: 3 projects, 7 tasks';
END $$;
-- KEWA Renovations Operations System
-- Migration: 008_property_building.sql
-- DATA-01: Property entity
-- DATA-02: Building enhancement with property relationship

-- =============================================
-- PROPERTY (Liegenschaft) ENTITY
-- =============================================

-- Property is the top-level entity (can contain multiple buildings)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BUILDING ENHANCEMENT
-- =============================================

-- Add property_id to buildings (nullable for migration)
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================
-- MIGRATION: Link existing building to default property
-- =============================================

-- Create default property for existing building
INSERT INTO properties (id, name, address)
SELECT
  gen_random_uuid(),
  'Liegenschaft KEWA',
  (SELECT address FROM buildings LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM properties);

-- Link existing building to the default property
UPDATE buildings
SET property_id = (SELECT id FROM properties LIMIT 1)
WHERE property_id IS NULL;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_buildings_property_id ON buildings(property_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

-- Reusable updated_at trigger function (if not exists from initial schema)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for properties
DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for buildings updated_at (since we added the column)
DROP TRIGGER IF EXISTS buildings_updated_at ON buildings;
CREATE TRIGGER buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE properties IS 'Property/Liegenschaft - top level entity that can contain multiple buildings';
COMMENT ON COLUMN buildings.property_id IS 'Foreign key to parent property';
COMMENT ON COLUMN buildings.updated_at IS 'Last modification timestamp';
-- KEWA Renovations Operations System
-- Migration: 009_unit_room.sql
-- DATA-03: Unit rent tracking
-- DATA-04: Room entity with type classification

-- =============================================
-- ROOM TYPE ENUM
-- =============================================

-- Room types for classification
CREATE TYPE room_type AS ENUM (
  'bathroom',
  'kitchen',
  'bedroom',
  'living_room',
  'hallway',
  'balcony',
  'storage',
  'laundry',
  'garage',
  'office',
  'other'
);

-- =============================================
-- ROOM CONDITION ENUM (for Digital Twin - Phase 11)
-- =============================================

CREATE TYPE room_condition AS ENUM ('old', 'partial', 'new');

-- =============================================
-- UNIT ENHANCEMENT: Rent tracking
-- =============================================

ALTER TABLE units
ADD COLUMN IF NOT EXISTS rent_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rent_currency TEXT DEFAULT 'CHF',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at trigger to units
DROP TRIGGER IF EXISTS units_updated_at ON units;
CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROOMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type room_type NOT NULL DEFAULT 'other',

  -- Digital Twin condition tracking (Phase 11)
  condition room_condition DEFAULT 'old',
  condition_updated_at TIMESTAMPTZ,
  condition_source_project_id UUID,  -- Which project updated the condition

  -- Physical attributes
  area_sqm DECIMAL(8,2),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_rooms_unit_id ON rooms(unit_id);
CREATE INDEX IF NOT EXISTS idx_rooms_condition ON rooms(condition);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON rooms(room_type);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS rooms_updated_at ON rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE rooms IS 'Individual rooms within a unit for granular tracking';
COMMENT ON COLUMN rooms.room_type IS 'Classification of room type';
COMMENT ON COLUMN rooms.condition IS 'Digital Twin: current condition (old/partial/new)';
COMMENT ON COLUMN rooms.condition_source_project_id IS 'Project that last updated the condition';
COMMENT ON COLUMN units.rent_amount IS 'Monthly rent for this unit in CHF';
COMMENT ON COLUMN units.rent_currency IS 'Currency for rent (default CHF)';
-- KEWA Renovations Operations System
-- Migration: 010_component.sql
-- DATA-05: Component entity for granular tracking

-- =============================================
-- COMPONENT TYPE ENUM
-- =============================================

-- Component types for granular room element tracking
CREATE TYPE component_type AS ENUM (
  'floor',
  'walls',
  'ceiling',
  'windows',
  'doors',
  'electrical',
  'plumbing',
  'heating',
  'ventilation',
  'kitchen_appliances',
  'bathroom_fixtures',
  'other'
);

-- =============================================
-- COMPONENTS TABLE
-- =============================================

-- Optional granular tracking of room elements (Boden, Waende, Fenster)
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_type component_type NOT NULL,

  -- Condition tracking (reuses room_condition enum)
  condition room_condition DEFAULT 'old',
  condition_updated_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_components_room_id ON components(room_id);
CREATE INDEX IF NOT EXISTS idx_components_type ON components(component_type);
CREATE INDEX IF NOT EXISTS idx_components_condition ON components(condition);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS components_updated_at ON components;
CREATE TRIGGER components_updated_at
  BEFORE UPDATE ON components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE components IS 'Optional granular tracking of room elements (floor, walls, windows, etc.)';
COMMENT ON COLUMN components.component_type IS 'Type of component within the room';
COMMENT ON COLUMN components.condition IS 'Current condition (old/partial/new)';
-- KEWA Renovations Operations System
-- Migration: 011_renovation_project.sql
-- DATA-06: RenovationProject entity with workflow status

-- =============================================
-- RENOVATION STATUS ENUM
-- =============================================

-- Full workflow status for renovation projects
CREATE TYPE renovation_status AS ENUM (
  'planned',
  'active',
  'blocked',
  'finished',
  'approved'
);

-- =============================================
-- RENOVATION PROJECTS TABLE
-- =============================================

-- Enhanced project type for renovations with full workflow support
CREATE TABLE IF NOT EXISTS renovation_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  unit_id UUID NOT NULL REFERENCES units(id),
  template_id UUID,  -- Will link to templates (Phase 8)

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  status renovation_status DEFAULT 'planned',

  -- Scheduling
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Budget
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),

  -- Approval workflow
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- Visibility (preserve v1 pattern)
  visible_to_imeri BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_renovation_projects_unit_id ON renovation_projects(unit_id);
CREATE INDEX IF NOT EXISTS idx_renovation_projects_status ON renovation_projects(status);
CREATE INDEX IF NOT EXISTS idx_renovation_projects_template_id ON renovation_projects(template_id);
CREATE INDEX IF NOT EXISTS idx_renovation_projects_created_by ON renovation_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_renovation_projects_dates ON renovation_projects(planned_start_date, planned_end_date);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS renovation_projects_updated_at ON renovation_projects;
CREATE TRIGGER renovation_projects_updated_at
  BEFORE UPDATE ON renovation_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- LINK ROOMS TO RENOVATION PROJECTS
-- =============================================

-- Add source project reference for room condition updates
ALTER TABLE rooms
ADD CONSTRAINT fk_rooms_condition_source
FOREIGN KEY (condition_source_project_id) REFERENCES renovation_projects(id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE renovation_projects IS 'Enhanced renovation project with full workflow support';
COMMENT ON COLUMN renovation_projects.template_id IS 'Reference to template (Phase 8)';
COMMENT ON COLUMN renovation_projects.status IS 'Workflow status: planned -> active -> blocked/finished -> approved';
COMMENT ON COLUMN renovation_projects.estimated_cost IS 'Initial cost estimate in CHF';
COMMENT ON COLUMN renovation_projects.actual_cost IS 'Actual total cost after completion';
COMMENT ON COLUMN renovation_projects.approved_by IS 'User who approved the project completion';
COMMENT ON COLUMN renovation_projects.visible_to_imeri IS 'Whether project is visible to Imeri (preserves v1 pattern)';
-- KEWA Renovations Operations System
-- Migration: 012_task_enhancements.sql
-- DATA-07: Task dependencies and checklist functionality

-- =============================================
-- TASK ENHANCEMENTS
-- =============================================

-- Add new columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id),
ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS renovation_project_id UUID REFERENCES renovation_projects(id);

-- =============================================
-- TASK DEPENDENCIES (Many-to-Many)
-- =============================================

-- Junction table for task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate dependencies
  CONSTRAINT unique_task_dependency UNIQUE(task_id, depends_on_task_id),

  -- Prevent self-reference
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_room_id ON tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_renovation_project_id ON tasks(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE task_dependencies IS 'Many-to-many relationship for task dependencies';
COMMENT ON COLUMN task_dependencies.task_id IS 'The task that has a dependency';
COMMENT ON COLUMN task_dependencies.depends_on_task_id IS 'The task that must be completed first';
COMMENT ON COLUMN tasks.parent_task_id IS 'Parent task for subtask hierarchy';
COMMENT ON COLUMN tasks.checklist_items IS 'JSONB array: [{"id": "uuid", "text": "string", "completed": bool, "completed_at": "timestamp"}]';
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated hours to complete task';
COMMENT ON COLUMN tasks.actual_hours IS 'Actual hours spent on task';
COMMENT ON COLUMN tasks.room_id IS 'Optional link to specific room';
COMMENT ON COLUMN tasks.renovation_project_id IS 'Optional link to renovation project';
-- KEWA Renovations Operations System
-- Migration: 013_work_order.sql
-- DATA-08: WorkOrder entity for external contractor assignments

-- =============================================
-- WORK ORDER STATUS ENUM
-- =============================================

-- Full workflow status for work orders
CREATE TYPE work_order_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'in_progress',
  'done',
  'inspected',
  'closed'
);

-- =============================================
-- WORK ORDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  renovation_project_id UUID REFERENCES renovation_projects(id),
  task_id UUID REFERENCES tasks(id),
  room_id UUID REFERENCES rooms(id),
  partner_id UUID,  -- Will reference partners table (created in next migration)

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  scope_of_work TEXT,  -- Detailed work description for contractor

  -- Status workflow
  status work_order_status DEFAULT 'draft',

  -- Scheduling: Requested by KEWA
  requested_start_date DATE,
  requested_end_date DATE,

  -- Scheduling: Proposed by contractor
  proposed_start_date DATE,
  proposed_end_date DATE,

  -- Scheduling: Actual
  actual_start_date DATE,
  actual_end_date DATE,

  -- Magic link for external access (Phase 9)
  access_token UUID DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ,
  acceptance_deadline TIMESTAMPTZ,

  -- Status tracking timestamps
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Cost tracking
  estimated_cost DECIMAL(12,2),
  proposed_cost DECIMAL(12,2),  -- Contractor's price proposal
  final_cost DECIMAL(12,2),

  -- Notes (internal vs contractor visible)
  internal_notes TEXT,  -- KEWA only
  contractor_notes TEXT,  -- From contractor

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_work_orders_project_id ON work_orders(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_partner_id ON work_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_access_token ON work_orders(access_token);
CREATE INDEX IF NOT EXISTS idx_work_orders_task_id ON work_orders(task_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_dates ON work_orders(requested_start_date, requested_end_date);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS work_orders_updated_at ON work_orders;
CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE work_orders IS 'Work orders/tickets for external contractor assignments';
COMMENT ON COLUMN work_orders.scope_of_work IS 'Detailed work description for contractor';
COMMENT ON COLUMN work_orders.status IS 'Workflow: draft -> sent -> viewed -> accepted/rejected -> in_progress -> done -> inspected -> closed';
COMMENT ON COLUMN work_orders.access_token IS 'Magic link token for external contractor access (Phase 9)';
COMMENT ON COLUMN work_orders.proposed_cost IS 'Cost proposed by contractor in response';
COMMENT ON COLUMN work_orders.internal_notes IS 'Notes visible only to KEWA staff';
COMMENT ON COLUMN work_orders.contractor_notes IS 'Notes from contractor';
-- KEWA Renovations Operations System
-- Migration: 014_partner.sql
-- DATA-09: Partner entity (Handwerker, Lieferanten)

-- =============================================
-- PARTNER TYPE ENUM
-- =============================================

CREATE TYPE partner_type AS ENUM ('contractor', 'supplier');

-- =============================================
-- TRADE CATEGORY ENUM
-- =============================================

CREATE TYPE trade_category AS ENUM (
  'general',
  'plumbing',
  'electrical',
  'hvac',
  'painting',
  'flooring',
  'carpentry',
  'roofing',
  'masonry',
  'glazing',
  'landscaping',
  'cleaning',
  'demolition',
  'other'
);

-- =============================================
-- PARTNERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type
  partner_type partner_type NOT NULL,

  -- Basic info
  company_name TEXT NOT NULL,
  contact_name TEXT,

  -- Contact details
  email TEXT,
  phone TEXT,
  address TEXT,

  -- Trade info (for contractors) - array for multi-trade
  trade_categories trade_category[] DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(partner_type);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_trade_categories ON partners USING GIN(trade_categories);

-- =============================================
-- LINK WORK ORDERS TO PARTNERS
-- =============================================

-- Add foreign key constraint to work_orders
ALTER TABLE work_orders
ADD CONSTRAINT fk_work_orders_partner
FOREIGN KEY (partner_id) REFERENCES partners(id);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS partners_updated_at ON partners;
CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE partners IS 'External partners: contractors (Handwerker) and suppliers (Lieferanten)';
COMMENT ON COLUMN partners.partner_type IS 'Type of partner: contractor or supplier';
COMMENT ON COLUMN partners.trade_categories IS 'Array of trade categories for multi-trade contractors';
COMMENT ON COLUMN partners.is_active IS 'Whether partner is currently active/available';
-- KEWA Renovations Operations System
-- Migration: 015_media.sql
-- DATA-14: Unified Media entity with before/after metadata

-- =============================================
-- MEDIA TYPE ENUMS
-- =============================================

CREATE TYPE media_type AS ENUM ('photo', 'video', 'document', 'audio');
CREATE TYPE media_context AS ENUM ('before', 'after', 'during', 'documentation', 'other');

-- =============================================
-- UNIFIED MEDIA TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic relationship (can attach to any entity)
  entity_type TEXT NOT NULL,  -- 'task', 'work_order', 'room', 'project', 'renovation_project', etc.
  entity_id UUID NOT NULL,

  -- Media info
  media_type media_type NOT NULL,
  context media_context DEFAULT 'other',

  -- Storage
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Metadata
  description TEXT,
  taken_at TIMESTAMPTZ,  -- When photo/video was captured

  -- Audio-specific
  duration_seconds INTEGER,
  transcription TEXT,
  transcription_status TEXT,

  -- Upload info
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_context ON media(context);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by);

-- =============================================
-- UNIFIED VIEW: Combines old tables with new media table
-- =============================================

-- View to unify old task_photos and task_audio with new media table
CREATE OR REPLACE VIEW all_media AS
-- From legacy task_photos
SELECT
  id,
  'task' AS entity_type,
  task_id AS entity_id,
  'photo'::media_type AS media_type,
  CASE
    WHEN photo_type = 'explanation' THEN 'documentation'::media_context
    WHEN photo_type = 'completion' THEN 'after'::media_context
    ELSE 'other'::media_context
  END AS context,
  storage_path,
  file_name,
  file_size,
  NULL::TEXT AS mime_type,
  NULL::TEXT AS description,
  NULL::TIMESTAMPTZ AS taken_at,
  NULL::INTEGER AS duration_seconds,
  NULL::TEXT AS transcription,
  NULL::TEXT AS transcription_status,
  uploaded_by,
  created_at
FROM task_photos

UNION ALL

-- From legacy task_audio
SELECT
  id,
  'task' AS entity_type,
  task_id AS entity_id,
  'audio'::media_type AS media_type,
  CASE
    WHEN audio_type = 'explanation' THEN 'documentation'::media_context
    WHEN audio_type = 'emergency' THEN 'other'::media_context
    ELSE 'other'::media_context
  END AS context,
  storage_path,
  file_name,
  file_size,
  NULL::TEXT AS mime_type,
  NULL::TEXT AS description,
  NULL::TIMESTAMPTZ AS taken_at,
  duration_seconds,
  transcription,
  transcription_status,
  uploaded_by,
  created_at
FROM task_audio

UNION ALL

-- From new media table
SELECT
  id,
  entity_type,
  entity_id,
  media_type,
  context,
  storage_path,
  file_name,
  file_size,
  mime_type,
  description,
  taken_at,
  duration_seconds,
  transcription,
  transcription_status,
  uploaded_by,
  created_at
FROM media;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE media IS 'Unified media storage for all entity types (photos, videos, documents, audio)';
COMMENT ON COLUMN media.entity_type IS 'Type of entity this media is attached to (task, work_order, room, etc.)';
COMMENT ON COLUMN media.entity_id IS 'UUID of the entity this media is attached to';
COMMENT ON COLUMN media.context IS 'Context: before/after renovation, during work, documentation';
COMMENT ON VIEW all_media IS 'Unified view combining legacy task_photos, task_audio with new media table';
-- KEWA Renovations Operations System
-- Migration: 016_audit_log.sql
-- DATA-15: Comprehensive audit logging

-- =============================================
-- AUDIT ACTION ENUM
-- =============================================

CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'archive', 'restore');

-- =============================================
-- AUDIT LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,

  -- Who changed it
  user_id UUID REFERENCES users(id),
  user_role TEXT,

  -- Change details
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],

  -- Context
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp (no updated_at - logs are immutable)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- =============================================
-- HELPER FUNCTION: Create audit log entry
-- =============================================

CREATE OR REPLACE FUNCTION create_audit_log(
  p_table_name TEXT,
  p_record_id UUID,
  p_action audit_action,
  p_user_id UUID,
  p_user_role TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_changed_fields TEXT[];
  v_log_id UUID;
BEGIN
  -- Calculate changed fields for update operations
  IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM (
      SELECT key
      FROM jsonb_object_keys(p_new_values) AS key
      WHERE p_old_values->key IS DISTINCT FROM p_new_values->key
    ) AS changed_keys;
  END IF;

  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    user_role,
    old_values,
    new_values,
    changed_fields,
    ip_address,
    user_agent
  ) VALUES (
    p_table_name,
    p_record_id,
    p_action,
    p_user_id,
    p_user_role,
    p_old_values,
    p_new_values,
    v_changed_fields,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Get history for a record
-- =============================================

CREATE OR REPLACE FUNCTION get_record_history(
  p_table_name TEXT,
  p_record_id UUID
) RETURNS TABLE (
  id UUID,
  action audit_action,
  user_id UUID,
  user_role TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.action,
    al.user_id,
    al.user_role,
    al.old_values,
    al.new_values,
    al.changed_fields,
    al.created_at
  FROM audit_logs al
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE audit_logs IS 'Immutable audit log for all data changes';
COMMENT ON COLUMN audit_logs.table_name IS 'Name of the table that was modified';
COMMENT ON COLUMN audit_logs.record_id IS 'UUID of the record that was modified';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: create, update, delete, archive, restore';
COMMENT ON COLUMN audit_logs.old_values IS 'JSONB snapshot of record before change (for update/delete)';
COMMENT ON COLUMN audit_logs.new_values IS 'JSONB snapshot of record after change (for create/update)';
COMMENT ON COLUMN audit_logs.changed_fields IS 'Array of field names that were changed';
COMMENT ON FUNCTION create_audit_log IS 'Helper to create audit log entries with automatic diff calculation';
COMMENT ON FUNCTION get_record_history IS 'Helper to retrieve full history for a record';
-- Migration: 017_offer.sql
-- Purpose: Create Offer entity for contractor/supplier offers (Offerten)
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-10

-- Offer status enum
DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM (
    'draft',
    'sent',
    'received',
    'under_review',
    'accepted',
    'rejected',
    'expired',
    'superseded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  partner_id UUID NOT NULL REFERENCES partners(id),
  work_order_id UUID REFERENCES work_orders(id),
  renovation_project_id UUID REFERENCES renovation_projects(id),

  -- Offer details
  offer_number TEXT, -- External reference number
  title TEXT NOT NULL,
  description TEXT,

  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  tax_rate DECIMAL(5,2) DEFAULT 7.7, -- Swiss VAT
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),

  -- Line items (optional detailed breakdown)
  line_items JSONB DEFAULT '[]',

  -- Status workflow
  status offer_status DEFAULT 'received',

  -- Dates
  offer_date DATE,
  valid_until DATE,
  received_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Decision
  accepted_by UUID REFERENCES users(id),
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT,

  -- Documents
  document_storage_path TEXT, -- PDF of offer

  -- Notes
  internal_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_partner ON offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_offers_work_order ON offers(work_order_id);
CREATE INDEX IF NOT EXISTS idx_offers_project ON offers(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- Updated at trigger
DROP TRIGGER IF EXISTS offers_updated_at ON offers;
CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate tax and total amounts
CREATE OR REPLACE FUNCTION calculate_offer_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tax_amount = NEW.amount * (NEW.tax_rate / 100);
  NEW.total_amount = NEW.amount + NEW.tax_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offers_calculate_totals ON offers;
CREATE TRIGGER offers_calculate_totals
  BEFORE INSERT OR UPDATE OF amount, tax_rate ON offers
  FOR EACH ROW EXECUTE FUNCTION calculate_offer_totals();

-- Comments for documentation
COMMENT ON TABLE offers IS 'Offers (Offerten) from contractors/suppliers for work orders';
COMMENT ON COLUMN offers.offer_number IS 'External reference number from the partner';
COMMENT ON COLUMN offers.amount IS 'Net amount before tax';
COMMENT ON COLUMN offers.tax_rate IS 'Tax rate in percent (default 7.7% Swiss VAT)';
COMMENT ON COLUMN offers.tax_amount IS 'Calculated tax amount (auto-computed)';
COMMENT ON COLUMN offers.total_amount IS 'Total amount including tax (auto-computed)';
COMMENT ON COLUMN offers.line_items IS 'JSONB array of line items: [{id, description, quantity, unit_price, total}]';
COMMENT ON COLUMN offers.document_storage_path IS 'Supabase storage path for offer PDF';
-- Migration: 018_invoice.sql
-- Purpose: Create Invoice entity for partner invoices (Rechnungen)
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-11

-- Invoice status enum
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'received',
    'under_review',
    'approved',
    'disputed',
    'partially_paid',
    'paid',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  partner_id UUID NOT NULL REFERENCES partners(id),
  offer_id UUID REFERENCES offers(id), -- Links to accepted offer
  work_order_id UUID REFERENCES work_orders(id),
  renovation_project_id UUID REFERENCES renovation_projects(id),

  -- Invoice details
  invoice_number TEXT NOT NULL, -- External invoice number
  title TEXT,
  description TEXT,

  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  tax_rate DECIMAL(5,2) DEFAULT 7.7,
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),

  -- Payment tracking
  amount_paid DECIMAL(12,2) DEFAULT 0,
  amount_outstanding DECIMAL(12,2),

  -- Line items
  line_items JSONB DEFAULT '[]',

  -- Status
  status invoice_status DEFAULT 'received',

  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Approval
  approved_by UUID REFERENCES users(id),

  -- Variance tracking (vs offer)
  offer_amount DECIMAL(12,2), -- Copied from linked offer
  variance_amount DECIMAL(12,2), -- invoice - offer
  variance_reason TEXT,

  -- Documents
  document_storage_path TEXT NOT NULL, -- PDF of invoice (required)

  -- Notes
  internal_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_partner ON invoices(partner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_offer ON invoices(offer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Updated at trigger
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate totals, outstanding, and variance
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate tax and total
  NEW.tax_amount = NEW.amount * (NEW.tax_rate / 100);
  NEW.total_amount = NEW.amount + NEW.tax_amount;
  NEW.amount_outstanding = NEW.total_amount - COALESCE(NEW.amount_paid, 0);

  -- Get offer amount if linked to offer and not already set
  IF NEW.offer_id IS NOT NULL AND NEW.offer_amount IS NULL THEN
    SELECT total_amount INTO NEW.offer_amount FROM offers WHERE id = NEW.offer_id;
  END IF;

  -- Calculate variance if offer amount is known
  IF NEW.offer_amount IS NOT NULL THEN
    NEW.variance_amount = NEW.total_amount - NEW.offer_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_calculate_totals ON invoices;
CREATE TRIGGER invoices_calculate_totals
  BEFORE INSERT OR UPDATE OF amount, tax_rate, amount_paid, offer_id ON invoices
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

-- Comments for documentation
COMMENT ON TABLE invoices IS 'Invoices (Rechnungen) from partners for completed work';
COMMENT ON COLUMN invoices.invoice_number IS 'External invoice number from the partner';
COMMENT ON COLUMN invoices.amount IS 'Net amount before tax';
COMMENT ON COLUMN invoices.amount_paid IS 'Sum of all completed payments';
COMMENT ON COLUMN invoices.amount_outstanding IS 'Remaining balance (auto-computed)';
COMMENT ON COLUMN invoices.offer_amount IS 'Original offer amount for variance tracking';
COMMENT ON COLUMN invoices.variance_amount IS 'Difference between invoice and offer (auto-computed)';
COMMENT ON COLUMN invoices.document_storage_path IS 'Supabase storage path for invoice PDF (required)';
-- Migration: 019_expense.sql
-- Purpose: Create Expense entity for manual cash/petty cash entries
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-12

-- Expense category enum
DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'material',
    'labor',
    'equipment_rental',
    'travel',
    'permits',
    'disposal',
    'utilities',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Expense payment method enum
DO $$ BEGIN
  CREATE TYPE expense_payment_method AS ENUM (
    'cash',
    'petty_cash',
    'company_card',
    'personal_reimbursement'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships (at least one required)
  renovation_project_id UUID REFERENCES renovation_projects(id),
  work_order_id UUID REFERENCES work_orders(id),
  unit_id UUID REFERENCES units(id),
  room_id UUID REFERENCES rooms(id),

  -- Expense details
  title TEXT NOT NULL,
  description TEXT,
  category expense_category NOT NULL,

  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  tax_included BOOLEAN DEFAULT true,

  -- Payment
  payment_method expense_payment_method NOT NULL,
  paid_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vendor (not necessarily a registered partner)
  vendor_name TEXT,
  partner_id UUID REFERENCES partners(id), -- Optional link to partner

  -- Receipt
  receipt_storage_path TEXT,
  receipt_number TEXT,

  -- Trade category (for reporting)
  trade_category trade_category,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_work_order ON expenses(work_order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_unit ON expenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_at ON expenses(paid_at);

-- Updated at trigger
DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Validation: at least one relationship required
CREATE OR REPLACE FUNCTION validate_expense_relationship()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.renovation_project_id IS NULL
     AND NEW.work_order_id IS NULL
     AND NEW.unit_id IS NULL
     AND NEW.room_id IS NULL THEN
    RAISE EXCEPTION 'Expense must be linked to at least one entity (project, work_order, unit, or room)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_validate_relationship ON expenses;
CREATE TRIGGER expenses_validate_relationship
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION validate_expense_relationship();

-- Comments for documentation
COMMENT ON TABLE expenses IS 'Manual expense entries (cash, petty cash, travel, etc.)';
COMMENT ON COLUMN expenses.category IS 'Expense category for classification and reporting';
COMMENT ON COLUMN expenses.payment_method IS 'How the expense was paid';
COMMENT ON COLUMN expenses.vendor_name IS 'Vendor name if not a registered partner';
COMMENT ON COLUMN expenses.trade_category IS 'Trade category for trade-based cost reporting';
COMMENT ON COLUMN expenses.receipt_storage_path IS 'Supabase storage path for receipt image/PDF';
-- Migration: 020_payment.sql
-- Purpose: Create Payment entity for invoice payments
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-13

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'bank_transfer',
    'cash',
    'check',
    'credit_card',
    'debit_card',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  invoice_id UUID NOT NULL REFERENCES invoices(id),

  -- Payment details
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'completed',

  -- Bank details
  bank_reference TEXT, -- Transaction reference
  bank_account TEXT, -- Paid from account (partial, last 4 digits)

  -- Dates
  payment_date DATE NOT NULL,
  value_date DATE, -- When funds cleared

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Updated at trigger
DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update invoice amount_paid and status when payments change
CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
BEGIN
  -- Get the invoice id (handle INSERT, UPDATE, DELETE)
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate total completed payments for this invoice
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE invoice_id = v_invoice_id
    AND status = 'completed';

  -- Update the invoice amount_paid
  UPDATE invoices
  SET amount_paid = v_total_paid
  WHERE id = v_invoice_id;

  -- Get the updated invoice total and update status
  SELECT total_amount INTO v_total_amount
  FROM invoices WHERE id = v_invoice_id;

  -- Update invoice status based on payment
  UPDATE invoices
  SET
    status = CASE
      WHEN v_total_paid >= v_total_amount THEN 'paid'::invoice_status
      WHEN v_total_paid > 0 THEN 'partially_paid'::invoice_status
      ELSE status
    END,
    paid_at = CASE
      WHEN v_total_paid >= v_total_amount THEN NOW()
      ELSE paid_at
    END
  WHERE id = v_invoice_id
    AND status NOT IN ('cancelled', 'disputed');

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_update_invoice ON payments;
CREATE TRIGGER payments_update_invoice
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_paid_amount();

-- Comments for documentation
COMMENT ON TABLE payments IS 'Payments made against invoices';
COMMENT ON COLUMN payments.bank_reference IS 'Bank transaction reference number';
COMMENT ON COLUMN payments.bank_account IS 'Last 4 digits of account used for payment';
COMMENT ON COLUMN payments.payment_date IS 'Date payment was made';
COMMENT ON COLUMN payments.value_date IS 'Date funds were cleared/received';
-- Migration: 021_cost_views.sql
-- Purpose: Create cost aggregation views for reporting
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-10 to DATA-13 (aggregation support)

-- Cost summary by project
CREATE OR REPLACE VIEW project_costs AS
SELECT
  rp.id as project_id,
  rp.name as project_name,
  rp.unit_id,
  rp.estimated_cost,

  -- Offers
  COALESCE(SUM(CASE WHEN o.status = 'accepted' THEN o.total_amount END), 0) as total_accepted_offers,

  -- Invoices
  COALESCE(SUM(i.total_amount), 0) as total_invoiced,
  COALESCE(SUM(i.amount_paid), 0) as total_paid,
  COALESCE(SUM(i.amount_outstanding), 0) as total_outstanding,

  -- Expenses
  COALESCE(SUM(e.amount), 0) as total_expenses,

  -- Totals
  COALESCE(SUM(i.total_amount), 0) + COALESCE(SUM(e.amount), 0) as total_cost,

  -- Variance
  COALESCE(SUM(i.total_amount), 0) + COALESCE(SUM(e.amount), 0) - COALESCE(rp.estimated_cost, 0) as variance_from_budget

FROM renovation_projects rp
LEFT JOIN offers o ON o.renovation_project_id = rp.id
LEFT JOIN invoices i ON i.renovation_project_id = rp.id
LEFT JOIN expenses e ON e.renovation_project_id = rp.id
GROUP BY rp.id, rp.name, rp.unit_id, rp.estimated_cost;

COMMENT ON VIEW project_costs IS 'Aggregated cost summary per renovation project';

-- Cost summary by unit
CREATE OR REPLACE VIEW unit_costs AS
SELECT
  u.id as unit_id,
  u.name as unit_name,
  u.rent_amount,

  -- From projects
  COALESCE(SUM(pc.total_cost), 0) as total_project_costs,

  -- Direct expenses (not linked to a project)
  COALESCE((
    SELECT SUM(e.amount)
    FROM expenses e
    WHERE e.unit_id = u.id AND e.renovation_project_id IS NULL
  ), 0) as direct_expenses,

  -- Total investment
  COALESCE(SUM(pc.total_cost), 0) + COALESCE((
    SELECT SUM(e.amount)
    FROM expenses e
    WHERE e.unit_id = u.id AND e.renovation_project_id IS NULL
  ), 0) as total_investment,

  -- ROI indicator (years to recover via rent)
  CASE
    WHEN u.rent_amount > 0 THEN
      (COALESCE(SUM(pc.total_cost), 0) + COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.unit_id = u.id AND e.renovation_project_id IS NULL
      ), 0)) / (u.rent_amount * 12)
    ELSE NULL
  END as years_to_recover

FROM units u
LEFT JOIN project_costs pc ON pc.unit_id = u.id
GROUP BY u.id, u.name, u.rent_amount;

COMMENT ON VIEW unit_costs IS 'Aggregated cost and ROI summary per unit';

-- Cost summary by partner
CREATE OR REPLACE VIEW partner_costs AS
SELECT
  p.id as partner_id,
  p.company_name,
  p.partner_type,

  COUNT(DISTINCT o.id) as total_offers,
  COUNT(DISTINCT CASE WHEN o.status = 'accepted' THEN o.id END) as accepted_offers,
  COALESCE(SUM(CASE WHEN o.status = 'accepted' THEN o.total_amount END), 0) as total_offer_value,

  COUNT(DISTINCT i.id) as total_invoices,
  COALESCE(SUM(i.total_amount), 0) as total_invoiced,
  COALESCE(SUM(i.amount_paid), 0) as total_paid,
  COALESCE(SUM(i.amount_outstanding), 0) as outstanding,

  -- Average variance (invoice vs offer)
  AVG(i.variance_amount) as avg_variance

FROM partners p
LEFT JOIN offers o ON o.partner_id = p.id
LEFT JOIN invoices i ON i.partner_id = p.id
GROUP BY p.id, p.company_name, p.partner_type;

COMMENT ON VIEW partner_costs IS 'Aggregated cost and payment history per partner';

-- Cost by trade category (from expenses)
CREATE OR REPLACE VIEW expense_by_trade AS
SELECT
  e.trade_category,
  COUNT(*) as expense_count,
  SUM(e.amount) as total_amount
FROM expenses e
WHERE e.trade_category IS NOT NULL
GROUP BY e.trade_category;

COMMENT ON VIEW expense_by_trade IS 'Expense totals grouped by trade category';

-- Cost by trade category (from partner invoices)
CREATE OR REPLACE VIEW invoice_by_trade AS
SELECT
  tc as trade_category,
  COUNT(DISTINCT i.id) as invoice_count,
  SUM(i.total_amount) as total_invoiced
FROM partners p
CROSS JOIN LATERAL unnest(p.trade_categories) AS tc
JOIN invoices i ON i.partner_id = p.id
GROUP BY tc;

COMMENT ON VIEW invoice_by_trade IS 'Invoice totals grouped by partner trade category';

-- Combined trade costs view
CREATE OR REPLACE VIEW trade_costs AS
SELECT
  COALESCE(e.trade_category::TEXT, it.trade_category::TEXT) as trade_category,
  COALESCE(e.expense_count, 0) as expense_count,
  COALESCE(e.total_amount, 0) as expense_total,
  COALESCE(it.invoice_count, 0) as invoice_count,
  COALESCE(it.total_invoiced, 0) as invoice_total,
  COALESCE(e.total_amount, 0) + COALESCE(it.total_invoiced, 0) as combined_total
FROM expense_by_trade e
FULL OUTER JOIN invoice_by_trade it ON e.trade_category::TEXT = it.trade_category::TEXT;

COMMENT ON VIEW trade_costs IS 'Combined expense and invoice costs by trade category';

-- Monthly cost trend
CREATE OR REPLACE VIEW monthly_costs AS
SELECT
  date_trunc('month', COALESCE(e.paid_at, i.invoice_date::TIMESTAMPTZ)) as month,
  'expense' as cost_type,
  e.category::TEXT as category,
  SUM(e.amount) as amount
FROM expenses e
WHERE e.paid_at IS NOT NULL
GROUP BY 1, 2, 3

UNION ALL

SELECT
  date_trunc('month', i.invoice_date::TIMESTAMPTZ) as month,
  'invoice' as cost_type,
  'invoice' as category,
  SUM(i.total_amount) as amount
FROM invoices i
WHERE i.invoice_date IS NOT NULL
GROUP BY 1, 2, 3

ORDER BY month DESC;

COMMENT ON VIEW monthly_costs IS 'Monthly cost breakdown by type and category';
-- KEWA Renovations Operations System
-- Migration: 022_rbac.sql
-- AUTH-01, AUTH-02: Role-Based Access Control with 5 roles

-- =============================================
-- USER ROLE ENUM
-- =============================================

CREATE TYPE user_role AS ENUM (
  'admin',
  'property_manager',
  'accounting',
  'tenant',
  'external_contractor'
);

-- =============================================
-- AUTH METHOD ENUM
-- =============================================

CREATE TYPE auth_method AS ENUM (
  'pin',
  'email_password',
  'magic_link'
);

-- =============================================
-- ROLES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name user_role UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_internal BOOLEAN DEFAULT false, -- Can access internal dashboard
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 5 roles
INSERT INTO roles (name, display_name, description, is_internal) VALUES
  ('admin', 'Administrator', 'Full system access, manages all settings', true),
  ('property_manager', 'Property Manager', 'Manages properties, projects, and work orders', true),
  ('accounting', 'Accounting', 'Manages costs, invoices, and payments', true),
  ('tenant', 'Tenant', 'Views own unit, creates tickets', false),
  ('external_contractor', 'External Contractor', 'Views and responds to assigned work orders', false)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- PERMISSIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'projects:create'
  name TEXT NOT NULL,
  description TEXT,
  resource TEXT NOT NULL, -- e.g., 'projects'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROLE-PERMISSION JUNCTION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- =============================================
-- SEED PERMISSIONS
-- =============================================

INSERT INTO permissions (code, name, resource, action, description) VALUES
  -- Properties
  ('properties:read', 'View Properties', 'properties', 'read', 'View property details'),
  ('properties:create', 'Create Properties', 'properties', 'create', 'Create new properties'),
  ('properties:update', 'Update Properties', 'properties', 'update', 'Edit property details'),
  ('properties:delete', 'Delete Properties', 'properties', 'delete', 'Delete properties'),

  -- Units
  ('units:read', 'View Units', 'units', 'read', 'View unit details'),
  ('units:create', 'Create Units', 'units', 'create', 'Create new units'),
  ('units:update', 'Update Units', 'units', 'update', 'Edit unit details'),
  ('units:delete', 'Delete Units', 'units', 'delete', 'Delete units'),

  -- Projects
  ('projects:read', 'View Projects', 'projects', 'read', 'View project details'),
  ('projects:create', 'Create Projects', 'projects', 'create', 'Create new projects'),
  ('projects:update', 'Update Projects', 'projects', 'update', 'Edit project details'),
  ('projects:delete', 'Delete Projects', 'projects', 'delete', 'Delete projects'),
  ('projects:archive', 'Archive Projects', 'projects', 'archive', 'Archive/restore projects'),

  -- Tasks
  ('tasks:read', 'View Tasks', 'tasks', 'read', 'View task details'),
  ('tasks:create', 'Create Tasks', 'tasks', 'create', 'Create new tasks'),
  ('tasks:update', 'Update Tasks', 'tasks', 'update', 'Edit task details'),
  ('tasks:delete', 'Delete Tasks', 'tasks', 'delete', 'Delete tasks'),
  ('tasks:complete', 'Complete Tasks', 'tasks', 'complete', 'Mark tasks as complete'),

  -- Work Orders
  ('work_orders:read', 'View Work Orders', 'work_orders', 'read', 'View work order details'),
  ('work_orders:create', 'Create Work Orders', 'work_orders', 'create', 'Create new work orders'),
  ('work_orders:update', 'Update Work Orders', 'work_orders', 'update', 'Edit work order details'),
  ('work_orders:delete', 'Delete Work Orders', 'work_orders', 'delete', 'Delete work orders'),
  ('work_orders:respond', 'Respond to Work Orders', 'work_orders', 'respond', 'Accept/reject work orders'),

  -- Partners
  ('partners:read', 'View Partners', 'partners', 'read', 'View partner details'),
  ('partners:create', 'Create Partners', 'partners', 'create', 'Create new partners'),
  ('partners:update', 'Update Partners', 'partners', 'update', 'Edit partner details'),
  ('partners:delete', 'Delete Partners', 'partners', 'delete', 'Delete partners'),

  -- Costs
  ('costs:read', 'View Costs', 'costs', 'read', 'View cost details'),
  ('costs:create', 'Create Costs', 'costs', 'create', 'Create invoices/expenses'),
  ('costs:update', 'Update Costs', 'costs', 'update', 'Edit cost entries'),
  ('costs:delete', 'Delete Costs', 'costs', 'delete', 'Delete cost entries'),
  ('costs:approve', 'Approve Costs', 'costs', 'approve', 'Approve invoices for payment'),
  ('costs:export', 'Export Costs', 'costs', 'export', 'Export cost data to CSV'),

  -- Reports
  ('reports:read', 'View Reports', 'reports', 'read', 'View reports'),
  ('reports:create', 'Generate Reports', 'reports', 'create', 'Generate new reports'),

  -- Users
  ('users:read', 'View Users', 'users', 'read', 'View user details'),
  ('users:create', 'Create Users', 'users', 'create', 'Create new users'),
  ('users:update', 'Update Users', 'users', 'update', 'Edit user details'),
  ('users:delete', 'Delete Users', 'users', 'delete', 'Delete users'),

  -- Tenants
  ('tenants:read', 'View Tenants', 'tenants', 'read', 'View tenant details'),
  ('tenants:manage', 'Manage Tenants', 'tenants', 'manage', 'Create/edit/delete tenants'),

  -- Tickets
  ('tickets:read', 'View Tickets', 'tickets', 'read', 'View tenant tickets'),
  ('tickets:create', 'Create Tickets', 'tickets', 'create', 'Create new tickets'),
  ('tickets:update', 'Update Tickets', 'tickets', 'update', 'Edit tickets'),
  ('tickets:convert', 'Convert Tickets', 'tickets', 'convert', 'Convert ticket to work order'),

  -- Audit
  ('audit:read', 'View Audit Logs', 'audit', 'read', 'View audit trail'),

  -- Settings
  ('settings:read', 'View Settings', 'settings', 'read', 'View system settings'),
  ('settings:update', 'Update Settings', 'settings', 'update', 'Edit system settings')

ON CONFLICT (code) DO NOTHING;

-- =============================================
-- ASSIGN PERMISSIONS TO ROLES
-- =============================================

-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Property Manager: most except user management and settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'property_manager'
  AND p.code NOT LIKE 'users:%'
  AND p.code NOT LIKE 'settings:%'
  AND p.code != 'audit:read'
ON CONFLICT DO NOTHING;

-- Accounting: costs, reports, read-only on projects/work orders
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'accounting'
  AND (
    p.code LIKE 'costs:%'
    OR p.code LIKE 'reports:%'
    OR p.code IN ('projects:read', 'work_orders:read', 'partners:read', 'units:read', 'properties:read')
  )
ON CONFLICT DO NOTHING;

-- Tenant: own unit, create tickets
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'tenant'
  AND p.code IN ('units:read', 'tickets:create', 'tickets:read')
ON CONFLICT DO NOTHING;

-- External Contractor: own work orders only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'external_contractor'
  AND p.code IN ('work_orders:read', 'work_orders:respond')
ON CONFLICT DO NOTHING;

-- =============================================
-- INDEXES FOR ROLES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_internal ON roles(is_internal);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE roles IS 'System roles for RBAC';
COMMENT ON COLUMN roles.name IS 'Role identifier matching user_role enum';
COMMENT ON COLUMN roles.is_internal IS 'True for roles that can access internal dashboard';
COMMENT ON TABLE permissions IS 'Granular permissions for resource:action pairs';
COMMENT ON COLUMN permissions.code IS 'Permission code in format resource:action';
COMMENT ON TABLE role_permissions IS 'Junction table linking roles to their permissions';
-- KEWA Renovations Operations System
-- Migration: 023_users_auth.sql
-- AUTH-03, AUTH-04: Extend users table for multi-auth support

-- =============================================
-- EXTEND USERS TABLE
-- =============================================

-- Add auth fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id),
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password_hash TEXT, -- For email+password auth
ADD COLUMN IF NOT EXISTS auth_method auth_method DEFAULT 'pin',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================
-- MIGRATE EXISTING USERS TO ROLES
-- =============================================

-- KEWA -> admin role
UPDATE users u
SET role_id = r.id, auth_method = 'pin'
FROM roles r
WHERE u.role = 'kewa' AND r.name = 'admin';

-- Imeri -> property_manager role
UPDATE users u
SET role_id = r.id, auth_method = 'pin'
FROM roles r
WHERE u.role = 'imeri' AND r.name = 'property_manager';

-- =============================================
-- INDEXES FOR AUTH FIELDS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_method ON users(auth_method);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =============================================
-- UPDATED_AT TRIGGER FOR USERS
-- =============================================

-- Reuse the existing update_updated_at_column function from 001_initial_schema.sql
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TENANT-UNIT RELATIONSHIP TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Primary tenant for the unit
  move_in_date DATE,
  move_out_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_unit ON tenant_users(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_active ON tenant_users(unit_id)
  WHERE move_out_date IS NULL;

-- =============================================
-- HELPER FUNCTION: Get user with role and permissions
-- =============================================

CREATE OR REPLACE FUNCTION get_user_with_permissions(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  role_name user_role,
  role_display_name TEXT,
  permissions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    r.name AS role_name,
    r.display_name AS role_display_name,
    ARRAY_AGG(p.code) AS permissions
  FROM users u
  JOIN roles r ON u.role_id = r.id
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  WHERE u.id = p_user_id AND u.is_active = true
  GROUP BY u.id, r.name, r.display_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Check if user has permission
-- =============================================

CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users u
    JOIN role_permissions rp ON u.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id
      AND u.is_active = true
      AND p.code = p_permission_code
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN users.role_id IS 'FK to roles table, replaces legacy role column';
COMMENT ON COLUMN users.email IS 'Email for email+password and magic link auth';
COMMENT ON COLUMN users.email_verified IS 'Whether email has been verified';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash for email+password auth';
COMMENT ON COLUMN users.auth_method IS 'Which auth method this user uses';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
COMMENT ON COLUMN users.login_count IS 'Total number of successful logins';
COMMENT ON COLUMN users.is_active IS 'Whether account is active (can login)';

COMMENT ON TABLE tenant_users IS 'Links tenant users to their units';
COMMENT ON COLUMN tenant_users.is_primary IS 'Primary contact for the unit';
COMMENT ON COLUMN tenant_users.move_in_date IS 'Lease start date';
COMMENT ON COLUMN tenant_users.move_out_date IS 'Lease end date (null if active)';

COMMENT ON FUNCTION get_user_with_permissions IS 'Returns user with role and all permissions';
COMMENT ON FUNCTION user_has_permission IS 'Check if user has specific permission';
-- KEWA Renovations Operations System
-- Migration: 024_magic_links.sql
-- AUTH-09: Magic link tokens for contractor portal access

-- =============================================
-- MAGIC LINK TOKENS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),

  -- Linked entities (at least one required)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,

  -- Token details
  email TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'work_order_access', 'login', 'password_reset', etc.

  -- Validity tracking
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_link_tokens(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_work_order ON magic_link_tokens(work_order_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_user ON magic_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_link_tokens(expires_at)
  WHERE used_at IS NULL AND is_revoked = false;

-- =============================================
-- HELPER FUNCTION: Create magic link token
-- =============================================

CREATE OR REPLACE FUNCTION create_magic_link_token(
  p_email TEXT,
  p_purpose TEXT,
  p_work_order_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 72,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_token UUID;
BEGIN
  -- Generate token and insert
  INSERT INTO magic_link_tokens (
    email,
    purpose,
    work_order_id,
    user_id,
    expires_at,
    created_by
  ) VALUES (
    p_email,
    p_purpose,
    p_work_order_id,
    p_user_id,
    NOW() + (p_expires_hours || ' hours')::INTERVAL,
    p_created_by
  )
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Validate and consume token
-- =============================================

CREATE OR REPLACE FUNCTION validate_magic_link_token(p_token UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  user_id UUID,
  work_order_id UUID,
  email TEXT,
  purpose TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_record magic_link_tokens%ROWTYPE;
BEGIN
  -- Find the token
  SELECT * INTO v_record
  FROM magic_link_tokens t
  WHERE t.token = p_token;

  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Token not found'::TEXT;
    RETURN;
  END IF;

  -- Token already used
  IF v_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Token already used'::TEXT;
    RETURN;
  END IF;

  -- Token revoked
  IF v_record.is_revoked THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Token revoked'::TEXT;
    RETURN;
  END IF;

  -- Token expired
  IF v_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Token expired'::TEXT;
    RETURN;
  END IF;

  -- Mark as used
  UPDATE magic_link_tokens
  SET used_at = NOW()
  WHERE token = p_token;

  -- Return valid result
  RETURN QUERY SELECT
    true,
    v_record.user_id,
    v_record.work_order_id,
    v_record.email,
    v_record.purpose,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Revoke token
-- =============================================

CREATE OR REPLACE FUNCTION revoke_magic_link_token(p_token UUID) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE magic_link_tokens
  SET is_revoked = true
  WHERE token = p_token AND used_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Revoke all tokens for work order
-- =============================================

CREATE OR REPLACE FUNCTION revoke_work_order_tokens(p_work_order_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE magic_link_tokens
  SET is_revoked = true
  WHERE work_order_id = p_work_order_id
    AND used_at IS NULL
    AND is_revoked = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CLEANUP FUNCTION: Remove expired tokens
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_magic_link_tokens() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM magic_link_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE magic_link_tokens IS 'One-time tokens for passwordless authentication';
COMMENT ON COLUMN magic_link_tokens.token IS 'Unique token for URL embedding';
COMMENT ON COLUMN magic_link_tokens.purpose IS 'Token purpose: work_order_access, login, password_reset';
COMMENT ON COLUMN magic_link_tokens.expires_at IS 'Token expiration timestamp (default 72h)';
COMMENT ON COLUMN magic_link_tokens.used_at IS 'When token was consumed (null if unused)';
COMMENT ON COLUMN magic_link_tokens.is_revoked IS 'Manually revoked tokens';

COMMENT ON FUNCTION create_magic_link_token IS 'Create a new magic link token with configurable expiry';
COMMENT ON FUNCTION validate_magic_link_token IS 'Validate and consume a token, returns validity status';
COMMENT ON FUNCTION revoke_magic_link_token IS 'Revoke a single unused token';
COMMENT ON FUNCTION revoke_work_order_tokens IS 'Revoke all tokens for a work order';
COMMENT ON FUNCTION cleanup_expired_magic_link_tokens IS 'Delete tokens expired more than 7 days ago';
-- KEWA Renovations Operations System
-- Migration: 025_work_order_status.sql
-- STAT-01: WorkOrder status transition enforcement

-- =============================================
-- WORK ORDER STATUS TRANSITION VALIDATION
-- =============================================

-- Valid WorkOrder status transitions
CREATE OR REPLACE FUNCTION validate_work_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  -- Skip if status not changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions
  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT));

  -- Check if transition is valid
  IF NOT (NEW.status::TEXT = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next, ', ');
  END IF;

  -- Auto-set timestamps based on status
  CASE NEW.status
    WHEN 'sent' THEN
      NEW.updated_at = NOW();
    WHEN 'viewed' THEN
      NEW.viewed_at = NOW();
    WHEN 'accepted' THEN
      NEW.accepted_at = NOW();
    WHEN 'rejected' THEN
      NEW.rejected_at = NOW();
    WHEN 'in_progress' THEN
      IF NEW.actual_start_date IS NULL THEN
        NEW.actual_start_date = CURRENT_DATE;
      END IF;
    WHEN 'done' THEN
      IF NEW.actual_end_date IS NULL THEN
        NEW.actual_end_date = CURRENT_DATE;
      END IF;
    ELSE
      -- No special handling
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status transitions
DROP TRIGGER IF EXISTS work_orders_status_transition ON work_orders;
CREATE TRIGGER work_orders_status_transition
  BEFORE UPDATE OF status ON work_orders
  FOR EACH ROW EXECUTE FUNCTION validate_work_order_status_transition();

-- =============================================
-- HELPER: Check if transition is valid
-- =============================================

-- Function to check if work order can transition
CREATE OR REPLACE FUNCTION can_transition_work_order(
  p_work_order_id UUID,
  p_new_status work_order_status
) RETURNS BOOLEAN AS $$
DECLARE
  current_status work_order_status;
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
  }'::JSONB;
BEGIN
  SELECT status INTO current_status FROM work_orders WHERE id = p_work_order_id;

  IF current_status IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_new_status::TEXT = ANY(
    ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT))
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER: Get allowed next statuses
-- =============================================

CREATE OR REPLACE FUNCTION get_allowed_work_order_transitions(
  p_work_order_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  current_status work_order_status;
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
  }'::JSONB;
BEGIN
  SELECT status INTO current_status FROM work_orders WHERE id = p_work_order_id;

  IF current_status IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  RETURN ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION validate_work_order_status_transition IS
  'Enforces valid WorkOrder status transitions: draft->sent->viewed->accepted/rejected->in_progress->done->inspected->closed';
COMMENT ON FUNCTION can_transition_work_order IS
  'Check if a work order can transition to a new status';
COMMENT ON FUNCTION get_allowed_work_order_transitions IS
  'Get array of allowed next statuses for a work order';
-- KEWA Renovations Operations System
-- Migration: 026_project_status.sql
-- STAT-02: RenovationProject status transition enforcement

-- =============================================
-- RENOVATION PROJECT STATUS TRANSITION VALIDATION
-- =============================================

-- Valid RenovationProject status transitions
CREATE OR REPLACE FUNCTION validate_project_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "planned": ["active"],
    "active": ["blocked", "finished"],
    "blocked": ["active", "finished"],
    "finished": ["approved", "active"],
    "approved": []
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  -- Skip if status not changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions
  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT));

  -- Check if transition is valid (approved is final)
  IF array_length(allowed_next, 1) = 0 OR array_length(allowed_next, 1) IS NULL THEN
    IF OLD.status::TEXT = 'approved' THEN
      RAISE EXCEPTION 'Cannot change status of approved project';
    END IF;
  END IF;

  IF NOT (NEW.status::TEXT = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid project status transition: % -> %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next, ', ');
  END IF;

  -- Auto-set timestamps based on status
  CASE NEW.status
    WHEN 'active' THEN
      IF NEW.actual_start_date IS NULL THEN
        NEW.actual_start_date = CURRENT_DATE;
      END IF;
    WHEN 'finished' THEN
      IF NEW.actual_end_date IS NULL THEN
        NEW.actual_end_date = CURRENT_DATE;
      END IF;
    WHEN 'approved' THEN
      NEW.approved_at = NOW();
    ELSE
      -- No special handling
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status transitions
DROP TRIGGER IF EXISTS projects_status_transition ON renovation_projects;
CREATE TRIGGER projects_status_transition
  BEFORE UPDATE OF status ON renovation_projects
  FOR EACH ROW EXECUTE FUNCTION validate_project_status_transition();

-- =============================================
-- HELPER: Check if transition is valid
-- =============================================

CREATE OR REPLACE FUNCTION can_transition_project(
  p_project_id UUID,
  p_new_status renovation_status
) RETURNS BOOLEAN AS $$
DECLARE
  current_status renovation_status;
  valid_transitions JSONB := '{
    "planned": ["active"],
    "active": ["blocked", "finished"],
    "blocked": ["active", "finished"],
    "finished": ["approved", "active"],
    "approved": []
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  SELECT status INTO current_status FROM renovation_projects WHERE id = p_project_id;

  IF current_status IS NULL THEN
    RETURN FALSE;
  END IF;

  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT));

  -- Approved is terminal - no transitions allowed
  IF array_length(allowed_next, 1) = 0 OR array_length(allowed_next, 1) IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_new_status::TEXT = ANY(allowed_next);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER: Get allowed next statuses
-- =============================================

CREATE OR REPLACE FUNCTION get_allowed_project_transitions(
  p_project_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  current_status renovation_status;
  valid_transitions JSONB := '{
    "planned": ["active"],
    "active": ["blocked", "finished"],
    "blocked": ["active", "finished"],
    "finished": ["approved", "active"],
    "approved": []
  }'::JSONB;
BEGIN
  SELECT status INTO current_status FROM renovation_projects WHERE id = p_project_id;

  IF current_status IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  RETURN ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION validate_project_status_transition IS
  'Enforces valid RenovationProject status transitions: planned->active->blocked/finished->approved (terminal)';
COMMENT ON FUNCTION can_transition_project IS
  'Check if a renovation project can transition to a new status';
COMMENT ON FUNCTION get_allowed_project_transitions IS
  'Get array of allowed next statuses for a renovation project';
-- KEWA Renovations Operations System
-- Migration: 027_condition_tracking.sql
-- STAT-03: Room/Unit condition enum and tracking
-- STAT-04: Condition updates linked to source project and media

-- =============================================
-- CONDITION HISTORY TABLE
-- =============================================

-- Tracks all condition changes over time
CREATE TABLE IF NOT EXISTS condition_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  entity_type TEXT NOT NULL CHECK (entity_type IN ('room', 'unit', 'component')),
  entity_id UUID NOT NULL,

  -- Condition change
  old_condition room_condition,
  new_condition room_condition NOT NULL,

  -- Source of change
  source_project_id UUID REFERENCES renovation_projects(id),
  source_work_order_id UUID REFERENCES work_orders(id),

  -- Evidence
  media_ids UUID[], -- Links to before/after media

  -- Notes
  notes TEXT,

  -- Metadata
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_condition_history_entity ON condition_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_condition_history_date ON condition_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_condition_history_project ON condition_history(source_project_id);
CREATE INDEX IF NOT EXISTS idx_condition_history_work_order ON condition_history(source_work_order_id);

-- =============================================
-- FUNCTION: Update room condition from project
-- =============================================

-- Called when project is approved to update affected room conditions
CREATE OR REPLACE FUNCTION update_room_condition_from_project(
  p_project_id UUID,
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  v_room RECORD;
  v_old_condition room_condition;
BEGIN
  -- Get all rooms affected by this project's tasks
  FOR v_room IN
    SELECT DISTINCT r.id, r.condition
    FROM rooms r
    JOIN tasks t ON t.room_id = r.id
    WHERE t.renovation_project_id = p_project_id
      AND t.status = 'completed'
  LOOP
    v_old_condition := v_room.condition;

    -- Update room to 'new' condition
    UPDATE rooms
    SET condition = 'new',
        condition_updated_at = NOW(),
        condition_source_project_id = p_project_id
    WHERE id = v_room.id;

    -- Record history
    INSERT INTO condition_history (
      entity_type, entity_id, old_condition, new_condition,
      source_project_id, changed_by
    ) VALUES (
      'room', v_room.id, v_old_condition, 'new',
      p_project_id, p_user_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: Project approved -> update conditions
-- =============================================

CREATE OR REPLACE FUNCTION on_project_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM update_room_condition_from_project(NEW.id, NEW.approved_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_on_approved ON renovation_projects;
CREATE TRIGGER projects_on_approved
  AFTER UPDATE OF status ON renovation_projects
  FOR EACH ROW EXECUTE FUNCTION on_project_approved();

-- =============================================
-- FUNCTION: Manual condition update with history
-- =============================================

CREATE OR REPLACE FUNCTION update_room_condition(
  p_room_id UUID,
  p_new_condition room_condition,
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_work_order_id UUID DEFAULT NULL,
  p_media_ids UUID[] DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_old_condition room_condition;
BEGIN
  -- Get current condition
  SELECT condition INTO v_old_condition FROM rooms WHERE id = p_room_id;

  IF v_old_condition IS NULL THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- Skip if no change
  IF v_old_condition = p_new_condition THEN
    RETURN;
  END IF;

  -- Update room
  UPDATE rooms
  SET condition = p_new_condition,
      condition_updated_at = NOW(),
      condition_source_project_id = COALESCE(p_project_id, condition_source_project_id)
  WHERE id = p_room_id;

  -- Record history
  INSERT INTO condition_history (
    entity_type, entity_id, old_condition, new_condition,
    source_project_id, source_work_order_id, media_ids, notes, changed_by
  ) VALUES (
    'room', p_room_id, v_old_condition, p_new_condition,
    p_project_id, p_work_order_id, p_media_ids, p_notes, p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Update component condition with history
-- =============================================

CREATE OR REPLACE FUNCTION update_component_condition(
  p_component_id UUID,
  p_new_condition room_condition,
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_work_order_id UUID DEFAULT NULL,
  p_media_ids UUID[] DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_old_condition room_condition;
BEGIN
  -- Get current condition
  SELECT condition INTO v_old_condition FROM components WHERE id = p_component_id;

  IF v_old_condition IS NULL THEN
    RAISE EXCEPTION 'Component not found: %', p_component_id;
  END IF;

  -- Skip if no change
  IF v_old_condition = p_new_condition THEN
    RETURN;
  END IF;

  -- Update component
  UPDATE components
  SET condition = p_new_condition,
      condition_updated_at = NOW()
  WHERE id = p_component_id;

  -- Record history
  INSERT INTO condition_history (
    entity_type, entity_id, old_condition, new_condition,
    source_project_id, source_work_order_id, media_ids, notes, changed_by
  ) VALUES (
    'component', p_component_id, v_old_condition, p_new_condition,
    p_project_id, p_work_order_id, p_media_ids, p_notes, p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEW: Unit condition summary (Digital Twin)
-- =============================================

CREATE OR REPLACE VIEW unit_condition_summary AS
SELECT
  u.id as unit_id,
  u.name as unit_name,
  u.building_id,
  COUNT(r.id) as total_rooms,
  COUNT(CASE WHEN r.condition = 'new' THEN 1 END) as new_rooms,
  COUNT(CASE WHEN r.condition = 'partial' THEN 1 END) as partial_rooms,
  COUNT(CASE WHEN r.condition = 'old' THEN 1 END) as old_rooms,
  ROUND(
    COUNT(CASE WHEN r.condition = 'new' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(r.id), 0) * 100, 1
  ) as renovation_percentage,
  CASE
    WHEN COUNT(r.id) = 0 THEN NULL
    WHEN COUNT(CASE WHEN r.condition = 'new' THEN 1 END) = COUNT(r.id) THEN 'new'::room_condition
    WHEN COUNT(CASE WHEN r.condition = 'old' THEN 1 END) = COUNT(r.id) THEN 'old'::room_condition
    ELSE 'partial'::room_condition
  END as overall_condition,
  MAX(r.condition_updated_at) as last_condition_update
FROM units u
LEFT JOIN rooms r ON r.unit_id = u.id
GROUP BY u.id, u.name, u.building_id;

-- =============================================
-- VIEW: Room condition history with details
-- =============================================

CREATE OR REPLACE VIEW room_condition_timeline AS
SELECT
  ch.id,
  ch.entity_id as room_id,
  r.name as room_name,
  r.unit_id,
  u.name as unit_name,
  ch.old_condition,
  ch.new_condition,
  ch.source_project_id,
  rp.name as project_name,
  ch.source_work_order_id,
  wo.title as work_order_title,
  ch.media_ids,
  ch.notes,
  ch.changed_by,
  usr.display_name as changed_by_name,
  ch.changed_at
FROM condition_history ch
JOIN rooms r ON ch.entity_id = r.id AND ch.entity_type = 'room'
JOIN units u ON r.unit_id = u.id
LEFT JOIN renovation_projects rp ON ch.source_project_id = rp.id
LEFT JOIN work_orders wo ON ch.source_work_order_id = wo.id
LEFT JOIN users usr ON ch.changed_by = usr.id
ORDER BY ch.changed_at DESC;

-- =============================================
-- FUNCTION: Get condition history for entity
-- =============================================

CREATE OR REPLACE FUNCTION get_condition_history(
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS TABLE (
  id UUID,
  old_condition room_condition,
  new_condition room_condition,
  source_project_id UUID,
  source_work_order_id UUID,
  media_ids UUID[],
  notes TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.old_condition,
    ch.new_condition,
    ch.source_project_id,
    ch.source_work_order_id,
    ch.media_ids,
    ch.notes,
    ch.changed_by,
    ch.changed_at
  FROM condition_history ch
  WHERE ch.entity_type = p_entity_type
    AND ch.entity_id = p_entity_id
  ORDER BY ch.changed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE condition_history IS 'Tracks all room/unit/component condition changes with source and evidence links';
COMMENT ON COLUMN condition_history.entity_type IS 'Type of entity: room, unit, or component';
COMMENT ON COLUMN condition_history.media_ids IS 'Array of media IDs showing before/after evidence';
COMMENT ON FUNCTION update_room_condition_from_project IS 'Auto-update room conditions when project is approved';
COMMENT ON FUNCTION update_room_condition IS 'Manually update room condition with full history tracking';
COMMENT ON FUNCTION update_component_condition IS 'Manually update component condition with full history tracking';
COMMENT ON VIEW unit_condition_summary IS 'Digital Twin view: unit renovation status calculated from rooms';
COMMENT ON VIEW room_condition_timeline IS 'Timeline of all room condition changes with project/work order context';
-- KEWA Renovations Operations System
-- Migration: 028_audit_triggers.sql
-- NFR-01: Automatic audit logging for all tables

-- =============================================
-- GENERIC AUDIT TRIGGER FUNCTION
-- =============================================

-- Generic audit trigger function for all tables
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_action audit_action;
  v_user_id UUID;
  v_changed_fields TEXT[];
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_values := to_jsonb(NEW);
    v_old_values := NULL;
    -- Try to get user from created_by field
    BEGIN
      v_user_id := (v_new_values->>'created_by')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    -- Try to get user from updated_by or created_by
    BEGIN
      v_user_id := COALESCE(
        (v_new_values->>'updated_by')::UUID,
        (v_new_values->>'created_by')::UUID
      );
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    -- Calculate changed fields
    SELECT array_agg(key) INTO v_changed_fields
    FROM (
      SELECT key
      FROM jsonb_object_keys(v_new_values) AS key
      WHERE v_old_values->key IS DISTINCT FROM v_new_values->key
        AND key NOT IN ('updated_at') -- Exclude auto-updated timestamp
    ) AS changed_keys;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
    v_user_id := NULL;
  END IF;

  -- Insert audit log (skip if only updated_at changed)
  IF TG_OP != 'UPDATE' OR array_length(v_changed_fields, 1) > 0 THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      old_values,
      new_values,
      changed_fields
    ) VALUES (
      TG_TABLE_NAME,
      COALESCE((NEW).id, (OLD).id),
      v_action,
      v_user_id,
      v_old_values,
      v_new_values,
      v_changed_fields
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ADD AUDIT TRIGGERS TO ALL IMPORTANT TABLES
-- =============================================

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'properties',
    'buildings',
    'units',
    'rooms',
    'components',
    'renovation_projects',
    'tasks',
    'work_orders',
    'partners',
    'offers',
    'invoices',
    'expenses',
    'payments',
    'media',
    'users'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Drop existing trigger if exists
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON %I', t, t);

    -- Create new trigger
    EXECUTE format('
      CREATE TRIGGER audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()
    ', t, t);

    RAISE NOTICE 'Created audit trigger for table: %', t;
  END LOOP;
END;
$$;

-- =============================================
-- ADD AUDIT TRIGGERS TO JUNCTION TABLES
-- =============================================

-- Task dependencies
DROP TRIGGER IF EXISTS audit_task_dependencies ON task_dependencies;
CREATE TRIGGER audit_task_dependencies
  AFTER INSERT OR UPDATE OR DELETE ON task_dependencies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Condition history (also track changes to history itself for integrity)
DROP TRIGGER IF EXISTS audit_condition_history ON condition_history;
CREATE TRIGGER audit_condition_history
  AFTER INSERT OR UPDATE OR DELETE ON condition_history
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================
-- HELPER: Audit trigger for status changes only
-- =============================================

-- More lightweight audit for high-frequency status updates
CREATE OR REPLACE FUNCTION audit_status_change_function()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Try to get user
    BEGIN
      v_user_id := COALESCE(
        (to_jsonb(NEW)->>'updated_by')::UUID,
        (to_jsonb(NEW)->>'created_by')::UUID
      );
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      old_values,
      new_values,
      changed_fields
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'update',
      v_user_id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      ARRAY['status']
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION audit_trigger_function IS
  'Generic audit trigger that logs INSERT/UPDATE/DELETE operations to audit_logs table';
COMMENT ON FUNCTION audit_status_change_function IS
  'Lightweight audit trigger for status-only changes (high-frequency updates)';
-- KEWA Renovations Operations System
-- Migration: 029_rls_policies.sql
-- NFR-02: RLS policies for tenant data isolation

-- =============================================
-- ENABLE ROW LEVEL SECURITY ON TENANT-SENSITIVE TABLES
-- =============================================

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE renovation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTION: Check if user is internal
-- =============================================

CREATE OR REPLACE FUNCTION is_internal_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = p_user_id AND r.is_internal = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Check if user is tenant of unit
-- =============================================

CREATE OR REPLACE FUNCTION is_tenant_of_unit(p_user_id UUID, p_unit_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.unit_id = p_unit_id
      AND tu.user_id = p_user_id
      AND (tu.move_out_date IS NULL OR tu.move_out_date > CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Check if user is contractor for work order
-- =============================================

CREATE OR REPLACE FUNCTION is_contractor_for_work_order(p_user_id UUID, p_work_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN partners p ON wo.partner_id = p.id
    JOIN users u ON u.email = p.email
    WHERE wo.id = p_work_order_id
      AND u.id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UNITS POLICIES
-- =============================================

-- Policy: Internal users see all units
DROP POLICY IF EXISTS internal_full_access_units ON units;
CREATE POLICY internal_full_access_units ON units
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see only their units
DROP POLICY IF EXISTS tenant_own_units ON units;
CREATE POLICY tenant_own_units ON units
  FOR SELECT
  TO authenticated
  USING (is_tenant_of_unit(auth.uid(), id));

-- =============================================
-- ROOMS POLICIES
-- =============================================

-- Policy: Internal users see all rooms
DROP POLICY IF EXISTS internal_full_access_rooms ON rooms;
CREATE POLICY internal_full_access_rooms ON rooms
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see rooms in their units
DROP POLICY IF EXISTS tenant_own_rooms ON rooms;
CREATE POLICY tenant_own_rooms ON rooms
  FOR SELECT
  TO authenticated
  USING (is_tenant_of_unit(auth.uid(), unit_id));

-- =============================================
-- TASKS POLICIES
-- =============================================

-- Policy: Internal users see all tasks
DROP POLICY IF EXISTS internal_full_access_tasks ON tasks;
CREATE POLICY internal_full_access_tasks ON tasks
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see tasks in their units (via project)
DROP POLICY IF EXISTS tenant_own_tasks ON tasks;
CREATE POLICY tenant_own_tasks ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN units u ON p.unit_id = u.id
      WHERE p.id = tasks.project_id
        AND is_tenant_of_unit(auth.uid(), u.id)
    )
  );

-- =============================================
-- WORK ORDERS POLICIES
-- =============================================

-- Policy: Internal users see all work orders
DROP POLICY IF EXISTS internal_full_access_work_orders ON work_orders;
CREATE POLICY internal_full_access_work_orders ON work_orders
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Contractors see only their assigned work orders
DROP POLICY IF EXISTS contractor_own_work_orders ON work_orders;
CREATE POLICY contractor_own_work_orders ON work_orders
  FOR SELECT
  TO authenticated
  USING (is_contractor_for_work_order(auth.uid(), id));

-- Policy: Contractors can update their assigned work orders (respond)
DROP POLICY IF EXISTS contractor_update_work_orders ON work_orders;
CREATE POLICY contractor_update_work_orders ON work_orders
  FOR UPDATE
  TO authenticated
  USING (is_contractor_for_work_order(auth.uid(), id))
  WITH CHECK (is_contractor_for_work_order(auth.uid(), id));

-- =============================================
-- RENOVATION PROJECTS POLICIES
-- =============================================

-- Policy: Internal users see all renovation projects
DROP POLICY IF EXISTS internal_full_access_renovation_projects ON renovation_projects;
CREATE POLICY internal_full_access_renovation_projects ON renovation_projects
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see renovation projects in their units
DROP POLICY IF EXISTS tenant_own_renovation_projects ON renovation_projects;
CREATE POLICY tenant_own_renovation_projects ON renovation_projects
  FOR SELECT
  TO authenticated
  USING (is_tenant_of_unit(auth.uid(), unit_id));

-- =============================================
-- MEDIA POLICIES
-- =============================================

-- Policy: Internal users see all media
DROP POLICY IF EXISTS internal_full_access_media ON media;
CREATE POLICY internal_full_access_media ON media
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see media attached to their unit's entities
DROP POLICY IF EXISTS tenant_own_media ON media;
CREATE POLICY tenant_own_media ON media
  FOR SELECT
  TO authenticated
  USING (
    (entity_type = 'room' AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = media.entity_id
        AND is_tenant_of_unit(auth.uid(), r.unit_id)
    ))
    OR
    (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = media.entity_id
        AND is_tenant_of_unit(auth.uid(), p.unit_id)
    ))
  );

-- Policy: Contractors see media attached to their work orders
DROP POLICY IF EXISTS contractor_work_order_media ON media;
CREATE POLICY contractor_work_order_media ON media
  FOR SELECT
  TO authenticated
  USING (
    entity_type = 'work_order'
    AND is_contractor_for_work_order(auth.uid(), entity_id)
  );

-- =============================================
-- CONDITION HISTORY POLICIES
-- =============================================

-- Policy: Internal users see all condition history
DROP POLICY IF EXISTS internal_full_access_condition_history ON condition_history;
CREATE POLICY internal_full_access_condition_history ON condition_history
  FOR ALL
  TO authenticated
  USING (is_internal_user(auth.uid()));

-- Policy: Tenants see condition history for their unit's rooms
DROP POLICY IF EXISTS tenant_own_condition_history ON condition_history;
CREATE POLICY tenant_own_condition_history ON condition_history
  FOR SELECT
  TO authenticated
  USING (
    entity_type = 'room' AND EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = condition_history.entity_id
        AND is_tenant_of_unit(auth.uid(), r.unit_id)
    )
  );

-- =============================================
-- BYPASS POLICY FOR SERVICE ROLE
-- =============================================

-- Note: Supabase service role bypasses RLS by default
-- These policies only affect authenticated users via anon/authenticated keys

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION is_internal_user IS
  'Check if user has an internal role (admin, manager, accounting)';
COMMENT ON FUNCTION is_tenant_of_unit IS
  'Check if user is a current tenant of the specified unit';
COMMENT ON FUNCTION is_contractor_for_work_order IS
  'Check if user is the contractor assigned to the work order';
-- KEWA Renovations Operations System
-- Migration: 030_retention.sql
-- NFR-03: Configurable retention for audit logs and tokens

-- =============================================
-- SYSTEM SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- =============================================
-- SEED DEFAULT RETENTION SETTINGS
-- =============================================

INSERT INTO system_settings (key, value, description) VALUES
  ('audit_log_retention_days', '365', 'Days to keep audit logs (0 = forever)'),
  ('magic_link_expiry_hours', '72', 'Hours until magic link expires'),
  ('magic_link_cleanup_days', '30', 'Days to keep expired magic links before deletion'),
  ('media_retention_days', '0', 'Days to keep media files (0 = forever)'),
  ('session_timeout_hours', '24', 'Hours until session expires'),
  ('condition_history_retention_days', '0', 'Days to keep condition history (0 = forever)')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- HELPER: Get setting value
-- =============================================

CREATE OR REPLACE FUNCTION get_setting(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM system_settings WHERE key = p_key;
  RETURN v_value;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER: Get setting as integer
-- =============================================

CREATE OR REPLACE FUNCTION get_setting_int(p_key TEXT, p_default INTEGER DEFAULT 0)
RETURNS INTEGER AS $$
DECLARE
  v_value INTEGER;
BEGIN
  SELECT (value #>> '{}')::INTEGER INTO v_value
  FROM system_settings WHERE key = p_key;

  RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Update setting
-- =============================================

CREATE OR REPLACE FUNCTION update_setting(
  p_key TEXT,
  p_value JSONB,
  p_user_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO system_settings (key, value, updated_at, updated_by)
  VALUES (p_key, p_value, NOW(), p_user_id)
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW(),
      updated_by = EXCLUDED.updated_by;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Cleanup old audit logs
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  retention_days INTEGER;
  deleted_count INTEGER;
BEGIN
  retention_days := get_setting_int('audit_log_retention_days', 365);

  -- Skip cleanup if retention is 0 (forever)
  IF retention_days <= 0 THEN
    RETURN 0;
  END IF;

  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Cleanup expired magic links
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS INTEGER AS $$
DECLARE
  cleanup_days INTEGER;
  deleted_count INTEGER;
BEGIN
  cleanup_days := get_setting_int('magic_link_cleanup_days', 30);

  -- Always clean up if expired (even if cleanup_days is 0)
  IF cleanup_days <= 0 THEN
    cleanup_days := 30; -- Default to 30 days if not set
  END IF;

  -- Delete tokens that expired more than cleanup_days ago
  DELETE FROM magic_link_tokens
  WHERE expires_at < NOW() - (cleanup_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Cleanup old condition history (optional)
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_old_condition_history()
RETURNS INTEGER AS $$
DECLARE
  retention_days INTEGER;
  deleted_count INTEGER;
BEGIN
  retention_days := get_setting_int('condition_history_retention_days', 0);

  -- Skip cleanup if retention is 0 (forever)
  IF retention_days <= 0 THEN
    RETURN 0;
  END IF;

  DELETE FROM condition_history
  WHERE changed_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Run all cleanup tasks
-- =============================================

CREATE OR REPLACE FUNCTION run_cleanup_tasks()
RETURNS TABLE (
  task TEXT,
  deleted_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'audit_logs'::TEXT, cleanup_old_audit_logs()
  UNION ALL
  SELECT 'magic_link_tokens'::TEXT, cleanup_expired_magic_links()
  UNION ALL
  SELECT 'condition_history'::TEXT, cleanup_old_condition_history();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEW: Current retention settings
-- =============================================

CREATE OR REPLACE VIEW retention_settings AS
SELECT
  key,
  value,
  description,
  updated_at,
  u.display_name as updated_by_name
FROM system_settings s
LEFT JOIN users u ON s.updated_by = u.id
WHERE key LIKE '%retention%' OR key LIKE '%cleanup%' OR key LIKE '%expiry%'
ORDER BY key;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE system_settings IS 'System-wide configuration including retention policies';
COMMENT ON FUNCTION get_setting IS 'Get a setting value as JSONB';
COMMENT ON FUNCTION get_setting_int IS 'Get a setting value as integer with default';
COMMENT ON FUNCTION update_setting IS 'Update or insert a setting value';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Delete audit logs older than retention period';
COMMENT ON FUNCTION cleanup_expired_magic_links IS 'Delete magic link tokens that expired beyond cleanup period';
COMMENT ON FUNCTION cleanup_old_condition_history IS 'Delete condition history older than retention period';
COMMENT ON FUNCTION run_cleanup_tasks IS 'Run all cleanup tasks and return counts';
COMMENT ON VIEW retention_settings IS 'View of all retention-related settings';
-- KEWA Renovations Operations System
-- Migration: 031_storage_buckets.sql
-- NFR-04: File storage for PDFs and photos

-- =============================================
-- STORAGE BUCKET DOCUMENTATION
-- =============================================

/*
Supabase Storage Buckets Configuration
======================================

Note: Buckets are created via Supabase Dashboard or CLI, not SQL.
This file documents the required bucket configuration.

Required Buckets:
-----------------

1. task-photos (exists from v1)
   - Public: false
   - Max file size: 10MB
   - Allowed MIME types: image/webp, image/jpeg, image/png
   - Purpose: Task explanation and completion photos

2. task-audio (exists from v1)
   - Public: false
   - Max file size: 50MB
   - Allowed MIME types: audio/webm, audio/mp4, audio/mpeg
   - Purpose: Voice notes and audio explanations

3. documents (new)
   - Public: false
   - Max file size: 20MB
   - Allowed MIME types: application/pdf, image/*
   - Purpose: Contracts, permits, approvals

4. media (new - unified)
   - Public: false
   - Max file size: 50MB
   - Allowed MIME types: image/*, video/*, audio/*, application/pdf
   - Purpose: All media types for any entity


Storage Path Conventions:
-------------------------

Tasks:
  tasks/{task_id}/photos/{photo_type}/{uuid}.webp
  tasks/{task_id}/audio/{audio_type}/{uuid}.webm

Work Orders:
  work_orders/{work_order_id}/documents/{uuid}.pdf
  work_orders/{work_order_id}/photos/{context}/{uuid}.webp

Offers:
  offers/{offer_id}/{uuid}.pdf

Invoices:
  invoices/{invoice_id}/{uuid}.pdf

Receipts (Expenses):
  receipts/{expense_id}/{uuid}.pdf

Rooms (Digital Twin):
  rooms/{room_id}/media/{context}/{uuid}.{ext}

Units:
  units/{unit_id}/documents/{uuid}.pdf


Storage Policies:
-----------------

1. Internal users can upload/download all files
2. Tenants can only access files in their units
3. Contractors can only access files in their work orders
4. Anonymous users cannot access any files


Implementation Notes:
---------------------

- Use signed URLs for temporary access (expires in 1 hour)
- Compress images before upload (WebP, max 1920px width)
- Store thumbnails for photos (200px width) at path/thumb/{filename}
- Audio files should be transcribed (Whisper API)
*/

-- =============================================
-- STORAGE METADATA TABLE
-- =============================================

-- Track storage usage and provide metadata for files
CREATE TABLE IF NOT EXISTS storage_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File identification
  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,

  -- File info
  file_size INTEGER,
  mime_type TEXT,
  checksum TEXT, -- MD5 or SHA256

  -- Dimensions (for images/videos)
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER, -- For audio/video

  -- Thumbnail
  has_thumbnail BOOLEAN DEFAULT false,
  thumbnail_path TEXT,

  -- Entity link (redundant with media table, but useful for direct lookup)
  entity_type TEXT,
  entity_id UUID,

  -- Upload info
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cleanup tracking
  marked_for_deletion BOOLEAN DEFAULT false,
  deletion_scheduled_at TIMESTAMPTZ,

  -- Unique constraint on bucket + path
  UNIQUE(bucket_name, file_path)
);

CREATE INDEX IF NOT EXISTS idx_storage_metadata_bucket ON storage_metadata(bucket_name);
CREATE INDEX IF NOT EXISTS idx_storage_metadata_entity ON storage_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_storage_metadata_deletion ON storage_metadata(marked_for_deletion) WHERE marked_for_deletion = true;

-- =============================================
-- FUNCTION: Register uploaded file
-- =============================================

CREATE OR REPLACE FUNCTION register_storage_file(
  p_bucket_name TEXT,
  p_file_path TEXT,
  p_file_name TEXT,
  p_file_size INTEGER,
  p_mime_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_uploaded_by UUID DEFAULT NULL,
  p_width INTEGER DEFAULT NULL,
  p_height INTEGER DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_checksum TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO storage_metadata (
    bucket_name, file_path, file_name, file_size, mime_type,
    entity_type, entity_id, uploaded_by,
    width, height, duration_seconds, checksum
  ) VALUES (
    p_bucket_name, p_file_path, p_file_name, p_file_size, p_mime_type,
    p_entity_type, p_entity_id, p_uploaded_by,
    p_width, p_height, p_duration_seconds, p_checksum
  )
  ON CONFLICT (bucket_name, file_path) DO UPDATE
  SET file_size = EXCLUDED.file_size,
      mime_type = EXCLUDED.mime_type,
      uploaded_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Mark file for deletion
-- =============================================

CREATE OR REPLACE FUNCTION mark_file_for_deletion(
  p_bucket_name TEXT,
  p_file_path TEXT,
  p_delay_hours INTEGER DEFAULT 24
) RETURNS void AS $$
BEGIN
  UPDATE storage_metadata
  SET marked_for_deletion = true,
      deletion_scheduled_at = NOW() + (p_delay_hours || ' hours')::INTERVAL
  WHERE bucket_name = p_bucket_name AND file_path = p_file_path;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Get files pending deletion
-- =============================================

CREATE OR REPLACE FUNCTION get_files_pending_deletion()
RETURNS TABLE (
  bucket_name TEXT,
  file_path TEXT,
  deletion_scheduled_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT sm.bucket_name, sm.file_path, sm.deletion_scheduled_at
  FROM storage_metadata sm
  WHERE sm.marked_for_deletion = true
    AND sm.deletion_scheduled_at <= NOW()
  ORDER BY sm.deletion_scheduled_at;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEW: Storage usage by bucket
-- =============================================

CREATE OR REPLACE VIEW storage_usage AS
SELECT
  bucket_name,
  COUNT(*) as file_count,
  SUM(file_size) as total_size_bytes,
  ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_size_mb,
  COUNT(CASE WHEN has_thumbnail THEN 1 END) as files_with_thumbnails,
  MAX(uploaded_at) as last_upload
FROM storage_metadata
WHERE NOT marked_for_deletion
GROUP BY bucket_name;

-- =============================================
-- VIEW: Storage usage by entity type
-- =============================================

CREATE OR REPLACE VIEW storage_usage_by_entity AS
SELECT
  entity_type,
  COUNT(*) as file_count,
  SUM(file_size) as total_size_bytes,
  ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_size_mb,
  COUNT(DISTINCT entity_id) as entity_count
FROM storage_metadata
WHERE entity_type IS NOT NULL AND NOT marked_for_deletion
GROUP BY entity_type;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE storage_metadata IS 'Metadata tracking for Supabase Storage files';
COMMENT ON FUNCTION register_storage_file IS 'Register a new uploaded file with metadata';
COMMENT ON FUNCTION mark_file_for_deletion IS 'Schedule a file for deletion (soft delete)';
COMMENT ON FUNCTION get_files_pending_deletion IS 'Get list of files ready for permanent deletion';
COMMENT ON VIEW storage_usage IS 'Storage usage statistics by bucket';
COMMENT ON VIEW storage_usage_by_entity IS 'Storage usage statistics by entity type';
-- KEWA Renovations Operations System
-- Migration: 032_templates.sql
-- Template System Schema (Phase 08)
-- TMPL-01: Complete renovation templates
-- TMPL-02: Room-specific templates
-- TMPL-03: WBS hierarchy (Phase > Package > Task)

-- =============================================
-- ENUM TYPES
-- =============================================

-- Template categorization
CREATE TYPE template_category AS ENUM (
  'complete_renovation',    -- Komplett-Renovation
  'room_specific',          -- Raum-spezifisch (Bad, Kueche, etc.)
  'trade_specific'          -- Gewerk-spezifisch (Malerarbeiten, etc.)
);

-- Template scope (unit vs room level)
CREATE TYPE template_scope AS ENUM (
  'unit',      -- Applies to entire unit
  'room'       -- Applies to specific room type
);

-- Dependency types (standard project management)
CREATE TYPE dependency_type AS ENUM ('FS', 'SS', 'FF', 'SF');

-- Quality gate levels
CREATE TYPE gate_level AS ENUM ('package', 'phase');

-- =============================================
-- TEMPLATES TABLE (Root)
-- =============================================

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  category template_category NOT NULL,
  scope template_scope NOT NULL,

  -- For room-scoped templates
  target_room_type room_type,

  -- Calculated fields (updated by trigger)
  total_duration_days INTEGER,
  total_estimated_cost DECIMAL(12,2),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_scope ON templates(scope);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_target_room ON templates(target_room_type) WHERE target_room_type IS NOT NULL;

-- Timestamp trigger
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TEMPLATE PHASES TABLE (WBS Level 1)
-- =============================================

CREATE TABLE template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1", "2", "3")
  wbs_code TEXT NOT NULL,

  -- Scheduling (calculated from packages/tasks)
  estimated_duration_days INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_template_phases_template ON template_phases(template_id);
CREATE INDEX idx_template_phases_sort ON template_phases(template_id, sort_order);

-- Timestamp trigger
CREATE TRIGGER template_phases_updated_at
  BEFORE UPDATE ON template_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TEMPLATE PACKAGES TABLE (WBS Level 2)
-- =============================================

CREATE TABLE template_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES template_phases(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1.1", "1.2", "2.1")
  wbs_code TEXT NOT NULL,

  -- Trade association (optional)
  trade_category trade_category,

  -- Scheduling (calculated from tasks)
  estimated_duration_days INTEGER,
  estimated_cost DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(phase_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_template_packages_phase ON template_packages(phase_id);
CREATE INDEX idx_template_packages_sort ON template_packages(phase_id, sort_order);
CREATE INDEX idx_template_packages_trade ON template_packages(trade_category) WHERE trade_category IS NOT NULL;

-- Timestamp trigger
CREATE TRIGGER template_packages_updated_at
  BEFORE UPDATE ON template_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TEMPLATE TASKS TABLE (WBS Level 3)
-- =============================================

CREATE TABLE template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES template_packages(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1.1.1", "1.1.2")
  wbs_code TEXT NOT NULL,

  -- Scheduling
  estimated_duration_days INTEGER NOT NULL DEFAULT 1,
  estimated_cost DECIMAL(10,2),

  -- Trade association
  trade_category trade_category,

  -- Task attributes
  is_optional BOOLEAN DEFAULT false,
  materials_list JSONB DEFAULT '[]'::JSONB,
  notes TEXT,

  -- Checklist template (copied to task on application)
  checklist_template JSONB DEFAULT '[]'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(package_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_template_tasks_package ON template_tasks(package_id);
CREATE INDEX idx_template_tasks_sort ON template_tasks(package_id, sort_order);
CREATE INDEX idx_template_tasks_optional ON template_tasks(is_optional) WHERE is_optional = true;

-- Timestamp trigger
CREATE TRIGGER template_tasks_updated_at
  BEFORE UPDATE ON template_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TEMPLATE DEPENDENCIES TABLE
-- =============================================

CREATE TABLE template_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Dependencies link tasks (across any package/phase)
  predecessor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,

  -- Dependency type
  dependency_type dependency_type NOT NULL DEFAULT 'FS',

  -- Lag time (days)
  lag_days INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate dependencies
  UNIQUE(predecessor_task_id, successor_task_id),

  -- Prevent self-reference
  CHECK(predecessor_task_id != successor_task_id)
);

-- Indexes
CREATE INDEX idx_template_dependencies_template ON template_dependencies(template_id);
CREATE INDEX idx_template_dependencies_predecessor ON template_dependencies(predecessor_task_id);
CREATE INDEX idx_template_dependencies_successor ON template_dependencies(successor_task_id);

-- =============================================
-- TEMPLATE QUALITY GATES TABLE
-- =============================================

CREATE TABLE template_quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Gate location
  gate_level gate_level NOT NULL,
  phase_id UUID REFERENCES template_phases(id) ON DELETE CASCADE,
  package_id UUID REFERENCES template_packages(id) ON DELETE CASCADE,

  -- Gate definition
  name TEXT NOT NULL,
  description TEXT,

  -- Evidence requirements
  checklist_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  min_photos_required INTEGER DEFAULT 0,
  photo_types JSONB DEFAULT '["completion"]'::JSONB,

  -- Behavior
  is_blocking BOOLEAN DEFAULT false,  -- Soft blocking by default
  auto_approve_when_complete BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure gate is linked to exactly one entity
  CHECK(
    (gate_level = 'package' AND package_id IS NOT NULL AND phase_id IS NULL) OR
    (gate_level = 'phase' AND phase_id IS NOT NULL AND package_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_template_quality_gates_template ON template_quality_gates(template_id);
CREATE INDEX idx_template_quality_gates_phase ON template_quality_gates(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_template_quality_gates_package ON template_quality_gates(package_id) WHERE package_id IS NOT NULL;

-- Timestamp trigger
CREATE TRIGGER template_quality_gates_updated_at
  BEFORE UPDATE ON template_quality_gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TABLE COMMENTS
-- =============================================

COMMENT ON TABLE templates IS 'Renovation template library with WBS structure';
COMMENT ON COLUMN templates.category IS 'Template type: complete_renovation, room_specific, or trade_specific';
COMMENT ON COLUMN templates.scope IS 'Whether template applies to unit level or specific room type';
COMMENT ON COLUMN templates.target_room_type IS 'Required when scope = room';
COMMENT ON COLUMN templates.total_duration_days IS 'Calculated from task durations (trigger updated)';
COMMENT ON COLUMN templates.total_estimated_cost IS 'Sum of all task estimated costs (trigger updated)';

COMMENT ON TABLE template_phases IS 'WBS Level 1: Major renovation phases';
COMMENT ON COLUMN template_phases.wbs_code IS 'Hierarchical code (e.g., 1, 2, 3)';
COMMENT ON COLUMN template_phases.estimated_duration_days IS 'Calculated from packages (trigger updated)';

COMMENT ON TABLE template_packages IS 'WBS Level 2: Work packages within phases';
COMMENT ON COLUMN template_packages.wbs_code IS 'Hierarchical code (e.g., 1.1, 1.2)';
COMMENT ON COLUMN template_packages.trade_category IS 'Optional trade association for the package';

COMMENT ON TABLE template_tasks IS 'WBS Level 3: Individual tasks/work items';
COMMENT ON COLUMN template_tasks.wbs_code IS 'Hierarchical code (e.g., 1.1.1, 1.1.2)';
COMMENT ON COLUMN template_tasks.is_optional IS 'Can be toggled off during template application';
COMMENT ON COLUMN template_tasks.materials_list IS 'JSONB array: [{id, name, quantity, unit, estimated_cost}]';
COMMENT ON COLUMN template_tasks.checklist_template IS 'JSONB array: [{id, text, required}]';

COMMENT ON TABLE template_dependencies IS 'Task dependencies within template';
COMMENT ON COLUMN template_dependencies.dependency_type IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';
COMMENT ON COLUMN template_dependencies.lag_days IS 'Delay in days after dependency condition met';

COMMENT ON TABLE template_quality_gates IS 'Checkpoints at package or phase boundaries';
COMMENT ON COLUMN template_quality_gates.checklist_items IS 'JSONB array: [{id, text, required}]';
COMMENT ON COLUMN template_quality_gates.photo_types IS 'JSONB array of required photo types';
COMMENT ON COLUMN template_quality_gates.is_blocking IS 'If true, blocks progression (soft blocking default)';
-- KEWA Renovations Operations System
-- Migration: 033_template_triggers.sql
-- Template duration and cost calculation triggers

-- =============================================
-- PACKAGE DURATION/COST CALCULATION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_package_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_package_id UUID;
BEGIN
  -- Get affected package
  v_package_id := COALESCE(NEW.package_id, OLD.package_id);

  -- Update package estimated duration (max of tasks, not sum - tasks can overlap)
  -- and estimated cost (sum of tasks)
  UPDATE template_packages
  SET
    estimated_duration_days = (
      SELECT COALESCE(MAX(estimated_duration_days), 0)
      FROM template_tasks
      WHERE package_id = v_package_id
    ),
    estimated_cost = (
      SELECT COALESCE(SUM(estimated_cost), 0)
      FROM template_tasks
      WHERE package_id = v_package_id
    )
  WHERE id = v_package_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_package_totals
AFTER INSERT OR UPDATE OR DELETE ON template_tasks
FOR EACH ROW EXECUTE FUNCTION calculate_package_totals();

-- =============================================
-- PHASE DURATION CALCULATION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_phase_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_phase_id UUID;
BEGIN
  -- Get affected phase
  v_phase_id := COALESCE(NEW.phase_id, OLD.phase_id);

  -- Update phase estimated duration (sum of packages - sequential)
  UPDATE template_phases
  SET estimated_duration_days = (
    SELECT COALESCE(SUM(estimated_duration_days), 0)
    FROM template_packages
    WHERE phase_id = v_phase_id
  )
  WHERE id = v_phase_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_phase_totals
AFTER INSERT OR UPDATE OR DELETE ON template_packages
FOR EACH ROW EXECUTE FUNCTION calculate_phase_totals();

-- =============================================
-- TEMPLATE DURATION/COST CALCULATION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_template_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Get affected template
  v_template_id := COALESCE(NEW.template_id, OLD.template_id);

  -- Update template totals
  UPDATE templates
  SET
    total_duration_days = (
      SELECT COALESCE(SUM(estimated_duration_days), 0)
      FROM template_phases
      WHERE template_id = v_template_id
    ),
    total_estimated_cost = (
      SELECT COALESCE(SUM(estimated_cost), 0)
      FROM template_packages tp
      JOIN template_phases tph ON tph.id = tp.phase_id
      WHERE tph.template_id = v_template_id
    )
  WHERE id = v_template_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_template_totals
AFTER INSERT OR UPDATE OR DELETE ON template_phases
FOR EACH ROW EXECUTE FUNCTION calculate_template_totals();

-- Also trigger on package changes for cost updates
CREATE TRIGGER trigger_calculate_template_totals_on_package
AFTER INSERT OR UPDATE OR DELETE ON template_packages
FOR EACH ROW
EXECUTE FUNCTION calculate_template_totals();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION calculate_package_totals() IS 'Updates package duration (max of tasks) and cost (sum of tasks)';
COMMENT ON FUNCTION calculate_phase_totals() IS 'Updates phase duration (sum of packages)';
COMMENT ON FUNCTION calculate_template_totals() IS 'Updates template totals from phases';
-- KEWA Renovations Operations System
-- Migration: 034_seed_templates.sql
-- Seed data: 3 starter templates (Komplett, Bad, Kueche)
-- Fulfills TMPL-01 (Complete renovation templates) and TMPL-02 (Room-specific templates)

-- Note: This migration requires 032_templates.sql and 033_template_triggers.sql
-- to be applied first. Those migrations create the template tables.

-- =============================================
-- TEMPLATE 1: KOMPLETT-RENOVATION
-- =============================================

INSERT INTO templates (id, name, description, category, scope, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000001',
  'Komplett-Renovation (Standard)',
  'Vollstaendige Wohnungsrenovation mit allen Gewerken: Demontage, Rohbau, Installationen, Ausbau',
  'complete_renovation',
  'unit',
  true
);

-- Phase 1: Vorbereitung & Demontage
INSERT INTO template_phases (id, template_id, name, description, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000001',
  '00000000-0000-0000-0008-000000000001',
  'Vorbereitung & Demontage',
  'Baustelleneinrichtung und Rueckbauarbeiten',
  '1',
  0
);

-- Package 1.1: Baustelleneinrichtung
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-110000000001',
  '00000000-0000-0000-0008-100000000001',
  'Baustelleneinrichtung',
  '1.1',
  0,
  'general'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-111000000001', '00000000-0000-0000-0008-110000000001', 'Schutzfolien und Abdeckungen anbringen', '1.1.1', 0, 1, 'general'),
  ('00000000-0000-0000-0008-111000000002', '00000000-0000-0000-0008-110000000001', 'Container bestellen und aufstellen', '1.1.2', 1, 1, 'general'),
  ('00000000-0000-0000-0008-111000000003', '00000000-0000-0000-0008-110000000001', 'Baustrom und Bauwasser einrichten', '1.1.3', 2, 1, 'electrical');

-- Package 1.2: Demontage
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-110000000002',
  '00000000-0000-0000-0008-100000000001',
  'Demontage',
  '1.2',
  1,
  'demolition'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-112000000001', '00000000-0000-0000-0008-110000000002', 'Sanitaerobjekte demontieren', '1.2.1', 0, 1, 'plumbing'),
  ('00000000-0000-0000-0008-112000000002', '00000000-0000-0000-0008-110000000002', 'Kuechengeraete und -moebel entfernen', '1.2.2', 1, 1, 'general'),
  ('00000000-0000-0000-0008-112000000003', '00000000-0000-0000-0008-110000000002', 'Alte Bodenbelaege entfernen', '1.2.3', 2, 2, 'demolition'),
  ('00000000-0000-0000-0008-112000000004', '00000000-0000-0000-0008-110000000002', 'Wandbelaege entfernen (Fliesen, Tapeten)', '1.2.4', 3, 2, 'demolition');

-- Phase 2: Rohbauarbeiten
INSERT INTO template_phases (id, template_id, name, description, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000002',
  '00000000-0000-0000-0008-000000000001',
  'Rohbauarbeiten',
  'Vorbereitende Bauarbeiten und Untergrund',
  '2',
  1
);

-- Package 2.1: Untergrund
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-120000000001',
  '00000000-0000-0000-0008-100000000002',
  'Untergrundvorbereitung',
  '2.1',
  0,
  'masonry'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-121000000001', '00000000-0000-0000-0008-120000000001', 'Untergrund pruefen und ausbessern', '2.1.1', 0, 1, 'masonry'),
  ('00000000-0000-0000-0008-121000000002', '00000000-0000-0000-0008-120000000001', 'Ausgleichsmasse auftragen', '2.1.2', 1, 1, 'flooring');

-- Phase 3: Installationen
INSERT INTO template_phases (id, template_id, name, description, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000003',
  '00000000-0000-0000-0008-000000000001',
  'Installationen',
  'Elektro, Sanitaer, Heizung',
  '3',
  2
);

-- Package 3.1: Elektroinstallation
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-130000000001',
  '00000000-0000-0000-0008-100000000003',
  'Elektroinstallation',
  '3.1',
  0,
  'electrical'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-131000000001', '00000000-0000-0000-0008-130000000001', 'Leitungen verlegen', '3.1.1', 0, 2, 'electrical'),
  ('00000000-0000-0000-0008-131000000002', '00000000-0000-0000-0008-130000000001', 'Dosen setzen', '3.1.2', 1, 1, 'electrical'),
  ('00000000-0000-0000-0008-131000000003', '00000000-0000-0000-0008-130000000001', 'Schalter und Steckdosen montieren', '3.1.3', 2, 1, 'electrical');

-- Package 3.2: Sanitaerinstallation
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-130000000002',
  '00000000-0000-0000-0008-100000000003',
  'Sanitaerinstallation',
  '3.2',
  1,
  'plumbing'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-132000000001', '00000000-0000-0000-0008-130000000002', 'Wasserleitungen verlegen', '3.2.1', 0, 2, 'plumbing'),
  ('00000000-0000-0000-0008-132000000002', '00000000-0000-0000-0008-130000000002', 'Abwasserleitungen verlegen', '3.2.2', 1, 1, 'plumbing');

-- Phase 4: Ausbau & Finish
INSERT INTO template_phases (id, template_id, name, description, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000004',
  '00000000-0000-0000-0008-000000000001',
  'Ausbau & Finish',
  'Oberflaechen, Montage, Reinigung',
  '4',
  3
);

-- Package 4.1: Oberflaechenarbeiten
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-140000000001',
  '00000000-0000-0000-0008-100000000004',
  'Oberflaechenarbeiten',
  '4.1',
  0,
  'painting'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-141000000001', '00000000-0000-0000-0008-140000000001', 'Waende spachteln und schleifen', '4.1.1', 0, 2, 'painting'),
  ('00000000-0000-0000-0008-141000000002', '00000000-0000-0000-0008-140000000001', 'Grundierung auftragen', '4.1.2', 1, 1, 'painting'),
  ('00000000-0000-0000-0008-141000000003', '00000000-0000-0000-0008-140000000001', 'Decken und Waende streichen', '4.1.3', 2, 3, 'painting');

-- Package 4.2: Bodenarbeiten
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-140000000002',
  '00000000-0000-0000-0008-100000000004',
  'Bodenarbeiten',
  '4.2',
  1,
  'flooring'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-142000000001', '00000000-0000-0000-0008-140000000002', 'Bodenbelag verlegen', '4.2.1', 0, 3, 'flooring'),
  ('00000000-0000-0000-0008-142000000002', '00000000-0000-0000-0008-140000000002', 'Sockelleisten montieren', '4.2.2', 1, 1, 'flooring');

-- Package 4.3: Endmontage
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-140000000003',
  '00000000-0000-0000-0008-100000000004',
  'Endmontage',
  '4.3',
  2,
  'general'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-143000000001', '00000000-0000-0000-0008-140000000003', 'Sanitaerobjekte montieren', '4.3.1', 0, 2, 'plumbing'),
  ('00000000-0000-0000-0008-143000000002', '00000000-0000-0000-0008-140000000003', 'Kueche montieren', '4.3.2', 1, 2, 'carpentry'),
  ('00000000-0000-0000-0008-143000000003', '00000000-0000-0000-0008-140000000003', 'Lampen und Armaturen montieren', '4.3.3', 2, 1, 'electrical'),
  ('00000000-0000-0000-0008-143000000004', '00000000-0000-0000-0008-140000000003', 'Endreinigung', '4.3.4', 3, 1, 'cleaning');

-- Quality Gates for Komplett-Renovation
INSERT INTO template_quality_gates (id, template_id, gate_level, phase_id, name, min_photos_required)
VALUES
  ('00000000-0000-0000-0008-900000000001', '00000000-0000-0000-0008-000000000001', 'phase', '00000000-0000-0000-0008-100000000001', 'Demontage abgeschlossen', 2),
  ('00000000-0000-0000-0008-900000000002', '00000000-0000-0000-0008-000000000001', 'phase', '00000000-0000-0000-0008-100000000003', 'Installationen geprueft', 3),
  ('00000000-0000-0000-0008-900000000003', '00000000-0000-0000-0008-000000000001', 'phase', '00000000-0000-0000-0008-100000000004', 'Endabnahme', 5);

-- =============================================
-- TEMPLATE 2: BADEZIMMER-RENOVATION
-- =============================================

INSERT INTO templates (id, name, description, category, scope, target_room_type, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000002',
  'Badezimmer-Renovation',
  'Komplette Badezimmer-Erneuerung inkl. Sanitaer, Fliesen, Elektro',
  'room_specific',
  'room',
  'bathroom',
  true
);

-- Phase 1: Demontage
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-200000000001',
  '00000000-0000-0000-0008-000000000002',
  'Demontage',
  '1',
  0
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-210000000001',
  '00000000-0000-0000-0008-200000000001',
  'Rueckbau Bad',
  '1.1',
  0,
  'demolition'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-211000000001', '00000000-0000-0000-0008-210000000001', 'Sanitaerobjekte demontieren (WC, Lavabo, Dusche/Wanne)', '1.1.1', 0, 1, 'plumbing'),
  ('00000000-0000-0000-0008-211000000002', '00000000-0000-0000-0008-210000000001', 'Alte Fliesen entfernen', '1.1.2', 1, 2, 'demolition'),
  ('00000000-0000-0000-0008-211000000003', '00000000-0000-0000-0008-210000000001', 'Alten Bodenbelag entfernen', '1.1.3', 2, 1, 'demolition');

-- Phase 2: Installationen
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-200000000002',
  '00000000-0000-0000-0008-000000000002',
  'Installationen',
  '2',
  1
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-220000000001',
  '00000000-0000-0000-0008-200000000002',
  'Sanitaer',
  '2.1',
  0,
  'plumbing'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-221000000001', '00000000-0000-0000-0008-220000000001', 'Wasserleitungen verlegen', '2.1.1', 0, 1, 'plumbing'),
  ('00000000-0000-0000-0008-221000000002', '00000000-0000-0000-0008-220000000001', 'Abwasserleitungen verlegen', '2.1.2', 1, 1, 'plumbing');

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-220000000002',
  '00000000-0000-0000-0008-200000000002',
  'Elektro',
  '2.2',
  1,
  'electrical'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-222000000001', '00000000-0000-0000-0008-220000000002', 'Elektroleitungen verlegen', '2.2.1', 0, 1, 'electrical');

-- Phase 3: Oberflaechen
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-200000000003',
  '00000000-0000-0000-0008-000000000002',
  'Oberflaechen',
  '3',
  2
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-230000000001',
  '00000000-0000-0000-0008-200000000003',
  'Fliesen',
  '3.1',
  0,
  'flooring'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-231000000001', '00000000-0000-0000-0008-230000000001', 'Abdichtung auftragen', '3.1.1', 0, 1, 'flooring'),
  ('00000000-0000-0000-0008-231000000002', '00000000-0000-0000-0008-230000000001', 'Bodenfliesen verlegen', '3.1.2', 1, 2, 'flooring'),
  ('00000000-0000-0000-0008-231000000003', '00000000-0000-0000-0008-230000000001', 'Wandfliesen verlegen', '3.1.3', 2, 2, 'flooring'),
  ('00000000-0000-0000-0008-231000000004', '00000000-0000-0000-0008-230000000001', 'Fugen verfuellen', '3.1.4', 3, 1, 'flooring');

-- Phase 4: Montage
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-200000000004',
  '00000000-0000-0000-0008-000000000002',
  'Montage',
  '4',
  3
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-240000000001',
  '00000000-0000-0000-0008-200000000004',
  'Endmontage',
  '4.1',
  0,
  'plumbing'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-241000000001', '00000000-0000-0000-0008-240000000001', 'WC montieren', '4.1.1', 0, 1, 'plumbing'),
  ('00000000-0000-0000-0008-241000000002', '00000000-0000-0000-0008-240000000001', 'Lavabo montieren', '4.1.2', 1, 1, 'plumbing'),
  ('00000000-0000-0000-0008-241000000003', '00000000-0000-0000-0008-240000000001', 'Dusche/Wanne montieren', '4.1.3', 2, 1, 'plumbing'),
  ('00000000-0000-0000-0008-241000000004', '00000000-0000-0000-0008-240000000001', 'Spiegel und Accessoires montieren', '4.1.4', 3, 1, 'general'),
  ('00000000-0000-0000-0008-241000000005', '00000000-0000-0000-0008-240000000001', 'Endreinigung', '4.1.5', 4, 1, 'cleaning');

-- Quality Gate for Bad
INSERT INTO template_quality_gates (id, template_id, gate_level, phase_id, name, min_photos_required, checklist_items)
VALUES (
  '00000000-0000-0000-0008-900000000010',
  '00000000-0000-0000-0008-000000000002',
  'phase',
  '00000000-0000-0000-0008-200000000004',
  'Badezimmer Endabnahme',
  4,
  '[{"id": "chk1", "text": "Alle Sanitaerobjekte funktionsfaehig", "required": true}, {"id": "chk2", "text": "Keine Leckagen", "required": true}, {"id": "chk3", "text": "Fliesen ohne Maengel", "required": true}]'::JSONB
);

-- =============================================
-- TEMPLATE 3: KUECHEN-RENOVATION
-- =============================================

INSERT INTO templates (id, name, description, category, scope, target_room_type, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000003',
  'Kuechen-Renovation',
  'Komplette Kuechen-Erneuerung inkl. Elektro, Sanitaer, Moebel',
  'room_specific',
  'room',
  'kitchen',
  true
);

-- Phase 1: Demontage
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-300000000001',
  '00000000-0000-0000-0008-000000000003',
  'Demontage',
  '1',
  0
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-310000000001',
  '00000000-0000-0000-0008-300000000001',
  'Rueckbau Kueche',
  '1.1',
  0,
  'demolition'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-311000000001', '00000000-0000-0000-0008-310000000001', 'Elektrogeraete abklemmen und entfernen', '1.1.1', 0, 1, 'electrical'),
  ('00000000-0000-0000-0008-311000000002', '00000000-0000-0000-0008-310000000001', 'Kuechenmoebel demontieren', '1.1.2', 1, 1, 'carpentry'),
  ('00000000-0000-0000-0008-311000000003', '00000000-0000-0000-0008-310000000001', 'Alte Arbeitsplatte entfernen', '1.1.3', 2, 1, 'demolition');

-- Phase 2: Vorbereitung
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-300000000002',
  '00000000-0000-0000-0008-000000000003',
  'Vorbereitung',
  '2',
  1
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-320000000001',
  '00000000-0000-0000-0008-300000000002',
  'Installationen',
  '2.1',
  0,
  'electrical'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-321000000001', '00000000-0000-0000-0008-320000000001', 'Elektroinstallation anpassen', '2.1.1', 0, 1, 'electrical'),
  ('00000000-0000-0000-0008-321000000002', '00000000-0000-0000-0008-320000000001', 'Wasseranschluesse anpassen', '2.1.2', 1, 1, 'plumbing');

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-320000000002',
  '00000000-0000-0000-0008-300000000002',
  'Oberflaechen',
  '2.2',
  1,
  'painting'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-322000000001', '00000000-0000-0000-0008-320000000002', 'Waende ausbessern und streichen', '2.2.1', 0, 2, 'painting'),
  ('00000000-0000-0000-0008-322000000002', '00000000-0000-0000-0008-320000000002', 'Boden vorbereiten', '2.2.2', 1, 1, 'flooring');

-- Phase 3: Montage
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-300000000003',
  '00000000-0000-0000-0008-000000000003',
  'Montage',
  '3',
  2
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-330000000001',
  '00000000-0000-0000-0008-300000000003',
  'Kuechenmontage',
  '3.1',
  0,
  'carpentry'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-331000000001', '00000000-0000-0000-0008-330000000001', 'Unterschraenke montieren', '3.1.1', 0, 1, 'carpentry'),
  ('00000000-0000-0000-0008-331000000002', '00000000-0000-0000-0008-330000000001', 'Oberschraenke montieren', '3.1.2', 1, 1, 'carpentry'),
  ('00000000-0000-0000-0008-331000000003', '00000000-0000-0000-0008-330000000001', 'Arbeitsplatte montieren', '3.1.3', 2, 1, 'carpentry'),
  ('00000000-0000-0000-0008-331000000004', '00000000-0000-0000-0008-330000000001', 'Spuele und Armatur montieren', '3.1.4', 3, 1, 'plumbing'),
  ('00000000-0000-0000-0008-331000000005', '00000000-0000-0000-0008-330000000001', 'Elektrogeraete einbauen und anschliessen', '3.1.5', 4, 1, 'electrical'),
  ('00000000-0000-0000-0008-331000000006', '00000000-0000-0000-0008-330000000001', 'Fronten und Griffe montieren', '3.1.6', 5, 1, 'carpentry'),
  ('00000000-0000-0000-0008-331000000007', '00000000-0000-0000-0008-330000000001', 'Endreinigung', '3.1.7', 6, 1, 'cleaning');

-- Quality Gate for Kueche
INSERT INTO template_quality_gates (id, template_id, gate_level, phase_id, name, min_photos_required, checklist_items)
VALUES (
  '00000000-0000-0000-0008-900000000020',
  '00000000-0000-0000-0008-000000000003',
  'phase',
  '00000000-0000-0000-0008-300000000003',
  'Kueche Endabnahme',
  4,
  '[{"id": "chk1", "text": "Alle Geraete funktionsfaehig", "required": true}, {"id": "chk2", "text": "Wasser- und Stromanschluss geprueft", "required": true}, {"id": "chk3", "text": "Fronten und Schubladen schliessen korrekt", "required": true}]'::JSONB
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE templates IS 'Seeded with 3 starter templates: Komplett-Renovation, Bad, Kueche';
-- KEWA Renovations Operations System
-- Migration: 035_project_from_template.sql
-- Runtime project hierarchy and template application

-- =============================================
-- PROJECT PHASES (runtime WBS Level 1)
-- =============================================

CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES renovation_projects(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  wbs_code TEXT NOT NULL,

  -- Scheduling
  estimated_duration_days INTEGER,
  actual_duration_days INTEGER,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),

  -- Template reference
  source_template_phase_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_phases_status ON project_phases(status);

-- Timestamp trigger
CREATE TRIGGER project_phases_updated_at
  BEFORE UPDATE ON project_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- PROJECT PACKAGES (runtime WBS Level 2)
-- =============================================

CREATE TABLE project_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  wbs_code TEXT NOT NULL,

  -- Trade association
  trade_category trade_category,

  -- Scheduling & Cost
  estimated_duration_days INTEGER,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),

  -- Template reference
  source_template_package_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(phase_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_project_packages_phase ON project_packages(phase_id);
CREATE INDEX idx_project_packages_status ON project_packages(status);

-- Timestamp trigger
CREATE TRIGGER project_packages_updated_at
  BEFORE UPDATE ON project_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- PROJECT TASKS EXTENSION (link to package)
-- =============================================

-- Add package link and WBS fields to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES project_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS wbs_code TEXT,
ADD COLUMN IF NOT EXISTS is_from_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source_template_task_id UUID;

-- Index for package lookup
CREATE INDEX IF NOT EXISTS idx_tasks_package_id ON tasks(package_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wbs_code ON tasks(wbs_code) WHERE wbs_code IS NOT NULL;

-- =============================================
-- PROJECT QUALITY GATES (runtime gates)
-- =============================================

CREATE TABLE project_quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES renovation_projects(id) ON DELETE CASCADE,

  -- Gate location
  gate_level gate_level NOT NULL,
  phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
  package_id UUID REFERENCES project_packages(id) ON DELETE CASCADE,

  -- Gate definition
  name TEXT NOT NULL,
  description TEXT,

  -- Evidence requirements
  checklist_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  checklist_progress JSONB DEFAULT '[]'::JSONB,  -- Runtime progress
  min_photos_required INTEGER DEFAULT 0,
  photo_types JSONB DEFAULT '["completion"]'::JSONB,

  -- Behavior
  is_blocking BOOLEAN DEFAULT false,
  auto_approve_when_complete BOOLEAN DEFAULT true,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),

  -- Template reference
  source_template_gate_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure gate is linked to exactly one entity
  CHECK(
    (gate_level = 'package' AND package_id IS NOT NULL AND phase_id IS NULL) OR
    (gate_level = 'phase' AND phase_id IS NOT NULL AND package_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_project_quality_gates_project ON project_quality_gates(project_id);
CREATE INDEX idx_project_quality_gates_status ON project_quality_gates(status);

-- Timestamp trigger
CREATE TRIGGER project_quality_gates_updated_at
  BEFORE UPDATE ON project_quality_gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE project_phases IS 'Runtime WBS Level 1: Major phases within a project';
COMMENT ON TABLE project_packages IS 'Runtime WBS Level 2: Work packages within phases';
COMMENT ON TABLE project_quality_gates IS 'Runtime quality gates for project milestones';
COMMENT ON COLUMN tasks.package_id IS 'Link to project package for WBS hierarchy';
COMMENT ON COLUMN tasks.wbs_code IS 'WBS code within project (e.g., 1.1.1)';
COMMENT ON COLUMN tasks.is_from_template IS 'True if task was created from template application';

-- =============================================
-- TEMPLATE APPLICATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION apply_template_to_project(
  p_template_id UUID,
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_excluded_tasks UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE(
  phases_created INTEGER,
  packages_created INTEGER,
  tasks_created INTEGER,
  dependencies_created INTEGER,
  gates_created INTEGER
) AS $$
DECLARE
  v_id_mapping JSONB := '{}'::JSONB;
  v_phase RECORD;
  v_package RECORD;
  v_task RECORD;
  v_dep RECORD;
  v_gate RECORD;
  v_new_phase_id UUID;
  v_new_package_id UUID;
  v_new_task_id UUID;
  v_phases_created INTEGER := 0;
  v_packages_created INTEGER := 0;
  v_tasks_created INTEGER := 0;
  v_deps_created INTEGER := 0;
  v_gates_created INTEGER := 0;
  v_start DATE;
BEGIN
  -- Get start date (default to planned_start_date or today)
  SELECT COALESCE(p_start_date, planned_start_date, CURRENT_DATE)
  INTO v_start
  FROM renovation_projects
  WHERE id = p_project_id;

  -- =============================================
  -- CREATE PHASES
  -- =============================================
  FOR v_phase IN
    SELECT * FROM template_phases
    WHERE template_id = p_template_id
    ORDER BY sort_order
  LOOP
    v_new_phase_id := gen_random_uuid();

    INSERT INTO project_phases (
      id, project_id, name, description, wbs_code, sort_order,
      estimated_duration_days, status, source_template_phase_id
    ) VALUES (
      v_new_phase_id, p_project_id, v_phase.name, v_phase.description,
      v_phase.wbs_code, v_phase.sort_order, v_phase.estimated_duration_days,
      'pending', v_phase.id
    );

    -- Store mapping: template_phase_id -> project_phase_id
    v_id_mapping := v_id_mapping ||
      jsonb_build_object(v_phase.id::TEXT, v_new_phase_id::TEXT);

    v_phases_created := v_phases_created + 1;

    -- =============================================
    -- CREATE PACKAGES FOR THIS PHASE
    -- =============================================
    FOR v_package IN
      SELECT * FROM template_packages
      WHERE phase_id = v_phase.id
      ORDER BY sort_order
    LOOP
      v_new_package_id := gen_random_uuid();

      INSERT INTO project_packages (
        id, phase_id, name, description, wbs_code, sort_order,
        trade_category, estimated_duration_days, estimated_cost,
        status, source_template_package_id
      ) VALUES (
        v_new_package_id, v_new_phase_id, v_package.name, v_package.description,
        v_package.wbs_code, v_package.sort_order, v_package.trade_category,
        v_package.estimated_duration_days, v_package.estimated_cost,
        'pending', v_package.id
      );

      -- Store mapping
      v_id_mapping := v_id_mapping ||
        jsonb_build_object(v_package.id::TEXT, v_new_package_id::TEXT);

      v_packages_created := v_packages_created + 1;

      -- =============================================
      -- CREATE TASKS FOR THIS PACKAGE
      -- =============================================
      FOR v_task IN
        SELECT * FROM template_tasks
        WHERE package_id = v_package.id
          AND id != ALL(p_excluded_tasks)  -- Skip excluded optional tasks
        ORDER BY sort_order
      LOOP
        v_new_task_id := gen_random_uuid();

        INSERT INTO tasks (
          id, renovation_project_id, title, description,
          estimated_hours, checklist_items, status, priority,
          package_id, wbs_code, is_from_template, source_template_task_id
        ) VALUES (
          v_new_task_id, p_project_id, v_task.name, v_task.description,
          v_task.estimated_duration_days * 8,  -- Convert days to hours
          v_task.checklist_template,
          'open', 'normal',
          v_new_package_id, v_task.wbs_code, true, v_task.id
        );

        -- Store mapping
        v_id_mapping := v_id_mapping ||
          jsonb_build_object(v_task.id::TEXT, v_new_task_id::TEXT);

        v_tasks_created := v_tasks_created + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  -- =============================================
  -- CREATE DEPENDENCIES WITH REMAPPED IDs
  -- =============================================
  FOR v_dep IN
    SELECT * FROM template_dependencies
    WHERE template_id = p_template_id
      AND predecessor_task_id != ALL(p_excluded_tasks)
      AND successor_task_id != ALL(p_excluded_tasks)
  LOOP
    -- Only create if both tasks were created (not excluded)
    IF v_id_mapping ? v_dep.predecessor_task_id::TEXT
       AND v_id_mapping ? v_dep.successor_task_id::TEXT
    THEN
      INSERT INTO task_dependencies (
        task_id,
        depends_on_task_id,
        dependency_type,
        lag_days
      ) VALUES (
        (v_id_mapping ->> v_dep.successor_task_id::TEXT)::UUID,
        (v_id_mapping ->> v_dep.predecessor_task_id::TEXT)::UUID,
        v_dep.dependency_type,
        v_dep.lag_days
      );

      v_deps_created := v_deps_created + 1;
    END IF;
  END LOOP;

  -- =============================================
  -- CREATE QUALITY GATES WITH REMAPPED IDs
  -- =============================================
  FOR v_gate IN
    SELECT * FROM template_quality_gates
    WHERE template_id = p_template_id
  LOOP
    INSERT INTO project_quality_gates (
      id, project_id, gate_level,
      phase_id, package_id,
      name, description, checklist_items,
      min_photos_required, photo_types,
      is_blocking, auto_approve_when_complete,
      source_template_gate_id
    ) VALUES (
      gen_random_uuid(), p_project_id, v_gate.gate_level,
      CASE WHEN v_gate.phase_id IS NOT NULL
           THEN (v_id_mapping ->> v_gate.phase_id::TEXT)::UUID
           ELSE NULL END,
      CASE WHEN v_gate.package_id IS NOT NULL
           THEN (v_id_mapping ->> v_gate.package_id::TEXT)::UUID
           ELSE NULL END,
      v_gate.name, v_gate.description, v_gate.checklist_items,
      v_gate.min_photos_required, v_gate.photo_types,
      v_gate.is_blocking, v_gate.auto_approve_when_complete,
      v_gate.id
    );

    v_gates_created := v_gates_created + 1;
  END LOOP;

  -- =============================================
  -- UPDATE PROJECT METADATA
  -- =============================================
  UPDATE renovation_projects
  SET template_id = p_template_id,
      planned_start_date = COALESCE(planned_start_date, v_start)
  WHERE id = p_project_id;

  RETURN QUERY SELECT v_phases_created, v_packages_created, v_tasks_created, v_deps_created, v_gates_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_template_to_project IS 'Atomically applies a template to a project, creating phases, packages, tasks, dependencies, and quality gates with proper ID remapping';

-- =============================================
-- TMPL-06: CONDITION UPDATE ON PROJECT APPROVAL
-- =============================================

-- This function complements the existing on_project_approved trigger from 027_condition_tracking.sql
-- It provides a more comprehensive update that affects ALL rooms in the unit, not just
-- rooms that had tasks completed. This is appropriate when applying a template that
-- represents a complete renovation.

CREATE OR REPLACE FUNCTION update_condition_on_project_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Get the unit for this project
    -- Update all rooms in the unit to 'new' condition
    UPDATE rooms
    SET
      condition = 'new',
      condition_updated_at = NOW(),
      condition_source_project_id = NEW.id
    WHERE unit_id = NEW.unit_id;

    -- Log condition changes to history (if table exists from 027_condition_tracking.sql)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'condition_history') THEN
      INSERT INTO condition_history (entity_type, entity_id, old_condition, new_condition, source_project_id, notes, changed_by)
      SELECT
        'room',
        r.id,
        r.condition,
        'new',
        NEW.id,
        'Automatisch aktualisiert nach Projekt-Abnahme: ' || NEW.name,
        NEW.approved_by
      FROM rooms r
      WHERE r.unit_id = NEW.unit_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger itself is already created in 027_condition_tracking.sql as projects_on_approved
-- We only update the function here to include all rooms in the unit.
-- If you want to use this version instead, drop and recreate the trigger:
-- DROP TRIGGER IF EXISTS projects_on_approved ON renovation_projects;
-- CREATE TRIGGER projects_on_approved_v2
--   AFTER UPDATE ON renovation_projects
--   FOR EACH ROW
--   WHEN (NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved'))
--   EXECUTE FUNCTION update_condition_on_project_approval();

COMMENT ON FUNCTION update_condition_on_project_approval IS 'TMPL-06: Updates room conditions to new when project is approved';
-- KEWA Renovations Operations System
-- Migration: 036_task_dependencies_extended.sql
-- TMPL-04: Task dependencies with types and lag time

-- =============================================
-- EXTEND TASK DEPENDENCIES
-- =============================================

-- Add dependency_type column (uses enum from 032_templates.sql)
ALTER TABLE task_dependencies
ADD COLUMN IF NOT EXISTS dependency_type dependency_type NOT NULL DEFAULT 'FS';

-- Add lag_days column
ALTER TABLE task_dependencies
ADD COLUMN IF NOT EXISTS lag_days INTEGER DEFAULT 0;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN task_dependencies.dependency_type IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';
COMMENT ON COLUMN task_dependencies.lag_days IS 'Delay in days after dependency condition met (can be negative for lead time)';
-- KEWA Renovations Operations System
-- Migration: 037_work_order_extensions.sql
-- EXT-07/08/09/10: Counter-offer tracking and response flow extensions

-- =============================================
-- COUNTER-OFFER STATUS ENUM
-- =============================================

CREATE TYPE counter_offer_status AS ENUM (
  'pending',   -- Contractor submitted counter-offer, awaiting KEWA review
  'approved',  -- KEWA approved the counter-offer
  'rejected'   -- KEWA rejected the counter-offer
);

-- =============================================
-- EXTEND WORK ORDERS TABLE
-- =============================================

-- Counter-offer tracking columns
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS counter_offer_status counter_offer_status,
  ADD COLUMN IF NOT EXISTS counter_offer_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS counter_offer_response_notes TEXT;

-- =============================================
-- UPDATE STATUS TRANSITION FUNCTION
-- =============================================

-- Allow 'viewed' -> 'viewed' for counter-offer updates
-- Allow KEWA to set 'accepted' from counter-offer approval
CREATE OR REPLACE FUNCTION validate_work_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected", "viewed"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  -- Skip if status not changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions
  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT));

  -- Check if transition is valid
  IF NOT (NEW.status::TEXT = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next, ', ');
  END IF;

  -- Auto-set timestamps based on status
  CASE NEW.status
    WHEN 'sent' THEN
      NEW.updated_at = NOW();
    WHEN 'viewed' THEN
      NEW.viewed_at = NOW();
    WHEN 'accepted' THEN
      NEW.accepted_at = NOW();
    WHEN 'rejected' THEN
      NEW.rejected_at = NOW();
    WHEN 'in_progress' THEN
      IF NEW.actual_start_date IS NULL THEN
        NEW.actual_start_date = CURRENT_DATE;
      END IF;
    WHEN 'done' THEN
      IF NEW.actual_end_date IS NULL THEN
        NEW.actual_end_date = CURRENT_DATE;
      END IF;
    ELSE
      -- No special handling
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update helper function to match
CREATE OR REPLACE FUNCTION can_transition_work_order(
  p_work_order_id UUID,
  p_new_status work_order_status
) RETURNS BOOLEAN AS $$
DECLARE
  current_status work_order_status;
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected", "viewed"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
  }'::JSONB;
BEGIN
  SELECT status INTO current_status FROM work_orders WHERE id = p_work_order_id;

  IF current_status IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN p_new_status::TEXT = ANY(
    ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT))
  );
END;
$$ LANGUAGE plpgsql;

-- Update get_allowed_work_order_transitions to match
CREATE OR REPLACE FUNCTION get_allowed_work_order_transitions(
  p_work_order_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  current_status work_order_status;
  valid_transitions JSONB := '{
    "draft": ["sent"],
    "sent": ["viewed", "draft"],
    "viewed": ["accepted", "rejected", "viewed"],
    "accepted": ["in_progress"],
    "rejected": ["draft"],
    "in_progress": ["done", "blocked"],
    "blocked": ["in_progress", "done"],
    "done": ["inspected"],
    "inspected": ["closed", "in_progress"]
  }'::JSONB;
BEGIN
  SELECT status INTO current_status FROM work_orders WHERE id = p_work_order_id;

  IF current_status IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  RETURN ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status::TEXT));
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INDEX
-- =============================================

CREATE INDEX IF NOT EXISTS idx_work_orders_counter_offer_status
  ON work_orders(counter_offer_status)
  WHERE counter_offer_status IS NOT NULL;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN work_orders.counter_offer_status IS 'Status of counter-offer: pending (awaiting KEWA), approved, rejected';
COMMENT ON COLUMN work_orders.counter_offer_responded_at IS 'Timestamp when KEWA responded to counter-offer';
COMMENT ON COLUMN work_orders.counter_offer_response_notes IS 'KEWA notes when responding to counter-offer';
-- KEWA Renovations Operations System
-- Migration: 038_work_order_events.sql
-- EXT-14: Timestamped event logging for work order activities

-- =============================================
-- EVENT TYPE ENUM
-- =============================================

-- All possible work order event types
CREATE TYPE work_order_event_type AS ENUM (
  'created',                 -- Work order created
  'sent',                    -- Magic link sent to contractor
  'viewed',                  -- Contractor first opened the work order
  'accepted',                -- Contractor accepted
  'rejected',                -- Contractor rejected
  'counter_offer_submitted', -- Contractor submitted counter-offer
  'counter_offer_approved',  -- KEWA approved counter-offer
  'counter_offer_rejected',  -- KEWA rejected counter-offer
  'started',                 -- Work started (in_progress)
  'completed',               -- Work marked done
  'upload_added',            -- File uploaded
  'upload_removed',          -- File removed
  'status_changed'           -- Any other status change
);

-- Actor type: who triggered the event
CREATE TYPE work_order_actor_type AS ENUM (
  'kewa',       -- KEWA staff
  'contractor', -- External contractor
  'system'      -- Automated system action
);

-- =============================================
-- WORK ORDER EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS work_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,

  -- Event details
  event_type work_order_event_type NOT NULL,
  event_data JSONB DEFAULT '{}',

  -- Actor information
  actor_type work_order_actor_type NOT NULL DEFAULT 'system',
  actor_id UUID REFERENCES users(id),  -- Null for contractors/system
  actor_email TEXT,                     -- For contractor actions

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Primary query: get events for a work order
CREATE INDEX IF NOT EXISTS idx_work_order_events_work_order_id
  ON work_order_events(work_order_id);

-- Filter by event type
CREATE INDEX IF NOT EXISTS idx_work_order_events_type
  ON work_order_events(event_type);

-- Sort by time
CREATE INDEX IF NOT EXISTS idx_work_order_events_created_at
  ON work_order_events(created_at DESC);

-- Composite for efficient queries
CREATE INDEX IF NOT EXISTS idx_work_order_events_wo_created
  ON work_order_events(work_order_id, created_at DESC);

-- =============================================
-- TRIGGER: AUTO-LOG STATUS CHANGES
-- =============================================

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_work_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO work_order_events (
      work_order_id,
      event_type,
      event_data,
      actor_type
    ) VALUES (
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status::TEXT,
        'new_status', NEW.status::TEXT
      ),
      'system'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS work_order_status_change_log ON work_orders;
CREATE TRIGGER work_order_status_change_log
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_work_order_status_change();

-- =============================================
-- TRIGGER: AUTO-LOG CREATION
-- =============================================

-- Function to automatically log work order creation
CREATE OR REPLACE FUNCTION log_work_order_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO work_order_events (
    work_order_id,
    event_type,
    event_data,
    actor_type,
    actor_id
  ) VALUES (
    NEW.id,
    'created',
    jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status::TEXT,
      'partner_id', NEW.partner_id
    ),
    CASE WHEN NEW.created_by IS NOT NULL THEN 'kewa' ELSE 'system' END,
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS work_order_created_log ON work_orders;
CREATE TRIGGER work_order_created_log
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_work_order_created();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE work_order_events IS 'Event log for work order activities (EXT-14)';
COMMENT ON COLUMN work_order_events.event_type IS 'Type of event that occurred';
COMMENT ON COLUMN work_order_events.event_data IS 'Additional event data (JSONB for flexibility)';
COMMENT ON COLUMN work_order_events.actor_type IS 'Who triggered: kewa, contractor, or system';
COMMENT ON COLUMN work_order_events.actor_id IS 'User ID if KEWA staff (null for contractors)';
COMMENT ON COLUMN work_order_events.actor_email IS 'Email for contractor actions';
-- Parking spots extension for units table
-- Migration: 039_parking_spots.sql
-- Adds parking_spot type and parking-specific fields

-- =============================================
-- PARKING STATUS ENUM
-- =============================================
CREATE TYPE parking_status AS ENUM ('free', 'occupied', 'maintenance');

COMMENT ON TYPE parking_status IS 'Parking spot status: free, occupied by tenant, or under maintenance';

-- =============================================
-- EXTEND UNITS TABLE
-- =============================================

-- Add parking_spot to unit_type CHECK constraint
-- Note: PostgreSQL requires DROP/ADD for CHECK constraint modification
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_unit_type_check;
ALTER TABLE units ADD CONSTRAINT units_unit_type_check
  CHECK (unit_type IN ('apartment', 'common_area', 'building', 'parking_spot'));

-- Add parking-specific fields
ALTER TABLE units
ADD COLUMN IF NOT EXISTS parking_number INTEGER,
ADD COLUMN IF NOT EXISTS parking_status parking_status DEFAULT 'free';

-- Index for parking queries (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_units_parking_status
  ON units(parking_status)
  WHERE unit_type = 'parking_spot';

CREATE INDEX IF NOT EXISTS idx_units_parking_number
  ON units(building_id, parking_number)
  WHERE unit_type = 'parking_spot';

COMMENT ON COLUMN units.parking_number IS 'Parking spot number (1-8), only for unit_type=parking_spot';
COMMENT ON COLUMN units.parking_status IS 'Parking spot status: free, occupied, maintenance';

-- =============================================
-- SEED 8 PARKING SPOTS
-- =============================================
INSERT INTO units (building_id, name, unit_type, parking_number, parking_status)
SELECT
  b.id,
  'Parkplatz ' || n,
  'parking_spot',
  n,
  'free'
FROM buildings b
CROSS JOIN generate_series(1, 8) AS n
WHERE b.id = '00000000-0000-0000-0001-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM units u
    WHERE u.building_id = b.id AND u.unit_type = 'parking_spot'
  );

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON CONSTRAINT units_unit_type_check ON units IS
  'Unit types: apartment, common_area, building, parking_spot';
-- KEWA Renovations Operations System
-- Migration: 040_comments.sql
-- COMM-01, COMM-02, COMM-03: Comment system with visibility

-- =============================================
-- COMMENT VISIBILITY ENUM
-- =============================================

CREATE TYPE comment_visibility AS ENUM ('internal', 'shared');

-- =============================================
-- COMMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic reference (can attach to any entity)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'work_order', 'project', 'unit')),
  entity_id UUID NOT NULL,

  -- Content
  content TEXT NOT NULL,
  visibility comment_visibility NOT NULL DEFAULT 'internal',

  -- Author (can be user or contractor)
  author_id UUID REFERENCES users(id),
  author_email TEXT,  -- For contractors without user account
  author_name TEXT,   -- Display name for contractors

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_visibility ON comments(visibility);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE comments IS 'Polymorphic comments for tasks, work orders, projects, units';
COMMENT ON COLUMN comments.entity_type IS 'Type of entity: task, work_order, project, unit';
COMMENT ON COLUMN comments.entity_id IS 'UUID of the entity this comment is attached to';
COMMENT ON COLUMN comments.visibility IS 'internal: KEWA only, shared: visible to contractors';
COMMENT ON COLUMN comments.author_email IS 'Email for contractors without user account';
