---
phase: 08
plan: 03
subsystem: template-application
tags: [postgresql, api, react, dependencies, wbs]
requires:
  - 08-01 (Template Schema & Types)
  - 08-02 (Template CRUD & Library UI)
provides:
  - Template application to projects
  - Task dependency management with cycle detection
  - Room condition updates on project approval
  - Runtime project hierarchy (phases, packages)
affects:
  - 09 (External Contractor Portal - work orders reference tasks)
  - 10 (Cost & Finance - cost tracking uses project packages)
  - 11 (History & Digital Twin - condition updates)
tech-stack:
  added:
    - None (uses existing stack)
  patterns:
    - Atomic database functions for complex operations
    - Wizard pattern for multi-step user flows
    - Kahn's algorithm for cycle detection
key-files:
  created:
    - supabase/migrations/035_project_from_template.sql
    - supabase/migrations/036_task_dependencies_extended.sql
    - src/app/api/templates/[id]/apply/route.ts
    - src/app/api/templates/[id]/dependencies/route.ts
    - src/app/api/renovation-projects/[id]/route.ts
    - src/lib/templates/dependencies.ts
    - src/lib/templates/apply.ts
    - src/components/templates/TemplateApplyWizard.tsx
    - src/components/templates/DependencyEditor.tsx
    - src/app/renovation-projects/[id]/apply-template/page.tsx
  modified:
    - src/types/templates.ts (added runtime types)
decisions:
  - id: atomic-template-application
    choice: PostgreSQL function for template application
    rationale: Ensures all-or-nothing creation of phases, packages, tasks, dependencies, and gates
  - id: kahn-algorithm
    choice: Use Kahn's algorithm for cycle detection
    rationale: O(V+E) complexity, clear cycle identification
  - id: wizard-pattern
    choice: Multi-step wizard for template application
    rationale: Complex process benefits from guided flow with preview
  - id: renovation-project-api
    choice: Create GET/PATCH route for renovation_projects
    rationale: Template apply page needs project status validation
metrics:
  duration: ~45 minutes
  completed: 2026-01-18
---

# Phase 08 Plan 03: Template Application & Dependencies Summary

Atomic template application with dependency management and room condition updates (TMPL-04, TMPL-06).

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Extend task_dependencies table | Done | b441a6b |
| 2 | Create project hierarchy tables | Done | a0ce4f1 |
| 3 | Create apply_template_to_project function | Done | ef28642 |
| 4 | Create condition update trigger | Done | 186895d |
| 5 | Create template application API route | Done | (in prior session) |
| 6 | Create dependencies API route | Done | 35108be |
| 7 | Create circular dependency detection utility | Done | 35108be |
| 8 | Create template application client library | Done | 35108be |
| 9 | Create TemplateApplyWizard component | Done | 3890a18 |
| 10 | Create DependencyEditor component | Done | 3890a18 |
| 11 | Create apply template page | Done | e739e52 |
| 12 | Add runtime types for project hierarchy | Done | e739e52 |
| - | [Blocking] Add renovation project API route | Done | 0a3477c |

## What Was Built

### Database Layer (Migrations 035-036)

**Project Hierarchy Tables:**
- `project_phases` - Runtime WBS Level 1, linked to renovation_projects
- `project_packages` - Runtime WBS Level 2, linked to project_phases
- `project_quality_gates` - Runtime quality gates with progress tracking
- Extended `tasks` table with `package_id`, `wbs_code`, `is_from_template`, `source_template_task_id`

**Task Dependencies Extended:**
- Added `dependency_type` (FS, SS, FF, SF) to task_dependencies
- Added `lag_days` for lead/lag time between tasks

**Template Application Function:**
```sql
apply_template_to_project(
  p_template_id UUID,
  p_project_id UUID,
  p_start_date DATE,
  p_excluded_tasks UUID[]
) RETURNS TABLE(phases_created, packages_created, tasks_created, dependencies_created, gates_created)
```
- Atomic operation with JSONB ID mapping for dependency remapping
- Supports optional task exclusion
- Creates full hierarchy from template

