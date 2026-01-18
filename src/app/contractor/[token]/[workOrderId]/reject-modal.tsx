'use client'

/**
 * Reject Modal Component
 *
 * Modal dialog for contractors to reject work orders.
 * Requires selection of a predefined reason, with optional
 * custom text for "other" option.
 *
 * Requirement: EXT-07 (Accept/Reject with reason)
 */

import { useState } from 'react'
import { REJECTION_REASONS, type RejectionReasonId } from '@/lib/contractor/constants'

interface RejectModalProps {
  onClose: () => void
  onReject: (reason: string, reasonId: RejectionReasonId) => void
  isLoading?: boolean
}

export default function RejectModal({
  onClose,
  onReject,
  isLoading = false,
}: RejectModalProps) {
  const [selectedReason, setSelectedReason] = useState<RejectionReasonId | ''>('')
  const [customReason, setCustomReason] = useState('')

  const handleSubmit = () => {
    if (!selectedReason) return

    const reasonObj = REJECTION_REASONS.find((r) => r.id === selectedReason)
    if (!reasonObj) return

    // Build final reason text
    let reasonText: string
    if (selectedReason === 'other' && customReason.trim()) {
      reasonText = `${reasonObj.label}: ${customReason.trim()}`
    } else {
      reasonText = reasonObj.description
    }

    onReject(reasonText, selectedReason as RejectionReasonId)
  }

  const canSubmit =
    selectedReason !== '' &&
    (selectedReason !== 'other' || customReason.trim().length > 0) &&
    !isLoading

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose()
        }
      }}
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-lg rounded-t-2xl p-4 pb-6 safe-area-inset-bottom max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Auftrag ablehnen
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 -m-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Schliessen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Bitte waehlen Sie einen Grund fuer die Ablehnung:
        </p>

        {/* Reason Selection */}
        <div className="space-y-2 mb-4">
          {REJECTION_REASONS.map((reason) => (
            <button
              key={reason.id}
              type="button"
              onClick={() => setSelectedReason(reason.id as RejectionReasonId)}
              disabled={isLoading}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selectedReason === reason.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:bg-gray-50 disabled:hover:bg-white'
              } disabled:opacity-50`}
            >
              <span className="font-medium text-gray-900">{reason.label}</span>
              <span className="block text-sm text-gray-500">{reason.description}</span>
            </button>
          ))}
        </div>

        {/* Custom reason input for "other" */}
        {selectedReason === 'other' && (
          <div className="mb-4">
            <label htmlFor="customReason" className="sr-only">
              Grund angeben
            </label>
            <textarea
              id="customReason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
              placeholder="Bitte geben Sie den Grund an..."
              autoFocus
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors min-h-[52px]"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-red-600 text-white font-semibold py-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[52px]"
          >
            {isLoading ? 'Wird verarbeitet...' : 'Ablehnen'}
          </button>
        </div>
      </div>
    </div>
  )
}
