---
phase: 07-foundation-data-model
plan: 05
subsystem: database, auth, ui
tags: [postgres, triggers, rls, audit-logging, magic-link, mobile, supabase-storage]

# Dependency graph
requires:
  - phase: 07-02
    provides: audit_logs table, room_condition enum, users table
  - phase: 07-03
    provides: offers, invoices, expenses, payments tables
  - phase: 07-04
    provides: magic_link_tokens table, roles table, tenant_users table
provides:
  - Status workflow enforcement for WorkOrders (9 states)
  - Status workflow enforcement for RenovationProjects (5 states)
  - Condition history tracking for rooms/units/components
  - Audit triggers on all major tables
  - RLS policies for tenant data isolation
  - Configurable retention policies via system_settings
  - Storage metadata tracking
  - Magic link token utilities
  - Mobile-optimized contractor portal
affects: [phase-09-contractor-portal, phase-11-digital-twin, phase-12-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - State machine triggers for status validation
    - Generic audit trigger function
    - RLS with helper functions for role checking
    - System settings table for configuration
    - Mobile-first CSS with safe area insets

key-files:
  created:
    - supabase/migrations/025_work_order_status.sql
    - supabase/migrations/026_project_status.sql
    - supabase/migrations/027_condition_tracking.sql
    - supabase/migrations/028_audit_triggers.sql
    - supabase/migrations/029_rls_policies.sql
    - supabase/migrations/030_retention.sql
    - supabase/migrations/031_storage_buckets.sql
    - supabase/setup_storage.md
    - src/lib/magic-link.ts
    - src/app/contractor/[token]/layout.tsx
    - src/app/contractor/[token]/page.tsx
    - src/app/contractor/[token]/token-error.tsx
    - src/app/contractor/[token]/work-order-card.tsx
  modified:
    - src/types/database.ts

key-decisions:
  - "WorkOrder state machine with 9 states and auto-timestamps"
  - "RenovationProject state machine with terminal 'approved' state"
  - "Condition history tracks source project/work order and media evidence"
  - "Generic audit trigger function for all tables"
  - "RLS uses helper functions for clean policy definitions"
  - "System settings table for configurable retention periods"
  - "Storage metadata table for file tracking"
  - "Mobile-first contractor portal with 44px touch targets"

patterns-established:
  - "State machine: Use JSONB for transition map, trigger for enforcement"
  - "Audit: Generic trigger with auto-detect user from created_by/updated_by"
  - "RLS: Helper functions (is_internal_user, is_tenant_of_unit, etc.)"
  - "Settings: key-value table with JSONB value"
  - "Mobile: min-height 44px, 16px base font, safe-area-inset CSS"

# Metrics
duration: 8min
completed: 2026-01-18
---

# Phase 7 Plan 5: Status Workflows & NFR Implementation Summary

**Status workflow triggers for WorkOrders and RenovationProjects, audit logging on all tables, RLS for tenant isolation, configurable retention, storage metadata, and mobile-first contractor portal**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-18T01:11:26Z
- **Completed:** 2026-01-18T01:19:15Z
- **Tasks:** 9
- **Files created:** 14
- **Files modified:** 1

## Accomplishments

- WorkOrder status workflow enforced (draft->sent->viewed->accepted/rejected->in_progress->done->inspected->closed)
- RenovationProject status workflow enforced (planned->active->blocked/finished->approved)
- Condition history tracking with project/work order source and media evidence
- Audit triggers automatically log all changes to major tables
- RLS policies ensure tenant data isolation (Swiss data privacy compliance)
- Configurable retention for audit logs, magic links, and condition history
- Storage metadata tracking for file management
- Magic link token utilities with expiry, single-use, and revocation
- Mobile-optimized contractor portal with touch-friendly UI

## Task Commits

Each task was committed atomically:

1. **Task 1: WorkOrder Status Transitions** - `8f769bf` (feat)
2. **Task 2: RenovationProject Status Transitions** - `1ff029e` (feat)
3. **Task 3: Condition Tracking** - `cd01768` (feat)
4. **Task 4: Audit Logging Triggers** - `6563ec3` (feat)
5. **Task 5: Row Level Security** - `6d849dc` (feat)
6. **Task 6: Retention Policies** - `a65abaf` (feat)
7. **Task 7: File Storage** - `f6ae9d0` (feat)
8. **Task 8: Magic Link Token Utilities** - `a383331` (feat)
9. **Task 9: Mobile Contractor Portal** - `d518946` (feat)

## Files Created/Modified

**Migrations:**
- `supabase/migrations/025_work_order_status.sql` - WorkOrder state machine
- `supabase/migrations/026_project_status.sql` - Project state machine
- `supabase/migrations/027_condition_tracking.sql` - Condition history table and functions
- `supabase/migrations/028_audit_triggers.sql` - Generic audit trigger for all tables
- `supabase/migrations/029_rls_policies.sql` - RLS policies for data isolation
- `supabase/migrations/030_retention.sql` - System settings and cleanup functions
- `supabase/migrations/031_storage_buckets.sql` - Storage metadata table

**Documentation:**
- `supabase/setup_storage.md` - Storage bucket configuration guide

**TypeScript:**
- `src/lib/magic-link.ts` - Magic link token utilities
- `src/app/contractor/[token]/layout.tsx` - Mobile-first layout
- `src/app/contractor/[token]/page.tsx` - Contractor portal page
- `src/app/contractor/[token]/token-error.tsx` - Error display component
- `src/app/contractor/[token]/work-order-card.tsx` - Work order UI component
- `src/types/database.ts` - Added ConditionHistory, SystemSetting, StorageMetadata types

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| State machine via JSONB transition map | Declarative, easy to modify, validates at trigger level |
| Terminal 'approved' state for projects | Prevents accidental changes to finalized projects |
| Generic audit trigger for all tables | DRY - one function handles INSERT/UPDATE/DELETE |
| RLS with helper functions | Cleaner policy definitions, reusable across tables |
| System settings as key-value JSONB | Flexible configuration without schema changes |
| 44px minimum touch target | Apple HIG recommends 44pt for touch accessibility |
| 16px base font size | Ensures readable text without zooming on mobile |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Import name mismatch (`createServerClient` vs `createClient`) - fixed inline
- Existing type errors in 07-04 files (login/route.ts, magic-link/verify/route.ts) - not part of this plan

## User Setup Required

**Storage bucket configuration required.** See `supabase/setup_storage.md` for:
- Creating `documents` and `media` buckets in Supabase Dashboard
- Configuring file size limits
- Applying storage policies

**To apply migrations:**
```bash
cd supabase
supabase db push
```

## Next Phase Readiness

- Phase 7 complete: All foundation data model migrations created
- Phase 8 (Template System) can proceed: Task/project structure ready
- Phase 9 (Contractor Portal) can proceed: Magic links and contractor page ready
- Phase 11 (Digital Twin) can proceed: Condition tracking foundation ready

**Ready for Phase 8 execution.**

---
*Phase: 07-foundation-data-model*
*Completed: 2026-01-18*
