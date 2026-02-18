#!/usr/bin/env npx tsx
/**
 * One-shot migration: prefix all storage paths with organization ID.
 *
 * Migrates all existing storage files in task-photos, task-audio, media,
 * and inspections buckets from unscoped paths to org-prefixed paths, and
 * updates all DB records that reference those paths.
 *
 * Usage:
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... npx tsx supabase/scripts/migrate_storage_paths.ts
 *   Add --dry-run to preview changes without executing.
 *
 * Idempotent: Files and DB rows already prefixed with ORG_ID are skipped.
 * Run twice safely.
 */

import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const DRY_RUN = process.argv.includes('--dry-run')

const BUCKETS = ['task-photos', 'task-audio', 'media', 'inspections'] as const

// Tables with a direct storage_path column (string)
const TABLES_WITH_STORAGE_PATH = [
  'task_photos',
  'task_audio',
  'media',
  'kb_attachments',
  'ticket_attachments',
  'change_order_photos',
] as const

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.')
  console.error(
    'Usage: SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx supabase/scripts/migrate_storage_paths.ts'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

if (DRY_RUN) {
  console.log('[DRY RUN] No changes will be made — preview mode active.\n')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively list all files in a storage bucket path.
 * Supabase list() returns both files and "directories" (folders without trailing slash).
 * We detect folders by the absence of metadata (folders have metadata: null).
 */
async function listAllFiles(bucket: string, prefix: string = ''): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    offset: 0,
  })

  if (error) {
    console.error(`  [${bucket}] Error listing '${prefix || '/'}': ${error.message}`)
    return []
  }

  if (!data || data.length === 0) return []

  const files: string[] = []

  for (const item of data) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name

    // Supabase returns folders with metadata === null (or undefined)
    // Files have a metadata object with size, mimetype, etc.
    if (item.metadata == null) {
      // This is a folder — recurse
      const nested = await listAllFiles(bucket, itemPath)
      files.push(...nested)
    } else {
      // This is a file
      files.push(itemPath)
    }
  }

  return files
}

// ---------------------------------------------------------------------------
// Step 1: Look up KEWA AG org ID
// ---------------------------------------------------------------------------

async function getOrgId(): Promise<string> {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'kewa-ag')
    .single()

  if (error || !org) {
    throw new Error(
      `Failed to look up kewa-ag organization: ${error?.message ?? 'not found'}`
    )
  }

  return org.id
}

// ---------------------------------------------------------------------------
// Step 2: Migrate storage bucket files
// ---------------------------------------------------------------------------

async function migrateBucket(
  bucket: string,
  orgId: string
): Promise<{ migrated: number; skipped: number; failed: number }> {
  console.log(`\n[${bucket}] Listing files...`)

  const allFiles = await listAllFiles(bucket)

  if (allFiles.length === 0) {
    console.log(`  [${bucket}] No files found.`)
    return { migrated: 0, skipped: 0, failed: 0 }
  }

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const oldPath of allFiles) {
    // Check if already prefixed with ORG_ID
    const firstSegment = oldPath.split('/')[0]
    if (firstSegment === orgId) {
      skipped++
      continue
    }

    const newPath = `${orgId}/${oldPath}`

    if (DRY_RUN) {
      console.log(`  [${bucket}] Would migrate: ${oldPath} -> ${newPath}`)
      migrated++
      continue
    }

    try {
      // Copy to new path
      const { error: copyError } = await supabase.storage.from(bucket).copy(oldPath, newPath)

      if (copyError) {
        console.error(`  [${bucket}] Copy FAILED: ${oldPath} -> ${newPath}: ${copyError.message}`)
        failed++
        continue
      }

      // Remove old path
      const { error: removeError } = await supabase.storage.from(bucket).remove([oldPath])

      if (removeError) {
        // Non-fatal: file is at new path, old path is orphaned
        console.warn(
          `  [${bucket}] Remove WARNED (file at new path, orphan at old): ${oldPath}: ${removeError.message}`
        )
      }

      console.log(`  [${bucket}] Migrated: ${oldPath} -> ${newPath}`)
      migrated++
    } catch (err) {
      console.error(`  [${bucket}] Unexpected error migrating ${oldPath}: ${String(err)}`)
      failed++
    }
  }

  return { migrated, skipped, failed }
}

// ---------------------------------------------------------------------------
// Step 3: Update DB records with storage_path columns
// ---------------------------------------------------------------------------

