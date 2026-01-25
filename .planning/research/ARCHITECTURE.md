# Architecture Research: v2.2 Extensions

**Domain:** Renovation Management System Extensions
**Researched:** 2026-01-25
**Confidence:** HIGH (based on existing codebase patterns)

## Integration Overview

The v2.2 extensions integrate with a mature Next.js 16 + Supabase architecture with established patterns:

- **Server Components** for dashboards with direct Supabase queries
- **JSONB-based state machines** with PostgreSQL trigger enforcement
- **Polymorphic entity patterns** (comments, media attach to any entity type)
- **Event logging** for audit trails (work_order_events pattern)
- **Multi-role auth** with PIN (internal) and magic-link (external)
- **BuildingContext** for cross-app property filtering

All five new features can integrate using these existing patterns without architectural changes.

## Change Orders

Change Orders represent modifications to active projects. They fit naturally into the existing cost workflow (Offer -> Invoice -> Payment) and project hierarchy.

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `change_orders` table | `supabase/migrations/` | Core data model with status workflow |
| `change_order_status` enum | `supabase/migrations/` | `draft` -> `submitted` -> `under_review` -> `approved`/`rejected` -> `applied` |
| `ChangeOrderForm.tsx` | `src/components/change-orders/` | Create/edit form with line items |
| `ChangeOrderList.tsx` | `src/components/change-orders/` | List with status badges, filtering |
| `ChangeOrderDetail.tsx` | `src/components/change-orders/` | Full detail view with approval actions |
| `ChangeOrderPDF.tsx` | `src/components/change-orders/` | PDF generation (follows WorkOrderPDF pattern) |
| `change-order-queries.ts` | `src/lib/change-orders/` | Server-side query functions |
| `/dashboard/aenderungen/` | `src/app/dashboard/` | Change order pages (list, detail, new) |
| `/api/change-orders/` | `src/app/api/` | API routes for CRUD + approval workflow |

### Modified Components

| Component | Modification |
|-----------|-------------|
| `renovation_projects` table | Add `has_change_orders` boolean flag (optional, for quick filtering) |
| Project detail page | Add "Change Orders" tab/section with count badge |
| ProjectCostDashboard | Include approved change order amounts in totals |
| CSV export | Include change order line items in cost export |

### Data Model

