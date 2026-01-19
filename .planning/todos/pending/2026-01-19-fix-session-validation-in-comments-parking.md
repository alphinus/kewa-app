---
created: 2026-01-19T17:55
title: Fix session validation in comments and parking API
area: api
files:
  - src/app/api/comments/route.ts:24-31,52-60
  - src/app/api/parking/[id]/route.ts:26-32,62-68
---

## Problem

The comments and parking API routes use `JSON.parse(sessionCookie.value)` to read session data directly instead of using the proper JWT validation via `validateSession()` from `@/lib/session`.

This is inconsistent with the rest of the codebase and could cause issues:
1. Session is a JWT token, not a JSON object
2. No signature verification happening
3. Could accept tampered session data

Current pattern (incorrect):
```typescript
const session = JSON.parse(sessionCookie.value)
if (session.role !== 'kewa') { ... }
```

Should be:
```typescript
const session = await validateSession(sessionCookie.value)
if (!session || session.role !== 'kewa') { ... }
```

## Solution

1. Import `validateSession` from `@/lib/session` (already importing `SESSION_COOKIE_NAME`)
2. Replace `JSON.parse()` with `await validateSession()`
3. Handle null return (invalid/expired session)
4. Update both GET and POST/PATCH handlers in each file

Note: Cookie name was already fixed today (kewa-session → SESSION_COOKIE_NAME), but the validation method still needs updating.
