# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**TypeScript Type Safety Workarounds:**
- Issue: Heavy reliance on `as unknown as` type assertions to work around Supabase's generated types not matching actual query results
- Files:
  - `src/app/api/reports/weekly/route.ts:191`
  - `src/lib/comments/comment-queries.ts:42`
  - `src/app/api/photos/route.ts:77`
  - `src/app/api/templates/[id]/tasks/route.ts:165`
  - `src/app/dashboard/wohnungen/[id]/page.tsx:147`
  - `src/lib/contractor/queries.ts:146, 279`
  - `src/app/api/auth/login/route.ts:152, 295`
  - `src/app/api/work-orders/[id]/pdf/route.ts:135`
- Impact: Type safety is compromised; runtime type errors possible; harder to refactor
- Fix approach: Generate proper Supabase types with `supabase gen types` and create proper type definitions for joined queries

**`any` Type Usage with eslint-disable:**
- Issue: Explicit `any` types with eslint rule suppression
- Files:
  - `src/lib/costs/project-cost-queries.ts:275-276, 408-409`
  - `src/components/costs/ExpenseForm.tsx:44-45`
- Impact: Type checking disabled for these areas
- Fix approach: Define proper interfaces for Supabase relation responses

**Missing eslint-disable-line for React hooks:**
- Issue: Missing dependency arrays in useEffect/useCallback hooks
- Files:
  - `src/components/admin/work-orders/EventLog.tsx:167`
  - `src/components/units/UnitTimeline.tsx:189`
  - `src/components/costs/InvoiceForm.tsx:147`
- Impact: Potential stale closures or infinite re-renders
- Fix approach: Review each case and either add proper dependencies or refactor to eliminate the need for eslint suppression

**Legacy Role System Alongside RBAC:**
- Issue: Dual role systems maintained - legacy `role: 'kewa' | 'imeri'` and new RBAC `roleId/roleName/permissions`
- Files:
  - `src/lib/session.ts:31-37, 42-54`
  - `src/lib/auth.ts:62-68, 84-125`
- Impact: Code complexity; potential for role checks to be inconsistent
- Fix approach: Complete migration to RBAC and deprecate legacy role field

## Known Bugs

**No Critical Bugs Detected:**
- Codebase grep for TODO/FIXME/BUG returned no active bug markers in source code
- Planning documents reference fixed bugs from phases 1, 4, 9, 10, 12

## Security Considerations

**Missing Rate Limiting:**
- Risk: API endpoints have no rate limiting implementation
- Files: All files in `src/app/api/`
- Current mitigation: None detected
- Recommendations:
  - Add rate limiting middleware for authentication endpoints
  - Implement request throttling for file upload endpoints
  - Consider edge-based rate limiting (Vercel Edge Config or similar)

**Missing Input Validation/Sanitization:**
- Risk: No dedicated input sanitization layer detected
- Files: All API routes rely on TypeScript types for validation
- Current mitigation: Supabase RLS (though currently disabled per `004_disable_rls.sql`)
- Recommendations:
  - Add Zod or similar schema validation for API inputs
  - Re-enable RLS with proper policies
  - Sanitize user-provided strings before storage

**PIN Authentication Iteration Risk:**
- Risk: PIN verification iterates over ALL users with PIN auth to find match
- Files: `src/app/api/auth/login/route.ts:93-102`
- Current mitigation: Audit logging of failed attempts
- Recommendations:
  - Consider rate limiting per IP
  - Consider account lockout after N failed attempts
  - Log timing of PIN verification attempts

**Environment Variables with Non-Null Assertions:**
- Risk: App crashes at runtime if env vars not set
- Files:
  - `src/lib/supabase/client.ts:5-6` - uses `process.env.NEXT_PUBLIC_SUPABASE_URL!`
  - `src/lib/supabase/server.ts:8-9` - same pattern
- Current mitigation: `.env.example` documents required vars
- Recommendations: Add runtime validation at app startup

**Disabled Row Level Security:**
- Risk: Migration `004_disable_rls.sql` disables RLS across tables
- Files: `supabase/migrations/004_disable_rls.sql`
- Current mitigation: Session validation in API routes
- Recommendations: Re-enable RLS with proper policies for defense in depth

