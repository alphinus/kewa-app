# Architecture: Supabase Auth Migration (v5.0)

**Domain:** Auth System Migration — Custom PIN/Cookie to Supabase Auth + JWT-based RLS
**Researched:** 2026-02-19
**Confidence:** HIGH (Supabase official docs + existing codebase inspection)

---

## Migration Context

### What Exists (Current State)

```
Browser
  |-- PIN/Password --> POST /api/auth/login
                           |
                    createSession() --> custom JWT (SESSION_SECRET)
                           |
                    cookie: "session" (httpOnly, sameSite: strict)
                           |
                    middleware reads cookie
                           |
                    validateSessionWithRBAC() (jose jwtVerify)
                           |
                    response.headers.set('x-organization-id', orgId)
                           |
                    API route: createOrgClient(request)
                                   |
                           supabase.rpc('set_org_context', { org_id })
                                   |
                           Postgres SET LOCAL app.current_organization_id
                                   |
                           RLS: current_organization_id() = organization_id
```

**Auth cookie:** Custom JWT signed with `SESSION_SECRET`. Not a Supabase Auth token.
**RLS mechanism:** `set_config('app.current_organization_id', ...)` + `current_setting()`.
**Users table:** Public `users` table with `pin_hash`, `password_hash`, `role_id`. No FK to `auth.users`.
**Portal session:** Separate custom JWT in `portal_session` cookie for tenants.
**Contractor access:** Custom `magic_link_tokens` table + URL token validation. No Supabase Auth involvement.

### What the Target Looks Like (v5.0 End State)

```
Browser
  |-- Email+Password --> supabase.auth.signInWithPassword()
  |-- Magic Link OTP --> supabase.auth.signInWithOtp()
                              |
                    Supabase Auth issues JWT (access_token + refresh_token)
                    Custom Access Token Hook fires:
                      reads organization_members for user
                      adds org_id + role_name to JWT claims
                              |
                    @supabase/ssr stores tokens in cookies
                    (sb-[project-ref]-auth-token)
                              |
                    middleware: updateSession() calls supabase.auth.getUser()
                    validates JWT signature against Supabase public keys
                              |
                    middleware reads app_metadata.org_id from claims
                    sets x-organization-id header (preserved)
                              |
                    API route: createOrgClient(request)
                                   |
                           (set_org_context call RETAINED during migration)
                           [or replaced by auth.uid() + JWT claims in RLS]
                                   |
                           RLS: auth.uid() = user_id
                                auth.jwt()->'app_metadata'->>'org_id' = organization_id
```

---

## System Overview: Auth Architecture After Migration

```
+------------------------------------------------------------------+
|  Client Layer (Browser / Mobile PWA)                              |
|  +------------------+  +-------------------+  +---------------+  |
|  | /dashboard/*     |  | /portal/*         |  | /contractor/* |  |
|  | Internal users   |  | Tenant users      |  | Contractors   |  |
|  | Email+Password   |  | Supabase Auth     |  | Magic Link    |  |
|  | (was PIN)        |  | (already partial) |  | (OTP or token)|  |
|  +------------------+  +-------------------+  +---------------+  |
+------------------------------------------------------------------+
         |                       |                       |
+------------------------------------------------------------------+
|  Next.js Middleware (src/middleware.ts)                           |
|  - updateSession() refreshes Supabase Auth tokens                 |
|  - Validates via supabase.auth.getUser() (server-side)           |
|  - Reads org_id from JWT claims (app_metadata)                    |
|  - Sets x-organization-id, x-user-id, x-user-role-name headers  |
|  - Contractor route: still uses URL token validation              |
+------------------------------------------------------------------+
         |                       |
+------------------------------------------------------------------+
|  API Routes (/api/*)                                              |
|  - createOrgClient(request): reads x-organization-id             |
|  - Calls set_org_context RPC (RETAINED until Phase 3 migration)  |
|  - Auth check: supabase.auth.getUser() replaces cookie decode    |
|  - RBAC: permissions from JWT claims or org_member.role lookup   |
+------------------------------------------------------------------+
         |
+------------------------------------------------------------------+
|  Supabase Postgres                                                |
|  - auth.users: canonical user identity                           |
|  - public.users: extended profile, linked via FK to auth.users   |
|  - Custom Access Token Hook: adds org_id + role to JWT           |
|  - RLS (migration target):                                        |
|    Phase 2: auth.uid() = user_id (user-scoped policies)         |
|    Phase 3: (SELECT auth.jwt()->'app_metadata'->>'org_id')::uuid |
|             = organization_id (replaces current_organization_id) |
+------------------------------------------------------------------+
```

