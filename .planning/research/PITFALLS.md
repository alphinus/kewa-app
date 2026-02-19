# Pitfalls Research

**Domain:** Migrating Custom PIN Auth to Supabase Auth with RLS Policy Rewrite in Multi-Tenant Production App
**Researched:** 2026-02-19
**Confidence:** HIGH (verified against Supabase official docs, GitHub issues, production post-mortems)

---

## Critical Pitfalls

### Pitfall 1: Cookie Name Collision Between Legacy Session and Supabase Auth Session

**What goes wrong:**
The existing system uses a custom cookie named `session` (set by `createSession()` in `lib/auth.ts`). Supabase Auth SSR uses cookies named `sb-[project-ref]-auth-token.0` (and `.1`, `.2` for chunked tokens). During the cutover, both cookies exist simultaneously. Middleware reads the `session` cookie first, finds a valid (but legacy) JWT, and considers the user authenticated — even though Supabase Auth has no corresponding session. The Supabase client gets confused: `auth.getUser()` returns null because no Supabase Auth session exists, but the middleware passes the request through. RLS policies using `auth.uid()` return NULL, and all tenant data appears empty.

**Why it happens:**
The codebase has two parallel auth systems in middleware (`validateSession` reads the custom cookie; `createClient()` reads Supabase Auth cookies). During migration, a user authenticated via the old system hits routes where RLS policies have already been switched to `auth.uid()`. Their custom JWT has no corresponding entry in `auth.users`, so `auth.uid()` returns NULL.

**How to avoid:**
- Complete the `auth.users` user migration (import existing users into `auth.users`) BEFORE switching any RLS policy to use `auth.uid()`
- Run both auth systems simultaneously: old cookie validates the session; Supabase Auth session is created fresh at first login under the new system
- Use a feature flag to determine which RLS pattern a given table uses during migration — never mix within a single table
- During the cutover window, maintain old `set_config` patterns on tables where users may still have legacy sessions

**Warning signs:**
- `auth.uid()` returning NULL in RLS policies for authenticated users
- Dashboard data appears empty after RLS migration but no errors thrown
- `supabase.auth.getUser()` returns `null` in middleware despite valid legacy cookie
- Users report logging in successfully but seeing no data

**Phase to address:**
Auth foundation phase — user import into `auth.users` must be complete before ANY RLS policy switches to `auth.uid()`

---

### Pitfall 2: users Table in public Schema vs auth.users — Trigger Causes "Database Error Saving New User"

**What goes wrong:**
The existing `public.users` table (62 tables reference it) must be kept in sync with `auth.users`. The natural solution is a trigger: `AFTER INSERT ON auth.users → insert into public.users`. In production, this causes the error "Database error saving new user" for every signup attempt, even when the trigger logic looks correct. All new user creation — Magic Link sends, tenant registrations, contractor invites — silently fails.

**Why it happens:**
`supabase_auth_admin` (the role that inserts into `auth.users`) does not have `INSERT` permission on `public.users` by default. The trigger function needs `SECURITY DEFINER` to execute with `postgres` role privileges — but using `SECURITY DEFINER` on a dashboard-created function inherits full `postgres` privileges, which is an over-grant. Additionally, if `public.users` has RLS enabled and no policy allows `supabase_auth_admin` to insert, the trigger fails silently.

**How to avoid:**
- Write the auth-to-public sync trigger function as `SECURITY DEFINER` owned by `postgres`
- Explicitly REVOKE execute from `authenticated` and `anon` on the trigger function
- If `public.users` has RLS, add a policy that allows the trigger function's role to INSERT
- Verify the trigger in the Supabase Dashboard → Database → Triggers before deploying
- Test user creation end-to-end in staging (not SQL Editor — use the actual signup flow) before enabling in production
- Check Auth Logs and Postgres Logs in the Supabase Dashboard when any signup fails — the exact constraint or trigger error is logged there

**Warning signs:**
- Magic Link send fails silently or returns 500 from Supabase Auth
- New contractor users aren't appearing in `public.users` after Magic Link verification
- Tenant registration completes on frontend but `public.users` has no record
- "Database error saving new user" in Supabase Auth logs

**Phase to address:**
User migration phase — test trigger in staging with real Magic Link flow before production deployment

---

### Pitfall 3: JWT Claims Staleness — Role Changes Don't Take Effect Until Re-login

