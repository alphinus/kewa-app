# Phase 40: Storage Multi-Tenancy - Research

**Researched:** 2026-02-18
**Domain:** Supabase Storage RLS, path-based multi-tenant isolation, storage file migration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STOR-01 | Update upload logic to prefix paths with `{org_id}/{property_id}/{building_id}/{entity_type}/{filename}` | Upload helper pattern documented; 8 upload sites identified; centralised helper approach recommended |
| STOR-02 | Storage RLS policies on `storage.objects` for INSERT/SELECT/DELETE validating first path segment = `current_organization_id()` | `storage.foldername(name)[1]` pattern verified from Supabase docs; exact SQL template provided |
| STOR-03 | Migrate existing files to org-prefixed paths; update `media` table references | Supabase Storage `copy()` API documented; migration SQL+TS strategy defined |

</phase_requirements>

---

## Summary

Supabase Storage operates on a separate RLS surface (`storage.objects`) from the database. Phase 37's `current_organization_id()` function is callable from Storage RLS policies, making the isolation mechanism consistent with the rest of the stack. The primary challenge is the path convention change: all existing files live under org-free paths (e.g., `tasks/{id}/photos/...`), while the new convention requires an org prefix as the first path segment.

Three buckets hold tenant files: `media` (change order photos, KB attachments, contractor uploads, ticket attachments), `task-photos` (task explanation/completion photos), and `inspections` (inspection photos, defect photos, signatures). The `task-audio` bucket also holds tenant audio. All four buckets need new Storage RLS policies. All eight upload call sites need path generation updated. The `media` table's `storage_path` column stores the path-only string used with `createSignedUrl`/`download`; those stored values must be updated in STOR-03 to match migrated file locations.

The existing data for KEWA AG is the only data requiring migration (single org today). The migration is a `copy()` → update DB record → delete old path sequence for each file, performable inside a migration SQL function or a one-shot Node script called from migration.

**Primary recommendation:** Add org prefix to all upload paths via a centralised `buildStoragePath(orgId, ...)` helper, apply `storage.foldername(name)[1] = current_organization_id()::text` Storage RLS policies across all four buckets, then migrate existing files with a service-role script.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | already installed | Storage API (upload, copy, remove, createSignedUrl) | Already in project; Storage SDK wraps REST |
| Supabase Storage RLS | platform | `storage.objects` row policies, `storage.foldername()` helper | Only mechanism to enforce path-level isolation in Supabase |
| `current_organization_id()` | Phase 37 | Returns org UUID from transaction config, callable in Storage policies | Already deployed in 076_rls_helpers.sql |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `createServiceClient()` | Phase 37 | Migration script — bypasses RLS to copy and delete files across paths | STOR-03 migration only; do not use for normal uploads |
| `supabase.storage.copy()` | SDK | Copies a file within a bucket without re-uploading bytes | File migration in STOR-03 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `storage.foldername(name)[1]` | `split_part(name, '/', 1)` | Both work; `storage.foldername` is the documented Supabase helper — prefer it |
| Service-role migration script | Manual Supabase dashboard move | Dashboard is impractical for >10 files; script is automatable and repeatable |

**Installation:** No new packages required.

---

## Architecture Patterns

### Current Storage Buckets (all private, no public access)

| Bucket | Current Path Convention | Upload Sites |
|--------|------------------------|--------------|
| `media` | `work_orders/{id}/...`, `change_orders/{id}/...`, `kb_articles/{id}/...`, `tickets/{id}/...` | contractor upload, change-order photos, KB attachments, ticket attachments, ticket-to-work-order copy |
| `task-photos` | `{task_id}/{photo_type}/{uuid}.{ext}` | `POST /api/photos` |
| `task-audio` | `{task_id}/{audio_type}/{uuid}.{ext}` | `POST /api/audio` |
| `inspections` | `{inspection_id}/items/...`, `{inspection_id}/defects/...`, `{inspection_id}/signature.png` | inspection photos, defect photos, signature upload |

### New Path Convention (STOR-01)

```
{org_id}/{property_id}/{building_id}/{entity_type}/{filename}
```

