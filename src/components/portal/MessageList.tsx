'use client'

import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { MessageBubble } from './MessageBubble'
import type { TicketMessageWithAttachments } from '@/types/portal'

interface MessageListProps {
  messages: TicketMessageWithAttachments[]
  currentUserId: string
}

/**
 * Message list with date grouping
 * Groups messages by: "Heute", "Gestern", "DD.MM.YYYY"
 */
export function MessageList({ messages, currentUserId }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Noch keine Nachrichten
      </div>
    )
  }

  // Group messages by date
  const grouped = groupMessagesByDate(messages)

  return (
    <div className="space-y-6 px-4">
      {Object.entries(grouped).map(([dateLabel, msgs]) => (
        <div key={dateLabel}>
          {/* Date separator */}
          <div className="flex justify-center my-4">
            <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              {dateLabel}
            </span>
          </div>

          {/* Messages for this date */}
          <div className="space-y-2">
            {msgs.map((msg) => (
              <MessageBubble key={msg.id} message={msg} currentUserId={currentUserId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Group messages by date with German labels
 */
function groupMessagesByDate(messages: TicketMessageWithAttachments[]) {
  const groups: Record<string, TicketMessageWithAttachments[]> = {}

  messages.forEach((msg) => {
    const date = parseISO(msg.created_at)
    let label: string

    if (isToday(date)) {
      label = 'Heute'
    } else if (isYesterday(date)) {
      label = 'Gestern'
    } else {
      label = format(date, 'dd.MM.yyyy', { locale: de })
    }

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(msg)
  })

  return groups
}
