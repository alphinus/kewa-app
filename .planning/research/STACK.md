# Stack Research: v2.2 Extensions

**Project:** KEWA Renovation Operations System
**Researched:** 2026-01-25
**Scope:** Stack additions for Change Orders, Supplier Module, Inspection Workflow, Push Notifications, Knowledge Base

## Executive Summary

The v2.2 extensions require minimal stack additions. The existing Next.js 16 + React 19 + Supabase stack handles most new features through database design and existing patterns. Two additions are recommended:

1. **Push Notifications**: `web-push` library for Web Push API (VAPID)
2. **Knowledge Base**: `@next/mdx` with remark/rehype plugins for markdown content

Change Orders, Supplier Management, and Inspection Workflows require NO new libraries - they extend existing patterns (state machines, event logging, JSONB workflows) already proven in the codebase.

---

## New Capabilities

### Push Notifications (PUSH-01 to PUSH-05)

**Recommendation:** Web Push API via `web-push` library + Supabase Realtime for in-app notifications

| Package | Version | Purpose |
|---------|---------|---------|
| `web-push` | ^3.6.7 | Server-side VAPID push notifications |

**Rationale:**
- Native Web Push API requires no external service (no Firebase/OneSignal dependency)
- VAPID keys provide secure, provider-free push notifications
- Works on iOS 16.4+ when installed as PWA (home screen)
- Supabase Realtime already included in `@supabase/supabase-js` for in-app real-time updates

**Architecture:**
```
1. In-App Notifications: Supabase Realtime (Postgres Changes or Broadcast)
   - notifications table with RLS
   - Client subscribes via existing Supabase client
   - Real-time badge updates, toast notifications

2. Push Notifications: web-push + Service Worker
   - VAPID keys stored in env vars
   - push_subscriptions table in Supabase
   - API route sends push via web-push library
   - Service worker handles background delivery
```

**Why NOT Firebase Cloud Messaging:**
- Adds external service dependency
- Requires Google account/project
- `web-push` provides equivalent functionality for web-only app
- Simpler architecture, fewer moving parts

**Installation:**
```bash
npm install web-push
npm install -D @types/web-push
```

**Confidence:** HIGH - Verified via npm registry (v3.6.7 latest), official Next.js PWA documentation, multiple implementation guides.

---

### Knowledge Base (KNOW-01 to KNOW-04)

**Recommendation:** `@next/mdx` with file-based content in `/content` directory

| Package | Version | Purpose |
|---------|---------|---------|
| `@next/mdx` | ^16.1.4 | MDX processing for Next.js 16 |
| `@mdx-js/loader` | ^3.1.1 | MDX webpack loader |
| `@mdx-js/react` | ^3.1.1 | MDX React provider |
| `@types/mdx` | ^2.0.13 | TypeScript types |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown (tables, task lists) |
| `rehype-slug` | ^6.0.0 | Auto-generate heading IDs |
| `rehype-autolink-headings` | ^7.1.0 | Link anchors to headings |

**Rationale:**
- MDX allows React components inside markdown (interactive FAQ, collapsible sections)
- File-based content keeps docs in same repo as code (version controlled)
- No external CMS dependency
- Server Components render MDX at build time (fast, SEO-friendly)
- `@next/mdx` version 16.1.4 matches Next.js 16 exactly

**Architecture:**
```
/content
  /knowledge-base
    /faq
      general.mdx
      contractors.mdx
      tenants.mdx
    /guides
      project-workflow.mdx
      cost-tracking.mdx
    index.mdx
```

**Why NOT external CMS (ButterCMS, Contentful):**
- Adds external service dependency and cost
- Content changes require CMS login, not code review
- Single-user admin scenario doesn't need CMS collaboration features
- File-based keeps everything in Git

**Why NOT Nextra:**
- Nextra is a full documentation framework (overkill for internal FAQ)
- Adds significant dependencies
- `@next/mdx` is simpler, more flexible integration

**Installation:**
```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react remark-gfm rehype-slug rehype-autolink-headings
npm install -D @types/mdx
```

**Confidence:** HIGH - Verified via npm registry, official Next.js 16 MDX documentation.

---

### Change Orders (CHNG-01 to CHNG-03)

**Recommendation:** Database-only extension, NO new libraries needed

**Pattern:** Extend existing state machine + event logging patterns from WorkOrder system

