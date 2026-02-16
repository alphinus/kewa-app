# Phase 19: Supplier Core - Research

**Researched:** 2026-01-25
**Domain:** Supplier management / Purchase order workflow / Delivery tracking
**Confidence:** HIGH

## Summary

Phase 19 implements supplier management with purchase orders and delivery tracking. The research confirms this is a straightforward extension of existing patterns in the codebase:

1. **Supplier Entity**: Already exists as `Partner` with `partner_type = 'supplier'`. The Partner table, API, and UI components already support suppliers. No new entity needed - just extend UI to surface supplier-specific features.

2. **Purchase Orders**: New `purchase_orders` table following the established status workflow pattern (similar to `work_orders`, `offers`, `invoices`). Status enum: `ordered -> confirmed -> delivered -> invoiced`. Line items stored as JSONB (same pattern as offers/invoices).

3. **Deliveries**: New `deliveries` table to record actual delivery details. Links to purchase_orders, properties/buildings, and optionally to invoices for payment tracking. This is the key new entity that doesn't have a direct analog in the existing codebase.

4. **Invoice Integration**: Deliveries can be linked to existing `invoices` table via foreign key. No changes to invoice system needed - just add the linking capability.

5. **History Views**: Simple queries filtering by `partner_id` (for supplier history) or `property_id` (for property history). No new views needed - standard list filtering.

**Primary recommendation:** Extend Partner entity (already supports `type='supplier'`), add `purchase_orders` table with status workflow and line items, add `deliveries` table with property association. Reuse existing Partner CRUD UI, Invoice linking patterns, and status workflow patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | existing | API routes + Server Components | Already in stack |
| Supabase | existing | Database + Storage | Already in stack |
| PostgreSQL | existing | Database with enums, triggers | Already in stack |
| @react-pdf/renderer | existing | PDF generation (for PO documents if needed) | Already in stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | existing | Date formatting for delivery dates | Already in stack |
| zod | existing | API input validation | Already in stack |
| react-hook-form | existing | Form handling | Already in stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB line items | Separate table | JSONB simpler, consistent with offers/invoices |
| Soft-delete | Hard delete | Soft-delete adds complexity; invoices provide audit trail |
| Separate supplier table | Extended partners | Partners table already has type='supplier' enum |

**Installation:**
```bash
# No new packages needed - all dependencies already in stack
# This phase uses existing patterns from cost/finance modules
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── suppliers/                    # Supplier-filtered partner API
│   │   │   └── route.ts                  # GET (list suppliers)
│   │   ├── purchase-orders/
│   │   │   ├── route.ts                  # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts              # GET, PATCH, DELETE
│   │   │       └── confirm/route.ts      # POST (status transition)
│   │   └── deliveries/
│   │       ├── route.ts                  # GET (list), POST (create)
│   │       └── [id]/
│   │           ├── route.ts              # GET, PATCH
│   │           └── link-invoice/route.ts # POST (link to invoice)
│   └── dashboard/
│       └── lieferanten/                  # German: Suppliers
│           ├── page.tsx                  # Supplier list
│           ├── [id]/page.tsx             # Supplier detail + order history
│           └── bestellungen/             # German: Orders
│               ├── page.tsx              # Purchase order list
│               ├── neu/page.tsx          # Create PO
│               └── [id]/page.tsx         # PO detail + delivery recording
├── components/
│   └── suppliers/
│       ├── SupplierList.tsx              # Filtered partner list (type=supplier)
│       ├── SupplierDetail.tsx            # Supplier info + order summary
│       ├── PurchaseOrderForm.tsx         # Create/edit PO
│       ├── PurchaseOrderList.tsx         # PO list with status filters
│       ├── PurchaseOrderDetail.tsx       # PO detail + delivery controls
│       ├── DeliveryForm.tsx              # Record delivery dialog
│       └── OrderHistoryTable.tsx         # Order history per supplier/property
├── lib/
│   └── suppliers/
│       ├── purchase-order-queries.ts     # PO query helpers
│       ├── delivery-queries.ts           # Delivery query helpers
│       └── status-utils.ts               # Status labels, colors, transitions
└── types/
    └── suppliers.ts                      # PO, Delivery types + status enums
```

