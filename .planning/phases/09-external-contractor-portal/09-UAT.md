---
status: complete
phase: 09-external-contractor-portal
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md, 09-05-SUMMARY.md]
started: 2026-01-19T14:30:00Z
updated: 2026-01-19T14:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Create Work Order from Project
expected: Navigate to project, create work order form appears with partner, deadline, cost fields. Submit saves successfully.
result: issue
reported: "nicht sichtbar - confirmed via code inspection: WorkOrderForm component exists but is NOT integrated into any page. No 'Create Work Order' button on project detail page."
severity: blocker

### 2. Download Work Order PDF
expected: From work order detail, click "PDF" button. A professional A4 PDF downloads with KEWA AG branding, work details in German (address, unit, room, scope, dates, cost).
result: skipped
reason: Blocked by Test 1 - cannot create work orders to test PDF download

### 3. Send Work Order to Contractor
expected: Click "Send" on work order. Dialog shows email preview with magic link. Click mailto link opens email client pre-filled. Status changes to 'sent'.
result: skipped
reason: Blocked by Test 1 - cannot create work orders to test send flow

### 4. Contractor Opens Magic Link
expected: Open the magic link URL as contractor. Dashboard loads showing ALL work orders for this contractor grouped into: "Handlungsbedarf" (action needed), "In Bearbeitung" (in progress), "Abgeschlossen" (completed).
result: issue
reported: "Middleware blocks contractor portal access - redirects to /login?error=contractor_access_required even for valid magic link tokens. Middleware requires session before token validation."
severity: blocker

### 5. Contractor Views Work Order Detail
expected: Click a work order card in dashboard. Detail page opens with full work order info, action buttons, and back-to-dashboard link.
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 6. Auto-Mark as Viewed
expected: When contractor first opens dashboard with 'sent' work orders, they automatically change to 'viewed' status. No manual action required.
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 7. Contractor Accepts Work Order
expected: Click "Annehmen" (Accept) button on work order. Status changes to 'accepted'. Confirmation shown.
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 8. Contractor Rejects Work Order
expected: Click "Ablehnen" (Reject). Modal appears with predefined rejection reasons (Kapazität, Standort, Umfang, etc.). Select reason and submit. Status changes to 'rejected'.
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 9. Contractor Submits Counter-Offer
expected: Click "Gegenangebot" (Counter-offer). Form shows side-by-side comparison with current values. Enter proposed price/dates/notes. Submit keeps status as 'viewed' but shows "Gegenangebot ausstehend".
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 10. KEWA Reviews Counter-Offer
expected: In KEWA admin, see counter-offer pending indicator. View comparison table of KEWA offer vs contractor proposal. Can approve, reject, or close the work order.
result: skipped
reason: Blocked by Tests 1, 9 - cannot create work orders or counter-offers

### 11. Contractor Uploads Photos
expected: On accepted work order, "Uploads" section visible. Click to upload photo, select from camera or gallery. Photo appears in grid. Can add multiple photos with context labels (before, during, after, completion).
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 12. Contractor Uploads Documents
expected: Upload PDF document (offer/invoice). File appears in documents list with download link. Max 20MB enforced.
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 13. Contractor Marks Work Complete
expected: Click "Als erledigt markieren" (Mark Complete). Confirmation dialog mentions uploading completion photos. Confirm changes status to 'done'.
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 14. Deadline Display on Dashboard
expected: Work orders show deadline countdown. Color coding: green (>48h), yellow (24-48h), red (<24h). Expired shows red with "Abgelaufen" text.
result: skipped
reason: Blocked by Test 4 - contractor portal middleware blocks access

### 15. Event Timeline in Admin
expected: In KEWA admin work order detail, see event timeline showing all actions (created, sent, viewed, accepted, etc.) with timestamps and actor info.
result: skipped
reason: Blocked by Test 1 - cannot create work orders, no admin work order detail page

### 16. Request New Link (Expired Token)
expected: If magic link expired, error page shows "Request New Link" form. Enter email, submit creates audit log entry and shows confirmation.
result: skipped
reason: Blocked by Test 4 - middleware redirects before page can show error/request form

## Summary

total: 16
passed: 0
issues: 2
pending: 0
skipped: 14

## Gaps

- truth: "Create Work Order form accessible from project detail page"
  status: failed
  reason: "User reported: nicht sichtbar - confirmed via code inspection: WorkOrderForm component exists but is NOT integrated into any page. No 'Create Work Order' button on project detail page."
  severity: blocker
  test: 1
  artifacts:
    - path: "src/components/work-orders/WorkOrderForm.tsx"
      issue: "Component exists but not imported/used anywhere"
    - path: "src/components/work-orders/WorkOrderSendDialog.tsx"
      issue: "Component exists but not imported/used anywhere"
    - path: "src/app/dashboard/projekte/[id]/page.tsx"
      issue: "Missing 'Create Work Order' button in actions section"
  missing:
    - "Add 'Create Work Order' button to project detail page actions"
    - "Create work order list/detail page in KEWA admin"
    - "Wire WorkOrderForm and WorkOrderSendDialog into UI"
  debug_session: ""

- truth: "Contractor can access portal via magic link without prior session"
  status: failed
  reason: "Middleware at src/middleware.ts blocks contractor portal - redirects to /login?error=contractor_access_required even for magic link URLs. The middleware checks for session BEFORE validating token, but magic links should work WITHOUT a session."
  severity: blocker
  test: 4
  artifacts:
    - path: "src/middleware.ts"
      issue: "handleContractorRoute checks session first, redirects if none - but magic link access should create the session"
  missing:
    - "Fix middleware to validate magic link token BEFORE requiring session"
    - "Allow first-time magic link access without existing session"
  debug_session: ""