```sql
-- change_order_status enum
CREATE TYPE change_order_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'applied',
  'cancelled'
);

-- change_orders table
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  project_id UUID NOT NULL REFERENCES renovation_projects(id),
  work_order_id UUID REFERENCES work_orders(id),  -- Optional link to originating work order

  -- Identification
  change_order_number TEXT NOT NULL,  -- CO-2026-001 format
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT NOT NULL,  -- Why change is needed

  -- Status workflow (JSONB trigger enforced)
  status change_order_status DEFAULT 'draft',

  -- Cost impact (follows invoice pattern)
  line_items JSONB DEFAULT '[]',  -- [{description, quantity, unit_price, total}]
  subtotal DECIMAL(12,2),
  tax_rate DECIMAL(5,2) DEFAULT 8.0,
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),

  -- Original vs new cost (for variance tracking)
  original_estimated_cost DECIMAL(12,2),
  revised_estimated_cost DECIMAL(12,2),
  cost_variance DECIMAL(12,2),  -- Computed: revised - original

  -- Schedule impact
  schedule_impact_days INTEGER,  -- Positive = delay, negative = acceleration
  revised_end_date DATE,

  -- Approval workflow
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Application tracking
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES users(id),

  -- Documents
  attachments UUID[],  -- References to media table

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points

1. **Project Detail Page**: Add "Aenderungen" tab showing change orders for project
2. **Cost Dashboard**: Include `SUM(approved change orders)` in project cost calculations
3. **Work Order Detail**: "Request Change Order" button to create CO from work order
4. **PDF Generation**: Use existing `@react-pdf/renderer` pattern from WorkOrderPDF
5. **Audit Logging**: Extend existing audit_log table (entity_type = 'change_order')
6. **Comments**: Use polymorphic comments pattern (entity_type = 'change_order')

### Status Transitions (JSONB trigger)

```json
{
  "draft": ["submitted", "cancelled"],
  "submitted": ["under_review", "draft"],
  "under_review": ["approved", "rejected", "submitted"],
  "approved": ["applied"],
  "rejected": ["draft"],
  "applied": [],
  "cancelled": []
}
```

## Supplier Module

Supplier management for tracking Pellets inventory and ordering. Extends existing `partners` table (already has `partner_type = 'supplier'`).

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `supplier_products` table | `supabase/migrations/` | Products/materials from suppliers |
| `supplier_orders` table | `supabase/migrations/` | Purchase orders with line items |
| `supplier_inventory` table | `supabase/migrations/` | Inventory tracking with levels |
| `SupplierList.tsx` | `src/components/suppliers/` | List of suppliers (filtered from partners) |
| `SupplierDetail.tsx` | `src/components/suppliers/` | Supplier with products, orders |
| `ProductCatalog.tsx` | `src/components/suppliers/` | Products grid with stock levels |
| `OrderForm.tsx` | `src/components/suppliers/` | Create purchase order |
| `InventoryDashboard.tsx` | `src/components/suppliers/` | Stock levels, low-stock alerts |
| `/dashboard/lieferanten/` | `src/app/dashboard/` | Supplier pages |
| `/api/suppliers/` | `src/app/api/` | API routes |

### Modified Components

| Component | Modification |
|-----------|-------------|
| `partners` table | Already has `partner_type = 'supplier'` - no changes needed |
| PartnerList | Add filter toggle for Contractors vs Suppliers |
| Template tasks | Link `materials_list` JSONB to actual products (optional enhancement) |
| Expense tracking | Link material expenses to supplier orders |

### Data Model

```sql
-- Products from suppliers
CREATE TABLE supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),

  -- Identification
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- e.g., 'pellets', 'insulation', 'paint'
  unit TEXT NOT NULL,  -- e.g., 'kg', 'sack', 'liter', 'stueck'

  -- Pricing
  unit_price DECIMAL(10,2),
  currency TEXT DEFAULT 'CHF',
  min_order_quantity INTEGER DEFAULT 1,

  -- Inventory
  current_stock DECIMAL(12,2) DEFAULT 0,
  reorder_level DECIMAL(12,2),  -- Alert when below
  reorder_quantity DECIMAL(12,2),  -- Standard order amount

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase orders
CREATE TABLE supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),

  -- Identification
  order_number TEXT NOT NULL,  -- PO-2026-001

  -- Status workflow
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'confirmed', 'shipped', 'received', 'cancelled'
  )),

  -- Line items
  line_items JSONB NOT NULL DEFAULT '[]',
  -- [{product_id, product_name, quantity, unit, unit_price, total}]

  -- Totals
  subtotal DECIMAL(12,2),
  tax_rate DECIMAL(5,2) DEFAULT 8.0,
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),

  -- Dates
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  actual_delivery DATE,

  -- Receiving
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMPTZ,
  receiving_notes TEXT,

  -- Links
  renovation_project_id UUID REFERENCES renovation_projects(id),  -- Optional project link
  invoice_id UUID REFERENCES invoices(id),  -- Link to supplier invoice

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory movements (for audit trail)
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES supplier_products(id),

  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'received', 'used', 'adjustment', 'return', 'transfer'
  )),
  quantity DECIMAL(12,2) NOT NULL,  -- Positive for in, negative for out
  balance_after DECIMAL(12,2) NOT NULL,

  -- References
  supplier_order_id UUID REFERENCES supplier_orders(id),
  work_order_id UUID REFERENCES work_orders(id),
  project_id UUID REFERENCES renovation_projects(id),

  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points

1. **Partners List**: Filter toggle between contractors and suppliers (already have `partner_type`)
2. **Work Orders**: "Order Materials" action to create supplier order
3. **Template Tasks**: `materials_list` JSONB could reference `supplier_products.id`
4. **Invoice Linking**: When supplier invoice arrives, link to `supplier_orders`
5. **Low Stock Alerts**: Dashboard widget showing products below reorder level
6. **Cost Tracking**: Material costs flow through supplier orders to project costs

