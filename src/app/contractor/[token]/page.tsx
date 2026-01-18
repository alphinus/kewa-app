/**
 * Contractor Portal Dashboard
 *
 * Mobile-optimized dashboard showing ALL work orders for a contractor.
 * Implements EXT-06: Portal displays details and attachments for work order
 *
 * Features:
 * - Dashboard of all contractor work orders (not single work order)
 * - Grouped by action status: needs action, in progress, completed
 * - Auto-marks 'sent' orders as 'viewed' on first load
 * - Shows request-link form for expired/invalid tokens
 */

import { validateContractorAccess } from '@/lib/magic-link'
import {
  getContractorWorkOrders,
  groupWorkOrdersByStatus,
} from '@/lib/contractor/queries'
import { sortByDeadlineUrgency } from '@/lib/work-orders/deadline'
import DashboardSection from './dashboard-section'
import WorkOrderCard from './work-order-card'
import TokenError from './token-error'
import RequestLinkForm from './request-link-form'
import { MarkViewedTracker } from './mark-viewed-tracker'

interface ContractorPageProps {
  params: Promise<{ token: string }>
}

export default async function ContractorDashboard({ params }: ContractorPageProps) {
  const { token } = await params

  // Validate token with status-aware expiry
  const validation = await validateContractorAccess(token)

  // Handle invalid tokens
  if (!validation.valid) {
    // Show request-link form for expired or closed work orders
    if (validation.error === 'expired' || validation.error === 'work_order_closed') {
      return <RequestLinkForm error={validation.error} />
    }
    return <TokenError error={validation.error ?? 'not_found'} />
  }

  // Get ALL work orders for this contractor
  const workOrders = validation.email
    ? await getContractorWorkOrders(validation.email)
    : []

  // Group by action status
  const grouped = groupWorkOrdersByStatus(workOrders)

  // Sort action-needed items by deadline urgency (most urgent first)
  const sortedNeedsAction = sortByDeadlineUrgency(grouped.needsAction)

  // Get IDs of work orders that need to be marked as viewed
  const sentOrderIds = sortedNeedsAction
    .filter((wo) => wo.status === 'sent')
    .map((wo) => wo.id)

  return (
    <div className="space-y-6">
      {/* Auto-mark sent orders as viewed */}
      {sentOrderIds.length > 0 && (
        <MarkViewedTracker token={token} workOrderIds={sentOrderIds} />
      )}

      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Willkommen zurueck
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Hier sehen Sie alle Ihre Arbeitsauftraege von KEWA AG.
        </p>
      </div>

      {/* Action Needed Section - sorted by deadline urgency */}
      <DashboardSection
        title="Handlungsbedarf"
        count={sortedNeedsAction.length}
        variant="action"
        emptyMessage="Keine offenen Auftraege"
      >
        {sortedNeedsAction.map((wo) => (
          <WorkOrderCard
            key={wo.id}
            workOrder={wo}
            token={token}
            variant="compact"
            isActionNeeded
          />
        ))}
      </DashboardSection>

      {/* In Progress Section */}
      <DashboardSection
        title="In Arbeit"
        count={grouped.inProgress.length}
        variant="progress"
        emptyMessage="Keine laufenden Auftraege"
      >
        {grouped.inProgress.map((wo) => (
          <WorkOrderCard
            key={wo.id}
            workOrder={wo}
            token={token}
            variant="compact"
          />
        ))}
      </DashboardSection>

      {/* Completed Section - collapsed by default */}
      <DashboardSection
        title="Abgeschlossen"
        count={grouped.completed.length}
        variant="completed"
        collapsed
        emptyMessage="Keine abgeschlossenen Auftraege"
      >
        {grouped.completed.map((wo) => (
          <WorkOrderCard
            key={wo.id}
            workOrder={wo}
            token={token}
            variant="compact"
            isCompleted
          />
        ))}
      </DashboardSection>

      {/* Empty State */}
      {workOrders.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-500 text-lg">
            Keine Arbeitsauftraege vorhanden
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Neue Auftraege werden hier angezeigt.
          </p>
        </div>
      )}
    </div>
  )
}
