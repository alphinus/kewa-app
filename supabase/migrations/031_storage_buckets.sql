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
