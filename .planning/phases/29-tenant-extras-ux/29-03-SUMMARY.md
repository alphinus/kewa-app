---
phase: 29-tenant-extras-ux
plan: 03
subsystem: ui
tags: [skeleton-loaders, empty-state, error-boundary, confirmation-dialog, breadcrumbs, form-validation, react-loading-skeleton]

# Dependency graph
requires:
  - phase: 25-ux-polish
    provides: Sonner toast notifications, German UI patterns
  - phase: 27-pwa-foundation
    provides: Service worker, offline awareness
provides:
  - EmptyState component with icon, title, description, CTA
  - ErrorBoundary and ErrorFallback with retry capability
  - ConfirmationDialog for destructive actions
  - FormField wrapper with inline validation
  - Skeleton loaders for property, unit, task, ticket lists
  - Breadcrumbs with auto-generation from pathname
affects: [future-phases-needing-ux-patterns, all-new-list-pages]

# Tech tracking
tech-stack:
  added: [react-loading-skeleton]
  patterns: [skeleton-loading, empty-state-cta, confirmation-before-delete, breadcrumb-auto-generation]

key-files:
  created:
    - src/components/ui/empty-state.tsx
    - src/components/ui/error-boundary.tsx
    - src/components/ui/confirmation-dialog.tsx
    - src/components/ui/form-field.tsx
    - src/components/ui/breadcrumbs.tsx
    - src/components/skeletons/PropertyListSkeleton.tsx
    - src/components/skeletons/UnitDetailSkeleton.tsx
    - src/components/skeletons/TaskListSkeleton.tsx
    - src/components/skeletons/TicketListSkeleton.tsx
    - src/app/portal/tickets/loading.tsx
  modified:
    - package.json
    - src/app/dashboard/aufgaben/page.tsx
    - src/app/dashboard/auftraege/page.tsx
    - src/app/portal/tickets/page.tsx
    - src/lib/email/client.ts

key-decisions:
  - "Breadcrumbs auto-generate from pathname, skip dashboard/portal segments"
  - "Skeleton components use react-loading-skeleton with CSS import"
  - "EmptyState uses Button component for consistent CTA styling"
  - "ConfirmationDialog builds on existing Dialog component"
  - "FormField uses aria attributes for accessibility"

patterns-established:
  - "Skeleton loading: Use dedicated skeleton components matching page layouts"
  - "Empty state: Include icon, title, description, and CTA button"
  - "Confirmation: Use ConfirmationDialog with variant='danger' for destructive actions"
  - "Breadcrumbs: Add to page header, skip dashboard/portal prefix"

# Metrics
duration: 37min
completed: 2026-02-03
---

# Phase 29 Plan 03: UX Pattern Components Summary

**Reusable UX pattern library with skeleton loaders, empty states, error boundaries, confirmation dialogs, form validation, and breadcrumbs - integrated into Aufgaben, Auftraege, and Portal Tickets pages**

## Performance

- **Duration:** 37 min
- **Started:** 2026-02-03T10:06:53Z
- **Completed:** 2026-02-03T10:43:37Z
- **Tasks:** 3
- **Files created/modified:** 15

## Accomplishments
- Created 5 reusable UI components (EmptyState, ErrorBoundary, ConfirmationDialog, FormField, Breadcrumbs)
- Created 4 skeleton loader components for different page layouts
- Integrated new patterns into 3 key pages (Aufgaben, Auftraege, Portal Tickets)
- Added loading.tsx for portal tickets with skeleton loader
- Fixed email client initialization to prevent build failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reusable UX pattern components** - `7ec63bc` (feat)
2. **Task 2: Create skeleton loaders and breadcrumbs** - `d33d782` (feat)
3. **Task 3: Integrate UX patterns into key pages** - `8e1e3b4` (feat)

## Files Created/Modified

### Created
- `src/components/ui/empty-state.tsx` - EmptyState with icon, title, description, CTA
- `src/components/ui/error-boundary.tsx` - ErrorBoundary class + ErrorFallback functional
- `src/components/ui/confirmation-dialog.tsx` - ConfirmationDialog with danger/primary variants
- `src/components/ui/form-field.tsx` - FormField wrapper with label and validation
- `src/components/ui/breadcrumbs.tsx` - Breadcrumbs with auto-generation from pathname
- `src/components/skeletons/PropertyListSkeleton.tsx` - Property card list skeleton
- `src/components/skeletons/UnitDetailSkeleton.tsx` - Unit detail page skeleton
- `src/components/skeletons/TaskListSkeleton.tsx` - Task row list skeleton
- `src/components/skeletons/TicketListSkeleton.tsx` - Portal ticket list skeleton
- `src/app/portal/tickets/loading.tsx` - Next.js loading state with skeleton

### Modified
- `package.json` - Added react-loading-skeleton dependency
- `src/app/dashboard/aufgaben/page.tsx` - Use TaskListSkeleton, EmptyState, ConfirmationDialog, Breadcrumbs
- `src/app/dashboard/auftraege/page.tsx` - Use EmptyState pattern, Breadcrumbs
- `src/app/portal/tickets/page.tsx` - Use EmptyState pattern, Breadcrumbs
- `src/lib/email/client.ts` - Fix initialization with placeholder key

## Decisions Made
- Breadcrumbs skip 'dashboard' and 'portal' segments to show cleaner navigation
- Skeleton components import react-loading-skeleton CSS at component level
- EmptyState in server components rendered inline (not using onClick-based component)
- ConfirmationDialog uses existing Dialog component foundation
- FormField uses aria-invalid and aria-describedby for accessibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed email client initialization error**
- **Found during:** Task 3 (build verification)
- **Issue:** `new Resend('')` throws error when API key is missing, causing build failure
- **Fix:** Use `'re_disabled'` placeholder key instead of empty string
- **Files modified:** src/lib/email/client.ts
- **Verification:** Build passes, email sending still checks for real key before send
- **Committed in:** 8e1e3b4 (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix essential for build to pass. No scope creep.

## Issues Encountered
- Plan referenced files that don't exist (e.g., `src/app/(dashboard)/dashboard/liegenschaften/page.tsx`)
- Adapted to actual file structure: integrated into existing pages at `/dashboard/aufgaben`, `/dashboard/auftraege`, `/portal/tickets`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- UX pattern components ready for use in all future pages
- Skeleton loaders can be imported for any new list pages
- ConfirmationDialog available for all destructive actions
- FormField ready for form validation integration
- Breadcrumbs auto-work on any page with proper URL structure

---
*Phase: 29-tenant-extras-ux*
*Completed: 2026-02-03*
