---
phase: 31-performance-profiling
plan: 03
subsystem: infra
tags: [lighthouse, bundle-analyzer, core-web-vitals, baseline, performance-metrics]

# Dependency graph
requires:
  - phase: 31-01
    provides: Performance tooling (speed-insights, bundle-analyzer, lhci)
  - phase: 31-02
    provides: Lighthouse CI config and thresholds
provides:
  - "Performance baseline JSON with CWV metrics"
  - "Bundle analysis with top 10 dependency breakdown"
  - "Gitignored raw Lighthouse reports structure"
affects: [32-database-optimization, 33-bundle-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Baseline documentation pattern for Phase 32/33 comparison"]

key-files:
  created:
    - .planning/baselines/.gitignore
    - .planning/baselines/v3.1-phase31-baseline.json
    - .planning/baselines/v3.1-phase31-baseline.md
  modified: []

key-decisions:
  - "Use median of 3 runs for stable baseline metrics"
  - "TBT used as INP proxy in synthetic Lighthouse testing"
  - "Bundle sizes estimated from chunk analysis since tree-shaking affects final size"

patterns-established:
  - "Baseline documentation pattern: JSON for machine-readable, MD for human-readable"
  - "Gitignore raw reports, track only summary baselines"

# Metrics
duration: 29min
completed: 2026-02-05
---

# Phase 31 Plan 03: Baseline Metrics Collection Summary

**Lighthouse CWV baseline (performance 83, LCP 3204ms) with 2.27MB bundle analysis showing recharts/prosemirror/supabase as top contributors**

## Performance

- **Duration:** 29 min
- **Started:** 2026-02-05T08:49:24Z
- **Completed:** 2026-02-05T09:18:42Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Ran 3 Lighthouse CI runs on /login page with median value extraction
- Analyzed bundle composition via webpack build (Turbopack default doesn't support analyzer)
- Created machine-readable JSON and human-readable MD baseline documents
- Identified top 10 dependencies by bundle impact for Phase 33 optimization targets

## Task Commits

Each task was committed atomically:

1. **Task 1: Run Lighthouse baseline collection** - `bbeecfc` (chore)
2. **Task 2: Run bundle analysis** - No commit (data gathering only)
3. **Task 3: Document baseline metrics** - `2552274` (docs)

## Files Created/Modified
- `.planning/baselines/.gitignore` - Excludes raw Lighthouse reports
- `.planning/baselines/v3.1-phase31-baseline.json` - Machine-readable metrics
- `.planning/baselines/v3.1-phase31-baseline.md` - Human-readable summary

## Decisions Made
- Used port 3004 for Lighthouse testing (3000-3003 in use by other sessions)
- Webpack mode required for bundle analyzer (Turbopack not compatible)
- Estimated bundle sizes from chunk analysis rather than node_modules sizes (tree-shaking)
- Median values used for baseline stability (Run 2 was outlier with 93 score)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Lighthouse temp cleanup error on Windows** - Non-blocking; reports generated successfully despite EPERM error on cleanup
- **Port conflicts** - Resolved by using port 3004 (3000-3003 occupied)
- **Turbopack incompatible with bundle-analyzer** - Used `--webpack` flag as documented in Next.js 16

## User Setup Required

None - baseline collection is a documentation task with no external dependencies.

## Next Phase Readiness
- Baseline metrics captured for Phase 32/33 comparison
- Key optimization targets identified:
  - Recharts (337KB) - largest single dependency
  - ProseMirror/TipTap (292KB) - lazy load opportunity
  - Supabase (177KB) - consider splitting auth/realtime
  - TBT at 338ms needs reduction to meet 200ms target

---
*Phase: 31-performance-profiling*
*Completed: 2026-02-05*
