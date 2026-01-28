'use client'

/**
 * ChangeOrderStatusBadge Component
 *
 * Displays change order status as a colored badge with German label.
 *
 * Phase 21-02: Approval Workflow
 */

import { cn } from '@/lib/utils'
import type { ChangeOrderStatus } from '@/types/change-orders'
import { getStatusLabel, getStatusColor } from '@/lib/change-orders/workflow'

interface ChangeOrderStatusBadgeProps {
  status: ChangeOrderStatus
  size?: 'sm' | 'md'
}

export function ChangeOrderStatusBadge({
  status,
  size = 'md',
}: ChangeOrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        getStatusColor(status),
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm'
      )}
    >
      {getStatusLabel(status)}
    </span>
  )
}
