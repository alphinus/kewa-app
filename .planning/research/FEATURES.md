# Feature Research

**Domain:** Multi-tenant SaaS auth — Unified Supabase Auth, org-based RBAC, user management, invitation flows
**Researched:** 2026-02-19
**Confidence:** HIGH (Supabase official docs verified, existing codebase fully read, patterns confirmed from multiple sources)

---

## Context: What Already Exists (Do Not Re-Build)

This is a migration milestone onto a working system. The existing auth infrastructure must inform what counts as "table stakes" vs what is genuinely new work.

| Component | Status | v5.0 Action |
|-----------|--------|-------------|
| PIN login (KEWA, Imeri) | Working — bcrypt + custom JWT via jose, httpOnly cookie | Replace with Supabase Auth email/password |
| Custom JWT session (`session` cookie) | Working — `SESSION_COOKIE_NAME='session'`, 7-day expiry | Replace with Supabase `sb-*` SSR cookies |
| Magic-link for contractors | Working — custom `magic_link_tokens` table, status-aware expiry, revocation | Preserve as-is; do NOT migrate to Supabase Auth users |
| Email login for tenants | Working — bcrypt `password_hash` on `users` table | Migrate to Supabase Auth OTP (magic-link for tenants) |
| 5 roles (global `users.role`) | Working — admin, property_manager, accounting, hauswart, tenant | Drop; replace with `organization_members.role_id` per org |
| `organization_members` table | Schema exists — `user_id` → `organization_id` → `role_id`, not used for auth | Activate as source of truth for org-scoped roles |
| 248 RLS policies | Working — `set_config/current_setting` pattern | Rewrite to `auth.uid()` + JWT claims |
| OrganizationProvider + OrgSwitcher | Working — org context set via request header | Preserve UI; adapt to trigger JWT refresh on org switch |
| 34 API routes with `ALLOWED_ROLES` | Legacy debt — `role='kewa'` placeholder | Migrate to org-scoped membership check |
| `users.role` global column | Active | Drop after all consumers migrated |
| `visible_to_imeri` business logic | 4 routes | Remove entirely |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist for the auth system to work. Missing any of these breaks the product or creates a security gap that blocks SaaS launch with new customers.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email + password login for internal users | Standard credential auth; PIN was an MVP compromise for 2 users, not viable for a SaaS with N orgs | MEDIUM | Supabase `signInWithPassword()`. Supabase manages bcrypt. Replaces current `verifyPin()` + custom JWT flow. |
| Supabase Auth session (SSR cookies) replacing custom JWT | All auth must flow through Supabase Auth; RLS cannot use the custom `session` JWT | HIGH | Core infrastructure change. `@supabase/ssr` `createServerClient` + middleware. Current `SESSION_COOKIE_NAME='session'` replaced by Supabase `sb-*` cookies. Single biggest change. |
| Middleware route protection via `auth.getUser()` | Every protected route must validate Supabase session server-side | MEDIUM | Replace current `validateSession()` in middleware.ts with `supabase.auth.getUser()`. Per Supabase docs: never use `getSession()` server-side — it does not re-validate the token. `getUser()` hits Supabase Auth server on every call. |
| Custom access token hook: inject org_id + role into JWT | RLS policies need org context without a DB roundtrip per request; Supabase's documented RBAC pattern | HIGH | PostgreSQL function registered as Custom Access Token Hook in Supabase Dashboard. Reads `organization_members` for the authenticating user, injects `org_id` + `role` claims. Enables `auth.jwt()->>'org_id'` in RLS policies. |
| 248 RLS policies rewritten to `auth.uid()` + JWT claims | Current `set_config/current_setting` pattern is incompatible with Supabase Auth sessions; PgBouncer concern also resolved by moving to JWT | HIGH | All 248 policies must shift from `current_organization_id()` to `auth.uid()` and `(auth.jwt()->>'org_id')::uuid`. The existing `set_org_context()` RPC becomes unused. |
| Magic-link / OTP login for tenants | Tenants are mobile-first; password-based login creates support burden (forgot password flow); magic-link is standard for low-frequency users | LOW | Supabase `signInWithOtp({ email })`. Replaces current `bcrypt` email+password for tenants. Existing `email` field on `users` carries over. |
| Session expiry and logout | Users expect sessions to time out; logout must clear server-side state | LOW | Supabase `signOut()` + cookie clear in SSR. Supabase default JWT expiry is 1 hour (configurable). Refresh tokens handle persistence up to configured max. |
| User deactivation (ban from login) | Admins must be able to lock out a user instantly (employee leaves org, tenant vacates) | LOW | Supabase Admin API: `auth.admin.updateUserById(id, { ban_duration: 'none' })` to ban, `ban_duration: '0s'` to unban. Also soft-delete via `is_active=false` on the `users` row for RLS enforcement. |
| Auth state sync across browser tabs | Standard browser behavior — logout in one tab should propagate | LOW | Supabase client's `onAuthStateChange` handles this natively. Hook into `OrganizationProvider` to clear org context on `SIGNED_OUT` event. |
| 34 API routes migrated from `ALLOWED_ROLES` | Legacy `role='kewa'` placeholder breaks when `users.role` is dropped | MEDIUM | Replace `ALLOWED_ROLES` check with org-membership query: `organization_members` where `user_id = auth.uid()` and `organization_id = current org`. |
| `users.role` global column dropped | Completing the removal of the legacy global role model; required for multi-tenant correctness | LOW | Drop column after all 248 RLS policies, 34 API routes, and Supabase session migration are done. Run `ALTER TABLE users DROP COLUMN role;` as final cleanup migration. |
| `visible_to_imeri` logic removed | 4 routes contain pre-multi-tenant cross-org visibility logic that has no place in the org-isolated model | LOW | Remove the 4 conditional branches. Data is already org-isolated by RLS; the extra filter is redundant and confusing. |