async function migrateStoragePathColumn(
  table: string,
  orgId: string
): Promise<{ updated: number }> {
  const { data: rows, error } = await supabase
    .from(table)
    .select('id, storage_path')
    .not('storage_path', 'is', null)
    .not('storage_path', 'like', `${orgId}/%`)

  if (error) {
    console.error(`  [DB:${table}] Error fetching rows: ${error.message}`)
    return { updated: 0 }
  }

  if (!rows || rows.length === 0) {
    console.log(`  [DB:${table}] No rows need updating.`)
    return { updated: 0 }
  }

  if (DRY_RUN) {
    console.log(`  [DB:${table}] Would update ${rows.length} rows.`)
    return { updated: rows.length }
  }

  let updated = 0
  for (const row of rows) {
    const newPath = `${orgId}/${row.storage_path}`
    const { error: updateError } = await supabase
      .from(table)
      .update({ storage_path: newPath })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  [DB:${table}] Update FAILED for id=${row.id}: ${updateError.message}`)
    } else {
      updated++
    }
  }

  console.log(`  [DB:${table}] Updated ${updated} rows.`)
  return { updated }
}

// ---------------------------------------------------------------------------
// Step 4: Update inspections.signature_storage_path
// ---------------------------------------------------------------------------

async function migrateInspectionSignatures(orgId: string): Promise<{ updated: number }> {
  const { data: inspections, error } = await supabase
    .from('inspections')
    .select('id, signature_storage_path')
    .not('signature_storage_path', 'is', null)
    .not('signature_storage_path', 'like', `${orgId}/%`)

  if (error) {
    console.error(`  [DB:inspections.signature] Error fetching: ${error.message}`)
    return { updated: 0 }
  }

  if (!inspections || inspections.length === 0) {
    console.log(`  [DB:inspections.signature] No rows need updating.`)
    return { updated: 0 }
  }

  if (DRY_RUN) {
    console.log(
      `  [DB:inspections.signature] Would update ${inspections.length} rows.`
    )
    return { updated: inspections.length }
  }

  let updated = 0
  for (const insp of inspections) {
    const newPath = `${orgId}/${insp.signature_storage_path}`
    const { error: updateError } = await supabase
      .from('inspections')
      .update({ signature_storage_path: newPath })
      .eq('id', insp.id)

    if (updateError) {
      console.error(
        `  [DB:inspections.signature] Update FAILED for id=${insp.id}: ${updateError.message}`
      )
    } else {
      updated++
    }
  }

  console.log(`  [DB:inspections.signature] Updated ${updated} rows.`)
  return { updated }
}

// ---------------------------------------------------------------------------
// Step 5: Update JSONB checklist_items photo_storage_paths in inspections
// ---------------------------------------------------------------------------

async function migrateChecklistItemPhotos(orgId: string): Promise<{ updated: number }> {
  const { data: allInspections, error } = await supabase
    .from('inspections')
    .select('id, checklist_items')
    .not('checklist_items', 'is', null)

  if (error) {
    console.error(`  [DB:inspections.checklist_items] Error fetching: ${error.message}`)
    return { updated: 0 }
  }

  if (!allInspections || allInspections.length === 0) {
    console.log(`  [DB:inspections.checklist_items] No inspections with checklist_items.`)
    return { updated: 0 }
  }

  let updated = 0

  for (const insp of allInspections) {
    const items = insp.checklist_items as unknown[]
    if (!items || items.length === 0) continue

    let modified = false

    for (const section of items) {
      const sectionItems = (section as { items?: unknown[] }).items ?? []
      for (const item of sectionItems) {
        const paths: string[] =
          (item as { photo_storage_paths?: string[] }).photo_storage_paths ?? []
        for (let i = 0; i < paths.length; i++) {
          if (!paths[i].startsWith(`${orgId}/`)) {
            if (DRY_RUN) {
              console.log(
                `  [DB:inspections.checklist_items] Would update path: ${paths[i]} -> ${orgId}/${paths[i]}`
              )
            }
            paths[i] = `${orgId}/${paths[i]}`
            modified = true
          }
        }
      }
    }

    if (modified) {
      if (DRY_RUN) {
        updated++
        continue
      }

      const { error: updateError } = await supabase
        .from('inspections')
        .update({ checklist_items: items })
        .eq('id', insp.id)

      if (updateError) {
        console.error(
          `  [DB:inspections.checklist_items] Update FAILED for id=${insp.id}: ${updateError.message}`
        )
      } else {
        updated++
      }
    }
  }

  if (updated > 0 || DRY_RUN) {
    const verb = DRY_RUN ? 'Would update' : 'Updated'
    console.log(`  [DB:inspections.checklist_items] ${verb} ${updated} inspection rows.`)
  } else {
    console.log(`  [DB:inspections.checklist_items] No paths needed updating.`)
  }

  return { updated }
}

// ---------------------------------------------------------------------------
// Step 6: Update inspection_defects.photo_storage_paths (array column)
// ---------------------------------------------------------------------------

async function migrateDefectPhotos(orgId: string): Promise<{ updated: number }> {
  const { data: defects, error } = await supabase
    .from('inspection_defects')
    .select('id, photo_storage_paths')
    .not('photo_storage_paths', 'eq', '{}')

  if (error) {
    console.error(`  [DB:inspection_defects] Error fetching: ${error.message}`)
    return { updated: 0 }
  }

  if (!defects || defects.length === 0) {
    console.log(`  [DB:inspection_defects] No defects with photos.`)
    return { updated: 0 }
  }

  let updated = 0

  for (const defect of defects) {
    const paths: string[] = defect.photo_storage_paths ?? []
    let modified = false

    const newPaths = paths.map((p: string) => {
      if (!p.startsWith(`${orgId}/`)) {
        if (DRY_RUN) {
          console.log(
            `  [DB:inspection_defects] Would update path: ${p} -> ${orgId}/${p}`
          )
        }
        modified = true
        return `${orgId}/${p}`
      }
      return p
    })

    if (modified) {
      if (DRY_RUN) {
        updated++
        continue
      }

      const { error: updateError } = await supabase
        .from('inspection_defects')
        .update({ photo_storage_paths: newPaths })
        .eq('id', defect.id)

      if (updateError) {
        console.error(
          `  [DB:inspection_defects] Update FAILED for id=${defect.id}: ${updateError.message}`
        )
      } else {
        updated++
      }
    }
  }

  if (updated > 0 || DRY_RUN) {
    const verb = DRY_RUN ? 'Would update' : 'Updated'
    console.log(`  [DB:inspection_defects] ${verb} ${updated} defect rows.`)
  } else {
    console.log(`  [DB:inspection_defects] No defect paths needed updating.`)
  }

  return { updated }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Storage Path Migration ===')
  console.log(`Target: ${SUPABASE_URL}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (executing changes)'}`)
  console.log('')

  // Step 1: Get org ID
  console.log('Looking up KEWA AG organization ID...')
  const orgId = await getOrgId()
  console.log(`  ORG_ID = ${orgId}`)

  // Step 2: Migrate storage bucket files
  console.log('\n--- Storage Bucket File Migration ---')

  const bucketStats: Record<string, { migrated: number; skipped: number; failed: number }> = {}

  for (const bucket of BUCKETS) {
    bucketStats[bucket] = await migrateBucket(bucket, orgId)
  }

  // Step 3: Update DB storage_path columns
  console.log('\n--- Database storage_path Column Migration ---')

  const dbStats: Record<string, { updated: number }> = {}

  for (const table of TABLES_WITH_STORAGE_PATH) {
    dbStats[table] = await migrateStoragePathColumn(table, orgId)
  }

  // Step 4: Update inspections.signature_storage_path
  console.log('\n--- Inspection Signature Path Migration ---')
  const signatureStats = await migrateInspectionSignatures(orgId)

  // Step 5: Update JSONB checklist_items photo paths
  console.log('\n--- Checklist Item Photo Path Migration (JSONB) ---')
  const checklistStats = await migrateChecklistItemPhotos(orgId)

  // Step 6: Update inspection_defects.photo_storage_paths
  console.log('\n--- Inspection Defect Photo Path Migration ---')
  const defectStats = await migrateDefectPhotos(orgId)

  // Summary
  console.log('\n=== Migration Summary ===')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log('')
  console.log('Storage Buckets:')
  let totalFailed = 0
  for (const bucket of BUCKETS) {
    const s = bucketStats[bucket]
    console.log(
      `  ${bucket}: migrated=${s.migrated}, skipped=${s.skipped}, failed=${s.failed}`
    )
    totalFailed += s.failed
  }

  console.log('')
  console.log('Database Tables (storage_path column):')
  for (const table of TABLES_WITH_STORAGE_PATH) {
    const s = dbStats[table]
    console.log(`  ${table}: updated=${s.updated}`)
  }

  console.log('')
  console.log(
    `  inspections.signature_storage_path: updated=${signatureStats.updated}`
  )
  console.log(
    `  inspections.checklist_items (JSONB): updated=${checklistStats.updated} rows`
  )
  console.log(
    `  inspection_defects.photo_storage_paths: updated=${defectStats.updated} rows`
  )

  if (totalFailed > 0) {
    console.log(`\nWARNING: ${totalFailed} file(s) failed to migrate. Review errors above.`)
    process.exit(1)
  } else {
    console.log(`\n${DRY_RUN ? 'Dry run complete.' : 'Migration complete.'}`)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
