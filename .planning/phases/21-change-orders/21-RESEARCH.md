# Phase 21: Change Orders - Research

**Researched:** 2026-01-28
**Domain:** Change order management, approval workflows, budget impact tracking
**Confidence:** HIGH

## Summary

Phase 21 implements change order management for construction projects with full approval workflows, cost impact visibility, and client portal integration. Research confirms this requires four complementary subsystems:

1. **Change Order CRUD with Versioning**: Entity design following existing patterns (purchase orders, work orders). Core table with line items in JSONB, versioning via history table (temporal pattern used in knowledge base Phase 18). Reference numbering using same sequence pattern as purchase orders (CO-YYYY-NNNNN). Each version preserved with change reason and revision history.

2. **Approval Workflow with Threshold Escalation**: State machine pattern already proven in purchase orders and knowledge base. Status transitions: draft → submitted → under_review → approved/rejected/cancelled. Threshold-based routing configurable per organization (e.g., <5000 CHF property manager approves, ≥5000 CHF escalates to finance director). Counter-offers create new version and reset to submitted status.

3. **Photo Evidence and PDF Generation**: Reuse existing media bucket pattern from knowledge base attachments. PDF generation via @react-pdf/renderer (already in stack from work order PDFs). Similar layout to work order PDF: header, change details, line items table, cost summary, approval signature area.

4. **Dashboard Analytics and Client Portal**: Waterfall chart implementation using recharts ComposedChart with stacked bars (no native waterfall component). Budget impact visualization: original budget → +approved COs → current budget. Client portal reuses magic_link_tokens system with purpose 'change_order_approval', 7-day expiry per existing pattern.

**Primary recommendation:** Extend proven patterns from existing modules. Change orders follow purchase order structure (line items, sequence numbering, status workflow). Versioning follows knowledge base temporal tables pattern. PDF generation reuses work order PDF patterns. Client portal reuses magic link system. Waterfall charts use recharts ComposedChart with data transformation for stacked bar waterfall effect.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | existing | API routes + Server Components | Already in stack |
| Supabase | existing | Database + Storage + Auth | Already in stack |
| PostgreSQL | existing | Sequences, triggers, JSONB, temporal tables | Already in stack |
| @react-pdf/renderer | ^4.3.2 | PDF generation (work orders proven) | Already in stack for work orders |
| recharts | ^3.7.0 | Waterfall chart for budget impact | Already in stack from Phase 20 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | existing | Date formatting (Swiss German) | Already in stack |
| Tiptap | existing | Rich text for change reason details | If needed for detailed descriptions |
| magic_link_tokens | existing | Client portal access tokens | Already implemented in Phase 9 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB history table | Audit logs only | History table better for version reconstruction, audit logs better for change tracking |
| Recharts waterfall | Chart.js waterfall plugin | Recharts already in stack, simpler for React |
| Sequential numbering | UUID only | Sequential numbers required for business operations (CO-2026-00001) |
| Magic links | Email + password login | Magic links proven pattern for external clients |

