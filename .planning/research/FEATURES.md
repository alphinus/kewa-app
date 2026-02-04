# Feature Landscape: Production Hardening

**Domain:** Next.js 16 + React 19 + Supabase Enterprise Application
**Researched:** 2026-02-04
**Project:** KEWA Renovation Operations System (110K LOC, 750+ files)

## Table Stakes

Features users expect from production-ready enterprise apps. Missing = app feels unprofessional or unsafe.

| Feature | Why Expected | Complexity | Measurable Target |
|---------|--------------|------------|-------------------|
| **Core Web Vitals compliance** | Google ranking factor, user experience baseline | Medium | LCP < 2.5s, INP < 200ms, CLS < 0.1 |
| **Security headers (CSP)** | OWASP A01:2025 Broken Access Control mitigation | Low | CSP header configured, X-Frame-Options, HSTS |
| **JWT token security** | Prevent XSS/CSRF attacks on auth system | Medium | HttpOnly cookies, SameSite=strict, 256-bit keys |
| **Database query indexes** | N+1 queries causing sluggishness | High | Supabase Query Performance Report < 100ms p95 |
| **Dependency vulnerability resolution** | OWASP A03:2025 Supply Chain Failures | Low | npm audit 0 critical/high vulnerabilities |
| **Environment variable security** | Prevent credential leaks | Low | .env* in .gitignore, no NEXT_PUBLIC_ for secrets |
| **Error boundaries** | Prevent white screen of death | Low | app/global-error.tsx exists, catches all errors |
| **PWA service worker security** | Prevent cache poisoning attacks | Medium | HTTPS enforcement, scope restriction, CSP headers |
| **Proper UTF-8 encoding** | German umlauts display correctly | Low | All ä/ö/ü characters render properly |
| **Audit logging for changes** | Compliance, debugging, security | Low | All mutations logged (already exists) |

## Performance Differentiators

Features that make the app feel fast, not just functional. Directly address "träge" (sluggish) complaint.

| Feature | Value Proposition | Complexity | Impact |
|---------|-------------------|------------|--------|
| **Server Component optimization** | 15-20% faster rendering, smaller JS bundles | Medium | Measurable LCP improvement |
| **Parallel data fetching** | Eliminate request waterfalls (biggest perf killer) | High | Cut page load time by 30-60% |
| **React Compiler optimization** | Auto-optimize re-renders, reduce useMemo/useCallback need | Low | Already enabled in next.config.ts |
| **Turbopack build speed** | 2-5x faster builds, 10x faster Fast Refresh | Low | Already enabled (Next.js 16 default) |
| **Database connection pooling** | Handle concurrent requests without bottleneck | Medium | Support 200+ concurrent users |
| **Supabase index optimization** | 100x speedup on filtered queries | Medium | Use index_advisor extension |
| **Image optimization audit** | Prevent layout shift, serve WebP | Low | Next.js Image component already used |
| **Bundle size analysis** | Identify bloat from large dependencies | Low | @next/bundle-analyzer plugin |
| **Lazy loading for heavy components** | Reduce initial bundle size | Medium | Dynamic imports for modals, editors |
| **Cache-first for static assets** | Instant offline load for assets | Low | Already implemented in sw-cache.js |

## Security Differentiators

Features that protect against OWASP Top 10 2025 threats. Beyond basic auth.

| Feature | OWASP Category | Complexity | Mitigation |
|---------|----------------|------------|------------|
| **Security Misconfiguration audit** | A02:2025 (2nd most critical) | Medium | Review Next.js headers, CORS, API exposure |
| **Cryptographic Failures audit** | A04:2025 | Low | Verify bcrypt rounds, JWT algorithm (HS256 min) |
| **Injection prevention** | A05:2025 | Low | Parameterized queries (Supabase client already safe) |
| **Insecure Design review** | A06:2025 | High | Magic-link expiry, contractor token validation |
| **Authentication failure hardening** | A08:2025 | Medium | Rate limiting, session timeout enforcement |
| **Logging & alerting audit** | A09:2025 | Low | Verify audit_log captures security events |
| **Exceptional condition handling** | A10:2025 (NEW) | Low | Error boundaries, fail closed on auth errors |
| **Service worker scope restriction** | PWA-specific | Low | Service-Worker-Allowed header already set |
| **Sensitive data tainting** | Next.js 16 feature | Medium | Prevent DB secrets from reaching client |
| **RBAC permission verification** | Application-layer security | Low | Already implemented in middleware.ts |

## i18n Strategy

Features for fixing German umlauts and preparing for potential i18n future.

| Feature | Approach | Complexity | Why |
|---------|----------|------------|-----|
| **UTF-8 encoding verification** | Audit all hardcoded strings | Low | Ensure source files are UTF-8, meta tags correct |
| **Umlaut replacement (ae→ä, etc.)** | Global find/replace in codebase | Low | User complaint: umlauts incorrectly spelled out |
| **German-only string externalization** | Create de.json locale file | Medium | Prepares for future i18n, centralizes strings |
| **Database UTF-8 collation** | Verify Supabase uses UTF8 | Low | Postgres default UTF8, verify with psql \l |
| **File upload encoding** | Server action form data fix | Medium | Next.js Issue #70147 - German filenames encode wrong |

## Anti-Features

