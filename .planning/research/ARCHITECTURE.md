# Architecture Patterns

**Domain:** Multi-Tenant Property Management (Supabase + Next.js App Router)
**Researched:** 2026-02-18
**Confidence:** HIGH

## Reference Architecture: Multi-Tenant Property Management

### Current State (v3.1)

```
[Next.js App Router] --> [API Routes + Middleware] --> [Supabase Client] --> [PostgreSQL]
                                  |
                          [Session Cookie]
                          [x-user-id header]
                          [x-user-role header]
                          [x-user-permissions header]

Context Providers:
  BuildingProvider (session-only building selection)
  ConnectivityProvider (online/offline state)
  PushContext (push notifications)

Navigation:
  Header (PropertySelector dropdown) + MobileNav (8-item bottom bar)

Auth:
  PIN (internal) | Email+Password (tenants) | Magic Link (contractors)
  Custom session cookie (NOT Supabase Auth JWT)
```

**Key observation:** The app currently uses a custom session system (cookie-based with `x-user-*` headers set by middleware), NOT Supabase Auth's JWT system. This has direct implications for the multi-tenant architecture because `auth.uid()` and `auth.jwt()` in RLS policies depend on Supabase Auth sessions.

### Target State (v4.0)

```
[Next.js App Router]
  |
  +--> [Middleware] -- validates session, resolves org context
  |         |
  |    [x-user-id, x-organization-id headers]
  |
  +--> [API Routes] -- read org context from headers
  |         |
  |    [Supabase Client with anon key]
  |         |
  |    [PostgreSQL + RLS]
  |         |-- organization_id on all tenant tables
  |         |-- RLS policies check organization_id
  |         |-- SECURITY DEFINER helper functions
  |         |-- Hierarchical FK relationships
  |
  +--> [OrganizationProvider] (React Context)
           |
           +--> [MandateProvider] (React Context, child of Org)
                    |
                    +--> [BuildingProvider] (existing, scoped to mandate)

Navigation:
  Header (OrgSwitcher + Breadcrumbs) + MobileNav (simplified, context-aware)

Storage:
  Bucket paths: {organization_id}/{mandate_id}/{entity_type}/{filename}
```

## Architecture Layers

### Layer 1: Data Model (PostgreSQL)

#### Swiss Property Hierarchy

The industry-standard hierarchy for Swiss property management (Fairwalter, Rimo R5, ImmoTop2):

```
organizations (Verwaltung)
  |-- 1:N --> mandates (Verwaltungsmandat)
  |               |-- N:1 --> owners (Eigentuemer)
  |               |-- 1:N --> properties (Liegenschaft)
  |                               |-- 1:N --> buildings (Gebaeude)
  |                                               |-- 1:N --> units (Einheit)
  |                                                             |-- 1:N --> rooms (Raum)
  |                                                             |-- 1:N --> tenancies (Mietverhaeltnis)
  |
  |-- 1:N --> organization_members (user<->org junction)
```

#### Entity Definitions