**Installation:**
```bash
# All dependencies already in stack from previous phases
# No additional packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── change-orders/
│   │   │   ├── route.ts                      # GET (list), POST (create)
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts                  # GET, PATCH, DELETE
│   │   │   │   ├── versions/route.ts         # GET version history
│   │   │   │   ├── revise/route.ts           # POST create counter-offer revision
│   │   │   │   ├── approve/route.ts          # POST approve change order
│   │   │   │   ├── reject/route.ts           # POST reject with comment
│   │   │   │   ├── cancel/route.ts           # POST cancel approved CO
│   │   │   │   └── pdf/route.ts              # GET PDF download
│   │   │   └── [id]/photos/route.ts          # GET, POST photo attachments
│   │   └── projects/
│   │       └── [id]/
│   │           └── change-orders/
│   │               └── analytics/route.ts     # GET budget impact data
│   ├── dashboard/
│   │   ├── aenderungsauftraege/              # German: Change Orders
│   │   │   ├── page.tsx                      # All COs list with filters
│   │   │   ├── neu/page.tsx                  # Create new CO
│   │   │   └── [id]/
│   │   │       ├── page.tsx                  # CO detail view
│   │   │       └── bearbeiten/page.tsx       # Edit CO
│   │   └── projekte/
│   │       └── [id]/
│   │           └── aenderungsauftraege/page.tsx  # Project CO summary widget
│   └── portal/
│       └── change-orders/
│           └── [token]/page.tsx              # Client approval portal
├── components/
│   └── change-orders/
│       ├── ChangeOrderForm.tsx               # Create/edit CO with line items
│       ├── ChangeOrderStatusBadge.tsx        # Status indicator
│       ├── ChangeOrderList.tsx               # Filterable list with status pills
│       ├── ChangeOrderDetail.tsx             # Full CO display with versions
│       ├── VersionHistoryTimeline.tsx        # Visual revision history
│       ├── ApprovalWorkflowCard.tsx          # Approval status + actions
│       ├── LineItemEditor.tsx                # Reuse from suppliers (bidirectional)
│       ├── PhotoEvidenceUpload.tsx           # Multi-photo upload
│       ├── PhotoGallery.tsx                  # Lightbox photo viewer
│       ├── BudgetImpactChart.tsx             # Recharts waterfall chart
│       ├── BudgetSummaryCards.tsx            # Summary metrics
│       └── ChangeOrderPDF.tsx                # PDF template component
├── lib/
│   ├── change-orders/
│   │   ├── queries.ts                        # Database queries
│   │   ├── workflow.ts                       # Status transition validation
│   │   ├── versioning.ts                     # Version management
│   │   ├── threshold-routing.ts              # Escalation logic
│   │   └── budget-calculations.ts            # Impact calculations
│   └── pdf/
│       └── change-order-pdf.tsx              # PDF generation (like work-order-pdf.tsx)
└── types/
    └── change-orders.ts                      # TypeScript types
```

### Pattern 1: Change Order with Versioning
**What:** Change order entity with revision history (counter-offers create new versions)
**When to use:** Any modification to submitted change order (pricing negotiation, scope adjustment)
**Example:**
```typescript
// Database schema pattern (following knowledge base temporal tables)

CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  co_number TEXT UNIQUE NOT NULL,              -- CO-YYYY-NNNNN from sequence
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  related_work_order_ids UUID[],               -- Additional affected WOs

  -- Current version data
  version INTEGER DEFAULT 1,
  description TEXT NOT NULL,
  reason_category TEXT NOT NULL,               -- Enum or check constraint
  reason_details TEXT,
  line_items JSONB DEFAULT '[]',               -- Same structure as offers/purchase_orders
  schedule_impact_days INTEGER DEFAULT 0,      -- Positive or negative

  -- Status workflow
  status change_order_status DEFAULT 'draft',

  -- Tracking
  created_by UUID REFERENCES users(id),
  creator_type TEXT NOT NULL,                  -- 'internal' or 'contractor'
  current_approver_id UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT
);

CREATE TABLE change_order_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  description TEXT NOT NULL,
  line_items JSONB NOT NULL,
  schedule_impact_days INTEGER,
  total_amount DECIMAL(12,2),
  revised_by UUID REFERENCES users(id),
  revised_at TIMESTAMPTZ DEFAULT NOW(),
  revision_reason TEXT,
  UNIQUE(change_order_id, version)
);

CREATE SEQUENCE change_order_seq START WITH 1 INCREMENT BY 1;

-- Version trigger (like kb_articles_version_trigger)
CREATE OR REPLACE FUNCTION change_order_version_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.version < NEW.version) THEN
    INSERT INTO change_order_versions (
      change_order_id, version, description, line_items,
      schedule_impact_days, total_amount, revised_by, revision_reason
    ) VALUES (
      OLD.id, OLD.version, OLD.description, OLD.line_items,
      OLD.schedule_impact_days, OLD.total_amount,
      NEW.current_approver_id, NEW.reason_details
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Pattern 2: Threshold-Based Approval Routing
**What:** Dynamic approver assignment based on configurable CHF thresholds
**When to use:** Determining who must approve a change order based on total amount
**Example:**
```typescript
// Source: Kissflow approval workflow patterns + existing knowledge base workflow

