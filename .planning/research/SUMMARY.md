# Project Research Summary

**Project:** KeWa-App v4.0 Multi-Tenant Data Model & Navigation
**Domain:** Retrofitting multi-tenancy into an existing Supabase/Next.js property management app
**Researched:** 2026-02-18
**Confidence:** HIGH

## Executive Summary

KeWa-App is an existing Swiss property management application (Supabase + Next.js App Router) that needs multi-tenancy retrofitted into its data model. The standard approach for this domain is organization-scoped Row Level Security (RLS) with a denormalized `organization_id` column on every tenant table, enforced at the database level. No new packages are required -- the entire multi-tenant layer is built on existing Postgres RLS, Supabase client libraries, React Context, and TypeScript discriminated unions. The recommended data hierarchy follows Swiss property management standards: Verwaltung (organization) > Mandat > Eigentuemer > Liegenschaft > Gebaeude > Einheit.

The single most important architectural decision is how RLS gets its organization context. Because KeWa uses custom PIN-based authentication (NOT Supabase Auth JWT), `auth.uid()` and `auth.jwt()` return NULL for internal users. The solution is `set_config('app.current_organization_id', value, true)` called via an RPC function per request, with RLS policies reading `current_setting()` instead of `auth.jwt()`. This is a well-established Postgres multi-tenant pattern. When auth eventually migrates to Supabase Auth, only the implementation of `current_organization_id()` changes -- all RLS policies remain untouched.

The primary risks are: (1) enabling RLS without policies causes silent empty results in production, (2) missing indexes on `organization_id` columns create 100x performance degradation, (3) the phased migration of 68 tables requires zero-downtime strategy (nullable columns first, backfill, then NOT NULL), and (4) foreign key cascades bypass RLS and can corrupt data across tenant boundaries. All four are preventable with disciplined migration ordering. The navigation redesign (8-item footer to 5-item with breadcrumbs) should be a separate phase after the data model is stable to avoid debugging two major changes simultaneously.

## Key Findings

### Recommended Stack

No new packages needed. The multi-tenant layer uses Postgres native features (RLS, SECURITY DEFINER, indexes), existing Supabase client libraries (@supabase/ssr 0.8.0, @supabase/supabase-js 2.90.1), React Context for organization/mandate state, and TypeScript discriminated unions for STWE vs rental property types.

**Core technologies:**
- **Postgres RLS** -- database-level tenant isolation, prevents application-layer bypasses, 100x+ performance with proper indexes
- **SECURITY DEFINER functions** -- cache `current_setting()` lookups per statement via initPlan optimization, avoid per-row function calls
- **React Context API** -- organization and mandate selection state, sufficient for low-frequency tenant switching (no Zustand needed)
- **TypeScript Discriminated Unions** -- compile-time exhaustiveness checking for rental vs STWE property types
- **`set_config()` / `current_setting()`** -- application-layer RLS context that works with PIN auth, transaction-scoped via LOCAL flag

**Critical version note:** All packages already installed. Zero dependency changes.

### Expected Features

**Must have (table stakes):**
- Organization/Verwaltung switcher -- cannot be multi-tenant without context switching
- Mandate (Verwaltungsmandat) management -- core Swiss property mgmt concept, legal contract
- Mandate-scoped data isolation -- security fundamental, organization_id on every table
- Property hierarchy terminology fix -- Liegenschaft (property parcel) vs Gebaeude (building structure)
- Role-based permissions per mandate -- user can be admin in Mandate A, viewer in Mandate B
- Navigation redesign with breadcrumbs -- Verwaltung > Mandat > Liegenschaft > Gebaeude > Einheit
- STWE basic fields -- expose existing condominium ownership fields (wertquote, eigentumsperiode)

**Should have (differentiators):**
- Unified renovation + STWE in one platform -- competitors separate these (Rimo R5, ImmoTop2, GARAIO REM)
- Owner self-service portal with live updates -- most Swiss tools generate static reports
- Cross-mandate portfolio view -- manage multiple mandates in single pane
- External contractor magic-link portal -- already built, simpler than forced logins

**Defer (v2+):**
- Multi-language (French, Italian) -- not needed for initial Zurich-area mandates
- STWE advanced (voting, assemblies) -- complex, low ROI until managing 5+ STWE properties
- Custom roles beyond current RBAC -- current roles sufficient
- Native mobile owner app -- PWA sufficient for now

### Architecture Approach

The architecture adds three new layers: (1) new tables (organizations, mandates, owners, tenancies, organization_members), (2) denormalized `organization_id` on all 68 existing tenant tables with RLS policies using `current_organization_id()` helper, and (3) nested React Context providers (OrganizationProvider > MandateProvider > BuildingProvider). The middleware resolves organization context from a cookie and sets an `x-organization-id` header. Every API route calls `set_org_context` RPC before querying, making all subsequent queries automatically organization-scoped through RLS.

