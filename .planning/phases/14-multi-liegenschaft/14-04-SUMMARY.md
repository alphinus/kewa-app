---
phase: 14
plan: 04
subsystem: dashboard
tags: [building-context, filtering, ui-state]

dependency-graph:
  requires: [14-02, 14-03]
  provides:
    - "Projects page filtered by BuildingContext"
    - "Tasks page filtered by BuildingContext"
  affects: [14-05]

tech-stack:
  patterns:
    - "Context-driven data filtering"
    - "Building badges for all-view"

key-files:
  modified:
    - src/app/dashboard/projekte/page.tsx
    - src/app/dashboard/aufgaben/page.tsx
    - src/components/projects/ProjectCard.tsx
    - src/components/tasks/TaskList.tsx
    - src/types/database.ts
    - src/app/api/tasks/route.ts

decisions: []

metrics:
  duration: "21min"
  completed: "2026-01-24"
---

# Phase 14 Plan 04: Data Page Wiring Summary

Projects and tasks pages now fetch data filtered by the selected building from BuildingContext.

## What Was Built

### Projects Page Integration
- Imports and uses `useBuilding()` hook
- Adds `building_id` query param to `/api/projects` when specific building selected
- Re-fetches data when building selection changes
- Shows blue building badges on project cards when viewing "Alle Liegenschaften"
- Handles context loading state with skeleton UI

### Tasks Page Integration
- Imports and uses `useBuilding()` hook
- Adds `building_id` query param to `/api/tasks` when specific building selected
- Re-fetches data when building selection changes
- Shows blue building badges on task cards when viewing "Alle Liegenschaften"
- Handles context loading state with skeleton UI

### Type Updates
- Extended `ProjectWithUnit.unit` to include `building_id?: string | null`
- Extended `TaskWithProject.unit` to include `building_id?: string | null`
- Updated tasks API to return `building_id` in unit response

### Building Badge Display
Both ProjectCard and TaskList components now accept optional building names lookup:
- When isAllSelected, pages fetch all buildings and create name lookup map
- Cards display blue badge with building name before unit name
- Badge styling: `bg-blue-100 text-blue-700` (dark mode aware)

## Key Implementation Details

### Fetch Pattern
```typescript
const { selectedBuildingId, isAllSelected, isLoading: contextLoading } = useBuilding()

const fetchData = useCallback(async () => {
  if (contextLoading || selectedBuildingId === null) return

  const params = new URLSearchParams()
  if (selectedBuildingId && selectedBuildingId !== 'all') {
    params.set('building_id', selectedBuildingId)
  }
  // ... fetch with params
}, [selectedBuildingId, contextLoading])
```

### Building Names Lookup
```typescript
const [buildings, setBuildings] = useState<Record<string, string>>({})

useEffect(() => {
  if (isAllSelected) {
    fetchBuildings()
  }
}, [isAllSelected, fetchBuildings])
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] TypeScript check passes
- [x] Projects page respects selected building from context
- [x] Tasks page respects selected building from context
- [x] Changing selection triggers data re-fetch
- [x] "Alle" selection shows all data with building badges

## Next Phase Readiness

Phase 14-05 can proceed to wire remaining dashboard pages:
- Liegenschaft page (property dashboard)
- Kosten pages (cost management)
- Any other pages needing building context