// Configurable thresholds (stored in settings table)
interface ApprovalThreshold {
  id: string
  min_amount: number | null    // null = no minimum
  max_amount: number | null    // null = no maximum
  approver_role: 'property_manager' | 'finance_director' | 'ceo'
  priority: number              // Lower number = higher priority for overlapping ranges
}

// Example thresholds:
// { min: null, max: 5000, role: 'property_manager', priority: 1 }      // < 5000 CHF
// { min: 5000, max: 25000, role: 'finance_director', priority: 2 }     // 5000-25000 CHF
// { min: 25000, max: null, role: 'ceo', priority: 3 }                  // > 25000 CHF

async function determineApprover(changeOrder: ChangeOrder): Promise<User> {
  const totalAmount = calculateTotalAmount(changeOrder.line_items)

  // Query thresholds ordered by priority
  const threshold = await db.query(
    `SELECT approver_role FROM approval_thresholds
     WHERE (min_amount IS NULL OR $1 >= min_amount)
       AND (max_amount IS NULL OR $1 < max_amount)
     ORDER BY priority ASC
     LIMIT 1`,
    [totalAmount]
  )

  // Get user with matching role for the project
  return getUserWithRole(changeOrder.project_id, threshold.approver_role)
}

// Status transition validation (like purchase_order_status_transition)
CREATE OR REPLACE FUNCTION validate_change_order_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["submitted", "cancelled"],
    "submitted": ["under_review", "draft", "cancelled"],
    "under_review": ["approved", "rejected", "submitted", "cancelled"],
    "approved": ["cancelled"],
    "rejected": [],
    "cancelled": []
  }'::JSONB;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF NOT (NEW.status::TEXT = ANY(
    ARRAY(SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT))
  )) THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', OLD.status, NEW.status;
  END IF;

  -- Auto-set timestamps
  CASE NEW.status
    WHEN 'submitted' THEN NEW.submitted_at = NOW();
    WHEN 'approved' THEN NEW.approved_at = NOW();
    WHEN 'rejected' THEN NEW.rejected_at = NOW();
    WHEN 'cancelled' THEN NEW.cancelled_at = NOW();
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Pattern 3: Recharts Waterfall Chart for Budget Impact
**What:** Budget visualization showing original budget + cumulative change orders
**When to use:** Project detail page, change order analytics dashboard
**Example:**
```typescript
// Source: Recharts waterfall implementation patterns
// https://medium.com/2359media/tutorial-how-to-create-a-waterfall-chart-in-recharts-15a0e980d4b
// https://github.com/celiaongsl/recharts-waterfall

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface BudgetWaterfallProps {
  originalBudget: number
  changeOrders: Array<{
    co_number: string
    description: string
    total_amount: number  // Can be positive or negative
    approved_at: string
  }>
}

// Transform data for waterfall effect using stacked bars
function transformToWaterfallData(originalBudget: number, changeOrders: any[]) {
  let cumulative = originalBudget
  const data = [
    {
      name: 'Original Budget',
      value: originalBudget,
      invisible: 0,
      fill: '#3b82f6'
    }
  ]

  changeOrders.forEach((co, index) => {
    const previousCumulative = cumulative
    cumulative += co.total_amount

    data.push({
      name: co.co_number,
      value: Math.abs(co.total_amount),
      invisible: co.total_amount > 0 ? previousCumulative : cumulative,
      fill: co.total_amount > 0 ? '#10b981' : '#ef4444',  // Green for additions, red for credits
      label: co.description
    })
  })

  // Final total bar
  data.push({
    name: 'Current Budget',
    value: cumulative,
    invisible: 0,
    fill: '#6366f1'
  })

  return data
}

export function BudgetWaterfallChart({ originalBudget, changeOrders }: BudgetWaterfallProps) {
  const data = transformToWaterfallData(originalBudget, changeOrders)

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
        <YAxis
          label={{ value: 'CHF', angle: -90, position: 'insideLeft' }}
          tickFormatter={(value) => `CHF ${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: number) => [
            new Intl.NumberFormat('de-CH', {
              style: 'currency',
              currency: 'CHF'
            }).format(value),
            'Amount'
          ]}
        />
        <Legend />
        {/* Invisible bar for stacking offset */}
        <Bar dataKey="invisible" stackId="stack" fill="transparent" />
        {/* Visible bar showing value */}
        <Bar dataKey="value" stackId="stack">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 4: Change Order PDF Generation