---

## Component Boundaries: New vs Modified vs Unchanged

| Component | Status | Change |
|-----------|--------|--------|
| `src/middleware.ts` | Modified | Replace cookie validation with `updateSession()` + Supabase JWT |
| `src/lib/supabase/server.ts` | Modified | `createServerClient` already uses `@supabase/ssr` — retain, no change needed for SSR |
| `src/lib/supabase/with-org.ts` | Modified | `createOrgClient` retains `set_org_context` RPC during migration; replace in Phase 3 |
| `src/lib/session.ts` | Replaced | Custom JWT logic replaced by Supabase Auth session utilities |
| `src/lib/auth.ts` | Replaced | `verifyPin`, `createSession`, `verifyPassword` — all replaced by Supabase Auth methods |
| `src/lib/portal/session.ts` | Replaced | Portal JWT replaced by unified Supabase Auth |
| `src/lib/magic-link.ts` | Replaced | Custom token table replaced by Supabase `signInWithOtp` |
| `src/app/api/auth/login/route.ts` | Replaced | Replaced by Supabase Auth flows |
| `src/app/api/auth/logout/route.ts` | Modified | Calls `supabase.auth.signOut()` |
| `src/app/api/auth/magic-link/` | Replaced | Replaced by Supabase `signInWithOtp` |
| `src/app/api/auth/register/route.ts` | Modified | Use `supabase.auth.admin.createUser()` |
| `src/lib/permissions.ts` | Retained | PERMISSIONS constants, ROUTE_PERMISSIONS map — unchanged |
| `src/app/auth/callback/route.ts` | NEW | PKCE code exchange route |
| `supabase/migrations/085_*` | NEW | Custom Access Token Hook function |
| `supabase/migrations/086_*` | NEW | Link public.users to auth.users |
| `supabase/migrations/087_*` | NEW | RLS policies v2: auth.uid() + auth.jwt() (replaces current_organization_id) |
| `src/lib/supabase/client.ts` | Unchanged | `createBrowserClient` — already correct |
| `src/lib/supabase/cached-queries.ts` | Modified | `createOrgScopedClient` needs update to not pass anon key for auth checks |
| `OrganizationProvider` | Modified | Org switch triggers `supabase.auth.refreshSession()` |

---

## Architectural Patterns

### Pattern 1: Supabase SSR Middleware — Token Refresh Proxy

**What:** Middleware calls `supabase.auth.getUser()` on every request to validate and refresh the JWT. The `@supabase/ssr` package handles cookie read/write automatically.

**When to use:** Every request to protected routes. This replaces `validateSessionWithRBAC(sessionCookie.value)`.

**Critical rule:** Use `getUser()` (validates with Supabase Auth server) — never `getSession()` (unvalidated, can be stale).

**Implementation:**

```typescript
// src/lib/supabase/middleware.ts (new file)
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

// Updated src/middleware.ts core:
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = await createMiddlewareClient(request, response)

  // This MUST be called on every request: refreshes token, validates signature
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // No valid session — same redirect logic as before
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Extract org_id from JWT custom claims
  const claims = user.app_metadata
  const orgId = claims?.org_id || request.cookies.get('organization_id')?.value

  // Retain existing header injection (downstream compatibility)
  response.headers.set('x-organization-id', orgId || '')
  response.headers.set('x-user-id', user.id)
  response.headers.set('x-user-role-name', claims?.role_name || '')
  response.headers.set('x-user-permissions', (claims?.permissions || []).join(','))

  return response
}
```

