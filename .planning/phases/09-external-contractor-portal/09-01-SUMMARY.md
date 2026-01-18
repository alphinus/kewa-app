---
phase: 09-external-contractor-portal
plan: 01
subsystem: api
tags: [react-pdf, pdf-generation, work-orders, mailto, magic-link]

# Dependency graph
requires:
  - phase: 07-foundation
    provides: work_orders table, partners table, magic_link_tokens table
  - phase: 08-template
    provides: renovation_projects table, tasks table
provides:
  - WorkOrder CRUD API endpoints
  - PDF generation for work orders
  - Send workflow with magic link creation
  - WorkOrderForm and WorkOrderSendDialog components
affects: [09-02, 09-03, 10-cost-finance]

# Tech tracking
tech-stack:
  added: ["@react-pdf/renderer v4.3.2"]
  patterns: ["Supabase nested relation transformation", "A4 PDF template with German locale"]

key-files:
  created:
    - src/types/work-order.ts
    - src/lib/pdf/work-order-pdf.tsx
    - src/app/api/work-orders/route.ts
    - src/app/api/work-orders/[id]/route.ts
    - src/app/api/work-orders/[id]/pdf/route.ts
    - src/app/api/work-orders/[id]/send/route.ts
    - src/components/work-orders/WorkOrderForm.tsx
    - src/components/work-orders/WorkOrderSendDialog.tsx
  modified:
    - package.json

key-decisions:
  - "Use @react-pdf/renderer for server-side PDF generation (no Puppeteer needed)"
  - "Default 72h acceptance deadline for work orders"
  - "Supabase returns arrays for relations - transform to single objects"
  - "Mailto links for email (no SMTP server required)"

patterns-established:
  - "PDF template pattern: transformToPDFData helper + generateWorkOrderPDF async function"
  - "Nested relation transformation: first() helper to extract from Supabase arrays"
  - "Work order create requires partner_id and either project_id or task_id"

# Metrics
duration: 25min
completed: 2026-01-18
---

# Phase 9 Plan 01: WorkOrder Creation & PDF Generation Summary

**WorkOrder CRUD API with @react-pdf/renderer PDF generation, magic link send workflow, and German-locale A4 document templates**

## Performance

- **Duration:** 25 min
- **Started:** 2026-01-18T09:04:24Z
- **Completed:** 2026-01-18T09:29:00Z
- **Tasks:** 8
- **Files modified:** 10

## Accomplishments

- Complete WorkOrder CRUD API (POST, GET, PATCH, DELETE)
- A4 PDF document generation with KEWA AG branding in German
- Send workflow creating magic links and mailto links
- WorkOrderForm for creating work orders from projects/tasks
- WorkOrderSendDialog for previewing and sending to contractors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @react-pdf/renderer** - `a213d4d` (chore)
2. **Task 2: Create WorkOrder TypeScript types** - `561fd7f` (feat)
3. **Task 3: Create work order PDF template** - `e92507f` (feat)
4. **Task 4: Create work order CRUD API routes** - `aa02cde` (feat)
5. **Task 5: Create PDF generation API route** - `295c9cb` (feat)
6. **Task 6: Create send workflow API route** - `24a4cec` (feat)
7. **Task 7: Create WorkOrderForm component** - `7ca5b51` (feat)
8. **Task 8: Create WorkOrderSendDialog component** - `a4273d1` (feat)
9. **Type fixes** - `9dcc1e3` (fix)

## Files Created/Modified

- `package.json` - Added @react-pdf/renderer dependency
- `src/types/work-order.ts` - WorkOrder interfaces and API types
- `src/lib/pdf/work-order-pdf.tsx` - PDF template and generation
- `src/app/api/work-orders/route.ts` - POST/GET collection endpoints
- `src/app/api/work-orders/[id]/route.ts` - GET/PATCH/DELETE resource endpoints
- `src/app/api/work-orders/[id]/pdf/route.ts` - PDF download endpoint
- `src/app/api/work-orders/[id]/send/route.ts` - Send workflow endpoint
- `src/components/work-orders/WorkOrderForm.tsx` - Work order creation form
- `src/components/work-orders/WorkOrderSendDialog.tsx` - Send confirmation dialog

## Decisions Made

- **@react-pdf/renderer over alternatives:** No Puppeteer/Chrome dependency, React-native syntax, ESM-compatible
- **72h default acceptance deadline:** Standard business response window for contractors
- **Mailto links instead of SMTP:** Simpler deployment, works with any email client, user controls sending
- **PDF includes only work-relevant info:** Address, unit, room, scope, dates, cost - no tenant PII

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Supabase nested relation typing**
- **Found during:** Task 5 (PDF generation)
- **Issue:** Supabase returns arrays for nested relations even with .single(), causing type errors
- **Fix:** Added WorkOrderQueryResult interface and first() helper to extract single elements
- **Files modified:** src/app/api/work-orders/[id]/pdf/route.ts, src/app/api/work-orders/[id]/send/route.ts
- **Verification:** Type check passes, PDF generates correctly
- **Committed in:** 9dcc1e3

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for type safety. No scope creep.

## Issues Encountered

None - plan executed as written with minor type adjustment for Supabase query results.

## User Setup Required

None - no external service configuration required. The @react-pdf/renderer library works out of the box.

## Next Phase Readiness

- Work order creation and PDF generation complete
- Send workflow ready for contractor portal (Plan 02)
- Magic links created and validated via existing infrastructure
- PDF can be downloaded before/after sending

---
*Phase: 09-external-contractor-portal*
*Plan: 01*
*Completed: 2026-01-18*
