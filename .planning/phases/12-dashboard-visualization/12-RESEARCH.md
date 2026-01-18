# Phase 12: Dashboard & Visualization - Research

**Researched:** 2026-01-18
**Domain:** Property visualization, parking management, occupancy metrics, commenting
**Confidence:** HIGH

## Summary

Phase 12 implements a visual command center with four main components: building floorplan heatmap, parking spot management, occupancy dashboard, and a commenting system. Research confirms the existing codebase has strong patterns to build upon.

The current `BuildingGrid` component (Phase 5) already displays the building in a proportional floor layout - this provides the foundation for the heatmap. The condition tracking from Phase 11 supplies the traffic light data. Parking can leverage the existing `unit_type` pattern by adding a `parking_spot` type, keeping the data model consistent.

**Primary recommendation:** Extend existing patterns rather than introduce new paradigms. Use CSS-based visualizations (per Phase 8 decision), polymorphic comments (like existing media attachments), and server components for data aggregation.

## Technical Findings

### 1. Building Floorplan Visualization

**Current State (HIGH confidence):**
- `src/components/building/BuildingGrid.tsx` renders a 5-floor building layout:
  - Dach (floor 4), 3.OG-EG (floors 3-0)
  - 3 positions per floor: links, mitte, rechts
  - Already uses CSS grid with proportional cells
- `src/components/building/UnitCell.tsx` displays progress bars with traffic light colors
- Pattern established: filter units by `unit_type='apartment'`, position by floor/position

**Required Changes:**
- Replace task progress with room condition data
- Add room-level detail within each unit cell (mini-heatmap)
- Replace modal with side panel (keeps floorplan visible)

**CSS Grid Approach for Room Layout:**
```css
/* Unit cell with embedded room grid */
.unit-cell { display: grid; grid-template-columns: repeat(auto-fit, minmax(20px, 1fr)); }
.room-dot { width: 8px; height: 8px; border-radius: 50%; }
.condition-new { background-color: #22c55e; }    /* green-500 */
.condition-partial { background-color: #eab308; } /* yellow-500 */
.condition-old { background-color: #ef4444; }     /* red-500 */
```

### 2. Side Panel Pattern

**Current State (MEDIUM confidence):**
- `UnitDetailModal.tsx` uses a centered modal with slide-up on mobile
- Pattern: `fixed inset-0 z-50` with semi-transparent backdrop

**Recommended Side Panel Approach:**
- Right-anchored panel (`fixed right-0 inset-y-0 w-96`)
- Floorplan remains visible on left
- Smooth slide-in animation via Tailwind `translate-x`
- Close on backdrop click or X button

**Pattern from codebase:**
```tsx
// Similar to UnitDetailModal but side-anchored
<div className="fixed inset-0 z-50 flex">
  {/* Backdrop - click to close */}
  <div className="flex-1 bg-black/30" onClick={onClose} />

  {/* Side panel */}
  <div className="w-96 bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
    {/* Panel content */}
  </div>
</div>
```

### 3. Parking Spot Data Model

**Current State (HIGH confidence):**
- `units` table has `unit_type` enum: `apartment | common_area | building`
- Units already have: `tenant_name`, `rent_amount`, position fields

**Recommended Schema Extension:**
```sql
-- Add parking_spot to unit_type enum
ALTER TYPE unit_type ADD VALUE IF NOT EXISTS 'parking_spot';

-- Add parking-specific fields to units table
ALTER TABLE units
ADD COLUMN IF NOT EXISTS parking_number INTEGER,
ADD COLUMN IF NOT EXISTS parking_status TEXT CHECK (parking_status IN ('free', 'occupied', 'maintenance'));
```

**Alternative: Dedicated parking_spots table** (not recommended - introduces redundancy with existing unit patterns)

**Rationale:** Reusing `units` table maintains consistency with existing queries, filtering, and tenant assignment patterns.

### 4. Occupancy Calculation

**Current State (HIGH confidence):**
- No existing occupancy calculation
- Unit vacancy: `tenant_name IS NULL` implies vacant
- Room condition data available from `rooms.condition`

**Calculation Logic:**
```typescript
interface OccupancyMetrics {
  totalUnits: number
  occupiedUnits: number
  unitOccupancyPercent: number

  totalParking: number
  occupiedParking: number
  parkingOccupancyPercent: number

  combinedOccupancyPercent: number  // Weighted or averaged
}

// Query pattern (server component)
async function getOccupancyMetrics(buildingId: string): Promise<OccupancyMetrics> {
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_type, tenant_name, parking_status')
    .eq('building_id', buildingId)

  const apartments = units.filter(u => u.unit_type === 'apartment')
  const parking = units.filter(u => u.unit_type === 'parking_spot')

  return {
    totalUnits: apartments.length,
    occupiedUnits: apartments.filter(u => u.tenant_name).length,
    // ... calculate percentages
  }
}
```

