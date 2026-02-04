# Technology Stack: Production Hardening

**Project:** KeWa-App (Property Management SaaS)
**Researched:** 2026-02-04
**Context:** 110K LOC Next.js 16 app requiring performance, security, and i18n cleanup

## Recommended Stack

### 1. Performance Profiling & Monitoring

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js Bundle Analyzer (experimental) | Built-in 16.1+ | Bundle size analysis with Turbopack | Native Turbopack integration, module graph awareness, shows import stack | HIGH |
| @vercel/speed-insights | Latest | Real-time Web Vitals monitoring | Zero-config Vercel integration, tracks LCP/FID/CLS from real users | HIGH |
| Lighthouse CI | Latest | CI/CD performance regression testing | Industry standard, prevents regressions, GitHub Actions integration | HIGH |
| bundle-phobia-cli | Latest | Pre-installation package size checking | Prevents bloat before it enters codebase, CLI automation | MEDIUM |

**Installation:**
```bash
npm install -D @lhci/cli
npm install @vercel/speed-insights
npm install -g bundle-phobia-cli
```

**Setup Notes:**
- **Next.js Bundle Analyzer**: Use `next build --experimental-turbopack-bundle-analyzer` (built-in, no package needed)
- **Speed Insights**: Add `<SpeedInsights />` component to root layout
- **Lighthouse CI**: Requires `.lighthouserc.js` config for Next.js server startup
- **BundlePhobia**: Use before `npm install` to check package impact

### 2. Security Auditing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| npm audit | Built-in | Dependency vulnerability scanning | Zero-config, catches CVE/NVD issues, free | HIGH |
| Semgrep OSS | Latest | Static security analysis (SAST) | OWASP Top 10 detection, 250% better true positive rate, Express/NestJS support | HIGH |
| eslint-plugin-security | Latest | ESLint security rules | Lightweight, catches common patterns (eval, SQL injection), integrates with existing ESLint | HIGH |
| OWASP ZAP | Latest | Dynamic security testing (DAST) | Industry standard penetration testing, CI/CD integration, API security testing | MEDIUM |
| Snyk OSS (optional) | Latest | Enhanced dependency scanning | Better coverage than npm audit, automated fixes, free for open source | MEDIUM |

**Installation:**
```bash
# Core security tools
npm install -D eslint-plugin-security
npm install -g @semgrep/cli

# Optional: Snyk for enhanced dependency scanning
npm install -g snyk
```

**Setup Notes:**
- **npm audit**: Run `npm audit --production` to exclude dev dependencies
- **Semgrep**: Use `semgrep --config=auto` for OWASP rule set, supports JavaScript/TypeScript
- **eslint-plugin-security**: Add to `.eslintrc` extends array
- **OWASP ZAP**: Docker container for CI/CD, may report false positives on Next.js eval usage
- **Snyk**: Alternative to npm audit with 25% fewer false positives

### 3. i18n (German Umlaut Cleanup)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js Script (custom) | N/A | One-time ae/oe/ue → ä/ö/ü conversion | Simple find/replace, no runtime overhead | HIGH |
| VS Code Find/Replace | Built-in | Manual verification | No dependencies, precise control | HIGH |

**Recommended Approach: Zero-Dependency Script**

For a German-only app with existing hardcoded strings, a simple Node.js script is sufficient:

```javascript
// scripts/convert-umlauts.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const replacements = [
  { from: /\bae\b/g, to: 'ä' },     // Word boundary to avoid "maestro" → "mästro"
  { from: /\bAe\b/g, to: 'Ä' },
  { from: /\boe\b/g, to: 'ö' },
  { from: /\bOe\b/g, to: 'Ö' },
  { from: /\bue\b/g, to: 'ü' },
  { from: /\bUe\b/g, to: 'Ü' },
  { from: /\bss\b/g, to: 'ß' },
];

const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
  ignore: ['node_modules/**', '.next/**', 'build/**']
});

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    if (content.match(from)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
```

**Why NOT react-i18next or next-intl:**
- German-only UI (no multi-language requirement)
- Existing strings are hardcoded (not in translation files)
- Adding i18n framework creates runtime overhead for zero benefit
- Simple UTF-8 encoding fixes suffice

**If Future Multi-Language Required:**
- **next-intl**: 2.1M weekly downloads, Next.js App Router native support
- **react-i18next**: Most popular (9M+ downloads), but overkill for single language

### 4. Supporting Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| size-limit | Package size enforcement | CI/CD check to prevent bundle bloat |
| webpack-bundle-analyzer | Webpack fallback | If reverting from Turbopack |
| dotenv-vault | Secrets management | If .env needs versioning/encryption |
| TruffleHog | Secrets scanning | CI/CD check for committed credentials |

**Not Recommended:**
```bash
# Don't install these for this project:
npm install react-i18next next-intl  # Overkill for German-only
npm install @next/bundle-analyzer     # Incompatible with Turbopack dev mode
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Bundle Analysis | Next.js experimental analyzer | @next/bundle-analyzer | Webpack-only, incompatible with Turbopack |
| Bundle Analysis | Next.js experimental analyzer | webpack-bundle-analyzer | Turbopack doesn't use Webpack |
| Dependency Scanning | npm audit + Semgrep | Snyk Pro | Costs $99/mo, overkill for single dev |
| Dependency Scanning | npm audit + Semgrep | Socket.dev | Commercial, unnecessary for this scale |
| DAST | OWASP ZAP | Burp Suite Pro | $499/year, ZAP is free and sufficient |
| i18n | Custom script | react-i18next | Runtime overhead for zero benefit |
| i18n | Custom script | next-intl | Requires translation file refactor |
| Performance Monitoring | @vercel/speed-insights | Sentry Performance | $26/mo, Vercel integration is free |
| Performance Monitoring | @vercel/speed-insights | New Relic | Enterprise pricing, overkill |

## Installation Command

```bash
# Performance
npm install @vercel/speed-insights
npm install -D @lhci/cli

