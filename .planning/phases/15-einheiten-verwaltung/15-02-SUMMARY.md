---
phase: 15
plan: 02
subsystem: api
status: complete
tags: [rooms, crud, api, digital-twin]

dependencies:
  requires:
    - 15-01 (Unit API for unit_id references)
  provides:
    - Room CRUD API endpoints
    - Unit-scoped room listing
    - Digital Twin condition defaults
  affects:
    - 15-03 (UI will consume these endpoints)
    - Digital Twin automation (condition updates)

tech-stack:
  added: []
  patterns:
    - Unit-scoped resource filtering (unit_id required)
    - Condition managed externally (not updatable via API)
    - Admin-only delete with history warning

key-files:
  created:
    - src/app/api/rooms/route.ts
    - src/app/api/rooms/[id]/route.ts
  modified:
    - src/types/database.ts

decisions:
  - id: "15-02-01"
    title: "unit_id required for room listing"
    rationale: "Rooms only make sense in unit context; prevents expensive full-table scans"
  - id: "15-02-02"
    title: "condition not updatable via API"
    rationale: "Condition is managed by Digital Twin automation from completed projects"
  - id: "15-02-03"
    title: "kewa-only DELETE with history warning"
    rationale: "Cascade delete of history is destructive; admin override but logged"

metrics:
  duration: 8min
  tasks_completed: 3
  files_created: 2
  files_modified: 1
  completed: 2026-01-24
---

# Phase 15 Plan 02: Room API CRUD Summary

Room CRUD API enabling unit-scoped room management with condition tracking integration.

## What Was Built

### Room Collection API (`/api/rooms`)

**GET /api/rooms?unit_id=X**
- Lists rooms for specified unit
- Ordered by room_type, then name
- Requires unit_id (400 if missing)
- Auth: kewa, imeri roles

**POST /api/rooms**
- Creates room with unit_id, name, room_type
- Optional: area_sqm, notes
- Validates room_type against enum
- Defaults: condition='old', condition_updated_at=null
- Returns 201 with created room

### Room Single API (`/api/rooms/[id]`)

**GET /api/rooms/:id**
- Returns single room by ID
- 404 if not found (PGRST116)
- Auth: kewa, imeri roles

**PATCH /api/rooms/:id**
- Updates name, room_type, area_sqm, notes
- condition is NOT updatable (Digital Twin managed)
- Validates room_type against enum
- Auth: kewa, imeri roles

**DELETE /api/rooms/:id**
- Removes room from database
- Logs warning if condition_history entries exist
- Returns 204 on success
- Auth: kewa only (admin)

### Type Definitions

```typescript
// src/types/database.ts
interface CreateRoomInput {
  unit_id: string
  name: string
  room_type: RoomType
  area_sqm?: number | null
  notes?: string | null
}

interface UpdateRoomInput {
  name?: string
  room_type?: RoomType
  area_sqm?: number | null
  notes?: string | null
  // condition NOT updatable - Digital Twin managed
}
```

## Decisions Made

1. **unit_id required for listing** - Rooms are always unit-scoped; listing all rooms across all units is not supported (prevents accidental expensive queries)

2. **condition excluded from update** - Room condition is managed by Digital Twin automation when projects complete; manual override not allowed via API

3. **DELETE requires kewa role** - Deleting rooms with condition history is destructive; restricted to admin with logged warning

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles: PASS
- GET /api/rooms without unit_id returns 400: Implemented
- POST /api/rooms creates with condition='old': Implemented
- PATCH excludes condition field: Implemented
- DELETE restricted to kewa role: Implemented

## Next Phase Readiness

Phase 15-03 (Room UI components) can proceed:
- Room listing endpoint available
- Room CRUD operations available
- Types exported for frontend consumption
