---
phase: 21-change-orders
plan: 01
subsystem: database, api
tags: [supabase, postgresql, change-orders, versioning, workflow, nextjs, typescript]

# Dependency graph
requires:
  - phase: 19-supplier-core
    provides: Purchase order patterns (sequence numbering, line items, status workflow)
  - phase: 18-knowledge-base
    provides: Temporal versioning pattern (history table with triggers)
  - phase: 09-contractors
    provides: Magic link token system for external access
provides:
  - Change order database schema with versioning and status workflow
  - CO-YYYY-NNNNN sequential numbering via database function
  - TypeScript types for change orders, versions, photos
  - CRUD API routes with auth and validation
  - Status transition validation (database trigger + TypeScript utilities)
  - Configurable approval thresholds table
affects: [21-02-photos-pdf, 21-03-dashboard, 21-04-client-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Temporal versioning for counter-offers (change_order_versions table)"
    - "Status workflow with JSONB transition map (database trigger enforcement)"
    - "Configurable approval routing via approval_thresholds table"
    - "Bidirectional line items (positive additions, negative credits)"
    - "Work order deletion protection (prevent deletion if active COs exist)"

key-files:
  created:
    - supabase/migrations/057_change_orders.sql
    - src/types/change-orders.ts
    - src/lib/change-orders/queries.ts
    - src/lib/change-orders/workflow.ts
    - src/app/api/change-orders/route.ts
    - src/app/api/change-orders/[id]/route.ts
  modified: []

key-decisions:
  - "Temporal versioning table for counter-offers (stores OLD values on version increment)"
  - "Status workflow enforced at database level via trigger (prevents invalid transitions)"
  - "Approval thresholds configurable per-project with priority-based routing"
  - "Line items can be negative (scope reductions/credits) - total preserves sign"
  - "Work order deletion blocked if active change orders exist (submitted/under_review/approved)"
  - "Soft-delete only (status=cancelled with mandatory reason) - no hard deletes"

patterns-established:
  - "change_order_versions temporal table: Stores OLD values when version incremented (AFTER UPDATE trigger)"
  - "validate_change_order_status_transition: JSONB transition map with auto-timestamp setting"
  - "prevent_work_order_deletion: BEFORE DELETE trigger on work_orders (blocks if active COs)"
  - "approval_thresholds table: project_id nullable for global defaults, priority for overlap resolution"
  - "VALID_TRANSITIONS const in workflow.ts mirrors database trigger exactly"

# Metrics
duration: 7min
completed: 2026-01-28
---

# Phase 21 Plan 01: Change Order CRUD Summary

**Database schema with versioning, status workflow, CO-YYYY-NNNNN sequence, and complete CRUD API following purchase order patterns**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-28T03:49:47Z
- **Completed:** 2026-01-28T03:56:24Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Change order database schema with versioning and workflow enforcement
- CO number sequence generator (CO-YYYY-NNNNN format)
- Complete CRUD API with auth, validation, and status transition checks
- TypeScript types and utilities matching database schema exactly
- Approval thresholds table with configurable routing rules

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration — change_orders schema with versioning and workflow** - `7549f4d` (feat)
2. **Task 2: TypeScript types, query helpers, workflow utilities, and CRUD API** - `2bac6b1` (feat)

## Files Created/Modified
- `supabase/migrations/057_change_orders.sql` - Change orders, versions, photos, approval_thresholds tables with triggers
- `src/types/change-orders.ts` - ChangeOrder, ChangeOrderVersion, ChangeOrderPhoto types
- `src/lib/change-orders/queries.ts` - calculateLineItemsTotal, CHANGE_ORDER_SELECT, formatters
- `src/lib/change-orders/workflow.ts` - VALID_TRANSITIONS, status/reason labels, German translations
- `src/app/api/change-orders/route.ts` - GET list + POST create endpoints
- `src/app/api/change-orders/[id]/route.ts` - GET detail + PATCH update + DELETE soft-delete

## Decisions Made

**1. Temporal versioning pattern for counter-offers**
- Uses change_order_versions table to store OLD values when version incremented
- AFTER UPDATE trigger fires when OLD.version < NEW.version
- Enables full version history reconstruction and revision comparison
- Same pattern as knowledge base (migration 048)

**2. Status workflow enforced at database level**
- BEFORE UPDATE trigger validates all status transitions via JSONB map
- Auto-sets timestamps (submitted_at, approved_at, rejected_at, cancelled_at)
- TypeScript VALID_TRANSITIONS const mirrors database exactly for client-side validation
- Prevents invalid state transitions from direct DB access

**3. Approval thresholds configurable per-project**
- approval_thresholds table with project_id (nullable for global defaults)
- Priority field resolves overlapping ranges (lower number = higher priority)
- Seeded with 3 default thresholds: <5000 CHF property_manager, 5000-25000 finance_director, >25000 ceo
- Supports requires_client_approval flag for VIP projects

**4. Line items support bidirectional amounts**
- Line item total can be positive (additions) or negative (credits/scope reductions)
- calculateLineItemsTotal preserves sign (no Math.abs())
- Same structure as purchase orders for consistency

**5. Work order deletion protection**
- BEFORE DELETE trigger on work_orders checks for active change orders
- Blocks deletion if any COs with status IN (submitted, under_review, approved)
- Prevents orphaned change orders and preserves financial audit trail

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - migration and API routes followed existing patterns cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plans:**
- 21-02: Photo attachments and PDF generation (schema ready, API routes ready)
- 21-03: Dashboard analytics and budget impact visualization (data layer complete)
- 21-04: Client portal with magic link approval (magic_link_tokens system exists from Phase 9)

**Database foundation complete:**
- All tables, sequences, triggers, and indexes created
- Status workflow validated at database level
- Version history pattern ready for counter-offer revisions
- Approval routing configurable per-project

**API layer operational:**
- CRUD endpoints functional with auth and validation
- Status transition checks in both API and database
- Work order join for project context
- Version history retrieval ready

**No blockers or concerns.**

---
*Phase: 21-change-orders*
*Completed: 2026-01-28*
