---
phase: 40-storage-multi-tenancy
plan: "04"
subsystem: storage
tags:
  - storage
  - multi-tenancy
  - migration
  - supabase
  - typescript
dependency_graph:
  requires:
    - "40-01 (paths.ts + RLS migration)"
    - "40-02 (internal upload routes)"
    - "40-03 (non-standard upload routes)"
  provides:
    - "STOR-03: one-shot idempotent migration script for existing storage files"
  affects:
    - all storage buckets (task-photos, task-audio, media, inspections)
    - task_photos, task_audio, media, kb_attachments, ticket_attachments, change_order_photos tables
    - inspections.signature_storage_path
    - inspections.checklist_items JSONB photo paths
    - inspection_defects.photo_storage_paths array
tech_stack:
  added: []
  patterns:
    - "Idempotency via NOT LIKE '{orgId}/%' check before any mutation"
    - "copy() then remove() for storage file moves (copy is server-side, no data transfer through app)"
    - "--dry-run flag for safe preview of migration scope"
    - "JSONB nested array rewriting with in-memory mutation + full row update"
key_files:
  created:
    - supabase/scripts/migrate_storage_paths.ts
  modified: []
key-decisions:
  - "Script reads org ID from DB (SELECT FROM organizations WHERE slug='kewa-ag') not hardcoded UUID — correct for any environment"
  - "Storage listing uses recursive subdirectory traversal (metadata==null detection for folders) — Supabase list() returns both files and folder entries"
  - "Remove errors are non-fatal: file is at new path even if delete fails — prevents data loss while allowing orphan cleanup on re-run"
  - "JSONB checklist_items: mutate in-memory array, check modified flag, single row UPDATE — avoids unnecessary writes"

requirements-completed:
  - STOR-03

duration: 5min
completed: "2026-02-18"
---

# Phase 40 Plan 04: Storage Path Migration Script Summary

One-shot idempotent TypeScript migration script that copies all existing storage files to org-prefixed paths and updates all DB storage_path references across 6 tables, 2 JSONB structures, and 4 storage buckets.

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T17:15:00Z
- **Completed:** 2026-02-18T17:20:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Migration script created at `supabase/scripts/migrate_storage_paths.ts`
- Covers all 4 storage buckets: task-photos, task-audio, media, inspections
- Updates all 6 tables with storage_path column plus 2 special cases (JSONB + array)
- Dry-run mode (`--dry-run`) allows safe preview before execution
- Idempotent: files and rows already prefixed are skipped on re-run
- Verified: script runs, TypeScript parses cleanly, env var validation works, connects to Supabase

## Task Commits

1. **Task 1: Create storage path migration script** - `5a256a2` (feat)

## Files Created/Modified

- `supabase/scripts/migrate_storage_paths.ts` - One-shot migration script: org-prefix all storage files and DB references

## Decisions Made

- **Org ID from DB, not hardcoded:** Queries `organizations WHERE slug = 'kewa-ag'` so the script works in any environment (local dev, staging, production) without editing.
- **Recursive folder listing:** Supabase `storage.from().list()` returns both files (metadata object present) and folders (metadata null/undefined). Recursive traversal handles arbitrarily deep bucket structures.
- **Remove is non-fatal:** If `remove()` fails after successful `copy()`, the file is at the new path — data is safe. The orphan at the old path can be cleaned on a re-run or ignored.
- **JSONB in-memory mutation:** For `checklist_items`, all paths are updated in-memory with a `modified` flag, then a single row UPDATE is issued only when changes exist — avoids unnecessary writes on rows where all paths are already prefixed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

To run the migration against production:

```bash
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npx tsx supabase/scripts/migrate_storage_paths.ts --dry-run
```

Remove `--dry-run` to execute.

## Next Phase Readiness

- STOR-03 complete. All three Phase 40 STOR requirements satisfied (STOR-01, STOR-02, STOR-03).
- Phase 40 (Storage Multi-Tenancy) is complete: path builder, RLS policies, all upload sites, migration script.
- Migration script ready to run against production once Phase 35-38 DB migrations are applied.

---
*Phase: 40-storage-multi-tenancy*
*Completed: 2026-02-18*
