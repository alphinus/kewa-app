# Phase 10: Cost & Finance - Research

**Researched:** 2026-01-18
**Domain:** Invoice Workflow, Cost Aggregation, Accounting Export, Rent/Investment Tracking
**Confidence:** HIGH (verified with existing database schema, established patterns, and project context)

## Summary

Phase 10 implements the complete cost management workflow for KEWA renovations. The foundation is already comprehensive: the database has full schemas for offers, invoices, expenses, payments, and cost aggregation views. The existing infrastructure covers approximately 80% of the data model requirements. The remaining work focuses on building the UI/API layer to expose these capabilities.

The workflow follows a practical Swiss renovation business pattern: contractors submit their own invoices (not auto-generated from offers), a single approval step makes invoices ready for payment, and "Mark as Paid" records the payment date. Cost aggregation is work-order-centric - each contractor's work order becomes a line item showing offer vs invoice amounts side by side.

**Primary recommendation:** Build UI components that leverage existing database views (`project_costs`, `unit_costs`, `partner_costs`) and existing entities. Focus implementation on: (1) Invoice submission and approval workflow UI, (2) Manual expense entry with receipt upload, (3) Cost aggregation views with filtering, (4) CSV export for Swiss accounting, and (5) Unit investment dashboard showing rent vs renovation costs.

## Existing Infrastructure Analysis

### Database Schema (HIGH Confidence - Verified from migrations)

The Phase 7 foundation created comprehensive cost entities:

| Entity | Migration | Key Features | Status |
|--------|-----------|--------------|--------|
| Offers | `017_offer.sql` | Status workflow, VAT calc, line items, document path | COMPLETE |
| Invoices | `018_invoice.sql` | Status workflow, variance tracking, payment tracking, document required | COMPLETE |
| Expenses | `019_expense.sql` | Categories, receipt upload, entity linking validation | COMPLETE |
| Payments | `020_payment.sql` | Method enum, auto-update invoice status | COMPLETE |
| Cost Views | `021_cost_views.sql` | Project, unit, partner, trade, monthly aggregations | COMPLETE |

### Existing Triggers and Automation

| Trigger | Table | Purpose | Status |
|---------|-------|---------|--------|
| `calculate_offer_totals` | offers | Auto-calc tax_amount and total_amount | COMPLETE |
| `calculate_invoice_totals` | invoices | Auto-calc totals, outstanding, variance | COMPLETE |
| `validate_expense_relationship` | expenses | Require at least one entity link | COMPLETE |
| `update_invoice_paid_amount` | payments | Update invoice.amount_paid and status | COMPLETE |

### TypeScript Types (HIGH Confidence - Verified from types)

Full TypeScript types exist in `src/types/database.ts`:
- `Offer`, `Invoice`, `Expense`, `Payment` interfaces
- `OfferLineItem`, `InvoiceLineItem` for line items
- `CreateOfferInput`, `CreateInvoiceInput`, `CreateExpenseInput`, `CreatePaymentInput`
- `ProjectCosts`, `UnitCosts`, `PartnerCosts`, `TradeCosts`, `MonthlyCosts` view types

### What Needs Implementation

| Feature | Gap | Priority |
|---------|-----|----------|
| Invoice submission UI | No UI for contractors to link invoice to work order | HIGH |
| Invoice approval workflow | No UI for KEWA to approve/dispute invoices | HIGH |
| Payment recording | No "Mark as Paid" button/modal | HIGH |
| Expense entry form | No UI for manual expense creation | HIGH |
| Project cost dashboard | No UI consuming `project_costs` view | HIGH |
| Unit investment view | No UI for `unit_costs` view with rent comparison | MEDIUM |
| CSV export | No export API endpoint | MEDIUM |
| Receipt upload | Expense receipt_storage_path unused | MEDIUM |

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Supabase | - | Database, storage, real-time | INSTALLED |
| Next.js | 16 | API routes, server components | INSTALLED |
| React | 19 | UI components | INSTALLED |
| Tailwind CSS | 4 | Styling | INSTALLED |
| date-fns | 4.x | Date formatting (Swiss locale) | INSTALLED |

