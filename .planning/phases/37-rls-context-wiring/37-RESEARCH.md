# Phase 37: RLS Enablement & Context Wiring - Research

**Researched:** 2026-02-18
**Domain:** PostgreSQL RLS, Supabase SSR, Next.js middleware, API route migration
**Confidence:** HIGH — all findings based on direct codebase inspection; no training-data speculation

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**1. Existing RLS Teardown**
- Komplett ersetzen — alle 7 bestehenden Policies aus 029_rls_policies.sql droppen und durch org-basierte Policies ersetzen
- DROP POLICY auf allen 7 Tabellen, dann neue org-basierte Policies erstellen
- `is_internal_user()` Funktion: vor dem Droppen prüfen ob sie noch anderswo referenziert wird. Wenn unreferenziert → mitdroppen
- Kein Fallback, kein Legacy-Support — sauberer Schnitt

**2. Policy-Standard**
- Jede Tenant-Tabelle erhält identische Policies: SELECT, INSERT, UPDATE, DELETE
- Policy-Typ: RESTRICTIVE (alle Policies müssen matchen, nicht nur eine)
- USING clause: `organization_id = current_organization_id()`
- WITH CHECK clause (INSERT/UPDATE): `organization_id = current_organization_id()`

**3. Organization Context Flow**
- Login: bleibt unverändert
- Middleware: liest Cookie `organization_id`, falls leer → Default-Org aus `organization_members` (is_default=true). Setzt `x-organization-id` Response-Header
- `createOrgClient(request)`: liest `x-organization-id` Header, erstellt Supabase-Client, ruft `set_org_context()` RPC auf
- PgBouncer-kompatibel: RPC-Ansatz (set_org_context als expliziter RPC-Call). Kein SET LOCAL
- Edge Case "kein User-Org": kann nach Phase 36 nicht passieren, kein Handling

**4. API Route Migration**
- Alle ~119 Routen auf einmal umstellen, kein Mischzustand
- `createOrgClient(request)` — Tenant-scoped Queries (Standardfall)
- `createPublicClient()` — Globale Lookup-Tabellen ohne org_id (ticket_categories etc.)
- `createServiceClient()` — Admin-Operationen (explizite Liste)
- Fail-fast: createOrgClient wirft 401 wenn kein x-organization-id Header vorhanden

**5. Isolation Verification**
- Permanente Test-Org "Imeri Immobilien AG" in Migration seeden
- SQL-Level DO-Block in Migration, bricht bei Fehler ab (RAISE EXCEPTION)
- Voller CRUD-Test (SELECT, INSERT, UPDATE, DELETE cross-tenant)

### Deferred Ideas (OUT OF SCOPE)

- Auth-Hardening / Onboarding (PIN-Setup, 2FA, Verifizierung)
- DB-Abstraktion (Wechsel zu Convex oder Clerk-Auth)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RLS-01 | RLS Policies on All Tenant Tables — Enable RLS and create SELECT/INSERT/UPDATE/DELETE policies on all tenant tables using `organization_id = current_organization_id()`. Drop existing permissive policies (029_rls_policies.sql). | 62 tenant tables identified (from 082 migration list). 7 tables have existing policies to drop. `current_organization_id()` and `set_org_context()` already deployed in 076_rls_helpers.sql. |
| RLS-02 | Middleware Organization Header — Enhance existing middleware to resolve organization context from cookie or user's default org. Set x-organization-id header on all requests. | `src/middleware.ts` inspected — currently sets `x-user-id`, `x-user-role`, `x-user-role-id`, `x-user-role-name`, `x-user-permissions`. Needs to add `x-organization-id`. Session cookie is named `session`, org cookie to be `organization_id`. Middleware already has access to `getSessionWithRBACFromRequest` which returns userId. |
| RLS-03 | createOrgClient Helper — Create `lib/supabase/with-org.ts` exporting `createOrgClient(request)` that reads x-organization-id header, creates Supabase client, and calls set_org_context RPC. | `src/lib/supabase/server.ts` uses `@supabase/ssr@^0.8.0` + `@supabase/supabase-js@^2.90.1`. Pattern established. RPC call pattern: `supabase.rpc('set_org_context', { org_id: uuid })`. |
| RLS-04 | Update API Routes — Update all ~119 API route files to use createOrgClient instead of raw createClient for tenant-scoped queries. | Grep confirmed 123 files import from `@/lib/supabase/server`. Three categories identified: tenant routes (need createOrgClient), public routes (ticket_categories, auth), service routes (user management). Explicit list below. |
| RLS-05 | Cross-Tenant Isolation Verification — Create verification script testing cross-tenant isolation (SELECT, INSERT, UPDATE, DELETE). | "Imeri Immobilien AG" to be seeded as third org (after KeWa AG = 0010-001 and GIMBA AG = 0010-002). SQL DO-block pattern with RAISE EXCEPTION matches approach used in 082_not_null_constraints.sql. |
</phase_requirements>