Interpreted pragmatically for this codebase — `property_id` and `building_id` are contextual and may not be known at every upload site. The required minimum is the `org_id` prefix as the first segment (this is what Storage RLS enforces). The remaining segments follow existing conventions with the org prefix prepended:

```
media bucket:
  {org_id}/work_orders/{work_order_id}/documents/{uuid}.pdf
  {org_id}/work_orders/{work_order_id}/photos/{context}/{uuid}.webp
  {org_id}/change_orders/{co_id}/photos/{timestamp}-{filename}
  {org_id}/kb_articles/{article_id}/attachments/{uuid}.{ext}
  {org_id}/tickets/{ticket_id}/photos/{uuid}.{ext}
  {org_id}/tickets/{ticket_id}/messages/{msg_id}/{uuid}.{ext}

task-photos bucket:
  {org_id}/{task_id}/{photo_type}/{uuid}.{ext}

task-audio bucket:
  {org_id}/{task_id}/{audio_type}/{uuid}.{ext}

inspections bucket:
  {org_id}/{inspection_id}/items/{uuid}.webp
  {org_id}/{inspection_id}/defects/{uuid}.webp
  {org_id}/{inspection_id}/signature.png
```

### Pattern 1: Storage RLS Policy (STOR-02)

**What:** Storage operates on `storage.objects` table with its own RLS surface, separate from database tables.
**When to use:** All four buckets need four policies each (SELECT, INSERT, UPDATE, DELETE).

```sql
-- Source: https://supabase.com/docs/guides/storage/schema/helper-functions
-- Pattern: (storage.foldername(name))[1] returns first path segment as text

-- SELECT policy (read access)
CREATE POLICY "media_org_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

-- INSERT policy (upload access)
CREATE POLICY "media_org_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

-- UPDATE policy
CREATE POLICY "media_org_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

-- DELETE policy
CREATE POLICY "media_org_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);
```

Repeat for `task-photos`, `task-audio`, `inspections` buckets (change `bucket_id` value only).

**Critical:** The existing policies from 041_storage_buckets.sql (task-photos, task-audio) and 059_inspections.sql (inspections) grant ALL authenticated users access without org check. These must be DROPped before the new policies are created.

### Pattern 2: Centralised Path Builder (STOR-01)

Create `src/lib/storage/paths.ts` as the single source of truth for path generation. All upload sites import from here.

```typescript
// src/lib/storage/paths.ts
export const BUCKETS = {
  media: 'media',
  taskPhotos: 'task-photos',
  taskAudio: 'task-audio',
  inspections: 'inspections',
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

/**
 * Generate an org-prefixed storage path.
 * First segment is always orgId — enforced by Storage RLS.
 */
export function buildStoragePath(
  orgId: string,
  ...segments: string[]
): string {
  return [orgId, ...segments].join('/')
}

// Typed path builders per entity type:

export function taskPhotoPath(orgId: string, taskId: string, photoType: string, uuid: string, ext: string) {
  return buildStoragePath(orgId, taskId, photoType, `${uuid}.${ext}`)
}

export function taskAudioPath(orgId: string, taskId: string, audioType: string, uuid: string, ext: string) {
  return buildStoragePath(orgId, taskId, audioType, `${uuid}.${ext}`)
}

export function workOrderDocumentPath(orgId: string, workOrderId: string, uuid: string, ext: string) {
  return buildStoragePath(orgId, 'work_orders', workOrderId, 'documents', `${uuid}.${ext}`)
}

export function workOrderPhotoPath(orgId: string, workOrderId: string, context: string, uuid: string, ext: string) {
  return buildStoragePath(orgId, 'work_orders', workOrderId, 'photos', context, `${uuid}.${ext}`)
}

export function changeOrderPhotoPath(orgId: string, coId: string, timestamp: number, filename: string) {
  return buildStoragePath(orgId, 'change_orders', coId, 'photos', `${timestamp}-${filename}`)
}

export function kbAttachmentPath(orgId: string, articleId: string, uuid: string, ext: string) {
  return buildStoragePath(orgId, 'kb_articles', articleId, 'attachments', `${uuid}.${ext}`)
}

export function ticketPhotoPath(orgId: string, ticketId: string, uuid: string, ext: string) {
  return buildStoragePath(orgId, 'tickets', ticketId, 'photos', `${uuid}.${ext}`)
}

export function ticketMessageAttachmentPath(orgId: string, ticketId: string, messageId: string, uuid: string, ext: string) {
  return buildStoragePath(orgId, 'tickets', ticketId, 'messages', messageId, `${uuid}.${ext}`)
}

export function inspectionItemPhotoPath(orgId: string, inspectionId: string, uuid: string) {
  return buildStoragePath(orgId, inspectionId, 'items', `${uuid}.webp`)
}

export function inspectionDefectPhotoPath(orgId: string, inspectionId: string, uuid: string) {
  return buildStoragePath(orgId, inspectionId, 'defects', `${uuid}.webp`)
}

export function inspectionSignaturePath(orgId: string, inspectionId: string) {
  return buildStoragePath(orgId, inspectionId, 'signature.png')
}
```

