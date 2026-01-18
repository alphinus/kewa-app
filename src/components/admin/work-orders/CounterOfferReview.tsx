'use client'

/**
 * Counter-Offer Review Component
 *
 * Admin interface for KEWA staff to review contractor counter-offers.
 * Shows side-by-side comparison and allows approve/reject/close actions.
 *
 * Displays when work order has counter_offer_status='pending'.
 */

import { useState } from 'react'

interface CounterOfferReviewProps {
  workOrder: {
    id: string
    title: string
    estimated_cost: number | null
    proposed_cost: number | null
    requested_start_date: string | null
    requested_end_date: string | null
    proposed_start_date: string | null
    proposed_end_date: string | null
    contractor_notes: string | null
    counter_offer_status: string | null
    partner?: {
      company_name: string
      email: string | null
    } | null
  }
  onApprove: (notes?: string) => Promise<void>
  onReject: (notes?: string) => Promise<void>
  onClose: () => Promise<void>
}

export default function CounterOfferReview({
  workOrder,
  onApprove,
  onReject,
  onClose,
}: CounterOfferReviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | 'close' | null>(null)
  const [responseNotes, setResponseNotes] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Calculate differences
  const costDiff =
    workOrder.proposed_cost !== null && workOrder.estimated_cost !== null
      ? workOrder.proposed_cost - workOrder.estimated_cost
      : null

  const hasDateChanges =
    workOrder.proposed_start_date !== workOrder.requested_start_date ||
    workOrder.proposed_end_date !== workOrder.requested_end_date

  const hasCostChange =
    workOrder.proposed_cost !== null &&
    workOrder.proposed_cost !== workOrder.estimated_cost

  // Handle action execution
  const handleAction = async () => {
    if (!action) return

    setIsLoading(true)
    try {
      switch (action) {
        case 'approve':
          await onApprove(responseNotes.trim() || undefined)
          break
        case 'reject':
          await onReject(responseNotes.trim() || undefined)
          break
        case 'close':
          await onClose()
          break
      }
    } finally {
      setIsLoading(false)
      setShowConfirmation(false)
    }
  }

  // Start action flow
  const initiateAction = (selectedAction: 'approve' | 'reject' | 'close') => {
    setAction(selectedAction)
    setResponseNotes('')
    setShowConfirmation(true)
  }

  // Don't render if no pending counter-offer
  if (workOrder.counter_offer_status !== 'pending') {
    return null
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-6 h-6 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-yellow-900">
            Gegenangebot vom Handwerker
          </h4>
          <p className="text-sm text-yellow-700">
            {workOrder.partner?.company_name || 'Unbekannt'} hat ein Gegenangebot eingereicht.
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg border border-yellow-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-yellow-100">
              <th className="px-4 py-2 text-left font-medium text-yellow-900">
                Feld
              </th>
              <th className="px-4 py-2 text-left font-medium text-yellow-900">
                KEWA Angebot
              </th>
              <th className="px-4 py-2 text-left font-medium text-yellow-900">
                Handwerker Vorschlag
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Cost Row */}
            <tr className={hasCostChange ? 'bg-yellow-50' : ''}>
              <td className="px-4 py-3 font-medium text-gray-900">Preis</td>
              <td className="px-4 py-3 text-gray-700">
                {formatCurrency(workOrder.estimated_cost)}
              </td>
              <td className="px-4 py-3">
                {workOrder.proposed_cost !== null ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        hasCostChange ? 'font-semibold text-yellow-900' : 'text-gray-700'
                      }
                    >
                      {formatCurrency(workOrder.proposed_cost)}
                    </span>
                    {costDiff !== null && costDiff !== 0 && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          costDiff > 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {costDiff > 0 ? '+' : ''}
                        {formatCurrency(costDiff)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>

            {/* Start Date Row */}
            <tr
              className={
                workOrder.proposed_start_date !== workOrder.requested_start_date
                  ? 'bg-yellow-50'
                  : ''
              }
            >
              <td className="px-4 py-3 font-medium text-gray-900">Startdatum</td>
              <td className="px-4 py-3 text-gray-700">
                {formatDate(workOrder.requested_start_date)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    workOrder.proposed_start_date !== workOrder.requested_start_date
                      ? 'font-semibold text-yellow-900'
                      : 'text-gray-700'
                  }
                >
                  {formatDate(workOrder.proposed_start_date)}
                </span>
              </td>
            </tr>

            {/* End Date Row */}
            <tr
              className={
                workOrder.proposed_end_date !== workOrder.requested_end_date
                  ? 'bg-yellow-50'
                  : ''
              }
            >
              <td className="px-4 py-3 font-medium text-gray-900">Enddatum</td>
              <td className="px-4 py-3 text-gray-700">
                {formatDate(workOrder.requested_end_date)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    workOrder.proposed_end_date !== workOrder.requested_end_date
                      ? 'font-semibold text-yellow-900'
                      : 'text-gray-700'
                  }
                >
                  {formatDate(workOrder.proposed_end_date)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Contractor Notes */}
      {workOrder.contractor_notes && (
        <div className="bg-white rounded-lg border border-yellow-200 p-3 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">
            Begruendung vom Handwerker:
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {workOrder.contractor_notes}
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation ? (
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <label
              htmlFor="responseNotes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {action === 'approve'
                ? 'Nachricht an Handwerker (optional)'
                : action === 'reject'
                ? 'Grund fuer Ablehnung (optional)'
                : 'Begruendung (optional)'}
            </label>
            <textarea
              id="responseNotes"
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              rows={2}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder={
                action === 'approve'
                  ? 'Z.B. Preis akzeptiert, bitte starten Sie am...'
                  : action === 'reject'
                  ? 'Z.B. Budget kann nicht erhoeht werden...'
                  : ''
              }
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleAction}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 font-medium rounded-lg disabled:opacity-50 transition-colors ${
                action === 'approve'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : action === 'reject'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {isLoading
                ? 'Wird verarbeitet...'
                : action === 'approve'
                ? 'Genehmigen'
                : action === 'reject'
                ? 'Ablehnen'
                : 'Schliessen'}
            </button>
          </div>
        </div>
      ) : (
        /* Action Buttons */
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => initiateAction('approve')}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Genehmigen
          </button>
          <button
            type="button"
            onClick={() => initiateAction('reject')}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={() => initiateAction('close')}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            title="Auftrag schliessen ohne Annahme"
          >
            Schliessen
          </button>
        </div>
      )}
    </div>
  )
}
