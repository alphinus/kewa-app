'use client'

import { format, parseISO } from 'date-fns'
import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TicketMessageWithAttachments, MessageSenderType } from '@/types/portal'
import { getAttachmentUrl } from '@/lib/portal/attachment-upload'

interface MessageBubbleProps {
  message: TicketMessageWithAttachments
  currentUserId: string
}

/**
 * Chat bubble component with timestamps and read indicators
 * Tenant messages: right-aligned, blue background
 * Operator messages: left-aligned, white background
 */
export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const isOwnMessage = message.created_by === currentUserId
  const time = format(parseISO(message.created_at), 'HH:mm')

  return (
    <div
      className={cn(
        'flex',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isOwnMessage
            ? 'bg-blue-500 text-white rounded-tr-sm'
            : 'bg-white text-gray-900 rounded-tl-sm shadow-sm border border-gray-100'
        )}
      >
        {/* Sender name (for operator messages) */}
        {!isOwnMessage && (
          <p className="text-xs font-medium text-gray-600 mb-1">
            {message.sender.display_name}
          </p>
        )}

        {/* Message content */}
        <p className="text-base whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={getAttachmentUrl(attachment.storage_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={getAttachmentUrl(attachment.storage_path)}
                  alt={attachment.file_name}
                  className="rounded-lg max-w-full h-auto"
                />
              </a>
            ))}
          </div>
        )}

        {/* Time and read status */}
        <div className="flex items-center gap-1 justify-end mt-1">
          <span
            className={cn(
              'text-xs',
              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
            )}
          >
            {time}
          </span>
          {isOwnMessage && (
            message.read_at ? (
              <CheckCheck className="w-4 h-4 text-blue-100" />
            ) : (
              <Check className="w-4 h-4 text-blue-100" />
            )
          )}
        </div>
      </div>
    </div>
  )
}