### Pattern 3: How to get orgId in each upload site

The org ID is available via `x-organization-id` header at API routes (set by middleware). At upload call sites:

```typescript
// API route pattern — read from header set by middleware
const orgId = request.headers.get('x-organization-id')
if (!orgId) {
  return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
}
```

For contractor portal routes that use `createServiceClient()` (no org header), the org ID must be looked up from the work order's organization_id:

```typescript
// Contractor upload — look up from work order
const { data: workOrder } = await supabase
  .from('work_orders')
  .select('id, status, organization_id, partner:partners!inner(email)')
  .eq('id', workOrderId)
  .single()
const orgId = workOrder.organization_id
```

For portal routes (tenant attachments), org ID is on the ticket:

```typescript
const { data: ticket } = await supabase.from('tickets').select('organization_id').eq('id', ticketId).single()
const orgId = ticket.organization_id
```

For `signature-utils.ts` which uses `createPublicClient()`, the org context must be passed in as a parameter.

### Pattern 4: STOR-03 File Migration

Use a SQL migration with a PL/pgSQL function that:
1. Uses service_role context to enumerate all objects per bucket
2. For each object without an org prefix, copies to new path and deletes original
3. Updates the DB record (`storage_path` column) in the relevant table

Because Supabase `storage.objects` is queryable from SQL, migration can be done entirely in SQL with a `PERFORM supabase_storage_object_copy()` function — but Supabase does not expose a built-in SQL copy function. The standard approach is a TypeScript script that runs via `supabase db execute` or is called as a one-shot at migration time.

```typescript
// Migration script pattern (runs once, idempotent on re-run)
// File: supabase/scripts/084_migrate_storage_paths.ts

const supabase = createServiceClient() // service_role key

const KEWA_ORG_ID = '00000000-0000-0000-0010-000000000001'

// Per bucket:
// 1. List files in bucket root (old paths don't start with org UUID)
// 2. For each file not already prefixed with KEWA_ORG_ID:
//    a. copy(oldPath, newPath)
//    b. update DB record (storage_path = newPath)
//    c. remove(oldPath)
```

**DB tables with `storage_path` columns:**
- `task_photos.storage_path` — migrated via update query
- `task_audio.storage_path` — migrated via update query
- `media.storage_path` — migrated via update query
- `inspections.signature_storage_path` — migrated via update query
- `inspections.checklist_items` (JSONB) — `photo_storage_paths` array inside checklist item objects
- `inspection_defects` (if stored separately — check schema)
- `kb_attachments.storage_path` — migrated via update query
- `ticket_attachments.storage_path` — migrated via update query
- `change_order_photos.storage_path` — migrated via update query

**Critical JSONB case:** `inspections.checklist_items` stores photo paths inside a JSONB array. These cannot be updated with a simple column rename. Requires iterating each row and rewriting the JSONB.

### Anti-Patterns to Avoid

