# Architecture Integration: Performance, Security, i18n

**Project:** KEWA Renovation Operations System
**Milestone:** v3.1 Production Hardening
**Researched:** 2026-02-04

## Executive Summary

Performance monitoring, security measures, and i18n fixes integrate with existing Next.js 16 architecture through multiple layers: middleware (performance tracking, security headers), layout components (monitoring initialization), API routes (security validation), and codebase-wide search-replace (umlaut corrections).

**Key integration points:**
- Middleware: Security headers, request timing
- Root layout: Performance monitoring initialization
- API routes: Security validation middleware
- Codebase: Automated search-replace for umlauts

## Current Architecture Overview

### Existing Structure

```
Next.js 16 App Router
├── Middleware (src/middleware.ts)
│   ├── Session validation (RBAC-aware)
│   ├── Route protection
│   ├── Portal routing (/portal, /contractor)
│   └── Request header injection
│
├── Route Groups
│   ├── /dashboard (internal: KEWA + Imeri)
│   ├── /portal (tenants: email auth)
│   └── /contractor (external: magic-link)
│
├── Layouts
│   ├── Root layout (app/layout.tsx)
│   │   └── PushProvider, Toaster
│   ├── Dashboard layout (app/dashboard/layout.tsx)
│   │   └── BuildingContext, ConnectivityContext, Header, MobileNav
│   ├── Portal layout (app/portal/layout.tsx)
│   └── Contractor layout (app/contractor/[token]/layout.tsx)
│
├── API Routes (/api/*)
│   ├── Auth routes (/api/auth/*) — public
│   ├── Portal routes (/api/portal/*) — portal session
│   ├── Contractor routes (/api/contractor/*) — magic-link token
│   └── Internal routes (/api/*) — session + RBAC
│
└── Service Worker (public/sw.js)
    ├── Push notifications
    └── Offline caching (sw-cache.js)
```

### Authentication Flows

| Route Group | Auth Method | Validation Point | Session Type |
|-------------|-------------|------------------|--------------|
| /dashboard | PIN (internal) | Middleware + API | httpOnly cookie (session) |
| /portal | Email/Password | Middleware + API | httpOnly cookie (portal_session) |
| /contractor | Magic-link token | Middleware | URL token validation |

## Performance Monitoring Integration

### Approach: Multi-Layer Instrumentation

Performance monitoring integrates at three architectural layers.

#### Layer 1: Middleware (Request-Level Metrics)

**Location:** `src/middleware.ts`

**What to add:**
- Request timing wrapper
- Response time header injection
- Route-specific timing
- Edge function latency tracking

**Implementation pattern:**
```typescript
export async function middleware(request: NextRequest) {
  const startTime = performance.now()

  // Existing auth/routing logic...
  const response = await handleRoute(request)

  // Add performance headers
  const duration = performance.now() - startTime
  response.headers.set('x-response-time', `${duration}ms`)
  response.headers.set('x-middleware-duration', `${duration}ms`)

  // Optional: Send to monitoring service
  await reportMetric({
    route: request.nextUrl.pathname,
    duration,
    method: request.method,
  })

  return response
}
```

**Why middleware:** Captures all requests (pages + API), minimal overhead (~60-70ms baseline), edge-compatible.

