# Stack Research

**Domain:** Unified Auth & RBAC Migration (v5.0) — Supabase Auth + Custom Access Token Hook
**Researched:** 2026-02-19
**Confidence:** HIGH

## Current State (Pre-Migration)

| Layer | What Exists | Problem |
|-------|------------|---------|
| Internal auth (PIN) | Custom bcrypt PIN verify → `jose` SignJWT → httpOnly cookie `session` | Completely outside Supabase Auth — no `auth.uid()` in RLS |
| Internal auth (email+password) | Custom bcrypt password verify → `jose` SignJWT → httpOnly cookie `session` | Same: bypasses Supabase Auth entirely |
| Tenant auth (portal) | Custom email+password → `jose` SignJWT → httpOnly cookie `portal_session` | Duplicate session system; no Supabase session |
| Contractor auth | Custom DB token → URL path → magic-link table lookup | Intentionally outside Supabase Auth — must STAY custom |
| RLS | `set_config('app.organization_id', ...)` + `current_setting()` | Cannot use `auth.uid()` because there is no Supabase auth session |
| Middleware | Reads `session` cookie → `jwtVerify` (jose) → extracts userId, role | Must be replaced with Supabase session validation |

The entire session system must migrate from custom jose JWTs to Supabase Auth sessions. The contractor magic-link system is explicitly excluded and preserved as-is.

---

## Recommended Stack (Post-Migration)

### Core Technologies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/ssr | 0.8.0 (current — latest) | Server-side Supabase client for Next.js App Router | Industry standard; handles Supabase Auth cookie-based sessions, automatic token refresh via middleware, createServerClient/createBrowserClient pattern — already installed |
| @supabase/supabase-js | 2.97.0 (latest; 2.90.1 in package.json) | Client-side Supabase SDK + Auth methods | signInWithPassword(), signInWithOtp(), signOut() replace all custom auth handlers — already installed |
| Postgres Custom Access Token Hook | Built-in Postgres function (no npm) | Inject org_id, role_name, permissions into Supabase JWT | The only supported way to get custom claims into auth.uid()-based RLS — required to replace set_config pattern |
| auth.uid() + auth.jwt() | Built-in Postgres (Supabase) | RLS policy source of truth | After Supabase Auth migration, auth.uid() returns the authenticated user UUID; auth.jwt() exposes custom hook claims |

### What Gets Removed

| Package | Current Use | Can Remove? | Condition |
|---------|------------|-------------|-----------|
| `jose` ^6.1.3 | `SignJWT` in auth.ts (createSession), `jwtVerify` in session.ts + portal/session.ts | YES — after migration | jose is used exclusively for the custom JWT session system. Supabase Auth handles token signing internally. Contractor magic-link uses DB tokens (no JWT), not jose. Remove after all custom session code is deleted. |
| `bcryptjs` ^3.0.3 | PIN hash verify, password hash verify | YES — after migration | Supabase Auth handles password hashing natively (bcrypt internally). PIN auth is replaced by email/OTP. Remove after PIN/password columns are deprecated. |

### Packages That Stay Unchanged

| Package | Version | Reason Stays |
|---------|---------|--------------|
| @supabase/ssr | ^0.8.0 | Already correct version, already configured for App Router |
| @supabase/supabase-js | ^2.90.1 | 2.97.0 is latest but 2.90.1 is compatible; upgrade is low-risk |
| resend | ^6.9.1 | Used for Supabase Auth email delivery (Send Email hook or SMTP config) |
| @upstash/ratelimit + @upstash/redis | current | Rate limiting on auth routes stays |

### New ENV Variables Required

| Variable | Purpose | Where Set |
|----------|---------|----------|
| `SUPABASE_AUTH_HOOK_SECRET` | Verifies the Custom Access Token Hook call (if HTTP hook type) | .env.local + Supabase dashboard |

Note: If using **Postgres function** (recommended) for the Custom Access Token Hook, no new env variable is needed — the hook runs in-database. The `SESSION_SECRET` env variable is removed when jose is fully retired.

---

## Custom Access Token Hook — No npm Dependency

The Custom Access Token Hook is a **Postgres function** (not an Edge Function, not an npm package). It runs in the Postgres instance before every JWT is issued.

**Verified source:** https://supabase.com/docs/guides/auth/auth-hooks

**Function signature:**

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  v_org_id UUID;
  v_role_name TEXT;
  v_permissions TEXT[];
BEGIN
  -- Read custom data for the authenticating user
  SELECT
    om.organization_id,
    r.name,
    ARRAY(
      SELECT p.code FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = u.role_id
    )
  INTO v_org_id, v_role_name, v_permissions
  FROM users u
  LEFT JOIN organization_members om ON om.user_id = u.id AND om.is_default = true
  LEFT JOIN roles r ON r.id = u.role_id
  WHERE u.id = (event->>'user_id')::UUID;

  claims := event->'claims';

  -- Inject custom claims
  claims := jsonb_set(claims, '{organization_id}', to_jsonb(v_org_id));
  claims := jsonb_set(claims, '{role_name}', to_jsonb(v_role_name));
  claims := jsonb_set(claims, '{permissions}', to_jsonb(v_permissions));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant execute to supabase_auth_admin (required)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
