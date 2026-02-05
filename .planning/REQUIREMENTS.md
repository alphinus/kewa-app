# Requirements: v3.1 Production Hardening

**Milestone:** v3.1 Production Hardening
**Created:** 2026-02-04
**Status:** Active

## Performance (PERF)

- [x] **PERF-01**: Lighthouse audit establishes Core Web Vitals baseline (LCP, INP, CLS scores documented)
- [x] **PERF-02**: Bundle analysis identifies large dependencies and optimization opportunities
- [ ] **PERF-03**: Database indexes created for slow queries (p95 < 100ms target)
- [ ] **PERF-04**: N+1 query patterns eliminated from high-traffic pages
- [ ] **PERF-05**: Dashboard pages use parallel data fetching (no request waterfalls)
- [ ] **PERF-06**: Dynamic API usage audited and moved out of layouts where possible
- [ ] **PERF-07**: Heavy components (editors, modals) use dynamic imports with lazy loading

## Security (SEC)

- [x] **SEC-01**: Next.js upgraded to latest patch (CVE-2025-29927 and other critical fixes)
- [x] **SEC-02**: npm audit shows 0 critical and 0 high severity vulnerabilities
- [x] **SEC-03**: CSP headers configured in next.config.ts (prevent XSS)
- [x] **SEC-04**: JWT cookies use HttpOnly and SameSite=Strict flags
- [x] **SEC-05**: Server Actions have authorization checks (N/A - no Server Actions exist)
- [x] **SEC-06**: Rate limiting implemented on auth endpoints (/api/auth/*)
- [x] **SEC-07**: Error boundaries prevent white screen of death (global-error.tsx)
- [x] **SEC-08**: Service worker scope and caching strategy reviewed for security
- [x] **SEC-09**: Environment variables audited (no secrets in NEXT_PUBLIC_*)

## Rechtschreibung (I18N)

- [ ] **I18N-01**: Source files verified as UTF-8 encoded
- [ ] **I18N-02**: All German umlauts corrected (ae→ä, ue→ü, oe→ö) throughout codebase
- [ ] **I18N-03**: Database collation verified as UTF-8 for proper German sorting

---

## Future (Post-v3.1)

- String externalization to de.json (i18n preparation)
- Full i18n framework (multi-language support)
- Advanced caching strategies
- Monitoring/observability setup
- WebAuthn/passkeys for auth

## Out of Scope

- Full i18n framework (next-intl) — App is German-only, no multi-language requirement
- Complete performance rewrite — Profile first, fix specific bottlenecks
- Database migration — Supabase is fine, optimize queries instead
- Replacing JWT auth — Harden existing implementation, don't replace
- WebAuthn/passkeys — Two internal users with PINs, not needed

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| PERF-01 | Phase 31 | Complete |
| PERF-02 | Phase 31 | Complete |
| PERF-03 | Phase 32 | Pending |
| PERF-04 | Phase 32 | Pending |
| PERF-05 | Phase 33 | Pending |
| PERF-06 | Phase 33 | Pending |
| PERF-07 | Phase 33 | Pending |
| SEC-01 | Phase 30 | Complete |
| SEC-02 | Phase 30 | Complete |
| SEC-03 | Phase 30 | Complete |
| SEC-04 | Phase 30 | Complete |
| SEC-05 | Phase 30 | N/A |
| SEC-06 | Phase 30 | Complete |
| SEC-07 | Phase 30 | Complete |
| SEC-08 | Phase 30 | Complete |
| SEC-09 | Phase 30 | Complete |
| I18N-01 | Phase 34 | Pending |
| I18N-02 | Phase 34 | Pending |
| I18N-03 | Phase 34 | Pending |

---

*Created: 2026-02-04*
*19 requirements across 3 categories*