**Sources:**
- [Middleware.io - Configure Middleware APM for Next.js](https://docs.middleware.io/apm-configuration/next-js)
- [Sentry - Error and Performance Monitoring for Next.js](https://sentry.io/for/nextjs/)

#### Layer 2: Root Layout (Client Metrics)

**Location:** `src/app/layout.tsx`

**What to add:**
- Web Vitals reporting (CLS, LCP, FID, TTFB)
- Performance observer initialization
- Error boundary integration

**Implementation pattern:**
```typescript
import { useReportWebVitals } from 'next/web-vitals'

export default function RootLayout({ children }) {
  // Web Vitals reporting
  useReportWebVitals((metric) => {
    // Send to monitoring service
    reportWebVital(metric)
  })

  return (
    <html>
      <body>
        {/* Existing providers */}
        <PushProvider>
          {children}
        </PushProvider>
        <Toaster />
      </body>
    </html>
  )
}
```

**Why root layout:** Runs once per app load, captures client-side metrics, non-blocking.

**Sources:**
- [Next.js Analytics Guide](https://nextjs.org/docs/pages/guides/analytics)
- [PostHog - Next.js Monitoring Tutorial](https://posthog.com/tutorials/nextjs-monitoring)

#### Layer 3: OpenTelemetry (Server-Side Instrumentation)

**Location:** `instrumentation.ts` (new file at project root)

**What to add:**
- Automatic span tracing for API routes
- Database query timing
- External API call tracking
- Resource metrics (memory, CPU)

**Implementation pattern:**
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')

    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
    })

    sdk.start()
  }
}
```

**Why instrumentation.ts:** Runs before app starts, automatic Next.js span creation, supports all observability providers.

**Sources:**
- [Next.js OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry)
- [SigNoz - Monitor NextJS with OpenTelemetry](https://signoz.io/blog/opentelemetry-nextjs/)

### Performance Monitoring Decision Matrix

| Metric Type | Where to Capture | Integration Point | Overhead |
|-------------|------------------|-------------------|----------|
| Request timing | Middleware | `src/middleware.ts` | ~5-10ms |
| Web Vitals (LCP, CLS, FID) | Root layout | `src/app/layout.tsx` | None (async) |
| API response time | Middleware + OpenTelemetry | `instrumentation.ts` | ~10-20ms |
| Database queries | OpenTelemetry | Auto-instrumented | ~5-15ms |
| Service worker events | Service worker | `public/sw.js` | None (background) |

### Recommended Tooling

Based on ecosystem research, three tiers:

**Tier 1 (Vercel-hosted apps):**
- **Vercel Analytics** — Built-in, zero config, Web Vitals + Server timing
- Advantage: Native integration, no external service

**Tier 2 (Self-hosted or multi-provider):**
- **Sentry** — Error + performance, traces through RSCs and Server Actions
- **OpenTelemetry** — Platform-agnostic, vendor-neutral observability

**Tier 3 (Comprehensive APM):**
- **New Relic** — Full APM with middleware/SSR/transaction naming
- **Highlight.io** — Web Vitals + request latency + alerting

**For KEWA context (Vercel deployment assumed):**
- Start with Vercel Analytics (already available)
- Add OpenTelemetry for custom metrics
- Consider Sentry if error tracking needed

## Security Hardening Integration

### Approach: Defense in Depth

Security measures integrate at configuration (headers), middleware (request validation), and application (input sanitization) layers.

#### Layer 1: Security Headers (next.config.ts)

**Location:** `next.config.ts`

**What to add:**
- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options (clickjacking prevention)
- X-Content-Type-Options (MIME sniffing prevention)
- Referrer-Policy
- Permissions-Policy

**Current state:**
```typescript
// next.config.ts currently only has service worker headers
async headers() {
  return [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ]
}
```

**What to add:**
```typescript
async headers() {
  return [
    // Existing service worker headers...
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-eval needed for Next.js dev
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co",
            "frame-ancestors 'none'",
          ].join('; '),
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
  ]
}
```

**Why next.config.ts:** Centralized header management, applies to all responses, no runtime overhead.

**Considerations:**
- CSP `unsafe-inline` and `unsafe-eval` needed for Next.js (gradual restriction)
- Supabase domains must be whitelisted in `connect-src`
- Service worker requires specific CSP exceptions

**Sources:**
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/)
- [DEV Community - Security Headers for Next.js](https://dev.to/simplr_sh/securing-your-nextjs-application-the-basic-defenders-security-headers-o31)

#### Layer 2: CSRF Protection (Middleware Enhancement)

**Location:** `src/middleware.ts`

**What to add:**
- Origin header validation (already exists for Server Actions)
- Explicit CSRF token validation for custom route handlers
- SameSite cookie enforcement (already using `sameSite: 'lax'`)

**Current state:**
```typescript
// middleware.ts validates session but relies on Next.js built-in CSRF protection
// Server Actions: Next.js compares Origin to Host (automatic)
// Route Handlers: No explicit CSRF validation
```

**What to add:**
```typescript
// For API routes using custom handlers (not Server Actions)
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // For state-changing API routes (POST/PUT/DELETE)
  if (pathname.startsWith('/api/') && request.method !== 'GET') {
    // Validate Origin matches Host
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (origin && !origin.includes(host || '')) {
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      )
    }
  }

  // Existing auth logic...
}
```

**Why middleware:** Single enforcement point, runs before route handlers, edge-compatible.

**CSRF protection status:**
- **Server Actions:** Protected by Next.js (Origin/Host comparison)
- **Route Handlers:** Need explicit validation (add to middleware)
- **Cookies:** Already using `sameSite: 'lax'` (good)

**Sources:**
- [Next.js Security Blog - Server Components and Actions](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Medium - Next.js Security Considerations](https://medium.com/@farihatulmaria/security-considerations-when-building-a-next-js-application-and-mitigating-common-security-risks-c9d551fcacdb)

#### Layer 3: Input Validation & XSS Prevention

**Location:** All API routes + components using user input

**What to audit:**
1. **Check for `dangerouslySetInnerHTML` usage**
   - Search codebase: `grep -r "dangerouslySetInnerHTML" src/`
   - Replace with sanitized alternatives (DOMPurify)

2. **Validate API route inputs**
   - All `request.json()` calls should validate schema
   - Use Zod or similar for runtime validation

3. **SQL injection prevention**
   - Already using Supabase (parameterized queries by default)
   - Audit any raw SQL in migration files

**Example pattern:**
```typescript
// API route input validation
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
})

