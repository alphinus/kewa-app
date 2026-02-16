# Phase 31: Performance Profiling & Baseline — Context

## Phase Scope

**Goal:** Current performance measured with tooling in place to detect regressions

**Requirements:** PERF-01, PERF-02

**Success Criteria:**
1. Lighthouse reports for key pages with baseline scores documented
2. Bundle analysis identifying top 10 largest dependencies with sizes
3. Vercel Speed Insights integrated for real user monitoring

---

## Decisions

### 1. Baseline Documentation

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage location | `.planning/baselines/` | Industry standard, keeps perf data separate from code |
| Format | JSON + Markdown | JSON for automation/diffing, MD table in summary for humans |
| Raw Lighthouse exports | Gitignored | Generate full reports but only commit summary metrics |
| Update frequency | After each perf phase | Track delta across 31 → 32 → 33 |

**File structure:**
```
.planning/baselines/
├── v3.1-phase31-baseline.json    # Machine-readable metrics
├── v3.1-phase31-baseline.md      # Human-readable summary
└── .gitignore                    # Exclude *.lighthouse.json
```

### 2. Pages to Profile

| Page | Route | Auth State | Purpose |
|------|-------|------------|---------|
| Login | `/login` | Unauthenticated | First impression, critical path |
| Dashboard | `/dashboard` | Authenticated | Main landing after login |
| Projects List | `/projects` | Authenticated | Heavy data load, common view |
| Project Detail | `/projects/[id]` | Authenticated | Single project overview |
| Inspection List | `/projects/[id]/units/[unitId]/inspections` | Authenticated | List view with data |

**Total:** 5 pages (1 unauthenticated, 4 authenticated)

### 3. Performance Thresholds

| Metric | Target | Enforcement |
|--------|--------|-------------|
| Lighthouse Performance Score | ≥ 75 | Warning (no deployment block) |
| LCP (Largest Contentful Paint) | < 4.0s | Warning |
| INP (Interaction to Next Paint) | < 200ms | Warning |
| CLS (Cumulative Layout Shift) | < 0.1 | Warning |

**Regression definition:** Flag when any page drops below absolute threshold (75 score), not on small variance.

**Note:** For B2B internal apps, 4.0s LCP is acceptable given authenticated state and data complexity. Google's 2.5s "good" threshold targets public marketing pages.

### 4. CI Integration

| Decision | Choice | Notes |
|----------|--------|-------|
| Automated checks | Yes, every PR | GitHub Actions workflow |
| CI provider | GitHub Actions | Vercel CI doesn't include Lighthouse |
| Report artifacts | Yes, stored | HTML reports downloadable from CI |
| PR comments | Yes | Post metrics summary on PR |
| Deployment blocking | No | Warning only, allow deployment |

**Vercel Speed Insights:** Check if already enabled; if not, add `@vercel/speed-insights` package and component.

---

## Research Questions for Planner

1. Is `@vercel/speed-insights` already installed and configured?
2. What's the current GitHub Actions setup (if any)?
3. Which Lighthouse CI tool to use: `lighthouse-ci` or `@lhci/cli`?
4. How to authenticate Lighthouse for protected routes?

---

## Out of Scope (Deferred)

- Actual performance optimization (Phase 32, 33)
- Database query profiling (Phase 32)
- Bundle size reduction (Phase 33)
- Setting up performance budgets in CI (future milestone)

---

## Next Steps

1. `/gsd:plan-phase 31` — Research and create execution plans
2. Execute plans to establish baseline
3. Document baseline metrics for comparison in Phase 32/33

---

*Created: 2026-02-05 via /gsd:discuss-phase*
