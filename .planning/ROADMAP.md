# Roadmap: KEWA

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2025-03-XX)
- ✅ **v2.0 Advanced Features** — Phases 7-12.3 (shipped 2026-01-19)
- ✅ **v2.1 Master Data Management** — Phases 13-17 (shipped 2026-01-25)
- ✅ **v2.2 Extensions** — Phases 18-24 (shipped 2026-01-29)
- ✅ **v3.0 Tenant & Offline** — Phases 25-29 (shipped 2026-02-03)
- 📋 **v3.1 Production Hardening** — Phases 30-34 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2025-03-XX</summary>

See milestones/v1.0-ROADMAP.md

</details>

<details>
<summary>✅ v2.0 Advanced Features (Phases 7-12.3) — SHIPPED 2026-01-19</summary>

See milestones/v2.0-ROADMAP.md

</details>

<details>
<summary>✅ v2.1 Master Data Management (Phases 13-17) — SHIPPED 2026-01-25</summary>

See milestones/v2.1-ROADMAP.md

</details>

<details>
<summary>✅ v2.2 Extensions (Phases 18-24) — SHIPPED 2026-01-29</summary>

See milestones/v2.2-ROADMAP.md (not yet created — archive on next milestone completion)

### Phase 18: Knowledge Base — 5/5 plans complete
### Phase 19: Supplier Core — 3/3 plans complete
### Phase 20: Supplier Advanced — 3/3 plans complete
### Phase 21: Change Orders — 4/4 plans complete
### Phase 22: Inspection Core — 3/3 plans complete
### Phase 23: Inspection Advanced — 3/3 plans complete
### Phase 24: Push Notifications — 4/4 plans complete

</details>

<details>
<summary>✅ v3.0 Tenant & Offline (Phases 25-29) — SHIPPED 2026-02-03</summary>

See milestones/v3.0-ROADMAP.md

### Phase 25: UX Polish (Known Issues) — 2/2 plans complete
### Phase 26: Tenant Portal Core — 4/4 plans complete
### Phase 27: PWA Foundation — 3/3 plans complete
### Phase 28: Offline Data Sync — 5/5 plans complete
### Phase 29: Tenant Extras & UX — 3/3 plans complete

</details>

### 📋 v3.1 Production Hardening (Phases 30-34)

**Milestone Goal:** App wird schneller, sicherer, und alle deutschen Umlaute werden korrigiert.

Production-ready enterprise hardening across security (CVE patching, auth hardening), performance (Core Web Vitals compliance, database optimization), and German language correctness.

---

### Phase 30: Security Audit & CVE Patching

**Goal:** Critical vulnerabilities patched, authorization gaps closed, security headers configured

**Depends on:** Nothing (first phase of v3.1)

**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09

**Success Criteria** (what must be TRUE):
1. Next.js upgraded to latest patch version with CVE-2025-29927 fix applied
2. npm audit shows 0 critical and 0 high severity vulnerabilities
3. CSP and security headers return on all routes (verify with curl)
4. Server Actions cannot be invoked without valid session (authorization test passes)
5. Auth endpoints rate-limited (10+ rapid requests return 429)
6. App displays error boundary instead of white screen when component crashes

**Plans:** 5 plans

Plans:
- [x] 30-01-PLAN.md — CVE patching: Next.js 16.1.6 upgrade, npm audit fix
- [x] 30-02-PLAN.md — Security headers: CSP, X-Frame-Options, cookie hardening
- [x] 30-03-PLAN.md — Rate limiting: Upstash ratelimit on 13 auth endpoints
- [x] 30-04-PLAN.md — Error boundaries: global-error.tsx and error.tsx
- [x] 30-05-PLAN.md — Security audit: Service worker, env vars, Server Actions

---

### Phase 31: Performance Profiling & Baseline

**Goal:** Current performance measured with tooling in place to detect regressions

**Depends on:** Phase 30

