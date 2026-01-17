'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { UnitWithStats } from '@/types/database'

/**
 * Progress color based on task completion percentage
 */
function getProgressColor(progress: number, hasTasks: boolean): string {
  if (!hasTasks) return 'bg-green-500' // No tasks = green
  if (progress === 100) return 'bg-green-500'
  if (progress >= 50) return 'bg-yellow-500'
  if (progress > 0) return 'bg-orange-500'
  return 'bg-red-500' // 0% complete with open tasks
}

/**
 * Background color for the card based on progress
 */
function getCardBgColor(progress: number, hasTasks: boolean): string {
  if (!hasTasks) return 'bg-green-50 dark:bg-green-950/20'
  if (progress === 100) return 'bg-green-50 dark:bg-green-950/20'
  if (progress >= 50) return 'bg-yellow-50 dark:bg-yellow-950/20'
  if (progress > 0) return 'bg-orange-50 dark:bg-orange-950/20'
  return 'bg-red-50 dark:bg-red-950/20'
}

export interface UnitCellProps {
  /** Unit with task statistics */
  unit: UnitWithStats
  /** Click handler */
  onClick: () => void
  /** Compact mode for mobile or smaller cells */
  compact?: boolean
}

/**
 * UnitCell displays a single unit with progress bar
 *
 * Shows:
 * - Unit name (e.g., "EG Links", "1.OG Mitte")
 * - Tenant name if available
 * - Progress bar with color coding
 * - Task count (completed/total)
 */
export function UnitCell({ unit, onClick, compact = false }: UnitCellProps) {
  const hasTasks = unit.total_tasks_count > 0
  const completed = unit.total_tasks_count - unit.open_tasks_count
  const progress = hasTasks
    ? (completed / unit.total_tasks_count) * 100
    : 100

  const progressColor = getProgressColor(progress, hasTasks)
  const cardBgColor = getCardBgColor(progress, hasTasks)

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        'active:scale-[0.98]',
        cardBgColor,
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

        {/* Progress section */}
        <div className="mt-2 space-y-1">
          {/* Progress bar */}
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', progressColor)}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Task count */}
          <div className="flex justify-between items-center">
            <span className={cn(
              'text-gray-600 dark:text-gray-400',
              compact ? 'text-[10px]' : 'text-xs'
            )}>
              {hasTasks ? `${completed}/${unit.total_tasks_count}` : 'Keine Aufgaben'}
            </span>
            {hasTasks && (
              <span className={cn(
                'font-medium',
                compact ? 'text-[10px]' : 'text-xs',
                progress === 100 ? 'text-green-600 dark:text-green-400' :
                progress >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                progress > 0 ? 'text-orange-600 dark:text-orange-400' :
                'text-red-600 dark:text-red-400'
              )}>
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
