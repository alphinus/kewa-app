'use client'

/**
 * Counter-Offer Form Component
 *
 * Form for contractors to propose different price/dates than KEWA's offer.
 * Shows side-by-side comparison of original vs proposed values.
 *
 * Requirements: EXT-08 (Propose price), EXT-09 (Propose dates)
 */

import { useState, useMemo } from 'react'

interface CounterOfferFormProps {
  workOrder: {
    estimated_cost: number | null
    requested_start_date: string | null
    requested_end_date: string | null
  }
  onSubmit: (data: {
    proposed_cost: number | null
    proposed_start_date: string | null
    proposed_end_date: string | null
    contractor_notes: string | null
  }) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function CounterOfferForm({
  workOrder,
  onSubmit,
  onCancel,
  isLoading = false,
}: CounterOfferFormProps) {
  const [proposedCost, setProposedCost] = useState(
    workOrder.estimated_cost?.toString() ?? ''
  )
  const [proposedStartDate, setProposedStartDate] = useState(
    workOrder.requested_start_date ?? ''
  )
  const [proposedEndDate, setProposedEndDate] = useState(
    workOrder.requested_end_date ?? ''
  )
  const [notes, setNotes] = useState('')

  // Format currency for display
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    const costChanged =
      proposedCost !== '' &&
      parseFloat(proposedCost) !== workOrder.estimated_cost
    const startDateChanged =
      proposedStartDate !== '' &&
      proposedStartDate !== workOrder.requested_start_date
    const endDateChanged =
      proposedEndDate !== '' &&
      proposedEndDate !== workOrder.requested_end_date
    return costChanged || startDateChanged || endDateChanged
  }, [proposedCost, proposedStartDate, proposedEndDate, workOrder])

  // Highlight differences
  const getDiffClass = (original: string | number | null, proposed: string) => {
    if (!proposed) return ''
    const originalStr = original?.toString() ?? ''
    if (proposed !== originalStr) {
      return 'bg-yellow-50 border-yellow-300'
    }
    return ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasChanges || isLoading) return

    onSubmit({
      proposed_cost: proposedCost ? parseFloat(proposedCost) : null,
      proposed_start_date: proposedStartDate || null,
      proposed_end_date: proposedEndDate || null,
      contractor_notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Gegenangebot erstellen
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Sie koennen einen anderen Preis oder andere Termine vorschlagen.
          KEWA wird Ihr Angebot pruefen.
        </p>
      </div>

      {/* Comparison: Cost */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              KEWA Angebot
            </label>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(workOrder.estimated_cost)}
            </p>
          </div>
          <div>
            <label
              htmlFor="proposedCost"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ihr Preis (CHF)
            </label>
            <input
              id="proposedCost"
              type="number"
              step="0.01"
              min="0"
              value={proposedCost}
              onChange={(e) => setProposedCost(e.target.value)}
              disabled={isLoading}
              className={`w-full px-3 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${getDiffClass(
                workOrder.estimated_cost,
                proposedCost
              )}`}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Cost difference indicator */}
        {proposedCost && parseFloat(proposedCost) !== workOrder.estimated_cost && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Differenz:</span>
            <span
              className={`font-medium ${
                parseFloat(proposedCost) > (workOrder.estimated_cost ?? 0)
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {parseFloat(proposedCost) > (workOrder.estimated_cost ?? 0) ? '+' : ''}
              {formatCurrency(
                parseFloat(proposedCost) - (workOrder.estimated_cost ?? 0)
              )}
            </span>
          </div>
        )}
      </div>

      {/* Comparison: Dates */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Zeitrahmen
        </label>

        {/* Original dates display */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-500 mb-1">KEWA Vorgabe:</p>
          <p className="text-gray-900">
            {formatDate(workOrder.requested_start_date)} -{' '}
            {formatDate(workOrder.requested_end_date)}
          </p>
        </div>

        {/* Proposed dates inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="proposedStartDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ihr Startdatum
            </label>
            <input
              id="proposedStartDate"
              type="date"
              value={proposedStartDate}
              onChange={(e) => setProposedStartDate(e.target.value)}
              disabled={isLoading}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${getDiffClass(
                workOrder.requested_start_date,
                proposedStartDate
              )}`}
            />
          </div>
          <div>
            <label
              htmlFor="proposedEndDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ihr Enddatum
            </label>
            <input
              id="proposedEndDate"
              type="date"
              value={proposedEndDate}
              onChange={(e) => setProposedEndDate(e.target.value)}
              min={proposedStartDate || undefined}
              disabled={isLoading}
              className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${getDiffClass(
                workOrder.requested_end_date,
                proposedEndDate
              )}`}
            />
          </div>
        </div>
      </div>

      {/* Explanation notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Begruendung / Fragen
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={isLoading}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="Warum schlagen Sie diese Aenderungen vor? Haben Sie Fragen?"
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional, aber hilft KEWA bei der Entscheidung
        </p>
      </div>

      {/* Validation message */}
      {!hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Bitte aendern Sie mindestens den Preis oder einen Termin.</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 bg-gray-100 text-gray-700 font-semibold py-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors min-h-[52px]"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!hasChanges || isLoading}
          className="flex-1 bg-blue-600 text-white font-semibold py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[52px]"
        >
          {isLoading ? 'Wird gesendet...' : 'Gegenangebot senden'}
        </button>
      </div>
    </form>
  )
}
