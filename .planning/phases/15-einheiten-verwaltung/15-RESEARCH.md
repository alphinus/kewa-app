# Phase 15: Einheiten-Verwaltung - Research

**Researched:** 2026-01-24
**Domain:** CRUD operations for units (Einheiten) and rooms with tenant data management
**Confidence:** HIGH

## Summary

Phase 15 implements unit (Wohnung) and room management within the existing building hierarchy established in Phase 14. The codebase already has mature patterns for CRUD operations (partners, properties, buildings), form handling (PartnerForm), and building-scoped data (BuildingContext). The units and rooms tables already exist with the required schema - this phase adds comprehensive CRUD UI and extends the data model for tenant management.

The existing `units` table has basic tenant info (`tenant_name` field). Phase 15 requires expanding this to support the richer tenant model from CONTEXT.md (phone, email, move-in date, history). The `rooms` table exists with condition tracking - this phase adds CRUD UI and extends room types to match German labels.

**Primary recommendation:** Leverage existing codebase patterns (PartnerForm for forms, partners API for CRUD, BuildingContext for scoping) and extend the database schema to support tenant history and expanded unit fields.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | 16.x | App Router, Server Components | Codebase standard |
| Supabase | Latest | Database, API, real-time | Codebase standard |
| React 19 | 19.x | UI components | Codebase standard |
| Tailwind CSS 4 | 4.x | Styling | Codebase standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Latest | Icons | UI icons (Building2, Home, User, etc.) |
| cn (lib/utils) | N/A | Class merging | Conditional Tailwind classes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual forms | react-hook-form | Codebase uses manual state; stay consistent |
| Client queries | react-query/swr | Codebase uses direct fetch; stay consistent |
| Modal dialogs | Radix Dialog | Codebase uses inline modal pattern; stay consistent |

**Installation:**
No new packages required - all dependencies already exist.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    api/
      units/
        route.ts                    # GET (list), POST (create)
        [id]/
          route.ts                  # GET, PATCH, DELETE
          rooms/
            route.ts                # GET, POST
      rooms/
        [id]/
          route.ts                  # GET, PATCH, DELETE
    dashboard/
      einheiten/
        page.tsx                    # Unit list with building filter
        [id]/
          page.tsx                  # Unit detail with rooms
  components/
    units/
      UnitForm.tsx                  # Create/edit unit form
      UnitList.tsx                  # Building-scoped unit list
      UnitCard.tsx                  # Unit display card
      RoomForm.tsx                  # Create/edit room form
      RoomList.tsx                  # Room list for unit
      RoomCard.tsx                  # Room display card
      TenantSection.tsx             # Tenant info display/edit
      TenantHistoryList.tsx         # Historical tenants
  types/
    database.ts                     # Extended Unit, Room, Tenant types
```

### Pattern 1: Building-Scoped Data Fetching
**What:** All unit operations respect current building context from Phase 14.
**When to use:** Unit list, unit creation, navigation.
**Example:**
```typescript
// Source: Existing codebase pattern (liegenschaft/page.tsx)
'use client'
import { useBuilding } from '@/contexts/BuildingContext'

function EinheitenPage() {
  const { selectedBuildingId, isAllSelected, isLoading } = useBuilding()

  // Fetch units filtered by building_id
  useEffect(() => {
    if (!selectedBuildingId || selectedBuildingId === 'all') return
    fetchUnits(selectedBuildingId)
  }, [selectedBuildingId])
}
```

### Pattern 2: Modal Form Pattern
**What:** Full-screen modal forms for create/edit operations.
**When to use:** Unit form, room form.
**Example:**
```typescript
// Source: Existing codebase pattern (PartnerForm.tsx)
interface UnitFormProps {
  mode: 'create' | 'edit'
  unit?: Unit
  buildingId: string
  onSave: (unit: Unit) => void
  onCancel: () => void
}

