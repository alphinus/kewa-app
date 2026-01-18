/**
 * Contractor Portal Page
 *
 * Mobile-optimized work order view for external contractors.
 * Implements NFR-06: Contractor page mobile-optimized.
 *
 * Features:
 * - View work order details
 * - Accept/reject work order
 * - Propose dates and costs
 * - Upload completion photos
 * - Mark work as done
 */

import { notFound } from 'next/navigation'
import { peekMagicLink } from '@/lib/magic-link'
import { createServerClient } from '@/lib/supabase/server'
import WorkOrderCard from './work-order-card'
import TokenError from './token-error'

interface ContractorPageProps {
  params: Promise<{ token: string }>
}

// Get work order data
async function getWorkOrderData(workOrderId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      room:rooms(
        id,
        name,
        room_type,
        unit:units(
          id,
          name,
          building:buildings(
            id,
            name,
            address
          )
        )
      )
    `)
    .eq('id', workOrderId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export default async function ContractorPage({ params }: ContractorPageProps) {
  const { token } = await params

  // Validate token without consuming it
  const validation = await peekMagicLink(token)

  if (!validation.valid) {
    return <TokenError error={validation.error ?? 'not_found'} />
  }

  // Get work order data
  const workOrder = validation.workOrderId
    ? await getWorkOrderData(validation.workOrderId)
    : null

  if (!workOrder) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <StatusBanner status={workOrder.status} />

      {/* Work Order Details */}
      <WorkOrderCard
        workOrder={workOrder}
        token={token}
        contractorEmail={validation.email ?? ''}
      />

      {/* Actions based on status */}
      {workOrder.status === 'sent' && (
        <ActionSection
          type="view"
          message="Please review the work order details below."
        />
      )}

      {workOrder.status === 'viewed' && (
        <ActionSection
          type="respond"
          message="Please accept or reject this work order."
        />
      )}

      {workOrder.status === 'accepted' && (
        <ActionSection
          type="start"
          message="You can start work when ready."
        />
      )}

      {workOrder.status === 'in_progress' && (
        <ActionSection
          type="complete"
          message="Mark as done when work is completed."
        />
      )}

      {(workOrder.status === 'done' || workOrder.status === 'inspected' || workOrder.status === 'closed') && (
        <ActionSection
          type="completed"
          message="This work order has been completed. Thank you!"
        />
      )}
    </div>
  )
}

// Status banner component
function StatusBanner({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
    sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'New' },
    viewed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Awaiting Response' },
    accepted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepted' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Progress' },
    blocked: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Blocked' },
    done: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Done' },
    inspected: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Inspected' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Closed' },
  }

  const config = statusConfig[status] ?? statusConfig.draft

  return (
    <div className={`rounded-lg px-4 py-3 ${config.bg}`}>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${config.text}`}>Status:</span>
        <span className={`font-bold ${config.text}`}>{config.label}</span>
      </div>
    </div>
  )
}

// Action section component
function ActionSection({
  type,
  message,
}: {
  type: 'view' | 'respond' | 'start' | 'complete' | 'completed'
  message: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-gray-600 text-sm mb-4">{message}</p>

      {type === 'view' && (
        <p className="text-blue-600 text-sm font-medium">
          After reviewing, you will be able to accept or reject.
        </p>
      )}

      {type === 'respond' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Use the buttons below to respond to this work order.
          </p>
        </div>
      )}

      {type === 'start' && (
        <p className="text-green-600 text-sm font-medium">
          Click &quot;Start Work&quot; when you begin the job.
        </p>
      )}

      {type === 'complete' && (
        <p className="text-purple-600 text-sm font-medium">
          Upload photos and click &quot;Mark Complete&quot; when finished.
        </p>
      )}

      {type === 'completed' && (
        <div className="flex items-center gap-2 text-green-600">
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
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-medium">Work completed successfully</span>
        </div>
      )}
    </div>
  )
}
