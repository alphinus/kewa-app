---
phase: 25-ux-polish
plan: 01
subsystem: ui
tags: [react, modal, dialog, supabase, deliveries, inspections]

# Dependency graph
requires:
  - phase: 19-supplier-core
    provides: Purchase orders, deliveries, invoice linking API endpoints
  - phase: 22-inspection-core
    provides: Inspection templates, checklist execution, template schema
provides:
  - InvoiceLinkModal component with supplier-filtered search
  - Template-driven checklist item title display
  - Property delivery history page
affects: [26-tenant-portal-core, 29-tenant-extras]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Modal-based entity linking (invoice to delivery)
    - Template data lookup via useMemo for UI display
    - Page-level property detail views with nested routes

key-files:
  created:
    - src/components/suppliers/InvoiceLinkModal.tsx
    - src/app/dashboard/liegenschaft/[id]/page.tsx
  modified:
    - src/app/dashboard/lieferanten/bestellungen/[id]/page.tsx
    - src/components/inspections/ChecklistExecution.tsx
    - src/lib/inspections/queries.ts
    - src/types/inspections.ts

key-decisions:
  - "Use client-side filtering for invoice search (50-item limit sufficient)"
  - "Reuse DeliveryList component for property page (no duplication)"
  - "Extend INSPECTION_SELECT to include template checklist_sections"

patterns-established:
  - "Modal pattern: Dialog component with controlled open state via parent"
  - "Lookup pattern: useMemo map for template item metadata"

# Metrics
duration: 17min
completed: 2026-01-29
---

# Phase 25 Plan 01: UX Polish - Known Issues Summary

**Invoice linking replaced with search/select modal, checklist items display template-defined titles, and property detail page shows delivery history**

## Performance

- **Duration:** 17 min
- **Started:** 2026-01-29T10:50:00Z
- **Completed:** 2026-01-29T11:07:16Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Invoice linking uses proper modal UI with supplier-filtered invoice list and client-side search
- Checklist execution displays template-defined item titles and descriptions
- Property detail page shows delivery history filtered by building's property_id

## Task Commits

Each task was committed atomically:

1. **Task 1: Invoice link modal and checklist title fix** - `cc5f0b0` (feat)
2. **Task 2: Property delivery history page** - `2e42732` (feat)

## Files Created/Modified
- `src/components/suppliers/InvoiceLinkModal.tsx` - Modal for searching and linking invoices to deliveries with supplier filter
- `src/app/dashboard/liegenschaft/[id]/page.tsx` - Property detail page with building info and delivery history
- `src/app/dashboard/lieferanten/bestellungen/[id]/page.tsx` - Updated to use InvoiceLinkModal instead of prompt()
- `src/components/inspections/ChecklistExecution.tsx` - Added templateItemMap lookup for item titles/descriptions
- `src/lib/inspections/queries.ts` - Extended INSPECTION_SELECT to include checklist_sections from template
- `src/types/inspections.ts` - Extended Inspection.template type to include checklist_sections

## Decisions Made
- **Client-side invoice search:** Fetch up to 50 invoices per supplier and filter client-side (sufficient for typical supplier invoice volumes)
- **Component reuse:** DeliveryList component used on property page without modifications (onLinkInvoice prop is optional)
- **German fallback:** Use "Punkt N" instead of "Item N" for missing template items (matches app language)
- **Template data in query:** Include checklist_sections in INSPECTION_SELECT for single-fetch efficiency

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- v2.2 UAT issues resolved (invoice modal, checklist titles, delivery history)
- Clean baseline for v3.0 feature development
- All supplier and inspection UX improvements complete
- Ready for Phase 26 (Tenant Portal Core)

---
*Phase: 25-ux-polish*
*Completed: 2026-01-29*
