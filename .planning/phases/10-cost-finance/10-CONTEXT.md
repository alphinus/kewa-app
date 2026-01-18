# Phase 10: Cost & Finance - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Vollständige Kostenübersicht für Renovationen: Offerten → Rechnungen → Zahlungen. Includes contractor-submitted invoices, manual expenses, aggregation views by project, and accounting export. Mietzins tracking and investment overview are included per RENT requirements.

</domain>

<decisions>
## Implementation Decisions

### Offer → Invoice Workflow
- Contractor submits their own invoice (PDF upload) — not auto-generated from offer
- Single approval step (Admin or Manager approves, then ready for payment)
- "Mark as Paid" button with today's date — simple, no bank sync
- Offer amount and Invoice amount shown side-by-side (simple comparison, no highlighted variance)

### Cost Aggregation Views
- Primary view: By Project — see all costs for one renovation at a glance
- Breakdown by work order (each contractor's work order as line item)
- Each work order shows: Offer amount, Invoice amount side-by-side
- No separate category breakdown (labor, materials) — work orders are the unit

### Manual Expenses
- Can link to Project OR directly to Unit (for non-project costs)
- Receipt upload required for each expense
- All internal roles can create expenses (Admin, Manager, Accounting)

### Accounting Export
- Excel-friendly CSV with Swiss formatting (CHF, dates as DD.MM.YYYY)
- Configurable export: user selects invoices, expenses, date range
- On-demand button plus monthly reminder/summary
- VAT breakdown (Netto, MwSt, Brutto) included if available on invoice

### Claude's Discretion
- Partial payments: decide based on complexity/benefit tradeoff
- Room-level cost aggregation: decide based on data model complexity
- Expense categories: propose based on typical renovation needs

</decisions>

<specifics>
## Specific Ideas

- Keep it simple: one approval step, one payment per invoice (unless partial payments add clear value)
- Excel is the target — not a specific accounting system
- Swiss conventions: CHF currency, 7.7% MwSt, DD.MM.YYYY dates

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-cost-finance*
*Context gathered: 2026-01-18*
