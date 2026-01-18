/**
 * Contractor Upload Utilities
 *
 * Validation and path generation for contractor file uploads.
 * Implements EXT-11 (document upload) and EXT-12 (photo upload).
 *
 * Storage path conventions from 031_storage_buckets.sql:
 * - work_orders/{work_order_id}/documents/{uuid}.pdf
 * - work_orders/{work_order_id}/photos/{context}/{uuid}.webp
 */

// ============================================
// TYPES
// ============================================

export type UploadMediaType = 'photo' | 'document'
export type UploadContext = 'offer' | 'invoice' | 'completion' | 'before' | 'after' | 'during' | 'other'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface StoragePath {
  bucket: string
  path: string
  filename: string
}

// ============================================
// CONFIGURATION
// ============================================

// File size limits in bytes
export const FILE_SIZE_LIMITS = {
  photo: 10 * 1024 * 1024,    // 10MB for photos
  document: 20 * 1024 * 1024, // 20MB for documents
} as const

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  photo: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  document: [
    'application/pdf',
  ],
} as const

// File extension mapping
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
}

// Storage bucket name (unified media bucket)
export const STORAGE_BUCKET = 'media'

// ============================================
// VALIDATION
// ============================================

/**
 * Validate a file for contractor upload.
 *
 * @param file - The File object to validate
 * @param mediaType - 'photo' or 'document'
 * @returns Validation result with error message if invalid
 */
export function validateContractorUpload(
  file: File,
  mediaType: UploadMediaType
): ValidationResult {
  // Check file exists
  if (!file || file.size === 0) {
    return { valid: false, error: 'Keine Datei ausgewaehlt' }
  }

  // Check file size
  const maxSize = FILE_SIZE_LIMITS[mediaType]
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `Datei zu gross (max. ${maxMB}MB)`,
    }
  }

  // Check MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[mediaType]
  const mimeType = file.type.toLowerCase()

  // For photos, also accept any image/* if specific type not in list
  if (mediaType === 'photo') {
    if (!mimeType.startsWith('image/')) {
      return {
        valid: false,
        error: 'Nur Bilddateien erlaubt (JPEG, PNG, WebP)',
      }
    }
  } else if (mediaType === 'document') {
    // For documents, check if it's in the allowed list
    const documentTypes = ALLOWED_MIME_TYPES.document
    if (!documentTypes.includes(mimeType as typeof documentTypes[number])) {
      return {
        valid: false,
        error: 'Nur PDF-Dateien erlaubt',
      }
    }
  }

  return { valid: true }
}

/**
 * Validate multiple files for batch upload.
 *
 * @param files - Array of File objects
 * @param mediaType - 'photo' or 'document'
 * @param maxFiles - Maximum number of files allowed
 * @returns Validation result with error message if invalid
 */
export function validateBatchUpload(
  files: File[],
  mediaType: UploadMediaType,
  maxFiles = 10
): ValidationResult {
  if (files.length === 0) {
    return { valid: false, error: 'Keine Dateien ausgewaehlt' }
  }

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Maximal ${maxFiles} Dateien gleichzeitig`,
    }
  }

  // Validate each file
  for (const file of files) {
    const result = validateContractorUpload(file, mediaType)
    if (!result.valid) {
      return {
        valid: false,
        error: `${file.name}: ${result.error}`,
      }
    }
  }

  return { valid: true }
}

// ============================================
// PATH GENERATION
// ============================================

/**
 * Generate a storage path for a contractor upload.
 *
 * @param workOrderId - UUID of the work order
 * @param mediaType - 'photo' or 'document'
 * @param context - Upload context (offer, invoice, completion, etc.)
 * @param mimeType - MIME type of the file
 * @returns Storage path details
 */
export function generateStoragePath(
  workOrderId: string,
  mediaType: UploadMediaType,
  context: UploadContext,
  mimeType: string
): StoragePath {
  const fileId = crypto.randomUUID()
  const ext = MIME_TO_EXT[mimeType] || (mediaType === 'photo' ? 'webp' : 'pdf')
  const filename = `${fileId}.${ext}`

  // Path convention from 031_storage_buckets.sql
  const path = mediaType === 'document'
    ? `work_orders/${workOrderId}/documents/${filename}`
    : `work_orders/${workOrderId}/photos/${context}/${filename}`

  return {
    bucket: STORAGE_BUCKET,
    path,
    filename,
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get human-readable file size.
 *
 * @param bytes - File size in bytes
 * @returns Formatted size string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

/**
 * Get file extension from MIME type.
 *
 * @param mimeType - MIME type string
 * @returns File extension without dot
 */
export function getExtensionFromMimeType(mimeType: string): string {
  return MIME_TO_EXT[mimeType] || 'bin'
}

/**
 * Check if a file is an image.
 *
 * @param mimeType - MIME type string
 * @returns True if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('image/')
}

/**
 * Check if a file is a PDF document.
 *
 * @param mimeType - MIME type string
 * @returns True if file is a PDF
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType.toLowerCase() === 'application/pdf'
}

/**
 * Get appropriate media type for a file.
 *
 * @param mimeType - MIME type string
 * @returns 'photo' or 'document'
 */
export function getMediaTypeFromMimeType(mimeType: string): UploadMediaType {
  return isImageFile(mimeType) ? 'photo' : 'document'
}

// ============================================
// CONTEXT LABELS (German)
// ============================================

export const CONTEXT_LABELS: Record<UploadContext, string> = {
  offer: 'Offerte',
  invoice: 'Rechnung',
  completion: 'Fertigstellung',
  before: 'Vorher',
  after: 'Nachher',
  during: 'Waehrend der Arbeit',
  other: 'Sonstiges',
}

/**
 * Get German label for upload context.
 *
 * @param context - Upload context
 * @returns German label string
 */
export function getContextLabel(context: UploadContext): string {
  return CONTEXT_LABELS[context] || context
}