### 5. CSS-Based Sparkline

**Established Pattern (HIGH confidence):**
- Phase 8 decided: CSS Gantt over external library
- No charting libraries in package.json
- Progress bars throughout codebase use CSS (`width: ${percent}%`)

**Mini Sparkline Implementation:**
```tsx
interface SparklineProps {
  data: number[]  // e.g., [85, 87, 92, 88, 91] for last 5 months
  height?: number
  className?: string
}

function Sparkline({ data, height = 24, className }: SparklineProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  return (
    <svg className={className} width="100%" height={height} viewBox={`0 0 ${data.length * 10} ${height}`}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        points={data.map((v, i) =>
          `${i * 10 + 5},${height - ((v - min) / range) * (height - 4) - 2}`
        ).join(' ')}
      />
    </svg>
  )
}
```

### 6. Comments System

**Current State (MEDIUM confidence):**
- Media attachments use polymorphic pattern: `entity_type`, `entity_id` (migration 015)
- Work orders have `internal_notes` field for KEWA-only content
- Audit log tracks all changes

**Recommended Schema:**
```sql
-- Comment visibility enum
CREATE TYPE comment_visibility AS ENUM ('internal', 'shared');

-- Comments table (polymorphic)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic reference
  entity_type TEXT NOT NULL,  -- 'task', 'work_order', 'project', 'unit'
  entity_id UUID NOT NULL,

  -- Content
  content TEXT NOT NULL,
  visibility comment_visibility NOT NULL DEFAULT 'internal',

  -- Author
  author_id UUID REFERENCES users(id),
  author_email TEXT,  -- For contractors without user account

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_visibility ON comments(visibility);
```

**Visibility Rules:**
- `internal`: Only KEWA roles can see
- `shared`: KEWA + assigned contractor can see

**Color Coding (per 12-CONTEXT.md):**
- Yellow background: internal comments
- Blue background: shared comments

## Codebase Patterns

### Existing Patterns to Reuse

| Pattern | Source | Usage in Phase 12 |
|---------|--------|-------------------|
| Floor layout grid | `BuildingGrid.tsx` | Heatmap base structure |
| Traffic light colors | `UnitCell.tsx`, `UnitConditionSummary.tsx` | Room condition indicators |
| Polymorphic entity refs | `media.entity_type/entity_id` | Comments attachment |
| Server components for data | `RoomConditionGrid.tsx` | Occupancy, dashboard data |
| Inline editing | `RentEditModal.tsx` | Parking assignment |
| Progress bars | Multiple components | Occupancy visualization |
| Swiss formatting | `lib/costs/formatters.ts` | All number/date display |
| Side panel modal | `UnitDetailModal.tsx` (adapted) | Unit detail panel |

### Query Pattern for Dashboard

The unit cost queries (`src/lib/costs/unit-cost-queries.ts`) show the pattern for aggregating multi-source data:

```typescript
// Pattern: Server-side aggregation with typed return
export async function getUnitCostSummary(unitId: string): Promise<UnitCosts | null> {
  const supabase = await createClient()
  // Multiple queries aggregated into single typed response
}
```

Apply same pattern for dashboard:
- `getDashboardMetrics(propertyId)` - occupancy, totals
- `getUnitHeatmapData(buildingId)` - units with room conditions
- `getParkingSpots(buildingId)` - parking with status/tenant

### Component Structure

```
src/components/dashboard/
  PropertyDashboard.tsx      # Main dashboard container
  BuildingHeatmap.tsx        # Floorplan with condition colors
  UnitDetailPanel.tsx        # Side panel (replaces modal)
  ParkingSection.tsx         # Vertical parking display
  OccupancyGauge.tsx         # Combined meter with sparkline

src/components/comments/
  CommentList.tsx            # Polymorphic comment display
  CommentForm.tsx            # Add comment with visibility toggle
  CommentBadge.tsx           # Visual indicator for visibility
```

## Recommended Approaches

### Plan Breakdown Suggestion

Based on dependency analysis and complexity:

**Wave 1: Data Foundation**
- Plan 12-01: Parking Schema & Basic Display (PARK-01 to PARK-04)
  - Add `parking_spot` unit type, seed 8 spots
  - Basic vertical display component
  - Status change API

**Wave 2: Core Dashboard**
- Plan 12-02: Property Dashboard & Heatmap (DASH-01 to DASH-03)
  - Property-level dashboard page
  - Heatmap using existing BuildingGrid pattern
  - Room condition overlay

- Plan 12-03: Occupancy Dashboard (OCCU-01 to OCCU-04, PARK-05)
  - Occupancy calculation queries
  - Combined meter component
  - Sparkline trend chart

