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
