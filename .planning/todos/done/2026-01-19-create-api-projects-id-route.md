---
created: 2026-01-19T18:05
title: Create /api/projects/[id] route for single project fetch
area: api
files:
  - src/app/api/projects/[id]/route.ts (missing)
  - src/app/api/projects/route.ts (list route exists)
  - src/app/api/projects/[id]/archive/route.ts (archive route exists)
---

## Problem

The API route `/api/projects/[id]` does not exist, causing 404 errors when the frontend tries to fetch a single project by ID.

Server log:
```
GET /api/projects/00000000-0000-0000-0002-000000000001 404 in 1681ms
```

Current structure:
- `/api/projects` (route.ts) - GET list of projects ✓
- `/api/projects/[id]/archive` (route.ts) - POST to archive ✓
- `/api/projects/[id]` - **MISSING** - no route.ts for single project fetch

The project detail page (`/dashboard/projekte/[id]`) fetches directly from Supabase (server component), but other parts of the app may expect an API endpoint.

## Solution

Create `src/app/api/projects/[id]/route.ts` with:
- GET handler to fetch single project by ID
- Include unit relation (like the list endpoint)
- Return 404 if project not found
- Follow same auth pattern as other API routes
