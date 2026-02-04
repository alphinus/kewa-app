# Domain Pitfalls: Production Hardening

**Domain:** Next.js Production Application (110K LOC, active users)
**Researched:** 2026-02-04
**Context:** Performance optimization, security audit, character encoding fixes
**Milestone:** v3.1 Production Hardening

---

## Priority Summary

| # | Pitfall | Severity | Detection | Time to Fix |
|---|---------|----------|-----------|-------------|
| 1 | Breaking active user sessions during CVE patches | CRITICAL | Low | 4 hours |
| 2 | Character encoding migration corrupting data | CRITICAL | Low | Planning: 8h, Exec: 16h |
| 3 | Dynamic APIs in root layout destroying performance | CRITICAL | Low | 2 hours |
| 4 | Server Actions without authorization checks | CRITICAL | Medium | 8 hours |
| 5 | CVE-2025-29927 middleware authorization bypass | CRITICAL | Low | 2 hours |
| 6 | Server/Client Component boundary confusion | HIGH | Medium | 12 hours |
| 7 | Missing data caching for non-fetch requests | HIGH | High | 16 hours |
| 8 | PWA cache strategy causing stale data | HIGH | High | 8 hours |
| 9 | Bundle analysis skipped before optimization | HIGH | Low | 2 hours |
| 10 | Large refactoring without incremental deployment | MODERATE | Low | Planning only |
| 11 | Security dependency updates breaking build | MODERATE | Low | 4 hours |
| 12 | Environment variables exposed to client | MODERATE | Low | 3 hours |
| 13 | Custom auth CSRF vulnerability | MODERATE | Medium | 6 hours |
| 14 | German collation breaking sort order | MINOR | Low | 2 hours |
| 15 | Missing monitoring for performance regressions | MINOR | Low | 4 hours |

---

## CRITICAL PITFALLS

Mistakes causing production downtime, data loss, or security breaches.

### 1. Breaking Active User Sessions During Security Patches

**Severity:** CRITICAL
**Phase Impact:** Security Audit (Phase 1)

**What goes wrong:** Applying critical CVE patches (CVE-2025-66478, CVE-2025-55182) without session management strategy causes mass logouts, disrupting active users.

**Why it happens:** React Server Components and Next.js received critical RCE vulnerability patches in December 2025 / January 2026 with CVSS 10.0 severity. These patches affect default framework configurations, requiring immediate updates. Teams rush to patch without considering session state.

**Consequences:**
- All users logged out simultaneously
- Support tickets spike
- User trust erodes
- Business operations disrupted

**Prevention:**
1. Test patch on staging with active sessions first
2. Implement graceful session migration if auth mechanism changes
3. Add user notification before applying breaking patches
4. Deploy during low-traffic windows
5. Have rollback plan ready

**Detection:**
- Sudden spike in authentication failures in monitoring
- Session validation errors in logs
- User complaints about unexpected logouts

**Phase to address:** Phase 1 (Security Audit) - before touching auth code

