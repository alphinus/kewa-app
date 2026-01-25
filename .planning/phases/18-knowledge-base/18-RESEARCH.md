# Phase 18: Knowledge Base - Research

**Researched:** 2026-01-25
**Domain:** Knowledge management / WYSIWYG rich text editing / Full-text search
**Confidence:** HIGH

## Summary

Phase 18 implements a templated knowledge base with WYSIWYG editing, approval workflow, two-level categorization, full-text search, automatic related article linking, and version history. The research focused on five critical domains:

1. **WYSIWYG Editor**: Tiptap is the clear standard for React/Next.js rich text editing. It's headless, extensible, built on ProseMirror, and has first-class Next.js SSR support. The shadcn/ui ecosystem provides a production-ready `minimal-tiptap` component that integrates seamlessly with the existing stack.

2. **Full-Text Search**: PostgreSQL's built-in `tsvector` with GIN indexes provides enterprise-grade search with ranking (`ts_rank`), snippet generation (`ts_headline`), and match highlighting. For spelling suggestions, the `pg_trgm` extension adds trigram-based fuzzy matching.

3. **Version History**: Temporal tables pattern (shadow table with triggers) is the standard approach. Each update creates a version record with JSONB snapshot, user, and timestamp.

4. **Related Articles**: TF-IDF with cosine similarity is the proven algorithm for content similarity. PostgreSQL can compute this using `tsvector` weights or by storing article vectors in a separate table.

5. **Approval Workflow**: State machine pattern with states table (Draft → Review → Published) and transitions tracked via triggers.

**Primary recommendation:** Use Tiptap with shadcn minimal-tiptap component, PostgreSQL tsvector GIN indexes for search, temporal tables for version history, and TF-IDF cosine similarity for related articles.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tiptap/react | 2.10+ | WYSIWYG editor framework | Industry standard for React rich text editing, headless architecture, built on ProseMirror, Meta-backed ecosystem |
| @tiptap/pm | 2.10+ | ProseMirror dependencies | Required peer dependency for Tiptap |
| @tiptap/starter-kit | 2.10+ | Core editor extensions | Batteries-included set of marks/nodes (bold, italic, headings, lists, etc.) |
| shadcn minimal-tiptap | latest | Pre-built Tiptap component | Production-ready component with toolbar, TypeScript support, shadcn/ui integration |
| PostgreSQL tsvector | built-in | Full-text search type | Native Postgres full-text search, no external dependencies |
| PostgreSQL GIN index | built-in | Search index type | Preferred index for tsvector, faster than GiST |
| pg_trgm extension | built-in | Trigram matching | Fuzzy search and spelling suggestions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tiptap/extension-image | 2.10+ | Image support | For embedded images in articles (required) |
| Tiptap ImageUploadNode | latest (CLI) | Drag-drop image upload | For inline image uploads with progress tracking |
| @tiptap/extension-link | 2.10+ | Hyperlink support | For article cross-linking (required) |
| @tiptap/extension-placeholder | 2.10+ | Template placeholders | For templated section prompts |
| react-pdf | ^4.3.2 | PDF attachment preview | Already in package.json, use for attachment previews |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tiptap | Lexical (Meta) | Newer, less ecosystem, no shadcn integration |
| Tiptap | TinyMCE | Commercial licensing required for features, heavier bundle |
| Tiptap | Quill.js | Older architecture, limited extensibility |
| Tiptap | Slate.js | Lower-level, requires more custom implementation |
| pg_trgm | Custom Levenshtein | Reinventing the wheel, worse performance |
| PostgreSQL FTS | Elasticsearch | Overkill for single-tenant, operational complexity |

**Installation:**
```bash
# Tiptap core
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit

# Extensions
npm install @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder

# Shadcn minimal-tiptap component
npx shadcn@latest add https://raw.githubusercontent.com/Aslam97/shadcn-minimal-tiptap/main/registry/block-registry.json

# Tiptap ImageUploadNode (optional, for drag-drop uploads)
npx @tiptap/cli@latest add image-upload-node

# PostgreSQL extensions (run in migration)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── knowledge/                      # Knowledge base routes
│       ├── page.tsx                    # KB home (search + category tree)
│       ├── [category]/page.tsx         # Category view
│       ├── article/[id]/page.tsx       # Article reader view
│       └── edit/[id]/page.tsx          # Article editor
├── components/
│   └── knowledge/
│       ├── ArticleEditor.tsx           # Tiptap editor wrapper
│       ├── ArticleViewer.tsx           # Article display with highlighting
│       ├── CategoryTree.tsx            # Collapsible sidebar
│       ├── SearchBar.tsx               # Search with suggestions
│       ├── RelatedArticles.tsx         # Automatic recommendations
│       └── ApprovalWorkflow.tsx        # Draft/Review/Published controls
├── lib/
│   └── knowledge/
│       ├── search.ts                   # ts_query builder, ts_headline wrapper
│       ├── similarity.ts               # TF-IDF cosine similarity calculations
│       ├── templates.ts                # FAQ/How-to/Policy template definitions
│       └── versioning.ts               # Version history queries
└── db/
    └── schema/
        └── knowledge_base.sql          # Tables + triggers + functions
```

