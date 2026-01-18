---
phase: 11-history-digital-twin
plan: 01
subsystem: ui
tags: [timeline, history, supabase, react, server-components]

# Dependency graph
requires:
  - phase: 07-foundation
    provides: Database schema (renovation_projects, work_orders, condition_history, invoices)
  - phase: 09-contractor-portal
    provides: Work order event tracking
  - phase: 10-cost-finance
    provides: Invoice and payment data
provides:
  - Unified timeline types (TimelineEvent, TimelineEventType)
  - Timeline query module (fetchUnitTimeline)
  - UnitTimeline client component with pagination
  - Timeline API endpoint (/api/units/[id]/timeline)
  - Timeline section in unit detail page
affects: [12-dashboard-visualization, future timeline filtering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified timeline aggregation from multiple sources"
    - "Client-side pagination with load more button"
    - "Status-based icon color overrides"

key-files:
  created:
    - src/types/timeline.ts
    - src/lib/units/timeline-queries.ts
    - src/components/units/UnitTimeline.tsx
    - src/app/api/units/[id]/timeline/route.ts
  modified:
    - src/app/dashboard/wohnungen/[id]/page.tsx

key-decisions:
  - "Client-side pagination with API fetch (vs server component)"
  - "Aggregate all sources in memory then sort (vs complex SQL UNION)"
  - "KEWA role only for timeline access (contains cost data)"

patterns-established:
  - "Timeline event normalization: id, event_type, event_subtype, title, timestamp, metadata"
  - "Status-based color override pattern for timeline icons"
  - "German labels via lookup objects (EVENT_SUBTYPE_LABELS, CONDITION_LABELS)"

# Metrics
duration: 33min
completed: 2026-01-18
---

# Phase 11 Plan 01: Unit Timeline View Summary

**Unified timeline view aggregating projects, work orders, condition changes, and costs with paginated client-side display following EventLog.tsx pattern**

## Performance

- **Duration:** 33 min
- **Started:** 2026-01-18T18:15:57Z
- **Completed:** 2026-01-18T18:48:31Z
- **Tasks:** 4
- **Files created:** 4
- **Files modified:** 1

## Accomplishments

- Created TypeScript types for unified timeline events (TimelineEvent, TimelineEventType, TimelineResponse)
- Built server-side query module aggregating 4 data sources (projects, work_orders, condition_history, invoices)
- Implemented UnitTimeline component with icons per event type, status-based colors, expandable details, and pagination
- Integrated timeline into unit detail page with "Verlauf" section and ClockIcon header

## Task Commits

Each task was committed atomically:

1. **Task 1: Create timeline types** - `a444611` (feat)
2. **Task 2: Create timeline query module** - `415b170` (feat)
3. **Task 3: Create UnitTimeline component and API** - `5daf795` (feat)
4. **Task 4: Integrate timeline into unit detail page** - `dcf5150` (feat)

## Files Created/Modified

- `src/types/timeline.ts` - TimelineEvent, TimelineEventType, TimelineResponse interfaces
- `src/lib/units/timeline-queries.ts` - fetchUnitTimeline aggregating 4 data sources
- `src/components/units/UnitTimeline.tsx` - Client component with pagination and expandable details
- `src/app/api/units/[id]/timeline/route.ts` - GET endpoint with limit/offset pagination
- `src/app/dashboard/wohnungen/[id]/page.tsx` - Added "Verlauf" section with UnitTimeline component

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Client-side component with API fetch | Timeline needs pagination and interactivity (expand/collapse) |
| Aggregate in JS vs SQL UNION | Simpler code, easier to maintain, performance acceptable for typical data volumes |
| KEWA role only access | Timeline contains cost/invoice data which requires elevated permissions |
| Status-based color overrides | Visual consistency - completed=green, rejected=red regardless of event type |
| Anchor link to #timeline section | Avoids creating separate timeline page, keeps all data on one page |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Build cache issues (pages-manifest.json, required-server-files.json not found) - resolved by cleaning .next directory
- Single-file TypeScript checking doesn't resolve path aliases - used full build for verification instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Timeline infrastructure complete for HIST-01
- Ready for Phase 11-02 (Room Condition Grid) - already completed
- Ready for Phase 11-03 (Condition Automation) - depends on template tasks having room_id
- Timeline component can be reused for building-level or project-level timelines

---
*Phase: 11-history-digital-twin*
*Completed: 2026-01-18*