**What:** PDF document for client approval (print/email)
**When to use:** Generating formal change order documentation
**Example:**
```typescript
// Source: Existing work-order-pdf.tsx pattern
// @react-pdf/renderer manual table layout with flexbox

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#1a365d'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d'
  },
  // Line items table (manual flexbox layout)
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  col1: { width: '40%', paddingRight: 5 },  // Description
  col2: { width: '15%', textAlign: 'right' }, // Quantity
  col3: { width: '20%', textAlign: 'right' }, // Unit Price
  col4: { width: '25%', textAlign: 'right' }, // Total
  // ... similar to work-order-pdf.tsx
})

function ChangeOrderPDFDocument({ data }: { data: ChangeOrderPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Änderungsauftrag {data.co_number}</Text>
        </View>

        {/* Line Items Table */}
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Beschreibung</Text>
          <Text style={styles.col2}>Menge</Text>
          <Text style={styles.col3}>Einzelpreis</Text>
          <Text style={styles.col4}>Total</Text>
        </View>

        {data.line_items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>{item.description}</Text>
            <Text style={styles.col2}>{item.quantity} {item.unit}</Text>
            <Text style={styles.col3}>CHF {item.unit_price.toFixed(2)}</Text>
            <Text style={styles.col4}>CHF {item.total.toFixed(2)}</Text>
          </View>
        ))}

        {/* Total Summary */}
        {/* Signature Area */}
      </Page>
    </Document>
  )
}

export async function generateChangeOrderPDF(changeOrder: ChangeOrder): Promise<Buffer> {
  const pdfData = transformToPDFData(changeOrder)
  const buffer = await renderToBuffer(<ChangeOrderPDFDocument data={pdfData} />)
  return Buffer.from(buffer)
}
```

### Pattern 5: Client Portal with Magic Links
**What:** External client approval interface with time-limited access
**When to use:** Sending change order for client approval
**Example:**
```typescript
// Source: Existing magic_link_tokens system (migration 024)

// Create magic link for change order approval
async function createChangeOrderApprovalLink(changeOrderId: string, clientEmail: string) {
  const token = await db.query(
    `SELECT create_magic_link_token(
      $1,                              -- email
      'change_order_approval',         -- purpose
      NULL,                            -- work_order_id (not used)
      NULL,                            -- user_id (not used)
      168,                             -- 7 days in hours
      $2                               -- created_by
    )`,
    [clientEmail, currentUserId]
  )

  // Store CO reference in separate change_order_tokens table
  await db.query(
    `INSERT INTO change_order_tokens (token, change_order_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [token, changeOrderId]
  )

  return `https://kewa.ch/portal/change-orders/${token}`
}

