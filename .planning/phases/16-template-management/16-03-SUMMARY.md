---
phase: 16
plan: 03
subsystem: templates
tags: [drag-drop, reordering, ui]
requires: [16-01]
provides: [template-reordering-ui, reorder-api]
affects: []
tech-stack:
  added: []
  patterns: [html5-drag-api, batch-update]
key-files:
  created:
    - src/app/api/templates/[id]/reorder/route.ts
  modified:
    - src/components/templates/TemplateEditor.tsx
decisions:
  - key: drag-within-parent-only
    choice: Packages can only reorder within same phase, tasks within same package
    rationale: Prevents accidental structure changes; moving to different parent requires explicit action
  - key: batch-update-pattern
    choice: Update all sort_order values in parallel Promise.all
    rationale: Efficient single-round database operation
metrics:
  duration: 8min
  completed: 2026-01-25
---

# Phase 16 Plan 03: Template Hierarchy Reordering Summary

Drag-drop reordering for phases, packages, and tasks in TemplateEditor with database persistence.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create reorder API endpoint | 0054ef2 | reorder/route.ts |
| 2 | Add drag-drop to TemplateEditor | 0b3d276 | TemplateEditor.tsx |

## Implementation Details

### Reorder API Endpoint

Created `PATCH /api/templates/[id]/reorder` endpoint accepting:
- `type`: 'phase' | 'package' | 'task'
- `items`: Array of `{ id, sort_order }` pairs

Updates sort_order in corresponding table (template_phases, template_packages, template_tasks) via batch Promise.all pattern.

### Drag-Drop Implementation

HTML5 Drag API with three levels of handlers:
- **Phases**: Drag between phase rows, reorder at template level
- **Packages**: Drag within same phase only (parentId check)
- **Tasks**: Drag within same package only (parentId check)

Visual feedback:
- `cursor-grab` / `cursor-grabbing` on draggable items
- `bg-blue-100` + blue border on valid drop target
- `opacity-50` on dragged item

Cross-parent drops rejected via dragOver check against parentId.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] Phases can be reordered via drag-drop
- [x] Packages can be reordered within their phase
- [x] Tasks can be reordered within their package
- [x] Cross-parent drops are rejected
- [x] Database sort_order updated after each reorder
- [x] TypeScript compiles without errors

## API Patterns

Reorder endpoint follows existing template API patterns:
- Role check (kewa required)
- Input validation (type, items array)
- Batch database update
- Consistent error responses

## Next Phase Readiness

Template hierarchy now supports full CRUD and reordering. Ready for 16-04 (project creation flow with template selection).