### Supporting (May Need)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Papa Parse | 5.x | CSV generation | Accounting export (COST-06) |
| recharts | 2.x | Charts for cost visualization | Dashboard charts (optional) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Papa Parse | Native CSV string building | Papa Parse handles edge cases (commas, quotes) |
| Server-side CSV | Client-side CSV | Server ensures consistent formatting |
| Database views | Application-level aggregation | Views are faster, pre-calculated |

**Installation (if needed):**
```bash
npm install papaparse
npm install -D @types/papaparse
```

## Workflow Design

### Invoice Workflow (COST-01)

Based on context decisions: "Contractor submits their own invoice (PDF upload) - not auto-generated from offer"

**Workflow States:**
```
received -> under_review -> approved -> paid
                        \-> disputed -> under_review
```

**Implementation Pattern:**

```typescript
// Invoice submission flow (contractor via portal)
// 1. Contractor uploads PDF
// 2. Creates invoice record linked to work_order
// 3. Status = 'received'

// KEWA approval flow
// 1. KEWA reviews invoice vs offer (side-by-side view)
// 2. KEWA clicks "Approve" or "Dispute"
// 3. If approved: status = 'approved', approved_at = now, approved_by = user
// 4. If disputed: status = 'disputed', dispute notes captured

// Payment flow
// 1. KEWA clicks "Mark as Paid"
// 2. Creates Payment record with today's date
// 3. payment_method = 'bank_transfer' (default)
// 4. Trigger auto-updates invoice status to 'paid'
```

### Cost Aggregation (COST-03)

Context decision: "Primary view: By Project - see all costs for one renovation at a glance"

**Existing View: `project_costs`**
```sql
-- Already provides:
-- project_id, project_name, unit_id, estimated_cost
-- total_accepted_offers, total_invoiced, total_paid, total_outstanding
-- total_expenses, total_cost, variance_from_budget
```

**UI Pattern:**
```typescript
// Project cost dashboard
interface ProjectCostView {
  project: RenovationProject;
  workOrders: Array<{
    workOrder: WorkOrder;
    offer?: Offer;          // From accepted offer
    invoice?: Invoice;      // Linked invoice
    variance: number;       // invoice - offer
  }>;
  expenses: Expense[];
  totals: ProjectCosts;
}
```

### Variance Display (COST-04)

Context decision: "Offer amount and Invoice amount shown side-by-side (simple comparison, no highlighted variance)"

**UI Pattern:**
```typescript
// Work order cost row
<tr>
  <td>{workOrder.title}</td>
  <td>{formatCHF(offer?.total_amount ?? 0)}</td>
  <td>{formatCHF(invoice?.total_amount ?? 0)}</td>
</tr>

// No color coding for variance - side-by-side is sufficient
```

### Manual Expenses (COST-02)

Context decisions:
- "Can link to Project OR directly to Unit (for non-project costs)"
- "Receipt upload required for each expense"
- "All internal roles can create expenses (Admin, Manager, Accounting)"

**Existing Expense Categories:**
```typescript
type ExpenseCategory =
  | 'material'
  | 'labor'
  | 'equipment_rental'
  | 'travel'
  | 'permits'
  | 'disposal'
  | 'utilities'
  | 'other';

type ExpensePaymentMethod =
  | 'cash'
  | 'petty_cash'
  | 'company_card'
  | 'personal_reimbursement';
```

