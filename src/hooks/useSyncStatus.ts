'use client'

/**
 * Sync Status Hook
 *
 * Provides reactive pending/failed counts and last sync time.
 * Uses useLiveQuery for real-time IndexedDB updates.
 * Phase: 28-offline-data-sync
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/schema'
import { getLastSyncTime } from '@/lib/db/sync-queue'
import { useState, useEffect } from 'react'

export function useSyncStatus() {
  // Reactive pending count from IndexedDB
  const pendingCount = useLiveQuery(
    async () => {
      return await db.syncQueue
        .where('status')
        .anyOf(['pending', 'processing'])
        .count()
    },
    [],
    0
  )

  // Reactive failed count from IndexedDB
  const failedCount = useLiveQuery(
    async () => {
      return await db.syncQueue.where('status').equals('failed').count()
    },
    [],
    0
  )

  // Last sync time from localStorage (SSR-safe)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  useEffect(() => {
    setLastSyncTime(getLastSyncTime())
  }, [])

  return {
    pendingCount: pendingCount ?? 0,
    failedCount: failedCount ?? 0,
    lastSyncTime,
  }
}
