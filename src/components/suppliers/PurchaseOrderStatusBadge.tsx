'use client'

/**
 * PurchaseOrderStatusBadge Component
 *
 * Displays purchase order status as a colored badge with German label.
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

import { cn } from '@/lib/utils'
import {
  type PurchaseOrderStatus,
  getPurchaseOrderStatusLabel,
  getPurchaseOrderStatusColor,
} from '@/lib/suppliers/status-utils'

interface PurchaseOrderStatusBadgeProps {
  status: PurchaseOrderStatus
  size?: 'sm' | 'md'
}

export function PurchaseOrderStatusBadge({
  status,
  size = 'md',
}: PurchaseOrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        getPurchaseOrderStatusColor(status),
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm'
      )}
    >
      {getPurchaseOrderStatusLabel(status)}
    </span>
  )
}