**Schema Design:**
```sql
-- Change order status enum
CREATE TYPE change_order_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'implemented',
  'cancelled'
);

-- Change orders table
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renovation_project_id UUID REFERENCES renovation_projects(id),
  work_order_id UUID REFERENCES work_orders(id),

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT NOT NULL,          -- Why the change is needed
  impact_assessment TEXT,        -- Cost/schedule impact analysis

  -- Financial
  original_cost NUMERIC(12,2),
  revised_cost NUMERIC(12,2),
  cost_delta NUMERIC(12,2) GENERATED ALWAYS AS (revised_cost - original_cost) STORED,

  -- Schedule
  original_end_date DATE,
  revised_end_date DATE,
  schedule_delta_days INT GENERATED ALWAYS AS (revised_end_date - original_end_date) STORED,

  -- Workflow (mirrors project status pattern)
  status change_order_status DEFAULT 'draft',
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Why no library:**
- Existing state machine pattern (migration 025/026) handles status transitions
- Existing event logging pattern (migration 038) handles audit trail
- JSONB for flexible metadata already established
- TypeScript types follow existing database.ts patterns

**Confidence:** HIGH - Follows proven patterns already in codebase.

---

### Supplier Module / Pellets (SUPP-01 to SUPP-04)

**Recommendation:** Database-only extension, NO new libraries needed

**Pattern:** Extend Partner entity + new inventory tracking tables

**Schema Design:**
```sql
-- Supplier-specific extension (Partner already has partner_type='supplier')
-- Add inventory tracking for pellets

CREATE TABLE supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  product_name TEXT NOT NULL,
  product_code TEXT,
  unit_type TEXT NOT NULL,       -- 'bag', 'pallet', 'kg', etc.
  unit_price NUMERIC(10,2),
  min_order_quantity INT DEFAULT 1,
  lead_time_days INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES supplier_products(id),
  transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'adjustment'
  quantity INT NOT NULL,          -- Positive for in, negative for out
  unit_cost NUMERIC(10,2),
  reference_id UUID,              -- Link to purchase order, project, etc.
  reference_type TEXT,            -- 'purchase_order', 'renovation_project'
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Running balance view
CREATE VIEW inventory_balance AS
SELECT
  sp.id AS product_id,
  sp.product_name,
  sp.partner_id,
  p.company_name AS supplier_name,
  COALESCE(SUM(it.quantity), 0) AS current_quantity,
  MAX(it.created_at) AS last_transaction_at
FROM supplier_products sp
LEFT JOIN inventory_transactions it ON it.product_id = sp.id
LEFT JOIN partners p ON p.id = sp.partner_id
GROUP BY sp.id, sp.product_name, sp.partner_id, p.company_name;
```

**Why no library:**
- Partner entity already supports suppliers (partner_type enum)
- Inventory is simple in/out tracking, not warehouse management
- Sum-based balance calculation is straightforward SQL
- Existing cost/expense patterns apply

**Confidence:** HIGH - Standard inventory pattern, existing Partner infrastructure.

---

### Inspection/Abnahme Workflow (INSP-01 to INSP-03)

**Recommendation:** Database-only extension, NO new libraries needed

**Pattern:** Checklist-based inspection with state machine

**Schema Design:**
```sql
CREATE TYPE inspection_status AS ENUM (
  'scheduled',
  'in_progress',
  'passed',
  'failed',
  'passed_with_remarks'
);

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renovation_project_id UUID REFERENCES renovation_projects(id),
  work_order_id UUID REFERENCES work_orders(id),
  unit_id UUID REFERENCES units(id),

  -- Inspection details
  inspection_type TEXT NOT NULL,  -- 'final', 'partial', 'safety'
  scheduled_date DATE,
  completed_date DATE,

  -- Participants
  inspector_id UUID REFERENCES users(id),
  tenant_present BOOLEAN DEFAULT false,
  contractor_present BOOLEAN DEFAULT false,

  -- Checklist (JSONB - matches existing pattern)
  checklist_items JSONB DEFAULT '[]',

  -- Results
  status inspection_status DEFAULT 'scheduled',
  overall_notes TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_deadline DATE,

  -- Signatures (base64 or storage path)
  inspector_signature TEXT,
  tenant_signature TEXT,
  contractor_signature TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist item structure (JSONB schema)
