---
phase: 35-schema-foundation
plan: 02
subsystem: database
tags: [postgres, supabase, multi-tenant, migrations, sql, organization_id, rls-prep]

# Dependency graph
requires:
  - 35-01 (organizations table for FK references)
provides:
  - organization_id UUID column on all 62 per-organization tables
  - mandate_id UUID FK on properties table
  - property_type CHECK (rental/stwe/mixed) on properties table
  - Grundbuch fields on properties (land_registry_nr, municipality, parcel_nr)
  - 64 btree indexes for RLS query performance (idx_{tablename}_org pattern)
affects:
  - 35-03 (RLS policies will target these org_id columns)
  - 35-04 (backfill sets org_id values, then adds NOT NULL)
  - Phase 37 (RLS uses these columns for tenant isolation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ADD COLUMN IF NOT EXISTS for idempotent column additions"
    - "CREATE INDEX CONCURRENTLY IF NOT EXISTS for zero-lock production index creation"
    - "All columns nullable in migration — NOT NULL enforcement deferred to Phase 36 post-backfill"
    - "Single ALTER TABLE per table (multiple column additions grouped)"
    - "idx_{tablename}_org index naming convention"

key-files:
  created:
    - supabase/migrations/075_org_id_columns.sql
  modified: []

key-decisions:
  - "62 tables received organization_id (plan estimated 44+ — actual audit found more tables existed than initially counted)"
  - "tenant_users included: per-org since tenant-unit relationship is org-scoped (not in original section list but per D2 classification)"
  - "ticket_categories NOT included: global lookup table (system-defined categories, no org isolation needed per D2)"
  - "app_settings included: each org needs its own company_name for tenant portal branding"
  - "All 67 ADD COLUMN statements use IF NOT EXISTS — safe to run multiple times"
  - "All 64 indexes use CONCURRENTLY — no table locks during production deployment"

patterns-established:
  - "Organization isolation column pattern: nullable UUID FK to organizations(id), paired with btree index"
  - "Grundbuch fields on properties for Swiss land registry: land_registry_nr, municipality, parcel_nr"
  - "property_type discriminator: rental | stwe | mixed (D6 STWE support)"

requirements-completed: [SCHEMA-04]

# Metrics
duration: 10min
completed: 2026-02-18
---

# Phase 35 Plan 02: Add organization_id to All Per-Organization Tables Summary

**Migration 075 adds nullable organization_id UUID FK to 62 existing tables (plus mandate_id, property_type, and Swiss Grundbuch fields on properties) — all with CONCURRENTLY indexes — making every tenant table structurally ready for RLS without breaking existing data.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-18T00:48:11Z
- **Completed:** 2026-02-18T00:58:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Migration 075 covers 62 tables across 9 sections: property hierarchy, projects/tasks, financial, change orders/inspections, media/audit/communication, knowledge base, notifications/tickets, Global+Org Extension templates, and special-case tables
- properties table uniquely receives 6 additional columns: organization_id, mandate_id, property_type (CHECK rental/stwe/mixed), land_registry_nr, municipality, parcel_nr
- All 67 ADD COLUMN statements use IF NOT EXISTS — migration is idempotent and safe to re-run
- All 64 CREATE INDEX statements use CONCURRENTLY IF NOT EXISTS — no table locks on production
- Zero NOT NULL constraints added — existing rows intact, Phase 36 handles backfill then enforces NOT NULL

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 075_org_id_columns.sql** - `d88672f` (feat)

## Files Created/Modified

- `supabase/migrations/075_org_id_columns.sql` - 308 lines, 62 ALTER TABLE statements, 64 indexes, 67 column additions

## Table Coverage by Section

| Section | Tables | Key Notes |
|---------|--------|-----------|
| 1 - Core hierarchy | properties, buildings, units, rooms | properties gets 6 columns total |
| 2 - Projects/tasks | projects, tasks, task_dependencies, renovation_projects, work_orders, work_order_events | |
| 3 - Financial | partners, offers, invoices, expenses, payments, purchase_orders, deliveries, inventory_movements, purchase_order_allocations, approval_thresholds | |
| 4 - Change/inspections | change_orders, change_order_versions, change_order_photos, change_order_approval_tokens, inspections, inspection_defects, inspection_portal_tokens, inspection_templates | |
| 5 - Media/audit/comms | media, audit_logs, comments, magic_link_tokens, storage_metadata | |
| 6 - Knowledge base | kb_categories, kb_articles, kb_articles_history, kb_workflow_transitions, kb_dashboard_shortcuts, kb_attachments | |
| 7 - Notifications/tickets | notifications, user_notifications, push_subscriptions, notification_preferences, tickets, ticket_messages, ticket_attachments, ticket_work_orders | |
| 8 - Global+Org Extension | templates, template_phases, template_packages, template_tasks, template_dependencies, template_quality_gates, project_phases, project_packages, project_quality_gates | NULL=system, UUID=org-specific |
| 9 - Special cases | components, condition_history, task_photos, task_audio, app_settings, tenant_users | All confirmed via migration audit |

## Decisions Made

- Actual table count was 62 (plan estimated 44+ from D2 list). The D2 list was a representative sample; the full migration audit found additional tables (task_photos, task_audio, components, condition_history, tenant_users, app_settings).
- `tenant_users` added to Section 9: tenant-unit relationships are org-scoped per D2 classification.
- `ticket_categories` intentionally excluded: it is a global lookup table (system-defined, no org isolation), consistent with D2 Global classification.
- `app_settings` included: each organization needs its own `company_name`, `support_email`, and `notfall_phone` for the tenant portal.

## Deviations from Plan

### Auto-fixed Issues

None.

### Scope Additions (within deviation rules)

**1. [Rule 2 - Missing Critical] Added tenant_users to Section 9**
- **Found during:** Task 1 migration audit
- **Issue:** tenant_users table (migration 023) links tenants to units — clearly per-org scope, but not listed in the plan's sections 1-8
- **Fix:** Added to Section 9 with organization_id column and idx_tenant_users_org index
- **Files modified:** supabase/migrations/075_org_id_columns.sql
- **Commit:** d88672f

**2. [Rule 2 - Missing Critical] Confirmed task_photos, task_audio, components, condition_history are separate tables (not superseded by media)**
- **Found during:** Task 1 pre-write audit of migrations 003, 005, 010, 027
- **Issue:** Plan noted these might have been superseded by the media table; they were not
- **Fix:** All four tables confirmed active and included in Section 9
- **Files modified:** supabase/migrations/075_org_id_columns.sql
- **Commit:** d88672f

## Issues Encountered

None.

## User Setup Required

None - migration file only, no external service configuration required.

## Next Phase Readiness

- All 62 per-organization tables now have nullable organization_id UUID FK ready for RLS
- Plan 35-03 (triggers for org_id propagation) can proceed immediately — organization_id columns exist on all parent and child tables
- Plan 35-04 (backfill + NOT NULL) can proceed after 35-03 trigger infrastructure is in place
- Phase 37 RLS policies will use these columns directly for tenant isolation

## Self-Check: PASSED

- supabase/migrations/075_org_id_columns.sql: FOUND
- .planning/phases/35-schema-foundation/35-02-SUMMARY.md: FOUND
- Commit d88672f: FOUND (feat(35-02): add organization_id to all 62 per-organization tables)
- 62 unique ALTER TABLE statements confirmed via node script
- 64 indexes all use CONCURRENTLY confirmed
- 67 ADD COLUMN statements all use IF NOT EXISTS confirmed
- Zero NOT NULL constraints in SQL code confirmed

---
*Phase: 35-schema-foundation*
*Completed: 2026-02-18*
