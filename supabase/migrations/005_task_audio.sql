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
