# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Next.js App Router with Server/Client Split

**Key Characteristics:**
- Server Components for data fetching and initial render
- Client Components for interactivity (marked with 'use client')
- API Route Handlers for backend logic
- Supabase as data layer (PostgreSQL)
- JWT-based session management (not Supabase Auth)
- Role-based access control (RBAC) system

## Layers

**Presentation Layer:**
- Purpose: User interface and client-side interactivity
- Location: `src/app/**/page.tsx`, `src/components/**`
- Contains: React components, client hooks, UI elements
- Depends on: API routes, lib utilities
- Used by: End users (KEWA staff, Imeri, external contractors)

**API Layer:**
- Purpose: Handle HTTP requests, business logic, authorization
- Location: `src/app/api/**/route.ts`
- Contains: Route handlers (GET, POST, PUT, DELETE)
- Depends on: lib utilities, Supabase client, types
- Used by: Presentation layer via fetch()

**Data Access Layer:**
- Purpose: Database queries and Supabase operations
- Location: `src/lib/supabase/`, `src/lib/costs/`, `src/lib/templates/`
- Contains: Supabase clients, query helpers, data transformations
- Depends on: Supabase SDK, types
- Used by: API routes, Server Components

**Authentication Layer:**
- Purpose: Session management, authorization, permissions
- Location: `src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/proxy.ts`
- Contains: JWT validation, session utilities, RBAC checks
- Depends on: jose (JWT), bcryptjs
- Used by: API routes via headers, proxy (middleware replacement)

**Type Layer:**
- Purpose: TypeScript definitions mirroring database schema
- Location: `src/types/`
- Contains: Database entity types, API input/output types, enums
- Depends on: Nothing (pure types)
- Used by: All layers for type safety

## Data Flow

**Authenticated Page Load:**

1. Browser requests `/dashboard/page`
2. `src/proxy.ts` validates JWT from session cookie
3. Proxy sets user headers (x-user-id, x-user-role, x-user-permissions)
4. Server Component renders, Client Component hydrates
5. Client Component calls `useSession()` hook to fetch `/api/auth/session`
6. Dashboard fetches data via API routes (e.g., `/api/tasks`)

**API Request Flow:**

1. Client calls `fetch('/api/tasks')`
2. Proxy validates session, checks permissions via `getRoutePermissions()`
3. API route handler reads user from headers (`x-user-id`, `x-user-role`)
4. Handler queries Supabase using server client
5. Response returned as JSON

**Contractor Portal Flow:**

1. Contractor receives magic link email with token
2. Browser navigates to `/contractor/{token}`
3. `src/proxy.ts` calls `validateContractorAccess(token)`
4. Server Component loads work orders for contractor email
5. Client-side interactions use `/api/contractor/` routes

**State Management:**
- No global state library (no Redux, Zustand)
- Server Components handle data fetching
- Client Components use React hooks (useState, useEffect, useCallback)
- `useSession()` hook provides authenticated user state

## Key Abstractions

**Session:**
- Purpose: Represents authenticated user state
- Examples: `src/lib/session.ts`, `src/hooks/useSession.ts`
- Pattern: JWT token in httpOnly cookie, validated server-side

**Supabase Client:**
- Purpose: Database access abstraction
- Examples: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server)
- Pattern: SSR-aware client creation using `@supabase/ssr`

**Database Types:**
- Purpose: Type-safe database entity representations
- Examples: `src/types/database.ts`, `src/types/index.ts`
- Pattern: Interfaces matching SQL schema, input/output types for API

**Permissions:**
- Purpose: Fine-grained authorization control
- Examples: `src/lib/permissions.ts`
- Pattern: Permission strings (e.g., `tasks:read`), route-permission mapping

## Entry Points

**Root Application:**
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: HTML structure, fonts, global CSS

**Login Page:**
- Location: `src/app/login/page.tsx`
- Triggers: Unauthenticated users, root redirect
- Responsibilities: PIN authentication form

**Dashboard Layout:**
- Location: `src/app/dashboard/layout.tsx`
- Triggers: All `/dashboard/*` routes
- Responsibilities: Header, mobile nav, session check

**Contractor Portal:**
- Location: `src/app/contractor/[token]/page.tsx`
- Triggers: External contractor access via magic link
- Responsibilities: Work order dashboard for contractors

**Auth Proxy:**
- Location: `src/proxy.ts`
- Triggers: All protected routes (matcher pattern)
- Responsibilities: Session validation, permission checks, header injection

## Error Handling

**Strategy:** Try-catch with JSON error responses

**Patterns:**
- API routes return `{ error: string }` with appropriate HTTP status
- 401 for unauthenticated, 403 for unauthorized, 404 for not found, 500 for server errors
- Client components show error states or fallback UI
- Console.error for server-side logging

**Example:**
```typescript
// src/app/api/tasks/route.ts
try {
  // ... logic
} catch (error) {
  console.error('Unexpected error in GET /api/tasks:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

## Cross-Cutting Concerns

**Logging:** Console-based (console.error for errors)

**Validation:**
- Required field checks in API routes
- Type checking via TypeScript
- Database constraints (CHECK, REFERENCES)

**Authentication:**
- JWT tokens signed with SESSION_SECRET
- 7-day session expiration
- PIN-based login (bcrypt hashed)
- Magic links for external contractors

**Authorization:**
- Legacy role check: `x-user-role` header (kewa, imeri)
- RBAC: `x-user-permissions` header with permission strings
- Route-level permission mapping in `src/lib/permissions.ts`

**Audit:**
- Audit log table for change tracking
- `src/lib/audit.ts` for audit utilities
- Database triggers for automatic logging (see migrations)

---

*Architecture analysis: 2026-01-19*
