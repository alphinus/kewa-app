---
phase: 18-knowledge-base
plan: 05
subsystem: frontend, api
tags: [version-history, related-articles, dashboard-shortcuts, contractor-portal, tsvector]

# Dependency graph
requires:
  - phase: 18-02
    provides: ArticleViewer, ArticleEditor components
  - phase: 18-03
    provides: Search functionality with tsvector
provides:
  - Version history UI with expandable timeline
  - Related articles component with content similarity
  - Dashboard shortcuts for pinned articles
  - Contractor portal knowledge base access
  - Pin/unpin functionality for articles
affects: [contractor-portal (18-CONTEXT decision), dashboard-widgets]

# Tech tracking
tech-stack:
  added: []
  patterns: [category-based similarity fallback, contractor-visible filter pattern]

key-files:
  created:
    - src/components/knowledge/VersionHistory.tsx
    - src/components/knowledge/RelatedArticles.tsx
    - src/components/knowledge/DashboardShortcuts.tsx
    - src/app/api/knowledge/[id]/history/route.ts
    - src/app/api/knowledge/[id]/pin/route.ts
    - src/app/api/knowledge/related/route.ts
    - src/app/api/knowledge/shortcuts/route.ts
    - src/app/contractor/[token]/knowledge/page.tsx
    - src/app/contractor/[token]/knowledge/[id]/page.tsx
    - src/app/contractor/[token]/knowledge/[id]/article-content.tsx
  modified:
    - src/app/dashboard/knowledge/[id]/page.tsx
    - src/app/dashboard/page.tsx

key-decisions:
  - "Category-based similarity for related articles (FTS overlap was too complex for MVP)"
  - "Contractor portal hides internal metadata (author, dates, version history)"
  - "Visibility filter IN ('contractors', 'both') for contractor-accessible articles"
  - "Supabase single relation cast via unknown for type safety"

patterns-established:
  - "Contractor portal filter: visibility IN ('contractors', 'both') AND status = 'published'"
  - "Pin/unpin: POST creates shortcut, DELETE removes it, GET checks current state"
  - "Related articles: Same category first, then by tag overlap"

# Metrics
duration: 8min
completed: 2026-01-25
---

# Phase 18 Plan 05: Version History, Related Articles, Shortcuts, Contractor Portal Summary

**Version history with expandable timeline, related articles by category similarity, dashboard shortcuts for pinned articles, and contractor portal KB access with simplified UI**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-25
- **Completed:** 2026-01-25
- **Tasks:** 3 (resumed from Task 3)
- **Files created:** 10
- **Files modified:** 2

## Accomplishments

- Created VersionHistory component with expandable timeline showing version number, author, date, and change type
- Created RelatedArticles component using category-based similarity
- Created DashboardShortcuts widget displaying pinned articles with remove action
- Created pin/unpin API (POST/DELETE) for dashboard shortcuts
- Created contractor portal KB home page with search and category filter
- Created contractor article view with simplified UI (no author, dates, version history)
- Integrated pin button and RelatedArticles into internal article view page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create version history UI and API** - `2b0f4a8` (feat)
2. **Task 2: Create related articles and dashboard shortcuts** - `38d18a4` (feat)
3. **Task 3: Create contractor portal knowledge base pages** - `a6744fd` (feat)
4. **Integration: Pin/unpin and related articles in article view** - `658f316` (feat)

## Files Created/Modified

- `src/components/knowledge/VersionHistory.tsx` - Expandable version timeline (129 lines)
- `src/components/knowledge/RelatedArticles.tsx` - Related articles by category (95 lines)
- `src/components/knowledge/DashboardShortcuts.tsx` - Pinned articles widget (68 lines)
- `src/app/api/knowledge/[id]/history/route.ts` - Version history endpoint (101 lines)
- `src/app/api/knowledge/[id]/pin/route.ts` - Pin/unpin endpoints (147 lines)
- `src/app/api/knowledge/related/route.ts` - Related articles endpoint (192 lines)
- `src/app/api/knowledge/shortcuts/route.ts` - Shortcuts list endpoint (73 lines)
- `src/app/contractor/[token]/knowledge/page.tsx` - Contractor KB home (265 lines)
- `src/app/contractor/[token]/knowledge/[id]/page.tsx` - Contractor article view (275 lines)
- `src/app/contractor/[token]/knowledge/[id]/article-content.tsx` - Tiptap client component (57 lines)
- `src/app/dashboard/knowledge/[id]/page.tsx` - Added pin button and RelatedArticles
- `src/app/dashboard/page.tsx` - Added DashboardShortcuts widget

## Decisions Made

1. **Category-based similarity for related articles** - FTS tsvector overlap query was complex; simpler same-category approach works well for MVP
2. **Contractor portal hides internal metadata** - Per CONTEXT.md, contractors see title/content/category only, no author/dates/version
3. **Visibility filter pattern** - `visibility IN ('contractors', 'both')` combined with `status = 'published'` ensures correct access control
4. **Type casting via unknown** - Supabase returns single relations as objects but types as arrays; cast through unknown for type safety

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript type inference for Supabase joins**
- **Found during:** Task 3 (Contractor portal pages)
- **Issue:** Supabase returns single relation as object but TypeScript infers array type
- **Fix:** Cast through unknown: `article.category as unknown as { id: string; name: string } | null`
- **Files modified:** contractor knowledge pages
- **Verification:** npm run type-check passes
- **Committed in:** a6744fd (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Type inference workaround necessary for compilation. No scope creep.

## Issues Encountered

None - all tasks completed without blockers.

## User Setup Required

None - no external service configuration required. All features use existing database tables (kb_articles_history, kb_dashboard_shortcuts created in 18-04).

## Next Phase Readiness

- Knowledge base phase complete with all planned features
- Version history shows article changes with author attribution
- Related articles improve discoverability
- Dashboard shortcuts provide quick access to pinned articles
- Contractor portal enables external access to contractor-visible content
- Ready for Phase 19: Supplier Core

---
*Phase: 18-knowledge-base*
*Completed: 2026-01-25*