### Differentiators (Competitive Advantage)

Features that lift this above a minimal auth migration. Specifically valuable for the property management SaaS context and for KEWA's ability to onboard new customer orgs.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Email invitation flow with pre-assigned role | Admin invites a new property manager by email; they click the link, set a password, and land in the right org with the right role — no manual setup | MEDIUM | Supabase `auth.admin.inviteUserByEmail(email, { data: { org_id, role } })`. On first sign-in, a DB trigger or post-login hook reads `user_metadata` and inserts the `organization_members` row. PKCE not supported for invites (different browser issue); use standard invite flow. |
| Pending invitation status in user list | Admins see who hasn't yet accepted their invite — prevents "did they get my email?" confusion | LOW | Supabase `auth.users` exposes `invited_at` and `confirmed_at`. Query: `invited_at IS NOT NULL AND confirmed_at IS NULL` → status "Pending". Build into the user management list view. |
| User management UI (per-org admin panel) | Admins manage their org's users entirely from within the app — no Supabase Dashboard access needed | MEDIUM | List members with status (Active/Pending/Inactive), invite button, role dropdown, deactivate/delete actions. Scoped strictly to current org. Standard SaaS pattern; absence is notable to any admin evaluating the product. |
| Role change without forced re-login | When admin changes a user's role, it takes effect at next JWT refresh (within 1 hour) without forcing the affected user to log out | MEDIUM | Custom access token hook re-reads `organization_members` on every token refresh. No stale role claims persist beyond the JWT TTL. For immediate enforcement: admin can also update `users.is_active=false` temporarily to force re-authentication. |
| Org switcher with JWT refresh on switch | Users managing multiple orgs can switch context without losing their session | MEDIUM | On org switch in `OrgSwitcher`: call `supabase.auth.refreshSession()` to trigger re-execution of the custom access token hook with the new `org_id` claim. Existing `OrgSwitcher` UI component preserved; adapt to call refresh. |
| Contractor access without Supabase Auth account | External contractors use the custom magic-link system and never need a Supabase Auth user — preserving the zero-friction contractor portal | LOW | After `validateContractorAccess()` passes on the custom token, use service role client (`createServiceClient()`) for all contractor data queries. Never call `supabase.auth.signIn*` for contractors. Avoids polluting `auth.users` with thousands of one-time partner contacts. |
| Audit log of auth events | Swiss compliance and dispute resolution: who logged in when, what role they had | LOW | Supabase already logs `last_sign_in_at`. Extend existing `audit_log` table with auth events: login, logout, invite sent, role changed, user deactivated. Use Supabase Auth hooks or post-login middleware. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-user permission overrides (beyond role) | "User X needs read-only costs but is otherwise a property_manager" | Creates a combinatorial explosion of permission states. 5 roles × N users × M resources = unmanageable audit surface. One wrong flag = security regression. Industry consensus: per-user overrides are where RBAC systems fail. | Stick to 5 defined roles. If a genuine gap exists, add a 6th role (`readonly_accounting` etc.). Never per-user permission overrides. |
| SSO / OAuth (Google, Microsoft Entra) for internal users | "KEWA uses Microsoft 365" | Massive added complexity: PKCE flows, provider token management, account linking when email changes, session lifecycle differences, provider-side admin dependency. Not needed to launch SaaS. Supabase SSO support requires Pro plan. | Email/password is sufficient for initial SaaS go-to-market. Defer SSO to v6+ when an enterprise customer specifically requires it as a contract condition. |
| User self-registration for internal roles | "Can a new employee sign themselves up?" | Property management firms control their staff roster tightly. Self-registration bypasses organizational control. Creates orphaned accounts with no org membership. | Invitation-only for all internal roles (admin, property_manager, accounting, hauswart). Tenants and contractors use separate self-service entry points. |
| Global super-admin role across all orgs (app-level) | "We need one account to manage all customer orgs" | Violates tenant isolation. A compromised super-admin account exposes all customer data. Undermines the RLS model. Also: Supabase Dashboard + service role key already provides ops access. | Use Supabase Dashboard for ops tasks. If an internal tooling admin panel is needed later, scope it separately with its own auth — not as an in-app role. |
| Granular resource-level permissions (sub-org filtering) | "This property_manager can only see Liegenschaft A, not B" | RLS operates at org level. Sub-org filtering is a UI/query-layer concern, not an auth concern. Adding it to RLS doubles policy complexity and adds mandatory joins to every query. | Implement building/property filters in UI and query layer using existing BuildingContext. Keep RLS at org level only. |
| MFA enforcement for all users | "Security requires TOTP for everyone" | Supabase MFA is in beta as of 2025. Mobile-first janitors on construction sites cannot reliably use TOTP apps. Mandatory MFA increases support burden and reduces adoption. | Offer MFA as opt-in for admin roles via Supabase's `enroll` API when Supabase MFA is stable. Not in v5.0 scope. |
| Migrating contractors to Supabase Auth accounts | "Unify all auth through Supabase" | Contractors have no ongoing relationship — they work one job, disappear. Creating `auth.users` rows for them is noise. The custom magic-link system is richer (revocation, status-aware expiry, re-issue on new work order) than what Supabase's OTP provides. | Keep contractor auth on the custom `magic_link_tokens` table. Use service role client for data access after token validation. Zero behavior change for contractors. |
| Simultaneous support of both old custom JWT and new Supabase session | "Gradual migration, keep both working" | The RLS layer cannot serve two auth mechanisms simultaneously without massive conditional complexity in every policy. Route-level dual-auth means every middleware branch doubles. | Hard cutover. Migrate all internal users to Supabase Auth first (one migration event), then switch the middleware, then rewrite RLS policies. PIN/custom JWT code can be deleted the same day. |