```sql
-- =============================================
-- ORGANIZATIONS (Verwaltung)
-- =============================================
-- The top-level tenant boundary. All data isolation happens here.
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- e.g., "KEWA AG"
  slug TEXT UNIQUE NOT NULL,             -- URL-safe: "kewa-ag"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ORGANIZATION MEMBERS (user<->org junction)
-- =============================================
-- Maps users to organizations with roles.
-- A user CAN belong to multiple organizations (e.g., consultant).
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  is_default BOOLEAN DEFAULT false,     -- Default org on login
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_user_default ON organization_members(user_id, is_default);

-- =============================================
-- OWNERS (Eigentuemer)
-- =============================================
-- Property owners. One owner can have multiple mandates.
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  owner_type TEXT NOT NULL DEFAULT 'private'
    CHECK (owner_type IN ('private', 'company', 'stwe_community')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_owners_org ON owners(organization_id);

-- =============================================
-- MANDATES (Verwaltungsmandat)
-- =============================================
-- Legal contract between Verwaltung and Eigentuemer.
-- Scopes a portfolio of properties under management.
CREATE TABLE mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  owner_id UUID NOT NULL REFERENCES owners(id),
  name TEXT NOT NULL,                     -- e.g., "Mandat Musterstrasse"
  mandate_type TEXT NOT NULL DEFAULT 'rental'
    CHECK (mandate_type IN ('rental', 'stwe', 'mixed')),
  start_date DATE NOT NULL,
  end_date DATE,                          -- NULL = ongoing
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mandates_org ON mandates(organization_id);
CREATE INDEX idx_mandates_owner ON mandates(owner_id);
CREATE INDEX idx_mandates_org_active ON mandates(organization_id, is_active);

-- =============================================
-- PROPERTIES (Liegenschaft) - MODIFIED
-- =============================================
-- Add organization_id and mandate_id to existing table.
-- Liegenschaft = land parcel / property complex (NOT a building).
ALTER TABLE properties
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN mandate_id UUID REFERENCES mandates(id),
  ADD COLUMN property_type TEXT DEFAULT 'rental'
    CHECK (property_type IN ('rental', 'stwe', 'mixed'));

CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_properties_mandate ON properties(mandate_id);
CREATE INDEX idx_properties_org_active ON properties(organization_id) WHERE property_type IS NOT NULL;

-- =============================================
-- BUILDINGS (Gebaeude) - MODIFIED
-- =============================================
-- Add organization_id for direct RLS without joins.
-- Denormalized from properties for query performance.
ALTER TABLE buildings
  ADD COLUMN organization_id UUID REFERENCES organizations(id);

CREATE INDEX idx_buildings_org ON buildings(organization_id);

-- =============================================
-- TENANCIES (Mietverhaeltnis)
-- =============================================
-- Time-bound rental agreements on units.
CREATE TABLE tenancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  tenant_phone TEXT,
  rent_amount DECIMAL(10,2),
  rent_currency TEXT DEFAULT 'CHF',
  start_date DATE NOT NULL,
  end_date DATE,                          -- NULL = ongoing
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenancies_org ON tenancies(organization_id);
CREATE INDEX idx_tenancies_unit ON tenancies(unit_id);
CREATE INDEX idx_tenancies_unit_active ON tenancies(unit_id, is_active);
```

#### Denormalization Strategy: organization_id on Leaf Tables

**Decision:** Add `organization_id` directly to leaf tables (buildings, units, rooms, tasks, work_orders, etc.) even though it can be derived through FK joins.

**Rationale:**
1. RLS policies with subqueries (joins) have 10-100x performance penalty vs. direct column checks ([Supabase RLS Performance Guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv))
2. `organization_id = user_organization_id()` is an initPlan-cached equality check -- near zero cost per row
3. Subquery policies like `building_id IN (SELECT b.id FROM buildings b JOIN properties p ON ... WHERE p.organization_id = ...)` execute per-row -- catastrophic on large tables
4. The denormalization cost is one UUID column (16 bytes) per row -- trivial

**Tables requiring organization_id addition (68 tables):**
- Direct: properties, buildings, units, rooms, projects, renovation_projects, tasks, work_orders, partners, offers, invoices, expenses, payments, media, audit_log, condition_history, comments, templates, template_tasks, template_phases, template_quality_gates, template_dependencies, template_packages, parking_spots, knowledge_articles, knowledge_categories, knowledge_attachments, purchase_orders, deliveries, inventory_movements, purchase_order_allocations, change_orders, change_order_approval_tokens, inspections, inspection_defects, inspection_photos, tickets, ticket_messages, ticket_attachments, notifications, notification_preferences, push_subscriptions, tenant_users, app_settings
- New: organizations, organization_members, owners, mandates, tenancies

**Tables that do NOT need organization_id:**
- roles, permissions, role_permissions (global system tables)
- magic_links (scoped by work_order, which has org_id)

#### STWE Preparation

```sql
-- Add STWE fields to units (nullable, conditional on property_type)
ALTER TABLE units
  ADD COLUMN wertquote DECIMAL(5,4),     -- Ownership fraction (0.0001 to 1.0000)
  ADD COLUMN eigentumsperiode DATERANGE, -- Ownership period
  ADD COLUMN stwe_owner_id UUID REFERENCES owners(id); -- Unit owner in STWE

-- STWE-specific: condominium community fund
ALTER TABLE properties
  ADD COLUMN erneuerungsfonds_balance DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN erneuerungsfonds_target DECIMAL(12,2);
```

### Layer 2: Security (RLS + Auth)

#### Auth Architecture Decision