**Trade-offs:**
- One HTTP call to Supabase Auth per request (adds ~10-30ms). Acceptable for SSR app.
- Token auto-refresh is handled automatically by `@supabase/ssr`.
- No more `SESSION_SECRET` environment variable needed.

---

### Pattern 2: Custom Access Token Hook — JWT Claim Injection

**What:** A Postgres function registered as a Supabase Auth hook that runs before every token issuance (login, refresh, org switch). Adds `org_id`, `role_name`, and `permissions` to JWT `app_metadata`.

**When to use:** This is the single point where org context enters the JWT. It fires automatically — no application code changes needed beyond registration.

**Implementation (Migration 085):**

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  user_org_id UUID;
  user_role_name TEXT;
  user_permissions TEXT[];
BEGIN
  claims := event->'claims';

  -- Lookup user's default organization membership
  -- Falls back gracefully: NULL if no org membership exists
  SELECT
    om.organization_id,
    r.name
  INTO user_org_id, user_role_name
  FROM public.organization_members om
  JOIN public.roles r ON r.id = om.role_id
  WHERE om.user_id = (event->>'user_id')::UUID
    AND om.is_default = true
  LIMIT 1;

  -- Add org_id to app_metadata (admin-only field, not user-modifiable)
  claims := jsonb_set(claims, '{app_metadata,org_id}',
    COALESCE(to_jsonb(user_org_id), 'null'::JSONB));

  claims := jsonb_set(claims, '{app_metadata,role_name}',
    COALESCE(to_jsonb(user_role_name), '"unknown"'::JSONB));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Required grants
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON public.organization_members TO supabase_auth_admin;
GRANT SELECT ON public.roles TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
```

Register via: Dashboard > Authentication > Hooks > Custom Access Token.
Or via `config.toml` for local development.

**Org switching:** When user switches org, update `organization_members.is_default`, then call `supabase.auth.refreshSession()` client-side to get a new JWT with updated `org_id`.

**Trade-offs:**
- JWT `org_id` is stale until refresh (default 1-hour token lifetime). Acceptable because org switch triggers explicit refresh.
- Cannot encode multiple orgs in the JWT — one active org per token. This matches the existing `organization_id` cookie approach.

---

### Pattern 3: Incremental RLS Migration — Dual-Mode Policy

**What:** During migration, RLS policies support BOTH the old `current_organization_id()` and the new `auth.jwt()` approach simultaneously. This allows phased rollout without a big-bang cutover.

**When to use:** Migration Phase 3 only. After full cutover, consolidate to JWT-only.

**The 248 policies split into two groups:**

**Group A (56 tables x 4 policies = 224 standard org-scoped policies)**
All in migration 083_rls_policies.sql. Pattern:
```sql
USING (organization_id = current_organization_id())
```
Target after migration:
```sql
USING (organization_id = (SELECT auth.jwt()->'app_metadata'->>'org_id')::UUID)
```

**Group B (24 special-case policies)**
Contractor access, tenant-own-unit, magic link tokens, etc. Each needs individual analysis.

**Dual-mode approach for transition period:**

```sql
-- During migration: accepts EITHER mechanism
CREATE POLICY "properties_org_select_v2" ON properties
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    organization_id = current_organization_id()
    OR
    organization_id = (SELECT auth.jwt()->'app_metadata'->>'org_id')::UUID
  );
```

This is temporary. Once all API routes are confirmed using Supabase Auth tokens (not custom session cookies), drop the `current_organization_id()` branch.

**Why SELECT-wrap `auth.jwt()`:**
The Postgres optimizer can cache the result of `(SELECT auth.jwt())` per query. Without the SELECT wrapper, it evaluates per row, causing severe performance degradation on tables with many rows.

```sql
-- CORRECT: cached once per query
USING (organization_id = (SELECT (auth.jwt()->'app_metadata'->>'org_id')::UUID))

