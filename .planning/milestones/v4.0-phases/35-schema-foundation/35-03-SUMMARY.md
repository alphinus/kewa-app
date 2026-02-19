---
phase: 035-schema-foundation
plan: 03
subsystem: database
tags: [rls, triggers, org-id, multi-tenant, migrations]
dependency_graph:
  requires:
    - 35-01 (organizations, mandates, tenancies tables)
    - 35-02 (organization_id columns on 62 tables via 075_org_id_columns.sql)
  provides:
    - 076_rls_helpers.sql: current_organization_id() and set_org_context() functions
    - 077_org_sync_triggers.sql: 37 BEFORE triggers auto-propagating org_id through hierarchy
  affects:
    - 35-04 (STWE/parking — triggers now auto-populate org_id on insert)
    - Phase 36 (backfill uses these triggers to validate org_id after population)
    - Phase 37 (RLS policies call current_organization_id() from 076)
tech_stack:
  added: []
  patterns:
    - set_config/current_setting transaction-local pattern (PgBouncer-safe)
    - BEFORE trigger NEW.field assignment (no recursive UPDATE)
    - Column-specific UPDATE OF triggers (fire only on FK change)
    - SECURITY DEFINER functions for RLS caller safety
key_files:
  created:
    - supabase/migrations/076_rls_helpers.sql
    - supabase/migrations/077_org_sync_triggers.sql
  modified: []
decisions:
  - "task_dependencies trigger uses task_id (not depends_on_task_id) — task_id is 'the task that has a dependency' per 012_task_enhancements; org follows the dependent task"
  - "expenses trigger covers 4 parent FKs (renovation_project_id, work_order_id, unit_id, room_id) to match the validate_expense_relationship() constraint that requires at least one"
  - "magic_link_tokens trigger fires on work_order_id only (nullable FK); tokens without work_order_id stay NULL org_id until backfill"
  - "ticket_work_orders uses work_order_id as org source (junction table; both fks point to same org)"
  - "purchase_orders excluded from trigger — no hierarchical parent FK; backfill in Phase 36"
  - "project_phases/packages/quality_gates triggers added (in 075 but not in plan) — covered under deviation Rule 2"
metrics:
  duration: 3min
  completed: 2026-02-18
  tasks_completed: 2
  files_created: 2
---

# Phase 35 Plan 03: RLS Helpers and Org-ID Sync Triggers Summary

**One-liner:** SECURITY DEFINER transaction-scoped RLS helper functions plus 37 column-specific BEFORE triggers auto-propagating organization_id through the full property hierarchy.

## What Was Built

**076_rls_helpers.sql** — Two PostgreSQL functions that are the foundation for Phase 37 RLS policies:

- `current_organization_id()`: STABLE SECURITY DEFINER function using `NULLIF(current_setting('app.current_organization_id', true), '')::UUID`. Returns NULL (not error) when no context set — RLS queries return empty set, not 500.
- `set_org_context(UUID)`: SECURITY DEFINER function calling `set_config('app.current_organization_id', org_id::text, true)`. The `true` LOCAL flag makes it transaction-scoped, safe with PgBouncer connection pooling.

**077_org_sync_triggers.sql** — 37 BEFORE INSERT OR UPDATE OF triggers across the full hierarchy:

| Level | Child Table | Parent Source |
|-------|------------|---------------|
| 1 | buildings | properties.property_id |
| 2 | units | buildings.building_id |
| 3 | rooms, renovation_projects, tickets | units.unit_id |
| 3b | components | rooms.room_id |
| 4a | project_phases, project_quality_gates, approval_thresholds | renovation_projects.project_id |
| 4b | project_packages | project_phases.phase_id |
| 5 | tasks, task_photos, task_audio, task_dependencies | tasks.renovation_project_id / task_id |
| 6 | work_orders | tasks.task_id |
| 7 | work_order_events, offers, change_orders, magic_link_tokens, ticket_work_orders | work_orders.work_order_id |
| 7 | invoices | work_order_id (primary) or renovation_project_id (fallback) |
| 7 | expenses | renovation_project_id / work_order_id / unit_id / room_id |
| 7 | payments | invoices.invoice_id |
| 8 | change_order_versions, change_order_photos, change_order_approval_tokens | change_orders.change_order_id |
| 7b | inspections | work_orders.work_order_id or renovation_projects.project_id |
| 8b | inspection_defects, inspection_portal_tokens | inspections.inspection_id |
| 7c | ticket_messages, ticket_attachments | tickets.ticket_id |
| 7d | deliveries, purchase_order_allocations | purchase_orders.purchase_order_id |
| 8c | kb_articles | kb_categories.category_id |
| 9 | kb_articles_history, kb_workflow_transitions, kb_attachments | kb_articles.article_id |

