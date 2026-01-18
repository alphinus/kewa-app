'use client'

import { cn } from '@/lib/utils'
import type { ParkingSpot } from '@/types/database'
import type { ParkingStatus } from '@/types'

const STATUS_STYLES: Record<ParkingStatus, string> = {
  free: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  occupied: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  maintenance: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
}

const STATUS_LABELS: Record<ParkingStatus, string> = {
  free: 'Frei',
  occupied: 'Belegt',
  maintenance: 'Wartung'
}

const STATUS_BADGE_STYLES: Record<ParkingStatus, string> = {
  free: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  occupied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
}

interface ParkingSpotCardProps {
  spot: ParkingSpot
  onClick?: () => void
  compact?: boolean
}

export function ParkingSpotCard({ spot, onClick, compact = false }: ParkingSpotCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        'active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        STATUS_STYLES[spot.parking_status],
        compact ? 'p-2' : 'p-3'
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn(
          'font-medium text-gray-900 dark:text-gray-100',
          compact ? 'text-xs' : 'text-sm'
        )}>
          P{spot.parking_number}
        </span>
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
          STATUS_BADGE_STYLES[spot.parking_status]
        )}>
          {STATUS_LABELS[spot.parking_status]}
        </span>
      </div>

      {spot.tenant_name && spot.parking_status === 'occupied' && (
        <p className={cn(
          'text-gray-600 dark:text-gray-400 truncate mt-1',
          compact ? 'text-[10px]' : 'text-xs'
        )}>
          {spot.tenant_name}
        </p>
      )}

      {spot.rent_amount && (
        <p className={cn(
          'text-gray-500 dark:text-gray-500 mt-1',
          compact ? 'text-[9px]' : 'text-xs'
        )}>
          CHF {spot.rent_amount}/Mt.
        </p>
      )}
    </button>
  )
}