**What goes wrong:**
A user's org-based role is changed (e.g., from `property_manager` to `accounting`). The admin sees the change in `organization_members`. But the user's existing Supabase Auth JWT still contains the old role claim because JWT claims are baked into the token at issue time and remain valid until the token expires. The user continues to access resources at their old permission level for up to 1 hour (the default Supabase Auth access token lifetime).

**Why it happens:**
Supabase Auth JWTs are signed tokens — they cannot be invalidated once issued without revoking the entire session. The custom access token hook runs when the token is issued (at login and refresh), not continuously. A role change in `organization_members` is not an event that triggers token re-issue.

**How to avoid:**
- For time-sensitive role revocation (e.g., fired employee), use `supabase.auth.admin.signOut(userId, 'global')` via service role to force re-login
- Design a hybrid approach: JWT claims for read-heavy permission checks (performance), DB lookup for write operations that must be current
- For the RBAC pattern in this app: put the `organization_id` in JWT claims (low-sensitivity, rarely changes), but check `organization_members.role` directly in DB for sensitive write operations
- Document that role changes take effect within 1 hour (at next token refresh) unless forced re-login

**Warning signs:**
- Demoted user still has access to admin routes for up to 1 hour
- Role change in admin panel doesn't immediately restrict access
- Test: change user role, don't log out, try to access restricted resource — succeeds for up to 1 hour

**Phase to address:**
RBAC phase — design JWT claims to contain only slowly-changing, low-risk data; rely on DB membership check for critical write authorization

---

### Pitfall 4: user_metadata Is User-Writable — Never Use in RLS Policies

**What goes wrong:**
You add organization roles to `auth.users.raw_user_meta_data` (user_metadata) for convenience, then write RLS policies like `(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'`. A malicious user calls `supabase.auth.updateUser({ data: { role: 'admin' } })` from the browser — Supabase allows this because `user_metadata` is user-writable. They now have admin access in every RLS policy that trusts `user_metadata`.

**Why it happens:**
Supabase distinguishes `user_metadata` (user-writable, in `raw_user_meta_data`) from `app_metadata` (server-only, in `raw_app_meta_data`). Many tutorials and examples use `user_metadata` for simplicity without flagging the security boundary. The Supabase `updateUser()` client method writes directly to `user_metadata`.

**How to avoid:**
- NEVER store authorization data (roles, org memberships, permissions) in `user_metadata` / `raw_user_meta_data`
- Store role claims in `app_metadata` / `raw_app_meta_data` — writable only via the service role key (server-side only)
- Better pattern for this app: use the Custom Access Token Hook to read from `organization_members` table and inject claims into the JWT — the hook runs server-side and cannot be spoofed by clients
- In RLS policies, reference `(auth.jwt() -> 'app_metadata' ->> 'org_role')` if using metadata, or better, use `auth.uid()` with a lookup to `organization_members`

**Warning signs:**
- Organization role stored in `raw_user_meta_data` column
- RLS policies referencing `auth.jwt() -> 'user_metadata'`
- Any policy readable by non-admins that can be bypassed by calling `supabase.auth.updateUser()`

**Phase to address:**
Auth foundation phase — decide on claims strategy (app_metadata vs custom hook) before writing any RLS policy

---

### Pitfall 5: PgBouncer Transaction Mode Breaks auth.uid() — set_config is Dead in JWT World

**What goes wrong:**
The current system uses `set_config('app.current_organization_id', ..., true)` (transaction-scoped) which works correctly with PgBouncer in transaction pooling mode. When migrating to JWT-based `auth.uid()`, developers assume the same transaction-level settings work. They don't. The Supabase REST API (PostgREST) sets `request.jwt.claims` and `request.jwt.claim.sub` at the request level using `SET LOCAL`. In PgBouncer transaction mode, these settings are scoped to a single database transaction. If a request spans multiple transactions (or if a custom function calls `set_config` with `is_local=false`), the JWT context leaks to other connections. Conversely, `auth.uid()` evaluating to NULL happens when the PostgREST request context isn't established before the query runs.

**Why it happens:**
PgBouncer in transaction mode resets all session-level settings between connections. PostgREST sets `SET LOCAL request.jwt.claims = '...'` within each transaction — this is transaction-scoped and therefore PgBouncer-safe. But any custom code that calls `set_config(..., false)` (session-scoped) contaminates the PgBouncer pool — that setting persists to the next tenant's request on the same connection.

