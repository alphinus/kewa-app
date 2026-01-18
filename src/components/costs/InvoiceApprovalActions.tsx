'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Invoice } from '@/types/database'

interface InvoiceWithPartner extends Invoice {
  partner?: {
    id: string
    company_name: string
    contact_name?: string | null
    email?: string | null
    phone?: string | null
  } | null
  work_order?: {
    id: string
    title: string
  } | null
  project?: {
    id: string
    name: string
  } | null
}

interface InvoiceApprovalActionsProps {
  /** Invoice to act on */
  invoice: InvoiceWithPartner
  /** Callback when status changes */
  onStatusChange?: (invoice: InvoiceWithPartner) => void
}

/**
 * Confirmation dialog for approve/dispute actions
 */
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading
}: {
  title: string
  message: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Dispute modal with reason input
 */
function DisputeModal({
  onSubmit,
  onCancel,
  loading
}: {
  onSubmit: (reason: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim()) {
      onSubmit(reason.trim())
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Rechnung beanstanden
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Bitte geben Sie den Grund fuer die Beanstandung an.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Beanstandungsgrund..."
          rows={4}
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 mb-4"
        />

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={loading}
            disabled={!reason.trim()}
          >
            Beanstanden
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * InvoiceApprovalActions - Approve or dispute an invoice under review
 *
 * Shows when invoice status is 'under_review':
 * - "Freigeben" button to approve
 * - "Beanstanden" button to dispute (opens modal for reason)
 */
export function InvoiceApprovalActions({
  invoice,
  onStatusChange
}: InvoiceApprovalActionsProps) {
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only show actions when under_review
  if (invoice.status !== 'under_review') {
    return null
  }

  /**
   * Approve the invoice
   */
  const handleApprove = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/approve`, {
        method: 'POST'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Freigeben')
      }

      const data = await res.json()
      setShowApproveConfirm(false)
      onStatusChange?.(data.invoice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Dispute the invoice
   */
  const handleDispute = async (reason: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/invoices/${invoice.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispute_reason: reason })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Beanstanden')
      }

      const data = await res.json()
      setShowDisputeModal(false)
      onStatusChange?.(data.invoice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          fullWidth
          onClick={() => setShowApproveConfirm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          Freigeben
        </Button>
        <Button
          variant="danger"
          fullWidth
          onClick={() => setShowDisputeModal(true)}
        >
          Beanstanden
        </Button>
      </div>

      {/* Approve confirmation dialog */}
      {showApproveConfirm && (
        <ConfirmDialog
          title="Rechnung freigeben"
          message={`Moechten Sie die Rechnung ${invoice.invoice_number} wirklich freigeben? Die Rechnung wird dann zur Zahlung bereitgestellt.`}
          confirmLabel="Freigeben"
          confirmVariant="primary"
          onConfirm={handleApprove}
          onCancel={() => setShowApproveConfirm(false)}
          loading={loading}
        />
      )}

      {/* Dispute modal */}
      {showDisputeModal && (
        <DisputeModal
          onSubmit={handleDispute}
          onCancel={() => setShowDisputeModal(false)}
          loading={loading}
        />
      )}
    </div>
  )
}
