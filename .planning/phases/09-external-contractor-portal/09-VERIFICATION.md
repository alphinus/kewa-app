---
phase: 09-external-contractor-portal
verified: 2026-01-19T16:30:00Z
status: passed
score: 16/16 truths verified
re_verification:
  previous_status: gaps_found
  previous_score: 0/16 (UAT blocked by 2 issues)
  gaps_closed:
    - "Create Work Order form accessible from project detail page"
    - "Contractor can access portal via magic link without prior session"
  gaps_remaining: []
  regressions: []
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
    - "Create Work Order form accessible from project detail page"
    - "Contractor can access portal via magic link without prior session"
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
    - path: "src/middleware.ts"
      provides: "Path-based magic link token validation"
    - path: "src/app/dashboard/auftraege/page.tsx"
      provides: "Work order list page"
    - path: "src/app/dashboard/auftraege/neu/page.tsx"
      provides: "Work order create page"
    - path: "src/app/dashboard/auftraege/[id]/page.tsx"
      provides: "Work order detail page with send dialog"
    - path: "src/app/dashboard/projekte/[id]/page.tsx"
      provides: "Project detail with 'Auftrag erstellen' button"
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
    - from: "middleware.ts"
      to: "validateContractorAccess"
      via: "import"
    - from: "projekte/[id]/page.tsx"
      to: "/dashboard/auftraege/neu"
      via: "Link"
    - from: "auftraege/neu/page.tsx"
      to: "WorkOrderForm"
      via: "import"
    - from: "auftraege/[id]/page.tsx"
      to: "WorkOrderSendDialog"
      via: "import"
deferred:
  - requirement: "EXT-15"
    reason: "Automatic reminders (24h + 48h) require background job infrastructure - explicitly deferred in 09-05-PLAN.md"
---

# Phase 9: External Contractor Portal Verification Report

**Phase Goal:** Handwerker koennen Auftraege via Magic-Link annehmen/ablehnen
**Verified:** 2026-01-19T16:30:00Z
**Status:** PASSED
**Re-verification:** Yes - after gap closure (Plans 09-06 and 09-07)

## Re-verification Summary

### Previous Gaps (from 09-UAT.md)

| Gap | Previous Status | Current Status | Resolution |
|-----|----------------|----------------|------------|
| Create Work Order form not accessible | BLOCKER | CLOSED | Plan 09-07 added UI pages and wiring |
| Middleware blocks contractor portal | BLOCKER | CLOSED | Plan 09-06 fixed path-based token validation |

### Gap Closure Verification

**Gap 1: Create Work Order form not accessible from project detail page**
- **Claim:** Plan 09-07 added "Auftrag erstellen" button and work order pages
- **Verification:**
  - `src/app/dashboard/projekte/[id]/page.tsx` line 349: Link to `/dashboard/auftraege/neu?project_id=${project.id}`
  - `src/app/dashboard/projekte/[id]/page.tsx` line 365: Button text "Auftrag erstellen"
  - `src/app/dashboard/auftraege/page.tsx` (431 lines): Work order list page
  - `src/app/dashboard/auftraege/neu/page.tsx` (115 lines): Create page imports WorkOrderForm
  - `src/app/dashboard/auftraege/[id]/page.tsx` (649 lines): Detail page imports WorkOrderSendDialog
- **Status:** VERIFIED - All artifacts exist, are substantive, and properly wired

**Gap 2: Middleware blocks contractor portal access**
- **Claim:** Plan 09-06 fixed middleware to validate path-based tokens before session
- **Verification:**
  - `src/middleware.ts` line 14: imports `validateContractorAccess` from '@/lib/magic-link'
  - `src/middleware.ts` lines 102-114: Extracts token from path segments
  - `src/middleware.ts` line 117: Calls `validateContractorAccess(token)` BEFORE any session check
  - `src/middleware.ts` lines 127-142: Valid tokens pass through, contractor email in headers