### Pattern 1: Purchase Order Status Workflow
**What:** Status enum with valid transitions and timestamps
**When to use:** All purchase order status changes
**Example:**
```sql
-- Source: Existing pattern from 025_work_order_status.sql
CREATE TYPE purchase_order_status AS ENUM (
  'draft',      -- PO created but not sent to supplier
  'ordered',    -- PO sent to supplier
  'confirmed',  -- Supplier confirmed order
  'delivered',  -- Delivery recorded
  'invoiced',   -- Linked to invoice
  'cancelled'   -- Order cancelled
);

-- Status transition timestamps
ALTER TABLE purchase_orders
  ADD COLUMN ordered_at TIMESTAMPTZ,
  ADD COLUMN confirmed_at TIMESTAMPTZ,
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN invoiced_at TIMESTAMPTZ,
  ADD COLUMN cancelled_at TIMESTAMPTZ;

-- Trigger to set timestamps on status change
CREATE OR REPLACE FUNCTION purchase_order_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ordered' AND OLD.status != 'ordered' THEN
    NEW.ordered_at = NOW();
  ELSIF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = NOW();
  ELSIF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at = NOW();
  ELSIF NEW.status = 'invoiced' AND OLD.status != 'invoiced' THEN
    NEW.invoiced_at = NOW();
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Pattern 2: Line Items JSONB Structure
**What:** Consistent line item format across POs, offers, invoices
**When to use:** Any entity with itemized costs
**Example:**
```typescript
// Source: Existing pattern from src/types/database.ts
export interface PurchaseOrderLineItem {
  id: string           // UUID for client-side key
  description: string  // Item description (e.g., "Holzpellets Premium")
  quantity: number     // Amount ordered
  unit: string         // Unit of measure (e.g., "Tonnen", "Stk")
  unit_price: number   // Price per unit in CHF
  total: number        // quantity * unit_price
}

// Validate line items on insert/update
const lineItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unit_price: z.number().nonnegative(),
  total: z.number().nonnegative(),
})
```

### Pattern 3: Delivery Recording with Property Association
**What:** Link deliveries to properties/buildings for tracking
**When to use:** Recording actual deliveries against purchase orders
**Example:**
```sql
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),

  -- Delivery details
  delivery_date DATE NOT NULL,
  delivery_note_number TEXT,  -- Lieferschein-Nr.

  -- Quantities
  quantity_ordered DECIMAL(12,2) NOT NULL,
  quantity_received DECIMAL(12,2) NOT NULL,
  quantity_unit TEXT NOT NULL DEFAULT 'Tonnen',

  -- Variance tracking
  has_variance BOOLEAN GENERATED ALWAYS AS (
    quantity_received != quantity_ordered
  ) STORED,
  variance_note TEXT,

  -- Property association (SUPP-05)
  property_id UUID REFERENCES properties(id),
  building_id UUID REFERENCES buildings(id),

  -- Invoice linking (SUPP-06)
  invoice_id UUID REFERENCES invoices(id),

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for history queries (SUPP-07)
CREATE INDEX deliveries_purchase_order_idx ON deliveries(purchase_order_id);
CREATE INDEX deliveries_property_idx ON deliveries(property_id);
CREATE INDEX deliveries_invoice_idx ON deliveries(invoice_id);
CREATE INDEX deliveries_date_idx ON deliveries(delivery_date DESC);
```

### Pattern 4: Supplier History Views
**What:** Aggregate order history per supplier and property
**When to use:** Supplier detail page, property supplier history
**Example:**
```sql
-- View: Orders per supplier (SUPP-07)
CREATE VIEW supplier_order_history AS
SELECT
  p.id AS supplier_id,
  p.company_name,
  po.id AS order_id,
  po.order_number,
  po.status,
  po.total_amount,
  po.expected_delivery_date,
  d.delivery_date AS actual_delivery_date,
  d.quantity_received,
  i.id AS invoice_id,
  i.invoice_number,
  i.status AS invoice_status
FROM partners p
JOIN purchase_orders po ON po.supplier_id = p.id
LEFT JOIN deliveries d ON d.purchase_order_id = po.id
LEFT JOIN invoices i ON d.invoice_id = i.id
WHERE p.partner_type = 'supplier'
ORDER BY po.created_at DESC;

-- View: Deliveries per property (SUPP-07)
CREATE VIEW property_delivery_history AS
SELECT
  prop.id AS property_id,
  prop.name AS property_name,
  b.id AS building_id,
  b.name AS building_name,
  d.delivery_date,
  d.quantity_received,
  d.quantity_unit,
  po.total_amount,
  p.company_name AS supplier_name,
  i.status AS invoice_status
