# Pitfalls Research

**Domain:** Retrofitting Multi-Tenancy (Supabase RLS) to Existing Property Management App
**Researched:** 2026-02-18
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Enabling RLS Without Policies (Empty Results)

**What goes wrong:**
You enable RLS on a production table but forget to create policies. Every query returns empty results. Your application appears completely broken, but there are no error messages because empty results are valid responses. Users panic, production is down, and debugging is difficult because the database is technically working.

**Why it happens:**
RLS enablement and policy creation are two separate operations. Developers test in the SQL Editor (which runs as postgres superuser and bypasses RLS), see expected results, deploy, and then real users through the Supabase client see nothing. The SQL Editor does not warn about missing policies.

**How to avoid:**
- ALWAYS pair `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with at least one policy in the same migration file
- NEVER test RLS policies in the SQL Editor — always test through the Supabase client SDK with actual user authentication
- Use role simulation technique: `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '{"sub":"user-id"}';` for SQL-level testing
- Enforce migration template that requires policy creation before RLS enablement
- Create "allow all authenticated" policies initially, then tighten them incrementally

**Warning signs:**
- Migration file has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` without matching `CREATE POLICY` statements
- Testing exclusively in SQL Editor instead of through API
- "Works locally but not in production" reports
- Queries returning `[]` with no error messages

**Phase to address:**
Phase 1 (Schema Migration) — RLS enablement and initial policies must be atomic

---

### Pitfall 2: Application-Layer Queries Breaking with RLS Context

**What goes wrong:**
You have 750+ files with ~561 occurrences of Building/Property/Liegenschaft references. Many queries use direct database access through Server Components (`createClient()` from `@/lib/supabase/server`). When RLS is enabled, `auth.uid()` returns NULL in Server Components because the Supabase client doesn't have the user session context, breaking every query.

**Why it happens:**
Server Components don't automatically pass authentication context to Supabase. The `createServerClient()` helper uses the `anon` key, and RLS policies with `auth.uid()` expect a valid JWT. Without explicit session forwarding, `auth.uid()` evaluates to NULL and all policies fail.

**How to avoid:**
- Audit ALL Server Components that call Supabase (currently minimal: 7 files with direct `.from()` calls)
- Server Components MUST use session from cookies: `createClient()` helper already implements this via `@supabase/ssr`
- For service-role access (admin operations), create separate client: `createServiceRoleClient()` with explicit bypass
- Test every Server Component route with RLS enabled BEFORE production deployment
- Create migration checklist: verify each Server Component query works with RLS
- Consider moving complex queries to API routes with explicit session handling

**Warning signs:**
- Server Component queries returning empty arrays after RLS enablement
- `auth.uid()` debugging shows NULL in logs
- Dashboard/heatmap components show no data
- API routes work but Server Component pages break

**Phase to address:**
Phase 2 (RLS Context Validation) — After schema migration, before data migration

---

### Pitfall 3: Missing organization_id Indexes (Performance Cliff)

**What goes wrong:**
You add `organization_id` to all 68 tables and create RLS policies like `organization_id = current_setting('app.current_organization_id')`. On 10K rows, queries take 50ms instead of 2ms. On 100K+ rows (realistic for multi-tenant SaaS after 2 years), queries timeout. Every dashboard, every list view, every heatmap becomes unusable.

**Why it happens:**
A policy with `organization_id = X` triggers a sequential scan on the entire table if `organization_id` is not indexed. RLS policies execute on EVERY query, so a missing index becomes a critical performance bottleneck. Most tutorials focus on adding the column but forget the index.

**How to avoid:**
- Create composite indexes BEFORE enabling RLS: `CREATE INDEX idx_tablename_org_id ON tablename(organization_id)`
- For multi-column filters (common in dashboards), create composite indexes: `CREATE INDEX idx_projects_org_status ON projects(organization_id, status)`
- Use PostgreSQL's `EXPLAIN ANALYZE` with RLS policies to verify index usage
- Measure query performance with realistic data volumes (>10K rows per tenant)
- Add indexes in the SAME migration that adds `organization_id` columns
- Monitor query performance in production with Supabase dashboard metrics

**Warning signs:**
- `EXPLAIN ANALYZE` shows "Seq Scan" instead of "Index Scan" on RLS-filtered queries
- Query times >100ms for simple list views
- Dashboard heatmap loads slowly or times out
- Database CPU usage spikes after RLS enablement

