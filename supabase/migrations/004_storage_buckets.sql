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