**Additional Categories (Claude's Discretion):**
Based on typical Swiss renovation needs, the existing categories are comprehensive. Adding:
- `subcontractor` - For pass-through payments to unlisted partners
- `inspection` - Building inspection fees (Bauabnahme)

However, the existing `other` category handles edge cases. No schema change needed.

### Accounting Export (COST-06)

Context decisions:
- "Excel-friendly CSV with Swiss formatting (CHF, dates as DD.MM.YYYY)"
- "Configurable export: user selects invoices, expenses, date range"
- "VAT breakdown (Netto, MwSt, Brutto) included if available"

**CSV Structure:**
```csv
Datum,Typ,Belegnummer,Partner,Projekt,Netto,MwSt,Brutto,Status,Bezahlt
18.01.2026,Rechnung,INV-2026-001,Sanitaer AG,Bad Renovation,1000.00,77.00,1077.00,bezahlt,15.01.2026
18.01.2026,Ausgabe,EXP-2026-042,,Bad Renovation,50.00,,50.00,erfasst,
```

**Swiss Conventions:**
- Currency: CHF (no symbol in data, stated in header)
- Dates: DD.MM.YYYY
- Decimal: comma as decimal separator for Swiss compatibility
- VAT: 7.7% standard rate
- Encoding: UTF-8 with BOM for Excel

### Rent and Investment (RENT-01, RENT-02, RENT-03)

Context: Units already have `rent_amount` field (migration 009_unit_room.sql).

**Existing View: `unit_costs`**
```sql
-- Already provides:
-- unit_id, unit_name, rent_amount
-- total_project_costs, direct_expenses, total_investment
-- years_to_recover (investment / annual_rent)
```

**UI Pattern:**
```typescript
// Unit investment card
<Card>
  <CardHeader>
    <CardTitle>{unit.name}</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-4">
      <Stat label="Mietzins/Monat" value={formatCHF(rent_amount)} />
      <Stat label="Renovationskosten" value={formatCHF(total_investment)} />
      <Stat label="Amortisation" value={`${years_to_recover?.toFixed(1) ?? '-'} Jahre`} />
    </div>
  </CardContent>
</Card>
```

## Architecture Patterns

### API Route Structure

```
src/app/api/
  invoices/
    route.ts              # GET (list), POST (create)
    [id]/
      route.ts            # GET, PATCH (update status), DELETE
      approve/
        route.ts          # POST - approve invoice
      dispute/
        route.ts          # POST - dispute invoice
  expenses/
    route.ts              # GET, POST
    [id]/
      route.ts            # GET, PATCH, DELETE
  payments/
    route.ts              # GET, POST
    [id]/
      route.ts            # GET, DELETE
  costs/
    project/
      [id]/
        route.ts          # GET project costs aggregation
    unit/
      [id]/
        route.ts          # GET unit costs/investment
    export/
      route.ts            # POST - generate CSV export
```

### UI Component Structure

```
src/components/costs/
  InvoiceList.tsx           # List of invoices with filters
  InvoiceDetail.tsx         # Invoice detail view with approval
  InvoiceApprovalModal.tsx  # Approve/dispute modal
  ExpenseForm.tsx           # Create/edit expense
  ExpenseList.tsx           # List of expenses
  PaymentModal.tsx          # Mark as paid modal
  ProjectCostDashboard.tsx  # Project cost aggregation view
  UnitInvestmentCard.tsx    # Unit rent vs cost view
  CostExportModal.tsx       # Configure and download CSV
  VarianceRow.tsx           # Offer vs invoice display
```

### Page Structure

```
src/app/dashboard/
  kosten/                   # Cost management section
    page.tsx                # Cost overview dashboard
    projekte/
      [id]/
        page.tsx            # Project cost detail
    rechnungen/
      page.tsx              # Invoice list
      [id]/
        page.tsx            # Invoice detail
    ausgaben/
      page.tsx              # Expense list
      neu/
        page.tsx            # Create expense
    export/
      page.tsx              # Export configuration
  wohnungen/
    [id]/
      investition/
        page.tsx            # Unit investment view
```

## Implementation Patterns

### Invoice Approval Flow

```typescript
// src/app/api/invoices/[id]/approve/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session || !['kewa', 'admin', 'manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Update invoice status
  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: session.userId
    })
    .eq('id', id)
    .eq('status', 'under_review') // Only approve from under_review
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }

  // Audit log
  await createAuditLog({
    table_name: 'invoices',
    record_id: id,
    action: 'update',
    user_id: session.userId,
    new_values: { status: 'approved' }
  });

  return NextResponse.json({ invoice: data });
}
```

### Payment Creation (Mark as Paid)

```typescript
// src/app/api/payments/route.ts
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !['kewa', 'admin', 'accounting'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    invoice_id,
    amount,
    payment_method = 'bank_transfer',
    payment_date = new Date().toISOString().split('T')[0],
    notes
  } = body;

  const supabase = await createClient();

  // Verify invoice exists and is approved
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total_amount, amount_outstanding, status')
    .eq('id', invoice_id)
    .single();

  if (!invoice || invoice.status !== 'approved') {
    return NextResponse.json({ error: 'Invoice not approved' }, { status: 400 });
  }

  // Create payment (trigger handles invoice update)
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      invoice_id,
      amount: amount ?? invoice.amount_outstanding,
      payment_method,
      payment_date,
      status: 'completed',
      notes,
      created_by: session.userId
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }

  return NextResponse.json({ payment }, { status: 201 });
}
```

### CSV Export

```typescript
// src/app/api/costs/export/route.ts
import Papa from 'papaparse';

interface ExportRequest {
  type: 'invoices' | 'expenses' | 'all';
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !['kewa', 'admin', 'accounting'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: ExportRequest = await request.json();
  const supabase = await createClient();

  const rows: ExportRow[] = [];

  // Fetch invoices
  if (body.type === 'invoices' || body.type === 'all') {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        partner:partners(company_name),
        project:renovation_projects(name)
      `);

    if (body.projectId) {
      query = query.eq('renovation_project_id', body.projectId);
    }
    if (body.dateFrom) {
      query = query.gte('invoice_date', body.dateFrom);
    }
    if (body.dateTo) {
      query = query.lte('invoice_date', body.dateTo);
    }

    const { data: invoices } = await query;

    invoices?.forEach(inv => {
      rows.push({
        Datum: formatSwissDate(inv.invoice_date),
        Typ: 'Rechnung',
        Belegnummer: inv.invoice_number,
        Partner: inv.partner?.company_name ?? '',
        Projekt: inv.project?.name ?? '',
        Netto: formatSwissNumber(inv.amount),
        MwSt: formatSwissNumber(inv.tax_amount),
        Brutto: formatSwissNumber(inv.total_amount),
        Status: translateStatus(inv.status),
        Bezahlt: inv.paid_at ? formatSwissDate(inv.paid_at) : ''
      });
    });
  }

  // Fetch expenses
  if (body.type === 'expenses' || body.type === 'all') {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        project:renovation_projects(name)
      `);

    if (body.projectId) {
      query = query.eq('renovation_project_id', body.projectId);
    }
    if (body.dateFrom) {
      query = query.gte('paid_at', body.dateFrom);
    }
    if (body.dateTo) {
      query = query.lte('paid_at', body.dateTo);
    }

    const { data: expenses } = await query;

    expenses?.forEach(exp => {
      rows.push({
        Datum: formatSwissDate(exp.paid_at),
        Typ: 'Ausgabe',
        Belegnummer: exp.receipt_number ?? '',
        Partner: exp.vendor_name ?? '',
        Projekt: exp.project?.name ?? '',
        Netto: formatSwissNumber(exp.amount),
        MwSt: '',
        Brutto: formatSwissNumber(exp.amount),
        Status: 'erfasst',
        Bezahlt: formatSwissDate(exp.paid_at)
      });
    });
  }

  // Sort by date descending
  rows.sort((a, b) => {
    const dateA = parseSwissDate(a.Datum);
    const dateB = parseSwissDate(b.Datum);
    return dateB.getTime() - dateA.getTime();
  });

  // Generate CSV with Swiss formatting
  const csv = Papa.unparse(rows, {
    delimiter: ';', // Swiss/German Excel default
    quotes: true,
    header: true
  });

  // Add UTF-8 BOM for Excel
  const csvWithBom = '\ufeff' + csv;

  return new NextResponse(csvWithBom, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kosten-export-${formatSwissDate(new Date())}.csv"`
    }
  });
}

