-- KEWA Renovations Operations System
-- Migration: 049_knowledge_search_functions.sql
-- Phase 18: Knowledge Base Search Functions

-- =============================================
-- SEARCH FUNCTION
-- =============================================

/**
 * Full-text search for knowledge base articles.
 * Uses websearch_to_tsquery for safe user input handling.
 * Returns articles with snippets and ranking.
 */
CREATE OR REPLACE FUNCTION search_kb_articles(
  search_query TEXT,
  category_filter UUID DEFAULT NULL,
  visibility_filter TEXT DEFAULT NULL,
  author_filter UUID DEFAULT NULL,
  date_from TIMESTAMPTZ DEFAULT NULL,
  date_to TIMESTAMPTZ DEFAULT NULL,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  snippet TEXT,
  rank FLOAT,
  category_id UUID,
  category_name TEXT,
  updated_at TIMESTAMPTZ,
  author_name TEXT
) AS $$
BEGIN
  -- Handle empty or whitespace-only search query
  IF search_query IS NULL OR TRIM(search_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    ts_headline(
      'english',
      COALESCE(a.title, '') || ' ' || COALESCE(a.content::text, ''),
      websearch_to_tsquery('english', search_query),
      'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>, HighlightAll=false'
    ) AS snippet,
    ts_rank_cd(a.search_vector, websearch_to_tsquery('english', search_query)) AS rank,
    a.category_id,
    c.name AS category_name,
    a.updated_at,
    u.display_name AS author_name
  FROM kb_articles a
  LEFT JOIN kb_categories c ON c.id = a.category_id
  LEFT JOIN users u ON u.id = a.author_id
  WHERE a.search_vector @@ websearch_to_tsquery('english', search_query)
    AND a.status = 'published'
    AND (category_filter IS NULL OR a.category_id = category_filter)
    AND (visibility_filter IS NULL OR a.visibility::TEXT = visibility_filter OR a.visibility = 'both')
    AND (author_filter IS NULL OR a.author_id = author_filter)
    AND (date_from IS NULL OR a.updated_at >= date_from)
    AND (date_to IS NULL OR a.updated_at <= date_to)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_kb_articles IS 'Full-text search for knowledge base articles with filtering and snippets';

-- =============================================
-- SUGGESTIONS FUNCTION (AUTOCOMPLETE)
-- =============================================

/**
 * Get search suggestions based on article titles and tags.
 * Uses pg_trgm for fuzzy matching.
 */
CREATE OR REPLACE FUNCTION get_kb_suggestions(
  search_term TEXT,
  match_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  suggestion TEXT,
  source TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  -- Handle empty or short search term
  IF search_term IS NULL OR LENGTH(TRIM(search_term)) < 2 THEN
    RETURN;
  END IF;

  -- Search in titles first, then tags
  RETURN QUERY
  WITH title_matches AS (
    SELECT DISTINCT
      a.title AS suggestion,
      'title'::TEXT AS source,
      similarity(a.title, search_term) AS similarity_score
    FROM kb_articles a
    WHERE a.status = 'published'
      AND a.title % search_term  -- pg_trgm similarity operator
    ORDER BY similarity(a.title, search_term) DESC
    LIMIT match_limit
  ),
  tag_matches AS (
    SELECT DISTINCT
      unnest(a.tags) AS suggestion,
      'tag'::TEXT AS source,
      similarity(unnest(a.tags), search_term) AS similarity_score
    FROM kb_articles a
    WHERE a.status = 'published'
      AND EXISTS (
        SELECT 1 FROM unnest(a.tags) t WHERE t % search_term
      )
    ORDER BY similarity_score DESC
    LIMIT match_limit
  )
  SELECT * FROM title_matches
  UNION ALL
  SELECT * FROM tag_matches
  ORDER BY similarity_score DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_kb_suggestions IS 'Autocomplete suggestions based on article titles and tags';

-- =============================================
-- INDEX FOR TRIGRAM SIMILARITY
-- =============================================

-- Create GIN index for pg_trgm on article titles
CREATE INDEX IF NOT EXISTS kb_articles_title_trgm_idx
ON kb_articles USING GIN (title gin_trgm_ops);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Allow authenticated users to execute search functions
GRANT EXECUTE ON FUNCTION search_kb_articles TO authenticated;
GRANT EXECUTE ON FUNCTION get_kb_suggestions TO authenticated;