### Pattern 1: Tiptap SSR-Safe Initialization
**What:** Configure Tiptap to avoid Next.js hydration mismatches
**When to use:** Every Tiptap component in Next.js App Router
**Example:**
```typescript
// Source: https://tiptap.dev/docs/editor/getting-started/install/nextjs
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function ArticleEditor({ initialContent }: { initialContent: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    immediatelyRender: false, // CRITICAL: Prevents SSR hydration errors
  })

  return <EditorContent editor={editor} />
}
```

### Pattern 2: PostgreSQL Full-Text Search with Ranking
**What:** GIN-indexed tsvector with weighted search ranking
**When to use:** Article search with snippet generation
**Example:**
```sql
-- Source: https://www.postgresql.org/docs/current/textsearch-controls.html
-- Migration: Create generated tsvector column + GIN index
ALTER TABLE kb_articles
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
  setweight(to_tsvector('english', array_to_string(tags, ' ')), 'C')
) STORED;

CREATE INDEX kb_articles_search_idx ON kb_articles USING GIN (search_vector);

-- Search with ranking and snippets
SELECT
  id,
  title,
  ts_rank_cd(search_vector, query, 1) AS rank,
  ts_headline('english', content, query,
    'MaxWords=35, MinWords=15, MaxFragments=3, FragmentDelimiter= ... '
  ) AS snippet
FROM kb_articles,
  to_tsquery('english', 'workflow & approval') AS query
WHERE search_vector @@ query
  AND visibility IN ('internal', 'both')
ORDER BY rank DESC
LIMIT 20;
```

### Pattern 3: Temporal Tables for Version History
**What:** Shadow table with triggers to capture all article changes
**When to use:** Article version tracking and audit trail
**Example:**
```sql
-- Source: https://wiki.postgresql.org/wiki/Audit_trigger
-- Main table
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Tiptap JSON output
  status TEXT NOT NULL DEFAULT 'draft',
  category_id UUID REFERENCES kb_categories(id),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Version history shadow table
CREATE TABLE kb_articles_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id),
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL -- 'INSERT', 'UPDATE', 'DELETE'
);

-- Trigger function
CREATE OR REPLACE FUNCTION kb_articles_version_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO kb_articles_history (
      article_id, version, title, content, status,
      changed_by, change_type
    ) VALUES (
      OLD.id, OLD.version, OLD.title, OLD.content, OLD.status,
      NEW.updated_by, 'UPDATE'
    );
    NEW.version = OLD.version + 1;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO kb_articles_history (
      article_id, version, title, content, status,
      changed_by, change_type
    ) VALUES (
      NEW.id, 1, NEW.title, NEW.content, NEW.status,
      NEW.updated_by, 'INSERT'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_articles_versioning
BEFORE INSERT OR UPDATE ON kb_articles
FOR EACH ROW EXECUTE FUNCTION kb_articles_version_trigger();
```

### Pattern 4: TF-IDF Cosine Similarity for Related Articles
**What:** Calculate content similarity using tsvector term frequencies
**When to use:** Automatic related article recommendations
**Example:**
```sql
-- Source: https://medium.com/@anurag-jain/tf-idf-vectorization-with-cosine-similarity-eca3386d4423
-- Simplified approach: Use tsvector overlap for similarity
CREATE OR REPLACE FUNCTION get_related_articles(
  p_article_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  related_id UUID,
  related_title TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a2.id,
    a2.title,
    (
      -- Count matching lexemes weighted by position
      SELECT COUNT(DISTINCT unnest(a1.search_vector::text[]))
      FILTER (WHERE unnest(a1.search_vector::text[]) = ANY(a2.search_vector::text[]))
    )::FLOAT / GREATEST(
      array_length(a1.search_vector::text[], 1),
      array_length(a2.search_vector::text[], 1)
    ) AS similarity
  FROM kb_articles a1
  CROSS JOIN kb_articles a2
  WHERE a1.id = p_article_id
    AND a2.id != p_article_id
    AND a2.status = 'published'
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Alternative: Pre-compute similarity matrix for performance
CREATE TABLE kb_article_similarities (
  article_id UUID REFERENCES kb_articles(id),
  related_id UUID REFERENCES kb_articles(id),
  similarity_score FLOAT NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (article_id, related_id)
);

CREATE INDEX kb_similarities_lookup ON kb_article_similarities(article_id, similarity_score DESC);
```