### Pellets-Specific Features

Pellets tracking is a primary use case:

```sql
-- Pellets-specific view
CREATE VIEW pellets_inventory AS
SELECT
  sp.*,
  p.company_name as supplier_name,
  (sp.current_stock < sp.reorder_level) as needs_reorder
FROM supplier_products sp
JOIN partners p ON sp.partner_id = p.id
WHERE sp.category = 'pellets';
```

## Inspection Workflow

Formal handoff process for project completion. Extends existing `project_quality_gates` and work order `inspected` status.

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `inspections` table | `supabase/migrations/` | Formal inspection records |
| `inspection_items` table | `supabase/migrations/` | Checklist items with sign-off |
| `InspectionChecklist.tsx` | `src/components/inspections/` | Interactive checklist with photos |
| `InspectionSignOff.tsx` | `src/components/inspections/` | Digital signature capture |
| `InspectionReport.tsx` | `src/components/inspections/` | Summary report with deficiencies |
| `InspectionPDF.tsx` | `src/components/inspections/` | Abnahmeprotokoll PDF |
| `/dashboard/abnahme/` | `src/app/dashboard/` | Inspection pages |
| `/api/inspections/` | `src/app/api/` | API routes |

### Modified Components

| Component | Modification |
|-----------|-------------|
| `renovation_projects.status` | 'finished' triggers inspection availability; 'approved' requires passed inspection |
| `project_quality_gates` | Existing structure supports inspection checklists |
| Work order status flow | 'done' -> 'inspected' -> 'closed' already exists |
| Project detail page | "Start Abnahme" button when status = 'finished' |

### Data Model

```sql
-- Formal inspection records
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What's being inspected
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'work_order', 'unit', 'room')),
  entity_id UUID NOT NULL,
  project_id UUID REFERENCES renovation_projects(id),  -- Always link to project for context

  -- Inspection type
  inspection_type TEXT NOT NULL CHECK (inspection_type IN (
    'intermediate',  -- Zwischenabnahme
    'final',         -- Endabnahme
    'followup'       -- Nachkontrolle
  )),

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'in_progress', 'completed', 'passed', 'failed', 'cancelled'
  )),

  -- Scheduling
  scheduled_date DATE,
  scheduled_time TIME,
  actual_date DATE,

  -- Participants
  inspector_id UUID REFERENCES users(id),  -- KEWA staff
  contractor_rep TEXT,  -- Contractor representative name
  tenant_rep TEXT,      -- Tenant representative (for handover)

  -- Results
  overall_result TEXT CHECK (overall_result IN ('passed', 'passed_with_deficiencies', 'failed')),
  notes TEXT,

  -- Sign-off
  signed_at TIMESTAMPTZ,
  signature_data TEXT,  -- Base64 signature image or signature pad data

  -- Links
  deficiency_count INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection checklist items
CREATE TABLE inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  -- Item definition
  category TEXT NOT NULL,  -- e.g., 'Elektro', 'Sanitaer', 'Malerarbeiten'
  description TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,

  -- Result
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'passed', 'failed', 'na'  -- na = not applicable
  )),

  -- Deficiency details (if failed)
  deficiency_description TEXT,
  deficiency_severity TEXT CHECK (deficiency_severity IN ('minor', 'major', 'critical')),
  remediation_deadline DATE,
  remediated_at TIMESTAMPTZ,

  -- Evidence
  media_ids UUID[],  -- Before/after photos

  -- Sign-off
  inspected_by UUID REFERENCES users(id),
  inspected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predefined checklist templates (could be derived from quality gates)
CREATE TABLE inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  inspection_type TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  -- [{category, description, sort_order}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points

1. **Project Status Flow**: `finished` -> inspection -> `approved`
2. **Quality Gates**: Existing `project_quality_gates` provide checklist structure
3. **Work Order Flow**: `done` -> `inspected` -> `closed` status already exists
4. **Media System**: Photos attach via existing polymorphic media pattern
5. **PDF Generation**: Abnahmeprotokoll using `@react-pdf/renderer`
6. **Condition Update**: Passing final inspection triggers room condition updates (existing trigger)

### Workflow Integration

```
Project Status Flow:
planned -> active -> [blocked] -> finished -> [inspection] -> approved

