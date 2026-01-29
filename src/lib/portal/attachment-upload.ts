/**
 * Ticket Attachment Upload Utilities
 *
 * Validation and upload helpers for tenant portal ticket photo attachments.
 * Follows patterns from contractor-upload.ts.
 *
 * Phase 26: Tenant Portal Core
 */

import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

export type AttachmentSenderType = 'tenant' | 'operator'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface AttachmentUploadResult {
  path: string
  url: string
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Maximum number of photos allowed at ticket creation
 */
export const MAX_TICKET_PHOTOS = 5

/**
 * Maximum file size for photo attachments (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Allowed photo MIME types
 */
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Storage bucket for ticket attachments
 */
export const STORAGE_BUCKET = 'media'

// ============================================
// VALIDATION
// ============================================

/**
 * Validate an attachment file
 *
 * @param file - File to validate
 * @param senderType - Who is uploading (tenant or operator)
 * @returns Validation result with German error message if invalid
 */
export function validateAttachment(
  file: File,
  senderType: AttachmentSenderType
): ValidationResult {
  // Check file exists
  if (!file || file.size === 0) {
    return { valid: false, error: 'Keine Datei ausgewaehlt' }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxMB = MAX_FILE_SIZE / (1024 * 1024)
    return {
      valid: false,
      error: `Datei zu gross (max. ${maxMB}MB)`,
    }
  }

  // Check MIME type
  const mimeType = file.type.toLowerCase()

  // Tenants can only upload photos
  if (senderType === 'tenant') {
    if (!ALLOWED_PHOTO_TYPES.includes(mimeType)) {
      return {
        valid: false,
        error: 'Nur Bilddateien erlaubt (JPEG, PNG, WebP)',
      }
    }
  }

  // Operators can upload photos + PDFs (future: phase 29)
  // For now, restrict to photos only
  if (!mimeType.startsWith('image/')) {
    return {
      valid: false,
      error: 'Nur Bilddateien erlaubt',
    }
  }

  return { valid: true }
}

// ============================================
// UPLOAD
// ============================================

/**
 * Upload a ticket attachment to Supabase Storage
 *
 * Storage path convention:
 * - tickets/{ticket_id}/photos/{uuid}.{ext}
 * - tickets/{ticket_id}/messages/{message_id}/{uuid}.{ext}
 *
 * @param file - File to upload
 * @param ticketId - Ticket UUID
 * @param messageId - Optional message UUID (for message attachments)
 * @returns Storage path and public URL
 */
export async function uploadTicketAttachment(
  file: File,
  ticketId: string,
  messageId?: string
): Promise<AttachmentUploadResult> {
  const supabase = createClient()

  // Generate unique filename
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${crypto.randomUUID()}.${fileExt}`

  // Storage path
  const path = messageId
    ? `tickets/${ticketId}/messages/${messageId}/${fileName}`
    : `tickets/${ticketId}/photos/${fileName}`

  // Upload to storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path)

  return {
    path,
    url: urlData.publicUrl,
  }
}

/**
 * Get public URL for an attachment storage path
 *
 * @param storagePath - Storage path from ticket_attachments table
 * @returns Public URL
 */
export function getAttachmentUrl(storagePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}