export async function POST(request: Request) {
  const body = await request.json()

  // Validate and sanitize
  const validated = schema.safeParse(body)
  if (!validated.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validated.error },
      { status: 400 }
    )
  }

  // Use validated.data (guaranteed safe)
}
```

**Why API routes:** Single enforcement point per endpoint, type-safe validation, prevents injection.

**Sources:**
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security)
- [TurboStarter - Complete Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)

#### Layer 4: Dependency Audit

**Location:** `package.json` + npm audit

**What to audit:**
1. **Run npm audit**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Check for outdated packages**
   ```bash
   npm outdated
   ```

3. **Review critical dependencies:**
   - `next` (currently 16.1.2 — check for security patches)
   - `@supabase/supabase-js` (currently 2.90.1)
   - `jose` (JWT library — security-critical)
   - `bcryptjs` (password hashing)

**Why dependency audit:** Third-party vulnerabilities are OWASP Top 10, automated detection available.

**Sources:**
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### Security Audit Checklist

| Vulnerability | Current State | Action Required | Priority |
|---------------|---------------|-----------------|----------|
| **CSRF** | Partial (Server Actions protected, Route Handlers manual) | Add Origin validation in middleware | HIGH |
| **XSS** | Unknown (audit needed) | Search for `dangerouslySetInnerHTML`, validate React escaping | HIGH |
| **SQL Injection** | Protected (Supabase uses parameterized queries) | Audit for raw SQL in migrations | MEDIUM |
| **Security Headers** | Missing CSP, HSTS, etc. | Add to `next.config.ts` | HIGH |
| **Dependency Vulnerabilities** | Unknown (audit needed) | Run `npm audit`, update packages | HIGH |
| **Session Security** | Good (httpOnly, sameSite, JWT) | Validate JWT secret strength | LOW |
| **Input Validation** | Inconsistent (some routes validate, others don't) | Add Zod schemas to all API routes | MEDIUM |
| **Rate Limiting** | None | Consider adding (Vercel Edge Middleware) | MEDIUM |

## i18n Umlaut Correction Integration

### Approach: Automated Search-Replace

German umlauts (ä, ö, ü) are currently written as `ae`, `ue`, `oe` throughout the codebase. Need systematic replacement.

**Scope:**
- TypeScript/TSX files (`.ts`, `.tsx`)
- Exclude: `node_modules`, `.next`, `build`
- Target: String literals, comments, variable names (case-by-case)

### File Categories for Replacement

Based on grep analysis, files contain `ae/ue/oe` patterns:

**Category 1: User-facing strings (HIGH priority)**
- Component files (e.g., `ProfileForm.tsx`, `TicketConvertDialog.tsx`)
- Page files (e.g., `tickets/page.tsx`, `auftraege/page.tsx`)
- API response messages

**Category 2: Database content (MEDIUM priority)**
- Migration files (SQL strings)
- Seed data
- Default templates

**Category 3: Code identifiers (LOW priority — manual review)**
- Function names (e.g., `auftraege` → likely stays as-is for URL paths)
- Route paths (e.g., `/dashboard/auftraege` → breaking change)
- Database column names (requires migration)

### Replacement Strategy

#### Phase 1: Automated String Replacement

Use AST-based tooling to avoid false positives.

**Tool options:**
1. **jscodeshift** (Facebook's codemod tool)
   - AST-aware transformations
   - Can target string literals specifically
   - Avoids replacing in imports, function names

2. **Custom script with TypeScript AST**
   - More control
   - Can handle edge cases

**Example jscodeshift transform:**
```javascript
// umlaut-transform.js
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift
  const root = j(fileInfo.source)

  // Replace string literals
  root.find(j.StringLiteral).forEach(path => {
    path.node.value = path.node.value
      .replace(/ae/g, 'ä')
      .replace(/ue/g, 'ü')
      .replace(/oe/g, 'ö')
      .replace(/Ae/g, 'Ä')
      .replace(/Ue/g, 'Ü')
      .replace(/Oe/g, 'Ö')
  })

  return root.toSource()
}
```

**Run:**
```bash
npx jscodeshift -t umlaut-transform.js src/**/*.{ts,tsx}
```

**Sources:**
- [Codemod - Automated i18n](https://codemod.com/i18n)
- [GitHub - ast-i18n](https://github.com/sibelius/ast-i18n)

#### Phase 2: Manual Review

**What needs manual review:**
1. **URL paths** (breaking changes)
   - `/dashboard/auftraege` → `/dashboard/aufträge`?
   - Requires redirect rules or route updates

2. **Database column names**
   - e.g., `auftraege` table/column
   - Requires migration + code updates

3. **API endpoint paths**
   - `/api/auftraege` → `/api/aufträge`?
   - May break existing integrations

**Recommendation:**
- **User-facing strings:** Replace with umlauts (non-breaking)
- **URLs/routes:** Keep as-is OR add redirects (breaking, deferred)
- **Database identifiers:** Keep as-is (migration complexity not worth it)

#### Phase 3: Verification

**Post-replacement checks:**
1. **TypeScript compilation**
   ```bash
   npm run type-check
   ```

2. **Search for remaining patterns**
   ```bash
   grep -r "ae\|ue\|oe" src/ --include="*.ts" --include="*.tsx"
   ```

3. **Manual testing of UI**
   - Login flow
   - Dashboard navigation
   - Portal tickets
   - Contractor portal

### i18n Replacement Checklist

| File Type | Pattern | Action | Breaking? |
|-----------|---------|--------|-----------|
| UI labels/text | `"Auftraege"` → `"Aufträge"` | Auto-replace | No |
| Comments | `// Auftraege` → `// Aufträge"` | Auto-replace | No |
| Route paths | `/auftraege` → `/aufträge` | Manual decision (keep as-is OR redirect) | Yes (if changed) |
| Database names | `auftraege` table | Keep as-is | N/A |
| Variable names | `const auftraege =` | Manual review (case-by-case) | Possibly |

