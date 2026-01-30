'use client'

/**
 * Sync Status Badge
 *
 * Shows pending/failed sync count in header.
 * Renders blue badge with spinning icon for pending items.
 * Renders red badge for failed items.
 * Phase: 28-offline-data-sync
 */

import { useSyncStatus } from '@/hooks/useSyncStatus'
import { RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export function SyncStatusBadge() {
  const { pendingCount, failedCount, lastSyncTime } = useSyncStatus()

  // Only render when there are items to sync or failed
  if (pendingCount === 0 && failedCount === 0) {
    return null
  }

  // Pending items (blue badge with spinning icon)
  if (pendingCount > 0) {
    const tooltip = lastSyncTime
      ? `Letzte Synchronisierung: ${formatDistanceToNow(lastSyncTime, {
          addSuffix: true,
          locale: de,
        })}`
      : 'Synchronisierung ausstehend'

    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium"
        title={tooltip}
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>{pendingCount}</span>
      </div>
    )
  }

  // Failed items only (red badge)
  if (failedCount > 0) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium"
        title={`${failedCount} fehlgeschlagen`}
      >
        <span>{failedCount} fehlgeschlagen</span>
      </div>
    )
  }

  return null
}
