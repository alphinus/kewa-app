'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { KBAttachmentWithUrl, KBAttachmentsResponse } from '@/types/knowledge-base'

interface AttachmentListProps {
  articleId: string
  canDelete?: boolean
  onRefresh?: () => void
  refreshTrigger?: number
}

/**
 * Displays list of attachments for an article with download links and delete option
 */
export function AttachmentList({
  articleId,
  canDelete = false,
  refreshTrigger = 0,
}: AttachmentListProps) {
  const [attachments, setAttachments] = useState<KBAttachmentWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/knowledge/${articleId}/attachments`)
      if (!res.ok) {
        throw new Error('Fehler beim Laden der Anhaenge')
      }

      const data: KBAttachmentsResponse = await res.json()
      setAttachments(data.attachments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [articleId])

  // Initial load and refresh on trigger change
  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments, refreshTrigger])

  // Handle delete
  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Anhang wirklich loeschen?')) return

    try {
      setDeletingId(attachmentId)
      const res = await fetch(
        `/api/knowledge/${articleId}/attachments?attachmentId=${attachmentId}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Loeschen fehlgeschlagen')
      }

      // Remove from local state
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Loeschen fehlgeschlagen')
    } finally {
      setDeletingId(null)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchAttachments}
          className="mt-2 text-sm text-blue-600 dark:text-blue-400 underline"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  // Empty state
  if (attachments.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <FileIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
        <p>Keine Anhaenge vorhanden</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          canDelete={canDelete}
          onDelete={() => handleDelete(attachment.id)}
          deleting={deletingId === attachment.id}
        />
      ))}
    </div>
  )
}

interface AttachmentItemProps {
  attachment: KBAttachmentWithUrl
  canDelete: boolean
  onDelete: () => void
  deleting: boolean
}

function AttachmentItem({ attachment, canDelete, onDelete, deleting }: AttachmentItemProps) {
  const isImage = attachment.mime_type.startsWith('image/')
  const isPdf = attachment.mime_type === 'application/pdf'

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Thumbnail/Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
        {isImage && attachment.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.url}
            alt={attachment.file_name}
            className="w-full h-full object-cover"
          />
        ) : isPdf ? (
          <PdfIcon className="w-6 h-6 text-red-500" />
        ) : (
          <DocIcon className="w-6 h-6 text-blue-500" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
          {attachment.file_name}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-xs">
          {formatFileSize(attachment.file_size)}
          {attachment.description && ` - ${attachment.description}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Download link */}
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          download={attachment.file_name}
          className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          title="Herunterladen"
        >
          <DownloadIcon className="w-5 h-5" />
        </a>

        {/* Delete button */}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Loeschen"
          >
            {deleting ? (
              <LoadingSpinner className="w-5 h-5" />
            ) : (
              <TrashIcon className="w-5 h-5" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// Utility function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Icons
function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 16a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </svg>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