Features to explicitly NOT build. Avoid over-engineering during hardening.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full i18n framework (next-intl)** | App is German-only, no multi-language requirement | Fix umlauts, externalize strings to de.json for future |
| **Complete rewrite to fix performance** | Lava Flow anti-pattern - code around issues | Profile with Lighthouse, fix specific bottlenecks |
| **Hardening Sprint mentality** | Treats tech debt as separate phase | Integrate hardening into regular workflow |
| **Premature optimization** | Optimizing without profiling wastes time | Run Lighthouse first, prioritize by impact |
| **Over-engineered security** | Resume-driven development, not solving real problems | Focus on OWASP Top 10, not every CVE |
| **Replacing service worker with Serwist** | Turbopack conflict already documented | Keep manual sw.js approach |
| **Database migration to different provider** | Supabase is fine, performance issue is queries not DB | Optimize queries, add indexes |
| **Switching from JWT to sessions** | Custom JWT auth with PIN works for use case | Harden JWT implementation, don't replace |
| **Adding WebAuthn/passkeys** | Two internal users with PINs, not needed | Focus on contractor/tenant auth security |
| **Building custom bundler** | Turbopack already optimized | Use existing tooling |

## Feature Dependencies

```
Performance Optimization Flow:
1. Lighthouse audit → identify bottlenecks
2. Database indexes → fix N+1 queries
3. Parallel fetching → eliminate waterfalls
4. Bundle analysis → lazy load heavy components

Security Hardening Flow:
1. npm audit → resolve critical vulnerabilities
2. CSP headers → prevent XSS
3. JWT hardening → httpOnly, SameSite
4. Service worker scope → prevent cache poisoning

i18n Flow:
1. UTF-8 verification → ensure encoding correct
2. Umlaut replacement → fix ae/oe/ue
3. String externalization → prepare de.json
```

## MVP Recommendation

For production hardening milestone (v3.1), prioritize by impact:

**Phase 1: Quick Wins (1-2 days)**
1. npm audit fix (dependency vulnerabilities)
2. Umlaut find/replace (ae→ä, ue→ü, oe→ö)
3. CSP headers in next.config.ts
4. Lighthouse audit baseline

**Phase 2: Performance Bottlenecks (3-5 days)**
1. Supabase Query Performance Report analysis
2. Add database indexes for slow queries
3. Identify N+1 patterns (188 files with .select/.from)
4. Parallel fetching for dashboard pages
5. Bundle analysis with @next/bundle-analyzer

**Phase 3: Security Hardening (2-3 days)**
1. JWT cookie security audit (httpOnly, SameSite)
2. Service worker security review
3. Sensitive data tainting for DB secrets
4. Rate limiting on auth endpoints
5. Error boundary audit

**Phase 4: String Externalization (2-3 days)**
1. Create de.json locale file
2. Extract hardcoded German strings
3. Replace with locale references
4. Verify UTF-8 encoding throughout

Defer to post-MVP:
- Full i18n framework: App is German-only, no requirement
- Advanced caching strategies: Service worker already handles offline
- Monitoring/observability: Focus on fixing, not monitoring first

## Complexity Estimation

| Category | Total Effort | Risk Level |
|----------|--------------|------------|
| Quick Wins | 16 hours | Low |
| Performance | 32-40 hours | Medium-High (requires profiling) |
| Security | 16-24 hours | Medium (requires testing) |
| i18n Prep | 16-24 hours | Low |
| **Total** | **80-104 hours** | **Medium** |

## Known Risks

### High Risk
- **Database indexes may require migration downtime**: Supabase index creation locks tables
- **N+1 query fixes may break existing logic**: 188 files use Supabase queries, refactoring risk
- **CSP headers may block legitimate scripts**: Service worker, inline scripts, third-party CDNs

### Medium Risk
- **Bundle analysis may reveal deep dependency issues**: Removing large deps requires refactoring
- **String externalization may break formatted strings**: Template literals with variables
- **UTF-8 encoding issues in file uploads**: Next.js Issue #70147 still open

### Low Risk
- **npm audit fixes may cause version conflicts**: Test after upgrading
- **Umlaut replacement may miss template literals**: Requires thorough search
- **JWT hardening may break existing sessions**: Requires re-login for users

## Measurement Criteria

| Metric | Baseline (Unknown) | Target |
|--------|-------------------|--------|
| LCP (Largest Contentful Paint) | TBD | < 2.5s (< 2.0s ideal) |
| INP (Interaction to Next Paint) | TBD | < 200ms (< 100ms ideal) |
| CLS (Cumulative Layout Shift) | TBD | < 0.1 (< 0.05 ideal) |
| Lighthouse Performance Score | TBD | > 90 |
| Bundle Size (gzipped) | TBD | Reduce by 20% |
| Query p95 latency | TBD | < 100ms |
| npm audit vulnerabilities | TBD | 0 critical/high |
| German umlauts correct | 0% (ae/oe/ue) | 100% (ä/ö/ü) |

## Sources

**Performance:**
- [Next.js 16 Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Next.js Performance Optimization 2026](https://medium.com/@Adekola_Olawale/migrating-to-next-js-16-a-practical-performance-first-guide-e9680dd252b4)
- [N+1 Query Optimization](https://strapi.io/blog/performance-mistakes-strapi-nextjs-apps)
- [React Server Components Performance](https://www.patterns.dev/react/react-2026/)
- [Core Web Vitals Targets](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)

**Security:**
- [OWASP Top 10 2025](https://owasp.org/Top10/2025/en/)
- [Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)
- [JWT Best Practices 2026](https://leapcell.medium.com/implementing-jwt-middleware-in-next-js-a-complete-guide-to-auth-300d9c7fcae2)
- [PWA Security Best Practices](https://www.zeepalm.com/blog/pwa-security-best-practices)

**i18n:**
- [Next.js Internationalization](https://nextjs.org/docs/app/guides/internationalization)
- [German Umlauts UTF-8 Issue](https://github.com/vercel/next.js/issues/70147)

**Anti-Patterns:**
- [Platform Engineering Anti-Patterns](https://jellyfish.co/library/platform-engineering/anti-patterns/)
- [Software Anti-Patterns to Avoid](https://www.bairesdev.com/blog/software-anti-patterns/)
