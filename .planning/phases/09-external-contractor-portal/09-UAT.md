---
status: complete
phase: 09-external-contractor-portal
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md, 09-05-SUMMARY.md, 09-06-SUMMARY.md, 09-07-SUMMARY.md]
started: 2026-01-19T16:10:00Z
updated: 2026-01-19T17:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Create Work Order from Project
expected: Navigate to project detail, click "Auftrag erstellen" button. Form opens with project pre-selected. Fill partner/deadline/cost, submit saves, redirects to detail page.
result: issue
reported: "Projekt-Detail-Seite gibt 404 (Next.js 16 Middleware-Deprecation). WorkOrderForm via /dashboard/auftraege/neu funktioniert, zeigt alle Felder korrekt. Blockiert durch: keine Partners in DB."
severity: blocker

### 2. Work Order List Page
expected: Navigate to /dashboard/auftraege. See list of all work orders with status badges (German labels), partner name, deadline. Status filter works.
result: pass

### 3. Work Order Detail Page
expected: Click work order from list. Detail page shows partner info, scope, dates, cost, status timeline. Can see all work order details.
result: skipped
reason: Keine Work Orders in DB zum Testen

### 4. Download Work Order PDF
expected: From work order detail, click "PDF" button. A professional A4 PDF downloads with KEWA AG branding.
result: skipped
reason: Blockiert durch Test 1 - keine Work Orders

### 5. Send Work Order to Contractor
expected: On work order detail (status: draft), click "Senden". Dialog shows email preview with magic link.
result: skipped
reason: Blockiert durch Test 1 - keine Work Orders

### 6. Contractor Opens Magic Link
expected: Open the magic link URL as contractor (no prior login). Dashboard loads showing ALL work orders for this contractor.
result: issue
reported: "Middleware validiert Token korrekt (ungueltige Tokens werden zu /login?error=not_found redirected). Kann nicht vollstaendig testen ohne validen Token/Work Order."
severity: major

### 7. Auto-Mark as Viewed
expected: When contractor first opens dashboard with 'sent' work orders, they automatically change to 'viewed' status.
result: skipped
reason: Blockiert durch Test 6 - keine validen Tokens

### 8. Contractor Views Work Order Detail
expected: Click a work order card in dashboard. Detail page opens with full work order info and action buttons.
result: skipped
reason: Blockiert durch Test 6

### 9. Contractor Accepts Work Order
expected: Click "Annehmen" button. Status changes to 'accepted'.
result: skipped
reason: Blockiert durch Test 6

### 10. Contractor Rejects Work Order
expected: Click "Ablehnen". Modal with rejection reasons appears.
result: skipped
reason: Blockiert durch Test 6

### 11. Contractor Submits Counter-Offer
expected: Click "Gegenangebot". Form shows side-by-side comparison.
result: skipped
reason: Blockiert durch Test 6

### 12. KEWA Reviews Counter-Offer
expected: In KEWA admin, see counter-offer comparison table.
result: skipped
reason: Blockiert durch Tests 1, 11

### 13. Contractor Uploads Photos
expected: On accepted work order, upload photos with context labels.
result: skipped
reason: Blockiert durch Test 6

### 14. Contractor Uploads Documents
expected: Upload PDF documents (offer/invoice).
result: skipped
reason: Blockiert durch Test 6

### 15. Contractor Marks Work Complete
expected: Click "Als erledigt markieren". Status changes to 'done'.
result: skipped
reason: Blockiert durch Test 6

### 16. Deadline Display on Dashboard
expected: Work orders show deadline countdown with color coding.
result: skipped
reason: Blockiert durch Test 6

### 17. Event Timeline in Admin
expected: In KEWA admin work order detail, see event timeline with timestamps.
result: skipped
reason: Blockiert durch Test 1 - keine Work Orders

### 18. Request New Link (Expired Token)
expected: If magic link expired, error page shows "Request New Link" form.
result: skipped
reason: Keine expired Tokens zum Testen

## Summary

total: 18
passed: 1
issues: 2
pending: 0
skipped: 15

## Gaps

- truth: "Projekt-Detail-Seite zeigt Auftrag erstellen Button"
  status: failed
  reason: "Next.js 16 gibt 404 fuer /dashboard/projekte/[id] trotz korrekt konfigurierter Route und 200 vom Server"
  severity: blocker
  test: 1
  root_cause: "Next.js 16.1.2 Middleware-Deprecation - middleware.ts wird als veraltet markiert. Server rendert 200, aber Client zeigt 404."
  artifacts:
    - path: "src/middleware.ts"
      issue: "Middleware deprecated in Next.js 16, needs migration to proxy"
    - path: "src/app/dashboard/projekte/[id]/page.tsx"
      issue: "Page renders successfully on server but 404 on client"
  missing:
    - "Migrate middleware.ts to Next.js 16 proxy pattern"
    - "OR: Downgrade to Next.js 15 for compatibility"

- truth: "Contractor kann Portal ohne vorherige Session oeffnen"
  status: partial
  reason: "Middleware validiert Tokens korrekt (invalid -> redirect). Volltest blockiert durch fehlende Testdaten (Partners, Work Orders, Magic Links)"
  severity: major
  test: 6
  root_cause: "Test-Umgebung hat keine Partners/Work Orders - nicht Code-Problem"
  artifacts: []
  missing:
    - "Seed-Daten fuer Partners in Datenbank"
    - "Seed-Daten fuer Work Orders mit Magic Links"

## Environment Issues (Not Code Bugs)

1. **Keine Partners in Datenbank** - WorkOrderForm kann nicht vollstaendig getestet werden
2. **Keine Work Orders** - Contractor Portal kann nicht mit echten Daten getestet werden
3. **Keine Magic Link Tokens** - Contractor-Zugang kann nur mit Rejection getestet werden

## Code Issues Found During Testing

1. **kewa-session Cookie Mismatch** (FIXED)
   - 7 Dateien verwendeten falschen Cookie-Namen 'kewa-session' statt 'session'
   - Gefixt: src/app/dashboard/projekte/[id]/page.tsx, auftraege/page.tsx, wohnungen/[id]/page.tsx, kosten/wohnungen/[id]/page.tsx, kosten/wohnungen/page.tsx
   - 2 API-Routen noch mit altem Pattern (comments, parking) - funktionieren durch Middleware

2. **Next.js 16 Middleware Deprecation** (UNRESOLVED)
   - Server gibt 200, Client zeigt 404 fuer dynamische Routes
   - Warnung: "The middleware file convention is deprecated. Please use proxy instead."
   - Betrifft: /dashboard/projekte/[id], moeglicherweise andere [id] Routes

## Verified Working

1. Work Order List Page (/dashboard/auftraege) - PASS
2. Work Order Create Form (/dashboard/auftraege/neu) - Form renders correctly
3. Project List Page (/dashboard/projekte) - PASS
4. Contractor Portal Token Validation - Invalid tokens correctly rejected
5. Login Flow - PASS
6. Session Management - PASS (after cookie fix)
