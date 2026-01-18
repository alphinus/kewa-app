'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { WorkOrderWithRelations, WorkOrderSendResponse } from '@/types/work-order'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

// =============================================
// TYPES
// =============================================

interface WorkOrderSendDialogProps {
  /** Work order to send */
  workOrder: WorkOrderWithRelations
  /** Callback when send completes */
  onSent: (response: WorkOrderSendResponse) => void
  /** Callback on close/cancel */
  onClose: () => void
}

// =============================================
// COMPONENT
// =============================================

/**
 * Dialog for sending work order to contractor
 *
 * Shows:
 * - Work order details preview
 * - Download PDF button
 * - Open Email button (mailto)
 * - Instructions for PDF attachment
 * - Confirm send button
 */
export function WorkOrderSendDialog({
  workOrder,
  onSent,
  onClose
}: WorkOrderSendDialogProps) {
  // State
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<WorkOrderSendResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Format date for display
   */
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de })
    } catch {
      return '-'
    }
  }

  /**
   * Format datetime for display
   */
  function formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de })
    } catch {
      return '-'
    }
  }

  /**
   * Format cost for display
   */
  function formatCost(cost: number | null | undefined): string {
    if (cost === null || cost === undefined) return '-'
    return `CHF ${cost.toLocaleString('de-CH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  /**
   * Handle send workflow
   */
  async function handleSend() {
    try {
      setSending(true)
      setError(null)

      const response = await fetch(`/api/work-orders/${workOrder.id}/send`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Senden')
      }

      const data: WorkOrderSendResponse = await response.json()
      setSendResult(data)
      onSent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setSending(false)
    }
  }

  /**
   * Download PDF
   */
  function handleDownloadPDF() {
    const url = sendResult?.pdfDownloadUrl || `/api/work-orders/${workOrder.id}/pdf`
    window.open(url, '_blank')
  }

  /**
   * Open mailto link
   */
  function handleOpenEmail() {
    if (sendResult?.mailtoLink) {
      window.location.href = sendResult.mailtoLink
    }
  }

  // Partner info
  const partner = workOrder.partner
  const partnerName = partner?.company_name || 'Unbekannt'
  const partnerEmail = partner?.email || 'Keine Email'

  // Location info
  const room = workOrder.room
  const location = room
    ? `${room.unit?.building?.name || '-'}, ${room.unit?.name || '-'}, ${room.name}`
    : 'Nicht angegeben'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-auto rounded-2xl">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Arbeitsauftrag senden
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Schliessen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Success state */}
          {sendResult && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Link erstellt!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Gueltig bis: {formatDateTime(sendResult.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Work order preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {workOrder.title}
            </h3>

            {workOrder.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {workOrder.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Auftragnehmer:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{partnerName}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{partnerEmail}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Standort:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{location}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Geschaetzte Kosten:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCost(workOrder.estimated_cost)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Beginn:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(workOrder.requested_start_date)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Antwort bis:</span>
                <p className="font-medium text-orange-600 dark:text-orange-400">
                  {formatDateTime(workOrder.acceptance_deadline)}
                </p>
              </div>
            </div>
          </div>

          {/* Scope of work */}
          {workOrder.scope_of_work && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Arbeitsumfang
              </h4>
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {workOrder.scope_of_work}
              </p>
            </div>
          )}

          {/* Actions after link is created */}
          {sendResult && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleDownloadPDF}
                  fullWidth
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF herunterladen
                </Button>
                <Button
                  onClick={handleOpenEmail}
                  fullWidth
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email oeffnen
                </Button>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Tipp:</strong> Wenn Sie die PDF anhaengen moechten, laden Sie sie zuerst herunter und fuegen Sie sie dann manuell zur Email hinzu.
                </p>
              </div>
            </div>
          )}

          {/* Instructions before sending */}
          {!sendResult && (
            <div className="p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Naechste Schritte:
              </h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>Klicken Sie auf &quot;Link erstellen &amp; senden&quot;</li>
                <li>Ein Magic-Link wird fuer den Auftragnehmer erstellt</li>
                <li>Laden Sie optional die PDF herunter</li>
                <li>Oeffnen Sie die Email und senden Sie sie ab</li>
              </ol>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex-1" />

          {!sendResult ? (
            <>
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={sending}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSend}
                loading={sending}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Link erstellen &amp; senden
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>
              Fertig
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
