---
phase: 16-template-management
plan: 02
subsystem: api, ui
tags: [templates, supabase, deep-copy, wbs]

# Dependency graph
requires:
  - phase: 16-01
    provides: Template list page with filter UI, TemplateCard component
provides:
  - POST /api/templates/[id]/duplicate endpoint for deep copy
  - Duplicate button wired in template list UI
  - Full WBS hierarchy copy with ID remapping
affects: [16-03, 16-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [deep-copy with ID remapping, rollback on partial failure]

key-files:
  created:
    - src/app/api/templates/[id]/duplicate/route.ts
  modified:
    - src/lib/api/templates.ts
    - src/app/templates/page.tsx
    - src/components/templates/TemplateCard.tsx

key-decisions:
  - "Rollback via cascade delete on partial insert failure"
  - "ID maps built during hierarchical insert for dependency/gate remapping"

patterns-established:
  - "Deep copy pattern: template -> phases -> packages -> tasks, then remap dependencies and quality gates using ID maps"

# Metrics
duration: 8min
completed: 2026-01-25
---

# Phase 16 Plan 02: Template Duplication API Summary

**Deep copy endpoint with full WBS hierarchy (phases/packages/tasks), dependency remapping, and quality gate remapping**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-25T09:00:00Z
- **Completed:** 2026-01-25T09:08:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- POST /api/templates/[id]/duplicate creates complete deep copy
- Dependencies remapped to new task IDs
- Quality gates remapped to new phase/package IDs
- UI workflow: Duplicate button -> name prompt -> redirect to edit page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create duplicate template API endpoint** - `b779f1c` (feat)
2. **Task 2: Wire duplicate in list page** - `72e3aae` (feat)

## Files Created/Modified
- `src/app/api/templates/[id]/duplicate/route.ts` - Deep copy endpoint with ID remapping
- `src/lib/api/templates.ts` - Updated duplicateTemplate to accept optional name
- `src/app/templates/page.tsx` - handleDuplicate with name prompt and redirect
- `src/components/templates/TemplateCard.tsx` - onDuplicate prop and Duplizieren button

## Decisions Made
- Rollback strategy: Delete the new template on any insert failure (cascade cleans up children)
- ID remapping: Build maps during phase/package/task inserts, remap dependencies and gates after
- Name handling: Accept optional name in body, default to "{original} (Kopie)"
- Response size: Return only template metadata, not full hierarchy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Template duplication complete, ready for 16-03 (Template Detail/Edit)
- Edit page expected at /templates/[id]/edit for post-duplicate redirect

---
*Phase: 16-template-management*
*Completed: 2026-01-25*