- **Storage RLS without database RLS:** Media table has database RLS from Phase 37, but storage.objects is separate and previously had no org-scoped policies. Both layers must be active.
- **Hard-coding org UUID in migration:** The migration must be written to work for any org, not assume KEWA_ORG_ID. Use a lookup: `SELECT organization_id FROM organizations WHERE slug = 'kewa-ag'`.
- **Using anon key for migration:** The storage move operation needs service_role key to access all paths regardless of org.
- **Forgetting `current_organization_id()` is callable in Storage policies:** It reads from the Postgres transaction config set by `set_org_context()`. The anon/authenticated request still gets the config set by the API route before making any storage call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path-level access enforcement | Custom path validation in every API route | `storage.foldername(name)[1]` in Storage RLS | Storage RLS enforces at the platform level; route-level checks can be bypassed |
| File copying during migration | Re-download + re-upload | `supabase.storage.from(bucket).copy(src, dst)` | copy() is server-side, no data transfer through app layer |
| Discovering existing file paths | Custom storage crawler | `supabase.storage.from(bucket).list(path, { limit: 1000 })` | SDK list() returns paginated file inventory |

---

## Common Pitfalls

### Pitfall 1: Storage RLS Is Separate from Database RLS
**What goes wrong:** Phase 37 added database RLS to `media`, `task_photos`, etc. This does NOT protect `storage.objects`. A user with a valid session can still read any path in the bucket via a direct API call or `createSignedUrl` if no Storage policy exists.
**Why it happens:** Supabase Storage is a separate service backed by its own `storage.objects` table. Database policies on `media` protect which rows you can see; Storage policies protect which bytes you can access.
**How to avoid:** Create explicit Storage RLS policies on `storage.objects` per bucket. Never assume database RLS covers storage.
**Warning signs:** You can call `supabase.storage.from('media').createSignedUrl('other-org/file.pdf', 3600)` and get a working URL from a different org's context.

### Pitfall 2: Existing Storage Policies Are Org-Unaware
**What goes wrong:** `041_storage_buckets.sql` has `"Authenticated users can read photos"` and similar — these policies grant ALL authenticated users access to ALL task-photos and task-audio without any org check.
**Why it happens:** These policies predate multi-tenancy.
**How to avoid:** STOR-02 migration must DROP the old policies before creating new ones. Failing to drop leaves both policies active; since the old one is permissive ALLOW, the new restrictive policy is overridden.
**Warning signs:** Users from Org B can see Org A's photos after migration.

### Pitfall 3: current_organization_id() Returns NULL in Storage Policy Context
**What goes wrong:** Storage RLS policy references `current_organization_id()`. If the API route doesn't call `set_org_context()` before making a storage operation, the function returns NULL, and the policy `(storage.foldername(name))[1] = NULL::text` evaluates to FALSE — denying all access.
**Why it happens:** Storage operations go through the Supabase Storage service, but they run in a Postgres session where `app.current_organization_id` must have been set. The session is shared within a transaction.
**How to avoid:** Every upload/read site must use `createOrgClient()` (which calls `set_org_context`) before calling storage operations. Contractor routes and portal routes that use `createServiceClient()` are exempt from Storage RLS (service_role bypasses all policies).
**Warning signs:** Storage operations returning "policy violation" errors after deploying new policies.

### Pitfall 4: JSONB Paths in checklist_items Not Updated
**What goes wrong:** After file migration, inspection photos appear broken because `checklist_items[*].photo_storage_paths` still reference old paths.
**Why it happens:** `storage_path` in the `inspections` table stores the signature path, but checklist item photo paths are embedded in a JSONB column.
**How to avoid:** The STOR-03 migration script must explicitly handle JSONB path rewriting. Iterate all inspections rows, extract `checklist_items`, find `photo_storage_paths` arrays, update each path string, write back.
**Warning signs:** Inspection checklist photos return 403/404 after migration while signatures load correctly.

### Pitfall 5: Storage copy() Does Not Move — Must Delete Old File
**What goes wrong:** Calling `storage.copy(src, dst)` leaves the original file in place. Old paths remain accessible (or if the old policies are dropped, become orphaned).
**Why it happens:** `copy()` creates a duplicate; it is not atomic move.
**How to avoid:** After `copy()` succeeds, call `remove([oldPath])`. Track in a migration log (update a DB column like `migrated_at` on the row) so failed migrations can be resumed without double-copying.
**Warning signs:** Storage usage doubles after migration if delete step is skipped.

