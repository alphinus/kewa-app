/**
 * Conflict Resolver
 *
 * Implements Last-Write-Wins conflict detection and resolution.
 * Compares local and server timestamps after successful sync.
 * Phase: 28-offline-data-sync
 */

import { db } from '@/lib/db/schema'
import type { CachedEntity } from '@/lib/db/schema'
import { toast } from 'sonner'
import { cacheEntityOnView } from '@/lib/db/operations'

export interface ConflictResult {
  winner: 'local' | 'server'
  serverData: any
}

/**
 * Detect and resolve conflicts using Last-Write-Wins strategy.
 *
 * Called after a successful sync operation to determine if server data
 * should override local changes. Server wins when its updated_at is newer.
 *
 * @param params.entityType - Type of entity being synced
 * @param params.entityId - ID of entity being synced
 * @param params.localUpdatedAt - Timestamp from local cached data
 * @param params.serverResponse - Response data from server after sync
 * @returns Conflict result indicating winner and server data
 */
export async function detectAndResolveConflict(params: {
  entityType: string
  entityId: string
  localUpdatedAt: string
  serverResponse: any
}): Promise<ConflictResult> {
  const { entityType, entityId, localUpdatedAt, serverResponse } = params

  try {
    // Compare timestamps
    const localTime = new Date(localUpdatedAt).getTime()
    const serverTime = new Date(serverResponse.updated_at).getTime()

    if (serverTime > localTime) {
      // Server wins - another user modified the entity after our local cache
      // Update local cache with server data
      await cacheEntityOnView(
        entityType as CachedEntity['entityType'],
        entityId,
        serverResponse
      )

      // Notify user their changes were overwritten
      toast('Ihre Änderungen wurden überschrieben', { duration: 4000 })

      return {
        winner: 'server',
        serverData: serverResponse,
      }
    } else {
      // Local wins (no conflict) - our timestamp was equal or newer
      // Still update cache with server response (includes computed fields)
      await cacheEntityOnView(
        entityType as CachedEntity['entityType'],
        entityId,
        serverResponse
      )

      return {
        winner: 'local',
        serverData: serverResponse,
      }
    }
  } catch (error) {
    console.error('Failed to detect/resolve conflict:', error)

    // On error, assume local wins and cache server response
    await cacheEntityOnView(
      entityType as CachedEntity['entityType'],
      entityId,
      serverResponse
    )

    return {
      winner: 'local',
      serverData: serverResponse,
    }
  }
}