When project.status = 'finished':
  - "Endabnahme starten" button appears
  - Creates inspection record with checklist from quality gates

Inspection completion:
  - passed -> project.status = 'approved' (triggers condition updates)
  - failed -> remediation items created, followup inspection scheduled
```

## Push Notifications

Real-time alerts for key events. Uses Supabase Realtime + Web Push API.

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `notification_subscriptions` table | `supabase/migrations/` | Push subscription storage |
| `notifications` table | `supabase/migrations/` | Notification history/queue |
| `notification_preferences` table | `supabase/migrations/` | Per-user notification settings |
| `NotificationBell.tsx` | `src/components/notifications/` | Header bell icon with badge |
| `NotificationDropdown.tsx` | `src/components/notifications/` | Dropdown list of notifications |
| `NotificationSettings.tsx` | `src/components/notifications/` | Preference toggles |
| `usePushNotifications.ts` | `src/hooks/` | Push subscription hook |
| `useRealtimeNotifications.ts` | `src/hooks/` | Supabase Realtime hook |
| `/api/notifications/` | `src/app/api/` | API routes |
| `service-worker.js` | `public/` | Service worker for push |

### Modified Components

| Component | Modification |
|-----------|-------------|
| Header | Add NotificationBell component |
| DashboardLayout | Initialize push subscription on mount |
| Contractor portal | Subscribe to work order updates |
| Settings page | Add notification preferences section |

### Data Model

```sql
-- Push subscription storage (Web Push)
CREATE TABLE notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User link (nullable for contractor subscriptions)
  user_id UUID REFERENCES users(id),
  contractor_token TEXT,  -- For magic-link users

  -- Web Push subscription
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  -- Device info
  user_agent TEXT,
  device_type TEXT,  -- 'mobile', 'desktop', 'tablet'

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(endpoint)
);

-- Notification history
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id UUID REFERENCES users(id),
  contractor_email TEXT,  -- For external recipients

  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  action_url TEXT,  -- Deep link

  -- Source
  notification_type TEXT NOT NULL,
  -- 'work_order_sent', 'work_order_accepted', 'invoice_approved',
  -- 'change_order_submitted', 'inspection_scheduled', etc.

  entity_type TEXT,
  entity_id UUID,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'read', 'failed'
  )),
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Channel preferences
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,  -- Future

  -- Event type preferences (JSONB for flexibility)
  event_preferences JSONB DEFAULT '{
    "work_order_received": true,
    "work_order_status_change": true,
    "invoice_pending": true,
    "change_order_submitted": true,
    "inspection_scheduled": true,
    "low_stock_alert": true
  }'::JSONB,

  -- Quiet hours
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);
```

### Integration Points

1. **Work Order Events**: Existing `work_order_events` can trigger notifications
2. **Supabase Realtime**: Subscribe to table changes for real-time UI updates
3. **Service Worker**: Standard Web Push API for background notifications
4. **Contractor Portal**: Subscribe to work order updates via magic-link token
5. **Header Integration**: Bell icon in existing Header component

### Notification Triggers

| Event | Recipients | Trigger |
|-------|------------|---------|
| Work order sent | Contractor | `work_orders` INSERT with status='sent' |
| Work order accepted/rejected | KEWA admin | `work_order_events` INSERT |
| Counter-offer submitted | KEWA admin | `work_order_events` INSERT |
| Invoice received | Accounting | `invoices` INSERT |
| Invoice approved | Contractor | `invoices` UPDATE status='approved' |
| Change order submitted | Project manager | `change_orders` INSERT |
| Inspection scheduled | All parties | `inspections` INSERT |
| Low stock alert | Property manager | `supplier_products` UPDATE (check threshold) |

### Implementation Pattern

```typescript
// Supabase Realtime for UI updates
const channel = supabase
  .channel('work-order-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'work_orders',
    filter: `partner_id=eq.${partnerId}`
  }, (payload) => {
    // Update UI, show toast, increment badge
  })
  .subscribe()