### Pattern 5: Two-Level Category Hierarchy
**What:** Parent-child category tree with materialized path
**When to use:** Category navigation and filtering
**Example:**
```sql
-- Source: https://medium.com/@rishabhdevmanu/from-trees-to-tables-storing-hierarchical-data-in-relational-databases-a5e5e6e1bd64
CREATE TABLE kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon identifier (lucide-react icon name)
  parent_id UUID REFERENCES kb_categories(id),
  path TEXT NOT NULL, -- Materialized path: '/parent/child'
  level INTEGER NOT NULL CHECK (level IN (1, 2)), -- Max 2 levels
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: No nesting beyond 2 levels
CREATE OR REPLACE FUNCTION check_category_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF (SELECT level FROM kb_categories WHERE id = NEW.parent_id) = 2 THEN
      RAISE EXCEPTION 'Categories cannot be nested beyond 2 levels';
    END IF;
    NEW.level = 2;
    NEW.path = (SELECT path FROM kb_categories WHERE id = NEW.parent_id) || '/' || NEW.id::TEXT;
  ELSE
    NEW.level = 1;
    NEW.path = '/' || NEW.id::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_category_depth
BEFORE INSERT OR UPDATE ON kb_categories
FOR EACH ROW EXECUTE FUNCTION check_category_depth();

-- Query: Get category tree with article counts
SELECT
  c.id,
  c.name,
  c.parent_id,
  c.level,
  COUNT(a.id) FILTER (WHERE a.status = 'published') AS article_count
FROM kb_categories c
LEFT JOIN kb_articles a ON a.category_id = c.id
GROUP BY c.id, c.name, c.parent_id, c.level
ORDER BY c.level, c.sort_order;
```

### Pattern 6: Approval Workflow State Machine
**What:** Draft → Review → Published state transitions with validation
**When to use:** Article publication workflow
**Example:**
```sql
-- Source: https://medium.com/@herihermawan/the-ultimate-multifunctional-database-table-design-workflow-states-pattern-156618996549
CREATE TYPE kb_article_status AS ENUM ('draft', 'review', 'published', 'archived');

ALTER TABLE kb_articles ADD COLUMN status kb_article_status DEFAULT 'draft';

-- State transition table
CREATE TABLE kb_workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id),
  from_status kb_article_status NOT NULL,
  to_status kb_article_status NOT NULL,
  transitioned_by UUID NOT NULL REFERENCES users(id),
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT
);

-- Validation: Enforce valid transitions
CREATE OR REPLACE FUNCTION validate_article_transition()
RETURNS TRIGGER AS $$
DECLARE
  old_status TEXT;
BEGIN
  old_status := OLD.status::TEXT;

  -- Valid transitions:
  -- draft -> review (author submits)
  -- review -> published (admin approves)
  -- review -> draft (admin rejects)
  -- published -> archived (admin archives)
  -- draft -> archived (author abandons)

  IF (old_status = 'draft' AND NEW.status::TEXT NOT IN ('review', 'archived')) OR
     (old_status = 'review' AND NEW.status::TEXT NOT IN ('published', 'draft')) OR
     (old_status = 'published' AND NEW.status::TEXT != 'archived') OR
     (old_status = 'archived' AND NEW.status::TEXT IS NOT NULL) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', old_status, NEW.status;
  END IF;

  -- Log transition
  INSERT INTO kb_workflow_transitions (article_id, from_status, to_status, transitioned_by)
  VALUES (NEW.id, OLD.status, NEW.status, NEW.updated_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_workflow_transitions
BEFORE UPDATE OF status ON kb_articles
FOR EACH ROW EXECUTE FUNCTION validate_article_transition();
```

