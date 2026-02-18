'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { useTicketMessages } from '@/hooks/useTicketMessages'
import { MessageList } from '@/components/portal/MessageList'
import { MessageInput } from '@/components/portal/MessageInput'
import { TicketStatusBadge } from '@/components/portal/TicketStatusBadge'
import { UrgencyBadge } from '@/components/portal/UrgencyBadge'
import type { TicketWithDetails } from '@/types/portal'

/**
 * Ticket detail page with message thread
 * WhatsApp-style chat interface with real-time messages
 */
export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params?.id as string

  const [ticket, setTicket] = useState<TicketWithDetails | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, loading: messagesLoading, refetch } = useTicketMessages(ticketId)

  // Fetch ticket details and current user
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch ticket
        const ticketRes = await fetch(`/api/portal/tickets/${ticketId}`)
        if (!ticketRes.ok) {
          throw new Error('Ticket nicht gefunden')
        }
        const ticketData = await ticketRes.json()
        setTicket(ticketData.ticket)

        // Fetch current user
        const sessionRes = await fetch('/api/portal/auth/session')
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          setCurrentUserId(sessionData.userId)
        }

        // Mark messages as read
        await fetch(`/api/portal/tickets/${ticketId}/messages/read`, {
          method: 'POST',
        })
      } catch (error) {
        console.error('Error fetching ticket:', error)
        toast.error('Ticket konnte nicht geladen werden')
        router.push('/portal/tickets')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [ticketId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCancelTicket = async () => {
    if (!confirm('Möchten Sie dieses Ticket wirklich stornieren?')) {
      return
    }

    try {
      const response = await fetch(`/api/portal/tickets/${ticketId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Ticket konnte nicht storniert werden')
      }

      toast.success('Ticket storniert')
      router.push('/portal/tickets')
    } catch (error) {
      console.error('Error cancelling ticket:', error)
      toast.error('Fehler beim Stornieren des Tickets')
    }
  }

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Laden...</p>
      </div>
    )
  }

  const isClosed = ticket.status === 'geschlossen' || ticket.status === 'storniert'
  const canCancel = ticket.status === 'offen'

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{ticket.ticket_number}</h1>
            <p className="text-sm text-gray-600">{ticket.category.display_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <UrgencyBadge urgency={ticket.urgency} />
          </div>
          {canCancel && (
            <button
              onClick={handleCancelTicket}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Stornieren
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">Nachrichten werden geladen...</p>
          </div>
        ) : (
          <>
            <MessageList messages={messages} currentUserId={currentUserId} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <MessageInput
        ticketId={ticketId}
        orgId={ticket.organization_id}
        disabled={isClosed}
        onSent={refetch}
      />
    </div>
  )
}
