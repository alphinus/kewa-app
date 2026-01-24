---
phase: 14-multi-liegenschaft
plan: 01
subsystem: api
tags: [crud, properties, buildings, api-routes]
dependency-graph:
  requires: [13-partner-module]
  provides: [property-crud-api, building-crud-api]
  affects: [14-02-property-management-ui]
tech-stack:
  added: []
  patterns: [single-resource-routes, cascade-delete-warning]
key-files:
  created:
    - src/app/api/properties/[id]/route.ts
    - src/app/api/buildings/[id]/route.ts
  modified: []
decisions:
  - id: DELETE-admin-only
    choice: DELETE restricted to kewa role only
    rationale: Cascade delete is destructive - admin-only for safety
  - id: cascade-warning-log
    choice: Log warning when deleting with children, but proceed
    rationale: Admin override pattern - inform but don't block (consistent with partners API)
metrics:
  duration: 8min
  completed: 2026-01-24
---

# Phase 14 Plan 01: Property & Building CRUD API Summary

Complete CRUD operations for property and building management via REST API.

## What Was Built

**Property single-resource route** (`src/app/api/properties/[id]/route.ts`):
- GET: Fetch single property by ID
- PATCH: Update name, address, description
- DELETE: Remove property with cascade warning

**Building single-resource route** (`src/app/api/buildings/[id]/route.ts`):
- GET: Fetch single building by ID
- PATCH: Update name, address, property_id (allows moving to different property)
- DELETE: Remove building with cascade warning

## Key Implementation Details

### Role-Based Access Control
| Operation | Allowed Roles |
|-----------|---------------|
| GET | kewa, imeri |
| PATCH | kewa, imeri |
| DELETE | kewa only |

### Cascade Delete Behavior
Both DELETE handlers:
1. Check for associated children (buildings for properties, units for buildings)
2. Log console.warn if children exist
3. Proceed with deletion (admin override pattern)
4. ON DELETE CASCADE handles child record cleanup

### Property ID Update (Building PATCH)
When updating `property_id` on a building:
- Validates UUID format
- Verifies target property exists (returns 404 if not)
- Allows moving building between properties

## Commits

| Commit | Description |
|--------|-------------|
| ab1a4a8 | feat(14-01): add property single-resource route |
| 8d1053a | feat(14-01): add building single-resource route |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] `npm run build` passes
- [x] Both route files export GET, PATCH, DELETE functions
- [x] Auth checks present in all handlers
- [x] Role restrictions: PATCH allows kewa/imeri, DELETE allows only kewa

## Next Plan Readiness

Ready for 14-02 (Property Management UI) which will consume these API endpoints.
