'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { TicketStatusBadge } from './TicketStatusBadge'
import { UrgencyBadge } from './UrgencyBadge'
import type { TicketWithDetails } from '@/types/portal'

interface TicketCardProps {
  ticket: TicketWithDetails
}

/**
 * Ticket card for list views
 * Shows ticket number, title, category, status, urgency, and unread indicator
 */
export function TicketCard({ ticket }: TicketCardProps) {
  const relativeTime = formatDistanceToNow(new Date(ticket.last_message_at || ticket.created_at), {
    addSuffix: true,
    locale: de,
  })

  return (
    <Link
      href={`/portal/tickets/${ticket.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-600">{ticket.ticket_number}</span>
          <UrgencyBadge urgency={ticket.urgency} />
        </div>
        {ticket.unread_count > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
            {ticket.unread_count}
          </span>
        )}
      </div>

      <h3 className="text-base font-medium text-gray-900 mb-1 line-clamp-2">
        {ticket.title}
      </h3>

      <p className="text-sm text-gray-600 mb-3">
        {ticket.category.display_name}
      </p>

      <div className="flex items-center justify-between">
        <TicketStatusBadge status={ticket.status} />
        <span className="text-xs text-gray-500">{relativeTime}</span>
      </div>
    </Link>
  )
}
