---
phase: 07-foundation-data-model
plan: 04
subsystem: auth
tags: [rbac, jwt, bcrypt, multi-auth, permissions, magic-link, audit]

# Dependency graph
requires:
  - phase: 07-01
    provides: Session utilities, update_updated_at function
  - phase: 07-02
    provides: AuditLog table, work_orders table
provides:
  - RBAC system with 5 roles and ~45 permissions
  - Multi-auth support (PIN, Email+Password, Magic Link)
  - Permission-based middleware authorization
  - Audit logging for all auth events
  - TypeScript types for auth system
affects: [phase-09-contractor-portal, phase-16-tenant-portal, all-api-routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Permission-based authorization via middleware
    - Magic link token-based contractor access
    - Role hierarchy for access control
    - Audit logging for security monitoring

key-files:
  created:
    - supabase/migrations/022_rbac.sql
    - supabase/migrations/023_users_auth.sql
    - supabase/migrations/024_magic_links.sql
    - src/app/api/auth/register/route.ts
    - src/app/api/auth/magic-link/send/route.ts
    - src/app/api/auth/magic-link/verify/route.ts
    - src/lib/permissions.ts
    - src/lib/audit.ts
    - src/types/auth.ts
  modified:
    - src/app/api/auth/login/route.ts
    - src/lib/auth.ts
    - src/lib/session.ts
    - src/middleware.ts
    - src/types/index.ts
    - src/types/database.ts

key-decisions:
  - "Legacy role field preserved for backward compatibility"
  - "Permissions embedded in JWT for fast middleware checks"
  - "Magic links expire in 72h by default, one-time use"
  - "Audit logs use 'auth' as table_name to distinguish from data changes"
  - "Internal roles (admin, property_manager, accounting) get dashboard access"

patterns-established:
  - "Permission checking: hasPermission(), hasAnyPermission(), hasAllPermissions()"
  - "Route permission mapping in ROUTE_PERMISSIONS constant"
  - "Role hierarchy: admin > property_manager > accounting > tenant > contractor"
  - "Session with RBAC: validateSessionWithRBAC() for full permissions"
  - "Audit logging: createAuthAuditLog() for auth events, createDataAuditLog() for data changes"

# Metrics
duration: 10min
completed: 2026-01-18
---

# Phase 7 Plan 4: RBAC & Multi-Auth Summary

**Complete RBAC with 5 roles, 3 auth methods, permission-based middleware, and comprehensive audit logging**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-18T01:11:18Z
- **Completed:** 2026-01-18T01:21:43Z
- **Tasks:** 9 (Task 7 merged with Task 4)
- **Files modified:** 15

## Accomplishments

- Created RBAC database schema with 5 roles and ~45 granular permissions
- Extended users table with email, password_hash, auth_method, role_id
- Implemented PIN auth update to use new RBAC with role/permission lookup
- Added email+password auth for tenants with registration endpoint
- Implemented magic link auth for contractors with 72h expiry tokens
- Created permission checking middleware for all protected routes
- Full audit logging for all auth events (success/failure)
- Complete TypeScript types for RBAC, sessions, and auth

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RBAC Database Schema** - `9d9a947` (feat)
2. **Task 2: Extend Users Table** - `ea1de6d` (feat)
3. **Task 3: Magic Link Tokens Table** - `2f03177` (feat)
4. **Task 4: Update PIN Auth + Audit Logging** - `039990a` (feat)
5. **Task 5: Email+Password Registration** - `a7d679c` (feat)
6. **Task 6: Magic Link Auth** - `3a630a5` (feat)
7. **Task 7: Auth Audit Logging** - (merged with Task 4)
8. **Task 8: RBAC Middleware** - `9b874c9` (feat)
9. **Task 9: TypeScript Types** - `9685f7b` (feat)

## Files Created/Modified

**Migrations:**
- `supabase/migrations/022_rbac.sql` - Roles, permissions, role_permissions tables
- `supabase/migrations/023_users_auth.sql` - Users table auth fields, tenant_users
- `supabase/migrations/024_magic_links.sql` - Magic link tokens table

**API Routes:**
- `src/app/api/auth/login/route.ts` - Updated for PIN + email auth
- `src/app/api/auth/register/route.ts` - User registration (admin only)
- `src/app/api/auth/magic-link/send/route.ts` - Generate tokens
- `src/app/api/auth/magic-link/verify/route.ts` - Validate and consume

**Libraries:**
- `src/lib/auth.ts` - Password hashing, session creation with RBAC
- `src/lib/session.ts` - validateSessionWithRBAC, RBAC payload
- `src/lib/permissions.ts` - Permission checking utilities
- `src/lib/audit.ts` - Auth and data audit logging

**Middleware:**
- `src/middleware.ts` - Permission checking, contractor portal handling

**Types:**
- `src/types/auth.ts` - Comprehensive auth types
- `src/types/index.ts` - Re-exports, UserRole, AuthMethod
- `src/types/database.ts` - DbRole, DbPermission, User extensions

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Keep legacy `role` field | Backward compatibility with existing code |
| Permissions in JWT | Fast middleware checks without DB lookup |
| 72h magic link expiry | Balance security and usability for contractors |
| `auth` as audit table_name | Distinguish auth events from data changes |
| Permission hierarchy | admin > property_manager > accounting > tenant > contractor |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript casting needed for Supabase join responses (roles relation returns object, need to handle properly)
- Resolved by using `as unknown` casting with proper type guards

## Next Phase Readiness

**Ready for:**
- Phase 9: External Contractor Portal (uses magic links)
- Phase 16: Tenant Portal (uses email+password auth)
- All API routes now have permission checking

**Prerequisites complete:**
- All 5 roles seeded with permissions
- All 3 auth methods functional
- Audit logging capturing all auth events
- TypeScript types exported for use

---
*Phase: 07-foundation-data-model*
*Completed: 2026-01-18*