---

## Feature Dependencies

```
[Supabase Auth Sessions via @supabase/ssr]
    └──requires──> [Migrate middleware to auth.getUser()]
    └──requires──> [Replace custom 'session' cookie with Supabase sb-* cookies]
    └──requires──> [Create Supabase Auth accounts for existing internal users]
    └──enables──> [Custom Access Token Hook]
    └──enables──> [Email Invitation Flow]
    └──enables──> [User Management UI]

[Custom Access Token Hook]
    └──requires──> [organization_members populated with correct role_id per user/org]
    └──requires──> [Supabase Auth Sessions] (hook only fires during Supabase token issuance)
    └──enables──> [RLS via auth.uid() + JWT claims]
    └──enables──> [Org Switcher with JWT refresh]

[RLS via auth.uid() + JWT claims — 248 policies]
    └──requires──> [Custom Access Token Hook] (JWT must contain org_id claim first)
    └──requires──> [Supabase Auth Sessions] (auth.uid() is null without Supabase session)
    └──unblocks──> [Drop users.role column]
    └──unblocks──> [Remove ALLOWED_ROLES from 34 API routes]

[34 API Routes ALLOWED_ROLES Migration]
    └──requires──> [Supabase Auth Sessions] (need auth.uid() available in API routes)
    └──requires──> [organization_members populated]
    └──unblocks──> [Drop users.role column]

[Drop users.role column]
    └──requires──> [All 248 RLS policies migrated]
    └──requires──> [All 34 API routes migrated]
    └──requires──> [No code references to users.role]

[Email Invitation Flow]
    └──requires──> [Supabase Auth Sessions] (inviteUserByEmail uses Supabase Admin API)
    └──requires──> [User Management UI] (trigger for invite action)
    └──requires──> [on-signup hook or trigger] (to create organization_members row from invite metadata)

[User Management UI]
    └──requires──> [Supabase Auth Sessions]
    └──requires──> [organization_members populated]
    └──enhances──> [Email Invitation Flow]
    └──enhances──> [Pending Invite Status]

[Contractor Magic-Link — Preserved]
    ──no dependency──> [Supabase Auth Sessions] (bypasses Supabase Auth entirely)
    ──conflict with──> [Migrating contractors to Supabase Auth users] (anti-feature; avoid)

[visible_to_imeri Removal]
    └──requires──> [RLS via auth.uid() + JWT claims] (data isolation handled by RLS, making the filter redundant)
    ──no other dependencies──>
```