// Swiss formatting helpers
function formatSwissDate(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

function formatSwissNumber(num: number | null): string {
  if (num === null || num === undefined) return '';
  return num.toFixed(2).replace('.', ',');
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    received: 'erhalten',
    under_review: 'in Pruefung',
    approved: 'freigegeben',
    disputed: 'beanstandet',
    partially_paid: 'teilweise bezahlt',
    paid: 'bezahlt',
    cancelled: 'storniert'
  };
  return map[status] ?? status;
}
```

### Expense Form with Receipt Upload

```typescript
// src/components/costs/ExpenseForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const EXPENSE_CATEGORIES = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Arbeit' },
  { value: 'equipment_rental', label: 'Geraetemiete' },
  { value: 'travel', label: 'Reise/Spesen' },
  { value: 'permits', label: 'Bewilligungen' },
  { value: 'disposal', label: 'Entsorgung' },
  { value: 'utilities', label: 'Nebenkosten' },
  { value: 'other', label: 'Sonstiges' },
] as const;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Bargeld' },
  { value: 'petty_cash', label: 'Handkasse' },
  { value: 'company_card', label: 'Firmenkarte' },
  { value: 'personal_reimbursement', label: 'Privatauslagen' },
] as const;

interface ExpenseFormProps {
  projectId?: string;
  unitId?: string;
  onSuccess?: () => void;
}

