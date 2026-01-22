# Phase 13: Partner-Modul - Research

**Researched:** 2026-01-22
**Domain:** Master Data Management - Partner/Contractor CRUD
**Confidence:** HIGH

## Summary

Phase 13 implements a complete CRUD interface for managing partner/contractor master data. The Partner entity already exists in the database (migration 014_partner.sql from v2.0) with all required fields. This phase focuses on building admin UI and API routes to enable full lifecycle management: list, create, edit, activate/deactivate, and integrate with WorkOrderForm.

The established codebase patterns use Next.js 16 App Router with Route Handlers for API endpoints, React 19 for UI components, and Supabase for database operations. The existing WorkOrderForm already references partners, but the `/api/partners` routes don't exist yet. All CRUD patterns follow consistent conventions seen in expenses, invoices, and tasks modules.

**Primary recommendation:** Follow existing CRUD patterns exactly (GET/POST for collection routes, GET/PATCH/DELETE for single resources). Use controlled forms with client-side validation, server-side validation in API routes, and the established Card/Button/Input component library. Partner table schema is already correct—no migrations needed.

## Standard Stack

The stack is already established in this codebase. Research focused on verifying current versions and patterns.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.2 | App Router framework | Project standard, uses Route Handlers for API |
| React | 19.2.3 | UI library | Latest stable, already in use |
| Supabase JS | 2.90.1 | Database client | Project standard for all data operations |
| TypeScript | 5.x | Type safety | Enforced across entire codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.x | Styling | All components use utility-first CSS |
| date-fns | 4.1.0 | Date formatting | For German locale date display |
| clsx | 2.1.1 | Conditional classes | Component styling logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase | Prisma + PostgreSQL | More boilerplate, project already standardized on Supabase |
| Built-in fetch | React Query | Adds dependency, current pattern is simpler for this app |
| Manual validation | Zod schemas | Could improve type safety but not currently in use (HIGH confidence this is absent from package.json) |

**Installation:**
```bash
# No new dependencies required
# All necessary libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── partners/
│   │       ├── route.ts              # GET /api/partners, POST /api/partners
│   │       └── [id]/
│   │           └── route.ts          # GET/PATCH/DELETE /api/partners/[id]
│   └── dashboard/
│       └── partner/
│           ├── page.tsx              # Partner list view
│           └── [id]/
│               └── page.tsx          # Partner detail/edit (optional)
├── components/
│   └── partners/
│       ├── PartnerList.tsx           # List component
│       ├── PartnerForm.tsx           # Create/edit form
│       └── PartnerCard.tsx           # Individual partner display
└── types/
    └── database.ts                   # Partner interface already defined
```

### Pattern 1: API Route Handler (Collection)
**What:** GET/POST handlers for listing and creating resources
**When to use:** For `/api/partners` route
**Example:**
```typescript
// Source: Existing pattern from src/app/api/expenses/route.ts
export async function GET(request: NextRequest) {
  // 1. Extract user from headers (set by middleware)
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role') as Role | null

  // 2. Check authorization
  if (!userId || !userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Parse query params for filtering
  const { searchParams } = new URL(request.url)
  const isActive = searchParams.get('is_active')
  const partnerType = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // 4. Build query with Supabase client
  const supabase = await createClient()
  let query = supabase
    .from('partners')
    .select('*', { count: 'exact' })
    .order('company_name', { ascending: true })
    .range(offset, offset + limit - 1)

  // 5. Apply filters conditionally
  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true')
  }
  if (partnerType) {
    query = query.eq('partner_type', partnerType)
  }

  // 6. Execute and return with pagination metadata
  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    partners: data,
    total: count,
    limit,
    offset
  })
}
```