**Sources:**
- [Next.js Security Update December 2025](https://nextjs.org/blog/security-update-2025-12-11)
- [CVE-2025-66478 Advisory](https://nextjs.org/blog/CVE-2025-66478)
- [Critical RCE in React & Next.js](https://www.ox.security/blog/rce-in-react-server-components/)

---

### 2. Character Encoding Migration Causing Data Corruption

**Severity:** CRITICAL
**Phase Impact:** Character Encoding Fixes (Dedicated Phase)

**What goes wrong:** Fixing German umlaut encoding (ae→ä) without proper migration strategy corrupts existing data, breaks backups, or causes data loss.

**Why it happens:**
- Database claims UTF-8 but actually uses SQL_ASCII or Latin1
- Column widths insufficient for multibyte characters
- Conversion happens without validation scan
- No rollback when partial corruption detected

**Consequences:**
- Permanent data corruption (ä becomes ���)
- Backup restores fail due to encoding mismatch
- Search/sorting breaks for German text
- Cascading failures in related systems

**Prevention:**
1. **Before touching data:** Run PostgreSQL query to verify actual encoding:
   ```sql
   SELECT datname, pg_encoding_to_char(encoding) as encoding,
          datcollate, datctype
   FROM pg_database
   WHERE datname = 'your_database';
   ```
2. Scan all text columns for length issues after conversion (multibyte expansion)
3. Test on database copy first, verify all data
4. Validate that client encoding matches database encoding
5. Export backup before migration with explicit encoding
6. Implement conversion in phases: read-only validation, then write

**Detection:**
- Run data scanning query before migration:
   ```sql
   SELECT column_name, max(length(column_name)) as max_length,
          max(octet_length(column_name)) as max_bytes
   FROM your_table
   GROUP BY column_name;
   ```
- Compare max_bytes to column width definitions
- Test conversion on sample data, verify visual correctness

**Phase to address:** Dedicated phase after security audit - high risk of data loss requires isolated focus

**Sources:**
- [MySQL UTF-8 to UTF8MB4 Migration Guide](https://saveriomiroddi.github.io/An-in-depth-dbas-guide-to-migrating-a-mysql-database-from-the-utf8-to-the-utf8mb4-charset/)
- [PostgreSQL German Umlauts Best Practices](https://www.dbi-services.com/blog/dealing-with-german-umlaute-in-postgresqls-full-text-search/)
- [Oracle Unicode Migration Overview](https://docs.oracle.com/database/121/DUMAG/ch1overview.htm)

---

### 3. Dynamic APIs in Root Layout Destroying Performance

**Severity:** CRITICAL
**Phase Impact:** Performance Audit (Phase 1)

**What goes wrong:** Using `cookies()`, `searchParams`, or `headers()` in root layout opts **entire application** into dynamic rendering, eliminating all static optimization benefits.

**Why it happens:** Team adds "just one small check" (auth verification, feature flag, analytics) to root layout without understanding it forces every page to render dynamically on every request.

**Consequences:**
- 10-50x slower page loads
- Server costs spike (every page now SSR)
- CDN edge caching completely bypassed
- Cold start penalties on every request
- Users experience the "general sluggishness" this milestone addresses

**Prevention:**
1. **Audit immediately:** Search codebase for Dynamic APIs in layout files:
   ```bash
   grep -r "cookies()" app/**/layout.tsx
   grep -r "searchParams" app/**/layout.tsx
   grep -r "headers()" app/**/layout.tsx
   ```
2. Move Dynamic API usage into Suspense boundaries:
   ```typescript
   // ❌ KILLS PERFORMANCE
   export default function RootLayout({ children }) {
     const user = cookies().get('user'); // ENTIRE APP NOW DYNAMIC
     return <html>{children}</html>;
   }

   // ✅ PRESERVES STATIC OPTIMIZATION
   export default function RootLayout({ children }) {
     return (
       <html>
         <Suspense fallback={<Skeleton />}>
           <UserProvider /> {/* Dynamic API isolated here */}
         </Suspense>
         {children}
       </html>
     );
   }
   ```
3. Use middleware for auth checks instead of layout checks
4. Enable verbose build output to see which routes are static vs dynamic

**Detection:**
- Build output shows all routes as ƒ (Dynamic) instead of ○ (Static)
- Response headers show `Cache-Control: private, no-cache, no-store`
- Vercel Analytics shows 0% edge cache hit rate
- Lighthouse performance scores drop significantly

**Phase to address:** Phase 1 (Performance Audit) - highest impact quick win

**Sources:**
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Common App Router Mistakes - Vercel](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)

---

### 4. Server Actions Without Authorization Checks

**Severity:** CRITICAL
**Phase Impact:** Security Audit (Phase 1)

**What goes wrong:** Custom auth doesn't automatically protect Server Actions. Users can invoke any Server Action with arbitrary arguments once they get the action's ID.

**Consequences:**
- Complete authorization bypass
- Users delete/modify others' data
- IDOR (Insecure Direct Object Reference) vulnerabilities
- Regulatory compliance violations (GDPR, data protection)

**Prevention:**
1. **Establish pattern:** Every Server Action starts with auth check:
   ```typescript
   // ✅ REQUIRED PATTERN
   'use server';

   export async function deleteInspection(inspectionId: string) {
     // ALWAYS CHECK FIRST
     const session = await getSession();
     if (!session) throw new Error('Unauthorized');

     const inspection = await db.inspection.findUnique({
       where: { id: inspectionId }
     });

     if (inspection.userId !== session.userId) {
       throw new Error('Forbidden');
     }

     // Now safe to proceed
     await db.inspection.delete({ where: { id: inspectionId } });
   }
   ```
2. Audit all files matching `app/**/actions.ts` or containing `'use server'`
3. Create shared auth utility to enforce pattern:
   ```typescript
   async function requireAuth() {
     const session = await getSession();
     if (!session) throw new Error('Unauthorized');
     return session;
   }
   ```
4. Add ESLint rule to flag Server Actions without auth calls

**Detection:**
- Grep for `'use server'` and verify auth check in function body
- Manual audit of all Server Actions
- Penetration testing with modified action IDs

**Phase to address:** Phase 1 (Security Audit) - authorization is critical

**Sources:**
- [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/)
- [Complete Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)

---

### 5. CVE-2025-29927 Middleware Authorization Bypass

**Severity:** CRITICAL
**Phase Impact:** Security Audit (Phase 1)

**What goes wrong:** Attackers bypass middleware authentication by manipulating `x-middleware-subrequest` header, gaining unauthorized access to protected routes.

**Why it happens:** Next.js middleware vulnerability (CVSS 9.1) in versions before 12.3.5, 13.5.9, 14.2.25, or 15.2.3 when self-hosted with `output: standalone` and relying solely on middleware for auth without downstream validation.

**Consequences:**
- Complete authentication bypass
- Access to protected routes/data
- Admin functionality exposed to unauthenticated users

**Prevention:**
1. **Immediate:** Upgrade Next.js to patched version (check current version first)
   ```bash
   npm list next
   # Upgrade to 14.2.25+ or 15.2.3+
   npm install next@latest
   ```
2. Never rely solely on middleware for critical auth - always validate in:
   - Server Components
   - Server Actions
   - API Route Handlers
3. Implement defense in depth: auth checks at multiple layers

**Detection:**
- Check Next.js version: `grep "\"next\":" package.json`
- Verify if using standalone output: `grep "output: 'standalone'" next.config.js`
- Test auth routes with manipulated headers:
   ```bash
   curl -H "x-middleware-subrequest: 1" https://app.com/admin
   ```

**Phase to address:** Phase 1 (Security Audit) - before any other changes

**Sources:**
- [CVE-2025-29927 Analysis - Datadog](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- [Next.js CVE-2025-29927 Attack Guide](https://pentest-tools.com/blog/cve-2025-29927-next-js-bypass)

---

## HIGH SEVERITY PITFALLS

Mistakes causing significant technical debt, performance degradation, or partial outages.

### 6. Server/Client Component Boundary Confusion

**Severity:** HIGH
**Phase Impact:** Performance Optimization (Phase 2)

**What goes wrong:** Refactoring to optimize Server/Client boundaries breaks serialization, causes hydration mismatches, or exposes sensitive server code to client bundles.

**Why it happens:**
- Team doesn't understand "use client" boundary rules
- Passing functions/class instances across boundaries
- Marking large component trees as client when only leaf needs interactivity
- Moving code without testing serialization

**Consequences:**
- "Functions cannot be passed directly to Client Components" errors in production
- Sensitive API keys/secrets leaked to client bundle
- JavaScript bundle size explodes (entire dependency trees marked client)
- Hydration mismatches causing UI flicker/broken state

**Prevention:**
1. **Before refactoring:** Document current boundaries
   ```bash
   # Map all client components
   find app -type f -name "*.tsx" -exec grep -l "use client" {} \;
   ```
2. Test serialization explicitly:
   ```typescript
   // All props must be serializable
   type SerializableProps = {
     // ✅ OK
     strings: string;
     numbers: number;
     arrays: string[];
     objects: { key: string };

     // ❌ NOT SERIALIZABLE
     functions?: () => void; // NO
     dates?: Date; // Use string instead
     classInstances?: MyClass; // NO
   };
   ```
3. Add "use client" only to leaf components that need interactivity
4. Use composition pattern for server/client separation:
   ```typescript
   // Server Component
   export default async function Page() {
     const data = await fetchData(); // Server-side
     return <ClientButton data={data} />; // Pass serializable data
   }

   // Client Component (separate file)
   'use client';
   export function ClientButton({ data }) {
     const [state, setState] = useState();
     // Interactive logic here
   }
   ```
5. Enable TypeScript strict mode to catch some serialization issues

**Detection:**
- Build warnings about large client bundles
- Runtime errors: "Error: Functions cannot be passed..."
- Bundle analyzer shows unexpected server-only code in client bundle
- Check with: `npm run build -- --experimental-show-bundle-info`

**Phase to address:** Phase 2 (Performance Optimization) - after security fixes, before major refactoring

**Sources:**
- [Next.js Server Components Broke Our App Twice](https://medium.com/lets-code-future/next-js-server-components-broke-our-app-twice-worth-it-e511335eed22)
- [Common App Router Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [Server and Client Components Guide](https://nextjs.org/docs/app/getting-started/server-and-client-components)

---

### 7. Missing Data Caching for Non-Fetch Requests

**Severity:** HIGH
**Phase Impact:** Performance Optimization (Phase 2)

**What goes wrong:** Database queries, API calls using non-fetch libraries (Prisma, Supabase client, Axios) bypass Next.js caching, causing repeated expensive operations.

**Why it happens:** Developers assume all data requests are cached like `fetch()`. Non-fetch requests require explicit caching with `unstable_cache()`.

**Consequences:**
- Database hammered with identical queries on every request
- Expensive API calls repeated unnecessarily
- Slow response times despite "caching enabled"
- Database connection pool exhaustion

**Prevention:**
1. **Audit all data fetching:** Search for database/API calls
   ```bash
   # Find potential uncached calls
   grep -r "prisma\." app/
   grep -r "supabase\." app/
   grep -r "axios\." app/
   grep -r "db\." app/
   ```
2. Wrap with explicit caching:
   ```typescript
   import { unstable_cache } from 'next/cache';

   // ❌ NOT CACHED
   async function getInspections() {
     return await db.inspection.findMany();
   }

   // ✅ CACHED
   const getInspections = unstable_cache(
     async () => db.inspection.findMany(),
     ['inspections-list'], // Cache key
     {
       revalidate: 3600, // 1 hour
       tags: ['inspections'] // For on-demand revalidation
     }
   );
   ```
3. Use React Cache for request-level deduplication:
   ```typescript
   import { cache } from 'react';

   // Deduplicate within single request
   export const getUser = cache(async (id: string) => {
     return db.user.findUnique({ where: { id } });
   });
   ```
4. Monitor query counts in production to detect cache misses

**Detection:**
- Database monitoring shows identical queries repeating
- Response times don't improve despite "caching"
- Connection pool exhaustion errors
- Add logging to track cache hits/misses

**Phase to address:** Phase 2 (Performance Optimization) - systematic data layer audit

**Sources:**
- [Next.js Production Checklist - Data Caching](https://nextjs.org/docs/app/guides/production-checklist)

---

### 8. PWA Cache Strategy Causing Stale Data or Storage Overflow

**Severity:** HIGH
**Phase Impact:** Performance Optimization (Phase 2)

**What goes wrong:** Aggressive PWA caching serves stale data to users or fills device storage, causing app crashes or data loss when browser evicts cache.

**Why it happens:**
- Cache-first strategy applied to dynamic data
- No cache invalidation strategy
- Caching everything including large assets
- No storage quota monitoring

**Consequences:**
- Users see outdated inspection data (safety risk)
- Device storage fills up, browser evicts cache
- App crashes when expected cached data missing
- Offline functionality broken after cache eviction

**Prevention:**
1. **Differentiate caching strategies by content type:**
   ```javascript
   // service-worker.js

   // Static assets: Cache-first
   registerRoute(
     /\.(js|css|png|jpg|svg)$/,
     new CacheFirst({
       cacheName: 'static-assets',
       plugins: [
         new ExpirationPlugin({
           maxEntries: 100,
           maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
         }),
       ],
     })
   );

   // API data: Network-first with stale-while-revalidate
   registerRoute(
     /\/api\//,
     new NetworkFirst({
       cacheName: 'api-data',
       plugins: [
         new ExpirationPlugin({
           maxEntries: 50,
           maxAgeSeconds: 5 * 60, // 5 minutes
         }),
       ],
     })
   );

   // Critical user data: Network-only (offline fallback)
   registerRoute(
     /\/api\/inspections\//,
     new NetworkOnly()
   );
   ```
2. Implement cache version management and migration:
   ```javascript
   const CACHE_VERSION = 'v2';

   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys().then((cacheNames) => {
         return Promise.all(
           cacheNames
             .filter((name) => name !== CACHE_VERSION)
             .map((name) => caches.delete(name))
         );
       })
     );
   });
   ```
3. Monitor storage quota:
   ```typescript
   if ('storage' in navigator && 'estimate' in navigator.storage) {
     const { usage, quota } = await navigator.storage.estimate();
     const percentUsed = (usage / quota) * 100;
     if (percentUsed > 80) {
       // Warn user, clear old caches
     }
   }
   ```
4. Test offline behavior with stale cache on staging

**Detection:**
- Users report seeing old data
- Console errors: "QuotaExceededError"
- Storage usage monitoring shows growth
- Test: Disconnect network, clear cache, verify fallback

**Phase to address:** Phase 2 (Performance Optimization) - after data caching audit

**Sources:**
- [PWA Offline Capabilities - Romexsoft](https://www.romexsoft.com/blog/what-is-pwa-progressive-web-apps-and-offline-capabilities/)
- [Debugging Progressive Web Apps](https://blog.pixelfreestudio.com/debugging-progressive-web-apps-common-pitfalls/)
- [PWA Service Worker Caching Strategies](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)

---

### 9. Bundle Analysis Skipped Before Optimization

**Severity:** HIGH
**Phase Impact:** Performance Optimization (Phase 2)

**What goes wrong:** Team optimizes "obvious" issues but ships massive unexpected dependencies, negating performance gains.

**Why it happens:** No systematic approach to identifying what's actually bloating the bundle. Optimizing based on assumptions rather than data.

**Consequences:**
- 110K LOC app likely has significant dead code
- Entire libraries imported when only small functions needed
- Duplicate dependencies (React imported multiple times)
- Optimization effort wasted on wrong targets

**Prevention:**
1. **Install and run bundle analyzer immediately:**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```
   ```javascript
   // next.config.js
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });

   module.exports = withBundleAnalyzer({
     // your config
   });
   ```
   ```bash
   ANALYZE=true npm run build
   ```
2. Focus on these common large codebase issues:
   - Chart libraries (recharts, chart.js) - often 100-500KB
   - Date libraries (moment.js → date-fns or dayjs)
   - Icon libraries (import all vs selective)
   - UI component libraries (MUI, Ant Design - entire lib vs components)
   - Lodash (import specific functions, not whole library)
3. Use dynamic imports for heavy components:
   ```typescript
   // ❌ BAD: Always loads heavy chart library
   import { LineChart } from 'recharts';

   // ✅ GOOD: Only loads when needed
   const LineChart = dynamic(() =>
     import('recharts').then((mod) => mod.LineChart),
     { ssr: false }
   );
   ```
4. Check for duplicate dependencies:
   ```bash
   npm ls react
   npm ls react-dom
   # Should only show one version
   ```

**Detection:**
- Build output shows large "First Load JS"
- Lighthouse flags "Reduce unused JavaScript"
- Bundle analyzer shows unexpected large modules
- Slow page load despite "optimizations"

**Phase to address:** Phase 2 (Performance Optimization) - first step before any optimization work

**Sources:**
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [10 Performance Mistakes in Next.js 16](https://medium.com/@sureshdotariya/10-performance-mistakes-in-next-js-16-that-are-killing-your-app-and-how-to-fix-them-2facfab26bea)

---

## MODERATE PITFALLS

Mistakes causing delays, technical debt, or user frustration but recoverable.

### 10. Large Refactoring Without Incremental Deployment

**Severity:** MODERATE
**Phase Impact:** All Phases (Strategy)

**What goes wrong:** Big-bang deployment of performance optimizations causes unexpected breakage across unrelated features. No way to isolate which change caused production issue.

**Why it happens:** Pressure to "fix performance" leads to bundling multiple changes into one release. 110K LOC + 750 files = high complexity, many edge cases.

**Consequences:**
- Production issue, unclear which change caused it
- Rollback loses all optimization work
- Team loses confidence in optimization effort
- Extended debugging sessions under production pressure

**Prevention:**
1. **Phase approach with feature flags:**
   ```typescript
   // lib/features.ts
   export const features = {
     optimizedInspectionList: process.env.NEXT_PUBLIC_FF_INSPECTION_OPT === 'true',
     improvedCaching: process.env.NEXT_PUBLIC_FF_CACHING === 'true',
     // ...
   };
   ```
   ```typescript
   // Gradual rollout
   export default async function InspectionList() {
     if (features.optimizedInspectionList) {
       return <OptimizedInspectionList />;
     }
     return <LegacyInspectionList />; // Keep old version
   }
   ```
2. Deploy optimizations in priority order:
   - Week 1: Critical security patches only
   - Week 2: High-impact performance win #1 (e.g., Dynamic API fixes)
   - Week 3: High-impact performance win #2 (e.g., data caching)
   - Week 4: Bundle optimization
3. Use canary releases:
   - Deploy to 5% of users first
   - Monitor for 24-48 hours
   - Gradually increase to 100%
4. Maintain rollback capability for each phase
5. Document what changed in each deployment for debugging

**Detection:**
- Test each change in isolation on staging
- Monitor error rates after each deployment
- Track performance metrics per deployment
- A/B test optimized vs legacy versions

**Phase to address:** Phase planning strategy - inform roadmap structure

**Sources:**
- [How to Refactor Complex Codebases](https://www.freecodecamp.org/news/how-to-refactor-complex-codebases/)
- [Refactoring at Scale - Key Points](https://understandlegacycode.com/blog/key-points-of-refactoring-at-scale/)
- [Mistakes in Large Established Codebases](https://www.seangoedecke.com/large-established-codebases/)

---

### 11. Security Dependency Updates Breaking Build

**Severity:** MODERATE
**Phase Impact:** Security Audit (Phase 1)

**What goes wrong:** Running `npm audit fix` to patch vulnerabilities breaks the build due to breaking changes in dependencies.

**Consequences:**
- Security updates blocked
- Build failures in CI/CD
- Team wastes time debugging dependency issues
- Delayed security patches increase vulnerability window

**Prevention:**
1. **Never run `npm audit fix` blindly in production codebase:**
   ```bash
   # ❌ DON'T DO THIS
   npm audit fix
   git commit -m "fix vulnerabilities"

   # ✅ DO THIS
   # 1. Review audit report first
   npm audit

   # 2. Fix only high/critical, no breaking changes
   npm audit fix --only=prod --audit-level=high

   # 3. Test build
   npm run build
   npm run test

   # 4. Review what changed
   git diff package.json package-lock.json
   ```
2. Update dependencies incrementally with testing:
   ```bash
   # Update one at a time
   npm update next
   npm run build && npm test
   git commit -m "chore: update next.js to X.Y.Z"

   npm update react react-dom
   npm run build && npm test
   git commit -m "chore: update react to X.Y.Z"
   ```
3. Use tools like Dependabot with auto-merge only for patch versions:
   ```yaml
   # .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
       open-pull-requests-limit: 5
       # Auto-merge only patch updates
       versioning-strategy: increase-if-necessary
   ```
4. Test in staging environment before merging
5. Keep lockfile committed to ensure reproducible builds

**Detection:**
- CI build failures after dependency updates
- Type errors after updates
- Runtime errors with new dependency versions
- Test failures pointing to dependency behavior changes

**Phase to address:** Phase 1 (Security Audit) - systematic, tested approach

**Sources:**
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/)
- [Using Components with Known Vulnerabilities](https://www.cybersecuritydive.com/news/critical-vulnerabilities-found-in-react-and-nextjs/807016/)

---

### 12. Environment Variables Exposed to Client Bundle

**Severity:** MODERATE
**Phase Impact:** Security Audit (Phase 1)

**What goes wrong:** Sensitive configuration (database URLs, API keys, secrets) accidentally shipped to client JavaScript bundle, exposing credentials publicly.

**Why it happens:**
- Misunderstanding `NEXT_PUBLIC_` prefix meaning
- Importing server-only config in Client Components
- Not validating which env vars are actually public-safe

**Consequences:**
- Database credentials exposed in browser DevTools
- API keys stolen, abused (billing impact)
- Security compliance violations
- Credential rotation required (downtime)

**Prevention:**
1. **Audit current environment variables:**
   ```bash
   # List all env vars in codebase
   grep -r "process.env" app/ --include="*.ts" --include="*.tsx"

   # Check .env files
   cat .env.local .env.production
   ```
2. **Strict naming convention:**
   ```bash
   # ✅ PUBLIC (safe to expose)
   NEXT_PUBLIC_API_URL=https://api.example.com
   NEXT_PUBLIC_APP_VERSION=1.0.0

   # ✅ PRIVATE (server-only)
   DATABASE_URL=postgresql://...
   SUPABASE_SERVICE_KEY=...
   JWT_SECRET=...
   STRIPE_SECRET_KEY=...
   ```
3. **Server-only access pattern:**
   ```typescript
   // lib/env.server.ts
   // Mark as server-only
   import 'server-only';

   export const serverEnv = {
     databaseUrl: process.env.DATABASE_URL!,
     jwtSecret: process.env.JWT_SECRET!,
   };

   // This will cause build error if imported in Client Component
   ```
4. Add to `.gitignore`:
   ```
   .env.local
   .env*.local
   .env.production
   ```
5. Use Next.js built-in validation:
   ```typescript
   // next.config.js
   module.exports = {
     env: {
       // Explicitly whitelist public vars
       NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
     },
   };
   ```

**Detection:**
- Inspect production bundle in browser DevTools > Sources
- Search bundle for sensitive strings (database, api.key, secret)
- Run build and check `.next/static/chunks` for leaked env vars
- Use tool: `npx @next/bundle-analyzer` and search output

**Phase to address:** Phase 1 (Security Audit) - immediate audit before other work

**Sources:**
- [Next.js Environment Variables Guide 2026](https://thelinuxcode.com/nextjs-environment-variables-2026-build-time-vs-runtime-security-and-production-patterns/)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security)
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)

---

### 13. Custom Auth CSRF Vulnerability in Route Handlers

**Severity:** MODERATE
**Phase Impact:** Security Audit (Phase 1)

**What goes wrong:** Custom Route Handlers (`app/api/*/route.ts`) lack CSRF protection that Server Actions have built-in, allowing cross-site attacks to perform authenticated actions.

**Consequences:**
- Attackers trigger state-changing operations (delete, update) via victim's authenticated session
- Data manipulation/deletion
- Account takeover scenarios

**Prevention:**
1. **Identify vulnerable endpoints:**
   ```bash
   # Find all Route Handlers
   find app -type f -path "*/api/*/route.ts"

   # Audit for state-changing operations without CSRF protection
   # Look for POST, PUT, DELETE methods
   ```
2. **Implement CSRF token validation:**
   ```typescript
   // lib/csrf.ts
   import { cookies, headers } from 'next/headers';

   export async function validateCsrfToken() {
     const token = headers().get('x-csrf-token');
     const cookieToken = cookies().get('csrf-token')?.value;

     if (!token || token !== cookieToken) {
       throw new Error('CSRF validation failed');
     }
   }

   // app/api/inspections/route.ts
   export async function POST(request: Request) {
     await validateCsrfToken(); // ADD THIS

     // Rest of handler
   }
   ```
3. **Alternative: Use Server Actions instead of Route Handlers**
   - Server Actions have built-in CSRF protection
   - Simpler security model
   - Better for form submissions and mutations
4. Add Origin/Referer header validation:
   ```typescript
   export async function POST(request: Request) {
     const origin = headers().get('origin');
     const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL];

     if (!origin || !allowedOrigins.includes(origin)) {
       return new Response('Forbidden', { status: 403 });
     }

     // Rest of handler
   }
   ```

**Detection:**
- Audit all Route Handlers for state-changing operations
- Test with CSRF attack simulation:
   ```html
   <!-- Attacker's page -->
   <form action="https://yourapp.com/api/delete" method="POST">
     <input name="id" value="victim-data" />
   </form>
   <script>document.forms[0].submit();</script>
   ```
- Check if request succeeds without valid token

**Phase to address:** Phase 1 (Security Audit) - custom auth requires extra scrutiny

**Sources:**
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/)
- [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions)

---

## MINOR PITFALLS

Mistakes causing annoyance, minor performance issues, or cosmetic problems but easily fixable.

### 14. German Collation Breaking Sort Order

**Severity:** MINOR
**Phase Impact:** Character Encoding Fixes

**What goes wrong:** After fixing character encoding (ae→ä), sort order breaks because database collation doesn't respect German alphabetization rules.

**Why it happens:** Encoding (how characters are stored) ≠ Collation (how strings are sorted). UTF-8 encoding doesn't automatically mean German sorting rules.

**Consequences:**
- Names/addresses sorted incorrectly (ä sorted after z instead of near a)
- User confusion
- Search/filter results feel "broken"
- Compliance issues if alphabetization required

**Prevention:**
1. **Check current collation:**
   ```sql
   SELECT datname, datcollate, datctype
   FROM pg_database
   WHERE datname = 'your_database';
   ```
2. **Set German locale when fixing encoding:**
   ```sql
   -- Option 1: Set at database creation (requires recreation)
   CREATE DATABASE kewa_app
     ENCODING = 'UTF8'
     LC_COLLATE = 'de_DE.UTF8'
     LC_CTYPE = 'de_DE.UTF8';

   -- Option 2: Set for specific columns (non-destructive)
   ALTER TABLE contacts
     ALTER COLUMN name TYPE VARCHAR(255)
     COLLATE "de_DE.UTF8";
   ```
3. **Application-level sorting if DB change not feasible:**
   ```typescript
   // Use Intl.Collator for German sorting
   const germanCollator = new Intl.Collator('de-DE');

   names.sort((a, b) => germanCollator.compare(a, b));
   // Correctly sorts: "Müller" before "Neumann"
   ```
4. Test with German characters in staging:
   ```sql
   -- Test data
   INSERT INTO contacts (name) VALUES
     ('Müller'), ('Mueller'), ('Becker'), ('Äpfel'),
     ('Apfel'), ('Öhler'), ('Zahner'), ('Über');

   -- Verify sort order
   SELECT name FROM contacts ORDER BY name COLLATE "de_DE.UTF8";
   ```

**Detection:**
- User reports incorrect sorting
- Automated test with German test data
- Visual inspection of sorted lists in app

**Phase to address:** Same phase as character encoding fixes - bundle together

**Sources:**
- [PostgreSQL German Umlauts Full Text Search](https://www.dbi-services.com/blog/dealing-with-german-umlaute-in-postgresqls-full-text-search/)
- [PostgreSQL Order By with German Umlauts](https://bytes.com/topic/postgresql/answers/173467-order-does-wrong-unicode-chars-german-umlauts)

---

### 15. Missing Monitoring for Performance Regressions

**Severity:** MINOR
**Phase Impact:** Monitoring Setup (Phase 3)

**What goes wrong:** Team optimizes performance, deploys, but has no way to detect if future changes regress performance. Sluggishness returns unnoticed.

**Consequences:**
- Performance gains eroded over time
- No alerts when regression occurs
- Can't pinpoint which deployment caused regression
- Users suffer degraded experience silently

**Prevention:**
1. **Implement Core Web Vitals tracking:**
   ```typescript
   // app/layout.tsx
   import { Analytics } from '@vercel/analytics/react';
   import { SpeedInsights } from '@vercel/speed-insights/next';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
           <SpeedInsights />
         </body>
       </html>
     );
   }
   ```
2. **Custom performance monitoring:**
   ```typescript
   // lib/monitoring.ts
   export function reportWebVitals(metric) {
     // Send to your analytics
     if (metric.label === 'web-vital') {
       analytics.track('Web Vitals', {
         name: metric.name, // LCP, FID, CLS, FCP, TTFB
         value: metric.value,
         page: window.location.pathname,
       });
     }
   }

   // app/layout.tsx
   'use client';
   import { useReportWebVitals } from 'next/web-vitals';

   export function WebVitals() {
     useReportWebVitals(reportWebVitals);
     return null;
   }
   ```
3. **Set performance budgets in CI:**
   ```javascript
   // lighthouse-ci.config.js
   module.exports = {
     ci: {
       collect: {
         url: ['http://localhost:3000/'],
       },
       assert: {
         assertions: {
           'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
           'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
           'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
           'total-blocking-time': ['warn', { maxNumericValue: 300 }],
         },
       },
     },
   };
   ```
4. Monitor these key metrics:
   - LCP (Largest Contentful Paint) - loading performance
   - FID (First Input Delay) - interactivity
   - CLS (Cumulative Layout Shift) - visual stability
   - TTFB (Time to First Byte) - server response time
   - Bundle sizes over time

**Detection:**
- Alerts when metrics exceed thresholds
- Weekly performance reports
- Compare before/after optimization metrics
- Track trends over deployments

**Phase to address:** Phase 3 (Monitoring Setup) - after optimizations implemented

**Sources:**
- [Best Practices for Monitoring PWAs](https://www.datadoghq.com/blog/progressive-web-application-monitoring/)
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)

---

## PHASE-SPECIFIC WARNINGS

Guidance on which phases require extra caution or deeper research.

| Phase Topic | Likely Pitfall | Mitigation Strategy |
|-------------|----------------|---------------------|
| **Security Patching** | Breaking active sessions, CVE fixes causing build breaks | Phase 1: Test patches on staging with active sessions first. Have rollback plan. Update one CVE at a time. |
| **Performance - Dynamic APIs** | Overzealous refactoring breaking functionality | Phase 1: Audit locations first, fix incrementally with testing between each change. |
| **Authorization Audit** | Missing auth checks in Server Actions, middleware bypass | Phase 1: Systematic audit of all Server Actions, establish required pattern before making changes. |
| **Character Encoding** | Data corruption, backup incompatibility, collation issues | Dedicated phase: Test on database copy first. Validate all text data. Include collation fix. |
| **Server/Client Boundaries** | Serialization errors, hydration mismatches, secret exposure | Phase 2: Document current boundaries before changing. Test serialization explicitly. Move "use client" incrementally. |
| **Data Caching** | Over-caching dynamic data (stale), under-caching (performance) | Phase 2: Categorize queries by staleness tolerance. Cache static/slow queries first, leave real-time queries uncached. |
| **PWA Caching** | Stale data served offline, storage overflow, cache eviction | Phase 2: Differentiate strategies by content type. Network-first for user data, cache-first for static. Monitor storage quota. |
| **Bundle Optimization** | Breaking dynamic imports, removing actually-used code | Phase 2: Run bundle analyzer FIRST before any optimization. Validate each optimization doesn't break functionality. |
| **Large Refactoring** | Big-bang deployment causing unrelated breakage | All phases: Deploy incrementally with feature flags. Canary releases. Maintain rollback capability. |
| **Dependency Updates** | Breaking changes in security patches | Phase 1: Update dependencies one at a time. Test build after each. Use Dependabot for patch-only auto-merge. |
| **Environment Variables** | Secrets exposed to client bundle | Phase 1: Audit all process.env usage. Use server-only pattern. Verify bundle doesn't contain secrets. |
| **CSRF Protection** | Custom Route Handlers vulnerable to cross-site attacks | Phase 1: Audit all Route Handlers. Add CSRF validation. Prefer Server Actions when possible. |
| **German Collation** | Sort order breaks after encoding fix | Same phase as encoding: Test sort with German test data. Set de_DE collation alongside UTF-8. |
| **Performance Monitoring** | Can't detect future regressions | Phase 3: Implement before declaring "done". Set performance budgets in CI. Track Core Web Vitals. |

---

## SUMMARY: Critical Prevention Strategies

**Before starting any phase:**

1. ✅ **Test on staging first** - Never test optimizations or security patches directly in production
2. ✅ **One change at a time** - Isolate variables for easier debugging when issues occur
3. ✅ **Measure before optimizing** - Bundle analysis, performance profiling, security scan to know current state
4. ✅ **Maintain rollback capability** - Feature flags, database backups, deployment rollback plan
5. ✅ **Deploy incrementally** - Canary releases, gradual rollouts, not big-bang deployments
6. ✅ **Monitor actively** - Real-time alerts, performance tracking, error monitoring
7. ✅ **Document changes** - What changed, why, expected impact for future debugging

**Highest priority prevention actions for this project:**

| Priority | Action | Why Critical | Time Required |
|----------|--------|--------------|---------------|
| 🔴 1 | Upgrade Next.js for CVE fixes | Multiple CVSS 9-10 vulnerabilities | 2 hours |
| 🔴 2 | Audit Server Actions for missing auth | Authorization bypass risk | 4 hours |
| 🔴 3 | Check for Dynamic APIs in layouts | Likely cause of "general sluggishness" | 1 hour |
| 🟡 4 | Run bundle analyzer | Identify what's actually bloating the bundle | 1 hour |
| 🟡 5 | Plan character encoding migration | High data corruption risk if done wrong | 8 hours (planning) |
| 🟡 6 | Audit environment variables | Secret exposure risk | 2 hours |
| 🟢 7 | Setup performance monitoring | Prevent future regressions | 3 hours |

---

**Total confidence level:** HIGH for Next.js-specific pitfalls, MEDIUM for database migration specifics (requires project-specific validation)

**Research sources:** 28 sources across official Next.js docs, security advisories, production case studies, and database migration guides (2025-2026)
