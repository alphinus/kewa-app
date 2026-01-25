-- KEWA Renovations Operations System
-- Migration: 050_kb_attachments.sql
-- Phase 18: Knowledge Base Attachments

-- =============================================
-- ATTACHMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS kb_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage: kb_articles/{article_id}/attachments/{uuid}.{ext}
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_kb_attachments_article ON kb_attachments(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_attachments_uploaded_by ON kb_attachments(uploaded_by);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE kb_attachments IS 'File attachments for knowledge base articles';
COMMENT ON COLUMN kb_attachments.storage_path IS 'Path in Supabase Storage: kb_articles/{article_id}/attachments/{uuid}.{ext}';
COMMENT ON COLUMN kb_attachments.mime_type IS 'MIME type of the file (e.g., application/pdf, image/png)';
COMMENT ON COLUMN kb_attachments.file_size IS 'File size in bytes';