export function ExpenseForm({ projectId, unitId, onSuccess }: ExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Upload receipt first if provided
    let receiptPath: string | null = null;
    if (receiptFile) {
      const uploadData = new FormData();
      uploadData.append('file', receiptFile);
      uploadData.append('context', 'expense_receipt');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData
      });

      if (uploadRes.ok) {
        const { path } = await uploadRes.json();
        receiptPath = path;
      }
    }

    // Create expense
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        renovation_project_id: projectId || formData.get('project_id') || null,
        unit_id: unitId || formData.get('unit_id') || null,
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount') as string),
        payment_method: formData.get('payment_method'),
        vendor_name: formData.get('vendor_name'),
        receipt_storage_path: receiptPath,
        receipt_number: formData.get('receipt_number'),
        notes: formData.get('notes')
      })
    });

    setLoading(false);

    if (res.ok) {
      onSuccess?.();
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium">Bezeichnung *</label>
        <input
          name="title"
          required
          className="mt-1 block w-full rounded border px-3 py-2"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium">Betrag (CHF) *</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          className="mt-1 block w-full rounded border px-3 py-2"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium">Kategorie *</label>
        <select
          name="category"
          required
          className="mt-1 block w-full rounded border px-3 py-2"
        >
          {EXPENSE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium">Zahlungsart *</label>
        <select
          name="payment_method"
          required
          className="mt-1 block w-full rounded border px-3 py-2"
        >
          {PAYMENT_METHODS.map(pm => (
            <option key={pm.value} value={pm.value}>{pm.label}</option>
          ))}
        </select>
      </div>

      {/* Vendor */}
      <div>
        <label className="block text-sm font-medium">Lieferant/Haendler</label>
        <input
          name="vendor_name"
          className="mt-1 block w-full rounded border px-3 py-2"
        />
      </div>

      {/* Receipt Upload */}
      <div>
        <label className="block text-sm font-medium">Beleg *</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          required
          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Foto oder PDF des Belegs (erforderlich)
        </p>
      </div>

      {/* Receipt Number */}
      <div>
        <label className="block text-sm font-medium">Belegnummer</label>
        <input
          name="receipt_number"
          className="mt-1 block w-full rounded border px-3 py-2"
          placeholder="Optional"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium">Notizen</label>
        <textarea
          name="notes"
          rows={2}
          className="mt-1 block w-full rounded border px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !receiptFile}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Speichern...' : 'Ausgabe erfassen'}
      </button>
    </form>
  );
}
```

## Claude's Discretion Decisions

### Partial Payments

**Decision:** Do not implement partial payments.

**Rationale:**
1. Context says "one payment per invoice (unless partial payments add clear value)"
2. Database already supports partial payments via amount_paid tracking
3. UI complexity outweighs benefit for typical renovation invoices
4. If needed later, schema already supports it

**Implementation:** "Mark as Paid" always records full outstanding amount as single payment.

### Room-Level Cost Aggregation

**Decision:** Do not implement room-level aggregation.

**Rationale:**
1. Context says "work orders are the unit" for cost breakdown
2. Work orders can link to rooms but aggregation happens at project level
3. Existing `project_costs` view is sufficient
4. Room-level would require joining through work_orders->room_id

**Implementation:** Project view shows work orders as line items. Each work order shows its room in description.

### Expense Categories

**Decision:** Use existing categories without modification.

**Rationale:**
1. Current 8 categories cover typical renovation expenses
2. `other` category handles edge cases
3. Adding more categories increases complexity without clear benefit
4. Trade categories exist separately on expenses for reporting

**Existing categories are sufficient:**
- material, labor, equipment_rental, travel, permits, disposal, utilities, other

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation | Manual string concatenation | Papa Parse | Handles escaping, quotes, delimiters |
| Tax calculation | Application-level math | Database triggers | Already implemented, atomic |
| Payment status sync | Manual invoice updates | `update_invoice_paid_amount` trigger | Already implemented, reliable |
| Cost aggregation | JOIN queries per request | `project_costs`, `unit_costs` views | Pre-computed, performant |
| Swiss number formatting | Custom regex | `toFixed().replace('.',',')` | Simple, consistent |

**Key insight:** The database layer is comprehensive. Build thin UI/API on top, don't duplicate logic.

## Common Pitfalls

### Pitfall 1: Duplicate Invoice Handling

**What goes wrong:** Same invoice PDF uploaded twice creates duplicate records
**Why it happens:** No deduplication on invoice_number + partner
**How to avoid:** Add unique constraint or UI check for existing invoice numbers
**Warning signs:** Same amount billed twice for same work order

**Recommendation:** Check for existing invoice with same number from same partner before insert.

### Pitfall 2: Orphan Payments

**What goes wrong:** Payment created but invoice status not updated
**Why it happens:** Trigger fails silently, transaction not atomic
**How to avoid:** Rely on database trigger (already implemented), verify after insert
**Warning signs:** invoice.amount_paid doesn't match sum of payments

### Pitfall 3: Currency Confusion

**What goes wrong:** Mix of CHF values and display formatting
**Why it happens:** Storing formatted strings instead of numbers
**How to avoid:** Store DECIMAL in DB, format only for display
**Warning signs:** Sorting by amount doesn't work correctly

### Pitfall 4: Date Timezone Issues

**What goes wrong:** Invoice date shows wrong day
**Why it happens:** UTC vs local timezone conversion
**How to avoid:** Use DATE type (no timezone) for invoice_date, payment_date
**Warning signs:** Invoice date "18.01.2026" shows as "17.01.2026"

**Existing schema uses DATE correctly for invoice_date, payment_date.**

### Pitfall 5: VAT Rate Assumptions

**What goes wrong:** 7.7% VAT applied when invoice has different rate
**Why it happens:** Hardcoding VAT rate instead of using invoice.tax_rate
**How to avoid:** Always read tax_rate from invoice, display in export
**Warning signs:** VAT amounts don't match invoice PDFs

## Code Examples

### Project Cost Dashboard Component

```typescript
// src/components/costs/ProjectCostDashboard.tsx
import { createClient } from '@/lib/supabase/server';
import { formatCHF } from '@/lib/utils';

