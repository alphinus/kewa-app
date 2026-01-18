---
phase: 09-external-contractor-portal
verified: 2026-01-18T15:30:00Z
status: passed
score: 15/16 requirements verified
must_haves:
  truths:
    - "KEWA can create work orders with required fields"
    - "PDF can be generated for work orders"
    - "Email with magic link can be sent via mailto"
    - "Contractor can view work order details in portal"
    - "Contractor can accept work orders"
    - "Contractor can reject work orders with reason"
    - "Contractor can propose different price"
    - "Contractor can propose different schedule"
    - "Contractor can add questions/comments"
    - "Contractor can upload documents (offers/invoices)"
    - "Contractor can upload photos"
    - "Viewed status tracked when magic link opened"
    - "Events are timestamped in log"
    - "Deadline displayed with countdown"
  artifacts:
    - path: "src/app/api/work-orders/route.ts"
      provides: "Work order CRUD API"
    - path: "src/lib/pdf/work-order-pdf.tsx"
      provides: "PDF template and generation"
    - path: "src/app/api/work-orders/[id]/send/route.ts"
      provides: "Send workflow with magic link + mailto"
    - path: "src/app/contractor/[token]/page.tsx"
      provides: "Contractor dashboard"
    - path: "src/app/api/contractor/[token]/[workOrderId]/respond/route.ts"
      provides: "Accept/reject/counter-offer API"
    - path: "src/app/api/contractor/[token]/[workOrderId]/upload/route.ts"
      provides: "File upload API"
    - path: "src/lib/work-orders/events.ts"
      provides: "Event logging system"
    - path: "src/lib/work-orders/deadline.ts"
      provides: "Deadline tracking utilities"
  key_links:
    - from: "WorkOrderForm"
      to: "/api/work-orders"
      via: "fetch POST"
    - from: "WorkOrderSendDialog"
      to: "/api/work-orders/[id]/send"
      via: "fetch POST"
    - from: "ContractorDashboard"
      to: "getContractorWorkOrders"
      via: "server-side query"
    - from: "ResponseForm"
      to: "/api/contractor/[token]/[workOrderId]/respond"
      via: "fetch POST"
    - from: "UploadSection"
      to: "/api/contractor/[token]/[workOrderId]/upload"
      via: "fetch POST multipart"
deferred:
  - requirement: "EXT-15"
    reason: "Automatic reminders (24h + 48h) require background job infrastructure - explicitly deferred in 09-05-PLAN.md"
---

# Phase 9: External Contractor Portal Verification Report

