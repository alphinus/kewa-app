---
phase: 06-reports-advanced
plan: 01
subsystem: api
tags: [recurring, tasks, scheduling, automation]

# Dependency graph
requires:
  - phase: 02-task-management
    provides: Task CRUD API with status handling
provides:
  - Recurring type field in TaskForm (KEWA only)
  - POST /api/tasks/recurring endpoint for creating successor tasks
  - Automatic recurring task generation on completion
  - RecurringType TypeScript type
affects: [task-list-ui, reports, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget API calls for async processing]

key-files:
  created:
    - src/app/api/tasks/recurring/route.ts
  modified:
    - src/components/tasks/TaskForm.tsx
    - src/types/database.ts
    - src/app/api/tasks/route.ts
    - src/app/api/tasks/[id]/route.ts

key-decisions:
  - "Weekly adds 7 days, monthly adds 1 month to original due_date"
  - "Fire-and-forget pattern for recurring trigger (don't block completion)"
  - "Only KEWA can set recurring type via userRole prop"

patterns-established:
  - "Fire-and-forget: Non-blocking async call with error logging"
  - "Role-gated UI: Conditional rendering based on userRole prop"

# Metrics
duration: 12min
completed: 2026-01-17
---

# Phase 6 Plan 1: Recurring Tasks Summary

**KEWA can create weekly/monthly recurring tasks, which auto-regenerate on completion with calculated next due date**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-17T21:10:00Z
- **Completed:** 2026-01-17T21:22:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- TaskForm includes recurring type selector (Einmalig/Woechentlich/Monatlich) for KEWA only
- POST /api/tasks/recurring endpoint calculates next due date and creates successor task
- PUT /api/tasks/[id] triggers recurring task creation on status change to completed
- Fire-and-forget pattern ensures completion response isn't delayed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add recurring type selector to TaskForm** - `86d369f` (feat)
2. **Task 2: Create recurring task generation endpoint** - `f8b3261` (feat)
3. **Task 3: Trigger recurring task creation on completion** - `2f8835f` (feat)

## Files Created/Modified
- `src/app/api/tasks/recurring/route.ts` - New endpoint for creating recurring task successors
- `src/components/tasks/TaskForm.tsx` - Added recurring type selector (KEWA only)
- `src/types/database.ts` - Added RecurringType, updated CreateTaskInput
- `src/app/api/tasks/route.ts` - Accept recurring_type in POST
- `src/app/api/tasks/[id]/route.ts` - Trigger recurring on completion

## Decisions Made
- **Weekly=+7 days, monthly=+1 month:** Simple date calculation using JavaScript Date methods
- **Use original due_date as base:** If task has no due_date, fall back to completed_at
- **Fire-and-forget pattern:** Don't block completion response waiting for recurring task creation
- **Role-gated UI:** Only KEWA sees recurring selector (userRole prop in TaskForm)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Turbopack build race condition (ENOENT errors) - resolved by clearing .next directory
- No code issues encountered

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Recurring tasks feature complete
- TaskForm accepts optional userRole prop - callers need to pass role for full functionality
- Dashboard and task list will show recurring tasks with standard task display

---
*Phase: 06-reports-advanced*
*Completed: 2026-01-17*
