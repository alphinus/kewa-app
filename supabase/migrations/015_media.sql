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
