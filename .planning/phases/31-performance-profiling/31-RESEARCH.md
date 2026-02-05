# Phase 31: Performance Profiling & Baseline - Research

**Researched:** 2026-02-05
**Domain:** Web Performance Profiling, Core Web Vitals, CI/CD Performance Testing
**Confidence:** HIGH

## Summary

This phase establishes performance baselines using Lighthouse CI for synthetic testing, Vercel Speed Insights for real user monitoring (RUM), and bundle analysis for dependency tracking. The research confirms that:

1. **Lighthouse CI** via `@lhci/cli` is the standard tool for automated Lighthouse audits in CI environments. The `treosh/lighthouse-ci-action@v12` GitHub Action provides the most streamlined integration with PR comments and artifact storage.

2. **Vercel Speed Insights** (`@vercel/speed-insights`) is NOT currently installed. It requires the npm package plus enabling in Vercel Dashboard. The `<SpeedInsights />` component goes in the root layout.

3. **Bundle analysis** can be done via `@next/bundle-analyzer` for interactive HTML reports, but for CI integration with PR comments, `hashicorp/nextjs-bundle-analysis` is the established solution.

4. **Authenticated page testing** requires Puppeteer to perform login before Lighthouse runs. The key is `disableStorageReset: true` to preserve session cookies.

**Primary recommendation:** Use treosh/lighthouse-ci-action for GitHub Actions integration, add @vercel/speed-insights to layout, and use hashicorp/nextjs-bundle-analysis for bundle size tracking with PR comments.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@lhci/cli` | 0.15.x | Lighthouse CI runner | Official Google Chrome tool for CI |
| `@vercel/speed-insights` | latest | Real User Monitoring | Native Vercel integration, zero-config |
| `@next/bundle-analyzer` | latest | Interactive bundle visualization | Official Next.js plugin |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `treosh/lighthouse-ci-action` | v12 | GitHub Actions wrapper | PR comments, artifact storage |
| `hashicorp/nextjs-bundle-analysis` | latest | Bundle size tracking | PR comments, regression detection |
| `puppeteer` | latest | Browser automation | Authenticated page testing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| treosh/lighthouse-ci-action | Direct @lhci/cli | More control but more config |
| hashicorp/nextjs-bundle-analysis | @next/bundle-analyzer | No CI integration, manual only |
| Vercel Speed Insights | PostHog/Fathom | Self-hosted, more config, less integration |

**Installation:**
```bash
npm install --save-dev @lhci/cli puppeteer
npm install @vercel/speed-insights
npx -p nextjs-bundle-analysis generate
```

## Architecture Patterns

### Recommended Project Structure
```
.planning/baselines/
├── v3.1-phase31-baseline.json    # Machine-readable metrics
├── v3.1-phase31-baseline.md      # Human-readable summary
└── .gitignore                    # Exclude *.lighthouse.json

.github/workflows/
├── lighthouse-ci.yml             # Lighthouse CI workflow
└── next_bundle_analysis.yml      # Bundle analysis workflow