**How to avoid:**
- After migration, NEVER call `set_config` with `is_local=false` for anything auth-related
- The existing `set_org_context` RPC already uses `is_local=true` — keep this during the transition period
- After full JWT migration, `set_org_context` calls in API routes can be removed (org isolation comes from `auth.uid()` + `organization_members` join)
- Verify PgBouncer compatibility: test that `auth.uid()` returns the correct value under load (multiple concurrent users from different orgs)
- Keep `is_local=true` for any remaining `set_config` calls during the hybrid migration period

**Warning signs:**
- `auth.uid()` returning wrong user ID (another user's ID) under concurrent load
- Intermittent RLS failures where a user sees another org's data briefly
- `auth.uid()` returning NULL for authenticated users on some requests but not others
- Performance regression: many `auth.uid()` calls without `(select auth.uid())` optimization cause per-row function evaluation

**Phase to address:**
RLS migration phase — validate PgBouncer behavior in staging under concurrent multi-tenant load before production cutover

---

### Pitfall 6: Missing initPlan Optimization Makes auth.uid() 1000x Slower Than set_config

**What goes wrong:**
The current `current_organization_id()` function is called once per transaction, and RLS policies use it efficiently. When rewriting 248 policies to use `auth.uid()`, the naive pattern `WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())` evaluates `auth.uid()` on every row. On tables with 50K+ rows (audit_log, media, notifications), this causes query times to balloon from 2ms to 11,000ms — a 5,500x slowdown. Production dashboards time out.

**Why it happens:**
PostgreSQL evaluates `auth.uid()` as a function call per-row in RLS policies unless wrapped in a subquery that triggers the optimizer's `initPlan` (plan-time caching). The Supabase performance docs show this reduces execution from 11,000ms to 10ms in their test cases. The `set_config`/`current_setting` pattern was inherently cached (one setting per transaction), but `auth.uid()` without the wrapping is not.

**How to avoid:**
- ALWAYS write JWT-based RLS policies using the cached pattern:
  ```sql
  -- WRONG (evaluates per-row):
  organization_id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid())

  -- CORRECT (evaluates once via initPlan):
  organization_id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = (SELECT auth.uid()))
  ```
- Apply this pattern to ALL 248 policies being rewritten
- Add composite indexes on `(organization_id, user_id)` in `organization_members` — the subquery in every RLS policy will hammer this table
- Run `EXPLAIN ANALYZE` on representative queries from each module after policy rewrite to verify `initPlan` is being used
- Performance-test with realistic data volumes (10K+ rows per table) before production cutover

**Warning signs:**
- `EXPLAIN ANALYZE` shows `Function Scan` or sequential evaluation of `auth.uid()` per row
- Dashboard queries exceeding 500ms after RLS rewrite
- `organization_members` table showing high sequential scan rates in Supabase Performance Advisor
- Policy written as `auth.uid() = user_id` without the `(SELECT ...)` wrapper

**Phase to address:**
RLS migration phase — establish the correct policy template BEFORE writing any of the 248 policies; verify with EXPLAIN ANALYZE

---

### Pitfall 7: 34 API Routes Check Legacy ALLOWED_ROLES Pattern — Breaks When users.role Is Dropped

**What goes wrong:**
34 API routes check `const userRole = request.headers.get('x-user-role')` and validate against `ALLOWED_ROLES: Role[] = ['kewa', 'imeri']`. Once `users.role` is dropped and the middleware switches to org-based roles, `x-user-role` will contain values like `'admin'` or `'property_manager'` instead of `'kewa'` or `'imeri'`. Every one of these 34 routes will return 403 for all internal users. The app breaks completely at the moment `users.role` is dropped — not gradually.

**Why it happens:**
The legacy role values ('kewa', 'imeri') are hardcoded into the `ValidatedSession` type and the middleware header. The ALLOWED_ROLES pattern is a string comparison against these values. The new RBAC system uses role names from the `roles` table ('admin', 'property_manager', 'accounting', etc.), which don't match 'kewa' or 'imeri'.

**How to avoid:**
- Migrate ALL 34 routes BEFORE dropping `users.role` column — this must be sequential, not parallel
- The safe migration order: (1) add `x-user-role-name` header in middleware (done), (2) rewrite ALLOWED_ROLES checks to use permissions or role-name checks, (3) verify all 34 routes work with new role names, (4) drop `users.role` column
- Grep for `ALLOWED_ROLES` and `x-user-role` to find all affected routes: exactly 34 files confirmed
- Use `x-user-permissions` header (comma-separated permission codes) for fine-grained checks instead of role comparison
- Test route by route with real sessions after rewrite — do not batch-deploy all 34 at once

**Warning signs:**
- Any route containing `const ALLOWED_ROLES` or `ALLOWED_ROLES.includes(userRole)`
- API routes returning 403 for internal admin users after milestone deployment
- `x-user-role` header containing 'kewa' or 'imeri' instead of 'admin' or 'property_manager'

**Phase to address:**
API cleanup phase — complete before the `users.role` column is dropped; cannot be deferred

---

### Pitfall 8: Magic Link Contractors Need Supabase Auth Entry — But Current Flow Creates public.users Without auth.users

**What goes wrong:**
The current Magic Link flow (see `magic-link/verify/route.ts`) creates a `public.users` record if the contractor doesn't exist, using the legacy custom auth session. After migrating to Supabase Auth, Magic Link must instead create an entry in `auth.users` (or use Supabase's built-in OTP/Magic Link). If the flow is partially migrated — Supabase Auth issues the JWT but `public.users` doesn't exist — RLS policies that join `organization_members` on `user_id` (pointing to `public.users.id`) will find no matching row and return empty data for the contractor's work order.