## Deviations from Plan

### Auto-added Missing Tables (Rule 2)

**1. [Rule 2 - Missing Coverage] Added triggers for project_phases, project_packages, project_quality_gates**
- **Found during:** Task 2, reviewing 075_org_id_columns.sql
- **Issue:** Plan listed 25+ tables but 075 added org_id to project_phases/packages/quality_gates which also have clear hierarchical parent FKs
- **Fix:** Added sync_org_id_from_renovation_project() for project_phases and project_quality_gates (project_id FK), sync_org_id_from_project_phase() for project_packages (phase_id FK)
- **Files modified:** 077_org_sync_triggers.sql

**2. [Rule 2 - Missing Coverage] Added triggers for task_photos, task_audio, components**
- **Found during:** Task 2, reviewing 075_org_id_columns.sql sections 9
- **Issue:** 075 added org_id to task_photos, task_audio (task_id FK) and components (room_id FK) — clear parents available
- **Fix:** Added sync_org_id_from_task() for task_photos/task_audio, sync_org_id_from_room() for components
- **Files modified:** 077_org_sync_triggers.sql

### FK Column Corrections (Rule 1)

**3. [Rule 1 - Bug Fix] invoices FK is renovation_project_id, not project_id**
- **Found during:** Task 2, reading 018_invoice.sql
- **Issue:** Plan template used project_id but invoices table uses renovation_project_id FK to renovation_projects
- **Fix:** Trigger uses `renovation_project_id` not `project_id` in both SELECT and UPDATE OF clause
- **Commit:** e33f07f

**4. [Rule 1 - Bug Fix] expenses FK is renovation_project_id, not project_id**
- **Found during:** Task 2, reading 019_expense.sql
- **Issue:** Plan used project_id but expenses uses renovation_project_id. Also discovered expenses can link to unit_id or room_id (matches validate_expense_relationship() constraint)
- **Fix:** Trigger covers all 4 parent FKs with priority order: renovation_project_id > work_order_id > unit_id > room_id

**5. [Rule 1 - Bug Fix] magic_link_tokens trigger removed from alongside change_orders**
- **Found during:** Task 2, reading 024_magic_links.sql
- **Issue:** Plan grouped magic_link_tokens with change_orders (LEVEL 6), but magic_link_tokens has work_order_id FK (not change_order_id). Correctly moved to work_order children (LEVEL 7)
- **Fix:** Uses sync_org_id_from_work_order() on work_order_id column

**6. [Rule 1 - Verification] tasks uses renovation_project_id not project_id**
- **Found during:** Task 2, reviewing tasks table definition
- **Issue:** tasks.renovation_project_id FK (not project_id) — separate function created to avoid confusion with renovation_projects.project_id trigger
- **Fix:** sync_org_id_for_task() function uses renovation_project_id column

## Self-Check

**Files created:**
- [x] supabase/migrations/076_rls_helpers.sql — EXISTS
- [x] supabase/migrations/077_org_sync_triggers.sql — EXISTS

**Commits:**
- [x] 4582cfc — feat(35-03): add 076_rls_helpers.sql
- [x] e33f07f — feat(35-03): add 077_org_sync_triggers.sql

**Verification results:**
- [x] 076: current_organization_id() + set_org_context() present with SECURITY DEFINER, NULLIF, LOCAL flag
- [x] 077: 37 triggers (exceeds 25+ requirement), all BEFORE, no AFTER, no recursive UPDATE, DROP IF EXISTS pattern, core hierarchy triggers present

## Self-Check: PASSED