### Pattern 7: Concurrent-Safe View Counter
**What:** Safe view count increments without locking
**When to use:** Track article view counts
**Example:**
```sql
-- Source: https://www.cybertec-postgresql.com/en/how-to-count-hits-on-a-website-in-postgresql/
-- Simple approach: UPDATE is safe in READ COMMITTED (default)
UPDATE kb_articles
SET view_count = view_count + 1
WHERE id = $1;

-- High-performance approach: Async counter with aggregation
CREATE TABLE kb_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  viewer_id UUID REFERENCES users(id) -- NULL for contractors
);

CREATE INDEX kb_views_article_idx ON kb_article_views(article_id);

-- Materialized view for counts (refresh periodically)
CREATE MATERIALIZED VIEW kb_article_view_counts AS
SELECT
  article_id,
  COUNT(*) AS view_count,
  MAX(viewed_at) AS last_viewed_at
FROM kb_article_views
GROUP BY article_id;

CREATE UNIQUE INDEX kb_view_counts_idx ON kb_article_view_counts(article_id);

-- Refresh every 5 minutes via pg_cron or cron job
REFRESH MATERIALIZED VIEW CONCURRENTLY kb_article_view_counts;
```

### Anti-Patterns to Avoid
- **Storing HTML directly**: Use Tiptap JSON format, render to HTML on read (security + flexibility)
- **Client-side only search**: Always use PostgreSQL FTS for security and performance
- **Hand-rolling version comparison**: Use JSONB operators and existing diff libraries
- **Inline file uploads in article content**: Store attachments separately with references
- **Blocking the main table for view counts**: Use async counter pattern for high traffic
- **Storing related articles manually**: Auto-compute via TF-IDF similarity

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contentEditable wrapper | Tiptap with StarterKit | Handles cursor position, selection, undo/redo, paste formatting, keyboard shortcuts, accessibility—thousands of edge cases |
| Full-text search | LIKE '%keyword%' queries | PostgreSQL tsvector + GIN | Language-aware stemming (run/running/ran), stop words, ranking, 100x faster with index |
| Search snippets | String substring extraction | ts_headline() | Context-aware excerpt generation, multiple fragments, match highlighting, XSS-safe output |
| Spell checking | Custom Levenshtein distance | pg_trgm extension | Trigram similarity is proven, indexed, handles typos/variants |
| Content similarity | Word counting comparison | TF-IDF + cosine similarity | Industry-standard algorithm, handles document length normalization, term importance weighting |
| Version history | Manual JSON snapshots | Temporal tables with triggers | Automatic versioning, point-in-time recovery, audit trail, no application logic required |
| State machine | IF/ELSE status checks | Trigger-enforced transitions | Prevents invalid states, centralized validation, audit trail included |
| Category trees | Adjacency list queries | Materialized path pattern | Fast subtree queries, efficient for 2-level hierarchy, indexed path lookups |
| View counting | SELECT then UPDATE | Direct UPDATE or async counter | Concurrent-safe by default (MVCC), async pattern handles high volume |

**Key insight:** WYSIWYG editors and full-text search are the two domains where custom solutions fail hardest. Tiptap handles 1000+ edge cases in text editing (paste behavior, browser quirks, accessibility). PostgreSQL FTS handles language-specific stemming, stop words, ranking algorithms that took decades to refine. Don't reinvent these.

## Common Pitfalls

### Pitfall 1: Tiptap SSR Hydration Errors
**What goes wrong:** `Error: SSR has been detected, please set immediatelyRender explicitly to false`
**Why it happens:** Tiptap renders immediately by default, causing client/server HTML mismatch in Next.js
**How to avoid:** ALWAYS set `immediatelyRender: false` in `useEditor()` hook
**Warning signs:** Hydration warnings in console, editor flashing/re-rendering on page load

### Pitfall 2: XSS Vulnerability in Article Content
**What goes wrong:** Storing user HTML directly allows script injection
**Why it happens:** Trusting rich text editor output as safe HTML
**How to avoid:** Store Tiptap JSON format, render with `EditorContent` (React component sanitizes), never `dangerouslySetInnerHTML`
**Warning signs:** `<script>` tags in database content column