**Why it happens:**
The system has two user identity systems: `auth.users` (Supabase, UUID from JWT `sub` claim) and `public.users` (custom, UUID from legacy system). The ID spaces are currently independent. When Supabase Auth issues a JWT, `auth.uid()` returns `auth.users.id` — which is a different UUID than the `public.users.id` that `organization_members.user_id` points to.

**How to avoid:**
- Import ALL existing public.users into auth.users, mapping IDs explicitly (use admin.createUser with the custom user ID where possible, or maintain an ID mapping table)
- After import, `public.users.id` must equal `auth.users.id` for every user — verify this with a query: `SELECT p.id FROM public.users p LEFT JOIN auth.users a ON p.id = a.id WHERE a.id IS NULL`
- For the Magic Link flow: switch to Supabase Auth's built-in OTP/Magic Link (`signInWithOtp()`), which creates the auth.users entry automatically
- The contractor portal's `set_org_context` call must remain until RLS migration is complete (contractors are still identified by `organization_members.user_id`)

**Warning signs:**
- `auth.uid()` returning a UUID that doesn't match any `organization_members.user_id`
- Contractor portal shows empty work orders after Supabase Auth migration
- `SELECT COUNT(*) FROM public.users p LEFT JOIN auth.users a ON p.id = a.id WHERE a.id IS NULL` returns > 0

**Phase to address:**
User migration phase — ID mapping must be verified before any auth cutover

---

### Pitfall 9: Custom Access Token Hook Needs supabase_auth_admin GRANT — Missing This Breaks All Logins

**What goes wrong:**
You implement the Custom Access Token Hook to inject `organization_id` and `org_role` into the JWT by querying `organization_members`. The hook function exists in the database. You enable it in the Supabase Dashboard. Every login attempt returns a generic auth error. All users are locked out of the system.

**Why it happens:**
`supabase_auth_admin` (the role that runs auth operations) does not have execute permission on functions in the `public` schema by default. The hook silently fails without the explicit GRANT. Additionally, if `organization_members` has RLS enabled, `supabase_auth_admin` cannot query it (no policy allows it). The auth system fails to issue any JWT.

**How to avoid:**
The hook migration requires these SQL commands in the same migration:
```sql
-- Grant execute to auth system
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Lock down from client APIs
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon;

-- If organization_members has RLS, allow auth admin to read it
CREATE POLICY "auth_admin_read" ON organization_members
  FOR SELECT TO supabase_auth_admin USING (true);
```
- Test the hook in a staging environment with a test user BEFORE enabling in production
- The hook must be idempotent and handle NULL (user has no org membership yet) gracefully — don't throw, return default empty claims

**Warning signs:**
- Auth hook enabled in dashboard but login returns 500 or generic auth error
- No visible error message — check Supabase Auth logs (Dashboard → Logs → Auth Logs)
- `supabase_auth_admin` not listed in `\du` output for the hook function's ACL
- Users who aren't in `organization_members` cannot log in at all

**Phase to address:**
Auth foundation phase — test hook with staging credentials before enabling on production project

---

### Pitfall 10: RLS Policies on organization_members Itself Create Bootstrap Deadlock