**Phase Goal:** Handwerker koennen Auftraege via Magic-Link annehmen/ablehnen
**Verified:** 2026-01-18
**Status:** PASSED
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | KEWA can create work orders with required fields | VERIFIED | `src/app/api/work-orders/route.ts` (258 lines) - validates title, partner_id, project/task |
| 2 | PDF can be generated for work orders | VERIFIED | `src/lib/pdf/work-order-pdf.tsx` (484 lines) - @react-pdf/renderer with German A4 template |
| 3 | Email with magic link sent via mailto | VERIFIED | `src/app/api/work-orders/[id]/send/route.ts` (177 lines) - buildMailtoLink function |
| 4 | Contractor can view work order details | VERIFIED | `src/app/contractor/[token]/page.tsx` (158 lines) + detail page (243 lines) |
| 5 | Contractor can accept work orders | VERIFIED | `respond/route.ts` handleAccept() with status->accepted |
| 6 | Contractor can reject with reason | VERIFIED | `respond/route.ts` handleReject() requires rejection_reason |
| 7 | Contractor can propose different price | VERIFIED | counter_offer action sets proposed_cost |
| 8 | Contractor can propose different schedule | VERIFIED | counter_offer action sets proposed_start_date/end_date |
| 9 | Contractor can add questions/comments | VERIFIED | contractor_notes field in respond API |
| 10 | Contractor can upload documents | VERIFIED | `upload/route.ts` (223 lines) accepts application/pdf |
| 11 | Contractor can upload photos | VERIFIED | `upload/route.ts` accepts image/* mime types |
| 12 | Viewed status tracked | VERIFIED | `mark-viewed/route.ts` + MarkViewedTracker component |
| 13 | Events are timestamped | VERIFIED | `038_work_order_events.sql` + `events.ts` (406 lines) |
| 14 | Deadline displayed with countdown | VERIFIED | `deadline.ts` (204 lines) + DeadlineBanner component |
| 15 | Automatic reminders (24h + 48h) | DEFERRED | EXT-15 explicitly deferred - requires background jobs |

**Score:** 14/15 truths verified (1 intentionally deferred)

### Required Artifacts

| Artifact | Expected | Exists | Lines | Substantive | Wired |
|----------|----------|--------|-------|-------------|-------|
| `src/types/work-order.ts` | WorkOrder types | YES | 286 | YES | YES - imported throughout |
| `src/lib/pdf/work-order-pdf.tsx` | PDF generation | YES | 484 | YES | YES - used by pdf/route.ts |
| `src/app/api/work-orders/route.ts` | CRUD API | YES | 258 | YES | YES - called by WorkOrderForm |
| `src/app/api/work-orders/[id]/route.ts` | Single resource API | YES | exists | YES | YES |
| `src/app/api/work-orders/[id]/pdf/route.ts` | PDF download | YES | 199 | YES | YES - linked from send response |
| `src/app/api/work-orders/[id]/send/route.ts` | Send workflow | YES | 177 | YES | YES - creates magic link |
| `src/app/contractor/[token]/page.tsx` | Dashboard | YES | 158 | YES | YES - server component |
| `src/app/contractor/[token]/[workOrderId]/page.tsx` | Detail page | YES | 243 | YES | YES - linked from dashboard |
| `src/app/contractor/[token]/work-order-card.tsx` | Card component | YES | 477 | YES | YES - used by dashboard |
| `src/app/api/contractor/[token]/[workOrderId]/respond/route.ts` | Response API | YES | 322 | YES | YES - called by ResponseForm |
| `src/app/api/contractor/[token]/[workOrderId]/upload/route.ts` | Upload API | YES | 223 | YES | YES - called by UploadSection |
| `src/lib/work-orders/events.ts` | Event logging | YES | 406 | YES | YES - integrated in all APIs |
| `src/lib/work-orders/deadline.ts` | Deadline utils | YES | 204 | YES | YES - used in dashboard/cards |
| `src/components/work-orders/WorkOrderForm.tsx` | Create form | YES | 537 | YES | YES - calls API |
| `src/components/work-orders/WorkOrderSendDialog.tsx` | Send dialog | YES | exists | YES | YES |
| `src/components/admin/work-orders/CounterOfferReview.tsx` | Admin review | YES | 355 | YES | YES |
| `src/components/admin/work-orders/EventLog.tsx` | Event timeline | YES | exists | YES | YES |
| `supabase/migrations/037_work_order_extensions.sql` | DB extensions | YES | 160 | YES | YES - counter_offer_status enum |
| `supabase/migrations/038_work_order_events.sql` | Events table | YES | 160 | YES | YES - triggers for auto-logging |

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|-----|-----|--------|----------|
| WorkOrderForm | /api/work-orders | fetch POST | WIRED | Line 241-244 in WorkOrderForm.tsx |
| WorkOrderSendDialog | /api/work-orders/[id]/send | fetch POST | WIRED | Uses send endpoint |
| Dashboard (page.tsx) | getContractorWorkOrders | direct call | WIRED | Line 46-48 |
| ResponseForm | /api/contractor/.../respond | fetch POST | WIRED | Form submits to API |
| UploadSection | /api/contractor/.../upload | fetch POST | WIRED | FileUploader calls API |
| send/route.ts | createMagicLink | import | WIRED | Line 10 import + Line 127 call |
| All APIs | logWorkOrderEvent | import | WIRED | Events logged in all mutations |

### Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| EXT-01 | WorkOrder creation with partner assignment | SATISFIED |
| EXT-02 | WorkOrder contains scope, location, schedule, attachments | SATISFIED |
| EXT-03 | PDF generation | SATISFIED |
| EXT-04 | Email via mailto | SATISFIED |
| EXT-05 | Magic link in email | SATISFIED |
| EXT-06 | Contractor portal displays details | SATISFIED |
| EXT-07 | Accept/Reject buttons | SATISFIED |
| EXT-08 | Contractor price proposal | SATISFIED |
| EXT-09 | Contractor schedule proposal | SATISFIED |
| EXT-10 | Questions/comment field | SATISFIED |
| EXT-11 | Document upload | SATISFIED |
| EXT-12 | Photo upload | SATISFIED |
| EXT-13 | Viewed status tracking | SATISFIED |
| EXT-14 | Timestamped event log | SATISFIED |
| EXT-15 | Automatic reminders | DEFERRED (requires background jobs) |
| EXT-16 | Acceptance deadline | SATISFIED |

**Requirements:** 15/16 satisfied (1 explicitly deferred)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| layout.tsx | 48 | "Logo placeholder" comment | INFO | UI cosmetic only |

No blocking anti-patterns found. All "placeholder" mentions are form input placeholders, not code stubs.

### Human Verification Required

Since all automated checks pass, the following should be verified by human testing:

### 1. Full Work Order Flow
**Test:** Create work order in admin, send to contractor, receive mailto link
**Expected:** Email client opens with pre-filled subject, body, and magic link
**Why human:** Cannot verify email client behavior programmatically

### 2. Contractor Portal Experience
**Test:** Open magic link on mobile device, view dashboard, navigate to detail
**Expected:** Mobile-optimized UI, touch-friendly buttons (min 44px), proper German text
**Why human:** Visual appearance and mobile UX need human judgment

### 3. Accept/Reject Flow
**Test:** Accept a work order, then reject another with reason
**Expected:** Status updates correctly, events logged, KEWA sees changes
**Why human:** End-to-end behavior needs human verification

### 4. Counter-Offer Flow
**Test:** Submit counter-offer with different price, KEWA approves
**Expected:** CounterOfferReview shows in admin, approval changes status to accepted
**Why human:** Two-party workflow needs human testing

### 5. File Upload on Mobile
**Test:** Upload photo using camera on mobile device
**Expected:** Camera opens, photo uploads with progress, appears in gallery
**Why human:** Mobile camera integration needs device testing

### 6. PDF Generation
**Test:** Download PDF for work order
**Expected:** Professional A4 document with KEWA branding, German text, correct data
**Why human:** Visual quality of PDF needs human review

### Gaps Summary

**No gaps found.** All phase 9 success criteria are met:

- [x] WorkOrder-Erstellung mit allen Pflichtfeldern
- [x] PDF-Generierung funktional
- [x] Email mit Magic-Link versendet (mailto)
- [x] Contractor-Portal: View, Accept, Reject, Price, Upload
- [x] Tracking: Viewed-Status, Erinnerungen*, Deadline

*Note: EXT-15 (automatic reminders 24h + 48h) was explicitly deferred in 09-05-PLAN.md as it requires background job infrastructure not yet in place. The deadline display and urgency highlighting ARE implemented.

## Technical Summary

### Files Created (Phase 9)

**Plan 09-01: WorkOrder Creation & PDF**
- `src/types/work-order.ts` - TypeScript types
- `src/lib/pdf/work-order-pdf.tsx` - PDF template (484 lines)
- `src/app/api/work-orders/route.ts` - CRUD API
- `src/app/api/work-orders/[id]/route.ts` - Single resource
- `src/app/api/work-orders/[id]/pdf/route.ts` - PDF download
- `src/app/api/work-orders/[id]/send/route.ts` - Send workflow
- `src/components/work-orders/WorkOrderForm.tsx` - Create form
- `src/components/work-orders/WorkOrderSendDialog.tsx` - Send dialog

**Plan 09-02: Contractor Dashboard**
- `src/lib/contractor/queries.ts` - Query utilities
- `src/app/contractor/[token]/page.tsx` - Dashboard (rewritten)
- `src/app/contractor/[token]/dashboard-section.tsx` - Section component
- `src/app/contractor/[token]/mark-viewed-tracker.tsx` - Auto-viewed tracking
- `src/app/contractor/[token]/request-link-form.tsx` - Request new link
- `src/app/contractor/[token]/[workOrderId]/page.tsx` - Detail page
- `src/app/api/contractor/[token]/mark-viewed/route.ts` - Mark viewed API
- `src/app/api/contractor/[token]/status/route.ts` - Status update API
- `src/app/api/contractor/request-link/route.ts` - Request link API

**Plan 09-03: Response Actions & Counter-Offer**
- `supabase/migrations/037_work_order_extensions.sql` - DB extensions
- `src/lib/contractor/constants.ts` - Rejection reasons
- `src/app/api/contractor/[token]/[workOrderId]/respond/route.ts` - Response API
- `src/app/contractor/[token]/[workOrderId]/response-form.tsx` - Response form
- `src/app/contractor/[token]/[workOrderId]/reject-modal.tsx` - Reject modal
- `src/app/contractor/[token]/[workOrderId]/counter-offer-form.tsx` - Counter-offer
- `src/components/admin/work-orders/CounterOfferReview.tsx` - Admin review
- `src/app/api/work-orders/[id]/counter-offer/route.ts` - Admin counter-offer API

**Plan 09-04: File Uploads**
- `src/lib/storage/contractor-upload.ts` - Upload utilities
- `src/app/api/contractor/[token]/[workOrderId]/upload/route.ts` - Upload API
- `src/app/api/contractor/[token]/[workOrderId]/media/route.ts` - Media list/delete
- `src/components/upload/FileUploader.tsx` - Upload component
- `src/app/contractor/[token]/[workOrderId]/upload-section.tsx` - Upload section
- `src/app/contractor/[token]/[workOrderId]/media-gallery.tsx` - Media gallery

**Plan 09-05: Tracking & Events**
- `supabase/migrations/038_work_order_events.sql` - Events table + triggers
- `src/lib/work-orders/events.ts` - Event logging utilities
- `src/lib/work-orders/deadline.ts` - Deadline utilities
- `src/app/api/work-orders/[id]/events/route.ts` - Events API
- `src/components/admin/work-orders/EventLog.tsx` - Event timeline
- `src/app/contractor/[token]/[workOrderId]/deadline-banner.tsx` - Deadline UI

### Dependencies Added
- `@react-pdf/renderer ^4.3.2` - PDF generation

---

*Verified: 2026-01-18*
*Verifier: Claude (gsd-verifier)*
