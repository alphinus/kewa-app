---
phase: 31-performance-profiling
plan: 01
subsystem: infra
tags: [vercel, speed-insights, bundle-analyzer, lighthouse, puppeteer, rum]

# Dependency graph
requires:
  - phase: 30-security-audit
    provides: CSP headers baseline for modification
provides:
  - "@vercel/speed-insights for Real User Monitoring"
  - "@next/bundle-analyzer for bundle visualization"
  - "@lhci/cli for Lighthouse CI"
  - "puppeteer for authenticated page testing"
  - "analyze npm script for bundle reports"
affects: [31-02-lighthouse-baseline, 33-bundle-optimization]

# Tech tracking
tech-stack:
  added: ["@vercel/speed-insights", "@next/bundle-analyzer", "@lhci/cli", "puppeteer", "cross-env"]
  patterns: ["HOC config wrapper for conditional tooling"]

key-files:
  created: []
  modified: ["package.json", "src/app/layout.tsx", "next.config.ts"]

key-decisions:
  - "cross-env for Windows-compatible ANALYZE=true script"
  - "openAnalyzer: false to avoid auto-open in CI environments"

patterns-established:
  - "Config HOC pattern: wrap nextConfig with bundleAnalyzer() for conditional tooling"

# Metrics
duration: 5min
completed: 2026-02-05
---

# Phase 31 Plan 01: Performance Tooling Summary

**Vercel Speed Insights RUM integration with bundle analyzer HOC and Lighthouse CI tooling**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-05T14:30:00Z
- **Completed:** 2026-02-05T14:35:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Installed 5 performance tooling packages (speed-insights, bundle-analyzer, lhci/cli, puppeteer, cross-env)
- Added SpeedInsights component to root layout for production RUM
- Wrapped next.config.ts with bundle analyzer HOC
- Updated CSP to allow vitals.vercel-insights.com
- Added npm analyze script with Windows compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Install performance dependencies** - `1e740cf` (chore)
2. **Task 2: Integrate Speed Insights and Bundle Analyzer** - `e2b8cde` (feat)

## Files Created/Modified
- `package.json` - Added 5 packages and analyze script
- `src/app/layout.tsx` - SpeedInsights component after Toaster
- `next.config.ts` - Bundle analyzer HOC wrapper, CSP update

## Decisions Made
- Used cross-env for Windows-compatible ANALYZE=true script (npm native env vars don't work on Windows)
- Set openAnalyzer: false to prevent browser auto-open during CI builds

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Speed Insights auto-detects Vercel environment.

## Next Phase Readiness
- Performance tooling installed and integrated
- Ready for 31-02 Lighthouse baseline measurement
- Bundle analyzer available via `npm run analyze`

---
*Phase: 31-performance-profiling*
*Completed: 2026-02-05*