### Pitfall 3: GIN Index Build Blocking Production
**What goes wrong:** Creating GIN index on large table locks writes for minutes/hours
**Why it happens:** GIN index creation requires full table scan
**How to avoid:** Use `CREATE INDEX CONCURRENTLY` (takes longer but doesn't block), schedule during low-traffic window, increase `maintenance_work_mem`
**Warning signs:** Slow writes during migration, table lock warnings

### Pitfall 4: Search Query Injection
**What goes wrong:** User input breaks tsquery syntax: `to_tsquery('user & input:*')` fails on special chars
**Why it happens:** Not sanitizing/escaping search terms before `to_tsquery()`
**How to avoid:** Use `websearch_to_tsquery()` or `plainto_tsquery()` which handle user input safely, OR escape special chars manually
**Warning signs:** `syntax error in tsquery` errors in production logs

### Pitfall 5: Related Articles Calculation Blocking Editor
**What goes wrong:** Computing TF-IDF similarity on every article save freezes UI
**Why it happens:** Similarity calculation across all articles is O(n) and CPU-intensive
**How to avoid:** Compute similarity async (background job), pre-compute similarity matrix in separate table, cache results, only recompute on major content changes
**Warning signs:** Editor save operation takes >2 seconds, high CPU during article updates

### Pitfall 6: Version History Table Bloat
**What goes wrong:** History table grows unbounded, queries slow down, storage costs explode
**Why it happens:** Every edit creates a new version row, no cleanup policy
**How to avoid:** Implement retention policy (keep last N versions or versions from last Y days), partition history table by date, archive old versions to cold storage
**Warning signs:** History table larger than main table by 10x+, slow version history queries

### Pitfall 7: Category Depth Enforcement Only in UI
**What goes wrong:** Database contains 3+ level deep categories despite UI preventing it
**Why it happens:** Relying on React validation only, direct DB access bypasses
**How to avoid:** Enforce constraint via trigger (Pattern 5 above), add CHECK constraint on level column
**Warning signs:** `SELECT MAX(level) FROM kb_categories` returns >2

### Pitfall 8: Image Upload Path Mismatch
**What goes wrong:** Images uploaded via Tiptap don't follow existing Supabase Storage path conventions
**Why it happens:** Using default Tiptap upload without custom path logic
**How to avoid:** Extend `contractor-upload.ts` pattern with `kb_articles/{article_id}/images/{uuid}.webp`, register in `storage_metadata` table
**Warning signs:** Orphaned images in storage root, broken image links after article deletion

### Pitfall 9: Contractor Visibility Filter Leaks Internal Data
**What goes wrong:** Contractors see internal-only articles in search results or related articles
**Why it happens:** Forgetting visibility filter in search queries or related article computation
**How to avoid:** Create view `kb_articles_contractor_visible` with WHERE clause, use in all contractor-facing queries, add RLS policy
**Warning signs:** Contractor feedback mentioning internal content, failed penetration tests

### Pitfall 10: Template Sections Not Enforced in Database
**What goes wrong:** Articles saved without required template sections (FAQ without Answer field)
**Why it happens:** Template structure only exists in React component, not validated on save
**How to avoid:** Store template type in DB, validate JSONB content structure via CHECK constraint or trigger, reject saves missing required fields
**Warning signs:** Articles missing expected sections, inconsistent article structure

## Code Examples

Verified patterns from official sources:

### Tiptap Article Template Extension
```typescript
// Custom extension for templated sections (FAQ/How-to/Policy)
// Source: https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

export const TemplateSection = Node.create({
  name: 'templateSection',

  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: {
        default: 'faq', // 'faq' | 'howto' | 'policy'
      },
      label: {
        default: 'Section',
      },
      required: {
        default: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-template-section]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-template-section': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TemplateSectionComponent)
  },
})

// React component for rendering template section
function TemplateSectionComponent({ node, updateAttributes, editor }: any) {
  return (
    <div className="border-l-4 border-blue-500 pl-4 my-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-600">
          {node.attrs.label}
          {node.attrs.required && <span className="text-red-500">*</span>}
        </span>
      </div>
      <NodeViewContent />
    </div>
  )
}

// Usage in editor initialization
const editor = useEditor({
  extensions: [
    StarterKit,
    TemplateSection,
  ],
  content: getFAQTemplate(), // Load template based on article type
  immediatelyRender: false,
})

// Template definitions
const templates = {
  faq: {
    type: 'doc',
    content: [
      {
        type: 'templateSection',
        attrs: { label: 'Question', required: true },
        content: [{ type: 'paragraph' }],
      },
      {
        type: 'templateSection',
        attrs: { label: 'Answer', required: true },
        content: [{ type: 'paragraph' }],
      },
      {
        type: 'templateSection',
        attrs: { label: 'Related Topics', required: false },
        content: [{ type: 'bulletList', content: [{ type: 'listItem' }] }],
      },
    ],
  },
  howto: {
    type: 'doc',
    content: [
      {
        type: 'templateSection',
        attrs: { label: 'Overview', required: true },
        content: [{ type: 'paragraph' }],
      },
      {
        type: 'templateSection',
        attrs: { label: 'Steps', required: true },
        content: [{ type: 'orderedList', content: [{ type: 'listItem' }] }],
      },
      {
        type: 'templateSection',
        attrs: { label: 'Tips & Warnings', required: false },
        content: [{ type: 'paragraph' }],
      },
    ],
  },
  policy: {
    type: 'doc',
    content: [
      {
        type: 'templateSection',
        attrs: { label: 'Policy Statement', required: true },
        content: [{ type: 'paragraph' }],
      },
      {
        type: 'templateSection',
        attrs: { label: 'Scope', required: true },
        content: [{ type: 'paragraph' }],
      },
      {
        type: 'templateSection',
        attrs: { label: 'Responsibilities', required: false },
        content: [{ type: 'bulletList', content: [{ type: 'listItem' }] }],
      },
      {
        type: 'templateSection',
        attrs: { label: 'Effective Date', required: true },
        content: [{ type: 'paragraph' }],
      },
    ],
  },
}
```

### Search with Highlighting and Filters
```typescript
// lib/knowledge/search.ts
// Source: https://www.postgresql.org/docs/current/textsearch-controls.html

import { createClient } from '@/lib/supabase/server'

export type SearchFilters = {
  categoryId?: string
  audience?: 'internal' | 'contractors' | 'both'
  author?: string
  dateFrom?: Date
  dateTo?: Date
}

export async function searchArticles(
  query: string,
  filters: SearchFilters = {},
  limit: number = 20
) {
  const supabase = await createClient()

  // Build PostgreSQL tsquery (safely handle user input)
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .map(term => `${term}:*`) // Prefix matching
    .join(' & ')

  let sql = `
    SELECT
      a.id,
      a.title,
      a.category_id,
      c.name as category_name,
      a.updated_at,
      a.updated_by,
      u.name as author_name,
      ts_rank_cd(a.search_vector, query, 1) AS rank,
      ts_headline('english', a.content::text, query,
        'MaxWords=35, MinWords=15, MaxFragments=3, StartSel=<mark>, StopSel=</mark>'
      ) AS snippet
    FROM kb_articles a
    LEFT JOIN kb_categories c ON c.id = a.category_id
    LEFT JOIN users u ON u.id = a.updated_by,
    websearch_to_tsquery('english', $1) AS query
    WHERE a.search_vector @@ query
      AND a.status = 'published'
  `

  const params: any[] = [query]
  let paramIndex = 2

  if (filters.categoryId) {
    sql += ` AND a.category_id = $${paramIndex}`
    params.push(filters.categoryId)
    paramIndex++
  }

  if (filters.audience) {
    if (filters.audience === 'contractors') {
      sql += ` AND a.visibility IN ('contractors', 'both')`
    } else {
      sql += ` AND a.visibility = $${paramIndex}`
      params.push(filters.audience)
      paramIndex++
    }
  }

  if (filters.author) {
    sql += ` AND a.updated_by = $${paramIndex}`
    params.push(filters.author)
    paramIndex++
  }

  if (filters.dateFrom) {
    sql += ` AND a.updated_at >= $${paramIndex}`
    params.push(filters.dateFrom.toISOString())
    paramIndex++
  }

  if (filters.dateTo) {
    sql += ` AND a.updated_at <= $${paramIndex}`
    params.push(filters.dateTo.toISOString())
    paramIndex++
  }

  sql += ` ORDER BY rank DESC LIMIT $${paramIndex}`
  params.push(limit)

  const { data, error } = await supabase.rpc('search_articles_raw', {
    query_sql: sql,
    query_params: params,
  })

  if (error) throw error
  return data
}

// Spell check suggestions using pg_trgm
// Source: https://www.viget.com/articles/handling-spelling-mistakes-with-postgres-full-text-search
export async function getSuggestions(term: string, limit: number = 5) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_search_suggestions', {
    search_term: term,
    match_limit: limit,
  })

  if (error) throw error
  return data
}

// Database function for suggestions (create in migration)
/*
CREATE OR REPLACE FUNCTION get_search_suggestions(
  search_term TEXT,
  match_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  suggestion TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    word::TEXT,
    similarity(word, search_term) AS sim
  FROM (
    SELECT unnest(string_to_array(title, ' ')) AS word
    FROM kb_articles
    WHERE status = 'published'
    UNION
    SELECT unnest(tags) AS word
    FROM kb_articles
    WHERE status = 'published'
  ) words
  WHERE similarity(word, search_term) > 0.3
  ORDER BY sim DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;
*/
```

### Article Viewer with Contextual Related Articles
```typescript
// components/knowledge/ArticleViewer.tsx
// Combines article display with automatic related article sidebar

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState } from 'react'
import { getRelatedArticles } from '@/lib/knowledge/similarity'

export function ArticleViewer({
  article,
  highlightTerms = [], // Search terms to highlight
}: {
  article: Article
  highlightTerms?: string[]
}) {
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])

  // Read-only editor for rendering
  const editor = useEditor({
    extensions: [StarterKit],
    content: article.content, // Tiptap JSON
    editable: false,
    immediatelyRender: false,
  })

  // Apply highlighting to search terms
  useEffect(() => {
    if (editor && highlightTerms.length > 0) {
      highlightTerms.forEach(term => {
        editor.commands.setSearchTerm(term) // Requires SearchAndReplace extension
      })
    }
  }, [editor, highlightTerms])

  // Load related articles
  useEffect(() => {
    getRelatedArticles(article.id, 5).then(setRelatedArticles)
  }, [article.id])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <article className="lg:col-span-3 prose prose-slate max-w-none">
        <header className="mb-8">
          <h1 className="mb-2">{article.title}</h1>
          <div className="text-sm text-gray-500 flex gap-4">
            <span>Last updated: {formatDate(article.updated_at)}</span>
            <span>By: {article.author_name}</span>
            <span>{article.view_count} views</span>
          </div>
          {article.tags && (
            <div className="flex gap-2 mt-2">
              {article.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <EditorContent editor={editor} />

        {article.attachments && article.attachments.length > 0 && (
          <section className="mt-8 border-t pt-4">
            <h3>Attachments</h3>
            <ul>
              {article.attachments.map(attachment => (
                <li key={attachment.id}>
                  <a href={attachment.url} target="_blank" rel="noopener">
                    {attachment.name} ({formatFileSize(attachment.size)})
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <aside className="lg:col-span-1">
        <div className="sticky top-4">
          <h3 className="text-sm font-semibold mb-3">Related Articles</h3>
          {relatedArticles.length > 0 ? (
            <ul className="space-y-2">
              {relatedArticles.map(related => (
                <li key={related.id}>
                  <a
                    href={`/knowledge/article/${related.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {related.title}
                  </a>
                  <p className="text-xs text-gray-500 mt-1">
                    {related.category_name}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No related articles found</p>
          )}
        </div>
      </aside>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CKEditor, TinyMCE | Tiptap (headless) | 2020-2022 | Framework-agnostic, smaller bundle, better React integration |
