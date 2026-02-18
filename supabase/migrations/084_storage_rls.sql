-- KEWA v4.0: Multi-Tenant Storage RLS
-- Migration: 084_storage_rls.sql
-- Purpose: Replace unscoped storage policies with org-scoped policies using current_organization_id().
--
-- Requires: 076_rls_helpers.sql (current_organization_id() function)
-- Requires: 041_storage_buckets.sql (task-photos, task-audio buckets exist)
-- Requires: 059_inspections.sql (inspections bucket exists)
-- Requires: media bucket (created in earlier migration)
--
-- Policy pattern: (storage.foldername(name))[1] = current_organization_id()::text
-- This enforces that the first path segment matches the caller's org UUID,
-- which is set per-transaction via set_org_context() in API routes.
--
-- Total: 8 DROP POLICY + 16 CREATE POLICY = 24 statements

-- ============================================================
-- SECTION 1: Drop old unscoped policies from 041_storage_buckets.sql
-- ============================================================

-- task-photos bucket (3 policies from 041)
DROP POLICY IF EXISTS "Authenticated users can read photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

-- task-audio bucket (3 policies from 041)
DROP POLICY IF EXISTS "Authenticated users can read audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete audio" ON storage.objects;

-- inspections bucket (059_inspections.sql used storage.policies table inserts,
-- not CREATE POLICY on storage.objects — these DROPs are safety-only)
DROP POLICY IF EXISTS "Authenticated users can view inspections" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to inspections" ON storage.objects;

-- ============================================================
-- SECTION 2: Org-scoped policies for 'media' bucket (4 policies)
-- ============================================================

CREATE POLICY "media_org_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "media_org_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "media_org_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "media_org_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

-- ============================================================
-- SECTION 3: Org-scoped policies for 'task-photos' bucket (4 policies)
-- ============================================================

CREATE POLICY "task_photos_org_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-photos'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "task_photos_org_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-photos'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "task_photos_org_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-photos'
  AND (storage.foldername(name))[1] = current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'task-photos'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "task_photos_org_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-photos'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

-- ============================================================
-- SECTION 4: Org-scoped policies for 'task-audio' bucket (4 policies)
-- ============================================================

CREATE POLICY "task_audio_org_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-audio'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "task_audio_org_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-audio'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "task_audio_org_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-audio'
  AND (storage.foldername(name))[1] = current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'task-audio'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "task_audio_org_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-audio'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

-- ============================================================
-- SECTION 5: Org-scoped policies for 'inspections' bucket (4 policies)
-- ============================================================

CREATE POLICY "inspections_org_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspections'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "inspections_org_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspections'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "inspections_org_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inspections'
  AND (storage.foldername(name))[1] = current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'inspections'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "inspections_org_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspections'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);
