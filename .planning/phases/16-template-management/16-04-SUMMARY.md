---
phase: 16
plan: 04
subsystem: templates
tags: [template, project-creation, wbs, modal, unit-detail]

dependency-graph:
  requires: ["16-01", "16-02"]
  provides: ["template-project-creation", "unit-project-button"]
  affects: ["projekte-detail"]

tech-stack:
  added: []
  patterns: ["template-first-flow", "side-by-side-preview", "optional-task-exclusion"]

key-files:
  created:
    - src/components/projects/ProjectCreateWithTemplate.tsx
    - src/components/units/UnitActions.tsx
    - src/app/api/renovation-projects/route.ts
  modified:
    - src/app/dashboard/wohnungen/[id]/page.tsx

decisions:
  - key: "template-first-flow"
    choice: "Select template before project details"
    rationale: "Matches KEWA workflow where renovation type determines structure"
  - key: "renovation-projects-api"
    choice: "Create POST endpoint for renovation_projects"
    rationale: "Template apply requires renovation_projects (not projects table)"

metrics:
  duration: "8 minutes"
  completed: "2026-01-25"
---

# Phase 16 Plan 04: Template Project Creation Integration Summary

Template-first project creation with side-by-side preview, integrated into unit detail page.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ProjectCreateWithTemplate component | 2cff43c | ProjectCreateWithTemplate.tsx, route.ts |
| 2 | Integrate into wohnungen detail page | 9cf435b | page.tsx, UnitActions.tsx |
| 3 | Create TemplatePreviewWithExclusion sub-component | (in Task 1) | ProjectCreateWithTemplate.tsx |

## Implementation Details

### ProjectCreateWithTemplate Component (472 lines)

Two-column layout per CONTEXT.md:
- **Left column**: Template selection grouped by category, project name/date inputs
- **Right column**: Template preview with metrics and optional task toggles

Features:
- Templates fetched on mount with active filter
- Full template hierarchy loaded when selected
- Metrics display: phase count, task count, total days
- Optional tasks can be excluded before creation
- Project name auto-generated from template + unit name

### Template Application Flow

1. Create renovation project via POST `/api/renovation-projects` with status='planned'
2. Apply template via `applyTemplateToProject()` with excluded task IDs
3. On success, redirect to `/dashboard/projekte/${projectId}`

### UnitActions Component

Client wrapper component for unit action buttons:
- Kosten link
- Aufgaben link
- "+ Neues Projekt" button (opens modal)

Modal contains ProjectCreateWithTemplate with proper callbacks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created POST /api/renovation-projects endpoint**
- **Found during:** Task 1
- **Issue:** Template apply API expects renovation_projects table, not projects
- **Fix:** Added route.ts with POST handler for creating renovation projects
- **Files created:** src/app/api/renovation-projects/route.ts

## Verification Results

1. Build completed successfully
2. TypeScript compilation passed
3. Component has 472 lines (exceeds 150 min)
4. Key links implemented: fetchTemplates, applyTemplateToProject

## What's Next

Plan 16-03 (Template Detail Page) completes wave 2 of phase 16.
