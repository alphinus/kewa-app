'use client'

/**
 * Offline Submit Hook
 *
 * Provides transparent online/offline submission API.
 * Attempts direct fetch when online, falls back to queue on failure or offline.
 * Phase: 28-offline-data-sync
 */

import { useConnectivity } from '@/contexts/ConnectivityContext'
import { enqueueSyncItem } from '@/lib/db/sync-queue'
import { toast } from 'sonner'
import type { SyncQueueItem } from '@/lib/db/schema'

interface SubmitParams {
  operation: SyncQueueItem['operation']
  entityType: string
  entityId: string
  endpoint: string
  method: SyncQueueItem['method']
  payload: any
}

interface SubmitResult {
  queued?: boolean
  id?: number
  data?: any
}

export function useOfflineSubmit() {
  const { isOnline } = useConnectivity()

  async function submitOrQueue(params: SubmitParams): Promise<SubmitResult> {
    // Attempt direct fetch when online
    if (isOnline) {
      try {
        const response = await fetch(params.endpoint, {
          method: params.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params.payload),
        })

        if (response.ok) {
          const data = await response.json()
          return { data }
        }

        // Response not ok: fall through to queue
      } catch (error) {
        console.error('Direct submit failed, falling back to queue:', error)
        // Fall through to queue
      }
    }

    // Offline or direct fetch failed: enqueue
    try {
      const id = await enqueueSyncItem({
        operation: params.operation,
        entityType: params.entityType,
        entityId: params.entityId,
        endpoint: params.endpoint,
        method: params.method,
        payload: params.payload,
      })

      toast.info(
        'Aenderung wird synchronisiert, sobald die Verbindung wiederhergestellt ist',
        { duration: 4000 }
      )

      return { queued: true, id }
    } catch (error) {
      console.error('Failed to enqueue sync item:', error)
      toast.error('Fehler beim Speichern der Aenderung')
      throw error
    }
  }

  return {
    submitOrQueue,
    isOnline,
  }
}
