'use client'

/**
 * Work Order Card Component
 *
 * Mobile-optimized card displaying work order details and actions.
 * Touch-friendly buttons with min 44px height.
 *
 * Variants:
 * - compact: Summary card for dashboard list (title, location, status, deadline)
 * - full: Detailed view with all fields and actions
 */

import { useState } from 'react'
import Link from 'next/link'
import ResponseForm from './[workOrderId]/response-form'
import DeadlineBanner, { CompactDeadlineBanner } from './[workOrderId]/deadline-banner'
import { getDeadlineStatus, isDeadlinePassed } from '@/lib/work-orders/deadline'

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
  // Counter-offer tracking
  counter_offer_status?: string | null
  counter_offer_responded_at?: string | null
  counter_offer_response_notes?: string | null
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
      } | null
    } | null
  } | null
}

type CardVariant = 'compact' | 'full'

interface WorkOrderCardProps {
  workOrder: WorkOrderData
  token: string
  contractorEmail?: string
  variant?: CardVariant
  isActionNeeded?: boolean
  isCompleted?: boolean
}

export default function WorkOrderCard({
  workOrder,
  token,
  contractorEmail,
  variant = 'full',
  isActionNeeded = false,
  isCompleted = false,
}: WorkOrderCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Format short date
  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
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
          workOrderId: workOrder.id,
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
      alert('Aktualisierung fehlgeschlagen. Bitte versuchen Sie es erneut.')
    } finally {
      setIsLoading(false)
    }
  }

  // Get status config
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Entwurf' },
    sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Neu' },
    viewed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Antwort erwartet' },
    accepted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Akzeptiert' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Abgelehnt' },
    in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Arbeit' },
    blocked: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Blockiert' },
    done: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Erledigt' },
    inspected: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Geprueft' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Geschlossen' },
  }

  const status = statusConfig[workOrder.status] ?? statusConfig.draft

  // Get location string
  const getLocationString = () => {
    if (!workOrder.room) return null
    const building = workOrder.room.unit?.building?.name
    const unit = workOrder.room.unit?.name
    const room = workOrder.room.name
    if (building && unit) {
      return `${building}, ${unit} - ${room}`
    }
    return room
  }

  // Get deadline status for styling
  const deadlineStatus = getDeadlineStatus(workOrder.acceptance_deadline)
  const isOverdue = isDeadlinePassed({ acceptance_deadline: workOrder.acceptance_deadline })

  // Compact card variant for dashboard list
  if (variant === 'compact') {
    // Highlight overdue items needing action
    const needsUrgentAction = isActionNeeded && (deadlineStatus === 'urgent' || deadlineStatus === 'expired')
    const cardBg = needsUrgentAction ? 'bg-red-50' : ''

    return (
      <Link
        href={`/contractor/${token}/${workOrder.id}`}
        className={`block p-4 hover:bg-gray-50 transition-colors ${cardBg}`}
      >
        <div className="flex items-start gap-3">
          {/* Action indicator */}
          {isActionNeeded && (
            <div className="flex-shrink-0 mt-1">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${needsUrgentAction ? 'bg-red-400' : 'bg-orange-400'} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${needsUrgentAction ? 'bg-red-500' : 'bg-orange-500'}`} />
              </span>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Status */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">
                {workOrder.title}
              </h3>
              <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>

            {/* Location */}
            {getLocationString() && (
              <p className="text-sm text-gray-600 truncate mb-1">
                {getLocationString()}
              </p>
            )}

            {/* Meta info row */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {/* Estimated cost */}
              {workOrder.estimated_cost && (
                <span className="font-medium">
                  {formatCurrency(workOrder.estimated_cost)}
                </span>
              )}

              {/* Deadline - use CompactDeadlineBanner */}
              {workOrder.acceptance_deadline && !isCompleted && (
                <CompactDeadlineBanner deadline={workOrder.acceptance_deadline} />
              )}

              {/* Date range */}
              {workOrder.requested_start_date && (
                <span>
                  {formatShortDate(workOrder.requested_start_date)}
                  {workOrder.requested_end_date && ` - ${formatShortDate(workOrder.requested_end_date)}`}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <svg
            className="flex-shrink-0 w-5 h-5 text-gray-400 mt-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    )
  }

  // Full card variant for detail view
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
        {/* Deadline Banner - Show for items needing response */}
        {workOrder.status === 'viewed' && workOrder.acceptance_deadline && (
          <DeadlineBanner deadline={workOrder.acceptance_deadline} />
        )}

        {/* Status Badge */}
        <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bg}`}>
          <span className={`text-sm font-medium ${status.text}`}>
            {status.label}
          </span>
        </div>

        {/* Location */}
        {workOrder.room && (
          <Section title="Standort">
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
          <Section title="Beschreibung">
            <p className="text-gray-700 whitespace-pre-wrap">
              {workOrder.description}
            </p>
          </Section>
        )}

        {/* Scope of Work */}
        {workOrder.scope_of_work && (
          <Section title="Arbeitsumfang">
            <p className="text-gray-700 whitespace-pre-wrap">
              {workOrder.scope_of_work}
            </p>
          </Section>
        )}

        {/* Dates */}
        <Section title="Zeitplan">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Gewuenschter Beginn</p>
              <p className="text-gray-900 font-medium">
                {formatDate(workOrder.requested_start_date)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Gewuenschtes Ende</p>
              <p className="text-gray-900 font-medium">
                {formatDate(workOrder.requested_end_date)}
              </p>
            </div>
          </div>
          {workOrder.acceptance_deadline && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-gray-500 text-sm">Antwort bis</p>
              <p className="text-orange-600 font-medium">
                {formatDate(workOrder.acceptance_deadline)}
              </p>
            </div>
          )}
        </Section>

        {/* Cost */}
        <Section title="Geschaetzte Kosten">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(workOrder.estimated_cost)}
          </p>
        </Section>

        {/* Response Form - Only show when awaiting response */}
        {workOrder.status === 'viewed' && (
          <ResponseForm workOrder={workOrder} token={token} />
        )}

        {/* Start Work Button - Show when accepted */}
        {workOrder.status === 'accepted' && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => handleStatusUpdate('in_progress')}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white font-semibold py-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Wird verarbeitet...' : 'Arbeit starten'}
            </button>
          </div>
        )}

        {/* Mark Complete Button - Show when in progress */}
        {workOrder.status === 'in_progress' && (
          <CompletionSection
            onComplete={() => handleStatusUpdate('done')}
            isLoading={isLoading}
          />
        )}

        {/* Completed State */}
        {(workOrder.status === 'done' || workOrder.status === 'inspected' || workOrder.status === 'closed') && (
          <div className="border-t border-gray-200 pt-4">
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
              <span className="font-medium">Arbeit erfolgreich abgeschlossen</span>
            </div>
          </div>
        )}
      </div>

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

// Completion section with optional photo upload prompt
function CompletionSection({
  onComplete,
  isLoading,
}: {
  onComplete: () => void
  isLoading: boolean
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleComplete = () => {
    // Show confirmation dialog with photo upload suggestion
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    onComplete()
  }

  return (
    <div className="border-t border-gray-200 pt-4 space-y-3">
      {/* Info about uploads */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-800">
          Tipp: Laden Sie Fotos der abgeschlossenen Arbeit hoch, bevor Sie den Auftrag als erledigt markieren. Dies erleichtert die Abnahme.
        </p>
      </div>

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={isLoading}
        className="w-full bg-teal-600 text-white font-semibold py-4 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Wird verarbeitet...' : 'Als erledigt markieren'}
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-lg rounded-t-lg p-4 safe-area-inset-bottom">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Auftrag abschliessen?
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Moechten Sie den Auftrag als erledigt markieren? Stellen Sie sicher, dass Sie alle relevanten Fotos hochgeladen haben.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Wird verarbeitet...' : 'Ja, abschliessen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
