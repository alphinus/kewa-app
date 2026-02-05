---
phase: 31-performance-profiling
plan: 02
subsystem: infra
tags: [lighthouse, github-actions, ci, performance, bundle-analysis, puppeteer]

# Dependency graph
requires:
  - phase: 31-01
    provides: Vercel Speed Insights integration
provides:
  - Lighthouse CI configuration with thresholds
  - Authenticated page testing script
  - GitHub Actions workflows for performance regression detection
  - Bundle analysis workflow with PR comments
affects: [33-bundle-optimization, perf-monitoring]

# Tech tracking
tech-stack:
  added: [treosh/lighthouse-ci-action@v12, puppeteer]
  patterns: [CI performance testing, threshold-based assertions]

key-files:
  created:
    - lighthouserc.js
    - scripts/lighthouse-auth.js
    - .github/workflows/lighthouse-ci.yml
    - .github/workflows/bundle-analysis.yml
  modified:
    - package.json

key-decisions:
  - "Performance >= 75 score threshold with warn (not error)"
  - "LCP < 4000ms, CLS < 0.1, TTI < 7000ms thresholds"
  - "temporary-public-storage for Lighthouse reports"
  - "3 runs per URL for stability"

patterns-established:
  - "GitHub Actions workflow pattern for performance CI"
  - "Puppeteer-based authenticated page testing"

# Metrics
duration: 4min
completed: 2026-02-05
---

# Phase 31 Plan 02: Lighthouse CI Configuration Summary

**Lighthouse CI with treosh action, Puppeteer auth script, and GitHub Actions workflows for performance regression detection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-05T08:36:11Z
- **Completed:** 2026-02-05T08:40:XX Z
- **Tasks:** 2
- **Files created:** 4
- **Files modified:** 1

## Accomplishments
- Lighthouse CI config with performance thresholds (>=75 score, <4s LCP, <0.1 CLS)
- Puppeteer-based script for authenticated page testing locally
- GitHub Actions workflow running Lighthouse on every push/PR
- Bundle analysis workflow with PR comment integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Lighthouse CI configuration** - `265678f` (feat)
2. **Task 2: Create GitHub Actions workflows** - `25ed5bf` (feat)

## Files Created/Modified
- `lighthouserc.js` - Lighthouse CI config with thresholds and assertions
- `scripts/lighthouse-auth.js` - Puppeteer login and authenticated page testing
- `.github/workflows/lighthouse-ci.yml` - treosh/lighthouse-ci-action workflow
- `.github/workflows/bundle-analysis.yml` - Bundle manifest upload and PR comments
- `package.json` - Added lighthouse:auth script

## Decisions Made
- Performance score threshold at 75 with warn (not blocking) - appropriate for internal B2B app
- LCP threshold at 4000ms (vs Google's 2500ms) - reasonable for authenticated data-heavy pages
- 3 runs per URL for measurement stability
- temporary-public-storage for reports (free tier, no LHCI server needed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**For running authenticated page tests locally:**
- Install puppeteer: `npm install puppeteer --save-dev`
- Set `LIGHTHOUSE_TEST_PIN` env var with valid PIN
- Update dynamic route IDs in `scripts/lighthouse-auth.js` with actual test data IDs

**For CI workflows:**
- GitHub Actions runs automatically on push/PR
- No additional secrets required (uses temporary-public-storage)

## Next Phase Readiness
- Performance CI pipeline ready for regression detection
- Baseline metrics can be captured in 31-01 (Speed Insights) or manually
- Ready for Phase 32 (Database Optimization) and Phase 33 (Bundle Optimization)

---
*Phase: 31-performance-profiling*
*Completed: 2026-02-05*
