---
phase: 09-external-contractor-portal
plan: 07
subsystem: ui
tags: [nextjs, work-orders, admin-dashboard, forms]

# Dependency graph
requires:
  - phase: 09-external-contractor-portal
    provides: WorkOrderForm, WorkOrderSendDialog components
provides:
  - Work order list page at /dashboard/auftraege
  - Work order create page with form integration
  - Work order detail page with send dialog
  - "Auftrag erstellen" button on project detail page
affects: [admin-ui, contractor-portal, cost-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Work order pages follow projekte/ page patterns
    - German status labels for work order states
    - Responsive table/card hybrid for list views

key-files:
  created:
    - src/app/dashboard/auftraege/page.tsx
    - src/app/dashboard/auftraege/neu/page.tsx
    - src/app/dashboard/auftraege/[id]/page.tsx
  modified:
    - src/app/dashboard/projekte/[id]/page.tsx

key-decisions:
  - "WorkOrderForm renders as modal overlay (existing design)"
  - "Status pills use German labels matching status enum"
  - "Deadline display shows overdue indicator for sent/viewed orders"

patterns-established:
  - "Work order pages use same layout as projekte pages"
  - "Status badges with consistent colors across list and detail"

# Metrics
duration: 9min
completed: 2026-01-19
---

# Phase 09 Plan 07: Work Order UI Integration Summary

**Complete work order management UI in KEWA admin dashboard with list, create, and detail pages wiring existing WorkOrderForm and WorkOrderSendDialog components**

## Performance

- **Duration:** 9 min
- **Started:** 2026-01-19T14:52:11Z
- **Completed:** 2026-01-19T15:00:48Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- Project detail page now has "Auftrag erstellen" button linking to create form
- Full work order list page with status filters and responsive table/cards
- Create page wrapping WorkOrderForm with URL params for project/task pre-selection
- Detail page showing all work order info with WorkOrderSendDialog integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Add "Auftrag erstellen" button to project detail page** - `acdb4b2` (feat)
2. **Task 2: Create work order list page** - `9a0f807` (feat)
3. **Task 3: Create work order create page** - `c2cde63` (feat)
4. **Task 4: Create work order detail page with send dialog** - `34a6a37` (feat)

## Files Created/Modified
- `src/app/dashboard/projekte/[id]/page.tsx` - Added "Auftrag erstellen" action button for active/planned projects
- `src/app/dashboard/auftraege/page.tsx` - Work order list with status badges, partner info, deadline display, and status filters
- `src/app/dashboard/auftraege/neu/page.tsx` - Create page wrapping WorkOrderForm with project_id/task_id from URL
- `src/app/dashboard/auftraege/[id]/page.tsx` - Detail page with partner info, scope, dates, status timeline, and send dialog

## Decisions Made
- WorkOrderForm stays as modal overlay component (existing design kept)
- Status labels in German: Entwurf, Gesendet, Angesehen, Angenommen, Abgelehnt, In Arbeit, Erledigt, Abgeschlossen
- Only non-archived/non-finished projects show "Auftrag erstellen" button
- Overdue deadlines highlighted in red for sent/viewed orders
- Suspense boundary added for create page's useSearchParams

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Next.js build had file system errors (ENOENT for temp files) but TypeScript compilation succeeded
- Verified all changes compile correctly via `npx tsc --noEmit`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT Test 1 blocker resolved: WorkOrderForm is now accessible from project detail page
- Work order creation flow: Project detail -> Auftrag erstellen -> Form -> Detail page
- Send dialog integrated for sending work orders to contractors
- Counter-offer review section displays proposed dates/costs from contractors

---
*Phase: 09-external-contractor-portal*
*Completed: 2026-01-19*