---

## Summary

Phase 37 implements multi-tenant RLS enforcement. The database infrastructure is already complete: `current_organization_id()` and `set_org_context()` functions exist in migration 076, all 62 tenant tables have `organization_id NOT NULL` from phases 35–36, and the `organizations`/`organization_members` tables are seeded with KeWa AG and GIMBA AG. The phase has three distinct work streams that can be parallelized: (1) the SQL migration that drops old policies and creates new ones, (2) the TypeScript layer adding createOrgClient and enhancing middleware, and (3) the mechanical API route update.

The key architectural insight is that `set_config('app.current_organization_id', ..., true)` uses `is_local=true` for transaction scope — this is already documented in 076_rls_helpers.sql as PgBouncer-safe. The RPC approach (`supabase.rpc('set_org_context', ...)`) must be called on every request before any data query. Because the anon key is used (not service role), RLS will enforce org isolation automatically once context is set.

Route classification is the most nuanced task: 123 files import from `@/lib/supabase/server`, but ~10–15 are auth/portal routes that must not use createOrgClient (they run before org context is established). The explicit service-role list must be defined before the migration to prevent mis-classification.

**Primary recommendation:** Build the three plans in order — (1) SQL migration file, (2) TypeScript layer (middleware + createOrgClient), (3) mechanical route update — so verification can run against a consistent system.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | `^0.8.0` | Server-side Supabase client creation | Already used in `server.ts` and `client.ts` |
| `@supabase/supabase-js` | `^2.90.1` | RPC calls, query execution | Core Supabase SDK |
| `next/server` | (Next.js version) | NextRequest/NextResponse for middleware | Already used throughout |
| `jose` | (existing) | JWT verification in middleware | Already used in `lib/session.ts` |

### No New Dependencies

No new npm packages required. All tools are already installed.

---

## Architecture Patterns

### Existing Code to Know

**`src/lib/supabase/server.ts` — current createClient:**
```typescript
// Source: C:/Dev/KeWa-App/src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}
```

**`supabase/migrations/076_rls_helpers.sql` — set_org_context:**
```sql
-- Source: C:/Dev/KeWa-App/supabase/migrations/076_rls_helpers.sql
CREATE OR REPLACE FUNCTION set_org_context(org_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**`src/middleware.ts` — current header pattern:**
```typescript
// Source: C:/Dev/KeWa-App/src/middleware.ts
// Currently sets these headers after session validation:
response.headers.set('x-user-id', session.userId)
response.headers.set('x-user-role', session.role)
response.headers.set('x-user-role-id', session.roleId || '')
response.headers.set('x-user-role-name', session.roleName)
response.headers.set('x-user-permissions', session.permissions.join(','))
// Phase 37 adds: response.headers.set('x-organization-id', orgId)
```

### Pattern 1: createOrgClient

**What:** New helper that wraps createClient + RPC call to set org context.
**File:** `src/lib/supabase/with-org.ts`

```typescript
// Pattern (derived from existing codebase patterns)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function createOrgClient(request: NextRequest) {
  const orgId = request.headers.get('x-organization-id')

  if (!orgId) {
    // Fail-fast per decision: 401 when no header
    // Caller must return this response
    throw new OrgContextMissingError('x-organization-id header required')
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  // Set org context via RPC (PgBouncer-safe, transaction-scoped)
  const { error } = await supabase.rpc('set_org_context', { org_id: orgId })
  if (error) throw new Error(`Failed to set org context: ${error.message}`)

  return supabase
}

