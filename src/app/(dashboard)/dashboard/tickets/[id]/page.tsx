'use client'

/**
 * Admin Ticket Detail Page
 *
 * Operator view for a single ticket with:
 * - Ticket details (title, description, status, urgency)
 * - Message thread with tenant
 * - Attachments gallery
 * - Conversion to work order button
 *
 * Path: /dashboard/tickets/[id]
 * Phase 29: Tenant Extras & UX Improvements
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowLeft, RefreshCw, ArrowRightLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TicketConvertDialog } from '@/components/admin/TicketConvertDialog'
import { TicketStatusBadge } from '@/components/portal/TicketStatusBadge'
import { UrgencyBadge } from '@/components/portal/UrgencyBadge'
import type { Ticket, TicketMessageWithAttachments } from '@/types/portal'

interface PageProps {
  params: Promise<{ id: string }>
}

interface TicketDetail extends Ticket {
  category: { id: string; name: string; display_name: string }
  unit: {
    id: string
    name: string
    building: { id: string; name: string; address?: string }
  }
  tenant: { id: string; display_name: string; email: string }
  message_count: number
  unread_message_count: number
}

interface FetchResponse {
  ticket: TicketDetail
  messages: TicketMessageWithAttachments[]
  attachments: {
    id: string
    storage_path: string
    file_name: string
    file_size: number | null
    mime_type: string | null
    created_at: string
  }[]
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminTicketDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [messages, setMessages] = useState<TicketMessageWithAttachments[]>([])
  const [attachments, setAttachments] = useState<FetchResponse['attachments']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  useEffect(() => {
    loadTicket()
  }, [id])

  async function loadTicket() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/tickets/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Ticket nicht gefunden')
        }
        throw new Error('Fehler beim Laden des Tickets')
      }

      const data: FetchResponse = await res.json()
      setTicket(data.ticket)
      setMessages(data.messages || [])
      setAttachments(data.attachments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  async function handleConvert(data: {
    work_order_type: string
    partner_id: string
    description?: string
  }) {
    const res = await fetch(`/api/admin/tickets/${id}/convert-to-wo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error || 'Umwandlung fehlgeschlagen')
    }

    const result = await res.json()
    toast.success('Ticket erfolgreich umgewandelt')
    router.push(`/dashboard/auftraege/${result.workOrder.id}`)
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
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !ticket) {
    return (
      <div className="space-y-6 pb-20">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Fehler
          </h2>
          <p className="text-red-600 dark:text-red-400">
            {error || 'Ticket nicht gefunden'}
          </p>
          <Link
            href="/dashboard/tickets"
            className="inline-block mt-4 text-sm text-red-700 dark:text-red-300 underline"
          >
            Zurueck zur Liste
          </Link>
        </div>
      </div>
    )
  }

  const canConvert =
    !ticket.converted_to_wo_id &&
    ['offen', 'in_bearbeitung'].includes(ticket.status)
  const isConverted = !!ticket.converted_to_wo_id

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/dashboard"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/tickets"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Tickets
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">
          {ticket.ticket_number}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {ticket.ticket_number}
            </h1>
            <TicketStatusBadge status={ticket.status} />
            <UrgencyBadge urgency={ticket.urgency} />
            {isConverted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" />
                Umgewandelt
              </span>
            )}
          </div>
          <h2 className="text-lg text-gray-700 dark:text-gray-300 mt-1">
            {ticket.title}
          </h2>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadTicket}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {canConvert && (
            <Button onClick={() => setShowConvertDialog(true)}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              In Arbeitsauftrag umwandeln
            </Button>
          )}
        </div>
      </div>

      {/* Conversion message */}
      {isConverted && ticket.conversion_message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">
            {ticket.conversion_message}
          </p>
          {ticket.converted_to_wo_id && (
            <Link
              href={`/dashboard/auftraege/${ticket.converted_to_wo_id}`}
              className="text-sm text-green-700 dark:text-green-300 underline mt-2 inline-block"
            >
              Zum Arbeitsauftrag
            </Link>
          )}
        </div>
      )}

      {/* Ticket Details */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kategorie</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {ticket.category.display_name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Liegenschaft</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {ticket.unit.building.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Einheit</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {ticket.unit.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mieter</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {ticket.tenant.display_name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {ticket.tenant.email}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Erstellt</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {formatDateTime(ticket.created_at)}
            </p>
          </div>
          {ticket.closed_at && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Geschlossen</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatDateTime(ticket.closed_at)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Beschreibung
        </h3>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {ticket.description}
        </p>
      </div>

      {/* Initial Attachments */}
      {attachments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Anhaenge ({attachments.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <img
                    src={`/api/media/${att.storage_path}`}
                    alt={att.file_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {att.file_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Nachrichten ({messages.length})
        </h3>
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-lg ${
                  msg.sender_type === 'operator'
                    ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                    : 'bg-gray-50 dark:bg-gray-800 mr-8'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {msg.sender_type === 'operator' ? 'KEWA Team' : ticket.tenant.display_name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {msg.content}
                </p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {msg.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="w-16 h-16 rounded border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        <img
                          src={`/api/media/${att.storage_path}`}
                          alt={att.file_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            Noch keine Nachrichten
          </p>
        )}
      </div>

      {/* Back link */}
      <div>
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurueck zur Liste
        </Link>
      </div>

      {/* Convert Dialog */}
      {showConvertDialog && ticket && (
        <TicketConvertDialog
          ticket={ticket}
          open={showConvertDialog}
          onOpenChange={setShowConvertDialog}
          onConvert={handleConvert}
        />
      )}
    </div>
  )
}
