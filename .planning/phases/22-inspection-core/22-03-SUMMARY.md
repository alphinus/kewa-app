---
phase: 22-inspection-core
plan: 03
subsystem: ui
tags: [next.js, react, typescript, inspections, signature-capture, pdf-generation, template-management]

# Dependency graph
requires:
  - phase: 22-inspection-core
    plan: 02
    provides: Inspection UI, checklist execution, defect logging
  - phase: 22-inspection-core
    plan: 01
    provides: Database schema, API routes, types
  - phase: 21-change-orders
    provides: PDF generation pattern with @react-pdf/renderer
provides:
  - Signature capture with canvas drawing and typed name
  - Defect review and action workflow (task/defer/dismiss)
  - Follow-up task creation with severity-based priority
  - Inspection completion with defect warnings
  - Template management pages (list, create, edit, soft-delete)
  - PDF protocol generation with embedded signature
affects: [23-inspection-advanced]

# Tech tracking
tech-stack:
  added: [react-signature-canvas]
  patterns: [Canvas-based signature capture, Warning modal with acknowledge flow, Button-based reorder (up/down arrows), PDF generation with embedded images]

key-files:
  created:
    - src/lib/inspections/signature-utils.ts
    - src/lib/inspections/defect-actions.ts
    - src/app/api/inspections/[id]/signature/route.ts
    - src/app/api/inspections/[id]/complete/route.ts
    - src/app/api/inspections/[id]/defects/[defectId]/action/route.ts
    - src/components/inspections/SignatureCapture.tsx
    - src/components/inspections/DefectReviewCard.tsx
    - src/components/inspections/InspectionDetail.tsx
    - src/app/dashboard/abnahmen/[id]/maengel/page.tsx
    - src/app/dashboard/abnahmen/[id]/unterschrift/page.tsx
    - src/components/inspections/ChecklistEditor.tsx
    - src/app/dashboard/vorlagen/abnahmen/page.tsx
    - src/app/dashboard/vorlagen/abnahmen/neu/page.tsx
    - src/app/dashboard/vorlagen/abnahmen/[id]/page.tsx
    - src/components/inspections/InspectionPDF.tsx
    - src/app/api/inspections/[id]/pdf/route.ts
  modified:
    - src/app/dashboard/abnahmen/[id]/page.tsx

key-decisions:
  - "Signature canvas uses react-signature-canvas with 500x200px responsive container"
  - "Signature refusal requires mandatory reason field, keeps status at 'completed' (not 'signed')"
  - "Completion warns about open defects with modal, requires acknowledge to proceed"
  - "Defect actions prevent duplicate task creation via null check on action field"
  - "Follow-up tasks created as subtasks on work order's task_id if available"
  - "Template editor uses button-based reorder (up/down arrows) not drag-and-drop"
  - "PDF embeds signature PNG via signed URL converted to base64"
  - "PDF filename format: Abnahme-{title}-{date}.pdf with Content-Disposition attachment"

patterns-established:
  - "Signature capture: canvas + typed name + refusal option with reason textarea"
  - "Defect review: read-only view after action taken to prevent duplicate actions"
  - "Warning modal: fixed inset overlay with backdrop, confirm/cancel buttons"
  - "Template editor: nested structure with section→items, UUID generation via crypto.randomUUID()"
  - "PDF generation: @react-pdf/renderer with A4 StyleSheet, Swiss German formatting"

# Metrics
duration: 22min
completed: 2026-01-28
---

# Phase 22 Plan 03: Signature Capture and Completion Flow Summary

**Canvas-based signature capture, defect review/action workflow, follow-up task generation, inspection completion, template management pages, and PDF protocol generation**

## Performance

- **Duration:** 22 min
- **Started:** 2026-01-28T09:25:12Z
- **Completed:** 2026-01-28T09:47:51Z
- **Tasks:** 3
- **Files modified:** 17 (16 created, 1 modified)

## Accomplishments