**Critical decision:** The current app uses custom PIN-based sessions, NOT Supabase Auth JWT. This means `auth.uid()` and `auth.jwt()` return NULL in RLS policies for internal users.

**Two options:**

| Option | Approach | Migration Cost | RLS Compatibility |
|--------|----------|---------------|-------------------|
| A: Migrate to Supabase Auth | Move PIN users to Supabase Auth, use custom access token hook for org_id | HIGH (rewrite auth) | Native -- auth.jwt() works |
| B: Application-layer RLS context | Use `SET LOCAL` to inject org context per request, keep PIN auth | LOW (add to middleware) | Works via current_setting() |

**Recommendation: Option B (application-layer context) for v4.0.**

Rationale:
- PROJECT.md explicitly states: "Auth-Umbau auf spaeter -- Fokus v4.0 auf Datenmodell, Auth kommt in separatem Milestone"
- Migrating auth is a separate milestone -- do not couple it with data model changes
- Application-layer context via `SET LOCAL` is well-established in Postgres multi-tenant patterns
- Can later migrate to Supabase Auth + JWT claims without changing RLS policies (just change how the setting is populated)

#### RLS Context Pattern (Option B)

```sql
-- =============================================
-- HELPER: Get current organization from request context
-- =============================================
-- Set per-request via Supabase client RPC or SET LOCAL
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================
-- HELPER: Check organization membership
-- =============================================
CREATE OR REPLACE FUNCTION is_org_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_org_id
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Setting the context per-request:**

```typescript
// In API route handler or middleware-injected wrapper
async function withOrgContext(supabase: SupabaseClient, orgId: string) {
  // SET LOCAL scopes to current transaction only -- no connection pool leakage
  await supabase.rpc('set_org_context', { org_id: orgId })
}

// Postgres function called by RPC
CREATE OR REPLACE FUNCTION set_org_context(org_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id::text, true);
  -- true = LOCAL (transaction-scoped, no pool contamination)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**IMPORTANT: `set_config(..., true)` means LOCAL.** The setting is automatically reset when the transaction ends. This prevents connection pool contamination, which is the biggest risk with application-layer context.

#### RLS Policy Structure

**Tier 1: Direct organization_id tables (properties, mandates, owners, etc.)**

```sql
-- SELECT: Only rows in current organization
CREATE POLICY org_select ON properties
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());

-- INSERT: Must specify current organization
CREATE POLICY org_insert ON properties
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = current_organization_id());

-- UPDATE: Can only update own org's rows, cannot change org_id
CREATE POLICY org_update ON properties
  FOR UPDATE TO authenticated
  USING (organization_id = current_organization_id())
  WITH CHECK (organization_id = current_organization_id());

-- DELETE: Can only delete own org's rows
CREATE POLICY org_delete ON properties
  FOR DELETE TO authenticated
  USING (organization_id = current_organization_id());
```

**Tier 2: Denormalized leaf tables (buildings, units, rooms, tasks, etc.)**

Same pattern as Tier 1 -- because we denormalize organization_id to all tables, every policy is a simple equality check. No subqueries needed.

```sql
-- Every leaf table uses the same pattern
CREATE POLICY org_select ON buildings
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());
-- ... (INSERT, UPDATE, DELETE same pattern)
```

**Tier 3: Role-specific policies (tenant, contractor)**

The existing `is_internal_user()`, `is_tenant_of_unit()`, and `is_contractor_for_work_order()` functions remain but gain an additional organization_id check:

```sql
-- Updated: Internal users see all data IN THEIR ORGANIZATION
CREATE POLICY internal_access ON units
  FOR ALL TO authenticated
  USING (
    organization_id = current_organization_id()
    AND is_internal_user(auth.uid())
  );

-- Updated: Tenants see their unit IN THEIR ORGANIZATION
CREATE POLICY tenant_access ON units
  FOR SELECT TO authenticated
  USING (
    organization_id = current_organization_id()
    AND is_tenant_of_unit(auth.uid(), id)
  );
```

#### Future Auth Hook (When Migrating to Supabase Auth)

When the auth migration milestone happens, the custom access token hook replaces `set_org_context`:

```sql
-- Custom Access Token Hook (future -- when migrating to Supabase Auth)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  org_id UUID;
BEGIN
  -- Look up user's default organization
  SELECT om.organization_id INTO org_id
  FROM organization_members om
  WHERE om.user_id = (event->>'user_id')::UUID
    AND om.is_default = true
  LIMIT 1;

  claims := event->'claims';

  -- Ensure app_metadata exists
  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Inject organization_id
  claims := jsonb_set(claims, '{app_metadata, organization_id}', to_jsonb(org_id));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON organization_members TO supabase_auth_admin;
```

Then `current_organization_id()` changes to read from JWT instead:

```sql
-- Swap implementation when auth migrates (policies unchanged)
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    -- Try JWT first (Supabase Auth)
    (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID,
    -- Fall back to session setting (legacy PIN auth)
    NULLIF(current_setting('app.current_organization_id', true), '')::UUID
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

This design means RLS policies never change -- only the implementation of `current_organization_id()` changes.

### Layer 3: Application (Next.js)

#### Context Provider Hierarchy

```
<OrganizationProvider>          -- NEW: Selected org, available orgs
  <MandateProvider>             -- NEW: Selected mandate within org
    <BuildingProvider>          -- EXISTING: Selected building (scoped to mandate)
      <ConnectivityProvider>    -- EXISTING: Online/offline
        <PushContext>           -- EXISTING: Push notifications
          {children}
        </PushContext>
      </ConnectivityProvider>
    </BuildingProvider>
  </MandateProvider>