function UnitForm({ mode, unit, buildingId, onSave, onCancel }: UnitFormProps) {
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state with useState per field
  const [name, setName] = useState(unit?.name || '')
  // ... etc

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const url = mode === 'create' ? '/api/units' : `/api/units/${unit?.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'
    // ... fetch
  }
}
```

### Pattern 3: API Route Structure
**What:** Standard REST API with auth/role checks.
**When to use:** All CRUD endpoints.
**Example:**
```typescript
// Source: Existing codebase pattern (partners/[id]/route.ts)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Auth check
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role') as Role | null
  if (!userId || !userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Role check
  if (!['kewa', 'imeri'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Supabase update
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('units')
    .update(body)
    .eq('id', id)
    .select()
    .single()
}
```

### Anti-Patterns to Avoid
- **Direct DB queries in components:** Use API routes, not direct Supabase calls in client components.
- **Mixing server/client state:** Use server components for initial data, client components for interactivity.
- **Ignoring building context:** All unit operations must respect selected building.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation loops | Manual validation pattern from PartnerForm | Codebase consistency |
| Floor labels | Switch statements everywhere | Helper function (getFloorLabel in wohnungen/[id]/page.tsx) | DRY, already exists |
| Room type labels | Inline mappings | Centralized getRoomTypeLabel helper | DRY, already exists |
| Condition display | Custom badges | ConditionBadge component | Already exists |
| Date formatting | Custom formats | formatSwissDate helper | Already exists |

**Key insight:** The codebase has established patterns for nearly everything this phase needs. The risk is building new abstractions when existing ones work.

## Common Pitfalls

### Pitfall 1: Tenant Data Model Confusion
**What goes wrong:** Mixing the simple `tenant_name` field with the expanded tenant data model.
**Why it happens:** The units table has `tenant_name` (string) but CONTEXT.md requires phone, email, move-in date, history.
**How to avoid:** Create proper migration to add tenant fields to units table OR create separate tenants table linked to units.
**Warning signs:** Using tenant_name for everything, losing tenant history.

### Pitfall 2: Room Type Enum Mismatch
**What goes wrong:** Database has English room types (bathroom, kitchen) but UI needs German (Bad/WC, Kueche).
**Why it happens:** Existing room_type enum uses English values.
**How to avoid:** Use label mapping functions (already exists as getRoomTypeLabel), don't change enum values.
**Warning signs:** German text in database, inconsistent room type handling.

### Pitfall 3: Building Context Not Respected
**What goes wrong:** Unit list shows all units regardless of selected building.
**Why it happens:** Forgetting to pass building_id to API or filter client-side.
**How to avoid:** Follow liegenschaft/page.tsx pattern - check selectedBuildingId before fetching.
**Warning signs:** Units from other buildings appearing in list.

### Pitfall 4: Vacancy Status (Leerstand) Logic
**What goes wrong:** Hardcoding vacancy logic instead of deriving from tenant/project state.
**Why it happens:** CONTEXT.md defines complex vacancy rules (no tenant, Komplettsanierung, manual toggle).
**How to avoid:** Create computed property or database view for vacancy status.
**Warning signs:** Inconsistent vacancy display, manual status not persisting.

### Pitfall 5: Size Classification Handling
**What goes wrong:** Storing "1.5-Zi." as text instead of structured data.
**Why it happens:** CONTEXT.md lists fixed dropdown values.
**How to avoid:** Store as enum or constrained text, use TypeScript type for values.
**Warning signs:** Typos in size values, inconsistent filtering.

## Code Examples

Verified patterns from existing codebase:

### Unit API Route (GET with building filter)
```typescript
// Source: Codebase pattern from api/projects/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const buildingId = searchParams.get('building_id')

  const supabase = await createClient()
  let query = supabase
    .from('units')
    .select(`
      *,
      rooms (id, name, room_type, condition)
    `)
    .in('unit_type', ['apartment', 'common_area'])
    .order('floor', { ascending: false })

  // Apply building filter if provided and not 'all'
  if (buildingId && buildingId !== 'all') {
    query = query.eq('building_id', buildingId)
  }

  const { data, error } = await query
  // ...
}
```

### Unit Form with Floor Handling
```typescript
// Source: Codebase pattern from PartnerForm.tsx + CONTEXT.md decisions
const FLOOR_OPTIONS = [
  { value: -1, label: 'UG' },
  { value: 0, label: 'EG' },
  { value: 1, label: '1. OG' },
  { value: 2, label: '2. OG' },
  { value: 3, label: '3. OG' },
  { value: 4, label: 'DG' },
]

const SIZE_OPTIONS = [
  '1-Zi.', '1.5-Zi.', '2-Zi.', '2.5-Zi.', '3-Zi.', '3.5-Zi.',
  '4-Zi.', '4.5-Zi.', '5-Zi.', '5.5-Zi.', '6-Zi.'
]
```

### Room Type Labels (already exists)
```typescript
// Source: wohnungen/[id]/page.tsx
function getRoomTypeLabel(roomType: string): string {
  const labels: Record<string, string> = {
    living_room: 'Wohnzimmer',
    bedroom: 'Schlafzimmer',
    kitchen: 'Kueche',
    bathroom: 'Badezimmer',
    toilet: 'WC',
    hallway: 'Flur',
    storage: 'Abstellraum',
    balcony: 'Balkon',
    other: 'Sonstiges'
  }
  return labels[roomType] ?? roomType
}
```

### Tenant Section Display
```typescript
// Source: Pattern from wohnungen/[id]/page.tsx, extended for CONTEXT.md
interface TenantInfo {
  name: string
  phone: string
  email?: string
  move_in_date: string
}

function TenantSection({ tenant }: { tenant: TenantInfo | null }) {
  if (!tenant) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <span className="text-amber-700 dark:text-amber-300 font-medium">
          Leerstand
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-gray-900 dark:text-gray-100">
        {tenant.name}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {tenant.phone}
      </p>
      {tenant.email && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {tenant.email}
        </p>
      )}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tenant_name as string | Structured tenant object | Phase 15 | Enables history tracking |
| English room types in UI | German labels via mapping | Already exists | Better UX |
| Unit list without building filter | Building context integration | Phase 14 | Multi-building support |

**Deprecated/outdated:**
- Simple `tenant_name` field: Still exists but will be supplemented with structured tenant data.

## Database Schema Extensions Required

### Units Table Extensions
```sql
-- Add columns to units table
ALTER TABLE units
ADD COLUMN IF NOT EXISTS unit_number TEXT,              -- Floor.Apartment format (4.1, 4.2)
ADD COLUMN IF NOT EXISTS size_class TEXT,              -- 1-Zi., 1.5-Zi., etc.
ADD COLUMN IF NOT EXISTS tenant_phone TEXT,
ADD COLUMN IF NOT EXISTS tenant_email TEXT,
ADD COLUMN IF NOT EXISTS tenant_move_in_date DATE,
ADD COLUMN IF NOT EXISTS is_vacant BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS vacancy_reason TEXT;          -- manual, komplettsanierung, no_tenant

-- For tenant history, create separate table
CREATE TABLE IF NOT EXISTS tenant_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  reason TEXT,                                          -- kuendigung, interner_wechsel, other
  new_unit_id UUID REFERENCES units(id),               -- For internal moves
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Room Types Extension
```sql
-- Add German room types as enum values OR use custom field
-- Current enum: bathroom, kitchen, bedroom, living_room, hallway, balcony, storage, laundry, garage, office, other

-- For CONTEXT.md room types, use 'other' + custom_name OR add to enum:
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'wc';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'korridor';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'keller';
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'estrich';
```

## Open Questions

Things that couldn't be fully resolved:

1. **Tenant History vs. User Table**
   - What we know: DbTenantUser exists linking users to units
   - What's unclear: Should Phase 15 use tenant_users table or create simpler tenant_history?
   - Recommendation: Create separate tenant_history for historical records; tenant_users is for active user accounts (Phase 3)

2. **Gemeinschaftsraeume Handling**
   - What we know: CONTEXT.md lists building-level rooms (Waschkueche, Veloraum)
   - What's unclear: Should these be rooms under a special "building" unit or separate table?
   - Recommendation: Use existing unit_type='building' unit and add rooms to it (consistent with current schema)

3. **Condition Score 1-5 vs old/partial/new**
   - What we know: CONTEXT.md mentions 1-5 scale; database has room_condition enum (old/partial/new)
   - What's unclear: Does Phase 15 need 1-5 or use existing 3-level scale?
   - Recommendation: Use existing 3-level scale; 1-5 can be future enhancement

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/app/api/units/`, `src/app/api/buildings/`
- Database schema: `supabase/migrations/001_initial_schema.sql`, `009_unit_room.sql`, `027_condition_tracking.sql`
- Existing UI patterns: `src/components/partners/PartnerForm.tsx`, `src/app/dashboard/liegenschaft/page.tsx`
- Phase 14 implementation: `.planning/phases/14-multi-liegenschaft/`

### Secondary (MEDIUM confidence)
- Type definitions: `src/types/database.ts`, `src/types/index.ts`
- BuildingContext: `src/contexts/BuildingContext.tsx`

### Tertiary (LOW confidence)
- None - all research based on codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All patterns exist in codebase
- Architecture: HIGH - Following established patterns exactly
- Pitfalls: HIGH - Based on actual codebase constraints
- Schema extensions: MEDIUM - New migration required, design choices involved

**Research date:** 2026-01-24
**Valid until:** 60 days (stable codebase, internal patterns)
