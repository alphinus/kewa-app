# Phase 33: Bundle & Rendering Optimization - Research

**Researched:** 2026-02-06
**Domain:** Next.js 16 / React 19 Performance Optimization
**Confidence:** HIGH

## Summary

Phase 33 targets three performance optimizations: parallel data fetching (PERF-05), dynamic API audit in layouts (PERF-06), and lazy loading heavy components (PERF-07). The codebase already demonstrates good parallel fetching patterns in some pages (e.g., `Promise.all` in unit investment detail) but has opportunities for improvement in client-side pages. The layouts are clean (no `cookies()` or `headers()` calls in layouts), but the dashboard layout is a Client Component which has different implications. Heavy components (Recharts 337KB, TipTap 292KB) can be lazy loaded with `next/dynamic` to reduce initial bundle by 100+ KB.

**Primary recommendation:** Use `next/dynamic` with loading fallbacks for Recharts charts and TipTap editor, convert remaining sequential client-side fetches to parallel, and audit build output for static vs dynamic routes.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next/dynamic | 16.1.6 | Lazy loading | Composite of React.lazy + Suspense, SSR-aware |
| React Suspense | 19.2.3 | Loading boundaries | Native React pattern for async rendering |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @next/bundle-analyzer | 16.1.6 | Bundle visualization | Already installed, verify optimization impact |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next/dynamic | React.lazy | next/dynamic is preferred for SSR support |
| Manual code splitting | Route-based splitting | Next.js handles route splitting automatically |

**Installation:**
No additional packages needed - all tools already in place.

## Architecture Patterns

### Recommended Approach: Lazy Loading Heavy Components

```
src/
├── components/
│   └── charts/                    # Wrap with dynamic imports
│       ├── BudgetImpactChart.tsx  # Recharts - 337KB
│       ├── ConsumptionPatternChart.tsx
│       └── PriceHistoryChart.tsx
│   └── knowledge/
│       └── ArticleEditor.tsx      # TipTap - 292KB
```

### Pattern 1: Dynamic Import with Loading Fallback
**What:** Use `next/dynamic` to lazy load heavy components
**When to use:** Components > 30KB that don't render in initial viewport
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading
'use client'

import dynamic from 'next/dynamic'

// Lazy load chart only when needed
const BudgetImpactChart = dynamic(
  () => import('@/components/charts/BudgetImpactChart').then(mod => mod.BudgetImpactChart),
  {
    loading: () => (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg animate-pulse">
        <p className="text-gray-500">Diagramm wird geladen...</p>
      </div>
    ),
    ssr: false // Charts don't need SSR
  }
)
```

### Pattern 2: Parallel Data Fetching in Client Components
**What:** Use `Promise.all` to fetch independent data sources simultaneously
**When to use:** Multiple independent API calls in same component
**Example:**
```typescript
// Current pattern in dashboard/projekte/page.tsx
const [projectsRes, tasksRes] = await Promise.all([
  fetch(projectsUrl),
  fetch(tasksUrl),
])
```

### Pattern 3: Preload Pattern for Server Components
**What:** Initiate data fetches before component renders
**When to use:** Server Components with sequential dependencies
**Example:**
```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns
export const preload = (id: string) => {
  void getItem(id) // Start fetch, don't await
}

export default async function Page({ params }) {
  preload(params.id)
  const isAvailable = await checkIsAvailable()
  // getItem result is ready or nearly ready
  return isAvailable ? <Item id={params.id} /> : null
}
```

### Anti-Patterns to Avoid
- **Lazy loading everything:** Too many chunks create network overhead. Target components > 30KB.
- **Using `React.lazy` instead of `next/dynamic`:** `React.lazy` doesn't support SSR in Next.js.
- **Waterfall fetches in client components:** Sequential `await` blocks cause slow page loads.
- **`ssr: false` in Server Components:** This option only works in Client Components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Code splitting | Manual webpack config | `next/dynamic` | Next.js handles chunking automatically |
| Loading states for async components | Custom loading logic | `loading` option in dynamic() | Built-in, consistent pattern |
| Bundle analysis | Custom size tracking | @next/bundle-analyzer | Already configured in project |
| Request deduplication | Manual caching | React `cache()` | Already implemented in Phase 32 |

**Key insight:** Next.js 16 with App Router handles most optimization automatically. The work is identifying what to lazy load and ensuring parallel fetches, not building infrastructure.

## Common Pitfalls

### Pitfall 1: Forgetting Named Export Handling
**What goes wrong:** Dynamic import fails silently or returns undefined
**Why it happens:** `next/dynamic` expects default exports by default
**How to avoid:** Extract named exports explicitly:
```typescript
const Chart = dynamic(() =>
  import('../components/Chart').then((mod) => mod.BudgetImpactChart)
)
```
**Warning signs:** Component renders as null, no error in console

### Pitfall 2: Missing Loading Fallbacks
**What goes wrong:** Flash of empty content or layout shift (CLS impact)
**Why it happens:** No visual placeholder while chunk loads
**How to avoid:** Always provide loading component with correct dimensions:
```typescript
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <div className="w-full h-[400px] bg-gray-100 animate-pulse" />
})
```
**Warning signs:** CLS increases after implementing lazy loading

### Pitfall 3: Over-splitting Charts
**What goes wrong:** Multiple network requests for related chart components
**Why it happens:** Each chart imports Recharts separately
**How to avoid:** Group related charts if they appear together:
```typescript
// Instead of separate dynamics for each chart
const AnalyticsCharts = dynamic(() => import('./AnalyticsCharts'))
// Where AnalyticsCharts renders multiple charts from one chunk
```
**Warning signs:** Network waterfall shows many small chunk requests

### Pitfall 4: Client Component Layout Blocking
**What goes wrong:** Dashboard layout blocks all child rendering while loading session
**Why it happens:** `useSession` hook fetches data synchronously in layout
**How to avoid:** Current pattern is acceptable (shows skeleton), but could move to per-page auth checks if needed
**Warning signs:** LCP delayed until session fetch completes

### Pitfall 5: Sequential Fetches in useEffect
**What goes wrong:** Data loads one after another, increasing perceived load time
**Why it happens:** Multiple `await` statements in sequence
**How to avoid:** Use `Promise.all` for independent fetches:
```typescript
// Bad
useEffect(() => {
  const data1 = await fetch('/api/a')
  const data2 = await fetch('/api/b')  // Waits for first
}, [])

