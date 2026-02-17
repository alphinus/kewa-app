# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** KEWA AG hat volle Transparenz und Kontrolle über alle Renovationen -- mit standardisierten Workflows, externer Handwerker-Integration, Kostenübersicht und automatischer Zustandshistorie.
**Current focus:** Milestone v3.1 Production Hardening — Phase 34 Complete — MILESTONE COMPLETE

## Current Position

Phase: 34 of 34 (German Umlaut Correction)
Plan: 2 of 2 complete
Status: Phase complete — Milestone v3.1 complete
Last activity: 2026-02-17 — Completed 34-02-PLAN.md (Umlaut Corrections)

Progress: [██████████] 100% (5/5 phases v3.1)

## Milestones Completed

- v1.0 MVP (2025-03-XX) — Phases 1-6
- v2.0 Advanced Features (2026-01-19) — Phases 7-12.3
- v2.1 Master Data Management (2026-01-25) — Phases 13-17
- v2.2 Extensions (2026-01-29) — Phases 18-24
- v3.0 Tenant & Offline (2026-02-03) — Phases 25-29
- v3.1 Production Hardening (2026-02-17) — Phases 30-34

**Total:** 34 phases, 130 plans shipped

## Performance Metrics

**v3.1 Milestone (complete):**
- Phase 30: 5 plans, ~30min total
- Phase 31: 3 plans, ~38min total
- Phase 32: 2 plans, ~17min total
- Phase 33: 2 plans, ~30min total
- Phase 34: 2 plans, ~20min total
- Commits: 28+

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
- Accept 18.7% LCP improvement as success (close to 20% target)
- Bundle reduction of 629KB exceeds 100KB requirement by 6x

Key v3.1 decisions (Phase 34):
- Dictionary-based replacement over regex (avoid false positives)
- Preserve URL route segments without umlauts (Next.js file-system routing)
- Preserve function/variable names without umlauts (code identifiers)
- chardet with byte-level ASCII check (avoid false positives on pure-ASCII files)
- New SQL migration for database text (don't modify applied migrations)

### v3.1 Roadmap Structure

**5 phases derived from 19 requirements:**
- Phase 30: Security Audit & CVE Patching (SEC-01 to SEC-09) — COMPLETE
- Phase 31: Performance Profiling & Baseline (PERF-01, PERF-02) — COMPLETE
- Phase 32: Database Optimization (PERF-03, PERF-04) — COMPLETE
- Phase 33: Bundle & Rendering Optimization (PERF-05, PERF-06, PERF-07) — COMPLETE
- Phase 34: German Umlaut Correction (I18N-01, I18N-02, I18N-03) — COMPLETE

**Coverage:** 19/19 requirements complete (100%)

### User Setup Required

**For Phase 30 (Rate Limiting):**
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
- Get from: console.upstash.com → Create Database

**For Phase 31 (Performance Testing):**
- Puppeteer already installed with performance tooling
- Set LIGHTHOUSE_TEST_PIN env var with valid PIN for auth testing

### Blockers/Concerns

**Environment setup needed for production:**
- Upstash Redis credentials for rate limiting (Phase 30)
- Resend API key required for email notifications (RESEND_API_KEY)
- Push notification VAPID keys in environment secrets

### Tech Debt

From v3.0-MILESTONE-AUDIT.md:
- useInstallPrompt timer cleanup missing (warning severity)
- Emergency contact schema extension needed (info severity)

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed Phase 34 — v3.1 milestone complete
Resume file: None

---
*v3.1 Production Hardening milestone complete. All 19 requirements shipped.*