-- INCORRECT: evaluated per row (100x slower on large tables)
USING (organization_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID)
```

---

### Pattern 4: User Migration — Linking public.users to auth.users

**What:** Current `public.users` table has no FK to `auth.users`. Each user needs a corresponding `auth.users` record created, and the IDs linked.

**When to use:** Migration Phase 1. Must complete before any RLS policy references `auth.uid()`.

**Three user types:**

**Type A: Internal users (PIN-based, currently ~2-3 users)**
Create via `supabase.auth.admin.createUser()` with email + temporary password.
User receives password-reset email. PIN is deprecated after reset.

```typescript
// Admin migration script
const { data, error } = await supabase.auth.admin.createUser({
  email: user.email,
  password: generateTemporaryPassword(), // user changes on first login
  email_confirm: true, // skip email confirmation
  app_metadata: { migrated_from: 'pin', legacy_user_id: user.id }
})

// Link auth.users.id back to public.users
await supabase.from('users')
  .update({ auth_user_id: data.user.id })
  .eq('id', user.id)
```

**Type B: Tenant users (email+password, currently in public.users)**
Same as Type A — `createUser()` with their existing email.
Password migration: `bcrypt` hashes from `public.users.password_hash` cannot be directly imported. Users get a reset email.

**Type C: Contractors (no persistent auth user)**
Contractors use magic-link OTP flow — they never have a persistent account.
Supabase `signInWithOtp({ email, shouldCreateUser: false })` creates a temporary session.
Keep the existing `magic_link_tokens` table for work-order-specific token management; Supabase OTP handles the auth session.

**Schema addition (Migration 086):**
```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
```

---

### Pattern 5: Auth Callback Route — PKCE Code Exchange

**What:** Supabase uses PKCE flow for magic links and OAuth. The browser receives a `?code=` parameter and must exchange it for a session on the server.

**Required new route:** `src/app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = request.nextUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
}
```

The Supabase Auth email template for magic links must point to: `{APP_URL}/auth/callback?code={token_hash}&next=/dashboard` (contractor links redirect to `/contractor`).

---

## Data Flow: Authentication Flows

### Flow 1: Internal User Login (Email+Password replaces PIN)

```
User enters email + password
  |
Next.js Login Page (Client Component)
  |
supabase.auth.signInWithPassword({ email, password })
  |
Supabase Auth Server validates credentials
  |
Custom Access Token Hook fires:
  SELECT org_id, role_name FROM organization_members WHERE user_id = auth_user_id
  Injects into JWT app_metadata: { org_id, role_name }
  |
@supabase/ssr stores access_token + refresh_token in cookies
  |
Redirect to /dashboard
  |
Middleware: supabase.auth.getUser() validates token
Reads org_id from user.app_metadata
Sets x-organization-id header
  |
API routes work as before via createOrgClient(request)
```

### Flow 2: Contractor Magic-Link Access (OTP replaces custom token table)

```
Admin sends magic link:
  supabase.auth.signInWithOtp({
    email: contractor@example.com,
    options: {
      shouldCreateUser: false,  // do not create account if not exists
      emailRedirectTo: '{APP_URL}/auth/callback?next=/contractor/{workOrderId}',
      data: { work_order_id: workOrderId }  // stored in user_metadata
    }
  })
  |
Contractor clicks link → /auth/callback?code=xxx
  |
exchangeCodeForSession(code) creates Supabase Auth session
  |
Redirect to /contractor/{workOrderId}
  |
Contractor page: supabase.auth.getUser() verifies session
Work order ID from URL, user identity from session
```

**Note:** Supabase OTP tokens expire in 1 hour (configurable to 24h max). The existing 72-hour work-order access requirement means the session must be maintained via refresh tokens, not the initial OTP link. After the first sign-in, the Supabase session (refresh token) keeps them authenticated.

### Flow 3: Tenant Portal (already partially Supabase Auth)

```
Tenant enters email + password
  |
/portal/login page
  |
supabase.auth.signInWithPassword({ email, password })
  |
@supabase/ssr manages session cookies
  |
Middleware detects /portal route
Validates via supabase.auth.getUser()
  |
Portal pages: createClient() → supabase.auth.getUser()
RLS: auth.uid() for tenant-scoped data
```

### Flow 4: Org Switching

```
User clicks org switcher → selects different org
  |
