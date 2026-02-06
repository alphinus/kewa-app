---
phase: 33-bundle-rendering-optimization
plan: 01
subsystem: ui
tags: [next-dynamic, lazy-loading, recharts, tiptap, bundle-optimization]

# Dependency graph
requires:
  - phase: 31-performance-profiling
    provides: Bundle analysis identifying Recharts (337KB) and TipTap (292KB) as targets
provides:
  - Lazy-loaded Recharts charts (BudgetImpactChart, PriceHistoryChart, ConsumptionPatternChart)
  - Lazy-loaded TipTap components (ArticleEditor, ArticleViewer)
  - Loading placeholder pattern for chart and editor components
  - LazyBudgetImpactChart wrapper for server component compatibility
affects: [33-02, performance-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - next/dynamic with ssr:false for browser-only libraries
    - Client component wrappers for lazy loading in server components

key-files:
  created:
    - src/components/change-orders/LazyBudgetImpactChart.tsx
  modified:
    - src/app/dashboard/projekte/[id]/aenderungsauftraege/page.tsx
    - src/app/dashboard/lieferanten/analytics/preise/page.tsx
    - src/app/dashboard/lieferanten/analytics/verbrauch/page.tsx
    - src/app/dashboard/knowledge/new/page.tsx
    - src/app/dashboard/knowledge/[id]/edit/page.tsx
    - src/app/dashboard/knowledge/[id]/page.tsx

key-decisions:
  - "Client wrapper component for server component lazy loading"
  - "ssr: false for Recharts and TipTap due to browser API dependencies"
  - "German loading text in placeholders for consistency"

patterns-established:
  - "LazyComponent pattern: create 'use client' wrapper with dynamic import for server components"
  - "Loading placeholders: match target component dimensions to prevent CLS"

# Metrics
duration: 12min
completed: 2026-02-06
---

# Phase 33 Plan 01: Component Lazy Loading Summary

**Lazy-loaded Recharts (337KB) and TipTap (292KB) components via next/dynamic to reduce initial bundle size**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-06T10:00:00Z
- **Completed:** 2026-02-06T10:12:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Recharts charts now load on-demand when navigating to analytics pages
- TipTap editor/viewer loads on-demand when accessing knowledge base pages
- Loading placeholders provide visual feedback during chunk download
- Server component compatibility via client wrapper pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Lazy load Recharts charts** - `7f307d9` (feat)
2. **Task 2: Lazy load TipTap editor and viewer** - `b7d0056` (feat)

## Files Created/Modified

Created:
- `src/components/change-orders/LazyBudgetImpactChart.tsx` - Client wrapper for BudgetImpactChart lazy loading in server component

Modified:
- `src/app/dashboard/projekte/[id]/aenderungsauftraege/page.tsx` - Uses LazyBudgetImpactChart wrapper
- `src/app/dashboard/lieferanten/analytics/preise/page.tsx` - Dynamic import for PriceHistoryChart
- `src/app/dashboard/lieferanten/analytics/verbrauch/page.tsx` - Dynamic import for ConsumptionPatternChart
- `src/app/dashboard/knowledge/new/page.tsx` - Dynamic import for ArticleEditor
- `src/app/dashboard/knowledge/[id]/edit/page.tsx` - Dynamic import for ArticleEditor
- `src/app/dashboard/knowledge/[id]/page.tsx` - Dynamic import for ArticleViewer

## Decisions Made

1. **Client wrapper for server components:** The aenderungsauftraege page is a server component (async function, server-side data fetching). Next.js 16 doesn't allow `ssr: false` in server components. Solution: create a separate 'use client' wrapper component that does the dynamic import.

2. **Direct file imports over barrel imports:** Analytics pages previously imported from `@/components/suppliers` barrel. Changed to direct file imports (`@/components/suppliers/PriceHistoryChart`) to ensure code splitting works correctly and avoid loading other components from the barrel.

3. **German loading text:** Loading placeholders use "Diagramm wird geladen..." for consistency with the app's German UI.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Server component incompatibility with ssr: false**
- **Found during:** Task 1 (Recharts lazy loading)
- **Issue:** Build failed - `ssr: false` is not allowed with next/dynamic in Server Components
- **Fix:** Created LazyBudgetImpactChart.tsx client wrapper component that handles the dynamic import
- **Files modified:** Created src/components/change-orders/LazyBudgetImpactChart.tsx
- **Verification:** Build passes, component loads correctly
- **Committed in:** 7f307d9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Necessary adaptation for Next.js 16 server component model. No scope creep.

## Issues Encountered
None beyond the server component compatibility issue which was auto-fixed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bundle now has separate chunks for Recharts and TipTap
- Initial page load no longer includes 629KB of chart/editor code
- Ready for Phase 33-02 (further rendering optimizations)
- Verify actual bundle reduction with `npm run build && npm run analyze`

---
*Phase: 33-bundle-rendering-optimization*
*Completed: 2026-02-06*
