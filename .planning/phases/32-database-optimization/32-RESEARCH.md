# Phase 32: Database Optimization - Research

**Researched:** 2026-02-05
**Domain:** PostgreSQL performance optimization with Supabase + Next.js Server Components
**Confidence:** HIGH

## Summary

Database optimization in Supabase (PostgreSQL) environments follows a systematic workflow: profile → identify → optimize → verify. The stack leverages built-in PostgreSQL extensions (`pg_stat_statements`, `index_advisor`, `hypopg`) available in all Supabase projects, combined with Next.js Server Components patterns to prevent N+1 queries through React's `cache()` function and proper query structuring.

The research confirms that Supabase provides comprehensive tooling out-of-the-box for this phase, including dashboard-based query performance analysis, automated index recommendations via `index_advisor`, and `EXPLAIN ANALYZE` integration. The codebase already has basic indexes on foreign keys but lacks composite indexes, partial indexes, and systematic query optimization for complex aggregations (dashboard, heatmap).

**Primary recommendation:** Use Supabase's native `pg_stat_statements` and `index_advisor` extensions for profiling and optimization, wrap database queries with React `cache()` to prevent N+1 in Server Components, and apply targeted B-tree indexes for frequently queried columns.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg_stat_statements | Built-in | Query performance tracking | Enabled by default in all Supabase projects, tracks execution stats for all SQL statements |
| Supabase Dashboard | N/A | Visual query performance analysis | Native UI for pg_stat_statements data, provides Query Performance page with slowest queries |
| index_advisor | Supabase extension | Index recommendations | Uses HypoPG to test hypothetical indexes, recommends optimal indexes for slow queries |
| EXPLAIN ANALYZE | PostgreSQL built-in | Query plan analysis | Standard PostgreSQL command for understanding query execution and verifying index usage |
| React cache() | React 19 | Request-level deduplication | Prevents duplicate queries in Server Components render cycle |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| HypoPG | Supabase extension | Hypothetical index testing | Automatically used by index_advisor, no direct usage needed |
| pg_stat_monitor | Alternative extension | Enhanced query monitoring | Only if pg_stat_statements insufficient (unlikely for this phase) |
| supabase inspect db | Supabase CLI | Command-line diagnostics | For CI/CD or scripted analysis (cache-hit, unused-indexes, outliers commands) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_stat_statements | Application-level APM (Datadog, New Relic) | APM adds complexity and cost; pg_stat_statements is free, built-in, and database-authoritative |
| index_advisor | Manual EXPLAIN ANALYZE review | Manual process is slower and requires deep PostgreSQL expertise; index_advisor automates with HypoPG |
| React cache() | Custom deduplication logic | Reinventing the wheel; React cache() is React 19 built-in and Next.js recommended |

**Installation:**
```bash
# Extensions are pre-enabled in Supabase, verify with:
supabase db inspect db cache-hit
supabase db inspect db unused-indexes

# Or via SQL:
# SELECT * FROM pg_available_extensions WHERE name IN ('pg_stat_statements', 'index_advisor', 'hypopg');
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── dashboard/
│   │   ├── dashboard-queries.ts    # Already exists - candidate for optimization
│   │   └── heatmap-queries.ts      # Already exists - N+1 risk with rooms query
│   └── supabase/
│       ├── server.ts               # Server Component client factory
│       └── queries/                # NEW: Cached query layer
│           ├── cache.ts            # React cache() wrappers
│           └── preload.ts          # Preload pattern utilities
supabase/
├── migrations/
│   └── XXX_performance_indexes.sql # NEW: Phase 32 index additions
└── scripts/
    └── performance/                # NEW: Performance analysis scripts
        ├── analyze-slow-queries.sql
        └── verify-indexes.sql
```

### Pattern 1: Query Performance Profiling Workflow

**What:** Systematic approach to finding and fixing slow queries
**When to use:** Beginning of optimization phase and periodically in production

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/extensions/pg_stat_statements
-- Step 1: Find slow queries (mean > 2ms, frequent calls, high total time)
SELECT
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time,
  stddev_exec_time,
  query