Server Action:
  UPDATE organization_members SET is_default = false WHERE user_id = X
  UPDATE organization_members SET is_default = true WHERE user_id = X AND org_id = Y
  |
Client:
  await supabase.auth.refreshSession()
  // Hook re-fires: new JWT has new org_id in app_metadata
  |
Middleware reads new org_id on next request
x-organization-id header updates
  |
React: OrganizationProvider state updates (revalidatePath or router.refresh())
```

---

## RLS Migration Strategy: 248 Policies

### Current Policy Pattern (083_rls_policies.sql)

```sql
-- 224 standard org-scoped policies (56 tables x 4 operations):
USING (organization_id = current_organization_id())

-- 24 special-case policies (contractor, tenant, magic-link, templates):
USING (/* custom logic, no org check */)
```

### Target Pattern

```sql
-- Standard org-scoped (replaces current_organization_id()):
USING (organization_id = (SELECT auth.jwt()->'app_metadata'->>'org_id')::UUID)

-- User-identity check (new, replaces header-based userId):
USING (user_id = (SELECT auth.uid()))

-- Contractor access (work order visibility):
USING (
  organization_id = (SELECT auth.jwt()->'app_metadata'->>'org_id')::UUID
  OR
  -- contractor sees only their work orders (via email match or explicit grant)
  id IN (SELECT work_order_id FROM magic_link_tokens WHERE email = current_user)
)
```

### Migration Execution Order

Migration is in **three separate SQL migrations** to allow rollback at each stage:

**Migration 085: Custom Access Token Hook (required first)**
- Creates hook function
- Grants permissions to `supabase_auth_admin`
- No RLS changes yet

**Migration 086: User Linkage**
- Adds `auth_user_id` column to `public.users`
- NOT NULL constraint deferred until data migration script runs

**Migration 087: RLS Policy Replacement**
- Drops all 248 old policies
- Creates 248 new policies using `auth.uid()` + `auth.jwt()`
- Creates helper functions:
  ```sql
  CREATE OR REPLACE FUNCTION public.auth_org_id()
  RETURNS UUID AS $$
    SELECT (auth.jwt()->'app_metadata'->>'org_id')::UUID
  $$ LANGUAGE SQL STABLE SECURITY DEFINER;
  ```
- Policies use `(SELECT public.auth_org_id())` for caching

**Cannot be incremental at the policy level** because:
- RESTRICTIVE policies are AND-combined with other RESTRICTIVE policies
- A new policy using `auth.uid()` added alongside old `current_organization_id()` policies would BLOCK access (both must pass)
- Must do a complete swap: old policies OUT, new policies IN, in one migration

**The dual-mode transition is at the application level:**
- During Phase 1: Middleware still calls `set_org_context` (old mechanism stays live)
- In Phase 2: RLS migrates to JWT (old `current_organization_id()` function removed)
- After Phase 2: Remove `createOrgClient`'s `set_org_context` RPC call

---

## API Route Auth Check Migration

### Current Pattern (34 routes with ALLOWED_ROLES)

```typescript
// Before
const ALLOWED_ROLES = ['admin', 'property_manager']
const session = await getSessionWithRBACFromRequest(request)
if (!ALLOWED_ROLES.includes(session.roleName)) {
  return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
}
```

### Target Pattern

```typescript
// After
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
}

const roleName = user.app_metadata?.role_name
const permissions = user.app_metadata?.permissions || []

// Option A: role-based check
if (!['admin', 'property_manager'].includes(roleName)) {
  return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
}