**Phase to address:**
Phase 1 (Schema Migration) — Indexes must be created atomically with `organization_id` columns

---

### Pitfall 4: Foreign Key Cascades Breaking Multi-Tenant Isolation

**What goes wrong:**
You add `organization_id` to all tables but don't update foreign key constraints to include it. A cascade delete from `properties` bypasses RLS and deletes `units` across ALL organizations because the cascade operates at the postgres superuser level, not the application role level. Data loss across tenant boundaries.

**Why it happens:**
PostgreSQL foreign key cascades (ON DELETE CASCADE) run with elevated privileges and bypass RLS policies. In multi-tenant schemas, foreign keys that include `organization_id` in both referencing and referenced tables add an extra layer of protection, preventing references from crossing tenants. Without this, cascades are dangerous.

**How to avoid:**
- Make primary keys compound: `PRIMARY KEY (id, organization_id)`
- Update all foreign keys to include `organization_id`: `FOREIGN KEY (parent_id, organization_id) REFERENCES parent(id, organization_id)`
- This REQUIRES modifying 68 tables — expensive but prevents cross-tenant data corruption
- Consider using `ON DELETE NO ACTION` instead of `CASCADE` in multi-tenant context
- Add database-level CHECK constraints: `CHECK (organization_id = parent_organization_id)` where applicable
- Test cascade behavior with multi-organization test data BEFORE production

**Warning signs:**
- Foreign keys reference only `id`, not `(id, organization_id)`
- Primary keys are single-column `id` instead of compound `(id, organization_id)`
- No cross-tenant deletion tests in test suite
- Cascade deletes happen faster than expected (bypassing RLS)

**Phase to address:**
Phase 1 (Schema Migration) — Foreign key structure must be updated atomically with `organization_id` addition

---

### Pitfall 5: Data Migration Without Zero-Downtime Strategy

**What goes wrong:**
You have existing production data (KEWA AG). You add `organization_id NOT NULL` to 68 tables in a single migration. The migration locks tables, fails on NOT NULL constraint (no default value), and production is down for 15+ minutes while you rollback and debug. Users lose trust.

**Why it happens:**
Adding a NOT NULL column requires backfilling ALL existing rows. On large tables (projects, tasks, audit_logs with 10K+ rows), this takes time and acquires exclusive locks. Zero downtime migrations require phased approach: add nullable column, backfill data, add NOT NULL constraint.

**How to avoid:**
- Phase 1: Add `organization_id UUID` (nullable) to all tables
- Phase 2: Backfill existing data: `UPDATE table SET organization_id = 'kewa-org-id' WHERE organization_id IS NULL`
- Phase 3: Add NOT NULL constraint: `ALTER TABLE table ALTER COLUMN organization_id SET NOT NULL`
- Phase 4: Enable RLS with policies
- Run backfill in small batches (1000 rows at a time) to avoid long-running transactions
- Use snapshot plus CDC (Change Data Capture) for large tables
- Test migration on production-sized dataset in staging environment
- Have rollback scripts ready for each phase

**Warning signs:**
- Migration adds NOT NULL column in single operation
- No batch processing for backfill operations
- Migration locks tables for >30 seconds
- No staging environment testing with realistic data volumes
- No rollback plan documented

**Phase to address:**
Phase 3 (Data Migration) — Must use phased approach across multiple deployments

---

### Pitfall 6: Terminology Refactoring Breaks Generated Code

**What goes wrong:**
You have 561 occurrences of Liegenschaft/Gebäude/Building/Property across 81 files. You use find-and-replace to standardize terminology. This breaks: import statements when files are renamed, type definitions that reference old names, database column references in queries, generated TypeScript types from Supabase schema, and creates a slow, error-prone loop of fixing call sites.

**Why it happens:**
Refactoring isn't just find-and-replace at scale — it's a graph traversal problem across your codebase's semantic structure. When you rename a function, changes cascade through every call site, type definitions, imports/exports, tests, and documentation. Simple text replacement breaks these relationships.

**How to avoid:**
- Use AST-based refactoring tools (TypeScript Language Server, VSCode F2 rename)
- Refactor types FIRST, then let TypeScript errors guide code changes
- Update Supabase schema types: `npx supabase gen types typescript` after database changes
- Create type aliases during transition: `type Liegenschaft = Property` for gradual migration
- Update one component tree at a time (e.g., all dashboard components, then all forms)
- Run full test suite after EACH refactoring step
- Avoid bulk file renames — keep file names stable, change internal references
- Use IDE "Find All References" before renaming

