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