// Push notification trigger (database function)
CREATE OR REPLACE FUNCTION notify_on_work_order_sent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    INSERT INTO notifications (user_id, title, body, notification_type, entity_type, entity_id)
    VALUES (
      -- contractor's user_id or contractor_email
      NEW.partner_id,  -- resolve to user
      'Neuer Auftrag',
      'Sie haben einen neuen Auftrag erhalten: ' || NEW.title,
      'work_order_sent',
      'work_order',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Knowledge Base

Searchable FAQ and documentation. Simple content management with categorization.

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `kb_articles` table | `supabase/migrations/` | Article content with metadata |
| `kb_categories` table | `supabase/migrations/` | Article categorization |
| `ArticleList.tsx` | `src/components/knowledge-base/` | Article listing with search |
| `ArticleDetail.tsx` | `src/components/knowledge-base/` | Article view with markdown rendering |
| `ArticleEditor.tsx` | `src/components/knowledge-base/` | Admin article editor |
| `KBSearch.tsx` | `src/components/knowledge-base/` | Full-text search component |
| `/dashboard/wissensbasis/` | `src/app/dashboard/` | Knowledge base pages |
| `/contractor/[token]/help/` | `src/app/contractor/` | Contractor-visible articles |
| `/api/knowledge-base/` | `src/app/api/` | API routes |

### Modified Components

| Component | Modification |
|-----------|-------------|
| Contractor portal | Add "Hilfe" link to knowledge base articles |
| Header | Add knowledge base link (optional) |
| Dashboard | Quick search widget for KB articles |

### Data Model

```sql
-- Article categories
CREATE TABLE kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES kb_categories(id),  -- For nested categories
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base articles
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,  -- Short preview text
  content TEXT NOT NULL,  -- Markdown content

  -- Classification
  category_id UUID REFERENCES kb_categories(id),
  tags TEXT[],  -- For additional filtering

  -- Visibility
  visibility TEXT DEFAULT 'internal' CHECK (visibility IN (
    'internal',     -- KEWA only
    'contractors',  -- Visible to contractors
    'public'        -- Future: tenant portal
  )),

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,

  -- Search optimization
  search_vector TSVECTOR,  -- PostgreSQL full-text search

  -- Engagement
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,  -- Thumbs up

  -- Metadata
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX idx_kb_articles_search ON kb_articles USING GIN(search_vector);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION kb_articles_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('german', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('german', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_articles_search_update
  BEFORE INSERT OR UPDATE OF title, summary, content ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION kb_articles_search_trigger();

-- Article feedback (optional)
CREATE TABLE kb_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(article_id, user_id)  -- One feedback per user per article
);
```

### Integration Points

1. **Contractor Portal**: Filtered articles with `visibility = 'contractors'`
2. **Full-Text Search**: PostgreSQL tsvector for German language search
3. **Markdown Rendering**: Use existing patterns or add `react-markdown`
4. **Analytics**: Track view counts for popular articles
5. **Comments**: Could use polymorphic comments pattern for discussions

### Visibility Matrix

| Article Visibility | KEWA Staff | Contractors | Future Tenants |
|-------------------|------------|-------------|----------------|
| internal | Yes | No | No |
| contractors | Yes | Yes | No |
| public | Yes | Yes | Yes |

## Suggested Build Order

Based on dependencies and integration complexity:

### Phase 1: Knowledge Base (Foundation)
**Rationale:** Simplest new feature, no dependencies on other v2.2 features, establishes content patterns.

1. Database migrations (kb_categories, kb_articles)
2. API routes with full-text search
3. Admin article editor
4. Article list and detail views
5. Contractor portal integration

**Estimated effort:** 1-2 phases

### Phase 2: Supplier Module
**Rationale:** Extends existing partners pattern, provides foundation for material tracking in other features.

1. Database migrations (supplier_products, supplier_orders, inventory_movements)
2. Supplier filtering in partner list
3. Product catalog with stock levels
4. Order creation and tracking
5. Inventory dashboard with alerts

**Estimated effort:** 2-3 phases

### Phase 3: Change Orders
**Rationale:** Core renovation workflow enhancement, integrates with cost tracking.

1. Database migrations with status workflow trigger
2. Change order form with line items
3. Approval workflow (submit -> review -> approve/reject)
4. PDF generation
5. Integration with project cost dashboard
6. Link to work orders

**Estimated effort:** 2-3 phases

### Phase 4: Inspection Workflow
**Rationale:** Depends on project status workflow, extends quality gates.

1. Database migrations (inspections, inspection_items)
2. Inspection checklist from quality gates
3. Digital sign-off capability
4. Deficiency tracking with remediation
5. Abnahmeprotokoll PDF
6. Project status integration (finished -> approved)

**Estimated effort:** 2-3 phases

### Phase 5: Push Notifications
**Rationale:** Enhances all other features, should be built last so all event sources exist.

1. Database migrations (subscriptions, notifications, preferences)
2. Service worker and Web Push setup
3. Subscription management
4. Notification bell UI component
5. Trigger functions for each event type
6. Supabase Realtime integration
7. Contractor portal notifications

**Estimated effort:** 2-3 phases

### Total Estimated Phases: 9-14 phases

## Risk Areas

### Push Notifications - Highest Complexity
- **Web Push requires HTTPS and service worker** - Ensure Vercel deployment has proper SSL
- **Subscription management across sessions** - Users need to re-subscribe on new devices
- **iOS Safari limitations** - Web Push has limited support pre-iOS 16.4
- **Background sync** - Service worker lifecycle management

### Change Orders - Cost Integration
- **Variance calculations** - Need to maintain accuracy with original estimates
- **Applied state** - Once applied, change orders modify project scope
- **Cascading updates** - Approved COs may need to update project dates and costs

### Inspection Workflow - Status Coupling
- **Blocking transitions** - Failed inspections should block project approval
- **Deficiency lifecycle** - Need clear remediation workflow
- **Multiple inspection types** - Intermediate vs final vs followup logic

### Supplier Module - Inventory Accuracy
- **Real-time stock levels** - Need atomic operations for concurrent updates
- **Multi-location inventory** - If inventory is per-building, adds complexity
- **Pellets seasonality** - May need forecasting or alerts for peak usage

### Knowledge Base - Content Management
- **German full-text search** - Need proper PostgreSQL configuration for German dictionary
- **Markdown security** - Sanitize user-generated content
- **Media attachments** - Images in articles need storage integration

## Cross-Feature Dependencies

```
Knowledge Base
    (standalone)

Supplier Module
    depends on: partners table (exists)
    integrates with: work orders (optional)

Change Orders
    depends on: renovation_projects (exists)
    integrates with: work orders, cost dashboard

Inspection Workflow
    depends on: renovation_projects (exists)
    depends on: project_quality_gates (exists)
    integrates with: work orders, condition tracking

Push Notifications
    depends on: all other features (triggers from each)
    integrates with: contractor portal
```

## Architecture Patterns Summary

| Pattern | Existing Example | Apply To |
|---------|-----------------|----------|
| Status state machine | `work_order_status`, `renovation_status` | `change_order_status`, `inspection status` |
| Polymorphic entities | `comments.entity_type` | Inspections, notifications |
| Event logging | `work_order_events` | Change order events, notification history |
| JSONB line items | `invoices.line_items` | Change order line items, order line items |
| Full-text search | (new) | Knowledge base articles |
| Server Components | Dashboard pages | All list pages |
| PDF generation | `@react-pdf/renderer` | Change order PDF, Abnahmeprotokoll |
| Trigger-based updates | `update_room_condition_from_project` | Notification triggers, stock level updates |
