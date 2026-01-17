'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { UnitWithStats } from '@/types/database'

/**
 * Get status dot color based on progress
 */
function getStatusColor(progress: number, hasTasks: boolean): string {
  if (!hasTasks) return 'bg-green-500'
  if (progress === 100) return 'bg-green-500'
  if (progress >= 50) return 'bg-yellow-500'
  if (progress > 0) return 'bg-orange-500'
  return 'bg-red-500'
}

export interface CommonAreasListProps {
  /** Common areas and building unit to display */
  commonAreas: UnitWithStats[]
  /** Click handler for unit selection */
  onUnitClick: (unit: UnitWithStats) => void
}

/**
 * CommonAreasList displays non-apartment units
 *
 * Shows:
 * - Section title "Gemeinschaftsbereiche"
 * - Building unit first (Gesamtes Gebaeude)
 * - Common areas sorted alphabetically
 * - Each with name, color dot indicator, task count
 */
export function CommonAreasList({ commonAreas, onUnitClick }: CommonAreasListProps) {
  // Separate building unit from common areas
  const buildingUnit = commonAreas.find((u) => u.unit_type === 'building')
  const areas = commonAreas
    .filter((u) => u.unit_type === 'common_area')
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  // Combine: building first, then alphabetized areas
  const sortedAreas = buildingUnit ? [buildingUnit, ...areas] : areas

  if (sortedAreas.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Gemeinschaftsbereiche
      </h2>

      {/* Horizontal scroll container on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {sortedAreas.map((area) => (
          <CommonAreaCard
            key={area.id}
            area={area}
            onClick={() => onUnitClick(area)}
            isBuilding={area.unit_type === 'building'}
          />
        ))}
      </div>
    </section>
  )
}

interface CommonAreaCardProps {
  area: UnitWithStats
  onClick: () => void
  isBuilding: boolean
}

/**
 * Individual common area card with compact display
 */
function CommonAreaCard({ area, onClick, isBuilding }: CommonAreaCardProps) {
  const hasTasks = area.total_tasks_count > 0
  const completed = area.total_tasks_count - area.open_tasks_count
  const progress = hasTasks
    ? (completed / area.total_tasks_count) * 100
    : 100

  const statusColor = getStatusColor(progress, hasTasks)

  return (
    <Card
      onClick={onClick}
      className={cn(
        'flex-shrink-0 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        'active:scale-[0.98]',
        'min-h-[48px] min-w-[120px] sm:min-w-[140px]',
        isBuilding && 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
      )}
    >
      <div className="p-3 flex items-center gap-2">
        {/* Status dot */}
        <div
          className={cn(
            'w-3 h-3 rounded-full flex-shrink-0',
            statusColor
          )}
          aria-label={`${Math.round(progress)}% erledigt`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {area.name}
          </h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {hasTasks ? `${completed}/${area.total_tasks_count}` : 'Keine Aufgaben'}
          </p>
        </div>
      </div>
    </Card>
  )
}
