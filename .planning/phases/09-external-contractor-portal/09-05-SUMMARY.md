---
phase: 09
plan: 05
subsystem: contractor-portal
tags: [events, logging, deadline, tracking, timeline]
dependency_graph:
  requires: [09-01, 09-02, 09-03, 09-04]
  provides: [event-logging-system, deadline-tracking, timeline-component]
  affects: [10, 11, 12]
tech_stack:
  added: []
  patterns: [event-sourcing-lite, timeline-ui, deadline-status-machine]
key_files:
  created:
    - supabase/migrations/038_work_order_events.sql
    - src/lib/work-orders/events.ts
    - src/lib/work-orders/deadline.ts
    - src/app/api/work-orders/[id]/events/route.ts
    - src/components/admin/work-orders/EventLog.tsx
    - src/app/contractor/[token]/[workOrderId]/deadline-banner.tsx
  modified:
    - src/app/api/work-orders/[id]/send/route.ts
    - src/app/api/contractor/[token]/mark-viewed/route.ts
    - src/app/api/contractor/[token]/[workOrderId]/respond/route.ts
    - src/app/api/contractor/[token]/[workOrderId]/upload/route.ts
    - src/app/api/work-orders/[id]/counter-offer/route.ts
    - src/app/api/contractor/[token]/status/route.ts
    - src/app/contractor/[token]/work-order-card.tsx
    - src/app/contractor/[token]/page.tsx
decisions:
  - id: event-type-enum
    choice: PostgreSQL enum for event types
    rationale: Type safety, limited set of known events
  - id: actor-type-tracking
    choice: Separate actor_type and actor_id/email columns
    rationale: Contractors don't have user IDs, need email for identification
  - id: auto-status-logging
    choice: Database trigger for status change events
    rationale: Ensures all status changes are captured regardless of API
  - id: deadline-status-thresholds
    choice: 48h=ok, 24-48h=warning, <24h=urgent
    rationale: Standard business response windows
  - id: urgency-sorting
    choice: Sort action-needed items by deadline ascending
    rationale: Most urgent deadlines surface first
metrics:
  duration: 8m
  completed: 2026-01-18
---

# Phase 9 Plan 05: Tracking & Event Logging Summary

Event logging for all work order activities with deadline tracking UI.

## What Was Built

### Database Layer
- **work_order_events table**: Stores timestamped events with JSONB data
- **work_order_event_type enum**: 13 event types (created, sent, viewed, accepted, rejected, counter_offer_submitted/approved/rejected, started, completed, upload_added/removed, status_changed)
- **work_order_actor_type enum**: kewa, contractor, system
- **Auto-logging triggers**: Status changes and work order creation logged automatically

### Event Logging Module (`src/lib/work-orders/events.ts`)
- Generic `logWorkOrderEvent()` function
- Convenience functions for all event types
- `getWorkOrderEvents()` with pagination
- German labels for UI display

### Events API (`/api/work-orders/[id]/events`)
- GET endpoint returns paginated events
- KEWA role only (admin access)
- Filter by event types support

### Event Logging Integration
All existing APIs now log events:
- send/route.ts: 'sent' event
- mark-viewed/route.ts: 'viewed' event
- respond/route.ts: accept/reject/counter_offer_submitted
- upload/route.ts: 'upload_added' event
- counter-offer/route.ts: approve/reject counter-offer
- status/route.ts: 'started' and 'completed' events

### EventLog Component
- Timeline display with event-specific icons and colors
- Swiss date/time formatting (de-CH)
- Actor indicator (KEWA vs Contractor vs System)
- Expandable event data details
- Load more pagination

### Deadline Tracking

**DeadlineBanner component**:
- Color coding: green (>48h), yellow (24-48h), red (<24h), expired
- Countdown display: "noch X Tage/Stunden"
- Expired state with contact instructions
- Compact variant for dashboard cards

**Deadline utilities** (`src/lib/work-orders/deadline.ts`):
- `getDeadlineStatus()`: returns ok/warning/urgent/expired
- `isDeadlinePassed()`: boolean check
- `getTimeRemaining()`: days/hours/minutes breakdown
- `formatRemainingTime()`: German formatted string
- `sortByDeadlineUrgency()`: sorts work orders by deadline

### Dashboard Integration
- Compact deadline display on cards
- Overdue items highlighted with red background
- Red pulsing indicator for urgent/expired deadlines
- Action-needed section sorted by deadline urgency

## Commits

| Hash | Description |
|------|-------------|
| 5515c40 | add work order events migration |
| bcfc8f0 | add event logging utility module |
| 580e2d5 | add work order events API route |
| 97a2c3d | integrate event logging into existing APIs |
| 27f96c7 | add EventLog component for admin UI |
| 6eeb811 | add DeadlineBanner component and deadline utilities |
| f728184 | add deadline to dashboard cards with urgency highlighting |

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| EXT-14: Timestamped events | COMPLETE | work_order_events table + logging in all APIs |
| EXT-16: Deadline display | COMPLETE | DeadlineBanner + compact variant + urgency sorting |

## Verification Results

- [x] Events logged for all work order actions
- [x] Events include timestamp, type, actor, and data
- [x] Event timeline displays in admin UI (EventLog component)
- [x] Deadline displayed prominently in contractor portal
- [x] Deadline color coding reflects urgency
- [x] Overdue items highlighted in dashboard
- [x] Status changes auto-logged via trigger
- [x] TypeScript compiles without errors

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 9 COMPLETE. All 5 plans executed:
- 09-01: WorkOrder Creation & PDF Generation
- 09-02: Contractor Dashboard Transformation
- 09-03: Response Actions & Counter-Offer Flow
- 09-04: Contractor File Uploads
- 09-05: Tracking & Event Logging

Ready for Phase 10: Cost & Finance

### Phase 10 Dependencies Met
- Work orders can track costs (estimated, proposed, final)
- Events logged for cost-related changes
- Contractor portal ready for invoice uploads