</OrganizationProvider>
```

**OrganizationContext:**

```typescript
interface OrganizationContextValue {
  // Current organization
  currentOrg: Organization | null
  // All organizations user belongs to
  availableOrgs: Organization[]
  // Switch organization (triggers data refetch)
  switchOrg: (orgId: string) => Promise<void>
  // Loading state
  isLoading: boolean
}
```

**MandateContext:**

```typescript
interface MandateContextValue {
  // Current mandate (within current org)
  currentMandate: Mandate | null
  // All mandates in current org
  availableMandates: Mandate[]
  // Switch mandate (filters properties/buildings)
  switchMandate: (mandateId: string | 'all') => void
  // Loading state
  isLoading: boolean
}
```

**Key behavior:**
- On org switch: clear mandate selection, clear building selection, refetch all data
- On mandate switch: clear building selection, filter properties to mandate
- BuildingProvider scopes to properties within current mandate (or all if mandate = 'all')

#### Middleware Enhancement

```typescript
// middleware.ts -- enhanced for organization context
export async function middleware(request: NextRequest) {
  // ... existing session validation ...

  // Resolve organization context
  const orgId = request.cookies.get('organization_id')?.value
    || session.defaultOrganizationId

  // Set org context headers for API routes
  const response = NextResponse.next()
  response.headers.set('x-organization-id', orgId || '')

  // ... existing headers ...
  return response
}
```

#### API Route Pattern

```typescript
// Pattern for all API routes: read org from header, set Supabase context
export async function GET(request: NextRequest) {
  const orgId = request.headers.get('x-organization-id')
  if (!orgId) {
    return NextResponse.json({ error: 'Organization required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Set organization context for RLS
  await supabase.rpc('set_org_context', { org_id: orgId })

  // Now all queries are automatically scoped by RLS
  const { data } = await supabase.from('properties').select('*')
  // ^ Returns only properties in current org

  return NextResponse.json({ properties: data })
}
```

**Wrapper helper to reduce boilerplate:**

```typescript
// lib/supabase/with-org.ts
export async function createOrgClient(request: NextRequest) {
  const orgId = request.headers.get('x-organization-id')
  if (!orgId) throw new Error('Organization context required')

  const supabase = await createClient()
  await supabase.rpc('set_org_context', { org_id: orgId })

  return { supabase, orgId }
}
```

### Layer 4: Navigation Architecture

#### Current Navigation (v3.1)

```
Header:  [KEWA logo] [PropertySelector dropdown] [spacer] [Notifications] [Logout]
Footer:  [Uebersicht] [Liegenschaft] [Gebaeude] [Aufgaben] [Projekte] [Lieferanten] [Berichte] [Einstellungen]
```

**Problems:**
- 8 footer items -- too many for mobile (tiny touch targets)
- No organization/mandate context in navigation
- Property vs Building terminology confusion
- Flat navigation -- no hierarchy awareness

#### Target Navigation (v4.0)

```
Header:  [OrgSwitcher] [Breadcrumbs: Org > Mandate > Liegenschaft > Gebaeude] [Notifications] [Logout]
Footer:  [Uebersicht] [Objekte] [Aufgaben] [Kosten] [Mehr...]
```

**OrgSwitcher (replaces PropertySelector):**

```typescript
// Header component -- replaces PropertySelector
function OrgSwitcher() {
  const { currentOrg, availableOrgs, switchOrg } = useOrganization()

  // Single-org users: show org name as static text (no dropdown)
  if (availableOrgs.length <= 1) {
    return <span className="font-semibold">{currentOrg?.name}</span>
  }

  // Multi-org users: dropdown to switch
  return (
    <Dropdown
      value={currentOrg?.id}
      options={availableOrgs.map(o => ({ value: o.id, label: o.name }))}
      onChange={switchOrg}
    />
  )
}
```

**Breadcrumb component:**

```typescript
// components/navigation/Breadcrumbs.tsx
'use client'

import { usePathname } from 'next/navigation'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useMandate } from '@/contexts/MandateContext'

// Map URL segments to German labels
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Uebersicht',
  liegenschaft: 'Liegenschaft',
  gebaude: 'Gebaeude',
  einheit: 'Einheit',
  aufgaben: 'Aufgaben',
  projekte: 'Projekte',
  kosten: 'Kosten',
  // ... etc
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const { currentOrg } = useOrganization()
  const { currentMandate } = useMandate()

  const segments = pathname.split('/').filter(Boolean)
  // segments: ['dashboard', 'liegenschaft', '{id}', 'einheit', '{id}']

  const crumbs = segments.map((segment, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = SEGMENT_LABELS[segment] || segment
    return { href, label }
  })

  // Prepend org and mandate context
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {currentOrg && <span className="text-gray-500">{currentOrg.name}</span>}
      {currentMandate && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-500">{currentMandate.name}</span>
        </>
      )}
      {crumbs.map((crumb, i) => (
        <Fragment key={crumb.href}>
          <ChevronRight className="h-3 w-3" />
          {i === crumbs.length - 1 ? (
            <span className="font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-gray-500 hover:text-gray-700">
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
```

**Footer simplification (5 items):**

```typescript
const navItems = [
  { href: '/dashboard', label: 'Uebersicht', icon: LayoutDashboard },
  { href: '/dashboard/objekte', label: 'Objekte', icon: Building2 },
  // "Objekte" = combined Liegenschaft + Gebaeude + Einheit drill-down
  { href: '/dashboard/aufgaben', label: 'Aufgaben', icon: CheckSquare },
  { href: '/dashboard/kosten', label: 'Kosten', icon: Receipt },
  { href: '/dashboard/mehr', label: 'Mehr', icon: MoreHorizontal },
  // "Mehr" = Projekte, Lieferanten, Berichte, Einstellungen, Knowledge, etc.
]
```

**"Objekte" drill-down URL structure:**

```
/dashboard/objekte                           -- All properties in current mandate
/dashboard/objekte/[propertyId]              -- Property detail (buildings list)
/dashboard/objekte/[propertyId]/[buildingId] -- Building detail (units list + heatmap)
/dashboard/objekte/[propertyId]/[buildingId]/[unitId] -- Unit detail (rooms)
```

### Layer 5: Storage Multi-Tenancy

#### Bucket Path Convention

```
property-media/
  {organization_id}/
    {property_id}/
      {building_id}/
        {entity_type}/
          {filename}

Example:
  property-media/
    a1b2c3d4-org-uuid/
      e5f6g7h8-property-uuid/
        i9j0k1l2-building-uuid/
          rooms/
            bathroom-before-2026-02-18.jpg
```

#### Storage RLS Policies

```sql
-- INSERT: User can upload to their org's folder
CREATE POLICY org_media_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = current_organization_id()::text
  );

-- SELECT: User can view their org's files
CREATE POLICY org_media_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = current_organization_id()::text
  );

-- DELETE: User can delete their org's files
CREATE POLICY org_media_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = current_organization_id()::text
  );
```

### Layer 6: Migration Architecture

#### Zero-Downtime Migration Strategy

The migration modifies 68 existing tables. It MUST be phased to avoid downtime.

**Phase 1: Schema additions (safe -- no locks)**

```sql
-- Step 1: Create new tables (organizations, mandates, owners, tenancies, org_members)
-- These are new tables, no impact on existing data

-- Step 2: Add nullable columns to existing tables
ALTER TABLE properties ADD COLUMN organization_id UUID;
ALTER TABLE properties ADD COLUMN mandate_id UUID;
ALTER TABLE buildings ADD COLUMN organization_id UUID;
ALTER TABLE units ADD COLUMN organization_id UUID;
-- ... for all 68 tables

-- Step 3: Create indexes CONCURRENTLY (no table locks)
CREATE INDEX CONCURRENTLY idx_properties_org ON properties(organization_id);
CREATE INDEX CONCURRENTLY idx_buildings_org ON buildings(organization_id);
-- ... for all tables
```

**Phase 2: Seed KEWA organization and backfill**

```sql
-- Step 1: Create KEWA AG organization
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000100', 'KEWA AG', 'kewa-ag');

-- Step 2: Create owner for existing property
INSERT INTO owners (id, organization_id, name, owner_type)
VALUES (
  '00000000-0000-0000-0000-000000000200',
  '00000000-0000-0000-0000-000000000100',
  'KEWA AG Eigentuemer',
  'company'
);

-- Step 3: Create mandate
INSERT INTO mandates (id, organization_id, owner_id, name, mandate_type, start_date)
VALUES (
  '00000000-0000-0000-0000-000000000300',
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000200',
  'Hauptmandat KEWA',
  'rental',
  '2025-01-01'
);

-- Step 4: Backfill organization_id (batch by 1000 rows)
-- For small tables (<1000 rows), single UPDATE is fine
UPDATE properties SET
  organization_id = '00000000-0000-0000-0000-000000000100',
  mandate_id = '00000000-0000-0000-0000-000000000300'
WHERE organization_id IS NULL;

UPDATE buildings SET
  organization_id = '00000000-0000-0000-0000-000000000100'
WHERE organization_id IS NULL;

-- ... for all tables
```

**Phase 3: Add NOT NULL constraints**

```sql
-- Only after ALL rows are backfilled
ALTER TABLE properties ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE buildings ALTER COLUMN organization_id SET NOT NULL;
-- ... for all tables
```

**Phase 4: Enable RLS with policies**

```sql
-- Drop old permissive policies
DROP POLICY IF EXISTS "buildings_select_all" ON buildings;
DROP POLICY IF EXISTS "buildings_insert_all" ON buildings;
DROP POLICY IF EXISTS "buildings_update_all" ON buildings;
DROP POLICY IF EXISTS "buildings_delete_all" ON buildings;

-- Create org-scoped policies (see Layer 2 above)
CREATE POLICY org_select ON buildings
  FOR SELECT TO authenticated
  USING (organization_id = current_organization_id());
-- ...
```

**Phase 5: Create org_members for existing users**

```sql
-- Map existing KEWA and Imeri users to KEWA AG organization
INSERT INTO organization_members (organization_id, user_id, role_id, is_default)
SELECT
  '00000000-0000-0000-0000-000000000100',
  u.id,
  u.role_id,
  true
FROM users u
WHERE u.is_active = true;
```

## Component Architecture

### Component Boundary Map

```
src/
  contexts/
    OrganizationContext.tsx     -- NEW: Org selection state
    MandateContext.tsx          -- NEW: Mandate selection state
    BuildingContext.tsx         -- EXISTING: Building selection (scoped)
    ConnectivityContext.tsx     -- EXISTING: Unchanged
    PushContext.tsx             -- EXISTING: Unchanged

  components/
    navigation/
      OrgSwitcher.tsx          -- NEW: Replaces PropertySelector
      Breadcrumbs.tsx          -- NEW: Hierarchical path display
      mobile-nav.tsx           -- MODIFIED: 5 items instead of 8
      header.tsx               -- MODIFIED: OrgSwitcher + Breadcrumbs

  app/
    dashboard/
      layout.tsx               -- MODIFIED: Wrap with OrganizationProvider, MandateProvider
      objekte/                 -- NEW: Replaces liegenschaft/ and gebaude/
        page.tsx               -- Properties list (scoped to mandate)
        [propertyId]/
          page.tsx             -- Property detail (buildings list)
          [buildingId]/
            page.tsx           -- Building detail (units + heatmap)
            [unitId]/
              page.tsx         -- Unit detail (rooms)

  lib/
    supabase/
      with-org.ts              -- NEW: Helper to create org-scoped client
      server.ts                -- EXISTING: Unchanged
      client.ts                -- EXISTING: Unchanged
```

### Data Flow: Organization Context Resolution

```
1. User logs in (PIN/email/magic-link)
   |
2. Session created with user_id, role
   |
3. Middleware reads session cookie
   |-- Look up user's organizations from organization_members
   |-- Use default org (is_default=true) or cookie preference
   |-- Set x-organization-id header
   |
4. Dashboard layout loads
   |-- OrganizationProvider fetches available orgs
   |-- Sets currentOrg from header/cookie
   |
5. API request made (e.g., GET /api/properties)
   |-- Read x-organization-id from header
   |-- Call supabase.rpc('set_org_context', { org_id })
   |-- Execute query (RLS automatically scopes)
   |-- Return org-scoped results
   |
6. User switches organization (dropdown)
   |-- Update cookie: organization_id = new_org_id
   |-- Clear mandate/building selections
   |-- Router.refresh() to re-fetch all data
   |-- Middleware picks up new cookie on next request
```

## Key Patterns

### Pattern 1: Organization-Scoped RPC Wrapper

**What:** Every API call sets organization context before querying.

**Why:** Prevents accidental cross-tenant data access. RLS enforces at database level.

```typescript
// lib/supabase/with-org.ts
import { createClient } from './server'
import { NextRequest } from 'next/server'

export async function createOrgClient(request: NextRequest) {
  const orgId = request.headers.get('x-organization-id')
  if (!orgId) {
    throw new OrgContextError('No organization context')
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('set_org_context', { org_id: orgId })
  if (error) {
    throw new OrgContextError(`Failed to set org context: ${error.message}`)
  }

  return { supabase, orgId }
}

export class OrgContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrgContextError'
  }
}
```

### Pattern 2: Denormalized organization_id with Trigger Sync

**What:** Keep organization_id in sync across parent-child relationships using triggers.

**Why:** Prevents orphaned child records or cross-tenant FK violations.

```sql
-- When a building is inserted/updated, inherit org_id from property
CREATE OR REPLACE FUNCTION sync_building_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM properties WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_building_org
  BEFORE INSERT OR UPDATE OF property_id ON buildings
  FOR EACH ROW EXECUTE FUNCTION sync_building_org_id();

-- Similar triggers for: units (from buildings), rooms (from units),
-- tasks (from projects), work_orders (from tasks), etc.
```

### Pattern 3: Cookie-Based Org Persistence

**What:** Store selected organization in an httpOnly cookie.

**Why:** Persists across page refreshes without localStorage. Available in middleware.

```typescript
// On org switch
function switchOrg(orgId: string) {
  document.cookie = `organization_id=${orgId}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
  router.refresh()
}

// In middleware
const orgId = request.cookies.get('organization_id')?.value
```

### Pattern 4: Hierarchical URL-Based Navigation

**What:** URL structure mirrors data hierarchy. Breadcrumbs derived from URL.

**Why:** Deep links work. Back button works. Shareable URLs.

```
/dashboard/objekte                    -- All properties
/dashboard/objekte/[pid]              -- Specific property
/dashboard/objekte/[pid]/[bid]        -- Specific building
/dashboard/objekte/[pid]/[bid]/[uid]  -- Specific unit
```

### Pattern 5: Progressive RLS Enablement

**What:** Enable RLS with permissive policies first, then tighten.

**Why:** Prevents the "RLS enabled but no policies = empty results" pitfall.

```sql
-- Step 1: Enable RLS with permissive "allow all" policy
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY temp_allow_all ON new_table FOR ALL USING (true);

-- Step 2: Create proper org-scoped policy
CREATE POLICY org_access ON new_table
  FOR ALL TO authenticated
  USING (organization_id = current_organization_id());

-- Step 3: Drop permissive policy (now org-scoped policy handles access)
DROP POLICY temp_allow_all ON new_table;
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Subquery-Based RLS Policies

**What:** Using joins or subqueries in RLS USING clauses.
**Why bad:** Executes per-row. On 10K+ rows, query times go from 2ms to 500ms+.
**Instead:** Denormalize organization_id to every table. One equality check per row.

### Anti-Pattern 2: Global SET ROLE for Context

**What:** Using `SET ROLE` or `SET app.org_id` without LOCAL scope.
**Why bad:** Poisons the connection pool. Next request on same connection inherits wrong org.
**Instead:** Always use `set_config('app.current_organization_id', value, true)` -- the `true` parameter means LOCAL (transaction-scoped).

### Anti-Pattern 3: Client-Side Tenant Filtering

**What:** Adding `.eq('organization_id', orgId)` to every client query.
**Why bad:** Bypassable via browser DevTools. Inconsistent enforcement. Easy to forget.
**Instead:** RLS enforces at database level. Application queries don't need org filter.

### Anti-Pattern 4: Compound Primary Keys for Multi-Tenancy

**What:** Changing all PKs to `(id, organization_id)`.
**Why bad:** Breaks ALL existing FK references across 68 tables. Massive migration. Supabase client expects UUID PKs.
**Instead:** Keep `id UUID` as PK. Add `organization_id` as indexed column. Use RLS for isolation. Use triggers for cross-tenant FK protection.

### Anti-Pattern 5: Nested Context Providers Without Memo

**What:** Context providers that cause full subtree re-renders on every state change.
**Why bad:** Org switch triggers re-render of entire app tree.
**Instead:** Memoize context values. Split read/write contexts if needed.

```typescript
// BAD: New object on every render
<OrgContext.Provider value={{ org, setOrg }}>

// GOOD: Memoized
const value = useMemo(() => ({ org, setOrg }), [org])
<OrgContext.Provider value={value}>
```

## Scalability Considerations

| Concern | At 1 org (KEWA) | At 10 orgs | At 100 orgs |
|---------|-----------------|------------|-------------|
| RLS performance | No impact (single org, all rows match) | Negligible with indexes (equality check) | Same -- O(1) with btree index |
| org_id storage | +16 bytes/row x ~1000 rows = 16KB | Same per-org | Same per-org |
| Context resolution | Single org, no dropdown needed | Dropdown with 10 items | Searchable dropdown |
| Connection pool | No contention | Minor -- SET LOCAL per request | Same -- LOCAL is transaction-scoped |
| Storage buckets | Single folder tree | 10 top-level folders | Consider per-org bucket above 50 |
| Migration effort | One-time backfill | New org = INSERT + seed | Automated onboarding flow needed |

## Sources

**HIGH Confidence (Official Documentation):**
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- Policy structure, USING vs WITH CHECK, SECURITY DEFINER patterns, performance wrapping with `(select ...)`
- [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) -- JWT claim injection for future auth migration
- [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) -- auth hook function patterns, app_metadata vs user_metadata
- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) -- storage.foldername(), storage.objects RLS, bucket policies
- [Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) -- foldername, filename, extension functions
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant) -- App Router multi-tenant patterns

**MEDIUM Confidence (Verified Community Patterns):**
- [Dynamic Breadcrumbs in Next.js App Router](https://www.gcasc.io/blog/next-dynamic-breadcrumbs) -- usePathname-based breadcrumb generation
- [Building Multi-Tenant Apps with Next.js](https://johnkavanagh.co.uk/articles/building-a-multi-tenant-application-with-next-js/) -- Middleware-based tenant resolution
- [Supabase Multi-Tenant with RLS](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) -- tenant_id column pattern, SET LOCAL context
- [Supabase Custom Claims Discussion #1148](https://github.com/orgs/supabase/discussions/1148) -- Multi-tenant JWT claims community patterns
- [Zero-Downtime PostgreSQL Migrations](https://xata.io/blog/zero-downtime-schema-migrations-postgresql) -- ADD COLUMN nullable, backfill, then NOT NULL
- [Zero-Downtime Migrations: The Hard Parts](https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/) -- Batch backfill, CONCURRENTLY index creation

**Codebase Analysis:**
- 119 API route files with 425 Supabase `.from()` calls -- all need org context
- 7 RLS-enabled tables (029_rls_policies.sql) -- expand to all 68
- BuildingContext pattern (session-only, Context API) -- extend to OrganizationContext
- Middleware passes session via x-user-* headers -- extend with x-organization-id
- 8-item mobile nav -- simplify to 5 with "Mehr" overflow
- PropertySelector component -- replace with OrgSwitcher + Breadcrumbs

---
*Architecture research for: Multi-Tenant Property Management (Supabase + Next.js App Router)*
*Researched: 2026-02-18*
*Confidence: HIGH -- All patterns verified against official Supabase docs, codebase analysis, and Swiss property management domain standards*