### Pattern 2: API Route Handler (Single Resource)
**What:** GET/PATCH/DELETE handlers for individual resources
**When to use:** For `/api/partners/[id]` route
**Example:**
```typescript
// Source: Existing pattern from src/app/api/invoices/[id]/route.ts
interface RouteContext {
  params: Promise<{ id: string }>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: NextRequest, context: RouteContext) {
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role') as Role | null

  if (!userId || !userRole) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  // Validate UUID format
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }

  const body: UpdatePartnerInput = await request.json()

  // Build update object (only include allowed fields)
  const updateData: Record<string, unknown> = {}
  if (body.company_name !== undefined) updateData.company_name = body.company_name
  if (body.contact_name !== undefined) updateData.contact_name = body.contact_name
  // ... other fields

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('partners')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ partner: data })
}
```

### Pattern 3: Client Component with Form State
**What:** Controlled form with useState, async submission, error handling
**When to use:** For PartnerForm.tsx component
**Example:**
```typescript
// Source: Existing pattern from src/components/work-orders/WorkOrderForm.tsx
'use client'

export function PartnerForm({ mode, partner, onSave, onCancel }: Props) {
  // Form state for each field
  const [companyName, setCompanyName] = useState(partner?.company_name || '')
  const [contactName, setContactName] = useState(partner?.contact_name || '')
  const [email, setEmail] = useState(partner?.email || '')
  const [tradeCategories, setTradeCategories] = useState<TradeCategory[]>(
    partner?.trade_categories || []
  )

  // UI state
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validation
  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!companyName.trim()) {
      newErrors.companyName = 'Bitte geben Sie einen Firmennamen ein'
    }
    if (!email.trim()) {
      newErrors.email = 'Bitte geben Sie eine E-Mail-Adresse ein'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Bitte geben Sie eine gueltige E-Mail-Adresse ein'
    }
    if (tradeCategories.length === 0) {
      newErrors.tradeCategories = 'Bitte waehlen Sie mindestens ein Gewerk'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      setSaving(true)
      const input = {
        company_name: companyName.trim(),
        contact_name: contactName.trim() || undefined,
        email: email.trim(),
        trade_categories: tradeCategories,
        // ... other fields
      }

      const url = mode === 'create'
        ? '/api/partners'
        : `/api/partners/${partner?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      const data = await response.json()
      onSave(data.partner)
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with error states */}
    </form>
  )
}
```

### Pattern 4: List Component with Loading/Empty States
**What:** Display list of items with proper loading, empty, and error states
**When to use:** For PartnerList.tsx component
**Example:**
```typescript
// Source: Existing pattern from src/components/tasks/TaskList.tsx
export function PartnerList({ partners, onPartnerClick, onEditClick }: Props) {
  if (partners.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Keine Partner vorhanden
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {partners.map((partner) => (
        <PartnerCard
          key={partner.id}
          partner={partner}
          onClick={() => onPartnerClick(partner)}
          onEdit={() => onEditClick(partner)}
        />
      ))}
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Direct Supabase calls from client components:** Always use API routes for data mutations
- **Missing validation on both client and server:** Client-side for UX, server-side for security
- **Exposing internal IDs in URLs without UUID validation:** Always validate UUID format with regex
- **Not handling 404 vs 401 vs 403 distinctly:** Each error type should return correct status code
- **Forgetting to trim() string inputs:** Prevents accidental whitespace-only values

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email validation | Custom regex | HTML5 input[type="email"] + basic regex | Browser validation + server check is sufficient |
| Trade category multi-select | Custom checkbox group | Native select[multiple] or checkboxes | Already used for arrays in codebase |
| Active/inactive toggle | Custom switch component | Boolean checkbox with styling | Simple, accessible, works |
| Partner filtering | Client-side array filter | Supabase query filters | Database is faster, supports pagination |
| UUID validation | String comparison | Established UUID_REGEX constant | Already defined in multiple API routes |

**Key insight:** This codebase uses simple, vanilla patterns rather than heavyweight libraries. Don't introduce new dependencies (like React Hook Form, Zod, or UI libraries) unless absolutely necessary. The existing patterns work well and maintain consistency.

## Common Pitfalls

### Pitfall 1: Forgetting WorkOrderForm Integration
**What goes wrong:** Partner dropdown in WorkOrderForm tries to fetch from `/api/partners` but route doesn't exist, causing silent failure or 404
**Why it happens:** WorkOrderForm.tsx lines 156-162 already have partner loading logic but API route is missing
**How to avoid:** Build `/api/partners` route FIRST before testing any UI changes. WorkOrderForm expects response format: `{ partners: Partner[] }`
**Warning signs:** WorkOrderForm partner dropdown is empty or shows loading spinner indefinitely

### Pitfall 2: Not Filtering by Active Status
**What goes wrong:** Inactive partners appear in WorkOrderForm dropdown, allowing work orders to be assigned to unavailable contractors
**Why it happens:** Forgetting to add `?is_active=true` filter in WorkOrderForm's partner fetch
**How to avoid:** Add is_active query parameter support to GET /api/partners route and use it in WorkOrderForm
**Warning signs:** Test data includes inactive partners that shouldn't be selectable

### Pitfall 3: Trade Categories Array Handling
**What goes wrong:** Trade categories stored as PostgreSQL array but treated as single value, causing type errors
**Why it happens:** PostgreSQL arrays require specific handling in Supabase queries and form inputs
**How to avoid:** Use array syntax in Supabase: `.insert({ trade_categories: ['plumbing', 'electrical'] })` NOT `trade_categories: 'plumbing'`. In forms, use multi-select or checkbox group.
**Warning signs:** TypeScript errors about "string is not assignable to TradeCategory[]" or database constraint violations

### Pitfall 4: Missing Email Validation
**What goes wrong:** Invalid emails saved to database, work order magic link emails fail to send
**Why it happens:** Email field is nullable in database schema but critical for contractor portal
**How to avoid:**
- Server-side validation: Check email format with regex before INSERT/UPDATE
- Consider marking email as required for contractor partners (supplier partners may not need email)
- Validate email format: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
**Warning signs:** Work order send fails with "partner has no email" error

### Pitfall 5: Pagination Without Count
**What goes wrong:** Partner list shows "Page 1 of ?" or can't disable "Next" button properly
**Why it happens:** Forgetting `{ count: 'exact' }` option in Supabase select query
**How to avoid:** Always use `.select('*', { count: 'exact' })` for list endpoints that need pagination. Return both `total` count and `data` array.
**Warning signs:** Pagination controls behave incorrectly, can't calculate total pages

### Pitfall 6: Not Handling Deactivation Side Effects
**What goes wrong:** Partner deactivated but still has active work orders, causing confusion
**Why it happens:** No validation to check for active work orders before allowing deactivation
**How to avoid:** When setting `is_active = false`, optionally query for work orders with status NOT IN ('closed', 'rejected'). Either block deactivation or show warning.
**Warning signs:** Business logic allows hiding partners that still have pending work

## Code Examples

Verified patterns from official sources and existing codebase:

### API Route: GET /api/partners with Filtering
```typescript
// Source: Pattern from src/app/api/expenses/route.ts + Supabase docs
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role, Partner } from '@/types'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse filters
    const partnerType = searchParams.get('type') // 'contractor' or 'supplier'
    const isActive = searchParams.get('is_active') // 'true' or 'false'
    const tradeCategory = searchParams.get('trade') // single trade to filter
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('partners')
      .select('*', { count: 'exact' })
      .order('company_name', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (partnerType) {
      query = query.eq('partner_type', partnerType)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (tradeCategory) {
      // PostgreSQL array contains operator
      query = query.contains('trade_categories', [tradeCategory])
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching partners:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      partners: data as Partner[],
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/partners:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### API Route: POST /api/partners with Validation
```typescript
// Source: Pattern from src/app/api/expenses/route.ts
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.company_name || !body.company_name.trim()) {
      return NextResponse.json(
        { error: 'company_name is required' },
        { status: 400 }
      )
    }

    if (!body.partner_type || !['contractor', 'supplier'].includes(body.partner_type)) {
      return NextResponse.json(
        { error: 'partner_type must be contractor or supplier' },
        { status: 400 }
      )
    }

    // Email validation for contractors (optional for suppliers)
    if (body.partner_type === 'contractor') {
      if (!body.email || !body.email.trim()) {
        return NextResponse.json(
          { error: 'email is required for contractors' },
          { status: 400 }
        )
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Trade categories validation
    if (body.trade_categories && !Array.isArray(body.trade_categories)) {
      return NextResponse.json(
        { error: 'trade_categories must be an array' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: partner, error: createError } = await supabase
      .from('partners')
      .insert({
        partner_type: body.partner_type,
        company_name: body.company_name.trim(),
        contact_name: body.contact_name?.trim() || null,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        trade_categories: body.trade_categories || [],
        is_active: body.is_active !== undefined ? body.is_active : true,
        notes: body.notes?.trim() || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating partner:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ partner }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/partners:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Form Component: Multi-Select Trade Categories
```typescript
// Source: Established pattern, adapted for arrays
'use client'

import { TradeCategory } from '@/types'

const TRADE_CATEGORIES: { value: TradeCategory; label: string }[] = [
  { value: 'general', label: 'Allgemein' },
  { value: 'plumbing', label: 'Sanitär' },
  { value: 'electrical', label: 'Elektro' },
  { value: 'hvac', label: 'Heizung/Lüftung' },
  { value: 'painting', label: 'Malerarbeiten' },
  { value: 'flooring', label: 'Bodenbeläge' },
  { value: 'carpentry', label: 'Schreinerei' },
  { value: 'roofing', label: 'Dachdecker' },
  { value: 'masonry', label: 'Maurer' },
  { value: 'glazing', label: 'Glaser' },
  { value: 'landscaping', label: 'Gartenbau' },
  { value: 'cleaning', label: 'Reinigung' },
  { value: 'demolition', label: 'Abbruch' },
  { value: 'other', label: 'Sonstige' },
]

export function PartnerForm({ mode, partner, onSave, onCancel }: Props) {
  const [tradeCategories, setTradeCategories] = useState<TradeCategory[]>(
    partner?.trade_categories || []
  )

  function handleTradeToggle(trade: TradeCategory) {
    setTradeCategories((prev) =>
      prev.includes(trade)
        ? prev.filter((t) => t !== trade)
        : [...prev, trade]
    )
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Gewerke *
      </label>
      <div className="grid grid-cols-2 gap-2">
        {TRADE_CATEGORIES.map(({ value, label }) => (
          <label
            key={value}
            className="flex items-center gap-2 p-2 rounded border border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <input
              type="checkbox"
              checked={tradeCategories.includes(value)}
              onChange={() => handleTradeToggle(value)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {label}
            </span>
          </label>
        ))}
      </div>
      {errors.tradeCategories && (
        <p className="mt-1 text-sm text-red-500">{errors.tradeCategories}</p>
      )}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router with /pages/api | App Router with /app/api | Next.js 13+ (2023) | Route Handlers instead of API routes, async params |
| Implicit caching in production | Opt-in caching with cache: 'force-cache' | Next.js 16 (Dec 2024) | More predictable behavior, explicit intent |
| React 18 automatic form reset | Manual form reset or React 19 Actions | React 19 (Dec 2024) | Forms can auto-reset on successful Action |
| useFormState (React 18) | useActionState (React 19) | React 19 (Dec 2024) | Hook renamed for clarity |
| Offset-based pagination (LIMIT/OFFSET) | Cursor-based pagination recommended | Ongoing | Better performance at scale, but offset still works for small datasets |
| Manual validation functions | Zod schemas gaining popularity | 2024-2025 | Type-safe validation, but NOT in this codebase yet |

**Deprecated/outdated:**
- **getServerSideProps/getStaticProps:** Replaced by React Server Components and async functions in App Router
- **NextApiRequest/NextApiResponse:** Replaced by NextRequest/NextResponse from next/server
- **Old Supabase auth helpers:** Now using @supabase/ssr package (version 0.8.0 in use)

## Open Questions

Things that couldn't be fully resolved:

1. **Should partner deactivation be blocked if active work orders exist?**
   - What we know: Partner table has is_active boolean, no constraint on work_orders
   - What's unclear: Business logic preference—hard block vs warning vs allow
   - Recommendation: Implement soft validation (show warning) and document. Allow override with confirmation.

2. **Should suppliers (non-contractors) require email?**
   - What we know: Email is nullable in schema, needed for contractor portal
   - What's unclear: Whether suppliers (pellets, materials) need email for other workflows
   - Recommendation: Make email required for contractor type, optional for supplier type. Validate in API route.

3. **Should partner list show aggregated stats (e.g., # of work orders)?**
   - What we know: Cost views already aggregate partner data (partner_costs view)
   - What's unclear: Whether basic list view needs this data or keep it simple
   - Recommendation: Start simple (list with basic fields), add stats view later if needed. Don't optimize prematurely.

## Sources

### Primary (HIGH confidence)
- **Existing codebase patterns:**
  - `/Users/mg1/AI Umgebung/E_Luma/KeWa AG Imeri App/src/app/api/expenses/route.ts` - Collection route pattern
  - `/Users/mg1/AI Umgebung/E_Luma/KeWa AG Imeri App/src/app/api/invoices/[id]/route.ts` - Single resource route pattern
  - `/Users/mg1/AI Umgebung/E_Luma/KeWa AG Imeri App/src/components/work-orders/WorkOrderForm.tsx` - Form component pattern
  - `/Users/mg1/AI Umgebung/E_Luma/KeWa AG Imeri App/src/components/tasks/TaskList.tsx` - List component pattern
  - `/Users/mg1/AI Umgebung/E_Luma/KeWa AG Imeri App/src/app/dashboard/kosten/ausgaben/page.tsx` - Dashboard page pattern
- **Database schema:**
  - `/Users/mg1/AI Umgebung/E_Luma/KeWa AG Imeri App/supabase/migrations/014_partner.sql` - Partner table definition
  - `/Users/mg1/AI Umgebung/E_Luma/KeWa AG Imeri App/src/types/database.ts` - TypeScript Partner interface (lines 322-335)
- **Package versions:**
  - `/Users/mg1/AI Umgebung/E_Luma/KeWa AG Imeri App/package.json` - Verified all library versions

### Secondary (MEDIUM confidence)
- [Next.js 16 Route Handlers - Strapi Blog](https://strapi.io/blog/nextjs-16-route-handlers-explained-3-advanced-usecases) - Advanced patterns for Route Handlers
- [React 19 Form Handling - Curiosum](https://www.curiosum.com/blog/react-19-features) - New form hooks overview
- [Supabase Pagination Best Practices - Bootstrapped App](https://bootstrapped.app/guide/how-to-paginate-data-in-supabase-queries) - range() method for pagination
- [Supabase JavaScript API Reference - Official Docs](https://supabase.com/docs/reference/javascript/range) - Query API documentation

### Tertiary (LOW confidence)
- [Master Data Management Patterns - RecordLinker](https://recordlinker.com/mdm-patterns-components/) - General MDM architecture (not specific to this implementation)
- [CRUD API Best Practices - Forest Admin](https://www.forestadmin.com/blog/an-experts-guide-to-crud-apis-designing-a-robust-one) - Generic validation guidance (not framework-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified from package.json and existing code
- Architecture: HIGH - Patterns extracted from existing routes and components
- Pitfalls: HIGH - Based on actual code structure and database schema
- API patterns: HIGH - Directly copied from existing working routes
- Form patterns: HIGH - Directly copied from WorkOrderForm.tsx

**Research date:** 2026-01-22
**Valid until:** ~30 days (stable patterns, but framework updates may occur)

**Research notes:**
- No Context7 access needed - all patterns established in codebase
- No external dependencies required - using existing stack
- Partner schema already correct - no migrations needed
- WorkOrderForm already expects partners API - just needs implementation
