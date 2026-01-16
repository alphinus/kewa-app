---
phase: 01-foundation
plan: 01
subsystem: database, infra
tags: [next.js, supabase, typescript, tailwind, postgresql]

# Dependency graph
requires: []
provides:
  - Next.js 16 project with TypeScript and Tailwind CSS
  - Supabase SSR client configuration (browser + server)
  - Database schema for building hierarchy (users, buildings, units, projects, tasks)
  - Seed data for 13 apartments, 9 common areas, 2 users
affects: [01-02, 01-03, 02-01]

# Tech tracking
tech-stack:
  added: [next.js@16.1.2, react@19.2.3, @supabase/supabase-js, @supabase/ssr, tailwindcss@4]
  patterns: [app-router, server-components, ssr-client-pattern]

key-files:
  created:
    - package.json
    - next.config.ts
    - tsconfig.json
    - .env.example
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - supabase/migrations/001_initial_schema.sql
    - src/app/layout.tsx
    - src/app/page.tsx
  modified: []

key-decisions:
  - "Next.js 16 (latest) instead of 15 - create-next-app installed latest version"
  - "Standalone output mode for Vercel deployment"
  - "Placeholder PIN hashes in seed data - actual bcrypt hashes in auth plan"
  - "UUID primary keys with deterministic IDs for seed data"

patterns-established:
  - "Supabase SSR pattern: browser client via createBrowserClient, server via createServerClient with cookie handling"
  - "Type-check script added for CI validation"

# Metrics
duration: 8min
completed: 2026-01-16
---

# Phase 1 Plan 01: Project Setup & Database Schema Summary

**Next.js 16 with Supabase SSR clients and complete building hierarchy schema (users, buildings, units, projects, tasks) with 13 apartments and 9 common areas seeded**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-16T07:21:53Z
- **Completed:** 2026-01-16T07:29:44Z
- **Tasks:** 3
- **Files modified:** 17

## Accomplishments

- Next.js 16 project initialized with TypeScript, Tailwind CSS 4, and App Router
- Supabase SSR clients configured for both browser and server usage
- Complete database schema with building hierarchy: users, buildings, units, projects, tasks
- Seed data: 1 building, 13 apartments (EG-Dach), 9 common areas, 1 building-wide unit, 2 users

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Next.js 16 project with TypeScript** - `c8c017d` (feat)
2. **Task 2: Add Supabase and configure clients** - `fc259bb` (feat)
3. **Task 3: Create database schema with building hierarchy** - `020cf5a` (feat)

## Files Created/Modified

- `package.json` - Project dependencies and scripts
- `next.config.ts` - Standalone output for Vercel
- `tsconfig.json` - TypeScript configuration with strict mode
- `.env.example` - Supabase environment variable template
- `src/lib/supabase/client.ts` - Browser Supabase client
- `src/lib/supabase/server.ts` - Server Supabase client with cookie handling
- `supabase/migrations/001_initial_schema.sql` - Complete schema and seed data
- `src/app/layout.tsx` - Root layout component
- `src/app/page.tsx` - Home page component
- `src/app/globals.css` - Tailwind CSS globals

## Decisions Made

1. **Next.js 16 instead of 15** - create-next-app installed the latest version (16.1.2). This is fine as it's backward compatible and provides React 19 with the new React Compiler.

2. **Deterministic UUIDs for seed data** - Used fixed UUIDs (00000000-...) for users and building to allow predictable references in tests and migrations.

3. **Placeholder PIN hashes** - Used `$placeholder_kewa$` and `$placeholder_imeri$` instead of real bcrypt hashes. The auth plan (01-02) will set proper hashes.

4. **German characters avoided in SQL** - Used ASCII-safe names (Waschkueche, Gebaeude) to avoid potential encoding issues.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reinstalled node_modules after directory copy**
- **Found during:** Task 1 (Project initialization)
- **Issue:** Copying node_modules from temp directory corrupted symlinks
- **Fix:** Removed node_modules and package-lock.json, ran fresh npm install
- **Files modified:** node_modules/, package-lock.json
- **Verification:** npm run build succeeds
- **Committed in:** c8c017d (part of Task 1)

**2. [Rule 1 - Bug] Fixed .gitignore to allow .env.example**
- **Found during:** Task 2 (Supabase configuration)
- **Issue:** Default `.env*` pattern ignored .env.example which should be committed
- **Fix:** Added `!.env.example` exception to .gitignore
- **Files modified:** .gitignore
- **Verification:** git add .env.example succeeds
- **Committed in:** fc259bb (part of Task 2)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered

- Directory name "KeWa AG Imeri App" contains spaces and capitals, incompatible with npm naming. Solved by creating project in temp directory and copying files.

## User Setup Required

**Supabase configuration required before running the app:**

1. Create a Supabase project at https://supabase.com
2. Copy `.env.example` to `.env.local`
3. Replace placeholder values with actual Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` from Project Settings > API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Project Settings > API
4. Apply migration: Run `001_initial_schema.sql` in Supabase SQL Editor

## Next Phase Readiness

- Foundation complete, ready for PIN authentication (01-02)
- Database schema ready, migration file needs to be applied to Supabase
- Supabase credentials need to be configured in .env.local before testing

---
*Phase: 01-foundation*
*Completed: 2026-01-16*
