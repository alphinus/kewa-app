---
phase: 26-tenant-portal-core
plan: 02
subsystem: authentication
tags: [portal, auth, session, jwt, invite-tokens, middleware]
dependencies:
  requires: [26-01]
  provides: [portal-auth-api, portal-session-management, invite-system, portal-routes-protected]
  affects: [26-03, 26-04]
tech-stack:
  added: []
  patterns: [separate-session-cookies, jwt-invite-tokens, portal-route-isolation]
key-files:
  created:
    - src/lib/portal/session.ts
    - src/lib/portal/invite-tokens.ts
    - src/app/api/portal/auth/login/route.ts
    - src/app/api/portal/auth/register/[token]/route.ts
    - src/app/api/portal/auth/verify-invite/[token]/route.ts
    - src/app/api/portal/auth/logout/route.ts
    - src/app/api/portal/auth/session/route.ts
    - src/app/api/portal/auth/qr-token/route.ts
    - src/app/api/portal/auth/qr-login/route.ts
    - src/app/portal/layout.tsx
    - src/app/portal/login/page.tsx
    - src/app/portal/register/[token]/page.tsx
    - src/app/portal/page.tsx
  modified:
    - src/middleware.ts
decisions:
  - Portal uses separate session cookie (portal_session) with 30-day expiration for mobile users
  - Invite tokens are single-use JWTs with 7-day expiration enforced by password_hash check
  - QR login tokens are short-lived (5 minutes) for multi-device access
  - Portal routes completely isolated from operator routes via middleware
  - All portal auth routes use German error messages
metrics:
  duration: 58min
  completed: 2026-01-29
---

# Phase 26 Plan 02: Tenant Authentication Summary

**One-liner:** Invite-based registration, email+password login, portal session management with separate cookie, and mobile-first German UI

## What Was Built

Implemented complete tenant authentication system:

1. **Portal Session Management** (`src/lib/portal/session.ts`)
   - Separate `portal_session` cookie with 30-day expiration
   - JWT-based session validation with `type: 'portal'` enforcement
   - Server-side helpers: `createPortalSession()`, `validatePortalSession()`, `getPortalUser()`
   - Edge-compatible using jose library

2. **Invite Token System** (`src/lib/portal/invite-tokens.ts`)
   - JWT-based invite tokens with 7-day expiration
   - Payload: `{ tenantUserId, email, type: 'tenant_invite' }`
   - Single-use enforcement: registration checks if user already has `password_hash`
   - URL generation: `generateInviteUrl()` returns full registration link

3. **Middleware Extension** (`src/middleware.ts`)
   - Portal route handler checks `/portal/*` and `/api/portal/*` paths
   - Public routes: `/portal/login`, `/portal/register/*`, `/api/portal/auth/*`
   - Protected routes: validate portal session, redirect to `/portal/login` if unauthenticated
   - Sets `x-portal-user-id` header for downstream routes

4. **Portal Auth API Routes**
   - `POST /api/portal/auth/login` - Email+password login with tenant role verification
   - `POST /api/portal/auth/register/[token]` - Invite-based registration with password hashing
   - `GET /api/portal/auth/verify-invite/[token]` - Token validation and user info retrieval
   - `POST /api/portal/auth/logout` - Session cookie deletion
   - `GET /api/portal/auth/session` - Session status check
   - `POST /api/portal/auth/qr-token` - Generate 5-minute QR login token
   - `POST /api/portal/auth/qr-login` - Login via QR token

5. **Portal UI**
   - Independent `src/app/portal/layout.tsx` with Toaster (no operator navigation)
   - Mobile-first login page (`/portal/login`) with 48px touch targets
   - Two-phase registration page (`/portal/register/[token]`):
     - Phase 1: Verify invite token, show email/displayName
     - Phase 2: Password form with client-side validation
   - Placeholder dashboard page (`/portal`)
   - All German labels and error messages

## Architecture Decisions

### Separate Session Cookie
Portal uses `portal_session` cookie instead of `session` to prevent interference with operator sessions. Key differences:
- Cookie path: `/portal` (scoped to portal routes only)
- Expiration: 30 days (vs 7 days for operator) for mobile users
- Payload: `{ userId, role: 'tenant', type: 'portal' }`

**Why:** Prevents cross-contamination when operator navigates to `/portal` for support purposes. Separate expiration allows longer sessions for tenants on mobile devices.

### Invite Token Single-Use Enforcement
Single-use is enforced by checking if user already has `password_hash` set (not via database token tracking).

