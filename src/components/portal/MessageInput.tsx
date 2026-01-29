'use client'

import { useState } from 'react'
import { Paperclip, Send } from 'lucide-react'
import { toast } from 'sonner'
import { validateAttachment, uploadTicketAttachment, MAX_TICKET_PHOTOS } from '@/lib/portal/attachment-upload'

interface MessageInputProps {
  ticketId: string
  disabled?: boolean
  onSent?: () => void
}

/**
 * Message input component with text and attachment support
 * Sticky bottom bar for sending messages
 */
export function MessageInput({ ticketId, disabled, onSent }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Validate each file
    for (const file of files) {
      const validation = validateAttachment(file, 'tenant')
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }
    }

    // Check total count
    if (attachments.length + files.length > MAX_TICKET_PHOTOS) {
      toast.error(`Maximal ${MAX_TICKET_PHOTOS} Fotos erlaubt`)
      return
    }

    setAttachments((prev) => [...prev, ...files])
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() && attachments.length === 0) {
      toast.error('Bitte geben Sie eine Nachricht ein oder wählen Sie Fotos aus')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Send message
      const messageResponse = await fetch(`/api/portal/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (!messageResponse.ok) {
        throw new Error('Nachricht konnte nicht gesendet werden')
      }

      const { messageId } = await messageResponse.json()

      // 2. Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const { path } = await uploadTicketAttachment(file, ticketId, messageId)

          // Create attachment record
          await fetch(`/api/portal/tickets/${ticketId}/attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId,
              storagePath: path,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
            }),
          })
        }
      }

      // Clear form
      setContent('')
      setAttachments([])
      toast.success('Nachricht gesendet')

      // Notify parent
      onSent?.()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Fehler beim Senden der Nachricht')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (disabled) {
    return (
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <p className="text-center text-sm text-gray-500">
          Ticket geschlossen - keine neuen Nachrichten möglich
        </p>
      </div>
    )
  }

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {attachments.map((file, index) => (
            <div key={index} className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-16 h-16 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => handleRemoveAttachment(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Text input */}
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nachricht schreiben..."
            rows={1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Attachment button */}
        <label className="flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
          <Paperclip className="w-5 h-5 text-gray-600" />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isSubmitting}
          />
        </label>

        {/* Send button */}
        <button
          type="submit"
          disabled={isSubmitting || (!content.trim() && attachments.length === 0)}
          className="flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