### Pitfall 6: Contractor Portal Does Not Have Org Context Header
**What goes wrong:** `POST /api/contractor/[token]/[workOrderId]/upload` uses `createServiceClient()` (service_role) and has no `x-organization-id` header. After deploying new Storage RLS, the upload path must include the org prefix — but where does the contractor route get the org ID?
**Why it happens:** Contractor routes authenticate by magic-link token, not by session. Middleware doesn't inject `x-organization-id` for `/contractor/*` routes.
**How to avoid:** Look up `organization_id` from the `work_orders` table (already joined in that route) and use it to build the storage path. Since service_role bypasses Storage RLS, contractor uploads work regardless of org-prefix correctness — but the path must still be org-prefixed for consistency and so future SELECT policies work when the media record is read back by an authenticated internal user.
**Warning signs:** Contractor-uploaded files not visible in the dashboard media viewer after STOR-02 goes live.

---

## Code Examples

### Storage RLS Policy SQL (verified from official Supabase docs)

```sql
-- Source: https://supabase.com/docs/guides/storage/schema/helper-functions
-- storage.foldername(name) returns text[] of path segments
-- [1] is the first (org_id) segment

-- Drop old unscoped policy first:
DROP POLICY IF EXISTS "Authenticated users can read photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

-- New org-scoped policies for task-photos bucket:
CREATE POLICY "task_photos_org_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-photos'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "task_photos_org_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-photos'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);

CREATE POLICY "task_photos_org_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-photos'
  AND (storage.foldername(name))[1] = current_organization_id()::text
);
```

### Storage copy() + remove() migration pattern

```typescript
// Source: Supabase JS SDK, verified from project usage in ticket-to-work-order.ts

const supabase = createServiceClient()

async function migrateFile(
  bucket: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  // Copy to new location
  const { error: copyError } = await supabase.storage
    .from(bucket)
    .copy(oldPath, newPath)

  if (copyError) throw new Error(`Copy failed: ${copyError.message}`)

  // Delete old location
  const { error: deleteError } = await supabase.storage
    .from(bucket)
    .remove([oldPath])

  if (deleteError) {
    console.error(`Delete failed for ${oldPath}: ${deleteError.message}`)
    // Non-fatal: file is at new path, old path is orphaned
  }
}
```

### Reading orgId from request header (API route pattern)

```typescript
// Pattern used across all internal routes after Phase 37
const orgId = request.headers.get('x-organization-id')
if (!orgId) {
  return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
}
```

---

## Scope of Upload Sites to Change (STOR-01)

All 8 upload call sites need updated path generation:

| File | Bucket | Current Path Pattern | Change Required |
|------|--------|---------------------|-----------------|
| `src/app/api/photos/route.ts` | task-photos | `{taskId}/{photoType}/{uuid}.{ext}` | Prepend `orgId/` |
| `src/app/api/audio/route.ts` | task-audio | `{taskId}/{audioType}/{uuid}.{ext}` | Prepend `orgId/` |
| `src/app/api/change-orders/[id]/photos/route.ts` | media | `change_orders/{id}/photos/{ts}-{name}` | Prepend `orgId/` |
| `src/app/api/knowledge/[id]/attachments/route.ts` | media | `kb_articles/{id}/attachments/{uuid}.{ext}` | Prepend `orgId/` |
| `src/app/api/inspections/[id]/photos/route.ts` | inspections | `{id}/items/{uuid}.webp` | Prepend `orgId/` |
| `src/app/api/inspections/[id]/defects/[defectId]/photos/route.ts` | inspections | `{id}/defects/{uuid}.webp` | Prepend `orgId/` |
| `src/lib/inspections/signature-utils.ts` | inspections | `inspections/{id}/signature.png` | Prepend `orgId/`; add orgId param |
| `src/app/api/contractor/[token]/[workOrderId]/upload/route.ts` | media | `work_orders/{id}/documents/...` or `.../photos/...` | Prepend `orgId/` from `workOrder.organization_id` |
| `src/lib/portal/attachment-upload.ts` | media | `tickets/{id}/photos/{uuid}.{ext}` | Prepend `orgId/` from ticket |
| `src/lib/storage/contractor-upload.ts::generateStoragePath` | media | `work_orders/{id}/...` | Update function signature to accept orgId |
| `src/app/api/portal/tickets/[id]/attachments/route.ts` | media | (delegates to attachment-upload.ts) | Update call |
| `src/lib/admin/ticket-to-work-order.ts` | media | `work_orders/{id}/...` copy | Prepend `orgId/` on destPath |