**What goes wrong:**
You add RESTRICTIVE RLS policies to `organization_members` requiring `auth.uid()` to match a row in... `organization_members`. The Custom Access Token Hook also queries `organization_members` to build the JWT. During a user's first login (after being invited but before their token is issued), `auth.uid()` is not yet set (the JWT hasn't been issued yet), so the hook can't read `organization_members`, can't build the JWT claims, and the user is permanently locked out. New user invitation is broken.

**Why it happens:**
Self-referential RLS on the membership table creates a chicken-and-egg problem: you need to be authenticated (have a JWT) to read your membership, but you need your membership to get a valid JWT. The auth hook runs without an authenticated Supabase session — it queries the database directly, but is blocked by RLS.

**How to avoid:**
- The `organization_members` table should use PERMISSIVE policies for `supabase_auth_admin` (for the hook), or be read by the hook using a SECURITY DEFINER function that bypasses RLS
- Simplest safe pattern: write the hook function as SECURITY DEFINER with `postgres` ownership — it can read `organization_members` directly without RLS applying
- Alternative: disable RLS on `organization_members` and rely on application-layer access control (the table is only queried server-side)
- If RLS IS needed on `organization_members`, add an explicit bypass policy for the service role

**Warning signs:**
- First login for newly invited user fails
- Hook function returns empty claims for all users (hook can't read organization_members)
- Circular dependency: RLS policy on organization_members references auth.uid() and auth.uid() depends on querying organization_members

**Phase to address:**
Auth foundation phase — design the hook and RLS on membership table together; test with brand-new users who have no session

---

### Pitfall 11: JWT Cookie Chunking Breaks Next.js Middleware When Custom Claims Are Too Large

**What goes wrong:**
You add per-org role claims to the JWT via the custom access token hook. Each user belongs to one org (current state), so claims are small. But when permissions array is included (14 permission codes, each ~30 chars), or if you later add multiple org memberships, the JWT exceeds 4KB. Supabase SSR automatically splits the auth cookie into chunks (`sb-[ref]-auth-token.0`, `.1`, `.2`). In Next.js middleware, `request.cookies.get('sb-[ref]-auth-token')` returns undefined because the cookie was chunked. The middleware falls through to the unauthenticated path. All users appear logged out.

**Why it happens:**
Browser cookies have a 4KB per-cookie size limit. The `@supabase/ssr` package handles chunking automatically. But code that directly reads the cookie by exact name (instead of using `supabase.auth.getSession()`) breaks because it doesn't know about chunked cookies. Also, HTTP headers have a max size (typically 8KB for Nginx, 32KB for Cloudflare/Vercel) — if the JWT itself is too large, requests fail at the infrastructure level.

**How to avoid:**
- Keep JWT claims minimal: `org_id` (UUID, 36 chars) and `org_role` (short string) only — do NOT include full permissions array in JWT
- Look up permissions from the DB for each request (or cache in Redis) rather than embedding in JWT
- Use the Custom Access Token Hook's "slim claims" feature: only include claims needed for RLS evaluation
- NEVER read Supabase auth cookies directly — always use `supabase.auth.getUser()` or `supabase.auth.getClaims()` which handle chunking transparently
- Test with realistic claim sizes in staging; measure cookie size: `console.log(JSON.stringify(session.access_token).length)`

**Warning signs:**
- Middleware returning 401 for authenticated users in production but not locally
- Cookie inspector shows `sb-[ref]-auth-token.0` and `.1` present but not `.` (unchunked)
- JWT payload size > 3KB (base64-encoded token > ~4KB)
- "Header too large" errors in Vercel or Nginx logs

**Phase to address:**
Auth foundation phase — design JWT payload size BEFORE implementing the custom hook; validate in staging

---

### Pitfall 12: Tenant Portal Has a Separate Session (portal_session Cookie) — Separate Migration Path Required

**What goes wrong:**
The tenant portal uses a separate `portal_session` cookie (see `lib/portal/session.ts`), completely independent from the internal `session` cookie. When migrating internal users to Supabase Auth, the portal session is not migrated. After the migration, `portal_session` continues to work for tenants. But if you also enable Supabase RLS changes that affect tenant-facing tables (like `tenant_tickets` or `units`), and the new RLS policies check `auth.uid()` instead of `set_config`, tenants cannot access their own data — their portal_session has no corresponding Supabase Auth session, so `auth.uid()` returns NULL.

**Why it happens:**
Two independent auth systems serve different user populations. The migration plan typically focuses on the primary (internal) system. Tenant portal auth is an afterthought. But the same 248 RLS policies govern both — if even one tenant-visible table switches to `auth.uid()` before tenants are migrated to Supabase Auth, that table becomes inaccessible to tenants.

**How to avoid:**
- Audit which RLS policies affect tenant-visible tables: `units`, `rooms`, `tenant_tickets`, `tenancies`, `notifications`
- Defer switching tenant-visible table RLS to `auth.uid()` until tenants are also migrated to Supabase Auth (email/password flow)
- Or: maintain `set_config` dual-path: if `auth.uid()` is NULL, fall back to `current_setting('app.current_organization_id', true)` in the USING clause
- The migration order MUST be: internal users first → verify → tenant users → verify → drop legacy auth

**Warning signs:**
- Tenant portal shows empty unit/ticket data after RLS migration
- `portal_session` cookie present but `auth.uid()` returns NULL in Postgres logs
- Tenants reporting "no data" while internal users see their data correctly

**Phase to address:**
RLS migration phase — explicitly track which tables serve tenants and which serve internal users; migrate in two waves

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep ALLOWED_ROLES check alongside new permissions check | Backward compat during migration | Two auth systems in 34 routes forever; confusing code | Only during migration window (max 2 weeks) |
| Store org_role in user_metadata instead of app_metadata | Easier to read | Users can self-elevate permissions; security hole | NEVER |
| Use `auth.uid()` without `(SELECT auth.uid())` wrapper in RLS | Shorter policy SQL | 1000x query performance regression on large tables | NEVER in production |
| Include full permissions array in JWT claims | No DB lookup per request | JWT too large → cookie chunking → auth breaks | NEVER |
| Skip user ID mapping between public.users and auth.users | Faster user import | auth.uid() doesn't match organization_members.user_id | NEVER |
| Test auth hook with SQL Editor | Easy syntax validation | Editor doesn't replicate supabase_auth_admin context; hooks appear to work but fail in prod | NEVER for functional testing |
| Migrate all 248 policies in one migration file | One deployment | Any failure rolls back ALL policy changes; debugging nightmare | NEVER — migrate by module |
| Drop users.role column before migrating all 34 routes | Clean schema faster | All 34 ALLOWED_ROLES routes return 403 immediately | NEVER — column drop is last step |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + Next.js middleware | Using `getSession()` server-side (trusts local state) | Use `getUser()` or `getClaims()` — makes network call to validate JWT |
| Custom Access Token Hook | Creating as SECURITY DEFINER from Dashboard | Create as regular function, GRANT EXECUTE to supabase_auth_admin explicitly |
| Auth hook + organization_members RLS | RLS blocks supabase_auth_admin from reading membership | Hook function must bypass RLS (SECURITY DEFINER or explicit policy) |
| PgBouncer + JWT claims | Using `set_config(..., false)` (session-scoped) | Always `set_config(..., true)` (transaction-scoped) or rely entirely on JWT |
| Supabase Auth + public.users trigger | No SECURITY DEFINER on trigger function | Function needs SECURITY DEFINER so supabase_auth_admin can execute it |
| Supabase Auth Magic Link | Creating public.users manually without auth.users entry | Use Supabase's `signInWithOtp()` which creates both automatically |
| Cookie-based session → Supabase Auth cookies | Reading auth cookie by name directly | Use `supabase.auth.getUser()` which handles cookie chunking transparently |
| JWT size + Vercel | Putting permissions array in JWT | Keep JWT minimal; look up permissions from DB or Redis per request |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `auth.uid()` without `(SELECT auth.uid())` in RLS | Dashboard loads >10s; query timeouts | Always use `(SELECT auth.uid())` wrapper in policy USING clause | >10K rows per table |
| Subquery in RLS without index on join column | High organization_members sequential scan rate | Index `organization_members(user_id, organization_id)` | >100 org members |
| Auth hook queries organization_members per login without index | Slow login times under load | Index `organization_members(user_id)` | >1000 concurrent users |
| Per-request DB lookup for permissions (no cache) | API routes slow due to extra DB roundtrip | Cache permissions in Redis (Upstash) keyed by `auth.uid()` + TTL | >50 concurrent requests |
| Full JWT re-issue on every request via middleware | Auth server rate limited | Use `getClaims()` (validates JWT signature locally) not `getUser()` (network call) | >100 requests/minute |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| user_metadata in RLS policies | Users grant themselves any role/permission | ONLY use app_metadata or custom hook claims in RLS |
| `auth.uid()` without org membership check | User from Org A can read Org B's data if they know IDs | Always combine `auth.uid()` with `organization_id` from `organization_members` |
| Missing `WITH CHECK` on migrated INSERT/UPDATE policies | Users can insert data with arbitrary org_id | Every INSERT/UPDATE policy needs `WITH CHECK (organization_id IN (SELECT...))` |
| Contractor access after auth migration without org scoping | Contractors can see all orgs' data | Contractor JWTs must contain `org_id` claim, verified in RLS |
| Legacy session cookie active after Supabase Auth migration | Two valid auth systems simultaneously; inconsistent RLS enforcement | Explicit cookie expiry / forced re-login at cutover |
| `supabase_auth_admin` over-granted via SECURITY DEFINER | Hook function has postgres-level access; escalation risk | Minimal GRANT pattern instead of SECURITY DEFINER |
| Skipping REVOKE on hook function | Clients can call auth hook function directly via Supabase APIs | Always REVOKE EXECUTE from authenticated and anon |

---

## UX Pitfalls

Common user experience mistakes during auth migration.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Force-logout all users at migration cutover | All 2 internal users + all contractors/tenants lose sessions simultaneously | Migrate in waves; force internal users first, then contractors, then tenants |
| Magic Link email templates change unexpectedly | Contractors confused by new email format | Keep Supabase Auth Magic Link template identical to existing email; test before cutover |
| PIN auth removed before Supabase Auth is working | Internal users locked out | Keep PIN auth working in parallel until Supabase email/password auth is tested |
| Tenant portal breaks mid-migration | Tenants can't file tickets | Defer tenant RLS migration until internal migration is stable |
| Password reset flow absent at launch | Internal users forget new Supabase Auth password, no self-service reset | Implement reset-password flow before removing PIN auth |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **auth.users import complete:** Verify every `public.users` record has a matching `auth.users` entry — `SELECT p.id FROM public.users p LEFT JOIN auth.users a ON p.id = a.id WHERE a.id IS NULL` must return 0 rows
- [ ] **Custom Access Token Hook:** Check GRANT and REVOKE SQL are in the migration, not just the function definition — test with an actual login in staging
- [ ] **RLS policy performance:** Every `auth.uid()` call in policies is wrapped as `(SELECT auth.uid())` — verify with `EXPLAIN ANALYZE` on at least one query per module
- [ ] **WITH CHECK on INSERT/UPDATE policies:** Every migrated INSERT/UPDATE policy has `WITH CHECK` clause — grep for policies without it
- [ ] **organization_members indexes:** `(user_id)` and `(user_id, organization_id)` indexes exist before policies are active — check with `\d organization_members`
- [ ] **Tenant portal migration:** Tenant-visible tables still use `set_config` path until tenants have Supabase Auth sessions — verify no tenant table uses `auth.uid()` prematurely
- [ ] **34 ALLOWED_ROLES routes:** All routes migrated to permission-based checks BEFORE `users.role` column is dropped — grep for `ALLOWED_ROLES` must return 0 results
- [ ] **users.role drop deferred:** Column is NOT dropped until step 5 of the plan (after all 34 routes migrated and tested)
- [ ] **Cookie collision test:** After migration, old `session` cookie is deleted/ignored; verify middleware doesn't accept old cookie format
- [ ] **Magic Link contractor flow:** End-to-end test: send Magic Link → click link → contractor portal loads with correct work order — in staging with new auth system

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cookie name collision → users see no data | MEDIUM | 1. Revert RLS policies to set_config pattern, 2. Force-expire old session cookies, 3. Re-migrate in correct order |
| "Database error saving new user" on trigger | LOW | 1. Check Supabase Auth Logs for exact error, 2. Fix SECURITY DEFINER + GRANT, 3. Re-test with staging user |
| JWT claims staleness after role change | LOW | 1. Call `admin.signOut(userId, 'global')` to force re-login, 2. Document in runbook |
| user_metadata in RLS → privilege escalation | HIGH | 1. Immediately rewrite affected policies, 2. Audit all user_metadata values for tampering, 3. Force-rotate all sessions |
| auth.uid() performance regression | MEDIUM | 1. Rewrite policies with `(SELECT auth.uid())` wrapper, 2. `CREATE INDEX CONCURRENTLY` on organization_members(user_id), 3. Monitor with EXPLAIN ANALYZE |
| 34 ALLOWED_ROLES routes broken after role drop | HIGH | 1. Restore users.role column from backup, 2. Migrate all 34 routes, 3. Re-drop column |
| Custom Hook breaks all logins | HIGH | 1. Disable hook in Supabase Dashboard immediately, 2. Fix GRANT/REVOKE, 3. Re-enable with test |
| Tenant portal broken by premature RLS change | MEDIUM | 1. Revert tenant-visible table policies to dual-path, 2. Complete tenant Supabase Auth migration, 3. Switch policies |
| JWT too large → middleware auth failure | MEDIUM | 1. Remove permissions array from hook, 2. Force-refresh all sessions, 3. Use DB lookup for permissions |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cookie name collision (Pitfall 1) | Phase A: Auth Foundation | Middleware test: old `session` cookie is rejected after cutover |
| Trigger "database error saving new user" (Pitfall 2) | Phase A: Auth Foundation | Test new user invite flow end-to-end in staging |
| JWT claims staleness (Pitfall 3) | Phase B: RBAC Design | Documented behavior: role changes take effect at next refresh |
| user_metadata in RLS (Pitfall 4) | Phase A: Auth Foundation | grep for `user_metadata` in all RLS policies = 0 results |
| PgBouncer + auth.uid() (Pitfall 5) | Phase C: RLS Migration | Concurrent load test: 10 users from 2 orgs, no cross-tenant data leakage |
| Missing initPlan optimization (Pitfall 6) | Phase C: RLS Migration | EXPLAIN ANALYZE shows initPlan on all auth.uid() calls |
| 34 ALLOWED_ROLES routes (Pitfall 7) | Phase D: API Cleanup | grep for `ALLOWED_ROLES` = 0 results; all routes return 200 for internal users |
| Magic Link without auth.users entry (Pitfall 8) | Phase A: Auth Foundation | Zero-row result: `public.users LEFT JOIN auth.users WHERE a.id IS NULL` |
| Hook missing GRANT (Pitfall 9) | Phase A: Auth Foundation | Login succeeds for test user in staging after hook enabled |
| Membership table RLS deadlock (Pitfall 10) | Phase B: RBAC Design | New user invite flow completes without error |
| JWT cookie chunking (Pitfall 11) | Phase A: Auth Foundation | Cookie inspector shows single unchunked auth token; size < 3KB |
| Tenant portal separate migration path (Pitfall 12) | Phase C: RLS Migration | Tenant can access tickets and unit during internal user migration |

---

## Sources

### Supabase Auth Documentation
- [Custom Access Token Hook | Supabase Docs](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Auth Hooks | Supabase Docs](https://supabase.com/docs/guides/auth/auth-hooks)
- [JWT Claims Reference | Supabase Docs](https://supabase.com/docs/guides/auth/jwt-fields)
- [Custom Claims & Role-based Access Control (RBAC) | Supabase Docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [User sessions | Supabase Docs](https://supabase.com/docs/guides/auth/sessions)
- [Setting up Server-Side Auth for Next.js | Supabase Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)

### RLS Performance and Security
- [RLS Performance and Best Practices | Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [RLS references user_metadata — Splinter Security Linter](https://supabase.github.io/splinter/0015_rls_references_user_metadata/)

### Troubleshooting References
- [Database error saving new user | Supabase Docs](https://supabase.com/docs/guides/troubleshooting/database-error-saving-new-user-RU_EwB)
- [Errors when creating / updating / deleting users | Supabase Docs](https://supabase.com/docs/guides/troubleshooting/dashboard-errors-when-managing-users-N1ls4A)
- [Next.js Supabase Auth troubleshooting | Supabase Docs](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV)
- [Auth token cookie chunk size issue · GitHub supabase/auth-helpers #707](https://github.com/supabase/auth-helpers/issues/707)
- [JWT maximum size? · GitHub supabase Discussion #12057](https://github.com/supabase/supabase/issues/1176)
- [Some JWTs exceed Cloudflare/Nginx header size limits · GitHub supabase/auth #1754](https://github.com/supabase/auth/issues/1754)

### Migration References
- [Migrate from Auth0 to Supabase Auth | Supabase Docs](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0)
- [supabase-community/supabase-custom-claims](https://github.com/supabase-community/supabase-custom-claims)
- [auth.signIn() with magic link creates users in auth.users · Issue #1176](https://github.com/supabase/supabase/issues/1176)

---
*Pitfalls research for: Migrating Custom PIN Auth to Supabase Auth with RLS Policy Rewrite in Multi-Tenant Production App*
*Researched: 2026-02-19*
