/**
 * ConditionBadge Component
 *
 * Displays room condition status as a color-coded badge.
 * Used in RoomConditionGrid and other unit views.
 *
 * Phase 11-02: Room Condition Grid
 * Requirements: HIST-02 (visual condition display)
 */

import { cn } from '@/lib/utils'
import type { RoomCondition } from '@/types'

/**
 * Styling configuration for condition badges
 */
const CONDITION_STYLES: Record<RoomCondition, string> = {
  old: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  new: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
}

/**
 * German labels for conditions
 */
const CONDITION_LABELS: Record<RoomCondition, string> = {
  old: 'Alt',
  partial: 'Teilrenoviert',
  new: 'Neu'
}

export interface ConditionBadgeProps {
  /** The condition to display */
  condition: RoomCondition
  /** Badge size variant */
  size?: 'sm' | 'md'
  /** Whether to show the label text */
  showLabel?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * ConditionBadge displays a color-coded badge for room/component condition.
 *
 * @example
 * ```tsx
 * // Small badge with label
 * <ConditionBadge condition="new" size="sm" showLabel />
 *
 * // Medium badge without label (icon only)
 * <ConditionBadge condition="old" size="md" showLabel={false} />
 * ```
 */
export function ConditionBadge({
  condition,
  size = 'sm',
  showLabel = true,
  className
}: ConditionBadgeProps) {
  const sizeStyles = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border',
        CONDITION_STYLES[condition],
        sizeStyles,
        className
      )}
    >
      {/* Condition indicator dot */}
      <span
        className={cn(
          'rounded-full flex-shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          condition === 'old' && 'bg-red-500 dark:bg-red-400',
          condition === 'partial' && 'bg-yellow-500 dark:bg-yellow-400',
          condition === 'new' && 'bg-green-500 dark:bg-green-400'
        )}
      />
      {showLabel && CONDITION_LABELS[condition]}
    </span>
  )
}

/**
 * Get condition label in German
 */
export function getConditionLabel(condition: RoomCondition): string {
  return CONDITION_LABELS[condition]
}

/**
 * Get condition CSS classes
 */
export function getConditionStyles(condition: RoomCondition): string {
  return CONDITION_STYLES[condition]
}