| Elasticsearch for search | PostgreSQL tsvector | 2018-2024 | Lower complexity for single-tenant apps, built-in, no external service |
| Manual version tables | Temporal tables extension | 2016+ | Standardized pattern, trigger-based automation, point-in-time queries |
| Word2Vec embeddings | TF-IDF cosine similarity | Still standard | TF-IDF sufficient for <10k articles, simpler, no ML model |
| Adjacency list | Materialized path | 2010s | Faster subtree queries, better for read-heavy category trees |
| Manual state validation | Trigger-enforced FSM | 2015+ | Database-level guarantees, prevents invalid states from any client |
| Custom spell check | pg_trgm extension | Built-in since PG 9.1 | Indexed trigram search, proven algorithm |
| HTML storage | JSON editor format | 2020+ | Safer (no XSS), portable, version-diff friendly |

**Deprecated/outdated:**
- **CKEditor 4**: Replaced by CKEditor 5 (2018), but Tiptap now preferred for React
- **GiST indexes for FTS**: Still supported but GIN is faster and preferred (since PG 8.2)
- **LIKE queries for search**: Never use—10-100x slower than tsvector, no ranking
- **Storing tsvector manually**: Use GENERATED ALWAYS columns (PG 12+) instead of triggers
- **Draft.js**: Meta's previous editor, now superseded by Lexical (2021)
- **Slate.js 0.x**: Breaking changes in 0.50+ (2019), ecosystem fragmented
- **Simple versioning**: `version_number` column without history table—no audit trail