**Warning signs:**
- Planning to use sed/awk/find-replace for refactoring
- No TypeScript strict mode (catches broken references)
- Renaming files before updating imports
- Changing database columns and code types simultaneously
- No test coverage to catch broken references

**Phase to address:**
Phase 4 (Terminology Cleanup) — After data model is stable, before navigation redesign

---

### Pitfall 7: Navigation Redesign Breaks User Mental Models

**What goes wrong:**
You redesign the footer navigation (8 items → fewer with drill-down) without user testing. Users can't find previously top-level features (Lieferanten, Kosten, Einheiten). Support tickets spike. Users revert to old URLs, which now 404. Productivity drops because navigation requires 2+ clicks instead of 1.

**Why it happens:**
Navigation accounts for 30-40% of mobile usability problems. Users develop muscle memory for existing navigation. Drill-down navigation (replacing current menu with child items) minimizes scrolling but frustrates users who frequently move between levels. The Priority+ pattern (showing primary items directly, overflow in "more" menu) works better for existing apps with established user habits.

**How to avoid:**
- Conduct navigation audit: which features are accessed most frequently by KEWA/Imeri?
- Use analytics (if available) or user interviews to understand access patterns
- Keep high-frequency features at top level (likely: Projekte, Aufgaben, Liegenschaft, Kosten)
- Use drill-down ONLY for related feature groups (e.g., Admin → Properties, Partners, Templates)
- Implement feature flags for gradual rollout: old nav → new nav → validate → commit
- Preserve old URLs with redirects for bookmarked pages
- Add "Favorites" or "Recent" section to reduce navigation depth
- Test with actual users (KEWA AG, Imeri) before full deployment

**Warning signs:**
- No user research on current navigation usage patterns
- Drill-down used for unrelated features
- No analytics on feature access frequency
- Navigation redesign bundled with data model changes (too many variables)
- No rollback plan if users reject new navigation

**Phase to address:**
Phase 5 (Navigation Redesign) — After data model and terminology are stable

---

### Pitfall 8: RLS Policy Testing With Service Role Client

**What goes wrong:**
You create RLS policies and test them using a Supabase client with the service role key. Policies appear to work (queries return data). You deploy to production and users see empty results. The service role key ALWAYS bypasses RLS, so your tests were invalid.

**Why it happens:**
A Supabase client with the Authorization header set to the service role API key will ALWAYS bypass RLS. This is by design for admin operations. SSR clients share the user session from cookies, and the user session overrides the default API key. Testing with service role gives false confidence.

**How to avoid:**
- NEVER test RLS policies with service role client
- Create separate test users for each role (kewa, imeri, tenant, contractor)
- Test through actual authentication flow: login → get session → query with session
- Use Supabase Auth helpers for Next.js to get proper user session
- Create integration tests that authenticate as different users and verify data isolation
- Test cross-tenant isolation: User A cannot see User B's data
- Use role simulation in SQL for policy debugging: `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '{"sub":"user-id"}';`

**Warning signs:**
- Test suite uses `SUPABASE_SERVICE_ROLE_KEY` for RLS policy tests
- No multi-user authentication in test setup
- Tests pass but production users see empty results
- No cross-tenant isolation tests

**Phase to address:**
Phase 2 (RLS Context Validation) — Create proper test infrastructure before enabling RLS

---

### Pitfall 9: STWE Field Addition Without Workflow Isolation

**What goes wrong:**
You add STWE fields (Wertquote, Eigentumsperiode) to the properties table. Rental-only workflows (existing KEWA properties) break because forms now require these fields. Validation errors appear on property edit forms. Users confused by irrelevant fields.

**Why it happens:**
STWE (Stockwerkeigentum - condominium ownership) is a different property management model than rental (Mietverwaltung). Adding fields for future STWE support without workflow isolation makes the UI confusing and breaks existing flows that shouldn't care about ownership quotas.

