'use client'

/**
 * ApprovalWorkflowCard Component
 *
 * Shows current approval status and available workflow actions.
 * Displays approve/reject buttons for assigned approvers.
 *
 * Phase 21-02: Approval Workflow
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ChangeOrder } from '@/types/change-orders'
import { getStatusLabel, getNextActions } from '@/lib/change-orders/workflow'

interface ApprovalWorkflowCardProps {
  changeOrder: ChangeOrder
  currentUserId: string
  currentUserRole: string
}

export function ApprovalWorkflowCard({
  changeOrder,
  currentUserId,
  currentUserRole,
}: ApprovalWorkflowCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showCancelInput, setShowCancelInput] = useState(false)

  const nextActions = getNextActions(changeOrder.status)
  const canApprove = nextActions.includes('approved')
  const canReject = nextActions.includes('rejected')
  const canCancel = nextActions.includes('cancelled')
  const canSubmit = nextActions.includes('submitted')

  // Check if current user is approver
  const isApprover =
    changeOrder.current_approver_id === currentUserId ||
    currentUserRole === 'kewa' // Admins can override

  const handleStatusChange = async (targetStatus: string, additionalData?: object) => {
    try {
      setLoading(true)

      const res = await fetch(`/api/change-orders/${changeOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          ...additionalData,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Fehler beim Statuswechsel')
        return
      }

      // Refresh page to show updated status
      router.refresh()
    } catch (error) {
      console.error('Error changing status:', error)
      alert('Fehler beim Statuswechsel')
    } finally {
      setLoading(false)
      setShowRejectInput(false)
      setShowCancelInput(false)
      setComment('')
      setCancelReason('')
    }
  }

  const handleApprove = () => {
    handleStatusChange('approved')
  }

  const handleReject = () => {
    if (!comment.trim()) {
      alert('Bitte geben Sie einen Kommentar ein')
      return
    }
    handleStatusChange('rejected', { comment })
  }

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      alert('Bitte geben Sie einen Grund ein')
      return
    }
    handleStatusChange('cancelled', { cancelled_reason: cancelReason })
  }

  const handleSubmit = () => {
    handleStatusChange('submitted')
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Genehmigungsworkflow
        </h3>

        {/* Current Status */}
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Aktueller Status:
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {getStatusLabel(changeOrder.status)}
          </p>

          {/* Approver info */}
          {changeOrder.current_approver_id && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500">
                Genehmiger:{' '}
                {changeOrder.current_approver_id === currentUserId
                  ? 'Sie'
                  : 'Zugewiesen'}
              </p>
            </div>
          )}

          {/* Timestamps */}
          {changeOrder.submitted_at && (
            <p className="text-xs text-gray-500 mt-1">
              Eingereicht:{' '}
              {new Date(changeOrder.submitted_at).toLocaleDateString('de-CH')}
            </p>
          )}
          {changeOrder.approved_at && (
            <p className="text-xs text-green-600 mt-1">
              Genehmigt:{' '}
              {new Date(changeOrder.approved_at).toLocaleDateString('de-CH')}
            </p>
          )}
          {changeOrder.rejected_at && (
            <p className="text-xs text-red-600 mt-1">
              Abgelehnt:{' '}
              {new Date(changeOrder.rejected_at).toLocaleDateString('de-CH')}
            </p>
          )}
        </div>

        {/* Actions */}
        {nextActions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Verfügbare Aktionen:
            </p>

            {/* Submit */}
            {canSubmit && (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full"
              >
                Zur Prüfung einreichen
              </Button>
            )}

            {/* Approve */}
            {canApprove && (
              <Button
                onClick={handleApprove}
                disabled={loading || !isApprover}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Genehmigen
              </Button>
            )}

            {/* Reject */}
            {canReject && (
              <div>
                {!showRejectInput ? (
                  <Button
                    onClick={() => setShowRejectInput(true)}
                    disabled={loading || !isApprover}
                    variant="destructive"
                    className="w-full"
                  >
                    Ablehnen
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Grund der Ablehnung..."
                      rows={3}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleReject}
                        disabled={loading || !comment.trim()}
                        variant="destructive"
                        className="flex-1"
                      >
                        Bestätigen
                      </Button>
                      <Button
                        onClick={() => {
                          setShowRejectInput(false)
                          setComment('')
                        }}
                        disabled={loading}
                        variant="outline"
                        className="flex-1"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cancel */}
            {canCancel && (
              <div>
                {!showCancelInput ? (
                  <Button
                    onClick={() => setShowCancelInput(true)}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    Stornieren
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Grund der Stornierung..."
                      rows={3}
                      className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCancel}
                        disabled={loading || !cancelReason.trim()}
                        className="flex-1"
                      >
                        Bestätigen
                      </Button>
                      <Button
                        onClick={() => {
                          setShowCancelInput(false)
                          setCancelReason('')
                        }}
                        disabled={loading}
                        variant="outline"
                        className="flex-1"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isApprover && (canApprove || canReject) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Nur der zugewiesene Genehmiger kann diese Aktionen ausführen.
              </p>
            )}
          </div>
        )}

        {/* No actions available */}
        {nextActions.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Keine weiteren Aktionen verfügbar (Endstatus erreicht).
          </p>
        )}
      </CardContent>
    </Card>
  )
}