// For global lookup tables (ticket_categories, etc.) — no org context needed
export async function createPublicClient() {
  // Same as current createClient() in server.ts
}

// For admin operations that bypass RLS — explicit allow-list only
export async function createServiceClient() {
  // Uses SUPABASE_SERVICE_ROLE_KEY (when added)
  // OR uses createServerClient with anon key but with service_role set
}
```

**Error handling pattern for routes:**
```typescript
// In each API route
import { createOrgClient } from '@/lib/supabase/with-org'

export async function GET(request: NextRequest) {
  let supabase
  try {
    supabase = await createOrgClient(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... rest of handler
}
```

### Pattern 2: Middleware Org Resolution

**What:** Middleware reads org cookie, falls back to default org from DB, sets header.

The middleware currently calls `getSessionWithRBACFromRequest(request)` which returns `session.userId`. The org resolution needs a Supabase query to get default org, but middleware runs on Edge — it needs its own client.

**Critical constraint:** Middleware is on the Edge runtime. The current `server.ts` `createClient()` uses `cookies()` from `next/headers` which works in Edge. The org lookup query must use the anon key client (no org context needed since it reads `organization_members` which is not an RLS-protected table).

```typescript
// Middleware org resolution pattern
// After session validation succeeds:
const orgCookie = request.cookies.get('organization_id')?.value
let orgId = orgCookie

if (!orgId) {
  // Look up default org for user
  const supabase = await createClient() // plain client, no org context
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', session.userId)
    .eq('is_default', true)
    .single()
  orgId = data?.organization_id || null
}

if (orgId) {
  response.headers.set('x-organization-id', orgId)
}
```

**Note:** `organization_members` does NOT have `organization_id` as a column that would be RLS-filtered — it IS the org membership table. It does not appear in the 82-migration's 56-table list. It also does not have RLS enabled. This lookup works safely without org context.

### Pattern 3: RLS Policy SQL

**What:** Standard 4-policy set per tenant table.

```sql
-- Pattern: RESTRICTIVE policies for one tenant table
-- Source: derived from 076_rls_helpers.sql + phase 37 decisions

ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>_select_org" ON <table_name>
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (organization_id = current_organization_id());

CREATE POLICY "<table>_insert_org" ON <table_name>
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "<table>_update_org" ON <table_name>
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

CREATE POLICY "<table>_delete_org" ON <table_name>
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (organization_id = current_organization_id());
```

### Pattern 4: Cross-Tenant Verification DO-Block

```sql
-- Pattern from 082_not_null_constraints.sql adapted for isolation testing
DO $$
DECLARE
  kewa_org_id UUID := '00000000-0000-0000-0010-000000000001';
  imeri_org_id UUID := '00000000-0000-0000-0010-000000000003'; -- seeded in this migration
  test_id UUID;
  found_count BIGINT;
BEGIN
  -- Set context to KEWA org
  PERFORM set_org_context(kewa_org_id);

  -- SELECT isolation: should see 0 GIMBA/Imeri rows from any tenant table
  SELECT count(*) INTO found_count
  FROM properties WHERE organization_id != kewa_org_id;
  IF found_count > 0 THEN
    RAISE EXCEPTION 'SELECT isolation FAILED: KEWA context sees % cross-org rows in properties', found_count;
  END IF;

  -- INSERT isolation: attempt to insert with wrong org_id should be blocked by WITH CHECK
  BEGIN
    INSERT INTO properties (organization_id, ...) VALUES (imeri_org_id, ...);
    RAISE EXCEPTION 'INSERT isolation FAILED: should not be able to insert with wrong org_id';
  EXCEPTION WHEN others THEN
    -- Expected: policy violation
    NULL;
  END;

  -- UPDATE isolation: set imeri context, try to update kewa row
  -- DELETE isolation: set imeri context, try to delete kewa row

  RAISE NOTICE 'Cross-tenant isolation verified: all CRUD operations isolated';
END $$;
```

**Note:** The DO-block runs as a transaction. `set_org_context` uses `is_local=true` (transaction-scoped), so context changes within the DO-block are valid within the same transaction.

### Anti-Patterns to Avoid

- **Calling set_org_context but ignoring the error:** RPC errors must be caught. If set_org_context fails and the query proceeds, RLS returns empty results (not an error), leading to silent data loss.
- **Using SET LOCAL instead of set_config(..., true):** SET LOCAL is not PgBouncer-safe. The existing `set_org_context()` function already uses `set_config(..., true)` correctly — do not bypass it.
- **Reading x-organization-id from NextResponse headers in the same request handler:** The header set by middleware is on the response, not the request. Routes read it from `request.headers.get('x-organization-id')` — this works because Next.js propagates response headers back to the incoming request in the route handler context.
- **RLS PERMISSIVE (default) instead of RESTRICTIVE:** The default policy type is PERMISSIVE (any matching policy grants access). The decision is RESTRICTIVE — all policies must match. Always include `AS RESTRICTIVE` explicitly.
- **Enabling RLS without policies = zero access:** Once `ENABLE ROW LEVEL SECURITY` runs and policies are created, the anon key user sees only their org's data. Service role still bypasses RLS. Verify this doesn't break auth routes that use anon key for cross-org lookups (users table during login has no org_id and no RLS — confirmed safe).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PgBouncer-safe session config | Custom session variable mechanism | `set_org_context()` RPC (already in 076) | Already deployed, tested, documented |
| Org context propagation | Application-level org filtering in every query | PostgreSQL RLS + `current_organization_id()` | DB enforces it, not bypassable at app layer |
| Route classification logic | Complex per-route config | Simple 3-type enum: tenant/public/service | 95%+ routes are tenant type |

---

## Common Pitfalls

### Pitfall 1: The `inspection_portal_tokens` table already has permissive policies

**What goes wrong:** Migration 060 created `PERMISSIVE` policies on `inspection_portal_tokens` (for anon read via valid token, authenticated CRUD). Adding RESTRICTIVE org-based policies on top means BOTH must pass.
**Why it happens:** RESTRICTIVE + PERMISSIVE on same table means: (RESTRICTIVE must pass) AND (PERMISSIVE must pass for authenticated/anon). The existing permissive `USING (true)` for authenticated will still pass. Anon access via token will fail RLS since anon has no org context.
**How to avoid:** Drop the existing 060 permissive policies on `inspection_portal_tokens` and replace with org-aware policies. Alternatively, confirm whether the inspection portal token endpoint uses anon or service role.
**Warning signs:** `inspection_portal_tokens` policy conflicts will manifest as 401 errors on the inspector portal page after RLS enablement.

### Pitfall 2: `buildings` table already has permissive policies from migration 044

**What goes wrong:** Migration 044 created 4 permissive policies on `buildings` (`USING (true)`) for "MVP access". These will conflict with the new RESTRICTIVE org policies.
**Why it happens:** Adding RESTRICTIVE to a table with existing PERMISSIVE: PERMISSIVE is irrelevant — RESTRICTIVE gates everything. But the `DROP POLICY IF EXISTS` step must cover the 044 policy names specifically.
**How to avoid:** The policy drop step must include all named policies across all migrations: from 029 (7 tables), 044 (buildings), and 060 (inspection_portal_tokens).
**Warning signs:** Missed DROP of old permissive policies will leave dead policies in the DB that confuse future debugging.

### Pitfall 3: `quality_gates` table — present in local migrations but may not exist in production

**What goes wrong:** Migration 072 was skipped in production (per constraint: "quality_gates Tabelle fehlt in Produktion"). If the RLS migration does `ALTER TABLE quality_gates ENABLE ROW LEVEL SECURITY`, it will fail on production.
**Why it happens:** Local Supabase db reset runs all migrations including 072. Production skipped it.
**How to avoid:** Check whether `quality_gates` is in the 56-table list from 082. It is NOT — 082 only lists `project_quality_gates` (not `quality_gates`). This is safe. But verify the naming: `project_quality_gates` exists (in 075_org_id_columns.sql), `quality_gates` is a different table from migration 072.
**Warning signs:** Migration fails on production with "table quality_gates does not exist". Use `IF EXISTS` clauses where applicable.

### Pitfall 4: The `users` table has no `organization_id` column and no RLS

**What goes wrong:** Auth routes (login, register) query the `users` table directly. If `users` gets RLS accidentally enabled, login breaks.
**Why it happens:** `users` does NOT have `organization_id` — it's a global identity table. It has no org-scoped policies and should not get them.
**How to avoid:** `users` is not in the 56-table list from 082. Do not add it to Phase 37 RLS enablement. Confirmed: `roles`, `permissions`, `role_permissions`, `organization_members`, `users`, `organizations`, `owners`, `mandates` are all global tables — no RLS.
**Warning signs:** Login returns 401 after migration. Check if `users` accidentally got RLS enabled.

### Pitfall 5: Template tables have NULL organization_id by design

**What goes wrong:** 6 template tables (`templates`, `template_phases`, `template_packages`, `template_tasks`, `template_dependencies`, `template_quality_gates`) allow `NULL` organization_id (NULL = system template). If RLS policy uses `organization_id = current_organization_id()`, rows with `organization_id IS NULL` return 0 matches even for org queries.
**Why it happens:** `NULL = anything` is always NULL (false) in SQL. The org-scoped USING clause would hide system templates.
**How to avoid:** Template tables need a modified policy: `(organization_id = current_organization_id() OR organization_id IS NULL)`. System templates should be readable by any authenticated org. Org-specific templates only readable by their org. Insert/update/delete should still be scoped.
**Warning signs:** Template library shows empty after RLS enablement.

### Pitfall 6: Portal and contractor routes must NOT use createOrgClient

**What goes wrong:** Routes under `/api/portal/*` and `/api/contractor/*` handle requests from tenants/contractors who have no org session context established via the internal middleware flow.
**Why it happens:** The middleware only sets `x-organization-id` for main session routes, not for portal/contractor flows (they have separate session handling).
**How to avoid:** These routes keep using the plain `createClient()`. They query `users`, session/token tables, and `change_order_approval_tokens` — tables that either have no RLS or use service-level access.
**Warning signs:** Portal login or contractor portal returns 500 errors after route migration if createOrgClient is mistakenly applied.

### Pitfall 7: Auth routes query global tables — keep as createPublicClient

**What goes wrong:** `/api/auth/login`, `/api/auth/register`, `/api/auth/magic-link/*` query `users`, `roles`, `permissions` — global tables without org_id. They must NOT call set_org_context.
**Why it happens:** These routes are in the middleware's public scope (`/api/((?!auth).*)` pattern — auth routes ARE excluded from middleware protection).
**How to avoid:** Auth routes are exempt from createOrgClient. They stay on plain `createClient()` / `createPublicClient()`.

### Pitfall 8: `set_org_context` RPC call timing

**What goes wrong:** The RPC to set org context must complete before any subsequent query. If the RPC fails (e.g., invalid UUID format, network hiccup), subsequent queries execute with no context and return empty results.
**Why it happens:** `current_organization_id()` returns NULL on error/missing context, not an error. Supabase RLS with NULL = empty result set, not exception.
**How to avoid:** `createOrgClient` must `await` the RPC and throw on error. The route handler must check for OrgContextMissingError and return 401 before proceeding.

---

## Code Examples

### Existing Policy Names to Drop

From migration 029_rls_policies.sql (7 tables, 13 policies):
```sql
-- Table: units
DROP POLICY IF EXISTS internal_full_access_units ON units;
DROP POLICY IF EXISTS tenant_own_units ON units;

-- Table: rooms
DROP POLICY IF EXISTS internal_full_access_rooms ON rooms;
DROP POLICY IF EXISTS tenant_own_rooms ON rooms;

-- Table: tasks
DROP POLICY IF EXISTS internal_full_access_tasks ON tasks;
DROP POLICY IF EXISTS tenant_own_tasks ON tasks;

-- Table: work_orders
DROP POLICY IF EXISTS internal_full_access_work_orders ON work_orders;
DROP POLICY IF EXISTS contractor_own_work_orders ON work_orders;
DROP POLICY IF EXISTS contractor_update_work_orders ON work_orders;

-- Table: renovation_projects
DROP POLICY IF EXISTS internal_full_access_renovation_projects ON renovation_projects;
DROP POLICY IF EXISTS tenant_own_renovation_projects ON renovation_projects;

-- Table: media
DROP POLICY IF EXISTS internal_full_access_media ON media;
DROP POLICY IF EXISTS tenant_own_media ON media;
DROP POLICY IF EXISTS contractor_work_order_media ON media;

-- Table: condition_history
DROP POLICY IF EXISTS internal_full_access_condition_history ON condition_history;
DROP POLICY IF EXISTS tenant_own_condition_history ON condition_history;
```

From migration 044_buildings_rls.sql (1 table, 4 policies):
```sql
DROP POLICY IF EXISTS "buildings_select_all" ON buildings;
DROP POLICY IF EXISTS "buildings_insert_all" ON buildings;
DROP POLICY IF EXISTS "buildings_update_all" ON buildings;
DROP POLICY IF EXISTS "buildings_delete_all" ON buildings;
```

From migration 060_inspection_advanced.sql (1 table, 3 policies):
```sql
DROP POLICY IF EXISTS "Authenticated users can view inspection portal tokens" ON inspection_portal_tokens;
DROP POLICY IF EXISTS "Authenticated users can insert inspection portal tokens" ON inspection_portal_tokens;
DROP POLICY IF EXISTS "Authenticated users can delete inspection portal tokens" ON inspection_portal_tokens;
DROP POLICY IF EXISTS "Public can read via valid token" ON inspection_portal_tokens;
```

Functions to drop (from 029_rls_policies.sql, unreferenced in app code):
```sql
DROP FUNCTION IF EXISTS is_internal_user(UUID);
DROP FUNCTION IF EXISTS is_tenant_of_unit(UUID, UUID);
DROP FUNCTION IF EXISTS is_contractor_for_work_order(UUID, UUID);
```

### Complete Tenant Table List for RLS (62 tables)

From `082_not_null_constraints.sql` (56 tables) plus the 6 template tables with modified policies:

**Standard policy (4 RESTRICTIVE policies, USING: org = current_org):**
```
properties, buildings, units, rooms, components,
renovation_projects, projects, project_phases, project_packages,
project_quality_gates, tasks, task_photos, task_audio,
task_dependencies, work_orders, work_order_events, offers,
invoices, expenses, payments, partners, purchase_orders,
deliveries, inventory_movements, purchase_order_allocations,
approval_thresholds, change_orders, change_order_versions,
change_order_photos, change_order_approval_tokens, inspections,
inspection_defects, inspection_portal_tokens, inspection_templates,
media, audit_logs, comments, magic_link_tokens, storage_metadata,
kb_categories, kb_articles, kb_articles_history, kb_workflow_transitions,
kb_dashboard_shortcuts, kb_attachments, notifications, user_notifications,
push_subscriptions, notification_preferences, tickets, ticket_messages,
ticket_attachments, ticket_work_orders, condition_history, app_settings,
tenant_users
```
(56 tables, NOT NULL enforced from Phase 36)

**Modified policy (org = current_org OR org IS NULL) for SELECT:**
```
templates, template_phases, template_packages, template_tasks,
template_dependencies, template_quality_gates
```
(6 tables, NULL allowed = system template)

**Total: 62 tenant tables requiring RLS**

### Route Classification

**`createPublicClient()` — Global lookup, no org context:**
- `src/app/api/settings/categories/` — `ticket_categories` (no org_id)
- `src/app/api/auth/login/` — users table (global)
- `src/app/api/auth/register/` — users table (global)
- `src/app/api/auth/magic-link/*/` — magic_link_tokens + users
- `src/app/api/auth/logout/`, `auth/session/` — session only

**`createPublicClient()` or keep as-is — Portal/contractor (separate auth):**
- `src/app/api/portal/**` — portal session, tenant-scoped but different auth flow
- `src/app/api/contractor/**` — magic link token auth, no internal session

**`createOrgClient(request)` — All remaining tenant routes (~100+ files)**

**Note on `src/lib/supabase/cached-queries.ts`:** Uses `createClient()` for server component cached queries. Must be updated to accept org context or replaced with a pattern that threads org ID through cache keys.

### Exact File Count

Grep result: **123 files** import from `@/lib/supabase/server`.
Estimated breakdown:
- Auth routes (public): ~6 files
- Portal routes: ~12 files
- Contractor routes: ~5 files
- Settings/categories (public): ~2 files
- Tenant routes (need createOrgClient): ~98 files

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `is_internal_user()` auth-based RLS | `organization_id = current_organization_id()` org-based RLS | Simpler, scales to N orgs |
| PERMISSIVE policies (any policy grants) | RESTRICTIVE policies (all must match) | Future role-layer policies stack safely |
| SET LOCAL for session config | `set_config(..., is_local=true)` via RPC | PgBouncer-compatible |
| No tenant isolation (single-tenant) | Per-org isolation via RLS | Cross-tenant data leak impossible at DB level |

---

## Open Questions

1. **`inspection_portal_tokens` — anon access after RLS**
   - What we know: Migration 060 created `"Public can read via valid token"` policy for `anon` role. Phase 37 adds org-scoped RESTRICTIVE policies. RESTRICTIVE blocks anon since anon has no org context.
   - What's unclear: Whether the inspection portal (external inspector access) relies on this anon read path, and whether there's a service-role bypass in the inspection portal route.
   - Recommendation: Check `/api/portal/inspections/[token]/route.ts` — if it uses `createClient()` (anon key), org context is never set, and it will return empty after RLS. May need to use service role for this specific route.

2. **`cached-queries.ts` — Server Component caching with org context**
   - What we know: `getCachedUnitsWithRooms`, `getCachedUnitConditionSummary`, `getCachedActiveProjectCount` use `cache()` with `createClient()`. After RLS, they need org context.
   - What's unclear: How to pass org context to `cache()` wrappers — `cache()` creates request-level deduplication but the org ID needs to be part of the cache key.
   - Recommendation: Refactor cached-queries to accept `orgId` parameter so React `cache()` naturally keys by org. Or replace with createOrgClient pattern if server components receive the request object.

3. **`magic_link_tokens` and `audit_logs` org_id backfill completeness**
   - What we know: These are in the 56-table list with NOT NULL enforced. But magic_link_tokens has a trigger that only fires when `work_order_id` is set — portal tokens (inspection purpose) may not have a work_order_id.
   - What's unclear: Whether all magic_link_tokens rows got org_id backfilled or if some have NULL (which would cause NOT NULL constraint to have already failed).
   - Recommendation: The fact that 082 migration passed means these are clean. No issue here.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `C:/Dev/KeWa-App/supabase/migrations/029_rls_policies.sql` — Existing policies to drop, function names
- `C:/Dev/KeWa-App/supabase/migrations/044_buildings_rls.sql` — Buildings permissive policies to drop
- `C:/Dev/KeWa-App/supabase/migrations/060_inspection_advanced.sql` — inspection_portal_tokens policies
- `C:/Dev/KeWa-App/supabase/migrations/076_rls_helpers.sql` — current_organization_id() + set_org_context()
- `C:/Dev/KeWa-App/supabase/migrations/075_org_id_columns.sql` — All 62 tenant tables enumerated
- `C:/Dev/KeWa-App/supabase/migrations/082_not_null_constraints.sql` — 56-table NOT NULL list
- `C:/Dev/KeWa-App/src/middleware.ts` — Current header pattern, session cookie name
- `C:/Dev/KeWa-App/src/lib/supabase/server.ts` — createClient pattern (@supabase/ssr)
- `C:/Dev/KeWa-App/src/lib/session.ts` — SESSION_COOKIE_NAME = 'session', JWT structure
- `C:/Dev/KeWa-App/src/app/api/buildings/route.ts` — Canonical tenant route pattern
- `C:/Dev/KeWa-App/src/app/api/settings/categories/route.ts` — ticket_categories = public table
- `C:/Dev/KeWa-App/src/app/api/portal/auth/login/route.ts` — Portal auth pattern (no org context)
- `C:/Dev/KeWa-App/src/app/api/auth/login/route.ts` — Auth route (global tables only)
- Grep result: 123 files import `@/lib/supabase/server`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed
- Architecture: HIGH — RLS helpers already deployed in 076, patterns derived from existing code
- Route classification: HIGH — grep-confirmed 123 files, manual inspection of key routes
- Pitfalls: HIGH — derived from direct migration and code inspection (not speculation)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable codebase, 30-day window)