// Option B: permission-based check (preferred)
if (!permissions.includes('projects:create')) {
  return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
}
```

The existing `PERMISSIONS` constants and `ROUTE_PERMISSIONS` map in `src/lib/permissions.ts` are retained — only the source of `permissions` changes (from custom JWT to Supabase JWT claims).

---

## Integration Points with Existing Code

### Must Change

| File | Current | Target |
|------|---------|--------|
| `src/middleware.ts` | `validateSessionWithRBAC(cookie)` | `supabase.auth.getUser()` via `@supabase/ssr` |
| `src/lib/session.ts` | Custom `jwtVerify` with SESSION_SECRET | Delete file (or keep only for backward compat during cutover) |
| `src/lib/auth.ts` | `verifyPin()`, `createSession()`, `verifyPassword()` | Delete file |
| `src/lib/portal/session.ts` | Custom portal JWT | Delete file |
| `src/lib/magic-link.ts` | Custom token table operations | Replace with Supabase `signInWithOtp` wrapper |
| `src/app/api/auth/login/route.ts` | PIN + password verification | Remove (Supabase client handles auth) |
| `src/app/api/auth/magic-link/send/route.ts` | `create_magic_link_token` RPC | `supabase.auth.admin.generateLink({ type: 'magiclink', email })` |
| `src/app/api/auth/magic-link/verify/route.ts` | Token table lookup | Remove (PKCE callback handles it) |
| `src/lib/supabase/with-org.ts` | `set_org_context` RPC in `createOrgClient` | Remove RPC call after RLS migration |

### Preserved (no change)

| Component | Reason |
|-----------|--------|
| `src/lib/permissions.ts` | PERMISSIONS constants still valid |
| `src/lib/supabase/client.ts` | `createBrowserClient` — already correct |
| `src/lib/supabase/server.ts` | `createServerClient` with cookie handling — correct |
| `src/lib/supabase/cached-queries.ts` | Pattern valid; `createOrgScopedClient` retained |
| `OrganizationProvider` | Add `refreshSession()` on org switch, otherwise unchanged |
| `src/lib/rate-limit.ts` | Rate limiting logic unchanged |
| `src/lib/audit.ts` | Audit log writes unchanged |
| All API route query logic | Data queries unchanged; only auth check layer changes |
| All React components | No component changes needed |

---

## Build Order: Phased Migration

### Why This Order

Dependencies flow downward: user identity in `auth.users` must exist before JWT hook can lookup org membership, which must exist before RLS policies can validate `auth.uid()`, which must exist before API route auth checks can be removed.

```
Phase A: Foundation
  auth.users records created for all public.users
  public.users.auth_user_id populated
  Custom Access Token Hook deployed and tested
  /auth/callback route added
     |
Phase B: Auth Layer Migration
  Middleware: updateSession() replaces validateSessionWithRBAC()
  Login flow: signInWithPassword() replaces PIN+cookie
  Tenant portal: unified under Supabase Auth
  Contractor: signInWithOtp() replaces custom magic-link
     |
Phase C: RLS Migration (248 policies)
  Migration 087: drop current_organization_id() policies
  Create auth.uid() + auth.jwt() policies
  Remove set_org_context() RPC call from createOrgClient
     |
Phase D: API Route Cleanup (34 routes)
  Replace ALLOWED_ROLES arrays with JWT claims checks
  Remove SESSION_SECRET env var dependency
     |
Phase E: Legacy Cleanup
  DROP users.role column
  DROP users.pin_hash column
  DROP users.password_hash column (credentials now in auth.users)
  DROP visible_to_imeri column
  Remove magic_link_tokens table or keep for audit history
