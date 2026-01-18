'use client'

/**
 * WorkOrderCostRow Component
 *
 * Displays a single work order as a table row with cost breakdown.
 * Shows: Auftrag, Raum, Offerte, Rechnung, Status
 *
 * Phase 10-04: Project Cost Dashboard
 */

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  formatCHF,
  translateWorkOrderStatus,
  translateInvoiceStatus,
  getWorkOrderStatusColor,
  getInvoiceStatusColor,
} from '@/lib/costs/formatters'
import type { WorkOrderWithCosts } from '@/lib/costs/project-cost-queries'

interface WorkOrderCostRowProps {
  workOrder: WorkOrderWithCosts
  /** Optional: link to work order detail */
  linkToDetail?: boolean
}

/**
 * Status badge component
 */
function StatusBadge({
  status,
  type,
}: {
  status: string
  type: 'workOrder' | 'invoice'
}) {
  const label =
    type === 'workOrder'
      ? translateWorkOrderStatus(status)
      : translateInvoiceStatus(status)
  const colorClass =
    type === 'workOrder'
      ? getWorkOrderStatusColor(status)
      : getInvoiceStatusColor(status)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        colorClass
      )}
    >
      {label}
    </span>
  )
}

/**
 * Work order cost row for project cost table
 */
export function WorkOrderCostRow({
  workOrder,
  linkToDetail = true,
}: WorkOrderCostRowProps) {
  const router = useRouter()

  const handleClick = () => {
    if (linkToDetail) {
      // Navigate to work order detail (would be in project context)
      router.push(`/dashboard/projekte/${workOrder.id}`)
    }
  }

  // Determine which status to show
  // If invoice exists, show invoice status; otherwise show work order status
  const hasInvoice = !!workOrder.invoice
  const displayStatus = hasInvoice
    ? workOrder.invoice!.status
    : workOrder.status
  const statusType: 'workOrder' | 'invoice' = hasInvoice
    ? 'invoice'
    : 'workOrder'

  return (
    <tr
      onClick={linkToDetail ? handleClick : undefined}
      className={cn(
        'border-b border-gray-100 dark:border-gray-800',
        linkToDetail &&
          'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors'
      )}
    >
      {/* Auftrag (Title) */}
      <td className="py-3 px-4">
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {workOrder.title}
        </div>
        {workOrder.partner && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {workOrder.partner.company_name}
          </div>
        )}
      </td>

      {/* Raum */}
      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
        {workOrder.room?.name ?? '-'}
      </td>

      {/* Offerte (from accepted offer) */}
      <td className="py-3 px-4 text-right text-sm">
        {workOrder.acceptedOffer ? (
          <span className="text-gray-900 dark:text-gray-100">
            {formatCHF(workOrder.acceptedOffer.total_amount)}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">-</span>
        )}
      </td>

      {/* Rechnung (from linked invoice) */}
      <td className="py-3 px-4 text-right text-sm">
        {workOrder.invoice ? (
          <div>
            <span className="text-gray-900 dark:text-gray-100">
              {formatCHF(workOrder.invoice.total_amount)}
            </span>
            <div className="text-xs text-gray-400">
              {workOrder.invoice.invoice_number}
            </div>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">-</span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 px-4 text-right">
        <StatusBadge status={displayStatus} type={statusType} />
      </td>
    </tr>
  )
}

/**
 * Skeleton row for loading state
 */
export function WorkOrderCostRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-1 animate-pulse" />
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto animate-pulse" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto animate-pulse" />
      </td>
      <td className="py-3 px-4 text-right">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20 ml-auto animate-pulse" />
      </td>
    </tr>
  )
}

/**
 * Empty state for no work orders
 */
export function WorkOrderCostEmptyState() {
  return (
    <tr>
      <td
        colSpan={5}
        className="py-8 text-center text-gray-500 dark:text-gray-400"
      >
        Keine Arbeitsauftraege vorhanden
      </td>
    </tr>
  )
}
