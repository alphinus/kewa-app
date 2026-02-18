/**
 * Centralised storage path builder for all upload sites.
 *
 * All paths are org-prefixed: orgId is always the first path segment.
 * This is enforced at the database level by Storage RLS policies
 * (migration 084_storage_rls.sql) using:
 *   (storage.foldername(name))[1] = current_organization_id()::text
 *
 * Import BUCKETS and the typed path builders at every upload site.
 * Never hand-roll paths inline — use these helpers.
 */

export const BUCKETS = {
  media: 'media',
  taskPhotos: 'task-photos',
  taskAudio: 'task-audio',
  inspections: 'inspections',
} as const

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

/**
 * Generate an org-prefixed storage path.
 * First segment is always orgId — required by Storage RLS.
 *
 * @param orgId - The organisation UUID (first path segment, enforced by RLS)
 * @param segments - Remaining path segments joined with '/'
 * @returns Full storage path string
 */
export function buildStoragePath(orgId: string, ...segments: string[]): string {
  return [orgId, ...segments].join('/')
}

// ---------------------------------------------------------------------------
// task-photos bucket
// ---------------------------------------------------------------------------

/**
 * Path for a task photo.
 * Pattern: {orgId}/{taskId}/{photoType}/{uuid}.{ext}
 * Example: 00000001-0001.../tasks/abc.../explanation/550e8400....webp
 */
export function taskPhotoPath(
  orgId: string,
  taskId: string,
  photoType: string,
  uuid: string,
  ext: string
): string {
  return buildStoragePath(orgId, taskId, photoType, `${uuid}.${ext}`)
}

// ---------------------------------------------------------------------------
// task-audio bucket
// ---------------------------------------------------------------------------

/**
 * Path for a task audio recording.
 * Pattern: {orgId}/{taskId}/{audioType}/{uuid}.{ext}
 */
export function taskAudioPath(
  orgId: string,
  taskId: string,
  audioType: string,
  uuid: string,
  ext: string
): string {
  return buildStoragePath(orgId, taskId, audioType, `${uuid}.${ext}`)
}

// ---------------------------------------------------------------------------
// media bucket — work orders
// ---------------------------------------------------------------------------

/**
 * Path for a work order document (PDF, etc.).
 * Pattern: {orgId}/work_orders/{workOrderId}/documents/{uuid}.{ext}
 */
export function workOrderDocumentPath(
  orgId: string,
  workOrderId: string,
  uuid: string,
  ext: string
): string {
  return buildStoragePath(orgId, 'work_orders', workOrderId, 'documents', `${uuid}.${ext}`)
}

/**
 * Path for a work order photo.
 * Pattern: {orgId}/work_orders/{workOrderId}/photos/{context}/{uuid}.{ext}
 */
export function workOrderPhotoPath(
  orgId: string,
  workOrderId: string,
  context: string,
  uuid: string,
  ext: string
): string {
  return buildStoragePath(orgId, 'work_orders', workOrderId, 'photos', context, `${uuid}.${ext}`)
}

// ---------------------------------------------------------------------------
// media bucket — change orders
// ---------------------------------------------------------------------------

/**
 * Path for a change order photo.
 * Pattern: {orgId}/change_orders/{coId}/photos/{timestamp}-{filename}
 */
export function changeOrderPhotoPath(
  orgId: string,
  coId: string,
  timestamp: number,
  filename: string
): string {
  return buildStoragePath(orgId, 'change_orders', coId, 'photos', `${timestamp}-${filename}`)
}

// ---------------------------------------------------------------------------
// media bucket — knowledge base
// ---------------------------------------------------------------------------

/**
 * Path for a knowledge base article attachment.
 * Pattern: {orgId}/kb_articles/{articleId}/attachments/{uuid}.{ext}
 */
export function kbAttachmentPath(
  orgId: string,
  articleId: string,
  uuid: string,
  ext: string
): string {
  return buildStoragePath(orgId, 'kb_articles', articleId, 'attachments', `${uuid}.${ext}`)
}

// ---------------------------------------------------------------------------
// media bucket — tickets
// ---------------------------------------------------------------------------

/**
 * Path for a ticket photo.
 * Pattern: {orgId}/tickets/{ticketId}/photos/{uuid}.{ext}
 */
export function ticketPhotoPath(
  orgId: string,
  ticketId: string,
  uuid: string,
  ext: string
): string {
  return buildStoragePath(orgId, 'tickets', ticketId, 'photos', `${uuid}.${ext}`)
}

/**
 * Path for a ticket message attachment.
 * Pattern: {orgId}/tickets/{ticketId}/messages/{messageId}/{uuid}.{ext}
 */
export function ticketMessageAttachmentPath(
  orgId: string,
  ticketId: string,
  messageId: string,
  uuid: string,
  ext: string
): string {
  return buildStoragePath(orgId, 'tickets', ticketId, 'messages', messageId, `${uuid}.${ext}`)
}

// ---------------------------------------------------------------------------
// inspections bucket
// ---------------------------------------------------------------------------

/**
 * Path for an inspection checklist item photo.
 * Pattern: {orgId}/{inspectionId}/items/{uuid}.webp
 */
export function inspectionItemPhotoPath(
  orgId: string,
  inspectionId: string,
  uuid: string
): string {
  return buildStoragePath(orgId, inspectionId, 'items', `${uuid}.webp`)
}

/**
 * Path for an inspection defect photo.
 * Pattern: {orgId}/{inspectionId}/defects/{uuid}.webp
 */
export function inspectionDefectPhotoPath(
  orgId: string,
  inspectionId: string,
  uuid: string
): string {
  return buildStoragePath(orgId, inspectionId, 'defects', `${uuid}.webp`)
}

/**
 * Path for an inspection signature image.
 * Pattern: {orgId}/inspections/{inspectionId}/signature.png
 *
 * Note: 'inspections' literal sub-folder distinguishes signature from item/defect photos
 * which use inspectionId as direct sub-folder.
 */
export function inspectionSignaturePath(orgId: string, inspectionId: string): string {
  return buildStoragePath(orgId, 'inspections', inspectionId, 'signature.png')
}