**How to avoid:**
- Add STWE fields as NULLABLE in database: `wertquote DECIMAL(5,2) NULL`, `eigentumsperiode DATERANGE NULL`
- Add `property_type` enum: `'rental' | 'stwe'` to properties table
- Hide STWE fields in UI when `property_type = 'rental'`
- Create separate form variants: `PropertyFormRental` vs `PropertyFormSTWE`
- Validation rules conditional on `property_type`
- Seed existing properties as `property_type = 'rental'`
- Document STWE fields in schema comments for future implementation

**Warning signs:**
- STWE fields added as NOT NULL
- No `property_type` discriminator field
- Single form component for all property types
- No conditional validation based on property type
- Users see irrelevant fields in rental workflows

**Phase to address:**
Phase 1 (Schema Migration) — Add fields with proper nullability and discriminators

---

### Pitfall 10: Inadequate WITH CHECK Clauses in RLS Policies

**What goes wrong:**
You create an INSERT policy for projects without `WITH CHECK (organization_id = current_setting('app.current_organization_id'))`. Users can insert projects with ANY `organization_id`, effectively creating data in other tenants. An UPDATE policy without WITH CHECK lets users change `organization_id`, stealing ownership of records.

**Why it happens:**
RLS has two separate checks: USING (for reads/updates on existing rows) and WITH CHECK (for inserts/updates of new values). Developers often focus on USING (preventing access to other tenants' data) and forget WITH CHECK (preventing creation/modification with wrong tenant ID).

**How to avoid:**
- ALWAYS include WITH CHECK on INSERT/UPDATE policies
- WITH CHECK should mirror USING clause for consistency
- Template for INSERT: `CREATE POLICY insert_policy ON table FOR INSERT WITH CHECK (organization_id = current_setting('app.current_organization_id'))`
- Template for UPDATE: `CREATE POLICY update_policy ON table FOR UPDATE USING (organization_id = current_setting(...)) WITH CHECK (organization_id = current_setting(...))`
- Test policy with malicious insert: try to insert row with different `organization_id`
- Code review checklist: every INSERT/UPDATE policy has WITH CHECK

**Warning signs:**
- Policies have USING but no WITH CHECK
- Can insert records with arbitrary `organization_id` values
- UPDATE allows changing `organization_id` field
- No tests for cross-tenant insertion attempts

**Phase to address:**
Phase 1 (Schema Migration) — All policies must have proper WITH CHECK clauses

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip composite foreign keys | Faster migration, simpler schema | Cross-tenant cascade deletes, data corruption risk | NEVER in multi-tenant |
| Add organization_id as nullable indefinitely | No immediate backfill required | Missing tenant isolation, inconsistent data | Only during phased migration (max 1 week) |
| Single "allow all" RLS policy | Easier initial testing | No actual tenant isolation, security risk | Only in development, never production |
| Test RLS in SQL Editor only | Fast iteration on policy syntax | Policies don't work in production (Editor bypasses RLS) | NEVER — always test via client |
| Global `SET ROLE` for session context | Simpler than per-request context | Connection pool contamination, cross-user data leakage | NEVER — use `SET LOCAL` in transactions |
| Skip zero-downtime migration | Single deployment, simpler plan | Production downtime, user trust loss | Only on pre-production environments |
| Find-replace for terminology | Appears fast | Breaks imports, types, generated code | NEVER — use AST-based refactoring |
| Bundle data model + navigation changes | Fewer deployments | Too many variables, harder debugging | NEVER — separate concerns |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth in Server Components | Using `createBrowserClient()` in Server Components | Use `createServerClient()` from `@supabase/ssr` with cookie handling |
| RLS with Next.js SSR | Not forwarding user session to Supabase client | Use `createServerClient()` with proper cookie helpers |
| Service Role Access | Using service role key for regular queries | Reserve service role for admin operations only, create separate client |
| Storage RLS Policies | Database RLS ≠ Storage RLS, must configure both | Create Storage policies matching database RLS structure |
| Session Context Setting | Using `SET ROLE` globally in connection pool | Use `SET LOCAL` inside transactions to prevent leak |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Missing organization_id indexes | Slow queries, high CPU | Create indexes BEFORE enabling RLS | >10K rows per table |
| Sequential scan on RLS policies | Query timeouts on dashboards | Use `EXPLAIN ANALYZE` to verify index usage | >50K rows per table |
| N+1 queries with RLS overhead | Dashboard loads 20+ seconds | Batch queries, use joins, cache results | >5 properties with >100 units each |
| Unbatched backfill migrations | Table locks, migration timeouts | Backfill in 1000-row batches with commits | >10K rows to migrate |
| Cross-tenant eager loading | Loading all tenants' data in memory | Scope queries to current organization immediately | >10 organizations |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Missing WITH CHECK in RLS policies | Users can create data in other tenants | Every INSERT/UPDATE policy needs WITH CHECK clause |
| Testing with service role key | RLS bypass, policies untested | Test with actual user sessions via auth flow |
| Foreign keys without organization_id | Cascade deletes cross tenant boundaries | Use compound foreign keys including organization_id |
| Global session context (`SET ROLE`) | Connection pool contamination, data leakage | Use `SET LOCAL` in transactions only |
| No cross-tenant isolation tests | Silent multi-tenant data leakage | Test that User A cannot access User B's data |
| RLS on database but not Storage | File uploads accessible across tenants | Configure Storage RLS policies matching database |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Drill-down navigation for unrelated features | Users lose context, navigation becomes tedious | Use drill-down only for parent-child relationships |
| Removing top-level access to frequent features | Productivity drops, frustration increases | Keep high-frequency features (Projekte, Aufgaben) at top level |
| STWE fields visible in rental workflows | Confusion, validation errors on irrelevant fields | Conditional UI based on property_type discriminator |
| Navigation redesign without user testing | Users can't find features, support tickets spike | Test with actual users (KEWA, Imeri) before rollout |
| Breaking existing URLs during refactoring | Bookmarks fail, 404 errors | Implement redirects for old URLs |
| Empty results with no explanation (RLS failure) | Users think app is broken | Add explicit "no data" states, RLS error detection |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **RLS Enabled:** Often missing policies — verify at least one policy exists per table before enablement
- [ ] **organization_id Column Added:** Often missing indexes — verify `CREATE INDEX idx_table_org_id` exists
- [ ] **RLS Policies Created:** Often missing WITH CHECK — verify INSERT/UPDATE policies have WITH CHECK clause
- [ ] **Server Component Updated:** Often missing session context — verify auth session forwarded to createClient()
- [ ] **Foreign Keys Updated:** Often missing organization_id — verify compound foreign keys (id, organization_id)
- [ ] **Data Backfilled:** Often incomplete — verify ALL rows have organization_id set (no NULLs)
- [ ] **Terminology Refactored:** Often breaks types — verify `npx supabase gen types typescript` run after schema changes
- [ ] **Navigation Redesigned:** Often missing redirects — verify old URLs redirect to new locations
- [ ] **STWE Fields Added:** Often missing property_type discriminator — verify conditional UI based on property type
- [ ] **Multi-Tenant Tests:** Often missing cross-tenant isolation — verify User A cannot access User B's data

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS enabled without policies | MEDIUM | 1. Disable RLS immediately: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` 2. Create policies 3. Test with client 4. Re-enable RLS |
| Missing organization_id indexes | LOW | 1. Create indexes: `CREATE INDEX CONCURRENTLY` (no table lock) 2. Verify with EXPLAIN ANALYZE 3. Monitor performance |
| Foreign key cascades cross tenant | HIGH | 1. Restore from backup (data loss) 2. Update FK constraints to compound 3. Add tests 4. Migrate again |
| Backfill migration timeout | MEDIUM | 1. Rollback migration 2. Split into batched operations 3. Deploy in phases 4. Re-run |
| Terminology refactor breaks types | LOW | 1. Run `npx supabase gen types typescript` 2. Fix TypeScript errors 3. Run tests 4. Deploy |
| Navigation redesign rejected by users | MEDIUM | 1. Feature flag to old navigation 2. Gather feedback 3. Iterate design 4. Gradual rollout |
| Service role RLS testing false confidence | MEDIUM | 1. Create proper test users 2. Rewrite tests with auth flow 3. Re-validate all policies |
| Missing WITH CHECK in policies | HIGH | 1. Audit all policies 2. Add WITH CHECK clauses 3. Test malicious inserts 4. Verify no cross-tenant data created |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Pitfall 1: RLS without policies | Phase 1: Schema Migration | Run test queries via client SDK, verify non-empty results |
| Pitfall 2: Server Components without context | Phase 2: RLS Context Validation | Load each Server Component route, verify data appears |
| Pitfall 3: Missing organization_id indexes | Phase 1: Schema Migration | Run EXPLAIN ANALYZE, verify Index Scan not Seq Scan |
| Pitfall 4: Foreign key cascades | Phase 1: Schema Migration | Verify compound foreign keys exist, test cross-tenant delete |
| Pitfall 5: Non-zero-downtime migration | Phase 3: Data Migration | Deploy to staging, measure lock duration < 30s |
| Pitfall 6: Terminology refactor breaks code | Phase 4: Terminology Cleanup | Run TypeScript build, all tests pass |
| Pitfall 7: Navigation redesign breaks UX | Phase 5: Navigation Redesign | User testing with KEWA/Imeri, feature flag rollout |
| Pitfall 8: Service role RLS testing | Phase 2: RLS Context Validation | Tests use actual user sessions, no service role key |
| Pitfall 9: STWE fields break rental workflows | Phase 1: Schema Migration | Verify property_type discriminator, conditional UI |
| Pitfall 10: Missing WITH CHECK | Phase 1: Schema Migration | Test malicious insert with different organization_id |

## Sources

### Supabase RLS and Migration
- [Supabase Row Level Security (RLS): Complete Guide (2026)](https://designrevision.com/blog/supabase-row-level-security)
- [Best Practices for Supabase](https://www.leanware.co/insights/supabase-best-practices)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Hardening the Data API | Supabase Docs](https://supabase.com/docs/guides/database/hardening-data-api)
- [Enable RLS by default on all new tables · supabase · Discussion #21747](https://github.com/orgs/supabase/discussions/21747)
- [Use Supabase Auth with Next.js | Supabase Docs](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Server-Side Issue: Row Level security auth.uid() check doesn't work · supabase · Discussion #6592](https://github.com/orgs/supabase/discussions/6592)

### Multi-Tenant Architecture
- [Multi-Tenant Database Architecture Patterns Explained](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)
- [Designing Your Postgres Database for Multi-tenancy | Crunchy Data Blog](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
- [Multi-Tenant Schema Migration — Citus Docs](https://docs.citusdata.com/en/v7.4/develop/migration_mt_schema.html)
- [How to Implement PostgreSQL Row Level Security for Multi-Tenant SaaS](https://www.techbuddies.io/2026/01/01/how-to-implement-postgresql-row-level-security-for-multi-tenant-saas/)
- [PostgreSQL Row-level Security (RLS) Limitations and Alternatives](https://www.bytebase.com/blog/postgres-row-level-security-limitations-and-alternatives/)

### Zero-Downtime Migrations
- [How do you plan zero-downtime data migrations and backfills?](https://www.designgurus.io/answers/detail/how-do-you-plan-zerodowntime-data-migrations-and-backfills)
- [3 Best Practices For Zero-Downtime Database Migrations | LaunchDarkly](https://launchdarkly.com/blog/3-best-practices-for-zero-downtime-database-migrations/)
- [Database Migration Strategies for Zero-Downtime Deployments](https://www.deployhq.com/blog/database-migration-strategies-for-zero-downtime-deployments-a-step-by-step-guide)
- [Database Migrations at Scale: Zero-Downtime Strategies](https://medium.com/@sohail_saifii/database-migrations-at-scale-zero-downtime-strategies-b72be4833519)

### Code Refactoring
- [How to Refactor Complex Codebases – A Practical Guide for Devs](https://www.freecodecamp.org/news/how-to-refactor-complex-codebases)
- [Code Refactoring: When to Refactor and How to Avoid Mistakes](https://www.tembo.io/blog/code-refactoring)
- [Refactoring made right: how program analysis makes AI agents safe and reliable](https://kiro.dev/blog/refactoring-made-right/)
- [Codebase Refactoring (with help from Go)](https://go.dev/talks/2016/refactor.article)

### Navigation UX
- [10 modern footer UX patterns for 2026](https://www.eleken.co/blog-posts/footer-ux)
- [Mobile Navigation UX Best Practices, Patterns & Examples (2026)](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [Mobile Navigation Patterns That Work in 2026](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026)
- [Designing Navigation for Mobile: Design Patterns and Best Practices](https://www.smashingmagazine.com/2022/11/navigation-design-mobile-ux/)

---
*Pitfalls research for: Retrofitting Multi-Tenancy (Supabase RLS) to Existing Property Management App*
*Researched: 2026-02-18*