### Dependency Notes

- **Custom access token hook requires organization_members populated first.** The hook reads the membership table at JWT issuance. If a migrated user has no membership row, their token has no `org_id` claim and RLS returns empty sets across the app. Seeding membership rows must precede the hook activation.
- **248 RLS rewrites cannot start until the hook is live.** Rewriting a policy to use `auth.jwt()->>'org_id'` while the claim is absent results in broken access for all users. Sequence: hook live → validate claim appears in JWT → rewrite policies batch by batch.
- **Contractor magic-link has zero dependency on Supabase Auth.** The two systems are fully orthogonal. This is a design strength: contractors never touch `auth.users`, and the custom token table handles all their access control needs with richer semantics than Supabase's OTP provides.
- **Org switching requires explicit JWT refresh.** Supabase JWTs are issued with claims at sign-in time. When a user switches the active org in `OrgSwitcher`, the JWT still carries the previous org's claims until natural expiry (default: 1 hour). Call `supabase.auth.refreshSession()` immediately on org switch to re-trigger the custom access token hook with the new org context.
- **Migration of existing PIN users to Supabase Auth must happen before switching middleware.** Use `auth.admin.createUser()` to create Supabase Auth accounts for the existing 2 internal users, link their `auth.users.id` to the `users` table, insert their `organization_members` rows, then cut over. A migration script should do this atomically before deployment.

---

## MVP Definition

### Launch With — v5.0 Core (What this milestone must deliver)

These are the items that complete the migration. Without them, the system still runs on the legacy auth model.

- [ ] **Supabase Auth sessions for internal users (email/password)** — replaces PIN login; enables multi-org SaaS onboarding
- [ ] **Supabase SSR middleware** — replaces `validateSession()` in middleware.ts; `auth.getUser()` on every protected request
- [ ] **Custom access token hook** — injects `org_id` + `role` into JWT; the keystone for all subsequent RLS rewrites
- [ ] **248 RLS policies rewritten to `auth.uid()` + JWT claims** — the `set_config/current_setting` pattern is incompatible with Supabase Auth
- [ ] **34 API routes migrated from `ALLOWED_ROLES`** — drop `role='kewa'` placeholder, use `organization_members` membership check
- [ ] **Tenant login via Supabase OTP (magic-link)** — replaces `bcrypt` email+password for tenants; simpler for mobile-first
- [ ] **Contractor custom magic-link preserved** — no behavior change; validate custom token → service role client; contractors never get Supabase Auth accounts
- [ ] **`users.role` column dropped** — final confirmation that global role model is gone
- [ ] **`visible_to_imeri` logic removed** — 4 routes cleaned up

### Add After Validation — v5.x (Once core auth is stable)

Trigger: at least one new customer org has been onboarded end-to-end.

- [ ] **User Management UI (per-org admin panel)** — list members, invite, deactivate, change role; required before selling to new orgs
- [ ] **Email invitation flow** — `inviteUserByEmail()` with role metadata; on-signup hook creates `organization_members` row
- [ ] **Pending invite status tracking** — show Pending/Active/Inactive in user list; trivial once invitation flow exists
- [ ] **Auth event audit log** — login, logout, invite sent, role changed; trigger: first compliance question from a customer

### Future Consideration — v6+

Trigger: enterprise customer contract requires it, or explicit user research drives prioritization.