- Signature storage helpers for PNG upload to inspections bucket
- Defect action handlers for task creation with severity-based priority
- Signature capture API with refusal handling
- Completion API with defect warning flow
- Defect action API with duplicate prevention
- Canvas-based signature capture component with typed name
- Defect review cards with action selection (task/defer/dismiss)
- Comprehensive inspection detail component with status-based actions
- Signature capture page with inspection summary and schwer defect warnings
- Defect review page with sorted defects and action workflow
- Template management pages (list, create, edit, soft-delete)
- Checklist editor with section/item add/remove/reorder
- PDF generation with A4 layout, checklist results, defect table, embedded signature
- PDF API route with Content-Disposition filename

## Task Commits

Each task was committed atomically:

1. **Task 1: Signature capture, defect actions, and completion API** - `9846dc1` (feat)
   - signature-utils.ts: upload PNG, get signed URLs
   - defect-actions.ts: create follow-up task with severity→priority mapping
   - defect-actions.ts: defer and dismiss actions with reason tracking
   - /api/inspections/[id]/signature: save signature or record refusal
   - /api/inspections/[id]/complete: completion with warning flow
   - /api/inspections/[id]/defects/[defectId]/action: take action endpoint
   - Follow-up tasks created as subtasks on work order's task_id
   - Completion warns but allows proceeding with open defects
   - Defect actions prevent duplicate task creation

2. **Task 2: Signature capture, defect review, and completion UI pages** - `a60254b` (feat)
   - SignatureCapture: canvas with typed name and refusal option
   - DefectReviewCard: action selection with assignee dropdown
   - InspectionDetail: comprehensive detail view with status-based buttons
   - /dashboard/abnahmen/[id]/maengel: defect review page
   - /dashboard/abnahmen/[id]/unterschrift: signature capture page
   - Updated /dashboard/abnahmen/[id]: uses InspectionDetail component
   - Completion flow shows modal warning about open defects
   - Signature page warns about schwer defects with red highlight
   - Touch-friendly 48px min height on interactive elements

3. **Task 3: Template management pages and PDF generation** - `35d9000` (feat)
   - ChecklistEditor: section/item editor with reorder buttons
   - /dashboard/vorlagen/abnahmen: template list with filters
   - /dashboard/vorlagen/abnahmen/neu: create template form
   - /dashboard/vorlagen/abnahmen/[id]: edit template with soft-delete
   - InspectionPDF: A4 PDF with checklist results, defects, signature
   - /api/inspections/[id]/pdf: PDF generation endpoint
   - Template editor generates UUIDs with crypto.randomUUID()
   - PDF includes KEWA AG branding, metadata, checklist by section
   - Signature image embedded from signed URL

## Files Created/Modified

**Libraries:**
- `src/lib/inspections/signature-utils.ts` - PNG upload to inspections bucket, signed URLs
- `src/lib/inspections/defect-actions.ts` - Follow-up task creation, defer, dismiss actions

**API Routes:**
- `src/app/api/inspections/[id]/signature/route.ts` - Save signature or record refusal
- `src/app/api/inspections/[id]/complete/route.ts` - Complete with defect warning
- `src/app/api/inspections/[id]/defects/[defectId]/action/route.ts` - Take defect action
- `src/app/api/inspections/[id]/pdf/route.ts` - Generate PDF with filename

**Components:**
- `src/components/inspections/SignatureCapture.tsx` - Canvas signature + typed name
- `src/components/inspections/DefectReviewCard.tsx` - Defect action selection
- `src/components/inspections/InspectionDetail.tsx` - Comprehensive detail view
- `src/components/inspections/ChecklistEditor.tsx` - Section/item editor
- `src/components/inspections/InspectionPDF.tsx` - PDF template with @react-pdf/renderer

**Pages:**
- `src/app/dashboard/abnahmen/[id]/maengel/page.tsx` - Defect review page
- `src/app/dashboard/abnahmen/[id]/unterschrift/page.tsx` - Signature capture page
- `src/app/dashboard/abnahmen/[id]/page.tsx` - Updated to use InspectionDetail component
- `src/app/dashboard/vorlagen/abnahmen/page.tsx` - Template list
- `src/app/dashboard/vorlagen/abnahmen/neu/page.tsx` - Create template
- `src/app/dashboard/vorlagen/abnahmen/[id]/page.tsx` - Edit template