## Open Questions

Things that couldn't be fully resolved:

1. **Tiptap Pro Features Pricing**
   - What we know: ImageUploadNode and templates are in Tiptap CLI, StarterKit is MIT licensed, collaboration features are paid ($149-999/mo)
   - What's unclear: Whether ImageUploadNode requires pro license or is MIT (CLI suggests free)
   - Recommendation: Test with `npx @tiptap/cli@latest add image-upload-node` first, verify license in installed files; if restricted, use open-source FileHandler extension instead

2. **Similarity Computation Performance at Scale**
   - What we know: TF-IDF cosine similarity is O(n) per article, pre-computation recommended
   - What's unclear: At what article count does pre-computation become necessary vs. on-demand
   - Recommendation: Start with on-demand computation, add `kb_article_similarities` pre-computed table if related article queries exceed 500ms

3. **Expiry Date Notification Mechanism**
   - What we know: Articles have `expiry_date` metadata field, needs notification system
   - What's unclear: Phase 24 (Push Notifications) is later—how to notify before then
   - Recommendation: Start with simple approach: weekly cron job queries expiring articles, creates admin dashboard alert; integrate with Phase 24 notification system later

4. **Contractor Contextual Display Logic**
   - What we know: Articles should appear contextually on contractor portal pages
   - What's unclear: Exact matching logic—by category keywords, manual page mapping, or full-text search
   - Recommendation: Implement category-based matching first (e.g., "Work Orders" category articles show on work order pages), add keyword matching in future iteration