**Note:** `src/lib/sync/photo-uploader.ts` calls `/api/media/upload` which does not exist yet — this is an offline queue client. It is not an upload site itself; it posts to a route that would need to handle the path. Low risk for this phase.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-bucket authenticated user RLS (grants all) | Per-bucket org-scoped RLS using `storage.foldername(name)[1]` | Phase 40 | Cross-org file access blocked at platform level |
| Unscoped storage paths (`{entity_id}/...`) | Org-prefixed paths (`{org_id}/{entity_id}/...`) | Phase 40 | Storage files partitioned by org without separate buckets per org |
| `storage_metadata` table with no org scope | `storage_metadata.organization_id NOT NULL` with RLS | Phase 35/37 | Already done — metadata table isolated |

**Note:** Supabase does support per-bucket RLS on `storage.objects`. The `storage.foldername()` and `storage.filename()` helper functions are stable Supabase-provided SQL helpers. `current_organization_id()` calling `current_setting()` is Postgres-standard and works inside Storage policy evaluation.

---

## Open Questions

1. **Does `current_organization_id()` evaluate correctly inside Storage policy context?**
   - What we know: It reads `current_setting('app.current_organization_id', true)`, set per-transaction via `set_config`. Storage operations go through PostgREST-like session sharing.
   - What's unclear: Whether the Supabase Storage service shares the same Postgres session/transaction as the API query that set the config, or opens a new session.
   - Recommendation: Verify in STOR-02 implementation with a test call — if it doesn't share session, alternative is to use `auth.uid()` mapped to org (more complex) or gate at application layer only. HIGH CONFIDENCE it works given this is the documented pattern for user-specific folder isolation.

2. **JSONB checklist_items path rewriting complexity**
   - What we know: `inspections.checklist_items` is a JSONB array containing nested `photo_storage_paths` string arrays.
   - What's unclear: How many inspections exist with photo paths (could be zero in current data).
   - Recommendation: STOR-03 plan must include explicit JSONB migration step; verify count of inspections with non-empty photo paths before writing migration.

3. **Portal and contractor Storage RLS policy requirement**
   - What we know: Contractor routes use `createServiceClient()` (service_role — bypasses RLS). Portal routes use `createServiceClient()` for storage operations.
   - What's unclear: Should portal/contractor uploads go through the same org-prefixed path structure even though Storage RLS doesn't enforce it for them?
   - Recommendation: Yes — consistent path structure is required for STOR-03 migration correctness and for when internal users read those files back through org-scoped clients.

---

## Sources

### Primary (HIGH confidence)
- Supabase Storage Access Control docs — `storage.foldername()` helper function pattern, INSERT/SELECT/DELETE policy structure
  - https://supabase.com/docs/guides/storage/security/access-control
  - https://supabase.com/docs/guides/storage/schema/helper-functions
- `C:/Dev/KeWa-App/supabase/migrations/076_rls_helpers.sql` — `current_organization_id()` implementation
- `C:/Dev/KeWa-App/supabase/migrations/083_rls_policies.sql` — established RESTRICTIVE policy pattern
- `C:/Dev/KeWa-App/supabase/migrations/041_storage_buckets.sql` — current storage policies (to be replaced)
- `C:/Dev/KeWa-App/supabase/migrations/031_storage_buckets.sql` — storage_metadata table structure

### Secondary (MEDIUM confidence)
- Codebase grep of `storage.from(` — confirmed 8 upload sites across 4 buckets
- `.planning/research/PITFALLS.md` line 314 — "Storage RLS Policies: Database RLS ≠ Storage RLS" pitfall documented

### Tertiary (LOW confidence — flag for validation)
- Whether `current_organization_id()` evaluates correctly inside Supabase Storage RLS session context (requires live test in STOR-02)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; Supabase SDK already in project
- Architecture (path convention, upload sites): HIGH — comprehensive codebase search completed
- Storage RLS SQL pattern: HIGH — verified from official Supabase docs
- Migration strategy: MEDIUM — copy+delete pattern is correct; JSONB complexity is known risk
- `current_organization_id()` in Storage context: MEDIUM — plausible but needs live validation

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (Supabase Storage API is stable; helper functions are long-standing)