# Security
npm install -D eslint-plugin-security
npm install -g @semgrep/cli bundle-phobia-cli

# Optional: Enhanced dependency scanning
npm install -g snyk
```

## Configuration Requirements

### 1. Lighthouse CI (`.lighthouserc.js`)

```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### 2. ESLint Security Plugin (`.eslintrc.json`)

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:security/recommended"
  ],
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn"
  }
}
```

### 3. Vercel Speed Insights (`app/layout.tsx`)

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 4. GitHub Actions: Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

### 5. GitHub Actions: Security Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: auto

      - name: Run ESLint Security
        run: npx eslint . --ext .ts,.tsx,.js,.jsx
```

## Tool Confidence Assessment

| Tool | Confidence | Reasoning |
|------|------------|-----------|
| Next.js Bundle Analyzer | HIGH | Official Next.js 16.1 feature, Turbopack-native |
| @vercel/speed-insights | HIGH | Zero-config Vercel integration, production-proven |
| Lighthouse CI | HIGH | Industry standard since 2019, extensive Next.js usage |
| npm audit | HIGH | Built-in, catches known CVEs, no setup required |
| Semgrep | HIGH | OWASP Top 10 coverage, 250% better detection (2025 improvements) |
| eslint-plugin-security | HIGH | 5M+ downloads/week, catches common patterns |
| OWASP ZAP | MEDIUM | May produce Next.js false positives (eval usage in framework) |
| bundle-phobia-cli | MEDIUM | Community tool, less critical than core monitoring |
| Snyk | MEDIUM | Commercial tool, free tier limited, optional enhancement |
| Custom umlaut script | HIGH | Simple UTF-8 replacement, no dependencies, verified approach |

## Turbopack Compatibility Notes

**Compatible:**
- Next.js experimental bundle analyzer (`next build --experimental-turbopack-bundle-analyzer`)
- Lighthouse CI (tests production build)
- Semgrep (static analysis, bundler-agnostic)
- ESLint plugins (runtime-agnostic)
- Speed Insights (runtime monitoring)

**Incompatible:**
- `@next/bundle-analyzer` (Webpack-only, throws warning with `next dev --turbopack`)
- `webpack-bundle-analyzer` (Webpack-only)

**Workaround for Legacy Tools:**
Build with Turbopack, analyze with Next.js experimental analyzer. For Webpack-based tools, temporarily build without `--turbo` flag, though this is not recommended for Next.js 16+.

## Cost Analysis

| Tool | Pricing | Recommendation |
|------|---------|----------------|
| Next.js Bundle Analyzer | Free (built-in) | Use always |
| Speed Insights | Free (Vercel) | Use always |
| Lighthouse CI | Free (open source) | Use in CI/CD |
| npm audit | Free (built-in) | Use always |
| Semgrep OSS | Free (open source) | Use always |
| eslint-plugin-security | Free (open source) | Use always |
| OWASP ZAP | Free (open source) | Use for pentesting |
| BundlePhobia CLI | Free (open source) | Use pre-install checks |
| Snyk Free | Free (limited) | Optional, 200 tests/month |
| Snyk Pro | $99/mo | Skip (npm audit + Semgrep sufficient) |

**Total Cost:** $0 (all recommended tools are free)

## Sources

### Performance Profiling
- [Next.js 16.1 Release Notes](https://nextjs.org/blog/next-16-1) - Experimental Bundle Analyzer
- [Next.js Bundle Analyzer Demo](https://turbopack-bundle-analyzer-demo.vercel.sh/)
- [Vercel Speed Insights Documentation](https://vercel.com/docs/speed-insights)
- [Lighthouse CI Performance Monitoring](https://web.dev/articles/lighthouse-ci)
- [Next.js Speed Insights Guide](https://nextjs.org/learn/seo/monitor/nextjs-speed-insights)
- [BundlePhobia Package Size Tool](https://bundlephobia.com)

### Security Auditing
- [Semgrep JavaScript/TypeScript Analysis (2025)](https://semgrep.dev/blog/2025/a-technical-deep-dive-into-semgreps-javascript-vulnerability-detection/)
- [Top NPM Vulnerability Scanners](https://spectralops.io/blog/best-npm-vulnerability-scanners/)
- [OWASP ZAP API Security Testing (2026)](https://oneuptime.com/blog/post/2026-01-25-owasp-zap-api-security/view)
- [eslint-plugin-security NPM Package](https://www.npmjs.com/package/eslint-plugin-security)
- [Snyk vs npm audit Comparison](https://nearform.com/insights/comparing-npm-audit-with-snyk/)

### i18n (German Umlauts)
- [GitHub: betterletter - German Umlaut Conversion Tool](https://github.com/alexpovel/betterletter)
- [German Umlaut Alternative Spellings Guide](https://blogs.transparent.com/german/writing-the-letters-%E2%80%9Ca%E2%80%9D-%E2%80%9Co%E2%80%9D-and-%E2%80%9Cu%E2%80%9D-without-a-german-keyboard/)
- [next-intl Documentation](https://next-intl.dev/)
- [React i18n Best Libraries](https://phrase.com/blog/posts/react-i18n-best-libraries/)

### Bundle Analysis
- [Next.js Turbopack Bundle Analyzer Discussion](https://github.com/vercel/next.js/discussions/86731)
- [@next/bundle-analyzer Turbopack Incompatibility Issue](https://github.com/vercel/next.js/issues/77482)
- [Next.js 16.1 Bundle Analyzer Review](https://staticmania.com/blog/next.js-16.1-review)