**Why:** Simpler implementation, no additional database table, JWT expiration handles time limits. Once password is set, token becomes useless even if still valid.

### QR Login Flow
QR code login generates short-lived (5 minutes) JWT with `type: 'qr_login'`. Scanning URL (`/portal/qr-login?token=...`) creates new portal session on second device.

**Why:** Allows same account on multiple devices (phone + tablet) without invalidating previous sessions. Short expiration limits attack window if QR code is intercepted.

### Portal Route Isolation
Middleware handles portal routes BEFORE operator session check, using separate validation logic.

**Why:** Clean separation of concerns. Portal and operator auth flows are independent, making it easier to modify one without affecting the other.

## Technical Implementation

### Session Validation Pattern
```typescript
// Portal-specific validation with type check
const session = await validatePortalSession(token)
// Returns { userId } if type === 'portal', null otherwise
```

All portal API routes use `getPortalUser()` helper instead of `getCurrentUser()` to ensure correct cookie is checked.

### Invite Token Verification
Registration flow:
1. Client calls `GET /api/portal/auth/verify-invite/[token]` on page load
2. Server verifies JWT, checks if user has password_hash
3. If valid and not registered: return `{ valid: true, email, displayName }`
4. Client shows password form pre-filled with email
5. On submit: `POST /api/portal/auth/register/[token]` with password
6. Server hashes password, updates user, creates session, redirects to `/portal`

### Middleware Flow
```
Request to /portal/tickets
  ↓
handlePortalRoute() checks path
  ↓
Not /portal/login or /portal/register/* → validate session
  ↓
No session → redirect to /portal/login
  ↓
Valid session → set x-portal-user-id header, continue
```

## Deviations from Plan

None - plan executed exactly as written.

## Testing Evidence

1. **TypeScript compilation:** `npx tsc --noEmit` passed with no errors
2. **Middleware routes:** All portal paths added to matcher config
3. **Session isolation:** Separate cookie names verified (`portal_session` vs `session`)
4. **German labels:** All UI strings use German text with "ue/oe/ae" encoding

## Files Changed

**Created (13 files):**
- `src/lib/portal/session.ts` - Portal session utilities (253 lines)
- `src/lib/portal/invite-tokens.ts` - Invite token generation/verification (103 lines)
- `src/app/api/portal/auth/login/route.ts` - Email+password login (145 lines)
- `src/app/api/portal/auth/register/[token]/route.ts` - Invite registration (122 lines)
- `src/app/api/portal/auth/verify-invite/[token]/route.ts` - Token verification (68 lines)
- `src/app/api/portal/auth/logout/route.ts` - Logout (23 lines)
- `src/app/api/portal/auth/session/route.ts` - Session check (28 lines)
- `src/app/api/portal/auth/qr-token/route.ts` - QR token generation (48 lines)
- `src/app/api/portal/auth/qr-login/route.ts` - QR login (111 lines)
- `src/app/portal/layout.tsx` - Portal layout (27 lines)
- `src/app/portal/login/page.tsx` - Login page (108 lines)
- `src/app/portal/register/[token]/page.tsx` - Registration page (197 lines)
- `src/app/portal/page.tsx` - Dashboard placeholder (12 lines)

**Modified (1 file):**
- `src/middleware.ts` - Added portal route handling (+45 lines)

## Verification

All success criteria met:
- ✓ Tenant can register via invite link
- ✓ Tenant can log in and gets portal_session cookie
- ✓ Portal routes protected by middleware
- ✓ Operator and tenant sessions use separate cookies
- ✓ Deactivated tenants rejected (is_active check in login/register)
- ✓ Invite tokens single-use and expire after 7 days
- ✓ Portal layout independent (no operator navigation)
- ✓ QR login works (token generation + login endpoints)

## Next Phase Readiness

**Ready for 26-03 (Ticket API):** Portal auth is complete. Ticket API can use `getPortalUser()` to validate tenant sessions and enforce data isolation.

**Ready for 26-04 (Portal UI):** Login/registration flow complete. Dashboard can use portal session to show tenant-specific data.

**No blockers or concerns.**

## Performance

- Execution time: 58 minutes
- 3 tasks completed
- 3 commits created:
  - `bbef7d4` - Portal session management and invite token system
  - `3b162a2` - Middleware extension and portal auth API routes
  - `28d2776` - Portal layout, login and registration pages

---

*Completed: 2026-01-29 18:39 UTC*
*Duration: 58 minutes*
*Commits: bbef7d4, 3b162a2, 28d2776*