```

### Critical Dependency: RLS Migration Requires auth_user_id

**Phase C cannot start before Phase A completes.** Once RLS policies switch to `auth.uid()`, any `public.users` record without a linked `auth.users` ID will see zero data. This is a hard dependency.

**Test isolation:** Phase C should be deployed to staging with a full data copy before production. The policy swap is atomic (one migration) but irreversible without a rollback migration.

---

## Anti-Patterns

### Anti-Pattern 1: Using getSession() in Middleware

**What people do:** Call `supabase.auth.getSession()` in middleware for performance (avoids network call).

**Why it's wrong:** `getSession()` does not validate the JWT signature. A tampered token passes validation. Supabase documentation explicitly warns: "Never trust `getSession()` inside server code such as middleware."

**Do this instead:** Always use `supabase.auth.getUser()` in middleware. Accept the ~20ms network overhead. Token refresh is cached by `@supabase/ssr` — only one actual network call happens when the token is near expiry.

---

### Anti-Pattern 2: Putting org_id in user_metadata Instead of app_metadata

**What people do:** Write `{ org_id }` to `user_metadata` because it's easier to update.

**Why it's wrong:** Users can modify `user_metadata` via the client SDK. An attacker can change their `org_id` claim and bypass RLS. `app_metadata` requires service-role or auth admin rights to write.

**Do this instead:** Always set `org_id` in `app_metadata` via the Custom Access Token Hook or `supabase.auth.admin.updateUserById()`.

---

### Anti-Pattern 3: Missing SELECT Wrapper on auth.jwt() in RLS

**What people do:** Write RLS policies directly using `auth.jwt()`:
```sql
USING (organization_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID)
```

**Why it's wrong:** Postgres evaluates this per row. On a table with 10,000 rows, the function is called 10,000 times per query. Causes severe performance regression.

**Do this instead:**
```sql
USING (organization_id = (SELECT (auth.jwt()->'app_metadata'->>'org_id')::UUID))
```
The SELECT wrapper triggers Postgres's `initPlan` optimization, caching the result for the entire query.

---

### Anti-Pattern 4: Big-Bang RLS Migration Without User Linkage First

**What people do:** Rewrite all 248 RLS policies to `auth.uid()` before linking `public.users` to `auth.users`.

**Why it's wrong:** `auth.uid()` returns NULL for any session not using Supabase Auth. All queries return empty sets. Data appears deleted to users still on the old auth system.

**Do this instead:** Complete user linkage (Phase A) and middleware migration (Phase B) before touching RLS policies (Phase C). Verify all sessions use Supabase Auth tokens before deploying Phase C.

---

### Anti-Pattern 5: Contractor Persistent Account via signInWithOtp

**What people do:** Use `signInWithOtp({ shouldCreateUser: true })` so contractors always have an auth.users account.

**Why it's wrong:** Contractors are external, anonymous-ish parties. Creating permanent accounts for them pollutes auth.users, complicates cleanup, and is unnecessary since their work-order access is time-bound.

**Do this instead:** Use `signInWithOtp({ shouldCreateUser: false })`. Contractor must exist in the system already (as a partner email). The session lasts as long as the refresh token. The work-order ID comes from the URL, not the JWT.

---

## Scaling Considerations

| Scale | Architecture Impact |
|-------|---------------------|
| Current (~10 internal users) | All patterns described here work as-is |
| 100 organizations, 1000 users | Custom Access Token Hook adds ~5ms per auth (indexed lookup on organization_members) |
| 10K users | Add index on `organization_members(user_id, is_default)` (already exists from migration 073) |
| 100K+ users | Consider caching the hook lookup in a materialized view; JWT org_id may lag org changes by up to 1 hour |

The `idx_org_members_user_default` index from migration 073 already covers the hook's query pattern. No additional optimization needed for current scale.

---

## Sources

- [Setting up Server-Side Auth for Next.js — Supabase Docs](https://supabase.com/docs/guides/auth/server-side/nextjs) | HIGH confidence
- [Advanced SSR Guide — Supabase Docs](https://supabase.com/docs/guides/auth/server-side/advanced-guide) | HIGH confidence
- [Custom Access Token Hook — Supabase Docs](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) | HIGH confidence
- [Custom Claims & RBAC — Supabase Docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) | HIGH confidence
- [JWT Claims Reference — Supabase Docs](https://supabase.com/docs/guides/auth/jwt-fields) | HIGH confidence
- [RLS Performance Best Practices — Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) | HIGH confidence
- [Row Level Security — Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) | HIGH confidence
- [User Management — Supabase Docs](https://supabase.com/docs/guides/auth/managing-user-data) | HIGH confidence
- [supabase-community/supabase-custom-claims](https://github.com/supabase-community/supabase-custom-claims) | MEDIUM confidence
- Existing codebase (src/middleware.ts, src/lib/session.ts, src/lib/supabase/with-org.ts, supabase/migrations/076_rls_helpers.sql, 083_rls_policies.sql) | HIGH confidence (direct inspection)

---

*Architecture research for: v5.0 Unified Auth & RBAC — Supabase Auth migration*
*Researched: 2026-02-19*