## Build Order & Dependencies

Based on architectural integration points, suggested phase structure:

### Phase 1: Security Headers & CSRF Protection
**Why first:** No dependencies, immediate security improvement, non-breaking.

**Tasks:**
1. Add security headers to `next.config.ts`
2. Add Origin validation to middleware
3. Test all route groups still work

**Estimated effort:** 2-4 hours
**Breaking changes:** None

### Phase 2: Dependency Audit & Updates
**Why second:** Unblock other work, may reveal performance/security issues.

**Tasks:**
1. Run `npm audit` and review findings
2. Update vulnerable packages
3. Test critical flows (auth, data submission)
4. Update `package.json` with new versions

**Estimated effort:** 4-8 hours
**Breaking changes:** Possible (test thoroughly)

### Phase 3: Performance Monitoring
**Why third:** Depends on stable codebase (post-updates), enables measurement before optimization.

**Tasks:**
1. Add middleware timing wrapper
2. Add `useReportWebVitals` to root layout
3. Create `instrumentation.ts` for OpenTelemetry
4. Configure monitoring service (Vercel Analytics or Sentry)
5. Establish baseline metrics

**Estimated effort:** 6-12 hours
**Breaking changes:** None (observability only)

### Phase 4: Input Validation Audit
**Why fourth:** Manual code review, benefits from monitoring (identify hot paths).

**Tasks:**
1. Audit all API routes for input validation
2. Add Zod schemas where missing
3. Search for `dangerouslySetInnerHTML`
4. Test with malicious inputs

