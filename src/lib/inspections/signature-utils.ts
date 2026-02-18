/**
 * Signature Storage Utilities
 *
 * Helpers for storing and retrieving inspection signatures from Supabase storage.
 * Phase: 22-inspection-core Plan 03
 */

import { createPublicClient } from '@/lib/supabase/with-org'

/**
 * Upload signature image to inspections storage bucket
 *
 * Converts base64 data URL to Buffer and uploads to inspections/{inspectionId}/signature.png
 *
 * @param inspectionId Inspection ID for path organization
 * @param dataUrl Base64 PNG data URL (e.g., "data:image/png;base64,iVBORw...")
 * @returns Storage path (e.g., "inspections/abc123/signature.png")
 */
export async function uploadSignature(
  inspectionId: string,
  dataUrl: string
): Promise<string> {
  const supabase = await createPublicClient()

  // Extract base64 data from data URL
  const matches = dataUrl.match(/^data:image\/png;base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid data URL format. Expected data:image/png;base64,...')
  }

  const base64Data = matches[1]
  const buffer = Buffer.from(base64Data, 'base64')

  // Upload to storage
  const storagePath = `inspections/${inspectionId}/signature.png`
  const { error } = await supabase
    .storage
    .from('inspections')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true, // Allow replacing existing signature
    })

  if (error) {
    throw new Error(`Failed to upload signature: ${error.message}`)
  }

  return storagePath
}

/**
 * Get signed URL for signature image
 *
 * Returns a temporary signed URL valid for 1 hour.
 *
 * @param storagePath Storage path (e.g., "inspections/abc123/signature.png")
 * @returns Signed URL valid for 1 hour
 */
export async function getSignatureUrl(storagePath: string): Promise<string> {
  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .storage
    .from('inspections')
    .createSignedUrl(storagePath, 3600) // 1 hour expiry

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  if (!data?.signedUrl) {
    throw new Error('No signed URL returned from storage')
  }

  return data.signedUrl
}
