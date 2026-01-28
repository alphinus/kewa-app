---
phase: 23-inspection-advanced
plan: 01
subsystem: inspections
tags: [re-inspection, defect-propagation, inspection-history, parent-child, portal-tokens]

# Dependency graph
requires:
  - phase: 22-inspection-core
    provides: inspection table with parent_inspection_id column, defects table, checklist workflow
provides:
  - Re-inspection scheduling with deferred defect copy
  - Inspection history chain queries
  - Portal tokens table for client access (prep for 23-02)
  - Room condition trigger on signed inspection
affects: [23-inspection-advanced-02, 23-inspection-advanced-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parent-child inspection chain traversal"
    - "Defect propagation on re-inspection"

key-files:
  created:
    - supabase/migrations/060_inspection_advanced.sql
    - src/lib/inspections/re-inspection.ts
    - src/app/api/inspections/[id]/re-inspect/route.ts
    - src/app/api/inspections/[id]/history/route.ts
    - src/components/inspections/ReInspectionButton.tsx
    - src/components/inspections/InspectionHistory.tsx
  modified:
    - src/types/inspections.ts
    - src/app/dashboard/abnahmen/[id]/page.tsx

key-decisions:
  - "Deferred defects copied to re-inspection as open (not all defects)"
  - "History shows full chain from root to all children"
  - "Portal tokens table created early (prep for 23-02)"

patterns-established:
  - "Re-inspection inherits parent checklist structure with items reset"
  - "Nachkontrolle badge for follow-up inspections"

# Metrics
duration: 45min
completed: 2026-01-28
---

# Phase 23 Plan 01: Re-inspection Scheduling Summary

**Re-inspection scheduling with deferred defect propagation, parent-child history chain, and UI components**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-01-28T09:00:00Z (approx)
- **Completed:** 2026-01-28T09:45:00Z (approx)
- **Tasks:** 3
- **Files created:** 8
- **Files modified:** 2

## Accomplishments

- Database migration with inspection_portal_tokens table and room condition trigger
- Re-inspection scheduling API with deferred defect propagation
- Inspection history query returning full parent-child chain
- UI components for scheduling re-inspections and viewing history
- Nachkontrolle badge for follow-up inspections

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration** - `ebbd30c` (feat)
2. **Task 2: Re-inspection library and API routes** - `4a44827` (feat)
3. **Task 3: UI components and page integration** - `73bba32` (feat)

**Bug fixes:** `51c8e04` (fix: pre-existing build errors)

## Files Created/Modified

- `supabase/migrations/060_inspection_advanced.sql` - Portal tokens table, room condition trigger
- `src/lib/inspections/re-inspection.ts` - scheduleReInspection, getInspectionHistory
- `src/app/api/inspections/[id]/re-inspect/route.ts` - POST endpoint for scheduling
- `src/app/api/inspections/[id]/history/route.ts` - GET endpoint for history chain
- `src/components/inspections/ReInspectionButton.tsx` - Button with scheduling modal
- `src/components/inspections/InspectionHistory.tsx` - Timeline view of chain
- `src/types/inspections.ts` - Added InspectionHistoryItem type
- `src/app/dashboard/abnahmen/[id]/page.tsx` - Integrated components

## Decisions Made

- Deferred defects (action='deferred') copied to re-inspection as open defects
- Full history chain traverses up to root then collects all children
- Portal tokens table created ahead of 23-02 (already in migration)
- Checklist items reset to 'na' status for re-inspection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing build errors blocking compilation**
- **Found during:** Task 2 verification
- **Issue:** Multiple pre-existing TypeScript/build errors in codebase
- **Fixes applied:**
  - Added getCurrentUser helper to session utils
  - Fixed route params type (Promise<{ id }> pattern for Next.js 16+)
  - Added outline/destructive/icon variants to Button
  - Created missing Textarea and Dialog UI components
  - Fixed InspectionPDF formality_level access
  - Fixed change-orders PDF route Buffer type
  - Fixed change-orders status route Supabase type casting
- **Files modified:** Multiple (see commit 51c8e04)
- **Verification:** npm run build passes
- **Committed in:** 51c8e04

---

**Total deviations:** 1 auto-fixed (blocking - pre-existing build errors)
**Impact on plan:** Build errors were pre-existing and blocking. Fixes necessary for plan execution.

## Issues Encountered

- Pre-existing build errors required significant fixes before plan could complete
- Multiple route files had outdated params type (not Promise)
- getCurrentUser function was referenced but not defined

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Re-inspection scheduling fully functional
- Portal tokens table ready for 23-02 (contractor portal)
- Room condition trigger ready for 23-03 (condition sync)

---
*Phase: 23-inspection-advanced*
*Completed: 2026-01-28*
