/**
 * HeatmapUnitCell Component
 *
 * Displays a single unit in the building heatmap with room condition dots.
 * Background color reflects overall condition (traffic light: red/yellow/green).
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Requirements: DASH-02, DASH-03 (condition visualization)
 */

'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { HeatmapUnit } from '@/lib/dashboard/heatmap-queries'
import type { RoomCondition } from '@/types'

/**
 * Color mapping for room condition indicator dots
 */
const CONDITION_DOT_COLORS: Record<RoomCondition, string> = {
  old: 'bg-red-500',
  partial: 'bg-yellow-500',
  new: 'bg-green-500'
}

/**
 * Background color mapping for overall unit condition
 */
const OVERALL_BG_COLORS: Record<RoomCondition, string> = {
  old: 'bg-red-50 dark:bg-red-950/30',
  partial: 'bg-yellow-50 dark:bg-yellow-950/30',
  new: 'bg-green-50 dark:bg-green-950/30'
}

export interface HeatmapUnitCellProps {
  /** Unit data with condition info */
  unit: HeatmapUnit
  /** Click handler for unit selection */
  onClick: () => void
  /** Compact mode for smaller cells */
  compact?: boolean
}

/**
 * HeatmapUnitCell displays a unit card with:
 * - Unit name and tenant
 * - Room condition dots (max 6 shown)
 * - Renovation percentage
 * - Background colored by overall condition
 */
export function HeatmapUnitCell({ unit, onClick, compact = false }: HeatmapUnitCellProps) {
  const bgColor = unit.overall_condition
    ? OVERALL_BG_COLORS[unit.overall_condition]
    : 'bg-gray-50 dark:bg-gray-800'

  // Show at most 6 room dots, aggregate if more
  const displayRooms = unit.rooms.slice(0, 6)
  const hasMoreRooms = unit.rooms.length > 6

  return (
    <Card
      data-unit-id={unit.id}
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        'active:scale-[0.98]',
        bgColor,
        compact ? 'min-h-[60px]' : 'min-h-[80px]'
      )}
    >
      <div className={cn(
        'flex flex-col justify-between h-full',
        compact ? 'p-2' : 'p-3'
      )}>
        {/* Unit info */}
        <div className="flex-1">
          <h3 className={cn(
            'font-medium text-gray-900 dark:text-gray-100 truncate',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {unit.name}
          </h3>

          {unit.tenant_name && (
            <p className={cn(
              'text-gray-500 dark:text-gray-400 truncate',
              compact ? 'text-[10px]' : 'text-xs'
            )}>
              {unit.tenant_name}
            </p>
          )}
        </div>

        {/* Room condition dots */}
        <div className="mt-2 flex flex-wrap gap-1">
          {displayRooms.map((room) => (
            <span
              key={room.id}
              className={cn(
                'rounded-full',
                compact ? 'w-2 h-2' : 'w-2.5 h-2.5',
                CONDITION_DOT_COLORS[room.condition]
              )}
              title={`${room.name}: ${room.condition}`}
            />
          ))}
          {hasMoreRooms && (
            <span className={cn(
              'text-gray-400 dark:text-gray-500',
              compact ? 'text-[8px]' : 'text-[10px]'
            )}>
              +{unit.rooms.length - 6}
            </span>
          )}
        </div>

        {/* Renovation percentage */}
        <div className="mt-1 flex items-center justify-between">
          <span className={cn(
            'text-gray-500 dark:text-gray-400',
            compact ? 'text-[9px]' : 'text-xs'
          )}>
            {unit.renovation_percentage ?? 0}% renoviert
          </span>
        </div>
      </div>
    </Card>
  )
}