**Requirements:** PERF-01, PERF-02

**Success Criteria** (what must be TRUE):
1. Lighthouse report shows baseline LCP, INP, CLS scores for 3 key pages (dashboard, project detail, inspection form)
2. Bundle analysis report identifies top 10 largest dependencies with size in KB
3. Real user Web Vitals monitored (Vercel Speed Insights integrated)

**Plans:** 3 plans

Plans:
- [x] 31-01-PLAN.md — Speed Insights + Bundle Analyzer setup
- [x] 31-02-PLAN.md — Lighthouse CI + GitHub Actions workflows
- [x] 31-03-PLAN.md — Baseline collection and documentation

---

### Phase 32: Database Optimization

**Goal:** Database queries fast enough for production load (p95 < 100ms)

**Depends on:** Phase 31

**Requirements:** PERF-03, PERF-04

**Success Criteria** (what must be TRUE):
1. Slow queries identified in profiling have indexes (verify with EXPLAIN ANALYZE)
2. Dashboard page loads without N+1 queries (Supabase query log shows single query per table)
3. Property heatmap page loads in < 2 seconds with 50+ units

**Plans:** 2 plans

Plans:
- [x] 32-01-PLAN.md — Query profiling and performance indexes
- [x] 32-02-PLAN.md — N+1 elimination with React cache()

---

### Phase 33: Bundle & Rendering Optimization

**Goal:** App renders efficiently with minimal JavaScript sent to client

**Depends on:** Phase 32

**Requirements:** PERF-05, PERF-06, PERF-07

**Success Criteria** (what must be TRUE):
1. Dashboard pages load data in parallel (Network DevTools shows parallel requests, not waterfall)
2. Dynamic APIs removed from root/nested layouts (build output shows static routes where possible)
3. Heavy components lazy loaded (bundle reduced by 100+ KB)
4. LCP improved by 20%+ compared to Phase 31 baseline

**Plans:** 2 plans

Plans:
- [ ] 33-01-PLAN.md — Lazy load heavy Recharts and TipTap components (100+ KB reduction)
- [ ] 33-02-PLAN.md — Parallel fetch audit and build verification (metrics collection)

---

### Phase 34: German Umlaut Correction

**Goal:** All German text displays correctly with proper umlauts (ä, ö, ü)

**Depends on:** Phase 30 (parallel with 31-33)

**Requirements:** I18N-01, I18N-02, I18N-03

**Success Criteria** (what must be TRUE):
1. Source files verified as UTF-8 encoded (file encoding check passes)
2. No German text contains ae/oe/ue substitutions (grep returns 0 matches in UI strings)
3. German sort order works correctly (ä sorted after a, not after z)
4. Existing database data displays correctly (no corruption from encoding mismatch)

**Plans:** TBD

Plans:
- [ ] 34-01: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 30 → 31 → 32 → 33 → 34
Phase 34 can run in parallel with 31-33 after 30 completes.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v1.0 | 17/17 | Complete | 2025-03-XX |
| 7-12.3 | v2.0 | 31/31 | Complete | 2026-01-19 |
| 13-17 | v2.1 | 24/24 | Complete | 2026-01-25 |
| 18-24 | v2.2 | 25/25 | Complete | 2026-01-29 |
| 25-29 | v3.0 | 17/17 | Complete | 2026-02-03 |
| 30. Security Audit | v3.1 | 5/5 | Complete | 2026-02-05 |
| 31. Performance Profiling | v3.1 | 3/3 | Complete | 2026-02-05 |
| 32. Database Optimization | v3.1 | 2/2 | Complete | 2026-02-05 |
| 33. Bundle & Rendering | v3.1 | 0/TBD | Not started | - |
| 34. German Umlauts | v3.1 | 0/TBD | Not started | - |

**Total:** 32 phases complete, 2 phases planned

---

*Last updated: 2026-02-05 — Phase 32 complete*