FROM pg_stat_statements
WHERE
  calls > 50                   -- frequently executed
  AND mean_exec_time > 2.0     -- averaging at least 2ms
  AND total_exec_time > 60000  -- significant total time
  AND query ILIKE '%your_table%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- Step 2: Analyze query plan with EXPLAIN ANALYZE
-- Source: https://www.postgresql.org/docs/current/using-explain.html
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM units WHERE building_id = 'xxx';

-- Step 3: Get index recommendations
-- Source: https://supabase.com/docs/guides/database/extensions/index_advisor
SELECT * FROM index_advisor('
  SELECT u.*, r.*
  FROM units u
  LEFT JOIN rooms r ON r.unit_id = u.id
  WHERE u.building_id = $1
');

-- Step 4: Create recommended indexes
CREATE INDEX CONCURRENTLY idx_name ON table(column);

-- Step 5: Verify improvement
-- Re-run EXPLAIN ANALYZE and check for index usage
```

### Pattern 2: Preventing N+1 Queries in Server Components

**What:** Use React `cache()` to deduplicate database calls within a single render pass
**When to use:** All database query functions called from Server Components

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/getting-started/fetching-data
import { cache } from 'react'
import 'server-only'
import { createClient } from '@/lib/supabase/server'

// Cached query - multiple calls with same ID return cached result
export const getUnit = cache(async (unitId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('units')
    .select('*, rooms(*)')
    .eq('id', unitId)
    .single()

  return data
})

// Preload pattern - start fetching early
export const preloadUnit = (unitId: string) => {
  void getUnit(unitId) // Fire and forget, result cached
}
```

### Pattern 3: Composite Index Strategy

**What:** Create multi-column indexes for common query patterns
**When to use:** Queries with multiple WHERE conditions or JOIN + WHERE combinations

**Example:**
```sql
-- Source: https://www.postgresql.org/docs/current/indexes-multicolumn.html
-- Common pattern: Filter by building, then order by floor
CREATE INDEX idx_units_building_floor
  ON units(building_id, floor DESC);

-- Common pattern: Active projects for a unit
CREATE INDEX idx_projects_unit_status
  ON renovation_projects(unit_id, status)
  WHERE status IN ('planned', 'active', 'blocked');
```

### Pattern 4: Partial Index for Filtered Queries

**What:** Index only subset of rows that match specific conditions
**When to use:** Queries consistently filter on same predicates (status, boolean flags)

**Example:**
```sql
-- Source: https://www.postgresql.org/docs/current/indexes-partial.html
-- Only index active/planned/blocked projects (ignore completed/archived)
CREATE INDEX idx_active_projects_unit
  ON renovation_projects(unit_id, planned_start_date)
  WHERE status IN ('planned', 'active', 'blocked');

-- Only index apartments (not common_area, building types)
CREATE INDEX idx_apartment_units_building
  ON units(building_id, floor)
  WHERE unit_type = 'apartment';
```

### Anti-Patterns to Avoid

- **Sequential N+1 queries:** Don't loop through parent records fetching related data one-by-one; use JOINs or IN queries with proper indexing
- **Over-indexing:** Don't add indexes speculatively; indexes have write overhead and storage cost - only add after profiling identifies need
- **Missing CONCURRENTLY:** Don't run `CREATE INDEX` without `CONCURRENTLY` on production databases - it locks table during build
- **Ignoring estimated vs actual rows:** When EXPLAIN ANALYZE shows large discrepancies between planned and actual rows, statistics need updating (`ANALYZE table_name`)
- **Premature optimization:** Don't optimize queries before establishing baseline metrics and identifying actual bottlenecks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Index recommendation | Custom query analysis scripts | Supabase `index_advisor` extension | Uses HypoPG for zero-cost hypothetical index testing, battle-tested by Supabase |
| Query deduplication | Custom caching layer or query batching | React `cache()` function | Built into React 19, handles render-pass scope automatically, Next.js recommended |
| Query performance tracking | Custom logging or timing wrappers | `pg_stat_statements` extension | Tracks all queries database-wide, enabled by default in Supabase, minimal overhead |
| Slow query dashboard | Custom admin UI | Supabase Dashboard Query Performance page | Native integration with pg_stat_statements, visualizes slow queries out-of-box |
| Database statistics | Custom table scanners | PostgreSQL `ANALYZE` command | Optimized C implementation, updates planner statistics efficiently |

**Key insight:** Supabase and PostgreSQL provide production-grade performance tooling built-in. Custom solutions add complexity without benefit and miss edge cases (e.g., hypothetical indexes, query normalization, statistics maintenance).

## Common Pitfalls

### Pitfall 1: Index Not Used Despite Creation

**What goes wrong:** You create an index but EXPLAIN ANALYZE shows sequential scan instead of index scan
**Why it happens:**
- Statistics outdated (planner doesn't know index exists)
- Query pattern doesn't match index column order
- Table too small (planner prefers seq scan for <1000 rows)
- Data type mismatch (e.g., `WHERE text_column = 123` instead of `'123'`)

**How to avoid:**
- Run `ANALYZE table_name` after creating index
- Use `EXPLAIN (ANALYZE, BUFFERS)` to verify index usage
- Check index column order matches WHERE clause order for composite indexes
- Don't index tiny tables (PostgreSQL correctly chooses seq scan)

**Warning signs:**
- "Seq Scan" in EXPLAIN output when expecting "Index Scan"
- High "Buffers: shared read" without "Index Scan"

### Pitfall 2: N+1 Queries in Server Components

**What goes wrong:** Dashboard page loads slowly, Supabase query log shows hundreds of duplicate queries
**Why it happens:**
- Multiple components call same query function during single render
- Looping through parent records to fetch children individually
- Not using React `cache()` wrapper on query functions

**How to avoid:**
- Wrap all database query functions with `cache()` from 'react'
- Use JOIN or IN queries instead of loops for related data
- Check Supabase Dashboard → Database → Query Performance for duplicate queries

**Warning signs:**
- Same query appears 50+ times in pg_stat_statements with identical parameters
- Page load time scales linearly with number of records
- Supabase client instantiated multiple times per request

### Pitfall 3: Index Bloat from Updates

**What goes wrong:** Index performance degrades over time despite no schema changes
**Why it happens:**
- PostgreSQL MVCC creates new row versions on UPDATE
- Old index entries not immediately cleaned up
- Particularly bad for frequently updated columns

**How to avoid:**
- Don't index columns with high update frequency unless necessary
- Schedule periodic `REINDEX CONCURRENTLY` for heavily updated tables
- Monitor index bloat with `supabase db inspect db unused-indexes`
- Consider partial indexes to reduce bloat (only index active records)

**Warning signs:**
- Query performance degrades gradually over weeks
- `pg_stat_user_indexes` shows low `idx_scan` relative to table size
- Disk usage grows despite stable row count

### Pitfall 4: Missing WHERE Clause in Index

**What goes wrong:** Composite index not used even though all columns present in query
**Why it happens:**
- Index columns in wrong order (must match WHERE clause order)
- Missing left-most column in WHERE (B-tree requires left-to-right matching)
- OR conditions prevent index usage

**How to avoid:**
- Index column order: most selective first, then others left-to-right
- Include all WHERE columns in multi-column index
- Rewrite OR as UNION or use GIN index for OR conditions

**Warning signs:**
- EXPLAIN shows "Seq Scan" despite composite index on exact columns
- "Filter" step appears in EXPLAIN output (post-scan filtering)

## Code Examples

Verified patterns from official sources:

### Finding Slow Queries

```sql
-- Source: https://supabase.com/docs/guides/database/extensions/pg_stat_statements
-- Most time-consuming queries (cumulative)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Slowest individual queries (by max time)
SELECT
  query,
  calls,
  max_exec_time,
  mean_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY max_exec_time DESC
LIMIT 10;
```

### Analyzing Query Plans

```sql
-- Source: https://www.postgresql.org/docs/current/using-explain.html
-- ALWAYS use ANALYZE and BUFFERS for real performance data
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  u.id, u.name, u.floor,
  COUNT(r.id) as room_count
FROM units u
LEFT JOIN rooms r ON r.unit_id = u.id
WHERE u.building_id = 'abc-123'
  AND u.unit_type = 'apartment'
GROUP BY u.id
ORDER BY u.floor DESC;

-- Look for in output:
-- 1. "Seq Scan" (BAD) vs "Index Scan" (GOOD)
-- 2. Estimated rows vs Actual rows (large difference = stale stats)
-- 3. "Buffers: shared read" (disk I/O, want to minimize)
```

### Using Index Advisor

```sql
-- Source: https://supabase.com/docs/guides/database/extensions/index_advisor
-- Get index recommendations for a specific query
SELECT * FROM index_advisor('
  SELECT
    u.id, u.name, u.floor, u.tenant_name,
    r.id as room_id, r.name as room_name, r.condition
  FROM units u
  LEFT JOIN rooms r ON r.unit_id = u.id
  WHERE u.building_id = $1
    AND u.unit_type = ''apartment''
  ORDER BY u.floor DESC
');

-- Returns:
-- startup_cost_before | startup_cost_after | index_statements
-- Shows DDL commands to create recommended indexes
```

### React cache() Wrapper Pattern

```typescript
// Source: https://nextjs.org/docs/app/getting-started/fetching-data
import { cache } from 'react'
import 'server-only'
import { createClient } from '@/lib/supabase/server'

// Pattern: Wrap each query function with cache()
export const getUnitWithRooms = cache(async (unitId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('units')
    .select(`
      id, name, floor, position, unit_type, tenant_name,
      rooms (id, name, room_type, condition)
    `)
    .eq('id', unitId)
    .single()

  if (error) throw error
  return data
})

// Optional: Preload pattern for parallel data fetching
export const preloadUnit = (unitId: string) => {
  void getUnitWithRooms(unitId) // Fire-and-forget, result cached
}
```

### Creating Indexes with Best Practices

```sql
-- Source: https://www.postgresql.org/docs/current/sql-createindex.html
-- ALWAYS use CONCURRENTLY for production (non-blocking)
-- ALWAYS use IF NOT EXISTS for idempotency

-- Foreign key index (most common need)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_unit_id
  ON rooms(unit_id);

-- Composite index for common WHERE pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_unit_status
  ON renovation_projects(unit_id, status);

-- Partial index for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_projects
  ON renovation_projects(unit_id, planned_start_date)
  WHERE status IN ('planned', 'active', 'blocked');

-- Descending order for ORDER BY DESC queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_building_floor
  ON units(building_id, floor DESC);
```

### Verifying Index Usage

```sql
-- Source: https://www.postgresql.org/docs/current/monitoring-stats.html
-- Check which indexes are actually being used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Unused indexes (candidates for removal)
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY tablename, indexname;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual query timing in app code | pg_stat_statements extension | PostgreSQL 9.2+ (2012) | Database-level tracking, no app changes needed |
| Trial-and-error index creation | HypoPG + index_advisor | ~2020 (Supabase adoption) | Test indexes without resource cost, get automated recommendations |
| fetch() deduplication only | React cache() for all async | React 19 (2024) | Works with ORMs and direct DB clients, not just fetch |
| Separate caching library | Next.js built-in caching layers | Next.js 13+ (2022) | Unified caching strategy, less boilerplate |
| useEffect client fetching | Server Components direct DB access | Next.js 13+ (2022) | Eliminates waterfalls, reduces bundle size, better security |

**Deprecated/outdated:**
- **Custom query logging middleware:** Replaced by pg_stat_statements (more accurate, lower overhead)
- **Client-side GraphQL deduplication (Apollo, Relay):** Unnecessary with Server Components + React cache()
- **Separate query builder cache layers:** React cache() handles this at framework level
- **pg_stat_monitor over pg_stat_statements:** pg_stat_statements is standard, sufficient for 99% of cases

## Open Questions

Things that couldn't be fully resolved:

1. **BRIN vs B-tree for time-series audit logs**
   - What we know: BRIN better for append-only timestamp columns, but audit_logs table may not be large enough yet
   - What's unclear: At what table size does BRIN become worth the tradeoff (slower point lookups)?
   - Recommendation: Start with B-tree, migrate to BRIN if audit_logs exceeds 1M rows and queries are primarily range-based

2. **GIN index for JSONB columns**
   - What we know: index_advisor doesn't test GIN indexes, some tables may have JSONB columns
   - What's unclear: Whether any queries filter on JSONB fields (need to check pg_stat_statements)
   - Recommendation: Profile first, add GIN indexes only if JSONB queries appear in slow query report

3. **Cache hit ratio threshold**
   - What we know: Supabase docs recommend >99% cache hit rate
   - What's unclear: Current cache hit ratio for this project
   - Recommendation: Run `supabase db inspect db cache-hit` as first diagnostic step

4. **Materialized views vs indexes for dashboard aggregations**
   - What we know: Existing `unit_condition_summary` view already in schema, but not clear if it's materialized
   - What's unclear: Whether dashboard queries would benefit more from materialized view refresh vs better indexes
   - Recommendation: Check view definition, consider materializing if refresh frequency acceptable (hourly/daily)

## Sources

### Primary (HIGH confidence)

- [Supabase pg_stat_statements Extension](https://supabase.com/docs/guides/database/extensions/pg_stat_statements) - Query performance monitoring
- [Supabase index_advisor Extension](https://supabase.com/docs/guides/database/extensions/index_advisor) - Index recommendations
- [Supabase Debugging and Monitoring](https://supabase.com/docs/guides/database/inspect) - Query performance tools
- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html) - Query plan analysis
- [PostgreSQL Indexes Documentation](https://www.postgresql.org/docs/current/indexes.html) - Index types and usage
- [Next.js Data Fetching Guide](https://nextjs.org/docs/app/getting-started/fetching-data) - Server Components patterns
- [Next.js Caching Guide](https://nextjs.org/docs/app/guides/caching) - React cache() usage

### Secondary (MEDIUM confidence)

- [EnterpriseDB EXPLAIN ANALYZE Guide](https://www.enterprisedb.com/blog/postgresql-query-optimization-performance-tuning-with-explain-analyze) - Query optimization workflow
- [OneUpTime EXPLAIN ANALYZE Guide (Jan 2026)](https://oneuptime.com/blog/post/2026-01-21-postgresql-explain-analyze/view) - Recent best practices
- [Crunchy Data BRIN Indexes](https://www.crunchydata.com/blog/postgres-indexing-when-does-brin-win) - BRIN vs B-tree guidance
- [Medium: N+1 Query Problem](https://medium.com/databases-in-simple-words/the-n-1-database-query-problem-a-simple-explanation-and-solutions-ef11751aef8a) - N+1 definition and solutions
- [PlanetScale N+1 Query Guide](https://planetscale.com/blog/what-is-n-1-query-problem-and-how-to-solve-it) - N+1 prevention patterns

### Tertiary (LOW confidence)

- [DEV Community: Next.js Caching 2026](https://dev.to/marufrahmanlive/nextjs-caching-and-rendering-complete-guide-for-2026-ij2) - Community guide, not official
- [Medium: Next.js Advanced Patterns 2026](https://medium.com/@beenakumawat002/next-js-app-router-advanced-patterns-for-2026-server-actions-ppr-streaming-edge-first-b76b1b3dcac7) - Community patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools verified via official Supabase and PostgreSQL documentation, Context7
- Architecture: HIGH - Patterns from Next.js official docs and PostgreSQL documentation
- Pitfalls: MEDIUM-HIGH - Combination of official docs and verified community sources

**Research date:** 2026-02-05
**Valid until:** 2026-04-05 (60 days - stable PostgreSQL/Supabase ecosystem)

**Codebase context verified:**
- Existing migrations show basic indexes on foreign keys (001_initial_schema.sql)
- Some composite indexes present (e.g., idx_work_orders_dates)
- Dashboard queries in `src/lib/dashboard/` identified as optimization targets
- Heatmap query shows N+1 risk pattern (sequential queries for summaries, then units+rooms)
- No React cache() wrappers currently present - optimization opportunity