- [ ] **SSO / OAuth (Microsoft Entra, Google Workspace)** — Supabase Pro plan required; needed when enterprise customer insists; major complexity increase
- [ ] **MFA (opt-in for admin roles)** — when Supabase MFA is stable and not beta; useful for admin-role security hardening
- [ ] **Owner portal login** — `owners.user_id` FK already exists in schema; trigger: property owners request direct access

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Supabase Auth sessions + SSR middleware | HIGH | HIGH | P1 |
| Custom access token hook (JWT claims) | HIGH | MEDIUM | P1 |
| 248 RLS policy rewrite | HIGH | HIGH | P1 |
| Email/password login for internal users | HIGH | LOW | P1 |
| Tenant magic-link (Supabase OTP) | MEDIUM | LOW | P1 |
| Contractor custom magic-link preserved | HIGH | LOW | P1 |
| 34 API routes ALLOWED_ROLES migration | MEDIUM | MEDIUM | P1 |
| users.role column drop | MEDIUM | LOW | P1 |
| visible_to_imeri removal | LOW | LOW | P1 |
| User Management UI | HIGH | MEDIUM | P2 |
| Email invitation flow | HIGH | MEDIUM | P2 |
| Pending invite status | MEDIUM | LOW | P2 |
| Auth event audit log | MEDIUM | LOW | P2 |
| SSO / OAuth providers | MEDIUM | HIGH | P3 |
| MFA (opt-in) | LOW | MEDIUM | P3 |
| Owner portal login | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for v5.0 milestone completion
- P2: Should have in v5.x once core is validated
- P3: Future milestone; no commitment in v5.0

---

## Implementation Notes (v5.0 Specific)

### The PgBouncer Resolution

The current `set_config` approach was chosen in v4.0 specifically because PIN auth has no JWT claims, and `set_config` works with PgBouncer transaction pooling. With Supabase Auth, every request carries a JWT. The `auth.uid()` and `auth.jwt()` functions read from the JWT directly — no `set_config` needed, and no PgBouncer concern. This is the definitive resolution of the blockers noted in STATE.md.

### Hard Cutover vs Gradual Migration

Do not attempt to run both the legacy `session` cookie and Supabase `sb-*` cookies simultaneously. The RLS layer cannot serve both in one policy. Strategy: create Supabase Auth accounts for all existing users in one migration script, validate the hook and policies in staging, then do a single production deployment that cuts over both the middleware and the DB policies at once. Deploy after business hours on a low-traffic window.

### JWT Clock Skew and Org Switching

After org switch: the current JWT still carries the old `org_id` claim until natural expiry (1 hour by default). Mitigation in `OrgSwitcher`: call `await supabase.auth.refreshSession()` immediately after the user selects a new org. This forces re-execution of the custom access token hook, which reads the new active org from `organization_members` and issues a fresh JWT with updated claims.

### Contractor Access — No Change in Behavior

Contractors never see a login screen. Flow remains: receive email with magic-link URL → click → `validateContractorAccess()` validates custom token → server creates response using service role client scoped to the contractor's work orders. Do not change this flow. The only code change needed: ensure the service role client path is not accidentally routed through the new Supabase Auth middleware.

### PIN User Migration Path

Two existing internal users have `pin_hash` on their `users` row. Migration script:
1. `supabase.auth.admin.createUser({ email, password: temporaryPassword, email_confirm: true })`
2. Insert `organization_members` row with correct `role_id` for each user's org
3. Update `users.id` or add `auth_user_id` FK to link the rows
4. Send password-reset email so users set their own password
5. After both users confirm login via email/password, drop `pin_hash` column in the cleanup migration

---

## Sources

- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — HIGH confidence
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — HIGH confidence
- [Supabase JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) — HIGH confidence
- [Supabase inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) — HIGH confidence
- [Supabase SSR Next.js setup](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH confidence
- [Supabase Password-based Auth](https://supabase.com/docs/guides/auth/passwords) — HIGH confidence
- [Supabase Passwordless / OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) — HIGH confidence
- [WorkOS: Multi-tenant RBAC design](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas) — MEDIUM confidence
- [Auth0: Demystifying Multi-Tenancy in B2B SaaS](https://auth0.com/blog/demystifying-multi-tenancy-in-b2b-saas/) — MEDIUM confidence
- [Permit.io: Best practices for multi-tenant authorization](https://www.permit.io/blog/best-practices-for-multi-tenant-authorization) — MEDIUM confidence
- [WorkOS: Complete guide to user management for B2B SaaS](https://workos.com/blog/user-management-for-b2b-saas) — MEDIUM confidence
- [Existing codebase: src/lib/auth.ts, session.ts, permissions.ts, magic-link.ts] — HIGH confidence (read directly)
- [Existing schema: 022_rbac.sql, 023_users_auth.sql, 073_org_foundation.sql, 076_rls_helpers.sql] — HIGH confidence (read directly)

---
*Feature research for: v5.0 Unified Auth & RBAC — Multi-tenant Supabase Auth migration*
*Researched: 2026-02-19*
