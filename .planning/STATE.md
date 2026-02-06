# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle uber alle Renovationen -- mit standardisierten Workflows, externer Handwerker-Integration, Kostenuebersicht und automatischer Zustandshistorie.
**Current focus:** Milestone v3.1 Production Hardening — Phase 32 Complete

## Current Position

Phase: 33 of 34 (Bundle & Rendering Optimization)
Plan: 1 of 2 complete
Status: In progress
Last activity: 2026-02-06 — Completed 33-01-PLAN.md (Component Lazy Loading)

Progress: [███████░░░] 70% (3.5/5 phases v3.1)

## Milestones Completed

- v1.0 MVP (2025-03-XX) — Phases 1-6
- v2.0 Advanced Features (2026-01-19) — Phases 7-12.3
- v2.1 Master Data Management (2026-01-25) — Phases 13-17
- v2.2 Extensions (2026-01-29) — Phases 18-24
- v3.0 Tenant & Offline (2026-02-03) — Phases 25-29

**Total:** 31 phases, 124 plans shipped

## Performance Metrics

**v3.1 Milestone (in progress):**
- Phase 30: 5 plans, ~30min total
- Phase 31: 3 plans, ~38min total
- Phase 32: 2 plans, ~17min total
- Commits: 25

**v3.0 Milestone:**
- Total plans completed: 17
- Average duration: 22min
- Total execution time: 375min
- Days: 5 (2026-01-29 → 2026-02-03)
- Commits: 77

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

Key v3.1 decisions (Phase 30):
- Upstash Redis for rate limiting (serverless-compatible)
- SameSite=Strict for session cookies (CSRF hardening)
- CSP with unsafe-inline/unsafe-eval (Next.js compatibility)
- German error messages in error boundaries

Key v3.1 decisions (Phase 31):
- cross-env for Windows-compatible ANALYZE=true script
- openAnalyzer: false for CI environments
- Median of 3 runs for stable Lighthouse baseline
- TBT as INP proxy in synthetic testing

Key v3.1 decisions (Phase 32):
- Composite indexes over single-column for multi-filter queries
- CONCURRENTLY for production-safe index creation
- Static query profiling when Docker unavailable
- React cache() for request-level query deduplication
- TypeScript aggregates to eliminate N+1 view queries

Key v3.1 decisions (Phase 33):
- Client wrapper components for lazy loading in server components
- ssr: false for Recharts and TipTap (browser API dependencies)
- Direct file imports over barrel imports for code splitting

### v3.1 Roadmap Structure

**5 phases derived from 19 requirements:**
- Phase 30: Security Audit & CVE Patching (SEC-01 to SEC-09) — COMPLETE
- Phase 31: Performance Profiling & Baseline (PERF-01, PERF-02) — COMPLETE
- Phase 32: Database Optimization (PERF-03, PERF-04) — COMPLETE
- Phase 33: Bundle & Rendering Optimization (PERF-05, PERF-06, PERF-07)
- Phase 34: German Umlaut Correction (I18N-01, I18N-02, I18N-03)

**Coverage:** 13/19 requirements complete (68%)

**Execution order:** 33 → 34

### Performance Baseline (from Phase 31)

Login page Core Web Vitals:
- Performance: 83 (target: 75+) - PASS
- LCP: 3204ms (target: <4000ms) - PASS
- TBT: 338ms (target: <200ms) - WARN
- CLS: 0.000 (target: <0.1) - PASS

Bundle size: 2.27MB total client JS
Top optimization targets:
- Recharts: 337KB
- ProseMirror/TipTap: 292KB
- Supabase: 177KB

### User Setup Required

**For Phase 30 (Rate Limiting):**
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
- Get from: console.upstash.com → Create Database

**For Phase 31 (Performance Testing):**
- Puppeteer already installed with performance tooling
- Set LIGHTHOUSE_TEST_PIN env var with valid PIN for auth testing

### Blockers/Concerns

**Environment setup needed for production:**
- Upstash Redis credentials for rate limiting (NEW - Phase 30)
- Resend API key required for email notifications (RESEND_API_KEY)
- Push notification VAPID keys in environment secrets

### Tech Debt

From v3.0-MILESTONE-AUDIT.md:
- useInstallPrompt timer cleanup missing (warning severity)
- Emergency contact schema extension needed (info severity)

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed 33-01-PLAN.md (Component Lazy Loading)
Resume file: None

---
*Phase 33 in progress. Component lazy loading done. Next: 33-02-PLAN.md*
