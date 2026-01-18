# Phase 11: History & Digital Twin - Research

**Researched:** 2026-01-18
**Domain:** Timeline visualization, condition tracking, database aggregation
**Confidence:** HIGH

## Summary

Phase 11 builds the "Digital Twin" view for units - a comprehensive timeline showing all renovation activities, costs, and media, with automatic room condition tracking. The research reveals that the database infrastructure is **already complete** from Phase 7 (migration 027_condition_tracking.sql), including:

- `condition_history` table with polymorphic entity support
- `unit_condition_summary` view calculating renovation percentages
- `room_condition_timeline` view joining history with context
- Trigger `projects_on_approved` that auto-updates room conditions when projects are approved
- Functions `update_room_condition()` and `update_room_condition_from_project()` for programmatic updates

**Primary recommendation:** This phase is primarily **UI/frontend work** - the database layer is ready. Focus on building timeline components, enhancing the unit detail view, and ensuring the existing triggers work correctly in production.

## Existing Infrastructure (Phase 7)

### Database Schema Already Exists

The following was implemented in `027_condition_tracking.sql`:

| Component | Purpose | Status |
|-----------|---------|--------|
| `condition_history` table | Stores all condition changes with source tracking | READY |
| `unit_condition_summary` view | Aggregates room conditions per unit | READY |
| `room_condition_timeline` view | Joins condition history with project/work order context | READY |
| `on_project_approved()` trigger | Auto-updates room conditions when project approved | READY |
| `update_room_condition()` function | Manual condition update with history | READY |
| `update_room_condition_from_project()` function | Batch update rooms from project tasks | READY |

### TypeScript Types Already Defined

From `src/types/database.ts`:

```typescript
export interface ConditionHistory {
  id: string
  entity_type: 'room' | 'unit' | 'component'
  entity_id: string
  old_condition: RoomCondition | null
  new_condition: RoomCondition
  source_project_id: string | null
  source_work_order_id: string | null
  media_ids: string[] | null
  notes: string | null
  changed_by: string | null
  changed_at: string
}

export interface UnitConditionSummary {
  unit_id: string
  unit_name: string
  building_id: string
  total_rooms: number
  new_rooms: number
  partial_rooms: number
  old_rooms: number
  renovation_percentage: number | null
  overall_condition: RoomCondition | null
  last_condition_update: string | null
}
```

### Room Fields Already Present

From `rooms` table (migration 009):

```sql
condition room_condition DEFAULT 'old',
condition_updated_at TIMESTAMPTZ,
condition_source_project_id UUID
```

## What Needs to Be Built

### HIST-01: Unit Timeline

**Requirement:** Unit hat Timeline aller Projekte/WorkOrders/Kosten/Media

**What exists:**
- `condition_history` for condition changes
- `audit_logs` for all entity changes
- `work_order_events` for work order activities
- `media` table with `entity_type`/`entity_id` pattern

**What's needed:**
1. **Unified Timeline Query** - Aggregate events from multiple sources:
   - Renovation projects (created, status changes, approved)
   - Work orders (created, status changes, completed)
   - Condition changes (from `condition_history`)
   - Media uploads (from `media` table)
   - Costs (invoices paid, expenses recorded)

2. **Timeline UI Component** - Reuse pattern from `EventLog.tsx`:
   - Chronological list with icons per event type
   - Expandable details
   - Pagination for large histories
   - Date grouping (by month/year)

**Implementation pattern:**

```typescript
interface TimelineEvent {
  id: string
  event_type: 'project' | 'work_order' | 'condition' | 'media' | 'cost'
  event_subtype: string // e.g., 'created', 'completed', 'photo_added'
  title: string
  description?: string
  entity_id: string
  entity_type: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// Query: UNION ALL from multiple sources, ORDER BY timestamp DESC
```

### HIST-02: Room Progress Overview

**Requirement:** Unit-Uebersicht zeigt Renovations-Fortschritt pro Raum

