# Phase 12: Dashboard & Visualization - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual command center for KEWA's renovation operations. Property-level dashboard with heatmap (units × rooms), parking management, occupancy metrics, and commenting system. This phase delivers the visual overview — new capabilities like push notifications or tenant portal belong in other phases.

**Requirements:** DASH-01 to DASH-06, PARK-01 to PARK-05, OCCU-01 to OCCU-04, COMM-01 to COMM-03 (18 total)

</domain>

<decisions>
## Implementation Decisions

### Heatmap & Floorplan
- Building floorplan representation, not grid matrix
- Proportional layout — larger units show bigger, positions approximate reality
- Traffic light colors for room conditions: Red (needs work) → Yellow (in progress) → Green (renovated)
- Click on unit opens side panel with details (keeps floorplan visible)

### Parking Layout
- Separate section from building floorplan (not integrated into same canvas)
- 8 spots displayed vertically
- Full details per spot: tenant name, unit, rental price, status
- Inline assignment — can assign/unassign tenants directly from dashboard
- Simple occupied/vacant status (no maintenance condition tracking)

### Occupancy Display
- Combined meter with segments for units and parking
- Mini sparkline chart showing occupancy trend over last months
- Placement: Claude's discretion based on overall layout

### Comments System
- Comments attachable to everything: tasks, work orders, projects, units
- Role-based visibility — some comments internal (KEWA only), some shared with contractors
- Color coding to distinguish: e.g., yellow = internal, blue = shared
- Timestamps on all comments

### Claude's Discretion
- Exact floorplan proportions and visual rendering approach
- Comment attachments (photos/files) — decide based on complexity vs value
- Occupancy widget placement in dashboard layout
- Side panel design for unit details
- Sparkline time range and granularity

</decisions>

<specifics>
## Specific Ideas

- Floorplan should feel like looking at the building from above or in section — proportional, not abstract
- Parking section separate but part of the same dashboard page
- Occupancy as a "gauge" that gives instant read on property health
- Comments need clear visual distinction between what contractors can see vs internal notes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-dashboard-visualization*
*Context gathered: 2026-01-18*