**Condition Update Trigger (TMPL-06):**
- `update_condition_on_project_approval()` function
- When project status becomes 'approved', all rooms in unit updated to 'new' condition
- Changes logged to condition_history with project reference

### API Layer

**POST /api/templates/[id]/apply:**
- Validates template is active
- Validates project is in 'planned' status
- Validates project has no template yet
- Calls PostgreSQL function for atomic application
- Returns counts of created entities

**GET/POST/DELETE /api/templates/[id]/dependencies:**
- List dependencies for template
- Create dependency with circular detection
- Delete dependency by ID
- Admin-only write operations

**GET/PATCH /api/renovation-projects/[id]:**
- Get project details with unit info
- Update project fields (admin only)
- Required for template apply page validation

### Client Libraries

**dependencies.ts:**
- `detectCircularDependency()` - Kahn's algorithm implementation
- `validateDependency()` - Check before adding
- `getDependentTasks()` / `getPrerequisiteTasks()` - Graph traversal
- `getDirectPredecessors()` / `getDirectSuccessors()` - Direct relationships

**apply.ts:**
- `applyTemplateToProject()` - Client wrapper for apply API
- `stackTemplates()` - Apply multiple templates sequentially
- `getOptionalTasks()` - Extract optional tasks for UI
- `calculateTemplateMetrics()` - Duration/cost with exclusions
- `getAffectedByExclusion()` - Find dependent tasks

### UI Components

**TemplateApplyWizard:**
- Step 1: Template selection with filtering
- Step 2: Optional task configuration (toggle exclusion)
- Step 3: Start date selection
- Step 4: Preview with metrics (phases, packages, tasks, cost, duration)
- Step 5: Apply with loading state
- Step 6: Success result display

**DependencyEditor:**
- Dependency table with predecessor/successor display
- Add form with task dropdowns
- Dependency type selector (FS/SS/FF/SF)
- Lag days input (supports negative for lead time)
- Circular dependency warning
- Affected tasks shown on hover

**Apply Template Page:**
- Loads project details
- Validates status and existing template
- Shows appropriate error states
- Integrates TemplateApplyWizard

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing renovation project API**
- **Found during:** Task 11 implementation
- **Issue:** Apply template page fetches `/api/renovation-projects/[id]` but route didn't exist
- **Fix:** Created GET/PATCH route for renovation_projects
- **Files created:** src/app/api/renovation-projects/[id]/route.ts
- **Commit:** 0a3477c

## Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| TMPL-04 | Task dependencies with types and lag | Complete |
| TMPL-06 | Room condition update on approval | Complete |

## Technical Notes

### Circular Dependency Detection

Uses Kahn's algorithm (topological sort):
1. Build adjacency list and in-degree count
2. Queue all nodes with in-degree 0
3. Process nodes, decrementing neighbor in-degrees
4. If not all nodes processed, cycle exists
5. DFS traces actual cycle path for error message

### ID Remapping Strategy

Template application uses JSONB for ID mapping:
```sql
v_id_mapping := v_id_mapping ||
  jsonb_build_object(v_phase.id::TEXT, v_new_phase_id::TEXT);
```

Dependencies remapped using:
```sql
(v_id_mapping ->> v_dep.predecessor_task_id::TEXT)::UUID
```

### Condition Update Flow

```
Project status -> 'approved'
  |
  v
Trigger: update_condition_on_project_approval()
  |
  +-> UPDATE rooms SET condition = 'new' WHERE unit_id = project.unit_id
  |
  +-> INSERT INTO condition_history (entity_type='room', ...)
```

## Next Phase Readiness

Phase 08 Plan 04 (Timeline Visualization) can proceed. This plan provides:
- Task dependencies with types for Gantt rendering
- Project phases/packages for timeline grouping
- All TypeScript types needed for visualization

Phase 09 (External Contractor Portal) dependencies:
- Work orders will reference tasks from project_packages
- Partners can be assigned to packages by trade_category