// Good
useEffect(() => {
  const [data1, data2] = await Promise.all([
    fetch('/api/a'),
    fetch('/api/b')
  ])
}, [])
```
**Warning signs:** Network tab shows sequential request pattern

## Code Examples

### Lazy Loading TipTap Editor (PERF-07)
```typescript
// Source: https://github.com/ueberdosis/tiptap/issues/1447
'use client'

import dynamic from 'next/dynamic'
import type { ArticleEditorProps } from '@/components/knowledge/ArticleEditor'

// Lazy load entire editor bundle (~292KB)
const ArticleEditor = dynamic(
  () => import('@/components/knowledge/ArticleEditor').then(mod => mod.ArticleEditor),
  {
    loading: () => (
      <div className="border rounded-lg overflow-hidden">
        <div className="h-12 bg-gray-50 border-b animate-pulse" />
        <div className="min-h-[300px] p-4 bg-gray-100 animate-pulse" />
      </div>
    ),
    ssr: false // TipTap uses browser APIs
  }
)

export default function ArticleEditPage() {
  return <ArticleEditor initialContent={content} onChange={handleChange} />
}
```

### Lazy Loading Recharts Charts (PERF-07)
```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading
'use client'

import dynamic from 'next/dynamic'

const BudgetImpactChart = dynamic(
  () => import('@/components/change-orders/BudgetImpactChart').then(mod => mod.BudgetImpactChart),
  {
    loading: () => (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border animate-pulse">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-2 text-sm">Diagramm wird geladen...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)
```

### Parallel Data Fetching Pattern (PERF-05)
```typescript
// Already implemented in several pages - standardize this pattern
'use client'

import { useState, useEffect, useCallback } from 'react'

export default function DashboardPage() {
  const [data, setData] = useState({ projects: [], tasks: [], stats: null })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Parallel fetching - all requests start simultaneously
    const [projectsRes, tasksRes, statsRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/tasks'),
      fetch('/api/stats'),
    ])

    const [projects, tasks, stats] = await Promise.all([
      projectsRes.json(),
      tasksRes.json(),
      statsRes.json(),
    ])

    setData({ projects, tasks, stats })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ...
}
```

### Server Component Parallel Fetching (PERF-05)
```typescript
// Source: https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns
// Already correctly implemented in: /dashboard/kosten/wohnungen/[id]/page.tsx

export default async function Page({ params }: PageProps) {
  const { id } = await params

  // Sequential: Must complete before parallel
  const costSummary = await getUnitCostSummary(id)
  if (!costSummary) notFound()

  // Parallel: Independent fetches start together
  const [projectsData, expensesData, unitData] = await Promise.all([
    getUnitProjectCosts(id),
    getUnitDirectExpenses(id),
    fetchUnitBuilding(id)
  ])

  return <Page data={{ costSummary, projectsData, expensesData, unitData }} />
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React.lazy + Suspense | next/dynamic | Next.js 13+ | SSR support, simpler API |
| Manual code splitting | Automatic route splitting | Next.js 13 App Router | Zero config for routes |
| Client-side data fetching | Server Components | Next.js 13+ | Faster TTFB, smaller bundles |
| useLayoutEffect for hydration | immediatelyRender: false | TipTap 2.x | Prevents SSR hydration errors |

**Deprecated/outdated:**
- Using `React.lazy()` directly in Next.js (use `next/dynamic` instead)
- `ssr: false` in Server Components (throws error in Next.js 16)

## Codebase Analysis

### Current Bundle Composition (from Phase 31)
| Component | Size | Location | Lazy Loadable |
|-----------|------|----------|---------------|
| Recharts | 337KB | 3 chart components | YES - used on specific pages |
| TipTap/ProseMirror | 292KB | ArticleEditor, ArticleViewer | YES - used on 4 pages |
| Supabase | 177KB | Throughout | NO - core dependency |

### Pages Using Heavy Components
| Page | Heavy Component | Current Pattern |
|------|-----------------|-----------------|
| `/dashboard/aenderungsauftraege/[id]` | BudgetImpactChart | Direct import |
| `/dashboard/lieferanten/analytics/preise` | PriceHistoryChart | Direct import |
| `/dashboard/lieferanten/analytics/verbrauch` | ConsumptionPatternChart | Direct import |
| `/dashboard/knowledge/new` | ArticleEditor | Direct import |
| `/dashboard/knowledge/[id]/edit` | ArticleEditor | Direct import |
| `/templates/[id]` | GanttPreview | Already lazy loaded |

### Existing Lazy Loading (Good Pattern)
The template detail page already implements lazy loading correctly:
```typescript
// src/app/templates/[id]/page.tsx
const GanttPreview = lazy(() =>
  import('@/components/templates/GanttPreview').then(mod => ({ default: mod.GanttPreview }))
)
```

### Layout Analysis
| Layout | Dynamic APIs | Static Eligible |
|--------|--------------|-----------------|
| Root `/layout.tsx` | None | YES |
| Dashboard `/dashboard/layout.tsx` | Client Component (useSession) | N/A - client rendered |
| Portal `/portal/layout.tsx` | `getSetting()` - DB query | NO (intentional) |
| Contractor `/contractor/[token]/layout.tsx` | None | YES |

**Key insight:** Dashboard layout is a Client Component by design (needs useSession hook). This is acceptable as it shows a skeleton while loading. The portal layout makes a server-side DB call which is fine for personalization.

### Data Fetching Patterns
| Page | Pattern | Parallel | Improvement Opportunity |
|------|---------|----------|-------------------------|
| `/dashboard/page.tsx` | Client fetch | YES (Promise.all) | None - already optimal |
| `/dashboard/projekte/page.tsx` | Client fetch | YES (Promise.all) | None - already optimal |
| `/dashboard/liegenschaft/page.tsx` | Client fetch | Needs audit | Potential |
| `/dashboard/kosten/wohnungen/[id]` | Server fetch | YES (Promise.all) | None - already optimal |

## Verification Checklist

### PERF-05: Parallel Data Fetching
- [ ] Audit all dashboard pages for sequential fetch patterns
- [ ] Network DevTools shows parallel requests (not waterfall)
- [ ] Use Promise.all for independent fetches

### PERF-06: Dynamic API Audit
- [ ] Run `npm run build` and check for "Dynamic" routes
- [ ] Verify layouts don't call cookies()/headers() directly
- [ ] Document which routes must be dynamic (auth pages, etc.)

### PERF-07: Heavy Component Lazy Loading
- [ ] BudgetImpactChart wrapped with next/dynamic
- [ ] ConsumptionPatternChart wrapped with next/dynamic
- [ ] PriceHistoryChart wrapped with next/dynamic
- [ ] ArticleEditor wrapped with next/dynamic
- [ ] ArticleViewer wrapped with next/dynamic
- [ ] Bundle analyzer shows 100+ KB reduction

### Success Metrics
- LCP improved by 20%+ (from 3204ms baseline)
- Bundle reduced by 100+ KB client JS
- Network waterfall eliminated on dashboard pages

## Open Questions

1. **ArticleViewer lazy loading**
   - What we know: Used for viewing articles, may be on contractor portal
   - What's unclear: Whether contractor portal performance is in scope
   - Recommendation: Include in lazy loading anyway - consistent pattern

2. **Recharts tree shaking**
   - What we know: Recharts supports tree shaking since 2020, but bundle still large
   - What's unclear: Whether selective imports would reduce size further
   - Recommendation: Lazy loading is more impactful; tree shaking is secondary

## Sources

### Primary (HIGH confidence)
- [Next.js Lazy Loading Guide](https://nextjs.org/docs/app/guides/lazy-loading) - Official documentation
- [Next.js Data Fetching Patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns) - Parallel fetching patterns
- [TipTap Lazy Load Issue #1447](https://github.com/ueberdosis/tiptap/issues/1447) - Dynamic import solution

### Secondary (MEDIUM confidence)
- [Recharts Bundle Size Issue #1417](https://github.com/recharts/recharts/issues/1417) - Tree shaking status
- [Next.js Dynamic Headers/Cookies Discussion](https://github.com/vercel/next.js/discussions/49708) - PPR and static optimization

### Tertiary (LOW confidence)
- Various Medium articles on bundle optimization - General patterns, not verified with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Next.js documentation verified
- Architecture: HIGH - Patterns from official docs + existing codebase analysis
- Pitfalls: MEDIUM - Mix of official guidance and community knowledge

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable patterns)