- **Status:** VERIFIED - Middleware correctly validates path tokens before requiring session

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | KEWA can create work orders with required fields | VERIFIED | WorkOrderForm in neu/page.tsx calls /api/work-orders |
| 2 | PDF can be generated for work orders | VERIFIED | work-order-pdf.tsx (484 lines), pdf/route.ts exists |
| 3 | Email with magic link sent via mailto | VERIFIED | send/route.ts buildMailtoLink function |
| 4 | Contractor can view work order details | VERIFIED | contractor/[token]/[workOrderId]/page.tsx (243 lines) |
| 5 | Contractor can accept work orders | VERIFIED | respond/route.ts handleAccept() |
| 6 | Contractor can reject with reason | VERIFIED | respond/route.ts handleReject() + reject-modal.tsx |
| 7 | Contractor can propose different price | VERIFIED | counter_offer_form.tsx, proposed_cost field |
| 8 | Contractor can propose different schedule | VERIFIED | counter_offer_form.tsx, proposed_start/end_date |
| 9 | Contractor can add questions/comments | VERIFIED | contractor_notes field in respond API |
| 10 | Contractor can upload documents | VERIFIED | upload/route.ts accepts application/pdf |
| 11 | Contractor can upload photos | VERIFIED | upload/route.ts accepts image/* |
| 12 | Viewed status tracked | VERIFIED | mark-viewed/route.ts + MarkViewedTracker |
| 13 | Events are timestamped | VERIFIED | events.ts (406 lines), 038_work_order_events.sql |
| 14 | Deadline displayed with countdown | VERIFIED | deadline.ts (204 lines), DeadlineBanner |
| 15 | Create Work Order accessible from project | VERIFIED | "Auftrag erstellen" button on projekte/[id]/page.tsx |
| 16 | Contractor portal via magic link works | VERIFIED | Middleware validates path token before session |

**Score:** 16/16 truths verified

### Required Artifacts (Gap Closure Focus)

| Artifact | Lines | Substantive | Wired | Status |
|----------|-------|-------------|-------|--------|
| `src/middleware.ts` | 158 | YES | YES | VERIFIED |
| `src/app/dashboard/auftraege/page.tsx` | 431 | YES | YES | VERIFIED |
| `src/app/dashboard/auftraege/neu/page.tsx` | 115 | YES | YES | VERIFIED |
| `src/app/dashboard/auftraege/[id]/page.tsx` | 649 | YES | YES | VERIFIED |
| `src/app/dashboard/projekte/[id]/page.tsx` | 451 | YES | YES | VERIFIED |

### Key Link Verification (Gap Closure Focus)

| From | To | Via | Status | Evidence |
|------|-----|-----|--------|----------|
| middleware.ts | validateContractorAccess | import | WIRED | Line 14 import, Line 117 call |
| projekte/[id]/page.tsx | /dashboard/auftraege/neu | Link | WIRED | Line 349 href |
| auftraege/neu/page.tsx | WorkOrderForm | import | WIRED | Line 17 import, Line 51 render |
| auftraege/[id]/page.tsx | WorkOrderSendDialog | import | WIRED | Line 21 import, Line 641 render |
| auftraege/[id]/page.tsx | /api/work-orders/[id] | fetch | WIRED | Line 138 fetch call |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | - |

No stub patterns, TODOs, or placeholder content found in gap closure files.

### Commits Verifying Gap Closure

```
87876a7 docs(09-07): complete work order UI integration plan
34a6a37 feat(09-07): create work order detail page with send dialog
c2cde63 feat(09-07): create work order create page
9a0f807 feat(09-07): create work order list page
acdb4b2 feat(09-07): add 'Auftrag erstellen' button to project detail page
a337996 fix(09-06): validate path-based magic link tokens before session check
```

## Human Verification Required

Since all automated checks pass, the following should be verified by human testing:

### 1. Full Work Order Creation Flow
**Test:** Navigate to project detail page, click "Auftrag erstellen", fill form, save
**Expected:** Work order created, redirected to detail page
**Why human:** End-to-end flow completion needs human verification

### 2. Work Order Send Flow
**Test:** From work order detail, click "Senden", confirm dialog, click mailto link
**Expected:** Email client opens with magic link in body, status changes to 'sent'
**Why human:** Email client interaction cannot be tested programmatically

### 3. Contractor Portal Access via Magic Link
**Test:** Copy magic link URL, open in incognito/new browser (no existing session)
**Expected:** Contractor dashboard loads showing work orders, no login redirect
**Why human:** Session/cookie state requires browser testing

### 4. Contractor Accept/Reject Flow
**Test:** Open magic link, view work order, click Accept or Reject
**Expected:** Status updates, confirmation shown, KEWA sees change in admin
**Why human:** Two-party workflow needs human testing

### 5. Mobile Experience
**Test:** Open contractor portal on mobile device, navigate, upload photo
**Expected:** Touch-friendly UI (44px min buttons), camera upload works
**Why human:** Mobile device testing cannot be automated

## Requirements Coverage

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

## Summary

All Phase 9 success criteria are met. The two blockers identified in UAT have been closed:

1. **UAT Test 1 Blocker** (WorkOrderForm not integrated): Plan 09-07 created work order list, create, and detail pages, wiring WorkOrderForm and WorkOrderSendDialog into the admin UI. The "Auftrag erstellen" button is now visible on project detail pages.

2. **UAT Test 4 Blocker** (Middleware blocks contractor portal): Plan 09-06 fixed the middleware to extract tokens from the URL path and validate them via validateContractorAccess BEFORE checking for an existing session, allowing first-time magic link access.

Phase 9 goal "Handwerker koennen Auftraege via Magic-Link annehmen/ablehnen" is achieved.

---

*Verified: 2026-01-19T16:30:00Z*
*Verifier: Claude (gsd-verifier)*
*Re-verification: Gap closure after Plans 09-06 and 09-07*