**Wave 3: Navigation & Comments**
- Plan 12-04: Drilldown Navigation & Side Panel (DASH-04 to DASH-06)
  - Side panel replacing modal
  - Timeline integration (reuse UnitTimeline)
  - Drilldown links

- Plan 12-05: Comments System (COMM-01 to COMM-03)
  - Comments table migration
  - Polymorphic comment components
  - Visibility filtering

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Parking data model | Extend `units` table | Reuse existing tenant/rent patterns |
| Heatmap rendering | CSS Grid + colored dots | No external libraries, full control |
| Side panel | Right-anchored fixed panel | Keeps floorplan visible |
| Sparkline | SVG polyline | CSS-only per Phase 8 decision |
| Comments | Polymorphic table | Consistent with media pattern |
| Dashboard route | `/dashboard/liegenschaft` | German naming convention |

## Risks & Considerations

### Complexity Risks

1. **Room-level heatmap in unit cells**
   - Risk: Too many rooms may crowd the visualization
   - Mitigation: Show aggregate color if >6 rooms, expand on hover/click

2. **Occupancy trend data**
   - Risk: No historical occupancy data exists
   - Mitigation: Start tracking from now, show "No history" for first months

3. **Comment visibility enforcement**
   - Risk: Contractors seeing internal comments
   - Mitigation: Filter at query level, not just UI

### Performance Considerations

1. **Dashboard data aggregation**
   - Multiple queries for occupancy, conditions, parking
   - Recommendation: Use `Promise.all()` for parallel fetching

2. **Heatmap rendering**
   - Many units x many rooms = many DOM elements
   - Recommendation: Server components, no client-side rendering for static data

### Accessibility

1. **Traffic light colors**
   - Red/green alone insufficient for colorblind users
   - Add patterns or icons: Green (checkmark), Yellow (dash), Red (X)

2. **Side panel focus management**
   - Trap focus within panel when open
   - Return focus to trigger when closed

## Open Questions

1. **Historical occupancy tracking**
   - Do we need to track monthly snapshots?
   - If yes: Add `occupancy_history` table with monthly records
   - Recommendation: Implement simple current-state first, add history later if needed

2. **Parking rental price display**
   - Should parking spots show monthly rental price?
   - Units already have `rent_amount` - reuse for parking
   - Recommendation: Yes, display in parking detail

3. **Comment attachments**
   - Should comments support file/photo attachments?
   - Per 12-CONTEXT.md: "decide based on complexity vs value"
   - Recommendation: Defer to Phase 2 - text-only comments for MVP

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `BuildingGrid.tsx`, `UnitCell.tsx`, `UnitConditionSummary.tsx`
- Codebase analysis: `RoomConditionGrid.tsx`, `UnitTimeline.tsx`
- Migration analysis: `001_initial_schema.sql`, `009_unit_room.sql`, `015_media.sql`
- State decisions: `.planning/STATE.md` (CSS Gantt, server components, Swiss formatting)

### Secondary (MEDIUM confidence)
- Context file: `12-CONTEXT.md` (discuss-phase decisions)
- Requirements: `REQUIREMENTS.md` (DASH-01 to COMM-03)

## Metadata

**Confidence breakdown:**
- Heatmap approach: HIGH - extends existing BuildingGrid
- Parking model: HIGH - follows existing unit_type pattern
- Occupancy: HIGH - simple aggregation queries
- Comments: MEDIUM - new table but follows media pattern
- Sparkline: MEDIUM - CSS-only feasible but not yet implemented in codebase

**Research date:** 2026-01-18
**Valid until:** 30 days (stable patterns, no external dependencies)

---

## RESEARCH COMPLETE

**Question:** What do I need to know to PLAN this phase well?
**Mode:** Implementation
**Confidence:** HIGH

### Key Findings

- Existing `BuildingGrid` provides 80% of heatmap foundation - extend with room condition colors
- Parking should use existing `units` table with new `parking_spot` type, not separate table
- Comments follow polymorphic `entity_type/entity_id` pattern from media attachments
- Side panel pattern adapts from `UnitDetailModal` - right-anchored instead of centered
- CSS-based sparkline achievable with simple SVG polyline (no external library)

### Files Created

| File | Purpose |
|------|---------|
| `.planning/phases/12-dashboard-visualization/12-RESEARCH.md` | This research document |

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Data model (parking, comments) | HIGH | Follows established patterns |
| Visualization (heatmap, sparkline) | HIGH | Extends existing CSS components |
| Side panel UX | MEDIUM | New pattern but based on modal |
| Occupancy calculation | HIGH | Simple aggregation queries |

### Open Questions

- Historical occupancy tracking: implement simple first, add history table later if needed
- Comment attachments: defer to Phase 2, text-only for MVP

### Recommended Next Steps

1. Proceed with planning using recommended wave breakdown
2. Plan 12-01 (Parking) first - establishes data foundation
3. Plan 12-02 (Heatmap) second - core visualization