// Portal page: /app/portal/change-orders/[token]/page.tsx
export default async function ChangeOrderPortalPage({ params }: { params: { token: string } }) {
  // Validate token
  const validation = await db.query(
    `SELECT * FROM validate_magic_link_token($1)`,
    [params.token]
  )

  if (!validation.is_valid) {
    return <div>Link expired or invalid</div>
  }

  // Fetch change order (join with change_order_tokens)
  const changeOrder = await db.query(
    `SELECT co.* FROM change_orders co
     JOIN change_order_tokens cot ON cot.change_order_id = co.id
     WHERE cot.token = $1`,
    [params.token]
  )

  // Render approval interface
  return (
    <div>
      <ChangeOrderDetail data={changeOrder} readOnly />
      <ApprovalActions
        onApprove={() => approveChangeOrder(changeOrder.id, params.token)}
        onReject={(comment) => rejectChangeOrder(changeOrder.id, comment)}
      />
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Hard-deleting change orders**: Always soft-delete with status='cancelled' and reason. Regulatory compliance requires complete audit trail.
- **Unversioned counter-offers**: Each revision must create new version in history table. Overwriting destroys negotiation history.
- **Client-side-only validation**: Status transitions MUST be validated in database trigger. API validation alone is insufficient (direct DB access bypasses it).
- **Global approver configuration**: Approval thresholds must support per-project or per-client overrides for flexibility.
- **Monolithic PDF component**: Split into reusable sections (header, line items table, footer) for maintainability.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sequential numbering | UUID + manual counter | PostgreSQL sequence with function | Race conditions, gaps on rollback, sequence guarantees uniqueness |
| Waterfall chart | Custom SVG/Canvas | Recharts ComposedChart with transform | Edge cases (negative values, ordering), responsive sizing, tooltips |
| Status workflow validation | API-level checks | Database trigger + JSONB transition map | Prevents invalid states from direct DB access, enforces at data layer |
| Version history | Audit log parsing | Temporal table pattern | Audit logs track changes, history tables reconstruct versions |
| PDF table layout | Custom positioned elements | Flexbox with width percentages | Column alignment, dynamic rows, responsive text wrapping |
| Magic link security | Custom token generation | Existing magic_link_tokens system | Expiry handling, revocation, used_at tracking, validation function |
| Line item calculations | Client-side only | Database computed columns + client | Single source of truth, prevents drift between create/update |

**Key insight:** Change orders combine proven patterns from multiple existing modules. Don't rebuild what exists—extend purchase order workflows, knowledge base versioning, work order PDFs, and magic link authentication. The complexity is in the integration, not individual components.

## Common Pitfalls

### Pitfall 1: Version Number Conflicts During Concurrent Revisions
**What goes wrong:** Two approvers create counter-offers simultaneously, both using version 2. Second write overwrites first without merge.
**Why it happens:** Version incremented in application code instead of database. Race condition between read current version and write new version.
**How to avoid:** Use database-level version increment with optimistic locking:
```sql
UPDATE change_orders
SET version = version + 1,
    line_items = $1,
    updated_at = NOW()
WHERE id = $2 AND version = $3  -- WHERE includes current version
RETURNING version;

-- If affected rows = 0, version conflict occurred
```
**Warning signs:** Version numbers skip (e.g., 1 → 3) or duplicate versions in change_order_versions table.

### Pitfall 2: Orphaned Change Orders When Work Order Deleted
**What goes wrong:** User deletes work order, leaves change orders pointing to non-existent WO. Cascading delete removes COs and destroys financial records.
**Why it happens:** Foreign key constraint without proper cascade behavior. Need preservation for audit/compliance.
**How to avoid:** Prevent work order deletion if change orders exist:
```sql
CREATE OR REPLACE FUNCTION prevent_work_order_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM change_orders
    WHERE work_order_id = OLD.id
      AND status IN ('approved', 'submitted', 'under_review')
  ) THEN
    RAISE EXCEPTION 'Cannot delete work order with active change orders';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_work_order_deletion
BEFORE DELETE ON work_orders
FOR EACH ROW EXECUTE FUNCTION prevent_work_order_deletion();
```
**Warning signs:** Referential integrity errors, missing work order names in CO lists, broken links in UI.

### Pitfall 3: Negative Line Items Not Handled in Budget Calculations
**What goes wrong:** Change order with scope reduction (negative amount) displays incorrect total. Waterfall chart shows inverted bars or crashes.
**Why it happens:** Assuming all line items are additions. Calculations use Math.abs() without checking sign. Chart data transformation doesn't handle negative cumulative values.
**How to avoid:** Preserve sign through full calculation pipeline:
```typescript
// Line item total can be negative
const lineItemTotal = quantity * unit_price  // No Math.abs()

// Change order total is algebraic sum
const coTotal = lineItems.reduce((sum, item) => sum + item.total, 0)

// Waterfall chart handles negatives explicitly
data.push({
  name: co.co_number,
  value: Math.abs(co.total_amount),            // Bar height always positive
  invisible: co.total_amount > 0
    ? previousCumulative                       // Start from previous for additions
    : cumulative,                              // Start from new for reductions
  fill: co.total_amount > 0 ? '#10b981' : '#ef4444'  // Color indicates direction
})
```
**Warning signs:** Budget summary shows wrong current budget. Credits appear as additions. Waterfall bars stack incorrectly.

### Pitfall 4: Magic Link Reuse After Approval/Rejection
**What goes wrong:** Client clicks "Approve", then refreshes page and clicks "Approve" again. Creates duplicate approval records or changes already-approved CO.
**Why it happens:** Magic link validation doesn't mark token as used. Portal allows actions after first use.
**How to avoid:** Mark token as used after first action AND validate CO status:
```typescript
async function approveChangeOrder(changeOrderId: string, token: string) {
  // Validate token (marks as used)
  const validation = await db.query(
    `SELECT * FROM validate_magic_link_token($1)`,  // Sets used_at = NOW()
    [token]
  )

  if (!validation.is_valid) {
    throw new Error('Token expired or already used')
  }

  // Check current status (prevent approval of already-approved CO)
  const result = await db.query(
    `UPDATE change_orders
     SET status = 'approved', approved_at = NOW()
     WHERE id = $1 AND status = 'under_review'  -- Only if still pending
     RETURNING id`,
    [changeOrderId]
  )

  if (result.rowCount === 0) {
    throw new Error('Change order already processed or invalid status')
  }
}
```
**Warning signs:** Duplicate approval timestamps. Token used_at is null despite action taken. Multiple state transitions logged for single portal visit.

### Pitfall 5: Threshold Routing Without Override Mechanism
**What goes wrong:** VIP client project requires CEO approval regardless of amount. System routes 2000 CHF CO to property manager per thresholds, client furious they weren't consulted.
**Why it happens:** Global threshold configuration without per-project or per-client exceptions. Rigidity over business flexibility.
**How to avoid:** Support override configuration at multiple levels:
```typescript
// Check project-specific overrides first
interface ApprovalConfig {
  project_id?: string         // Project-specific override
  client_id?: string          // Client-specific override
  min_amount: number | null
  max_amount: number | null
  approver_role: string
  requires_client_approval: boolean  // Force magic link even if internal approval sufficient
}

async function determineApprover(changeOrder: ChangeOrder): Promise<ApprovalConfig> {
  // 1. Check project-specific override
  let config = await db.query(
    `SELECT * FROM approval_thresholds
     WHERE project_id = $1 AND ...`,
    [changeOrder.project_id]
  )

  // 2. Fallback to client-specific
  if (!config) {
    config = await db.query(
      `SELECT * FROM approval_thresholds
       WHERE client_id = (SELECT client_id FROM projects WHERE id = $1) AND ...`,
      [changeOrder.project_id]
    )
  }

  // 3. Fallback to global thresholds
  if (!config) {
    config = await db.query(
      `SELECT * FROM approval_thresholds
       WHERE project_id IS NULL AND client_id IS NULL AND ...`
    )
  }

  return config
}
```
**Warning signs:** Escalation complaints. Support tickets about "why wasn't I notified?" Hardcoded threshold values in application code.

## Code Examples

Verified patterns from codebase:

### Line Items JSONB Structure (Reuse from Offers/Purchase Orders)
```typescript
// Source: supabase/migrations/017_offer.sql, 051_purchase_orders.sql
// Structure: { id, description, quantity, unit, unit_price, total }

interface ChangeOrderLineItem {
  id: string                    // Client-generated UUID for editing
  description: string
  quantity: number
  unit: string                  // 'm²', 'Stk', 'Pauschal', etc.
  unit_price: number            // Can be negative for credits
  total: number                 // quantity * unit_price (can be negative)
}

// Storage in JSONB column
line_items JSONB DEFAULT '[]'

// Validation in application layer (reuse from LineItemEditor.tsx)
export function calculateLineItemTotal(item: ChangeOrderLineItem): number {
  return item.quantity * item.unit_price  // Preserve sign for credits
}

export function calculateChangeOrderTotal(lineItems: ChangeOrderLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.total, 0)
}
```

### Status Transition Trigger (Pattern from Purchase Orders)
```sql
-- Source: supabase/migrations/051_purchase_orders.sql
-- Adapted for change orders

CREATE TYPE change_order_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'cancelled'
);

CREATE OR REPLACE FUNCTION validate_change_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["submitted", "cancelled"],
    "submitted": ["under_review", "cancelled"],
    "under_review": ["approved", "rejected", "submitted", "cancelled"],
    "approved": ["cancelled"],
    "rejected": [],
    "cancelled": []
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  allowed_next := ARRAY(
    SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT)
  );

  IF NOT (NEW.status::TEXT = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next, ', ');
  END IF;

  -- Auto-set timestamps
  CASE NEW.status
    WHEN 'submitted' THEN NEW.submitted_at = NOW();
    WHEN 'approved' THEN NEW.approved_at = NOW();
    WHEN 'rejected' THEN NEW.rejected_at = NOW();
    WHEN 'cancelled' THEN NEW.cancelled_at = NOW();
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER change_orders_status_transition
  BEFORE UPDATE OF status ON change_orders
  FOR EACH ROW EXECUTE FUNCTION validate_change_order_status_transition();
```

### Photo Attachments (Pattern from Knowledge Base)
```sql
-- Source: supabase/migrations/050_kb_attachments.sql
-- Adapted for change order photos

CREATE TABLE change_order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- change_orders/{co_id}/photos/{filename}
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket: 'media' (reuse existing)
-- Path convention: change_orders/{uuid}/photos/{timestamp}-{filename}
-- Signed URLs with 1-hour expiry for secure access
```

### Audit Trail Logging (Pattern from Audit Logs)
```sql
-- Source: supabase/migrations/016_audit_log.sql
-- Create audit log entries for all CO status changes

CREATE OR REPLACE FUNCTION log_change_order_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM create_audit_log(
      'change_orders',
      NEW.id,
      'update'::audit_action,
      NEW.updated_by,
      NULL,  -- user_role
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'reason', NEW.reason_details)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER change_orders_audit
  AFTER UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION log_change_order_audit();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual sequential numbering | Database sequences with functions | 2024+ | Prevents race conditions, gaps handled automatically |
| Single approval step | Threshold-based escalation | 2025+ | Flexibility for different dollar amounts, configurable per org |
| Overwrite on revision | Temporal versioning with history table | 2024+ | Preserves negotiation history, enables version comparison |
| Email attachments for photos | Cloud storage with signed URLs | 2023+ | Scalability, bandwidth efficiency, mobile-friendly |
| Chart.js for visualizations | Recharts | 2024+ | Better React integration, simpler API, smaller bundle |
| Custom waterfall implementation | ComposedChart with stacked bars | 2025+ | Recharts doesn't have native waterfall, stacked bar pattern standard |
| Password-protected portals | Magic link tokens | 2023+ | Better UX for external clients, no password management |

**Deprecated/outdated:**
- **Global approval workflow**: Now threshold-based with escalation rules (Kissflow, Cflow 2026 patterns)
- **Single-document model**: Now supports versioning for counter-offers (Document Versioning Pattern 2026)
- **Native waterfall charts in Recharts**: Never existed, stacked bar transformation is standard approach

## Open Questions

Things that couldn't be fully resolved:

1. **Approval Matrix Complexity**
   - What we know: Thresholds route by dollar amount. Multiple roles (property manager, finance, CEO).
   - What's unclear: Should parallel approvals be supported (e.g., both finance AND client for >10k CHF)? Or always sequential?
   - Recommendation: Start with sequential approval (simpler state machine). Add parallel in Phase 22+ if client feedback requires it. CONTEXT.md shows threshold-based escalation only, not parallel.

2. **Change Order Numbering Reset Frequency**
   - What we know: Format is CO-YYYY-NNNNN. Sequence auto-increments.
   - What's unclear: Should sequence reset yearly (CO-2026-00001, CO-2027-00001) or run continuously (CO-2026-00001, CO-2026-00002, ..., CO-2027-12345)?
   - Recommendation: No yearly reset (continuous sequence). Simpler logic, no Y2K-style rollover bugs. YYYY in format is creation year, not sequence reset boundary. Like invoice numbers in accounting systems.

3. **Client Approval vs. Internal Approval Relationship**
   - What we know: CONTEXT.md says "contractor can submit via magic-link portal OR KEWA enters on their behalf" and "client can approve via magic-link portal."
   - What's unclear: If KEWA staff approves internally, does client still need to approve via portal? Or is internal approval sufficient for contractor-initiated COs?
   - Recommendation: Internal approval first (threshold-based), then optional client approval controlled by requires_client_approval flag on approval_thresholds. Some clients want visibility on all COs, others trust KEWA judgment. Per-project configuration in approval_thresholds table.

4. **Cancelled vs. Rejected Status Distinction**
   - What we know: Status workflow includes both 'rejected' and 'cancelled'. CONTEXT.md shows cancelled requires mandatory reason.
   - What's unclear: When to use each? Is rejected = client/approver said no, cancelled = KEWA staff withdrew it?
   - Recommendation: Rejected = approver declined during workflow. Cancelled = withdrawn by creator OR approved CO later invalidated. Both require reason. Cancelled allowed from any status, rejected only during under_review.

## Sources

### Primary (HIGH confidence)
- Codebase migrations 016, 017, 024, 048, 051 (audit logs, offers, magic links, knowledge base, purchase orders)
- Existing patterns: work-order-pdf.tsx, PriceHistoryChart.tsx, LineItemEditor.tsx
- Package.json dependencies (@react-pdf/renderer 4.3.2, recharts 3.7.0)

### Secondary (MEDIUM confidence)
- [How Change Orders Work in Construction | Procore](https://www.procore.com/library/how-construction-change-orders-work)
- [Construction Change Orders Best Practices | Fieldwire](https://www.fieldwire.com/blog/fieldwire-for-construction-change-order-management/)
- [Approval Workflow Design Patterns | Cflow](https://www.cflowapps.com/approval-workflow-design-patterns/)
- [Approval Process Guide 2026 | Kissflow](https://kissflow.com/workflow/approval-process/)
- [Document Versioning Pattern | MongoDB Blog](https://www.mongodb.com/company/blog/building-with-patterns-the-document-versioning-pattern)
- [Azure Cosmos DB Document Versioning Pattern | Microsoft Learn](https://learn.microsoft.com/en-us/samples/azure-samples/cosmos-db-design-patterns/document-versioning/)
- [Tutorial: Waterfall Chart in Recharts | Medium](https://medium.com/2359media/tutorial-how-to-create-a-waterfall-chart-in-recharts-15a0e980d4b)
- [recharts-waterfall GitHub Repository](https://github.com/celiaongsl/recharts-waterfall)
- [@react-pdf/renderer Table Implementation Guide | JavaScript in Plain English](https://javascript.plainenglish.io/implementing-a-table-with-react-pdf-a-comprehensive-guide-95dc988faf31)

### Tertiary (LOW confidence)
- WebSearch results for approval escalation implementation (general workflow patterns, not construction-specific)
- WebSearch results for waterfall chart alternatives (CanvasJS, Syncfusion - not using these libraries)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase with proven implementations
- Architecture: HIGH - Patterns directly extracted from existing migrations and components
- Pitfalls: MEDIUM - Based on general construction software patterns and database design principles, not KEWA-specific incidents
- Waterfall chart: MEDIUM - Implementation pattern verified but no native Recharts component (requires data transformation)
- Approval workflow: HIGH - Matches existing purchase order and knowledge base workflow patterns
- Document versioning: HIGH - Temporal table pattern proven in knowledge base (migration 048)

**Research date:** 2026-01-28
**Valid until:** 30 days (stable domain, established patterns in construction software)
