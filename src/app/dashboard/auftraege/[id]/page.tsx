'use client'

/**
 * Work Order Detail Page
 *
 * Client component showing full work order information with:
 * - Work order details (title, description, scope, dates, cost)
 * - Partner and project info
 * - Status with timeline
 * - Action buttons (Send, PDF, Edit)
 * - WorkOrderSendDialog integration
 * - Counter-offer review section
 *
 * Path: /dashboard/auftraege/[id]
 * Phase 09-07: Work Order UI Integration
 * Phase 28-04: Entity caching integration
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WorkOrderSendDialog } from '@/components/work-orders/WorkOrderSendDialog'
import type { WorkOrderWithRelations, WorkOrderSendResponse } from '@/types/work-order'
import type { WorkOrderStatus } from '@/types'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { cacheEntityOnView } from '@/lib/db/operations'
import { useOfflineEntity } from '@/hooks/useOfflineEntity'
import { StalenessIndicator } from '@/components/StalenessIndicator'
import { useConnectivity } from '@/contexts/ConnectivityContext'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Get status badge styling based on work order status
 */
function getStatusBadge(status: WorkOrderStatus): { label: string; className: string } {
  switch (status) {
    case 'draft':
      return {
        label: 'Entwurf',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
    case 'sent':
      return {
        label: 'Gesendet',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      }
    case 'viewed':
      return {
        label: 'Angesehen',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      }
    case 'accepted':
      return {
        label: 'Angenommen',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      }
    case 'rejected':
      return {
        label: 'Abgelehnt',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }
    case 'in_progress':
      return {
        label: 'In Arbeit',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      }
    case 'done':
      return {
        label: 'Erledigt',
        className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
      }
    case 'closed':
      return {
        label: 'Abgeschlossen',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
      }
    default:
      return {
        label: status,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
  }
}

/**
 * Format date for display (Swiss format)
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format datetime for display
 */
function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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

export default function WorkOrderDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  // State
  const [workOrder, setWorkOrder] = useState<WorkOrderWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSendDialog, setShowSendDialog] = useState(false)

  // Offline entity caching
  const { isOnline } = useConnectivity()
  const offlineCache = useOfflineEntity('workOrder', id)

  // Load work order
  useEffect(() => {
    async function loadWorkOrder() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/work-orders/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Arbeitsauftrag nicht gefunden')
          }
          throw new Error('Fehler beim Laden')
        }

        const data = await response.json()
        setWorkOrder(data.workOrder)

        // Cache entity on successful fetch
        await cacheEntityOnView('workOrder', id, data.workOrder)
      } catch (err) {
        // If offline and cached data available, use cache
        if (!isOnline && offlineCache.data) {
          setWorkOrder(offlineCache.data)
          setError(null)
        } else {
          setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
        }
      } finally {
        setLoading(false)
      }
    }

    loadWorkOrder()
  }, [id, isOnline, offlineCache.data])

  // Handle offline page load with cached data
  useEffect(() => {
    if (!isOnline && !workOrder && offlineCache.data && !offlineCache.isLoading) {
      setWorkOrder(offlineCache.data)
      setLoading(false)
    }
  }, [isOnline, workOrder, offlineCache.data, offlineCache.isLoading])

  /**
   * Handle send dialog completion
   */
  function handleSent(response: WorkOrderSendResponse) {
    // Refresh work order to get updated status
    setWorkOrder(prev => prev ? { ...prev, status: 'sent' as WorkOrderStatus } : null)
    setShowSendDialog(false)
  }

  /**
   * Download PDF
   */
  function handleDownloadPDF() {
    window.open(`/api/work-orders/${id}/pdf`, '_blank')
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mb-8" />
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !workOrder) {
    return (
      <div className="space-y-6 pb-20">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Fehler
          </h2>
          <p className="text-red-600 dark:text-red-400">
            {error || 'Arbeitsauftrag nicht gefunden'}
          </p>
          <Link
            href="/dashboard/auftraege"
            className="inline-block mt-4 text-sm text-red-700 dark:text-red-300 underline"
          >
            Zurück zur Liste
          </Link>
        </div>
      </div>
    )
  }

  const badge = getStatusBadge(workOrder.status)
  const canSend = workOrder.status === 'draft'
  const canEdit = workOrder.status === 'draft'
  const isOverdue = workOrder.acceptance_deadline &&
    new Date(workOrder.acceptance_deadline) < new Date() &&
    ['sent', 'viewed'].includes(workOrder.status)

  return (
    <div className="space-y-6 pb-20">
      <DashboardBreadcrumbs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {workOrder.title}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <StalenessIndicator cachedAt={offlineCache.cachedAt} />
          {workOrder.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {workOrder.description}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Aktionen
        </h2>
        <div className="flex flex-wrap gap-3">
          {/* Send Button */}
          {canSend && (
            <button
              onClick={() => setShowSendDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Senden
            </button>
          )}

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            PDF herunterladen
          </button>

          {/* Edit Button */}
          {canEdit && (
            <Link
              href={`/dashboard/auftraege/${id}/bearbeiten`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Bearbeiten
            </Link>
          )}
        </div>
      </div>

      {/* Partner Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Auftragnehmer
        </h2>
        {workOrder.partner ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Firma</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {workOrder.partner.company_name}
              </p>
            </div>
            {workOrder.partner.contact_name && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kontaktperson</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {workOrder.partner.contact_name}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <a
                href={`mailto:${workOrder.partner.email}`}
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {workOrder.partner.email}
              </a>
            </div>
            {workOrder.partner.phone && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Telefon</p>
                <a
                  href={`tel:${workOrder.partner.phone}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {workOrder.partner.phone}
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Kein Auftragnehmer zugewiesen</p>
        )}
      </div>

      {/* Project Link */}
      {workOrder.project && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Projekt
          </h2>
          <Link
            href={`/dashboard/projekte/${workOrder.project.id}`}
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            {workOrder.project.name}
          </Link>
        </div>
      )}

      {/* Scope of Work */}
      {workOrder.scope_of_work && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Arbeitsumfang
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {workOrder.scope_of_work}
          </p>
        </div>
      )}

      {/* Dates and Cost */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Zeitplanung & Kosten
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gewuenschter Beginn</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatDate(workOrder.requested_start_date)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gewuenschtes Ende</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatDate(workOrder.requested_end_date)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Antwort bis</p>
            <p className={`font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {formatDateTime(workOrder.acceptance_deadline)}
              {isOverdue && <span className="text-xs ml-1">(überfaellig)</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Geschaetzte Kosten</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatCost(workOrder.estimated_cost)}
            </p>
          </div>
        </div>

        {/* Contractor proposed dates/cost if available */}
        {(workOrder.proposed_start_date || workOrder.proposed_cost) && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Gegenangebot des Auftragnehmers
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Vorgeschlagener Beginn</p>
                <p className="font-medium text-orange-600 dark:text-orange-400">
                  {formatDate(workOrder.proposed_start_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Vorgeschlagenes Ende</p>
                <p className="font-medium text-orange-600 dark:text-orange-400">
                  {formatDate(workOrder.proposed_end_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Vorgeschlagene Kosten</p>
                <p className="font-medium text-orange-600 dark:text-orange-400">
                  {formatCost(workOrder.proposed_cost)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actual dates if available */}
        {(workOrder.actual_start_date || workOrder.actual_end_date || workOrder.final_cost) && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tatsaechliche Durchfuehrung
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tats. Beginn</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(workOrder.actual_start_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tats. Ende</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(workOrder.actual_end_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Endkosten</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCost(workOrder.final_cost)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Timeline */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Statusverlauf
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Erstellt:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatDateTime(workOrder.created_at)}
            </span>
          </div>
          {workOrder.viewed_at && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-gray-600 dark:text-gray-400">Angesehen:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDateTime(workOrder.viewed_at)}
              </span>
            </div>
          )}
          {workOrder.accepted_at && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Angenommen:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDateTime(workOrder.accepted_at)}
              </span>
            </div>
          )}
          {workOrder.rejected_at && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">Abgelehnt:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDateTime(workOrder.rejected_at)}
              </span>
            </div>
          )}
        </div>

        {/* Rejection reason */}
        {workOrder.rejection_reason && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Ablehnungsgrund:</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {workOrder.rejection_reason}
            </p>
          </div>
        )}

        {/* Contractor notes */}
        {workOrder.contractor_notes && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notizen des Auftragnehmers:</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {workOrder.contractor_notes}
            </p>
          </div>
        )}
      </div>

      {/* Internal Notes */}
      {workOrder.internal_notes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Interne Notizen
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            {workOrder.internal_notes}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            (nur für KEWA sichtbar)
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Metadaten
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">ID</p>
            <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
              {workOrder.id}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Zuletzt aktualisiert</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatDateTime(workOrder.updated_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div>
        <Link
          href="/dashboard/auftraege"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Zurück zur Liste
        </Link>
      </div>

      {/* Send Dialog */}
      {showSendDialog && (
        <WorkOrderSendDialog
          workOrder={workOrder}
          onSent={handleSent}
          onClose={() => setShowSendDialog(false)}
        />
      )}
    </div>
  )
}