## Performance Bottlenecks

**Large Component Files:**
- Problem: Several components exceed 500 lines, indicating potential splitting opportunities
- Files:
  - `src/components/costs/InvoiceForm.tsx` (939 lines)
  - `src/components/templates/TemplateEditor.tsx` (755 lines)
  - `src/app/dashboard/aufgaben/[id]/page.tsx` (667 lines)
  - `src/app/dashboard/auftraege/[id]/page.tsx` (649 lines)
  - `src/components/costs/ExpenseForm.tsx` (596 lines)
  - `src/components/audio/AudioRecorder.tsx` (582 lines)
- Cause: Single-file component design with all logic co-located
- Improvement path: Extract shared logic into hooks; split into subcomponents

**`SELECT *` Queries:**
- Problem: Many queries fetch all columns when only specific fields needed
- Files:
  - `src/lib/parking/parking-queries.ts:18, 84`
  - `src/lib/audit.ts:136, 159`
  - `src/lib/costs/project-cost-queries.ts:126, 225, 393, 449`
  - `src/app/api/audio/route.ts:81, 146`
  - Plus 20+ additional occurrences
- Cause: Convenience over optimization during rapid development
- Improvement path: Specify only required columns in selects

**No Data Fetching Library:**
- Problem: Manual `fetch()` calls throughout components without caching/deduplication
- Files: 105 occurrences of fetch across 52 files
- Cause: No SWR, React Query, or TanStack Query implementation
- Improvement path: Implement TanStack Query for:
  - Request deduplication
  - Automatic caching
  - Background refetching
  - Optimistic updates

## Fragile Areas

**Supabase Type Coercion:**
- Files: All files using `as unknown as` pattern (listed in Tech Debt section)
- Why fragile: Query result shape changes from Supabase could cause silent runtime failures
- Safe modification: Always test with actual database responses; add runtime type guards
- Test coverage: No tests detected in `src/` directory

**Session/Auth Module Coupling:**
- Files:
  - `src/lib/session.ts`
  - `src/lib/auth.ts`
  - `src/proxy.ts`
- Why fragile: Session creation, validation, and RBAC spread across modules with re-exports
- Safe modification: Changes to session payload require updates in all three files
- Test coverage: None

**Template System Complexity:**
- Files:
  - `src/lib/templates/schedule.ts` (dependency graph, circular detection)
  - `src/lib/templates/dependencies.ts`
  - `src/lib/templates/apply.ts`
  - `src/components/templates/TemplateEditor.tsx`
- Why fragile: WBS hierarchy (template > phase > package > task) with dependencies creates complex state
- Safe modification: Test template application thoroughly after changes
- Test coverage: None

## Scaling Limits

**Client-Side Data Fetching:**
- Current capacity: Works for small data sets
- Limit: No pagination detected in most list views; full data loaded
- Scaling path: Add cursor-based pagination to list endpoints

**Audio/Photo Storage:**
- Current capacity: Direct Supabase Storage uploads
- Limit: No CDN layer; signed URLs expire in 1 hour
- Scaling path: Add CDN caching layer for media delivery

## Dependencies at Risk

**No Critical Dependency Issues:**
- Package versions are modern:
  - Next.js 16.1.2 (current)
  - React 19.2.3 (current)
  - Supabase JS 2.90.1 (current)
- No deprecated packages detected

## Missing Critical Features

**No Test Suite:**
- Problem: No test files found in `src/` directory
- Blocks: CI/CD quality gates; safe refactoring
- Recommended: Add Vitest with React Testing Library

**No Error Boundaries:**
- Problem: No `error.tsx` or `ErrorBoundary` components found
- Blocks: Graceful error recovery in UI
- Recommended: Add error.tsx files for route groups

**No Loading States:**
- Problem: No `loading.tsx` files found for route groups
- Blocks: Proper Suspense/streaming SSR
- Recommended: Add loading.tsx for dashboard routes

## Test Coverage Gaps

**Zero Test Coverage:**
- What's not tested: Entire application
- Files: All 140+ source files
- Risk: Regressions undetected; refactoring is risky
- Priority: High

---

*Concerns audit: 2026-01-19*
