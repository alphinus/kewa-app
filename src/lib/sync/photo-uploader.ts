/**
 * Photo Uploader with Offline Queue
 *
 * Manages photo compression, queueing, and sequential upload.
 * Photos are compressed to 1920px max / 80% quality before storage.
 * Phase: 28-offline-data-sync
 */

import { db, type PhotoQueueItem } from '@/lib/db/schema'
import { executeWithRetry } from '@/lib/sync/retry-strategy'
import { compressImage } from '@/lib/imageCompression'
import { toast } from 'sonner'

/**
 * Queue a photo for offline upload.
 * Compresses photo to 1920px max / 80% quality before storage.
 *
 * @param params.entityType - Type of entity (workOrder, task, etc.)
 * @param params.entityId - ID of entity
 * @param params.file - Photo file to upload
 * @param params.fileName - Optional custom file name
 * @returns Queue item ID
 */
export async function queueOfflinePhoto(params: {
  entityType: string
  entityId: string
  file: File
  fileName?: string
}): Promise<number> {
  const { entityType, entityId, file, fileName } = params

  try {
    // Compress photo using existing Canvas API compressor
    // 1920px max (override default 720px for offline photos per CONTEXT.md)
    const compressedBlob = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
    })

    // Add to IndexedDB queue
    const id = await db.photoQueue.add({
      entityType,
      entityId,
      blob: compressedBlob,
      fileName: fileName || file.name,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    })

    if (id === undefined) {
      throw new Error('Failed to add photo to queue')
    }

    return id
  } catch (error) {
    console.error('Failed to queue offline photo:', error)
    throw error
  }
}

/**
 * Process all pending photos in queue.
 * Uploads sequentially (one at a time) with exponential backoff retry.
 *
 * @param onProgress - Optional progress callback (current, total, fileName)
 * @returns Upload results with uploaded and failed counts
 */
export async function processPhotoQueue(
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0
  let failed = 0

  try {
    // Get all pending items ordered by creation time (FIFO)
    const items = await db.photoQueue
      .where('status')
      .equals('pending')
      .sortBy('createdAt')

    const total = items.length

    // Process sequentially (one at a time per CONTEXT.md decision)
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      try {
        // Mark as processing
        await db.photoQueue.update(item.id!, { status: 'processing' })

        // Report progress
        onProgress?.(i + 1, total, item.fileName)

        // Prepare FormData
        const formData = new FormData()
        formData.append('file', item.blob, item.fileName)
        formData.append('entityType', item.entityType)
        formData.append('entityId', item.entityId)

        // Upload with exponential backoff retry
        await executeWithRetry(async () => {
          const res = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }

          return res
        })

        // Success: remove from queue
        await db.photoQueue.delete(item.id!)
        uploaded++
      } catch (error) {
        // Final failure after all retries: mark as failed
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        await db.photoQueue.update(item.id!, {
          status: 'failed',
          lastError: errorMessage,
          retryCount: (item.retryCount || 0) + 1,
        })

        toast.error(
          `Foto konnte nicht hochgeladen werden: ${item.fileName} -- wird erneut versucht`
        )
        failed++

        console.error('Photo upload failed:', {
          itemId: item.id,
          fileName: item.fileName,
          error: errorMessage,
        })

        // Continue to next photo (don't abort queue)
      }
    }
  } catch (error) {
    console.error('Failed to process photo queue:', error)
  }

  return { uploaded, failed }
}

/**
 * Get count of pending/processing photos in queue.
 */
export async function getPhotoQueueCount(): Promise<number> {
  try {
    return await db.photoQueue
      .where('status')
      .anyOf(['pending', 'processing'])
      .count()
  } catch (error) {
    console.error('Failed to get photo queue count:', error)
    return 0
  }
}

/**
 * Retry a failed photo upload.
 */
export async function retryFailedPhoto(itemId: number): Promise<void> {
  try {
    await db.photoQueue.update(itemId, {
      status: 'pending',
      lastError: undefined,
      retryCount: 0,
    })
  } catch (error) {
    console.error('Failed to retry photo:', error)
    throw error
  }
}

/**
 * Discard a failed photo from queue.
 */
export async function discardFailedPhoto(itemId: number): Promise<void> {
  try {
    await db.photoQueue.delete(itemId)
  } catch (error) {
    console.error('Failed to discard photo:', error)
    throw error
  }
}