**Estimated effort:** 8-16 hours
**Breaking changes:** None (adds validation)

### Phase 5: Umlaut Correction
**Why last:** Cosmetic, non-critical, may touch many files (merge conflicts).

**Tasks:**
1. Create jscodeshift transform
2. Run on `src/` directory
3. Manual review of changes
4. Type-check and test
5. Update any documentation

**Estimated effort:** 4-8 hours
**Breaking changes:** None (UI text only)

### Dependency Graph

```
Phase 1 (Security Headers)
  └─> No dependencies

Phase 2 (Dependency Audit)
  └─> No dependencies

Phase 3 (Performance Monitoring)
  └─> Depends on Phase 2 (stable dependencies)

Phase 4 (Input Validation)
  └─> Depends on Phase 3 (monitoring identifies critical paths)

Phase 5 (Umlaut Correction)
  └─> No dependencies (can run in parallel with Phase 4)
```

**Parallel execution opportunity:**
- Phases 1-2 can run sequentially (fast)
- Phase 3 can start after Phase 2
- Phases 4-5 can run in parallel (independent)

## Integration Risks & Mitigations

### Risk 1: CSP Breaking Existing Functionality

**What could break:**
- Inline scripts (Next.js uses some in dev mode)
- Third-party scripts (analytics, monitoring)
- Service worker (requires `worker-src` directive)

**Mitigation:**
- Start with permissive CSP (`unsafe-inline`, `unsafe-eval`)
- Use `report-only` mode first
- Gradually tighten after testing

### Risk 2: Middleware Performance Overhead

**Impact:**
- Middleware runs on EVERY request
- Each monitoring call adds latency (~5-20ms)
- Edge function timeout (max 25s on Vercel)

**Mitigation:**
- Use async/non-blocking monitoring calls
- Batch metrics instead of per-request
- Monitor middleware duration itself
- Consider conditional instrumentation (sample rate)

### Risk 3: Umlaut Replacement False Positives

**What could break:**
- English words containing `ae/ue/oe` (e.g., "maestro", "cue")
- Technical terms (e.g., "queues")
- Third-party library strings

**Mitigation:**
- Use AST-based replacement (string literals only)
- Manual review of all changes
- Test suite execution post-replacement
- Git diff review before commit

### Risk 4: Dependency Updates Breaking Changes

**Impact:**
- Major version updates may have breaking API changes
- Next.js updates can break middleware/layouts
- Supabase client changes may affect auth

**Mitigation:**
- Read changelogs before updating
- Test auth flows thoroughly
- Update one major dependency at a time
- Keep rollback plan (Git revert)

## Sources

### Performance Monitoring
- [Sentry - Error and Performance Monitoring for Next.js](https://sentry.io/for/nextjs/)
- [Next.js Analytics Guide](https://nextjs.org/docs/pages/guides/analytics)
- [Next.js OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry)
- [PostHog - Next.js Monitoring Tutorial](https://posthog.com/tutorials/nextjs-monitoring)
- [New Relic - Next.js Monitoring](https://newrelic.com/blog/how-to-relic/nextjs-monitor-application-data)
- [SigNoz - Monitor NextJS with OpenTelemetry](https://signoz.io/blog/opentelemetry-nextjs/)
- [Middleware.io - Configure Middleware APM](https://docs.middleware.io/apm-configuration/next-js)
- [Medium - Monitoring Tools for Next.js 2025](https://joodi.medium.com/20-essential-monitoring-tools-for-next-js-in-2025-edba6621128c)

### Security Hardening
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/)
- [Next.js Security Blog - Server Components](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [DEV Community - Security Headers for Next.js](https://dev.to/simplr_sh/securing-your-nextjs-application-the-basic-defenders-security-headers-o31)
- [Medium - Next.js Security Considerations](https://medium.com/@farihatulmaria/security-considerations-when-building-a-next-js-application-and-mitigating-common-security-risks-c9d551fcacdb)
- [TurboStarter - Complete Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### i18n Automation
- [Codemod - Automated i18n](https://codemod.com/i18n)
- [GitHub - ast-i18n](https://github.com/sibelius/ast-i18n)
- [GitHub - a18n Automated I18n](https://github.com/FallenMax/a18n)

---

*Research complete — ready for phase planning*
