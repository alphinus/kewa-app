/**
 * Work Order Detail Page
 *
 * Shows full details of a single work order with all actions.
 * Accessed from dashboard compact cards.
 *
 * Features:
 * - Full work order details
 * - Accept/reject actions
 * - Status-based action buttons
 * - Back to dashboard link
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { validateContractorAccess } from '@/lib/magic-link'
import { getContractorWorkOrderById } from '@/lib/contractor/queries'
import WorkOrderCard from '../work-order-card'
import TokenError from '../token-error'
import RequestLinkForm from '../request-link-form'

interface WorkOrderDetailPageProps {
  params: Promise<{ token: string; workOrderId: string }>
}

export default async function WorkOrderDetailPage({
  params,
}: WorkOrderDetailPageProps) {
  const { token, workOrderId } = await params

  // Validate token with status-aware expiry
  const validation = await validateContractorAccess(token)

  // Handle invalid tokens
  if (!validation.valid) {
    if (validation.error === 'expired' || validation.error === 'work_order_closed') {
      return <RequestLinkForm error={validation.error} />
    }
    return <TokenError error={validation.error ?? 'not_found'} />
  }

  // Get the specific work order, ensuring it belongs to this contractor
  const workOrder = validation.email
    ? await getContractorWorkOrderById(workOrderId, validation.email)
    : null

  if (!workOrder) {
    notFound()
  }

  return (
    <div className="space-y-4">
      {/* Back to Dashboard Link */}
      <Link
        href={`/contractor/${token}`}
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Zurueck zur Uebersicht
      </Link>

      {/* Full Work Order Card */}
      <WorkOrderCard
        workOrder={workOrder}
        token={token}
        variant="full"
      />

      {/* Action Hints based on status */}
      {workOrder.status === 'sent' && (
        <ActionHint
          type="view"
          message="Dieser Auftrag ist neu. Er wird als 'gesehen' markiert, sobald Sie ihn oeffnen."
        />
      )}

      {workOrder.status === 'viewed' && (
        <ActionHint
          type="respond"
          message="Bitte akzeptieren oder lehnen Sie diesen Auftrag ab."
        />
      )}

      {workOrder.status === 'accepted' && (
        <ActionHint
          type="start"
          message="Klicken Sie auf 'Arbeit starten', wenn Sie mit dem Auftrag beginnen."
        />
      )}

      {workOrder.status === 'in_progress' && (
        <ActionHint
          type="complete"
          message="Markieren Sie den Auftrag als erledigt, wenn die Arbeit abgeschlossen ist."
        />
      )}

      {(workOrder.status === 'done' ||
        workOrder.status === 'inspected' ||
        workOrder.status === 'closed') && (
        <ActionHint
          type="completed"
          message="Dieser Auftrag wurde erfolgreich abgeschlossen. Vielen Dank!"
        />
      )}

      {workOrder.status === 'rejected' && (
        <ActionHint
          type="rejected"
          message="Sie haben diesen Auftrag abgelehnt."
        />
      )}
    </div>
  )
}

// Action hint component
function ActionHint({
  type,
  message,
}: {
  type: 'view' | 'respond' | 'start' | 'complete' | 'completed' | 'rejected'
  message: string
}) {
  const iconConfig: Record<typeof type, { color: string; icon: React.ReactNode }> = {
    view: {
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    respond: {
      color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    start: {
      color: 'text-green-700 bg-green-50 border-green-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    complete: {
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    completed: {
      color: 'text-teal-700 bg-teal-50 border-teal-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    rejected: {
      color: 'text-red-700 bg-red-50 border-red-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }

  const config = iconConfig[type]

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border ${config.color}`}>
      {config.icon}
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}