**What exists:**
- `unit_condition_summary` view with `renovation_percentage`
- `rooms` table with `condition` field
- Room-room_type classification

**What's needed:**
1. **Room Grid Component** - Visual representation of all rooms:
   - Color-coded by condition (old=red, partial=yellow, new=green)
   - Room type icons
   - Click to see room details/history

2. **Progress Bar** - Unit-level summary:
   - Show `renovation_percentage` from view
   - Breakdown: X new, Y partial, Z old

**UI Pattern (from BuildingGrid.tsx):**

```typescript
// Grid layout showing rooms
// Each room cell shows:
// - Room name
// - Room type icon
// - Condition color/badge
// - Last updated date
```

### HIST-03: Condition Derivation

**Requirement:** Raum-Condition wird aus abgeschlossenen Projekten abgeleitet

**What exists:**
- `update_room_condition_from_project()` function
- `on_project_approved()` trigger

**Current logic (from migration):**

```sql
-- Get all rooms affected by this project's tasks
FOR v_room IN
  SELECT DISTINCT r.id, r.condition
  FROM rooms r
  JOIN tasks t ON t.room_id = r.id
  WHERE t.renovation_project_id = p_project_id
    AND t.status = 'completed'
LOOP
  -- Update room to 'new' condition
  UPDATE rooms SET condition = 'new' ...
```

**Gap identified:** Current logic sets ALL affected rooms to 'new'. May need refinement:
- Partial renovation (some components, not full room) -> 'partial'
- Full room renovation -> 'new'

**Recommendation:** The current behavior (always 'new') is acceptable for MVP. Future enhancement could use component-level tracking.

### HIST-04: Automation Trigger

**Requirement:** Automation: Projekt approved -> Raum=new mit Datum+Media+Projekt-ID

**What exists:**
- Trigger `projects_on_approved` ALREADY DOES THIS
- Records in `condition_history` with `source_project_id`

**What's needed:**
- Verify trigger works in production
- Possibly enhance to include media_ids from completed tasks

**Enhancement for media linking:**

```sql
-- In update_room_condition_from_project():
-- Collect media IDs from tasks that were completed
SELECT array_agg(DISTINCT m.id)
FROM media m
WHERE m.entity_type = 'task'
  AND m.entity_id IN (
    SELECT t.id FROM tasks t
    WHERE t.renovation_project_id = p_project_id
      AND t.room_id = v_room.id
  )
```

### HIST-05: Unit Summary Calculation

**Requirement:** Unit-Summary wird automatisch berechnet (% renoviert)

**What exists:**
- `unit_condition_summary` view ALREADY CALCULATES THIS:

```sql
ROUND(
  COUNT(CASE WHEN r.condition = 'new' THEN 1 END)::NUMERIC /
  NULLIF(COUNT(r.id), 0) * 100, 1
) as renovation_percentage
```

**What's needed:**
- Display this in Unit detail views
- Integrate with existing `UnitInvestmentCard` or `UnitDetailModal`

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── dashboard/
│       └── wohnungen/
│           └── [id]/
│               ├── page.tsx           # Unit detail with timeline
│               └── timeline/
│                   └── page.tsx       # Full timeline view
├── components/
│   └── units/
│       ├── UnitTimeline.tsx           # Timeline component
│       ├── RoomConditionGrid.tsx      # Room status grid
│       ├── ConditionBadge.tsx         # Condition indicator
│       └── UnitConditionSummary.tsx   # % renovated display
├── lib/
│   └── units/
│       ├── timeline-queries.ts        # Unified timeline query
│       └── condition-queries.ts       # Condition view queries
└── types/
    └── timeline.ts                    # Timeline event types