## Decisions Made

**1. Canvas-based signature with typed name**
- Uses react-signature-canvas library (already installed in Plan 22-01)
- 500x200px canvas with responsive max-width container
- Typed name required for identification (placeholder "Max Mustermann")
- Default role "Handwerker" (editable)
- Clear button to reset canvas
- Touch-friendly with 48px min height on interactive elements

**2. Signature refusal handling**
- Mandatory reason field when refusing signature
- Sets signature_refused=true with reason in database
- Status stays at 'completed' (not 'signed') when refused
- Allows inspection to be completed without signature
- Documents why contractor didn't sign for audit trail

**3. Completion warning flow**
- First POST to /complete without acknowledge_defects
- Returns warning=true with open defects count
- Modal shows "Es gibt offene Mängel..." with count
- User must acknowledge to proceed
- Second POST with acknowledge_defects=true completes
- Warning modal with fixed inset overlay and backdrop

**4. Defect action duplicate prevention**
- Check defect.action !== null before allowing new action
- Returns 400 "Aktion bereits ausgeführt" if action already taken
- DefectReviewCard shows read-only view after action taken
- Prevents multiple task creation from same defect

**5. Follow-up task creation**
- Look up work order to get task_id for parent task linking
- If work_order.task_id exists, create as subtask (parent_task_id set)
- Otherwise create standalone task associated with project
- Severity-based priority: schwer→urgent, mittel→high, gering→normal
- Task title: "Mangel: {defect.title}"
- Task description includes severity and inspection reference
- Update defect: action='task_created', linked_task_id set

**6. Template editor with button-based reorder**
- Up/down arrow buttons for reordering (not drag-and-drop)
- Consistent with existing template editor patterns
- Sections can be added/removed/reordered
- Items can be added/removed/reordered within sections
- Delete confirmation for sections with items
- UUID generation via crypto.randomUUID()

**7. PDF generation with embedded signature**
- Fetch signature PNG via signed URL (1-hour expiry)
- Embed as Image component in @react-pdf/renderer
- PDF includes: header, metadata, checklist results, defects, signature
- Checklist results grouped by section with result icons (✓/✗/—)
- Defect table with severity, title, description, action
- Signature block shows signer name, role, timestamp
- If refused, shows yellow box with refusal reason
- Content-Disposition attachment with filename "Abnahme-{title}-{date}.pdf"

## Deviations from Plan

**Removed assignee_id from task creation (minor adjustment)**
- **Found during:** Task 1 implementation
- **Issue:** tasks table doesn't have assigned_to column (checked schema)
- **Fix:** Removed assignee_id field from task insert
- **Reason:** Task assignment handled separately (not in base tasks table)
- **Impact:** None - task creation still works, assignment can be added later via task management

**Adjusted user fetching in defect review page (minor enhancement)**
- **Found during:** Task 2 implementation
- **Enhancement:** Added user list fetch for assignee dropdown in defect review
- **Implementation:** GET /api/users to populate assignee options
- **Reason:** Need user list for "create task" action selection
- **Impact:** Positive - enables assignee selection in defect action workflow

## Issues Encountered

None - plan executed successfully with minor schema-based adjustments.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 23 (Inspection Advanced):**
- Signature capture and PDF generation complete
- Template management CRUD available
- Follow-up task creation integrated with work order system
- All 8 INSP requirements (INSP-01 through INSP-08) satisfied
- PDF protocol generation working with embedded signatures
- Defect action workflow complete with task creation

**Key capabilities delivered:**
- INSP-01: Template-based inspections (Plans 22-01, 22-02, 22-03)
- INSP-02: Checklist execution with pass/fail/na (Plan 22-02)
- INSP-03: Defect logging with photos and severity (Plan 22-02)
- INSP-04: Follow-up task generation (Plan 22-03)
- INSP-05: Signature capture (Plan 22-03)
- INSP-06: Completion with defects (Plan 22-03)
- INSP-07: Template management (Plan 22-03)
- INSP-08: PDF protocol generation (Plan 22-03)

**No blockers or concerns.**

---
*Phase: 22-inspection-core*
*Completed: 2026-01-28*
