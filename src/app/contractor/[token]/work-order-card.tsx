'use client'

/**
 * Work Order Card Component
 *
 * Mobile-optimized card displaying work order details and actions.
 * Touch-friendly buttons with min 44px height.
 */

import { useState } from 'react'

interface WorkOrderData {
  id: string
  title: string
  description: string | null
  scope_of_work: string | null
  status: string
  requested_start_date: string | null
  requested_end_date: string | null
  proposed_start_date: string | null
  proposed_end_date: string | null
  estimated_cost: number | null
  proposed_cost: number | null
  acceptance_deadline: string | null
  contractor_notes: string | null
  room?: {
    id: string
    name: string
    room_type: string
    unit?: {
      id: string
      name: string
      building?: {
        id: string
        name: string
        address: string | null
      }
    }
  }
}

interface WorkOrderCardProps {
  workOrder: WorkOrderData
  token: string
  contractorEmail: string
}

export default function WorkOrderCard({
  workOrder,
  token,
  contractorEmail,
}: WorkOrderCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [notes, setNotes] = useState('')
  const [proposedCost, setProposedCost] = useState(
    workOrder.estimated_cost?.toString() ?? ''
  )

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Handle status update
  const handleStatusUpdate = async (newStatus: string, data?: Record<string, unknown>) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/contractor/${token}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...data,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Refresh the page to show new status
      window.location.reload()
    } catch (error) {
      console.error('Status update failed:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle accept
  const handleAccept = () => {
    handleStatusUpdate('accepted', {
      proposed_cost: proposedCost ? parseFloat(proposedCost) : null,
      contractor_notes: notes || null,
    })
  }

  // Handle reject
  const handleReject = (reason: string) => {
    handleStatusUpdate('rejected', {
      rejection_reason: reason,
    })
    setShowRejectModal(false)
  }

  // Handle mark as viewed (auto-trigger when first loaded)
  const handleMarkViewed = () => {
    if (workOrder.status === 'sent') {
      handleStatusUpdate('viewed')
    }
  }

  // Auto-mark as viewed on first load
  useState(() => {
    if (workOrder.status === 'sent') {
      handleMarkViewed()
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-900 text-white px-4 py-3">
        <h2 className="font-semibold text-lg">{workOrder.title}</h2>
        {workOrder.room?.unit?.building && (
          <p className="text-blue-200 text-sm mt-1">
            {workOrder.room.unit.building.name}
            {workOrder.room.unit.building.address && (
              <span className="block">{workOrder.room.unit.building.address}</span>
            )}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Location */}
        {workOrder.room && (
          <Section title="Location">
            <p className="text-gray-900">
              {workOrder.room.unit?.name} - {workOrder.room.name}
            </p>
            <p className="text-gray-500 text-sm capitalize">
              {workOrder.room.room_type.replace('_', ' ')}
            </p>
          </Section>
        )}

        {/* Description */}
        {workOrder.description && (
          <Section title="Description">
            <p className="text-gray-700 whitespace-pre-wrap">
              {workOrder.description}
            </p>
          </Section>
        )}

        {/* Scope of Work */}
        {workOrder.scope_of_work && (
          <Section title="Scope of Work">
            <p className="text-gray-700 whitespace-pre-wrap">
              {workOrder.scope_of_work}
            </p>
          </Section>
        )}

        {/* Dates */}
        <Section title="Schedule">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Requested Start</p>
              <p className="text-gray-900 font-medium">
                {formatDate(workOrder.requested_start_date)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Requested End</p>
              <p className="text-gray-900 font-medium">
                {formatDate(workOrder.requested_end_date)}
              </p>
            </div>
          </div>
          {workOrder.acceptance_deadline && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-gray-500 text-sm">Response Deadline</p>
              <p className="text-orange-600 font-medium">
                {formatDate(workOrder.acceptance_deadline)}
              </p>
            </div>
          )}
        </Section>

        {/* Cost */}
        <Section title="Estimated Cost">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(workOrder.estimated_cost)}
          </p>
        </Section>

        {/* Response Form - Only show when awaiting response */}
        {workOrder.status === 'viewed' && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Your Response</h3>

            {/* Proposed Cost */}
            <div>
              <label
                htmlFor="proposedCost"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Your Price (CHF)
              </label>
              <input
                id="proposedCost"
                type="number"
                step="0.01"
                value={proposedCost}
                onChange={(e) => setProposedCost(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any comments or questions..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white font-semibold py-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Processing...' : 'Accept Work Order'}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white font-semibold py-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Start Work Button - Show when accepted */}
        {workOrder.status === 'accepted' && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => handleStatusUpdate('in_progress')}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white font-semibold py-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Processing...' : 'Start Work'}
            </button>
          </div>
        )}

        {/* Mark Complete Button - Show when in progress */}
        {workOrder.status === 'in_progress' && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => handleStatusUpdate('done')}
              disabled={isLoading}
              className="w-full bg-teal-600 text-white font-semibold py-4 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Processing...' : 'Mark as Complete'}
            </button>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          onClose={() => setShowRejectModal(false)}
          onReject={handleReject}
        />
      )}
    </div>
  )
}

// Section component
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      {children}
    </div>
  )
}

// Reject modal component
function RejectModal({
  onClose,
  onReject,
}: {
  onClose: () => void
  onReject: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-lg rounded-t-lg p-4 safe-area-inset-bottom">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Reject Work Order
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          Please provide a reason for rejecting this work order:
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
          placeholder="Reason for rejection..."
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 font-semibold py-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onReject(reason)}
            disabled={!reason.trim()}
            className="flex-1 bg-red-600 text-white font-semibold py-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}
