'use client'

/**
 * ClientApprovalView Component
 *
 * Client-facing change order view for approval portal.
 * Shows CO details with configurable line item visibility.
 * Provides approve/reject actions.
 *
 * Phase 21-04: Client Portal
 */

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PhotoGallery } from './PhotoGallery'
import type { ChangeOrder } from '@/types/change-orders'
import {
  formatCHF,
  formatSwissDate,
  formatCONumber,
} from '@/lib/change-orders/queries'
import { getReasonLabel } from '@/lib/change-orders/workflow'

interface ClientApprovalViewProps {
  changeOrder: ChangeOrder
  showLineItems: boolean
  token: string
  onApprove: () => void
  onReject: () => void
  isProcessed: boolean
}

export function ClientApprovalView({
  changeOrder,
  showLineItems,
  token,
  onApprove,
  onReject,
  isProcessed,
}: ClientApprovalViewProps) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [photosLoaded, setPhotosLoaded] = useState(false)

  // Load photos on mount
  useState(() => {
    const loadPhotos = async () => {
      try {
        const response = await fetch(
          `/api/change-orders/${changeOrder.id}/photos`
        )
        if (response.ok) {
          const data = await response.json()
          setPhotos(data.photos || [])
        }
      } catch (err) {
        console.error('Failed to load photos:', err)
      } finally {
        setPhotosLoaded(true)
      }
    }
    loadPhotos()
  })

  const handleApprove = async () => {
    if (!confirm('Möchten Sie diesen Änderungsauftrag wirklich genehmigen?')) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/portal/change-orders/${token}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Genehmigung fehlgeschlagen')
      }

      onApprove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setError('Bitte geben Sie einen Grund für die Ablehnung an')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/portal/change-orders/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: rejectComment }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ablehnung fehlgeschlagen')
      }

      onReject()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with KEWA branding */}
      <div className="bg-blue-600 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">KEWA AG</h1>
          <p className="text-blue-100 text-sm">Kundenportal</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Änderungsauftrag {formatCONumber(changeOrder.co_number)}
          </h2>
          {changeOrder.work_order && (
            <p className="text-gray-600">
              Arbeitsauftrag: {changeOrder.work_order.wo_number} -{' '}
              {changeOrder.work_order.title}
            </p>
          )}
        </div>

        {/* Description */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Beschreibung
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {changeOrder.description}
            </p>
          </CardContent>
        </Card>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Reason */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">Grund</p>
              <p className="text-sm font-medium text-gray-900">
                {getReasonLabel(changeOrder.reason_category)}
              </p>
            </CardContent>
          </Card>

          {/* Schedule Impact */}
          {changeOrder.schedule_impact_days !== 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">
                  Zeitplan-Auswirkung
                </p>
                <p
                  className={`text-sm font-medium ${
                    changeOrder.schedule_impact_days < 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {changeOrder.schedule_impact_days > 0 ? '+' : ''}
                  {changeOrder.schedule_impact_days} Tage
                </p>
              </CardContent>
            </Card>
          )}

          {/* Total Amount - always shown */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">Gesamtbetrag</p>
              <p
                className={`text-lg font-bold ${
                  changeOrder.total_amount < 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {changeOrder.total_amount < 0 ? '' : '+'}
                {formatCHF(changeOrder.total_amount)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reason Details */}
        {changeOrder.reason_details && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Detaillierte Begründung
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {changeOrder.reason_details}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Line Items - only if showLineItems is true */}
        {showLineItems && changeOrder.line_items.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Positionen
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-medium text-gray-700">
                        Beschreibung
                      </th>
                      <th className="pb-2 font-medium text-gray-700 text-right">
                        Menge
                      </th>
                      <th className="pb-2 font-medium text-gray-700 text-right">
                        Einheitspreis
                      </th>
                      <th className="pb-2 font-medium text-gray-700 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {changeOrder.line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3">{item.description}</td>
                        <td className="py-3 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 text-right">
                          {formatCHF(item.unit_price)}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatCHF(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {photosLoaded && photos.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Fotos
              </h3>
              <PhotoGallery
                photos={photos}
                changeOrderId={changeOrder.id}
                onDelete={undefined} // Read-only for client
              />
            </CardContent>
          </Card>
        )}

        {/* Version Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Version {changeOrder.version}</span>
              <span>Erstellt am {formatSwissDate(changeOrder.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Area */}
        {!isProcessed ? (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {!showRejectForm ? (
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => setShowRejectForm(true)}
                  variant="outline"
                  size="lg"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                  disabled={processing}
                >
                  <X className="w-5 h-5 mr-2" />
                  Ablehnen
                </Button>
                <Button
                  onClick={handleApprove}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={processing}
                >
                  <Check className="w-5 h-5 mr-2" />
                  {processing ? 'Wird genehmigt...' : 'Genehmigen'}
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Änderungsauftrag ablehnen
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="reject-comment">
                      Grund für Ablehnung <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="reject-comment"
                      placeholder="Bitte geben Sie einen Grund für die Ablehnung an..."
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectForm(false)
                        setRejectComment('')
                        setError(null)
                      }}
                      disabled={processing}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={handleReject}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={processing || !rejectComment.trim()}
                    >
                      {processing ? 'Wird abgelehnt...' : 'Ablehnung bestätigen'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-6 bg-gray-50">
              <p className="text-center text-gray-700 font-medium">
                Dieser Änderungsauftrag wurde bereits bearbeitet
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