-- Revoke from public (security)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
```

**Dashboard configuration:** Supabase Dashboard → Authentication → Hooks → Custom Access Token → Select Postgres Function → `public.custom_access_token_hook`

**Accessing claims in RLS after migration:**

```sql
-- auth.uid() — the user UUID (replaces set_config + current_setting)
-- auth.jwt() — full JWT payload including custom claims

-- Read organization_id from JWT (replaces set_org_context RPC)
CREATE POLICY org_isolation ON properties
  USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Read role_name from JWT (replaces manual permission checks)
CREATE POLICY internal_only ON audit_logs
  USING (auth.jwt() ->> 'role_name' IN ('admin', 'property_manager', 'accounting'));
```

---

## @supabase/ssr Patterns for Next.js App Router

**Version:** 0.8.0 is current (verified via npm registry 2026-02-19). No upgrade needed.

**Current client files are already correct.** `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` implement the exact patterns the docs recommend. What changes is the middleware and auth route handlers.

### Middleware Pattern (Post-Migration)

Replace the current custom-JWT middleware with Supabase session refresh:

```typescript
// src/middleware.ts — new Supabase Auth pattern
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // CRITICAL: Do not run Supabase auth logic between createServerClient
  // and getClaims() — session state may be lost
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Contractor routes: continue using custom magic-link validation (unchanged)
  // Portal routes: migrate to Supabase Auth OTP session

  return supabaseResponse
}
```

**Key constraint (verified):** `getUser()` makes a network call to Supabase Auth server to validate the session — it does not trust the cookie blindly. This replaces `jwtVerify` from jose. The middleware must return `supabaseResponse` (not a new `NextResponse.next()`) to preserve cookie mutations.

### Auth API Methods That Replace Custom Handlers

| Current Custom Handler | Supabase Auth Replacement |
|------------------------|--------------------------|
| `POST /api/auth/login` (PIN) | `supabase.auth.signInWithOtp({ email })` — email OTP replaces PIN concept |
| `POST /api/auth/login` (email+password) | `supabase.auth.signInWithPassword({ email, password })` |
| `POST /api/portal/auth/login` (tenant) | `supabase.auth.signInWithPassword({ email, password })` |
| `POST /api/auth/logout` | `supabase.auth.signOut()` |
| `POST /api/auth/magic-link/send` (contractor) | UNCHANGED — custom DB token system preserved |
| Session validation in middleware | `supabase.auth.getUser()` — replaces jwtVerify(jose) |
| Role/permission resolution | Custom Access Token Hook — runs at login time, embedded in JWT |

---

## Supabase Auth Configuration Changes

These changes are made in the **Supabase Dashboard** (no npm changes):

| Setting | Location | Change |
|---------|----------|--------|
| Email/Password auth | Auth → Providers → Email | Enable, configure "Confirm email" policy |
| Email OTP / Magic Link | Auth → Providers → Email | Enable OTP mode for internal user flow |
| Custom Access Token Hook | Auth → Hooks | Point to `public.custom_access_token_hook` Postgres function |
| JWT expiry | Auth → Configuration → JWT | Set to match current 7-day session (604800 seconds) |
| Email templates | Auth → Email Templates | Customize for German-language brand (KEWA/Imeri) |
| SMTP provider | Auth → Configuration → SMTP | Configure Resend (already in stack) as SMTP provider |

**Resend integration:** Supabase Auth can use Resend as the SMTP backend for OTP emails. The existing `resend` package stays. Auth emails (OTP, magic link, password reset) route through Supabase's Send Email hook or direct SMTP config.

---

## Contractor Magic-Link: Preserved As-Is

The contractor authentication system (`/contractor/[token]`, `src/lib/magic-link.ts`, `magic_link_tokens` table) is **explicitly excluded from this migration**. It does not use Supabase Auth and never will — contractors are external parties with no Supabase auth account. The `validateContractorAccess()` function and all related API routes remain unchanged.

This means `jose` removal must be staged: jose can only be removed after ALL Supabase Auth migration is complete and no jose references remain in the non-contractor code paths.

---

## Installation

**No new npm packages required.**

All necessary packages are already in package.json. The migration is:
1. Configuration changes in Supabase Dashboard
2. New Postgres function (Custom Access Token Hook) via migration file
3. Replacement of custom auth route handlers (no new packages needed)
4. Middleware rewrite (uses existing @supabase/ssr)

**Packages to remove after migration completes:**

```bash
# Remove after jose is no longer referenced anywhere
npm uninstall jose

