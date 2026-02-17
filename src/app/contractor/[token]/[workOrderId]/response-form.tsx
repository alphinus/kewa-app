'use client'

/**
 * Response Form Component
 *
 * Main response interface for contractors to respond to work orders.
 * Shows when work order is in 'viewed' status.
 *
 * Actions:
 * - Accept: If proposed matches estimated, direct accept
 * - Accept with changes: Opens counter-offer flow
 * - Reject: Opens reject modal
 *
 * Requirements: EXT-07, EXT-08, EXT-09, EXT-10
 */

import { useState, useEffect } from 'react'
import RejectModal from './reject-modal'
import CounterOfferForm from './counter-offer-form'

interface ResponseFormProps {
  workOrder: {
    id: string
    estimated_cost: number | null
    requested_start_date: string | null
    requested_end_date: string | null
    counter_offer_status?: string | null
    proposed_cost?: number | null | undefined
    proposed_start_date?: string | null | undefined
    proposed_end_date?: string | null | undefined
    contractor_notes?: string | null | undefined
  }
  token: string
}

type FormMode = 'initial' | 'counter_offer'

export default function ResponseForm({ workOrder, token }: ResponseFormProps) {
  const [mode, setMode] = useState<FormMode>('initial')
  const [isLoading, setIsLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initial form values for quick accept
  const [proposedCost, setProposedCost] = useState(
    workOrder.estimated_cost?.toString() ?? ''
  )
  const [notes, setNotes] = useState(workOrder.contractor_notes ?? '')

  // Check if counter-offer is pending (show waiting state)
  const hasPendingCounterOffer = workOrder.counter_offer_status === 'pending'

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Call respond API
  const callRespondAPI = async (
    action: 'accept' | 'reject' | 'counter_offer',
    data?: Record<string, unknown>
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/contractor/${token}/${workOrder.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...data }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler bei der Verarbeitung')
      }

      // Refresh page to show updated state
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setIsLoading(false)
    }
  }

  // Handle direct accept
  const handleAccept = () => {
    const cost = proposedCost ? parseFloat(proposedCost) : null
    const hasCostChange = cost !== workOrder.estimated_cost

    if (hasCostChange) {
      // If cost changed, treat as counter-offer instead
      setMode('counter_offer')
      return
    }

    // Direct accept with current values
    callRespondAPI('accept', {
      proposed_cost: cost,
      contractor_notes: notes.trim() || null,
    })
  }

  // Handle reject submission
  const handleReject = (reason: string) => {
    callRespondAPI('reject', { rejection_reason: reason })
    setShowRejectModal(false)
  }

  // Handle counter-offer submission
  const handleCounterOffer = (data: {
    proposed_cost: number | null
    proposed_start_date: string | null
    proposed_end_date: string | null
    contractor_notes: string | null
  }) => {
    callRespondAPI('counter_offer', data)
  }

  // If counter-offer is pending, show waiting state
  if (hasPendingCounterOffer) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">
                Gegenangebot wird geprüft
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Ihr Gegenangebot wurde an KEWA gesendet und wird geprüft.
                Sie werden benachrichtigt, sobald eine Entscheidung vorliegt.
              </p>

              {/* Show proposed values */}
              <div className="mt-3 space-y-1 text-sm">
                {workOrder.proposed_cost != null && (
                  <p className="text-blue-800">
                    <span className="font-medium">Ihr Preis:</span>{' '}
                    {formatCurrency(workOrder.proposed_cost ?? null)}
                  </p>
                )}
                {workOrder.proposed_start_date && (
                  <p className="text-blue-800">
                    <span className="font-medium">Ihr Startdatum:</span>{' '}
                    {new Date(workOrder.proposed_start_date).toLocaleDateString('de-CH')}
                  </p>
                )}
                {workOrder.proposed_end_date && (
                  <p className="text-blue-800">
                    <span className="font-medium">Ihr Enddatum:</span>{' '}
                    {new Date(workOrder.proposed_end_date).toLocaleDateString('de-CH')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Counter-offer mode
  if (mode === 'counter_offer') {
    return (
      <div className="border-t border-gray-200 pt-4">
        <CounterOfferForm
          workOrder={workOrder}
          onSubmit={handleCounterOffer}
          onCancel={() => setMode('initial')}
          isLoading={isLoading}
        />
      </div>
    )
  }

  // Initial response mode
  return (
    <div className="border-t border-gray-200 pt-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Ihre Antwort</h3>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Quick accept section */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        {/* Show estimated cost */}
        <div>
          <p className="text-sm text-gray-500">Geschaetzte Kosten von KEWA</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(workOrder.estimated_cost)}
          </p>
        </div>

        {/* Proposed Cost Input */}
        <div>
          <label
            htmlFor="quickCost"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ihr Preis (CHF)
          </label>
          <input
            id="quickCost"
            type="number"
            step="0.01"
            min="0"
            value={proposedCost}
            onChange={(e) => setProposedCost(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leer lassen oder gleichen Betrag eingeben für direkte Annahme
          </p>
        </div>

        {/* Notes Input (EXT-10) */}
        <div>
          <label
            htmlFor="quickNotes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Fragen oder Bemerkungen (optional)
          </label>
          <textarea
            id="quickNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={isLoading}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="Fragen oder Anmerkungen zum Auftrag..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {/* Primary action row */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading}
            className="flex-1 bg-green-600 text-white font-semibold py-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors min-h-[52px]"
          >
            {isLoading ? 'Wird verarbeitet...' : 'Auftrag annehmen'}
          </button>
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            disabled={isLoading}
            className="flex-1 bg-red-600 text-white font-semibold py-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[52px]"
          >
            Ablehnen
          </button>
        </div>

        {/* Secondary action */}
        <button
          type="button"
          onClick={() => setMode('counter_offer')}
          disabled={isLoading}
          className="w-full bg-blue-100 text-blue-700 font-semibold py-3 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
        >
          Gegenangebot mit anderen Terminen erstellen
        </button>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          onClose={() => setShowRejectModal(false)}
          onReject={handleReject}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
