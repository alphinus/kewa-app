---
phase: 21-change-orders
plan: 04
subsystem: portal
tags: [magic-links, client-portal, approval-workflow, nextjs, supabase]

# Dependency graph
requires:
  - phase: 21-01
    provides: Change order schema, versioning, approval workflow
  - phase: 21-02
    provides: Status transition API, approval workflow components
  - phase: 21-03
    provides: Photo evidence and PDF generation
  - phase: AUTH-09
    provides: Magic link token infrastructure
provides:
  - Client approval portal for change orders via magic links
  - Token-based approval/rejection endpoints
  - Secure 7-day expiring tokens with single-use enforcement
  - Configurable financial visibility (show_line_items_to_client)
  - Professional client-facing UI with KEWA branding
affects: [notifications, email-integration, reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Magic link token association via join table
    - Public portal endpoints without authentication
    - Read-only token validation vs consuming token
    - Client-facing UI with minimal dashboard chrome

key-files:
  created:
    - supabase/migrations/058_change_order_approval_tokens.sql
    - src/app/api/change-orders/[id]/send-approval/route.ts
    - src/components/change-orders/SendApprovalDialog.tsx
    - src/app/api/portal/change-orders/[token]/route.ts
    - src/app/api/portal/change-orders/[token]/approve/route.ts
    - src/app/api/portal/change-orders/[token]/reject/route.ts
    - src/app/portal/change-orders/[token]/page.tsx
    - src/components/change-orders/ClientApprovalView.tsx
  modified: []

key-decisions:
  - "Magic link tokens linked to change orders via change_order_approval_tokens join table"
  - "Portal data endpoint validates token without consuming (read-only check)"
  - "Approve/reject endpoints consume token (mark as used) to prevent reuse"
  - "show_line_items_to_client controls financial detail visibility in portal"
  - "Rejection requires comment for audit trail, approval comment optional"
  - "7-day token expiry for client approval workflow"

patterns-established:
  - "Public portal pattern: /portal/[entity]/[token] for external access"
  - "Token validation split: read-only check vs consume-on-action"
  - "Client-facing UI: minimal chrome, KEWA branding, professional appearance"
  - "Success/error states with user-friendly messaging"

# Metrics
duration: 12min
completed: 2026-01-28
---

# Phase 21 Plan 04: Client Approval Portal Summary

**Magic link approval portal with 7-day expiring tokens, configurable financial visibility, and client approve/reject actions**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-28T04:30:31Z
- **Completed:** 2026-01-28T04:42:44Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Magic link token creation with 7-day expiry and change order association
- Client approval portal accessible without authentication via magic link
- Approve/reject actions with token consumption and status updates
- Configurable line item visibility for clients (show_line_items_to_client)
- Professional client-facing UI with KEWA branding and success/error states
- Photo gallery integration for evidence display in portal

## Task Commits

Each task was committed atomically:

1. **Task 1: Magic link creation API and send approval dialog** - `6950f64` (feat)
2. **Task 2: Client portal page with approval/rejection actions** - `42ce1fa` (feat)

## Files Created/Modified
- `supabase/migrations/058_change_order_approval_tokens.sql` - Links magic link tokens to change orders
- `src/app/api/change-orders/[id]/send-approval/route.ts` - Creates magic link token with 7-day expiry
- `src/components/change-orders/SendApprovalDialog.tsx` - Dialog for sending approval link to client email
- `src/app/api/portal/change-orders/[token]/route.ts` - Token validation and CO data fetch (read-only)
- `src/app/api/portal/change-orders/[token]/approve/route.ts` - Client approval endpoint (consumes token)
- `src/app/api/portal/change-orders/[token]/reject/route.ts` - Client rejection endpoint (consumes token, requires comment)
- `src/app/portal/change-orders/[token]/page.tsx` - Portal page for client approval
- `src/components/change-orders/ClientApprovalView.tsx` - Client-facing CO view with approve/reject UI

## Decisions Made
- **Token association pattern**: Created `change_order_approval_tokens` join table to link magic_link_tokens to change_orders (migration 058)
- **Read-only vs consuming validation**: Portal data endpoint validates token without marking as used (read-only check), approve/reject endpoints consume token (mark used) to enforce single-use
- **Financial visibility control**: Respect `show_line_items_to_client` flag - when false, portal shows only total amount without line item breakdown
- **Rejection requires comment**: Mandatory comment for rejection (audit trail), approval comment optional
- **Token expiry**: 7 days (168 hours) for client approval workflow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Client approval portal complete and ready for email integration
- Magic link tokens can be sent via email notifications (Phase 24 - Push Notifications)
- Photo evidence displays in portal (from Plan 03)
- PDF generation available for client download (from Plan 03)
- Ready for Phase 22 (Inspection Core) - change order portal pattern can be reused

**Blockers:** None

**Next recommended:** Integrate SendApprovalDialog into ChangeOrderDetail or ApprovalWorkflowCard for easy access from internal dashboard. Email notification integration in Phase 24.

---
*Phase: 21-change-orders*
*Completed: 2026-01-28*