# Remove after bcrypt PIN/password hashing is no longer needed
npm uninstall bcryptjs
npm uninstall -D @types/bcryptjs
```

**Optional upgrade (not required):**

```bash
# Upgrade supabase-js to latest (2.97.0) — no breaking changes
npm install @supabase/supabase-js@latest
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Postgres Custom Access Token Hook | HTTP Edge Function hook | Edge Functions add cold start latency on every token issuance. Postgres function runs in-process. Free tier supports both — Postgres is simpler. |
| auth.uid() in RLS | set_config/current_setting (current) | current_setting is not tied to actual auth session — any service-role call can spoof it. auth.uid() is cryptographically bound to the JWT. |
| signInWithOtp (email OTP) for internal users | Keep PIN system | PIN requires storing sensitive data in app DB and bcrypt on every login. Supabase Auth OTP is purpose-built, delegated, and eliminates the custom session layer. |
| Supabase Auth email+password for tenants | Keep custom portal session | Eliminates duplicate session cookie system (portal_session). Tenants get password reset, MFA upgrade path for free. |
| Preserve contractor magic-link as custom | Migrate to Supabase Auth | Contractors have no persistent Supabase Auth identity. Token-per-work-order model does not map to user accounts. Custom is correct here. |
| Resend via Supabase SMTP config | Resend via Send Email hook (Edge Function) | SMTP config is simpler; no Edge Function needed. If template customization beyond Supabase's email templates is needed, use Send Email hook later. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `jose` SignJWT for new sessions | Bypasses Supabase Auth; breaks auth.uid() in RLS | supabase.auth.signInWithPassword() / signInWithOtp() |
| `getSession()` in server middleware for auth checks | Returns unverified cached session — can be spoofed | `supabase.auth.getUser()` — makes server-side validation call |
| Service role key in client-side code | Bypasses ALL RLS policies | anon key on client; service role only in trusted server contexts |
| New PIN column usage | Being retired in v5.0 | Email OTP (supabase.auth.signInWithOtp) |
| Multiple `NextResponse.next()` calls in middleware | Drops Supabase cookie mutations, breaks session refresh | Return the single `supabaseResponse` object throughout |
| Running auth.uid() without Supabase Auth session | Returns null — all RLS policies block everything | Ensure Supabase Auth session exists before DB queries |

---

## Version Compatibility

| Package | Version in Use | Latest | Compatible With | Notes |
|---------|---------------|--------|-----------------|-------|
| @supabase/ssr | 0.8.0 | 0.8.0 | Next.js 16.1.6, React 19 | Current, no upgrade needed |
| @supabase/supabase-js | ^2.90.1 | 2.97.0 | Postgres 15+ | 2.90.x fully compatible; upgrade to 2.97.0 optional |
| jose | ^6.1.3 | 6.1.3 | Edge runtime | Remove post-migration |
| bcryptjs | ^3.0.3 | 3.0.3 | Node.js runtime | Remove post-migration — Edge-incompatible, this is why middleware uses jose currently |
| Postgres Custom Access Token Hook | n/a | n/a | Supabase Free/Pro | No npm dependency — pure SQL |

---

## Sources

**HIGH Confidence (Official Documentation):**
- https://supabase.com/docs/guides/auth/auth-hooks — Auth hooks overview, Postgres vs HTTP options, Custom Access Token Hook
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook — Exact function signature, required claims, grants
- https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac — auth.jwt() access in RLS, RBAC pattern with hook
- https://supabase.com/docs/guides/auth/server-side/nextjs — @supabase/ssr middleware pattern, getUser() vs getSession()
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword — signInWithPassword API
- npm registry: @supabase/ssr@0.8.0 (current), @supabase/supabase-js@2.97.0 (latest), jose@6.1.3 (latest) — verified 2026-02-19

**HIGH Confidence (Code Inspection):**
- `src/lib/auth.ts` — jose SignJWT usage confirmed (createSession function)
- `src/lib/session.ts` — jose jwtVerify usage confirmed (validateSession, validateSessionWithRBAC)
- `src/lib/portal/session.ts` — jose SignJWT + jwtVerify usage confirmed (createPortalSession, validatePortalSession)
- `src/middleware.ts` — custom session cookie validation; no Supabase Auth getUser() calls
- `src/app/api/auth/login/route.ts` — bcryptjs PIN/password verify confirmed
- `package.json` — jose ^6.1.3, bcryptjs ^3.0.3, @supabase/ssr ^0.8.0 confirmed

---
*Stack research for: v5.0 Unified Auth & RBAC — Supabase Auth migration*
*Researched: 2026-02-19*
*Confidence: HIGH — All jose/bcrypt usages traced in source. Supabase Auth hook patterns verified against official docs. Package versions verified via npm registry.*
