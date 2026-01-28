---
phase: 21-change-orders
plan: 03
subsystem: api, components, dashboard
tags: [nextjs, typescript, recharts, react-pdf, storage, analytics]

# Dependency graph
requires:
  - phase: 21-change-orders
    plan: 01
    provides: Change order schema, types, CRUD API
  - phase: 20-supplier-advanced
    provides: Recharts chart patterns (PriceHistoryChart)
  - phase: 09-contractors
    provides: Work order PDF patterns (work-order-pdf.tsx)
  - phase: 18-knowledge-base
    provides: Storage bucket pattern for attachments with signed URLs
provides:
  - Photo evidence upload and gallery for change orders
  - PDF generation endpoint for change order documents
  - Budget impact analytics API with project-level aggregates
  - Waterfall chart visualizing budget flow from original to current
  - Per-project analytics dashboard with summary cards and CO table
affects: [21-04-client-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Photo upload with drag-and-drop, 10MB validation, and file type checking"
    - "Signed URLs with 1-hour expiry for secure photo access"
    - "PDF generation following work-order-pdf pattern (A4, German labels, manual table layout)"
    - "Recharts waterfall chart using stacked bars (invisible offset + visible value)"
    - "Negative amounts shown in red throughout (PDF, chart, table)"
    - "Budget aggregates computed from approved COs only (pending separate)"

key-files:
  created:
    - src/app/api/change-orders/[id]/photos/route.ts
    - src/app/api/change-orders/[id]/pdf/route.ts
    - src/lib/pdf/change-order-pdf.tsx
    - src/components/change-orders/PhotoEvidenceUpload.tsx
    - src/components/change-orders/PhotoGallery.tsx
    - src/components/change-orders/ChangeOrderPDF.tsx
    - src/app/api/projects/[id]/change-orders/analytics/route.ts
    - src/components/change-orders/BudgetImpactChart.tsx
    - src/components/change-orders/BudgetSummaryCards.tsx
    - src/app/dashboard/projekte/[id]/aenderungsauftraege/page.tsx
  modified: []

key-decisions:
  - "Photo storage in existing media bucket at change_orders/{id}/photos/ path"
  - "Signed URLs generated per-request with 1-hour expiry (consistent with KB attachments)"
  - "PDF filename format: CO-YYYY-NNNNN.pdf (matches CO number exactly)"
  - "Waterfall chart uses stacked bar pattern (recharts has no native waterfall component)"
  - "Analytics API filters COs by work_order.project_id (join-based filtering)"
  - "Approved COs used for waterfall, pending COs shown separately in summary cards"
  - "Negative line items/totals displayed in red across all views (PDF, chart, table)"

patterns-established:
  - "PhotoEvidenceUpload: Drag-and-drop component with FormData upload and progress feedback"
  - "PhotoGallery: Grid with lightbox overlay for full-screen view, DELETE via query param"
  - "BudgetImpactChart: Waterfall using invisible + value stacked bars with per-cell fill colors"
  - "transformToWaterfallData: Handles positive (additions) and negative (credits) correctly"
  - "Per-project analytics page: Server component fetching via API with cookie auth forwarding"

# Metrics
duration: 11min
completed: 2026-01-28
---

# Phase 21 Plan 03: Photo Evidence, PDF, and Budget Analytics Summary

**Photo evidence upload/gallery, PDF generation with German labels, and budget impact dashboard with waterfall chart showing cumulative change order effects**

## Performance

- **Duration:** 11 min
- **Started:** 2026-01-28T04:10:13Z
- **Completed:** 2026-01-28T04:20:59Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Photo evidence API with upload, list, delete endpoints using signed URLs
- PDF template following work-order-pdf pattern with A4 German layout
- Client components for photo upload (drag-and-drop) and gallery (lightbox)
- Budget analytics API computing project-level aggregates
- Waterfall chart using recharts stacked bar pattern
- Per-project analytics dashboard with summary cards and CO table

## Task Commits

Each task was committed atomically:

1. **Task 1: Photo evidence API and PDF generation** - `bec4b0a` (feat)
2. **Task 2: Budget impact analytics API, waterfall chart, and per-project dashboard** - `f91cf9e` (feat)

## Files Created/Modified
- `src/app/api/change-orders/[id]/photos/route.ts` - Photo upload/list/delete with signed URLs
- `src/app/api/change-orders/[id]/pdf/route.ts` - PDF download endpoint
- `src/lib/pdf/change-order-pdf.tsx` - PDF template with German labels and line items table
- `src/components/change-orders/PhotoEvidenceUpload.tsx` - Drag-and-drop upload component
- `src/components/change-orders/PhotoGallery.tsx` - Grid with lightbox viewer
- `src/components/change-orders/ChangeOrderPDF.tsx` - Download button component
- `src/app/api/projects/[id]/change-orders/analytics/route.ts` - Budget analytics API
- `src/components/change-orders/BudgetImpactChart.tsx` - Recharts waterfall chart
- `src/components/change-orders/BudgetSummaryCards.tsx` - Four-card budget summary
- `src/app/dashboard/projekte/[id]/aenderungsauftraege/page.tsx` - Per-project analytics page

## Decisions Made

**1. Photo storage path convention**
- Stored in existing `media` bucket at `change_orders/{co_id}/photos/{timestamp}-{filename}`
- Reuses proven pattern from knowledge base attachments (Phase 18-04)
- Signed URLs generated per-request with 1-hour expiry for security
- No permanent public URLs stored in database

**2. PDF template structure**
- Follows work-order-pdf.tsx pattern exactly (A4, Helvetica 11px, 40px padding)
- Header: KEWA AG logo + "Aenderungsauftrag" + CO number + date
- Metadata section: Work order reference, reason (German), schedule impact, status
- Line items table: Manual flexbox layout (40%, 15%, 20%, 25% column widths)
- Negative amounts shown in red (#c53030) for visual distinction
- Signature area: "Genehmigt durch" / "Datum" lines

**3. Waterfall chart implementation**
- Recharts has no native waterfall component (stacked bar pattern required)
- Two stacked bars per data point: invisible (offset) + value (visible)
- For additions: invisible = previous cumulative, value = amount
- For reductions: invisible = new cumulative, value = amount
- Per-cell fill color via Cell component (blue/green/red/indigo)
- Handles edge case: no approved COs shows empty state with original budget

**4. Analytics aggregation logic**
- Original budget from `renovation_projects.estimated_cost`
- Change orders filtered by `work_order.project_id` (join-based filtering)
- Approved total: SUM of COs WHERE status = 'approved'
- Pending total: SUM of COs WHERE status IN ('submitted', 'under_review')
- Net budget: original_budget + approved_total
- Waterfall chart uses approved COs only (ordered by approved_at)

**5. Per-project analytics page structure**
- Server component fetching via API route (internal fetch with cookie forwarding)
- Breadcrumb: Dashboard > Projekte > {Project} > Aenderungsauftraege
- Four summary cards at top (original, approved, current, pending)
- Waterfall chart in middle showing budget flow
- Table below with all COs (status badges, negative amounts in red)
- Link to create new CO for this project

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all patterns followed existing proven implementations cleanly.

## User Setup Required

None - photo storage uses existing media bucket, PDF generation server-side only.

## Next Phase Readiness

**Ready for Plan 21-04: Client Portal**
- Photo evidence can be included in client portal view (signed URLs ready)
- PDF download can be offered to clients via portal
- Budget impact visible to KEWA staff (client portal will show different view)
- All storage and generation endpoints operational

**Photo evidence complete:**
- Upload API accepts FormData with file and optional caption
- Gallery component provides lightbox and delete functionality
- 10MB file size validation and image-only MIME type checking
- Signed URLs prevent unauthorized access (1-hour expiry)

**PDF generation operational:**
- German-language document with proper formatting
- Line items table handles positive and negative amounts
- Filename matches CO number exactly (CO-YYYY-NNNNN.pdf)
- Download triggers browser save dialog

**Budget analytics functional:**
- Project-level aggregates computed correctly
- Waterfall chart visualizes cumulative impact
- Summary cards show key metrics with color-coded icons
- Per-project page provides complete financial visibility

**No blockers or concerns.**

---
*Phase: 21-change-orders*
*Completed: 2026-01-28*