**Major components:**
1. **Data Model Layer** -- organizations, mandates, owners, tenancies tables + organization_id on 68 existing tables with indexes and triggers for FK sync
2. **RLS Security Layer** -- `current_organization_id()` SECURITY DEFINER function reading `current_setting()`, uniform USING/WITH CHECK policies on every table
3. **Application Context Layer** -- OrganizationProvider + MandateProvider React Contexts, middleware header injection, `createOrgClient()` helper for API routes
4. **Navigation Layer** -- OrgSwitcher replacing PropertySelector, breadcrumbs from URL segments, 5-item footer with "Mehr" overflow
5. **Storage Layer** -- bucket paths prefixed with organization_id, storage RLS policies matching database RLS
6. **Migration Layer** -- phased zero-downtime approach: nullable columns > backfill > NOT NULL > RLS enablement

### Critical Pitfalls

1. **RLS enabled without policies = silent empty results** -- ALWAYS pair `ALTER TABLE ENABLE ROW LEVEL SECURITY` with at least one policy in the same migration. Test via client SDK, never SQL Editor (which bypasses RLS as superuser).

2. **Missing organization_id indexes = 100x performance cliff** -- Create indexes in the SAME migration that adds `organization_id` columns. Use `CREATE INDEX CONCURRENTLY` for zero-lock creation. Verify with `EXPLAIN ANALYZE`.

3. **`set_config()` without LOCAL flag = connection pool contamination** -- ALWAYS use `set_config('app.current_organization_id', value, true)` where `true` means LOCAL (transaction-scoped). Global settings leak across requests on the same connection.

4. **Foreign key cascades bypass RLS** -- Cascades run with elevated privileges. Need triggers to validate organization_id consistency on parent-child relationships. Consider `ON DELETE NO ACTION` instead of CASCADE in multi-tenant context.

5. **Zero-downtime migration of 68 tables** -- Add nullable columns first, backfill in batches of 1000, then add NOT NULL constraint. Never add NOT NULL column in single operation on tables with existing data.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Schema Foundation
**Rationale:** Everything depends on the data model. Organizations, mandates, owners tables must exist before any RLS, context, or navigation work.
**Delivers:** New tables (organizations, organization_members, owners, mandates, tenancies), `organization_id` nullable column on all 68 existing tables, all indexes, STWE preparation fields (nullable), `current_organization_id()` and `set_org_context()` helper functions.
**Addresses:** Mandate-scoped data isolation (foundation), STWE basic fields (schema only), property hierarchy terminology (schema comments)
**Avoids:** Pitfall 3 (indexes created atomically with columns), Pitfall 5 (nullable columns first), Pitfall 9 (STWE fields nullable with property_type discriminator)

### Phase 2: Data Migration & Backfill
**Rationale:** Cannot enable RLS until all existing rows have organization_id. Must be separate from schema changes for zero-downtime.
**Delivers:** KEWA AG organization seeded, all existing data backfilled with organization_id, NOT NULL constraints applied, organization_members created for existing users.
**Addresses:** Mandate management (CRUD for existing data)
**Avoids:** Pitfall 5 (phased migration, batch backfill), Pitfall 4 (FK validation triggers)

### Phase 3: RLS Enablement & Context Wiring
**Rationale:** RLS policies require backfilled data AND helper functions. Context wiring (middleware, API routes) must happen simultaneously to prevent broken queries.
**Delivers:** RLS policies on all tables (USING + WITH CHECK), middleware x-organization-id header, `createOrgClient()` helper, updated API routes calling `set_org_context`.
**Addresses:** Mandate-scoped data isolation (enforcement), role-based permissions per mandate
**Avoids:** Pitfall 1 (policies created with RLS enablement), Pitfall 2 (Server Component context), Pitfall 8 (test with client SDK not service role), Pitfall 10 (WITH CHECK on all INSERT/UPDATE)

### Phase 4: Application Context & Organization Switcher
**Rationale:** UI layer depends on working RLS and context wiring from Phase 3. OrganizationProvider and MandateProvider can only be built after the data model and security layer are stable.
**Delivers:** OrganizationContext, MandateContext, OrgSwitcher component, cookie-based org persistence, org switch clears mandate/building state.
**Addresses:** Organization/Verwaltung switcher, role-based owner vs manager views (context layer)
**Avoids:** Pitfall 7 (navigation changes isolated from data model changes)

### Phase 5: Navigation Redesign
**Rationale:** Navigation depends on stable context providers, terminology, and URL structure. Must be last to avoid debugging data model + navigation simultaneously.
**Delivers:** Breadcrumb component, 5-item footer with "Mehr" overflow, `/dashboard/objekte/` drill-down URL structure, old URL redirects.
**Addresses:** Property hierarchy navigation, property-to-building drill-down, navigation redesign
**Avoids:** Pitfall 6 (terminology changes before navigation), Pitfall 7 (test with users, feature flag rollout)

### Phase 6: Storage Multi-Tenancy & Verification
**Rationale:** Storage isolation is important but not blocking for core functionality. Verification pass ensures no cross-tenant leakage.
**Delivers:** Storage bucket path convention ({org_id}/{property_id}/...), storage RLS policies, cross-tenant isolation tests, end-to-end verification.
**Addresses:** Storage isolation, multi-tenant security verification
**Avoids:** Pitfall 8 (comprehensive multi-user testing)