FROM deliveries d
JOIN purchase_orders po ON d.purchase_order_id = po.id
JOIN partners p ON po.supplier_id = p.id
LEFT JOIN properties prop ON d.property_id = prop.id
LEFT JOIN buildings b ON d.building_id = b.id
ORDER BY d.delivery_date DESC;
```

### Anti-Patterns to Avoid
- **Separate supplier table**: Partners table already has `type='supplier'` - use it
- **Duplicating invoice fields in deliveries**: Link to invoices table, don't copy data
- **Complex status workflow**: Keep it simple - 6 states max, linear progression with cancel
- **Computed views without indexes**: Always index foreign keys for history queries
- **Hard-coding property/building in PO**: Keep flexible - delivery records the destination

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supplier CRUD | New SupplierForm component | Existing PartnerForm with `type='supplier'` | Already built and working |
| Status workflow | Custom state machine | PostgreSQL enum + trigger pattern | Proven pattern in codebase |
| Line items | Custom JSON structure | Existing OfferLineItem pattern | Consistency across cost module |
| Currency formatting | Custom formatter | Existing `formatCHF()` from invoice-queries.ts | Already handles Swiss locale |
| Date formatting | Custom formatter | Existing `formatSwissDate()` from invoice-queries.ts | DD.MM.YYYY format |
| Status labels/colors | New status utilities | Extend existing `getInvoiceStatusLabel` pattern | Consistent German labels |
| PDF generation | Custom solution | Existing @react-pdf/renderer pattern | If PO PDF needed |

**Key insight:** This phase is primarily about data modeling and UI. No new libraries, no complex algorithms. The value is in cleanly extending existing patterns to track purchase orders and deliveries.

## Common Pitfalls

### Pitfall 1: Duplicating Partner/Supplier Logic
**What goes wrong:** Creating separate supplier table or duplicate CRUD when Partners already supports it
**Why it happens:** Not checking existing Partner implementation
**How to avoid:** Partners table has `partner_type` enum with 'supplier' value. Filter existing APIs: `GET /api/partners?type=supplier`
**Warning signs:** Creating `src/components/suppliers/SupplierForm.tsx` that duplicates PartnerForm

### Pitfall 2: Invoice Linking Without Status Check
**What goes wrong:** Linking delivery to invoice that's already cancelled or in wrong status
**Why it happens:** Not validating invoice status before linking
**How to avoid:** Check invoice status in API: only allow linking to 'received', 'under_review', or 'approved' invoices
**Warning signs:** Deliveries linked to cancelled invoices, incorrect payment tracking

### Pitfall 3: Missing Variance Handling
**What goes wrong:** Delivered quantity differs from ordered, but no way to track or explain
**Why it happens:** Assuming deliveries always match orders
**How to avoid:** Include `quantity_ordered`, `quantity_received`, `has_variance` (computed), `variance_note` fields
**Warning signs:** User complaints about tracking partial deliveries or over-deliveries

### Pitfall 4: Property vs Building Confusion
**What goes wrong:** Inconsistent association - sometimes property_id, sometimes building_id
**Why it happens:** Not understanding hierarchy: Property > Building > Unit
**How to avoid:** Allow both property_id and building_id in deliveries. Property is required, building is optional (for multi-building properties)
**Warning signs:** Queries returning wrong aggregations, missing deliveries in reports

### Pitfall 5: Status Transition Without Validation
**What goes wrong:** Jumping from 'draft' to 'delivered' without going through 'ordered' and 'confirmed'
**Why it happens:** UI allows direct status selection instead of action buttons
**How to avoid:** Use action endpoints (e.g., `/api/purchase-orders/[id]/confirm`) that enforce valid transitions
**Warning signs:** Orders with 'delivered' status but no `ordered_at` timestamp

### Pitfall 6: Order Number Generation Race Condition
**What goes wrong:** Two simultaneous orders get same order number
**Why it happens:** Using SELECT MAX + 1 pattern without transaction lock
**How to avoid:** Use database sequence or generate UUID-based reference codes. Pattern: `PO-2026-00001`
**Warning signs:** Duplicate order numbers in production

### Pitfall 7: Timezone Issues with Delivery Dates
**What goes wrong:** Delivery recorded on Jan 25, shows as Jan 24 or Jan 26
**Why it happens:** Mixing DATE and TIMESTAMPTZ, not handling Swiss timezone
**How to avoid:** Use DATE type for delivery_date (no time component), TIMESTAMPTZ for created_at/updated_at
**Warning signs:** Date discrepancies between UI and reports

## Code Examples

Verified patterns from the existing codebase:

### Purchase Order API Route
```typescript
// Source: Pattern from src/app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { CreatePurchaseOrderInput } from '@/types/suppliers'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as CreatePurchaseOrderInput

    // Validate required fields
    if (!body.supplier_id) {
      return NextResponse.json(
        { error: 'supplier_id is required' },
        { status: 400 }
      )
    }

    if (!body.line_items || body.line_items.length === 0) {
      return NextResponse.json(
        { error: 'At least one line item is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify supplier exists and is type='supplier'
    const { data: supplier, error: supplierError } = await supabase
      .from('partners')
      .select('id, partner_type')
      .eq('id', body.supplier_id)
      .single()

    if (supplierError || !supplier || supplier.partner_type !== 'supplier') {
      return NextResponse.json(
        { error: 'Invalid supplier_id: must be a supplier' },
        { status: 400 }
      )
    }

    // Calculate totals from line items
    const totalAmount = body.line_items.reduce(
      (sum, item) => sum + item.total,
      0
    )

    // Generate order number
    const orderNumber = await generateOrderNumber(supabase)

    const { data: order, error } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id: body.supplier_id,
        order_number: orderNumber,
        status: body.status || 'draft',
        line_items: body.line_items,
        total_amount: totalAmount,
        currency: 'CHF',
        expected_delivery_date: body.expected_delivery_date,
        notes: body.notes,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating purchase order:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ purchase_order: order }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Generate order number: PO-YYYY-NNNNN
async function generateOrderNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear()

  const { data, error } = await supabase.rpc('generate_purchase_order_number', {
    p_year: year
  })

  if (error) throw error
  return data
}
```

### Database Function for Order Number
```sql
-- Safe order number generation with sequence
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START 1;

CREATE OR REPLACE FUNCTION generate_purchase_order_number(p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  SELECT nextval('purchase_order_seq') INTO seq_val;
  RETURN 'PO-' || p_year::TEXT || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

### Delivery Recording Form
```typescript
// Source: Pattern from src/components/costs/InvoiceForm.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PurchaseOrder, CreateDeliveryInput } from '@/types/suppliers'

interface DeliveryFormProps {
  purchaseOrder: PurchaseOrder
  onSave: (delivery: CreateDeliveryInput) => Promise<void>
  onCancel: () => void
}

export function DeliveryForm({ purchaseOrder, onSave, onCancel }: DeliveryFormProps) {
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('')
  const [quantityReceived, setQuantityReceived] = useState(
    purchaseOrder.line_items.reduce((sum, item) => sum + item.quantity, 0)
  )
  const [propertyId, setPropertyId] = useState<string>('')
  const [buildingId, setBuildingId] = useState<string | null>(null)
  const [varianceNote, setVarianceNote] = useState('')
  const [saving, setSaving] = useState(false)

  const quantityOrdered = purchaseOrder.line_items.reduce(
    (sum, item) => sum + item.quantity,
    0
  )
  const hasVariance = quantityReceived !== quantityOrdered

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)
      await onSave({
        purchase_order_id: purchaseOrder.id,
        delivery_date: deliveryDate,
        delivery_note_number: deliveryNoteNumber || null,
        quantity_ordered: quantityOrdered,
        quantity_received: quantityReceived,
        quantity_unit: purchaseOrder.line_items[0]?.unit || 'Tonnen',
        property_id: propertyId,
        building_id: buildingId,
        variance_note: hasVariance ? varianceNote : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <h2 className="text-lg font-semibold">Lieferung erfassen</h2>
          <p className="text-sm text-gray-500">
            Bestellung: {purchaseOrder.order_number}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            label="Lieferdatum *"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            required
          />

          <Input
            label="Lieferschein-Nr."
            value={deliveryNoteNumber}
            onChange={(e) => setDeliveryNoteNumber(e.target.value)}
            placeholder="z.B. LS-2026-12345"
          />

          <Input
            label="Gelieferte Menge *"
            type="number"
            step="0.01"
            value={quantityReceived}
            onChange={(e) => setQuantityReceived(parseFloat(e.target.value))}
            required
          />

          {hasVariance && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                Abweichung: {quantityReceived - quantityOrdered > 0 ? '+' : ''}
                {(quantityReceived - quantityOrdered).toFixed(2)} {purchaseOrder.line_items[0]?.unit}
              </p>
              <Input
                label="Abweichungsgrund"
                value={varianceNote}
                onChange={(e) => setVarianceNote(e.target.value)}
                placeholder="Grund für Mengenabweichung"
                className="mt-2"
              />
            </div>
          )}

          {/* Property selector would go here */}
        </CardContent>

        <CardFooter className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" loading={saving}>
            Lieferung erfassen
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
```

### Status Utilities
```typescript
// Source: Pattern from src/lib/costs/invoice-queries.ts
export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'confirmed'
  | 'delivered'
  | 'invoiced'
  | 'cancelled'

export function getPurchaseOrderStatusLabel(status: PurchaseOrderStatus): string {
  const labels: Record<PurchaseOrderStatus, string> = {
    draft: 'Entwurf',
    ordered: 'Bestellt',
    confirmed: 'Bestaetigt',
    delivered: 'Geliefert',
    invoiced: 'Verrechnet',
    cancelled: 'Storniert',
  }
  return labels[status] ?? status
}

export function getPurchaseOrderStatusColor(status: PurchaseOrderStatus): string {
  const colors: Record<PurchaseOrderStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    ordered: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    invoiced: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-800',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

// Valid status transitions
export const VALID_PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ['ordered', 'cancelled'],
  ordered: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: ['invoiced'],
  invoiced: [], // Terminal state
  cancelled: [], // Terminal state
}

export function canTransitionTo(
  currentStatus: PurchaseOrderStatus,
  targetStatus: PurchaseOrderStatus
): boolean {
  return VALID_PO_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate supplier table | Unified partners with type enum | 2020s | Simpler schema, shared contact fields |
| Manual order numbering | Database sequence | Standard | Race-condition safe |
| Free-form status strings | Enum with trigger validation | Standard | Invalid states impossible |
| Linked table for line items | JSONB column | 2018+ (PG 12) | Simpler queries, atomic updates |
| Manual timestamps | Trigger-based timestamps | Standard | Consistent, cannot be forgotten |

**Deprecated/outdated:**
- **Separate supplier entities**: Partners table with type enum is the established pattern
- **Manual invoice linking**: Foreign keys with referential integrity is standard
- **Client-side status validation only**: Database triggers prevent invalid states from any client

## Open Questions

Things that couldn't be fully resolved:

1. **Order Number Reset Frequency**
   - What we know: Pattern `PO-YYYY-NNNNN` is standard
   - What's unclear: Should sequence reset annually or continue indefinitely?
   - Recommendation: Continue indefinitely (simpler), but include year in format for readability

2. **Multi-Line Item Delivery Tracking**
   - What we know: POs can have multiple line items (e.g., different pellet grades)
   - What's unclear: Should deliveries track quantities per line item or just total?
   - Recommendation: Start with total quantity only (simpler). Add per-item tracking in Phase 20 if needed.

3. **Partial Delivery Workflow**
   - What we know: Delivered quantity may differ from ordered
   - What's unclear: Should partial delivery keep PO in 'ordered' status or mark as 'delivered'?
   - Recommendation: Mark as 'delivered' with variance tracking. Create new PO for remaining quantity if needed (manual process).

4. **Invoice Creation vs Linking**
   - What we know: SUPP-06 says "link deliveries to invoices"
   - What's unclear: Should we auto-create invoice from delivery, or only link to existing?
   - Recommendation: Link only - invoices come from supplier and are created via existing invoice flow. Delivery just references which invoice covers it.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/types/database.ts` - Partner type definitions
- Existing codebase: `src/app/api/partners/route.ts` - Partner API patterns
- Existing codebase: `src/lib/costs/invoice-queries.ts` - Status utilities, formatting
- Existing codebase: `supabase/migrations/017_offer.sql` - Status enum, line items pattern
- Existing codebase: `supabase/migrations/025_work_order_status.sql` - Status timestamp pattern

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` - Feature requirements analysis
- `.planning/REQUIREMENTS.md` - SUPP-01 through SUPP-07 specifications

### Tertiary (LOW confidence)
- None - this phase uses entirely established patterns from the existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, all existing patterns
- Architecture: HIGH - Direct extension of existing Partner + Invoice patterns
- Pitfalls: HIGH - Based on similar implementations in codebase
- Code examples: HIGH - Adapted from working code in existing modules

**Research date:** 2026-01-25
**Valid until:** 2026-03-25 (60 days - patterns are stable, no external dependencies)