interface Props {
  projectId: string;
}

export async function ProjectCostDashboard({ projectId }: Props) {
  const supabase = await createClient();

  // Fetch project with costs
  const { data: project } = await supabase
    .from('renovation_projects')
    .select(`
      id, name, estimated_cost,
      work_orders (
        id, title, estimated_cost, proposed_cost, final_cost, status,
        room:rooms(name),
        offers!offers_work_order_id_fkey (
          id, status, total_amount
        ),
        invoices!invoices_work_order_id_fkey (
          id, invoice_number, total_amount, status, paid_at
        )
      ),
      expenses!expenses_renovation_project_id_fkey (
        id, title, amount, category, paid_at
      )
    `)
    .eq('id', projectId)
    .single();

  if (!project) return null;

  // Calculate totals
  const acceptedOffers = project.work_orders
    ?.flatMap(wo => wo.offers?.filter(o => o.status === 'accepted') ?? []);
  const totalOffered = acceptedOffers?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;

  const invoices = project.work_orders?.flatMap(wo => wo.invoices ?? []);
  const totalInvoiced = invoices?.reduce((sum, i) => sum + (i.total_amount ?? 0), 0) ?? 0;
  const totalPaid = invoices
    ?.filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total_amount ?? 0), 0) ?? 0;

  const totalExpenses = project.expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Budget" value={formatCHF(project.estimated_cost)} />
        <SummaryCard label="Offerten" value={formatCHF(totalOffered)} />
        <SummaryCard label="Rechnungen" value={formatCHF(totalInvoiced)} />
        <SummaryCard label="Bezahlt" value={formatCHF(totalPaid)} />
      </div>

      {/* Work Orders with Costs */}
      <section>
        <h3 className="font-semibold mb-3">Arbeitsauftraege</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Auftrag</th>
              <th className="text-right py-2">Offerte</th>
              <th className="text-right py-2">Rechnung</th>
              <th className="text-right py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {project.work_orders?.map(wo => {
              const offer = wo.offers?.find(o => o.status === 'accepted');
              const invoice = wo.invoices?.[0];
              return (
                <tr key={wo.id} className="border-b">
                  <td className="py-2">
                    {wo.title}
                    {wo.room && <span className="text-gray-500 text-xs ml-2">({wo.room.name})</span>}
                  </td>
                  <td className="text-right">{formatCHF(offer?.total_amount)}</td>
                  <td className="text-right">{formatCHF(invoice?.total_amount)}</td>
                  <td className="text-right">{invoice?.status ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-2">Total</td>
              <td className="text-right">{formatCHF(totalOffered)}</td>
              <td className="text-right">{formatCHF(totalInvoiced)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Expenses */}
      {project.expenses && project.expenses.length > 0 && (
        <section>
          <h3 className="font-semibold mb-3">Ausgaben</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Bezeichnung</th>
                <th className="text-left py-2">Kategorie</th>
                <th className="text-right py-2">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {project.expenses.map(exp => (
                <tr key={exp.id} className="border-b">
                  <td className="py-2">{exp.title}</td>
                  <td>{exp.category}</td>
                  <td className="text-right">{formatCHF(exp.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2" colSpan={2}>Total Ausgaben</td>
                <td className="text-right">{formatCHF(totalExpenses)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
```

### Unit Investment View

```typescript
// src/components/costs/UnitInvestmentCard.tsx
import { createClient } from '@/lib/supabase/server';
import { formatCHF } from '@/lib/utils';

interface Props {
  unitId: string;
}

export async function UnitInvestmentCard({ unitId }: Props) {
  const supabase = await createClient();

  // Use existing view
  const { data } = await supabase
    .from('unit_costs')
    .select('*')
    .eq('unit_id', unitId)
    .single();

  if (!data) return null;

  const annualRent = (data.rent_amount ?? 0) * 12;
  const paybackYears = data.years_to_recover;

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">{data.unit_name} - Investment</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-500">Monatliche Miete</div>
          <div className="text-2xl font-semibold">{formatCHF(data.rent_amount)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Jaehrliche Miete</div>
          <div className="text-2xl font-semibold">{formatCHF(annualRent)}</div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="text-sm text-gray-500 mb-2">Renovationskosten</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Projekte</span>
            <span>{formatCHF(data.total_project_costs)}</span>
          </div>
          <div className="flex justify-between">
            <span>Direkte Ausgaben</span>
            <span>{formatCHF(data.direct_expenses)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total Investment</span>
            <span>{formatCHF(data.total_investment)}</span>
          </div>
        </div>
      </div>

      {paybackYears !== null && annualRent > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-500">Amortisation</div>
          <div className="text-xl font-semibold">
            {paybackYears.toFixed(1)} Jahre
          </div>
          <div className="text-xs text-gray-400">
            bei gleichbleibender Miete
          </div>
        </div>
      )}
    </div>
  );
}
```

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PDF invoice scanning | Digital invoice submission | Ongoing | Direct data entry |
| Manual spreadsheet tracking | Database aggregation views | Project baseline | Automatic calculations |
| Email invoice exchange | Portal file upload | Phase 9 | Structured attachment |
| Accountant exports quarterly | On-demand CSV export | This phase | Real-time data access |

**Current patterns:**
- Database triggers for calculations (not application code)
- Views for aggregations (not computed on request)
- Swiss formatting applied at presentation layer only
- Storage-backed documents with signed URLs

**Deprecated/outdated:**
- Storing formatted currency strings in DB
- Application-level payment status sync
- Manual variance calculation

## Open Questions

### 1. Invoice Dispute Resolution

**What we know:** Status can go to 'disputed', then back to 'under_review'
**What's unclear:** What happens to disputed invoices? Edit? Replace? Archive?
**Recommendation:** Allow status change back to under_review with notes. Original PDF stays, can upload revised invoice.

### 2. Bulk Export Selection

**What we know:** User selects invoices, expenses, date range
**What's unclear:** Checkbox selection for individual items or filter-based?
**Recommendation:** Filter-based for MVP (date range + status + project). Individual selection can be added later.

### 3. Rent Updates Over Time

**What we know:** Unit has rent_amount field
**What's unclear:** Is this current rent or should we track rent history?
**Recommendation:** Single current value for MVP. Rent history is separate feature (lease management).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/017-021_*.sql`
- Existing types: `src/types/database.ts`
- Phase 10 context: `10-CONTEXT.md` with implementation decisions

### Secondary (MEDIUM confidence)
- Papa Parse documentation: https://www.papaparse.com/docs
- Supabase Views: https://supabase.com/docs/guides/database/views

### Tertiary (LOW confidence)
- Swiss accounting conventions (general knowledge)

## Metadata

**Confidence breakdown:**
- Database schema: HIGH - verified from migrations
- Existing triggers: HIGH - verified from migrations
- TypeScript types: HIGH - verified from source
- UI patterns: MEDIUM - based on existing patterns, not tested
- CSV export: MEDIUM - pattern clear, formatting needs validation
- Investment calculations: HIGH - existing view implements

**Research date:** 2026-01-18
**Valid until:** 2026-02-17 (30 days - stable technologies)

---

## Implementation Priority

Based on research, recommended implementation order:

1. **Invoice approval workflow** (HIGH priority)
   - API routes for approve/dispute
   - Invoice list with status filters
   - Invoice detail view with approval buttons
   - Required for COST-01 workflow

2. **Payment recording** (HIGH priority)
   - Mark as Paid modal
   - Payment API route
   - Leverages existing trigger
   - Required for COST-01 completion

3. **Project cost dashboard** (HIGH priority)
   - Uses existing project_costs view
   - Shows work orders with offer/invoice side-by-side
   - Required for COST-03, COST-04

4. **Manual expense entry** (HIGH priority)
   - Expense form with receipt upload
   - Expense list with filters
   - Required for COST-02

5. **CSV export** (MEDIUM priority)
   - Export API with Papa Parse
   - Export modal for configuration
   - Required for COST-06

6. **Unit investment view** (MEDIUM priority)
   - Uses existing unit_costs view
   - Shows rent vs renovation cost
   - Required for RENT-02, RENT-03

7. **Rent entry** (MEDIUM priority)
   - Field already exists on units
   - Add edit capability to unit detail
   - Required for RENT-01

8. **Invoice document viewer** (LOW priority)
   - View uploaded invoice PDFs
   - Required for COST-05 (attachment viewing)