lighthouserc.js                   # Lighthouse CI configuration
```

### Pattern 1: Lighthouse CI Configuration with Authentication
**What:** Configure Lighthouse CI to handle authenticated routes via Puppeteer
**When to use:** For all authenticated dashboard pages
**Example:**
```javascript
// lighthouserc.js
// Source: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/login'], // Unauthenticated
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      settings: {
        chromeFlags: '--disable-gpu --no-sandbox',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.75 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'interaction-to-next-paint': ['warn', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Pattern 2: Puppeteer Authentication Script
**What:** Login before running Lighthouse on protected routes
**When to use:** For dashboard, projects, inspections pages
**Example:**
```javascript
// scripts/lighthouse-auth.js
// Source: https://github.com/GoogleChrome/lighthouse/blob/main/docs/recipes/auth/README.md
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');

const TEST_PIN = process.env.LIGHTHOUSE_TEST_PIN;

async function runLighthouseWithAuth(url) {
  const browser = await puppeteer.launch({
    args: ['--remote-debugging-port=9222'],
    headless: 'new',
  });

  const page = await browser.newPage();

  // Navigate to login
  await page.goto('http://localhost:3000/login');

  // Fill PIN form
  await page.type('input[type="password"]', TEST_PIN);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation(),
  ]);

  // Run Lighthouse with authenticated session
  const result = await lighthouse(url, {
    port: 9222,
    disableStorageReset: true,
  });

  await browser.close();
  return result;
}
```

### Pattern 3: Vercel Speed Insights Integration
**What:** Add RUM to root layout
**When to use:** Once, in app/layout.tsx
**Example:**
```typescript
// src/app/layout.tsx
// Source: https://vercel.com/docs/speed-insights/quickstart
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Anti-Patterns to Avoid
- **Running Lighthouse without multiple runs:** Single runs are flaky. Always use `numberOfRuns: 3` minimum.
- **Blocking deploys on Lighthouse scores:** For B2B apps, use warnings only. Hard blocks cause deployment friction.
- **Testing with storage reset on authenticated pages:** Always pass `disableStorageReset: true` for auth flows.
- **Storing full Lighthouse HTML reports in git:** Only commit summary JSON. Full reports go to artifacts.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lighthouse in CI | Custom node scripts | treosh/lighthouse-ci-action | Handles artifacts, comments, caching |
| Bundle size tracking | Manual diff scripts | hashicorp/nextjs-bundle-analysis | PR comments, baseline management |
| RUM collection | Custom Web Vitals script | @vercel/speed-insights | Auto-integration with Vercel Dashboard |
| Baseline comparison | Manual JSON diff | LHCI server or temporary-public-storage | Built-in visualization and trends |
| Auth for Lighthouse | Custom cookie injection | Puppeteer + form login | Recommended by Lighthouse team |

**Key insight:** Performance tooling is mature. Manual solutions miss edge cases like CI caching, flaky test handling, and baseline drift detection.

## Common Pitfalls

### Pitfall 1: Lighthouse Score Variance
**What goes wrong:** Same page shows different scores between runs (e.g., 72 vs 85)
**Why it happens:** CPU throttling, network conditions, and timing vary in CI environments
**How to avoid:** Run 3+ times and use median. Configure `numberOfRuns: 3` in lighthouserc.js
**Warning signs:** Flaky CI failures on performance assertions

### Pitfall 2: Authentication Session Loss
**What goes wrong:** Lighthouse loads login page instead of authenticated page
**Why it happens:** Lighthouse resets storage by default
**How to avoid:** Pass `disableStorageReset: true` when using Puppeteer
**Warning signs:** All authenticated page audits show login page metrics

### Pitfall 3: Missing Speed Insights Data
**What goes wrong:** Vercel Dashboard shows no Speed Insights data
**Why it happens:** Script doesn't run in development mode; needs Vercel deployment
**How to avoid:** Deploy to Vercel preview/production to see data. Local dev shows nothing.
**Warning signs:** Check network tab for `/_vercel/speed-insights/script.js`

### Pitfall 4: Bundle Analyzer Opening Browsers in CI
**What goes wrong:** CI hangs or fails when running bundle analyzer
**Why it happens:** `@next/bundle-analyzer` opens browser tabs by default
**How to avoid:** Set `openAnalyzer: false` in next.config.ts for CI environments
**Warning signs:** CI timeout without completion

### Pitfall 5: Baseline Drift Without Tracking
**What goes wrong:** Performance degrades slowly over time without anyone noticing
**Why it happens:** No baseline comparison, only checking absolute thresholds
**How to avoid:** Store baselines in `.planning/baselines/` and compare after each phase
**Warning signs:** Gradually increasing load times across releases

## Code Examples

Verified patterns from official sources:

### GitHub Actions Workflow for Lighthouse CI
```yaml
# .github/workflows/lighthouse-ci.yml
# Source: https://github.com/treosh/lighthouse-ci-action
name: Lighthouse CI
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: './lighthouserc.js'
          uploadArtifacts: true
          temporaryPublicStorage: true
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Next.js Bundle Analyzer Configuration
```typescript
// next.config.ts with bundle analyzer
// Source: https://nextjs.org/docs/app/guides/package-bundling
import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false, // Don't auto-open in CI
});

const nextConfig: NextConfig = {
  // existing config
};

export default bundleAnalyzer(nextConfig);
```

### Baseline JSON Schema
```json
{
  "version": "v3.1-phase31",
  "date": "2026-02-05",
  "pages": {
    "/login": {
      "performance": 85,
      "lcp": 1200,
      "inp": 120,
      "cls": 0.05,
      "bundleSize": 245000
    },
    "/dashboard": {
      "performance": 78,
      "lcp": 2400,
      "inp": 150,
      "cls": 0.08,
      "bundleSize": 380000
    }
  },
  "topDependencies": [
    { "name": "react-dom", "size": 42000 },
    { "name": "@tiptap/core", "size": 38000 }
  ]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FID (First Input Delay) | INP (Interaction to Next Paint) | March 2024 | INP is now Core Web Vital |
| Manual Lighthouse runs | Lighthouse CI in GitHub Actions | 2020 | Automated regression detection |
| Google Analytics RUM | Vercel Speed Insights / web-vitals | 2023 | Framework-native, privacy-focused |
| webpack-bundle-analyzer | @next/bundle-analyzer + CI actions | 2022 | Integrated PR comments |

**Deprecated/outdated:**
- **FID metric:** Replaced by INP as Core Web Vital in March 2024
- **lighthouse npm package directly:** Use @lhci/cli for CI environments
- **Manual performance budgets:** Use LHCI assertions instead

## Open Questions

Things that couldn't be fully resolved:

1. **Authenticated page testing in GitHub Actions**
   - What we know: Puppeteer works locally with form login
   - What's unclear: Whether GitHub Actions environment supports headful Chrome for complex auth
   - Recommendation: Start with login page only (unauthenticated), add authenticated pages incrementally with headless Chrome

2. **LHCI Server vs Temporary Storage**
   - What we know: Temporary public storage is free, auto-deletes after 7 days
   - What's unclear: Whether long-term trend tracking is needed for this project
   - Recommendation: Start with temporary-public-storage, consider LHCI server later if trends needed

3. **Bundle size for top 10 dependencies**
   - What we know: @next/bundle-analyzer provides HTML visualization
   - What's unclear: Best way to extract machine-readable JSON for top 10 dependencies
   - Recommendation: Parse .next/build-manifest.json and compute sizes manually, or use hashicorp action output

## Sources

### Primary (HIGH confidence)
- [Lighthouse CI GitHub Repository](https://github.com/GoogleChrome/lighthouse-ci) - Getting started, configuration
- [Vercel Speed Insights Quickstart](https://vercel.com/docs/speed-insights/quickstart) - Next.js integration
- [Lighthouse Authenticated Pages](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md) - Puppeteer auth flow
- [treosh/lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action) - GitHub Action configuration

### Secondary (MEDIUM confidence)
- [HashiCorp nextjs-bundle-analysis](https://github.com/hashicorp/nextjs-bundle-analysis) - Bundle tracking action
- [Next.js Bundle Analyzer Docs](https://nextjs.org/docs/app/guides/package-bundling) - Official plugin setup

### Tertiary (LOW confidence)
- WebSearch results for CI patterns - Community approaches, needs validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official tools from Google Chrome, Vercel, Next.js
- Architecture: HIGH - Patterns from official documentation
- Pitfalls: MEDIUM - Combination of official docs and community experience

**Research date:** 2026-02-05
**Valid until:** 60 days (performance tooling is stable)

---

## Codebase-Specific Findings

### Current State
| Item | Status |
|------|--------|
| `@vercel/speed-insights` | NOT installed |
| GitHub Actions workflows | None exist |
| Lighthouse configuration | None exists |
| Bundle analyzer | NOT configured |
| Authentication | PIN-based via `/api/auth/login`, session cookie |

### Pages to Profile (from CONTEXT.md)
| Page | Route | Auth | Notes |
|------|-------|------|-------|
| Login | `/login` | No | First impression, simple form |
| Dashboard | `/dashboard` | Yes | Main landing, needs Puppeteer |
| Projects List | `/dashboard/projekte` | Yes | Heavy data load |
| Project Detail | `/dashboard/projekte/[id]` | Yes | Single project |
| Inspections | `/dashboard/abnahmen` | Yes | List view |

### Required Environment Variables
```bash
# For authenticated Lighthouse testing
LIGHTHOUSE_TEST_PIN=<4-digit-test-pin>

# For GitHub status checks (optional)
LHCI_GITHUB_APP_TOKEN=<from-lighthouse-ci-github-app>
```

### Integration Points
- **next.config.ts**: Add bundle analyzer wrapper
- **src/app/layout.tsx**: Add `<SpeedInsights />` component
- **.github/workflows/**: Create lighthouse-ci.yml and next_bundle_analysis.yml
- **lighthouserc.js**: Create Lighthouse CI config at project root
