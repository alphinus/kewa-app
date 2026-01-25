-- KEWA Renovations Operations System
-- Migration: 048_knowledge_base.sql
-- Phase 18: Knowledge Base Foundation

-- =============================================
-- EXTENSIONS
-- =============================================

-- Enable pg_trgm for fuzzy search and spelling suggestions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE kb_article_status AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE kb_article_visibility AS ENUM ('internal', 'contractors', 'both');
CREATE TYPE kb_article_template AS ENUM ('faq', 'howto', 'policy');

-- =============================================
-- CATEGORIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- lucide-react icon name
  parent_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (1, 2)),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CATEGORY DEPTH ENFORCEMENT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION check_category_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Check if parent is already at level 2 (would create 3+ levels)
    IF (SELECT level FROM kb_categories WHERE id = NEW.parent_id) = 2 THEN
      RAISE EXCEPTION 'Categories cannot be nested beyond 2 levels';
    END IF;
    -- Set level to 2 (child of top-level)
    NEW.level = 2;
    -- Build materialized path
    NEW.path = (SELECT path FROM kb_categories WHERE id = NEW.parent_id) || '/' || NEW.id::TEXT;
  ELSE
    -- Top-level category
    NEW.level = 1;
    NEW.path = '/' || NEW.id::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_category_depth
BEFORE INSERT OR UPDATE ON kb_categories
FOR EACH ROW EXECUTE FUNCTION check_category_depth();

-- =============================================
-- ARTICLES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Tiptap JSON format
  template kb_article_template NOT NULL,
  status kb_article_status DEFAULT 'draft',
  visibility kb_article_visibility DEFAULT 'internal',
  category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  author_id UUID NOT NULL REFERENCES users(id),
  last_reviewed_at TIMESTAMPTZ,
  expiry_date DATE,
  view_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- =============================================
-- FULL-TEXT SEARCH VECTOR
-- =============================================

-- Add generated search_vector column for full-text search
-- Uses weighted search: title (A), content text (B), tags (C)
ALTER TABLE kb_articles ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content::text, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
) STORED;

-- =============================================
-- ARTICLE HISTORY TABLE (Version Tracking)
-- =============================================

CREATE TABLE IF NOT EXISTS kb_articles_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  status kb_article_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- =============================================
-- VERSION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION kb_articles_version_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Store OLD values in history before update
    INSERT INTO kb_articles_history (
      article_id, version, title, content, status,
      changed_by, change_type
    ) VALUES (
      OLD.id, OLD.version, OLD.title, OLD.content, OLD.status,
      COALESCE(NEW.updated_by, OLD.author_id), 'UPDATE'
    );
    -- Increment version
    NEW.version = OLD.version + 1;
    -- Update timestamp
    NEW.updated_at = NOW();
  ELSIF (TG_OP = 'INSERT') THEN
    -- Create initial history record
    INSERT INTO kb_articles_history (
      article_id, version, title, content, status,
      changed_by, change_type
    ) VALUES (
      NEW.id, 1, NEW.title, NEW.content, NEW.status,
      NEW.author_id, 'INSERT'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_articles_versioning
AFTER INSERT OR UPDATE ON kb_articles
FOR EACH ROW EXECUTE FUNCTION kb_articles_version_trigger();

-- =============================================
-- WORKFLOW TRANSITIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS kb_workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  from_status kb_article_status NOT NULL,
  to_status kb_article_status NOT NULL,
  transitioned_by UUID NOT NULL REFERENCES users(id),
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT
);

-- =============================================
-- WORKFLOW VALIDATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION validate_article_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions:
  -- draft -> review (author submits for review)
  -- review -> published (admin approves)
  -- review -> draft (admin rejects / requests changes)
  -- published -> archived (admin archives)
  -- draft -> archived (author abandons)

  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('review', 'archived')) OR
    (OLD.status = 'review' AND NEW.status IN ('published', 'draft')) OR
    (OLD.status = 'published' AND NEW.status = 'archived')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status;
  END IF;

  -- Log the transition
  INSERT INTO kb_workflow_transitions (article_id, from_status, to_status, transitioned_by)
  VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.updated_by, NEW.author_id));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_workflow_transitions
BEFORE UPDATE OF status ON kb_articles
FOR EACH ROW EXECUTE FUNCTION validate_article_transition();

-- =============================================
-- DASHBOARD SHORTCUTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS kb_dashboard_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- =============================================
-- INDEXES
-- =============================================

-- Full-text search index (GIN for tsvector)
CREATE INDEX kb_articles_search_idx ON kb_articles USING GIN (search_vector);

-- Tags index (GIN for array)
CREATE INDEX kb_articles_tags_idx ON kb_articles USING GIN (tags);

-- Category index (btree for foreign key lookups)
CREATE INDEX kb_articles_category_idx ON kb_articles(category_id);

-- Status index (btree for filtering)
CREATE INDEX kb_articles_status_idx ON kb_articles(status);

-- Visibility index (btree for filtering)
CREATE INDEX kb_articles_visibility_idx ON kb_articles(visibility);

-- Author index
CREATE INDEX kb_articles_author_idx ON kb_articles(author_id);

-- Category hierarchy indexes
CREATE INDEX kb_categories_parent_idx ON kb_categories(parent_id);
CREATE INDEX kb_categories_level_idx ON kb_categories(level);
CREATE INDEX kb_categories_path_idx ON kb_categories(path);

-- History lookup index
CREATE INDEX kb_articles_history_article_idx ON kb_articles_history(article_id, version DESC);

-- Dashboard shortcuts index
CREATE INDEX kb_dashboard_shortcuts_user_idx ON kb_dashboard_shortcuts(user_id);

-- =============================================
-- SEED DEFAULT CATEGORY
-- =============================================

INSERT INTO kb_categories (id, name, description, icon, parent_id, path, level, sort_order)
VALUES (
  gen_random_uuid(),
  'General',
  'General articles and documentation',
  'file-text',
  NULL,
  '',  -- Will be set by trigger
  1,   -- Will be set by trigger
  0
) ON CONFLICT DO NOTHING;

-- Fix the path for General category (trigger runs before we can reference the ID)
UPDATE kb_categories
SET path = '/' || id::TEXT
WHERE name = 'General' AND path = '';

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE kb_categories IS 'Knowledge base article categories with two-level hierarchy';
COMMENT ON COLUMN kb_categories.path IS 'Materialized path for efficient tree queries';
COMMENT ON COLUMN kb_categories.level IS 'Category depth (1=top-level, 2=subcategory)';
COMMENT ON COLUMN kb_categories.icon IS 'Lucide React icon name for UI display';

COMMENT ON TABLE kb_articles IS 'Knowledge base articles with full-text search and versioning';
COMMENT ON COLUMN kb_articles.content IS 'Tiptap editor JSON content';
COMMENT ON COLUMN kb_articles.template IS 'Article template type (FAQ, How-to, Policy)';
COMMENT ON COLUMN kb_articles.search_vector IS 'Generated tsvector for full-text search';
COMMENT ON COLUMN kb_articles.visibility IS 'Who can see this article (internal, contractors, or both)';

COMMENT ON TABLE kb_articles_history IS 'Version history for knowledge base articles';
COMMENT ON COLUMN kb_articles_history.change_type IS 'Type of change: INSERT, UPDATE, or DELETE';

COMMENT ON TABLE kb_workflow_transitions IS 'Audit trail for article status transitions';

COMMENT ON TABLE kb_dashboard_shortcuts IS 'User-pinned articles for quick dashboard access';