### Phase Ordering Rationale

- **Schema before RLS:** RLS policies reference `organization_id` columns and helper functions that must exist first.
- **Backfill before RLS:** RLS with `organization_id = current_organization_id()` returns empty results if `organization_id` is NULL on existing rows.
- **RLS before UI:** The organization switcher is meaningless without data isolation enforcement.
- **Context before navigation:** Breadcrumbs depend on OrganizationContext and MandateContext to display org/mandate names.
- **Data model separate from navigation:** Pitfall 7 explicitly warns against bundling these changes. Debug one major system at a time.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (RLS Enablement):** The interaction between PIN-based auth, `set_config()`, and Supabase's connection pooler (PgBouncer) needs validation. `SET LOCAL` is transaction-scoped, but PgBouncer in transaction mode may reset settings between statements if not in an explicit transaction. Test this in staging.
- **Phase 4 (Application Context):** The 119 API route files with 425 `.from()` calls all need the `set_org_context` call. Determine if a wrapper/middleware approach can automate this vs manual updates.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Schema Foundation):** Well-documented ALTER TABLE + CREATE INDEX patterns. Supabase migration CLI handles this.
- **Phase 2 (Data Migration):** Standard backfill pattern. Small dataset (KEWA only has ~1000 rows per table max).
- **Phase 5 (Navigation):** usePathname + breadcrumbs is a 20-LOC component. Standard Next.js App Router pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies. All recommendations verified against official Supabase docs and current package.json. |
| Features | MEDIUM | Swiss property management domain verified via Fairwalter/Rimo R5/ImmoTop2 comparison. Some STWE details from general context, not Swiss-specific legal sources. |
| Architecture | HIGH | `set_config()` + `current_setting()` pattern verified in official Postgres docs, Supabase community patterns, and multi-tenant architecture literature. Codebase analysis confirms 68 tables, 119 API routes, PIN-based auth. |
| Pitfalls | HIGH | Every pitfall sourced from multiple references. RLS-without-policies and missing-indexes pitfalls are the most commonly reported Supabase issues in community forums. |

**Overall confidence:** HIGH

### Gaps to Address

- **PgBouncer + SET LOCAL interaction:** Supabase uses PgBouncer for connection pooling. `SET LOCAL` is transaction-scoped, but Supabase's PostgREST may not wrap each API call in an explicit transaction. Needs testing in staging with actual Supabase pooler. If `SET LOCAL` doesn't persist, the alternative is passing org_id as a function parameter to each RPC call instead of relying on session settings.

- **Compound foreign keys decision:** ARCHITECTURE.md recommends denormalized org_id with triggers. PITFALLS.md recommends compound PKs `(id, organization_id)` for cascade safety. These conflict. Compound PKs require modifying ALL 68 tables' primary keys and every FK reference -- extremely high migration cost. Recommendation: keep UUID PKs, use triggers for org_id sync, and replace CASCADE with NO ACTION + application-level cascading for critical paths. Validate this decision in Phase 1 planning.

- **Existing RLS policies:** 7 tables already have RLS enabled (029_rls_policies.sql). These existing policies use `is_internal_user(auth.uid())` which returns NULL for PIN-auth users. Need to audit whether these are currently working or silently broken. If broken, they may be using service role client to bypass.

- **STWE legal requirements:** Feature research notes Swiss law requirements for transparent condominium accounting, but specific legal standards (e.g., required report formats) were not validated against official Swiss Code of Obligations. Defer to Phase 6+ when first STWE property is onboarded.

## Sources

### Primary (HIGH confidence)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- index requirements, SECURITY DEFINER patterns
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- policy structure, USING vs WITH CHECK
- [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) -- future auth migration pattern
- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) -- storage bucket RLS
- [TypeScript Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) -- discriminated unions for property types
- [Hardening the Data API](https://supabase.com/docs/guides/database/hardening-data-api) -- RLS enablement patterns
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) -- auth hook patterns

### Secondary (MEDIUM confidence)
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- multi-tenant patterns, testing
- [Multi-Tenant Database Architecture (Bytebase)](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/) -- denormalization rationale
- [Designing Postgres for Multi-Tenancy (Crunchy Data)](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy) -- organization_id patterns
- [Zero-Downtime PostgreSQL Migrations (Xata)](https://xata.io/blog/zero-downtime-schema-migrations-postgresql) -- phased migration approach
- [Swiss Property Management Software Comparison](https://emonitor.ch/5-immobilien-erp-systeme-die-sie-kennen-sollten/) -- feature landscape
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant) -- App Router multi-tenant patterns

### Tertiary (LOW confidence)
- [Multi-Tenant RLS on Supabase (Antstack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) -- general patterns, no version specifics
- STWE legal requirements inferred from general Swiss property context, not verified against specific OR articles

---
*Research completed: 2026-02-18*
*Ready for roadmap: yes*
