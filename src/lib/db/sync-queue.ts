/**
 * Sync Queue Operations
 *
 * Manages offline mutation queue with exponential backoff retry.
 * Processes sequentially on reconnect, tracks failures for user action.
 * Phase: 28-offline-data-sync
 */

import { db, type SyncQueueItem } from '@/lib/db/schema'
import { executeWithRetry } from '@/lib/sync/retry-strategy'
import { toast } from 'sonner'

/**
 * Enqueue a sync item for offline processing
 */
export async function enqueueSyncItem(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'status'>
): Promise<number> {
  try {
    const id = await db.syncQueue.add({
      ...item,
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    })
    if (id === undefined) {
      throw new Error('Failed to add item to sync queue')
    }
    return id
  } catch (error) {
    console.error('Failed to enqueue sync item:', error)
    throw error
  }
}

/**
 * Process all pending items in sync queue
 *
 * @returns Object with synced and failed counts
 */
export async function processSyncQueue(): Promise<{
  synced: number
  failed: number
}> {
  let synced = 0
  let failed = 0

  try {
    // Get all pending items ordered by creation time (FIFO)
    const items = await db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('createdAt')

    // Process sequentially (order matters for dependent mutations)
    for (const item of items) {
      try {
        // Mark as processing
        await db.syncQueue.update(item.id!, { status: 'processing' })

        // Execute with exponential backoff retry
        const response = await executeWithRetry(async () => {
          const res = await fetch(item.endpoint, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.payload),
          })

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }

          return res
        })

        // Parse response JSON (needed for conflict detection in Plan 03)
        const data = await response.json()

        // Success: remove from queue
        await db.syncQueue.delete(item.id!)
        synced++
      } catch (error) {
        // Final failure after all retries: mark as failed
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        await db.syncQueue.update(item.id!, {
          status: 'failed',
          lastError: errorMessage,
          retryCount: (item.retryCount || 0) + 1,
        })

        toast.error(`Synchronisierung fehlgeschlagen: ${item.entityType}`)
        failed++

        console.error('Sync queue item failed:', {
          itemId: item.id,
          entityType: item.entityType,
          error: errorMessage,
        })

        // Continue to next item (don't abort queue)
      }
    }
  } catch (error) {
    console.error('Failed to process sync queue:', error)
  }

  return { synced, failed }
}

/**
 * Retry a failed sync item
 */
export async function retryFailedItem(itemId: number): Promise<void> {
  try {
    await db.syncQueue.update(itemId, {
      status: 'pending',
      lastError: undefined,
      retryCount: 0,
    })
  } catch (error) {
    console.error('Failed to retry sync item:', error)
    throw error
  }
}

/**
 * Discard a failed sync item
 */
export async function discardFailedItem(itemId: number): Promise<void> {
  try {
    await db.syncQueue.delete(itemId)
  } catch (error) {
    console.error('Failed to discard sync item:', error)
    throw error
  }
}

/**
 * Get count of pending/processing items
 */
export async function getPendingCount(): Promise<number> {
  try {
    return await db.syncQueue
      .where('status')
      .anyOf(['pending', 'processing'])
      .count()
  } catch (error) {
    console.error('Failed to get pending count:', error)
    return 0
  }
}

/**
 * Get all failed items
 */
export async function getFailedItems(): Promise<SyncQueueItem[]> {
  try {
    return await db.syncQueue
      .where('status')
      .equals('failed')
      .reverse()
      .sortBy('createdAt')
  } catch (error) {
    console.error('Failed to get failed items:', error)
    return []
  }
}

/**
 * Get last successful sync time from localStorage
 */
export function getLastSyncTime(): number | null {
  try {
    if (typeof window === 'undefined') return null
    const value = localStorage.getItem('kewa_last_sync_time')
    return value ? parseInt(value, 10) : null
  } catch (error) {
    console.error('Failed to get last sync time:', error)
    return null
  }
}

/**
 * Set last successful sync time in localStorage
 */
export function setLastSyncTime(): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem('kewa_last_sync_time', Date.now().toString())
  } catch (error) {
    console.error('Failed to set last sync time:', error)
  }
}
