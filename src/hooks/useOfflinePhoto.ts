'use client'

/**
 * Offline Photo Hook
 *
 * Hook for capturing and uploading photos with offline queueing support.
 * Compresses photos before upload/queue, handles online/offline states.
 * Phase: 28-offline-data-sync
 */

import { queueOfflinePhoto } from '@/lib/sync/photo-uploader'
import { useConnectivity } from '@/contexts/ConnectivityContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/schema'
import { compressImage } from '@/lib/imageCompression'

/**
 * Hook for offline-capable photo capture and upload.
 *
 * @param entityType - Type of entity to attach photo to
 * @param entityId - ID of entity to attach photo to
 * @returns Photo queue functions and state
 */
export function useOfflinePhoto(entityType: string, entityId: string) {
  const { isOnline } = useConnectivity()

  // Get count of pending photos for this entity
  const pendingPhotoCount = useLiveQuery(
    () => db.photoQueue.where({ entityType, entityId }).count(),
    [entityType, entityId],
    0
  )

  /**
   * Queue or upload a photo.
   * If online: compresses and uploads directly.
   * If offline: compresses and queues for later upload.
   *
   * @param file - Photo file to upload
   */
  const queuePhoto = async (file: File): Promise<void> => {
    try {
      if (isOnline) {
        // Online: compress and upload directly
        const compressedBlob = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
        })

        // Upload directly
        const formData = new FormData()
        formData.append('file', compressedBlob, file.name)
        formData.append('entityType', entityType)
        formData.append('entityId', entityId)

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }
      } else {
        // Offline: compress and queue
        await queueOfflinePhoto({
          entityType,
          entityId,
          file,
        })
      }
    } catch (error) {
      console.error('Failed to queue/upload photo:', error)
      throw error
    }
  }

  return {
    queuePhoto,
    pendingPhotoCount,
    isOnline,
  }
}