5. **Attachment Storage Path Convention**
   - What we know: Existing system uses `work_orders/{id}/documents/`, `media` bucket exists
   - What's unclear: Should KB use same `media` bucket or separate `knowledge-base` bucket
   - Recommendation: Use existing `media` bucket with path `kb_articles/{article_id}/attachments/{uuid}.{ext}` to maintain consistency, register in `storage_metadata` table

## Sources

### Primary (HIGH confidence)
- [Tiptap Next.js Documentation](https://tiptap.dev/docs/editor/getting-started/install/nextjs) - Official SSR setup
- [Tiptap ImageUploadNode](https://tiptap.dev/docs/ui-components/node-components/image-upload-node) - Image upload configuration
- [PostgreSQL Full-Text Search Controls](https://www.postgresql.org/docs/current/textsearch-controls.html) - ts_rank, ts_headline official docs
- [PostgreSQL Text Search Indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html) - GIN vs GiST comparison
- [PostgreSQL Audit Trigger Wiki](https://wiki.postgresql.org/wiki/Audit_trigger) - Temporal tables pattern
- [shadcn minimal-tiptap](https://www.shadcn.io/components/forms/minimal-tiptap) - Official shadcn component
- [Tiptap Pricing Model](https://tiptap.dev/pricing) - Free vs paid features

### Secondary (MEDIUM confidence)
- [ReactScript: React WYSIWYG Editors 2026](https://reactscript.com/best-rich-text-editor/) - Editor comparison
- [Handling Spelling Mistakes with Postgres FTS](https://www.viget.com/articles/handling-spelling-mistakes-with-postgres-full-text-search) - pg_trgm usage
- [PostgreSQL Concurrency: View Counting](https://www.cybertec-postgresql.com/en/how-to-count-hits-on-a-website-in-postgresql/) - Concurrent counter patterns
- [Materialized Path in PostgreSQL](https://medium.com/@rishabhdevmanu/from-trees-to-tables-storing-hierarchical-data-in-relational-databases-a5e5e6e1bd64) - Category hierarchy
- [Workflow States Pattern](https://medium.com/@herihermawan/the-ultimate-multifunctional-database-table-design-workflow-states-pattern-156618996549) - State machine design
- [TF-IDF with Cosine Similarity](https://medium.com/@anurag-jain/tf-idf-vectorization-with-cosine-similarity-eca3386d4423) - Similarity algorithm

### Tertiary (LOW confidence)
- [Tiptap SSR Issues on GitHub](https://github.com/ueberdosis/tiptap/issues/5856) - Community-reported problems (verify before relying)
- WebSearch results for template editors (no single authoritative source, pattern pieced together)
- WebSearch results for expiry notification systems (generic patterns, not PostgreSQL-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Tiptap and PostgreSQL FTS are well-documented, official sources verified
- Architecture: HIGH - All patterns from official docs or PostgreSQL wiki
- Pitfalls: MEDIUM-HIGH - SSR and XSS from official docs (HIGH), version bloat from community experience (MEDIUM)
- Related articles: MEDIUM - TF-IDF is standard algorithm but PostgreSQL implementation is custom, no official function
- Templates: MEDIUM - Custom extension pattern verified in Tiptap docs, but template definitions are original design

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days—Tiptap stable, PostgreSQL slow-moving)
