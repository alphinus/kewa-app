# Phase 21: Change Orders — Context

## Phase Goal

Users can create, approve, and track change orders with full cost impact visibility.

## Decisions

### 1. Change Order Scope & Cost Structure

**Trigger & Linking:**
- Every change order has one **primary work order** (required)
- Optionally references additional affected work orders
- Always linked — no standalone change orders without a work order

**Cost Breakdown:**
- Itemized line items using the existing offer pattern: `{description, quantity, unit_price, total}`
- Bidirectional: additions (positive) and scope reductions/credits (negative)
- Each line item implicitly positive or negative based on amount sign

**Schedule Impact:**
- Simple numeric field: days added (+) or removed (-)
- Not new dates — just delta from current schedule

**Reason Tracking:**
- Predefined reason category (dropdown): unforeseen conditions, client request, design error, regulatory requirement, etc.
- Plus free text explanation field

**Reference Numbering:**
- Sequential format: `CO-YYYY-NNNNN` (like purchase orders PO-YYYY-NNNNN)
- Database sequence for auto-increment

### 2. Approval Flow & Counter-Offers

**Who Creates:**
- Both KEWA staff and contractors can create change orders
- Contractor can submit via magic-link portal OR KEWA enters on their behalf
- Creator field tracks origin (internal vs. contractor-initiated)

**Approval Workflow:**
- Status: `draft` → `submitted` → `under_review` → `approved` / `rejected` / `cancelled`
- Threshold-based escalation: configurable rules (admin sets CHF thresholds in settings)
- Below threshold: property manager approves
- Above threshold: escalates to finance/director

**Counter-Offers:**
- Full revision model: approver can modify line items, quantities, amounts
- Creates a new **version** of the same change order (version 1, 2, 3...)
- All versions preserved in history — one entity, multiple revisions
- Status resets to `submitted` on revision for re-review

**Cancellation:**
- Approved COs can be cancelled with mandatory reason
- Soft-delete: status set to `cancelled`, record preserved
- Full audit trail of who cancelled, when, why
- Cancelled COs hidden by default in list, visible via "Show cancelled" toggle
- Maximum safety: no hard deletes, complete history retained

### 3. Client Portal Experience

**Client Identity:**
- Configurable per renovation project — could be building owner (Eigentümer), Stockwerkeigentümer, or external Verwaltung
- Set at project level, not per change order

**Portal Capabilities (Full Interaction):**
- View change order details and revision history
- Approve or reject with comments
- Request revision (sends back for amendment)
- View history of all change orders for their project
- Rejection requires comment; approval comment optional

**Financial Detail Visibility:**
- Configurable per change order by KEWA
- Options: full transparency (all line items) or summary only (total + description)
- Default: full transparency (KEWA explicitly hides if needed)

**Magic Link Expiry:**
- 7-day expiry on approval links
- Auto-reminder before expiry (e.g., day 5)
- Can regenerate link after expiry
- Existing magic_link_tokens system reused with purpose `'change_order_approval'`

### 4. Dashboard & Budget Impact

**Dashboard Structure:**
- Dedicated CO list page: `/dashboard/aenderungsauftraege` — all COs across projects
- Project detail integration: CO summary widget embedded in renovation project detail page
- Both views: global overview with project filter + per-project scoped view

**Budget Impact Visualization:**
- Summary cards at top: Original Budget | Approved COs Total | Net Budget | Pending COs
- Waterfall chart: original budget → +CO1 → +CO2 → -CO3 → current budget (recharts)
- Detailed table below: individual COs with status, amount, date

**Status Grouping:**
- Primary grouping: by status (draft / submitted / under_review / approved / rejected / cancelled)
- Status counts shown as filter pills (existing pattern)
- Pending approval items highlighted for action-required visibility

## Scope Boundaries

This phase covers:
- Change order CRUD with line items and versioning
- Internal + contractor + client approval workflows
- Photo evidence and PDF generation
- Dashboard analytics and budget impact visualization
- Client magic-link portal for CO approval

This phase does NOT cover:
- Invoice linking for change order costs (existing invoice module handles this)
- Automated notifications (Phase 24: Push Notifications)
- Integration with inspection workflow (Phase 22-23)

## Deferred Ideas

None captured during discussion.

---
*Created: 2026-01-28*
*Source: User discussion — all four gray areas covered*