```

### Pattern 1: Timeline Component

**What:** Reusable timeline display following EventLog.tsx pattern

**When to use:** Displaying chronological events for any entity

**Example (from EventLog.tsx):**

```typescript
// Timeline item structure
<ul className="-mb-8">
  {events.map((event, eventIdx) => (
    <li key={event.id}>
      <div className="relative pb-8">
        {/* Timeline line */}
        {eventIdx !== events.length - 1 && (
          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" />
        )}
        <div className="relative flex items-start space-x-3">
          {/* Icon */}
          <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${iconConfig.bgColor}`}>
            <svg className={`h-4 w-4 ${iconConfig.textColor}`}>...</svg>
          </div>
          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{event.title}</p>
            <time className="text-xs text-gray-500">{formatTimestamp(event.created_at)}</time>
          </div>
        </div>
      </div>
    </li>
  ))}
</ul>
```

### Pattern 2: Condition Badge

**What:** Visual indicator for room/unit condition

**When to use:** Any display of condition status

**Example:**

```typescript
const CONDITION_COLORS = {
  old: 'bg-red-100 text-red-800 border-red-200',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  new: 'bg-green-100 text-green-800 border-green-200'
}

const CONDITION_LABELS = {
  old: 'Alt',
  partial: 'Teilrenoviert',
  new: 'Neu'
}
```

### Anti-Patterns to Avoid

- **Client-side aggregation:** Don't fetch raw events and aggregate in browser. Use database views.
- **N+1 queries:** Don't fetch timeline events then fetch related data per event. Use joins.
- **Polling for updates:** Timeline data is historical. Fetch on page load, no real-time needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Condition history | Custom event tables | Existing `condition_history` | Already built with full tracking |
| Unit summary calc | JS aggregation | `unit_condition_summary` view | Database-level aggregation is faster |
| Timeline display | Custom list | Follow `EventLog.tsx` pattern | Proven UI pattern in codebase |
| Progress visualization | Custom charts | Simple CSS progress bars | Already used in `UnitDetailModal` |

## Common Pitfalls

### Pitfall 1: Ignoring Existing Infrastructure

**What goes wrong:** Building new tables/views when they already exist
**Why it happens:** Not checking Phase 7 implementations
**How to avoid:** Review migration 027 before writing any new SQL
**Warning signs:** Planning to create `condition_history` or similar

### Pitfall 2: Missing Room-Task Link

**What goes wrong:** Condition trigger doesn't fire because tasks lack `room_id`
**Why it happens:** Tasks created without room assignment
**How to avoid:** Ensure tasks from templates have room_id set during project creation
**Warning signs:** Approved projects don't update room conditions

### Pitfall 3: Incomplete Timeline Sources

**What goes wrong:** Timeline misses events because not all sources included
**Why it happens:** Forgetting a source table in UNION query
**How to avoid:** Document all event sources:
- renovation_projects
- work_orders + work_order_events
- condition_history
- media (filtered by entity)
- invoices/expenses (for cost events)

### Pitfall 4: Performance with Large Histories

**What goes wrong:** Slow page loads for units with many events
**Why it happens:** Loading entire timeline without pagination
**How to avoid:**
- Limit initial load (e.g., 20 events)
- "Load more" button
- Consider date-range filters

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate history tables per entity | Polymorphic `entity_type`/`entity_id` | Already in codebase | Single query for all entity types |
| Client-side aggregation | Database views | Already in codebase | Better performance, less code |
| Manual condition updates | Trigger-based automation | Phase 7 | Reduced user error, automatic tracking |

**Already implemented patterns:**
- Polymorphic media attachments (entity_type/entity_id)
- Event logging with typed events (work_order_events)
- Condition tracking with source linking
- Database views for aggregations

## Open Questions

### Question 1: Media Links in Condition History

**What we know:** The trigger creates condition_history records but doesn't populate `media_ids`
**What's unclear:** Should we enhance the trigger to auto-link media from completed tasks?
**Recommendation:** Nice-to-have for MVP. Can enhance trigger later if needed.

### Question 2: Partial vs New Condition Logic

**What we know:** Current trigger sets all affected rooms to 'new'
**What's unclear:** When should a room be 'partial' instead of 'new'?
**Recommendation:** Accept current behavior for MVP. If business needs "partial" detection, require component-level tracking (out of scope).

### Question 3: Timeline Event Deduplication

**What we know:** Multiple tables may record overlapping events (audit_logs + work_order_events)
**What's unclear:** Should timeline show both or deduplicate?
**Recommendation:** Use specific event tables (condition_history, work_order_events) rather than audit_logs for timeline. Audit_logs for compliance, not UI.

## Query Patterns

### Unit Timeline Query (Unified)

```sql
-- Unified timeline for a unit
WITH timeline_events AS (
  -- Renovation projects
  SELECT
    'project' as source,
    rp.id,
    rp.status as event_type,
    rp.name as title,
    rp.updated_at as timestamp
  FROM renovation_projects rp
  WHERE rp.unit_id = $1

  UNION ALL

  -- Work orders
  SELECT
    'work_order' as source,
    wo.id,
    wo.status as event_type,
    wo.title,
    wo.updated_at as timestamp
  FROM work_orders wo
  JOIN renovation_projects rp ON wo.renovation_project_id = rp.id
  WHERE rp.unit_id = $1

  UNION ALL

  -- Condition changes
  SELECT
    'condition' as source,
    ch.id,
    ch.new_condition::TEXT as event_type,
    r.name || ' -> ' || ch.new_condition as title,
    ch.changed_at as timestamp
  FROM condition_history ch
  JOIN rooms r ON ch.entity_id = r.id AND ch.entity_type = 'room'
  WHERE r.unit_id = $1

  UNION ALL

  -- Costs (invoices paid)
  SELECT
    'cost' as source,
    i.id,
    'invoice_paid' as event_type,
    i.title || ' - ' || i.total_amount::TEXT || ' CHF' as title,
    i.paid_at as timestamp
  FROM invoices i
  JOIN renovation_projects rp ON i.renovation_project_id = rp.id
  WHERE rp.unit_id = $1 AND i.status = 'paid'
)
SELECT * FROM timeline_events
ORDER BY timestamp DESC
LIMIT 50;
```

### Room Condition Summary Query

```sql
-- Already exists as view: unit_condition_summary
SELECT * FROM unit_condition_summary WHERE unit_id = $1;
```

### Room Condition Timeline Query

```sql
-- Already exists as view: room_condition_timeline
SELECT * FROM room_condition_timeline
WHERE unit_id = $1
ORDER BY changed_at DESC;
```

## Sources

### Primary (HIGH confidence)

- `/supabase/migrations/027_condition_tracking.sql` - Full condition tracking implementation
- `/supabase/migrations/009_unit_room.sql` - Room schema with condition fields
- `/src/types/database.ts` - TypeScript types for all entities
- `/src/components/admin/work-orders/EventLog.tsx` - Timeline UI pattern reference

### Secondary (MEDIUM confidence)

- `/src/components/building/UnitDetailModal.tsx` - Existing unit UI patterns
- `/src/app/dashboard/kosten/wohnungen/[id]/page.tsx` - Unit detail page pattern
- `/.planning/STATE.md` - Project context and decisions

## Metadata

**Confidence breakdown:**
- Existing infrastructure: HIGH - Code already exists and verified
- UI patterns: HIGH - Multiple examples in codebase
- Query patterns: MEDIUM - Need to test unified query performance
- Open questions: LOW - Business logic decisions needed

**Research date:** 2026-01-18
**Valid until:** Implementation complete (infrastructure stable)

---

## Implementation Recommendation

### Suggested Plan Structure

| Plan | Name | Scope | Dependencies |
|------|------|-------|--------------|
| 11-01 | Unit Timeline View | medium | None |
| 11-02 | Room Condition Grid | small | None |
| 11-03 | Condition Automation Verification | small | None |

**Wave 1:** Plans 01-03 can run in parallel (no dependencies)

### Key Insight

**This phase is simpler than it appears.** The database layer is complete. Success depends on:

1. Building good UI components following existing patterns
2. Verifying existing triggers work correctly
3. Creating unified timeline queries that aggregate from multiple sources

No new migrations needed. No new database functions needed. Focus on frontend.