-- [
--   {
--     "id": "uuid",
--     "category": "Electrical",
--     "item": "All outlets functional",
--     "passed": true,
--     "notes": "Optional remark",
--     "photo_ids": ["uuid1", "uuid2"]
--   }
-- ]
```

**Why no library:**
- JSONB checklist pattern already used in Task.checklist_items
- State machine pattern proven in WorkOrder/Project
- Media attachment via existing Media table
- Signature can be stored as base64 or Supabase Storage path

**Confidence:** HIGH - Mirrors existing Task checklist and WorkOrder event patterns.

---

## Integration Points

### Supabase Realtime for Notifications

The existing `@supabase/supabase-js` (v2.90.1) includes Realtime support. Enable on notifications table:

```sql
-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

Client subscription (already available):
```typescript
const supabase = createClient()
supabase
  .channel('notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => { /* Handle new notification */ }
  )
  .subscribe()
```

### Service Worker for Push

Next.js 16 supports PWA patterns natively. Service worker location:
```
/public/sw.js           -- Service worker for push handling
/public/manifest.json   -- PWA manifest (may already exist)
```

### MDX Integration

next.config.js update:
```javascript
const withMDX = require('@next/mdx')({
  options: {
    remarkPlugins: [require('remark-gfm')],
    rehypePlugins: [
      require('rehype-slug'),
      require('rehype-autolink-headings')
    ],
  },
})

module.exports = withMDX({
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // ... existing config
})
```

---

## Anti-Recommendations

### DO NOT Add

| Library/Service | Why Not |
|-----------------|---------|
| Firebase Cloud Messaging | Adds external dependency, `web-push` sufficient for web-only |
| OneSignal / Pusher | Commercial services unnecessary for internal app |
| Contentful / ButterCMS | External CMS overkill for file-based FAQ |
| Nextra | Full docs framework too heavy for simple KB |
| Chart.js / Recharts | Not needed for v2.2 scope (already have CSS-based visualizations) |
| Zustand / Jotai | React 19 + Server Components handle state well |
| Prisma | Already using Supabase client, switching adds complexity |
| tRPC | REST API patterns established, no benefit to switch |

### DO NOT Change

| Current | Proposed Alternative | Why Keep Current |
|---------|---------------------|------------------|
| Supabase Auth | Auth.js | Magic-link + PIN working, no benefit |
| @react-pdf/renderer | Puppeteer | Already validated, ESM-compatible |
| Tailwind CSS 4 | CSS-in-JS | Already established, performant |
| State machine in JSONB | XState | Simpler, database-enforced, working |

---

## Confidence Assessment

| Area | Level | Rationale |
|------|-------|-----------|
| Push Notifications | HIGH | `web-push` verified on npm (3.6.7), official Next.js PWA docs |
| Knowledge Base | HIGH | `@next/mdx` version 16.1.4 matches Next.js 16, official docs |
| Change Orders | HIGH | Extends proven state machine pattern in codebase |
| Supplier Module | HIGH | Extends existing Partner entity, standard inventory pattern |
| Inspection Workflow | HIGH | Mirrors existing checklist + state machine patterns |
| Supabase Realtime | HIGH | Already bundled in @supabase/supabase-js v2.90.1 |

---

## Installation Summary

**New dependencies for v2.2:**
```bash
# Push Notifications
npm install web-push
npm install -D @types/web-push

# Knowledge Base
npm install @next/mdx @mdx-js/loader @mdx-js/react remark-gfm rehype-slug rehype-autolink-headings
npm install -D @types/mdx
```

**Total new packages:** 9 (6 runtime, 3 dev)

**Database migrations needed:** 4 new migrations
- Change orders table + status enum + trigger
- Supplier products + inventory transactions tables + view
- Inspections table + status enum + checklist schema
- Notifications table + RLS policies + realtime enablement

---

## Sources

### Push Notifications
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [web-push npm](https://www.npmjs.com/package/web-push) - v3.6.7
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase Push Notifications Guide](https://supabase.com/docs/guides/functions/examples/push-notifications)

### Knowledge Base
- [Next.js MDX Guide](https://nextjs.org/docs/app/guides/mdx)
- [@next/mdx npm](https://www.npmjs.com/package/@next/mdx) - v16.1.4

### Patterns
- [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
