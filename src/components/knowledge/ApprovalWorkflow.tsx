'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { KBArticleStatus } from '@/types/knowledge-base'

interface ApprovalWorkflowProps {
  articleId: string
  currentStatus: KBArticleStatus
  isAuthor: boolean
  isAdmin: boolean
  onStatusChange?: (newStatus: KBArticleStatus) => void
}

/**
 * Workflow controls for article status transitions
 *
 * Valid transitions:
 * - draft -> review (author only)
 * - draft -> archived (author only)
 * - review -> published (admin only)
 * - review -> draft (admin only, with comment)
 * - published -> archived (admin only)
 */
export function ApprovalWorkflow({
  articleId,
  currentStatus,
  isAuthor,
  isAdmin,
  onStatusChange,
}: ApprovalWorkflowProps) {
  const [loading, setLoading] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const changeStatus = async (newStatus: KBArticleStatus, comment?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/knowledge/${articleId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, comment }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Statusaenderung fehlgeschlagen')
      }
      onStatusChange?.(newStatus)
      setShowRejectInput(false)
      setRejectComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Statusaenderung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = () => {
    if (!rejectComment.trim()) {
      setError('Bitte geben Sie einen Ablehnungsgrund an')
      return
    }
    changeStatus('draft', rejectComment.trim())
  }

  return (
    <div className="space-y-4">
      {/* Status badge and actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={currentStatus} />

        {/* Draft -> Review (author only) */}
        {currentStatus === 'draft' && isAuthor && (
          <Button
            size="sm"
            onClick={() => changeStatus('review')}
            disabled={loading}
            loading={loading}
          >
            <SendIcon className="w-4 h-4 mr-2" />
            Zur Pruefung einreichen
          </Button>
        )}

        {/* Draft -> Archived (author only) */}
        {currentStatus === 'draft' && isAuthor && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => changeStatus('archived')}
            disabled={loading}
          >
            <ArchiveIcon className="w-4 h-4 mr-2" />
            Archivieren
          </Button>
        )}

        {/* Review -> Published (admin only) */}
        {currentStatus === 'review' && isAdmin && (
          <Button
            size="sm"
            onClick={() => changeStatus('published')}
            disabled={loading}
            loading={loading}
          >
            <CheckIcon className="w-4 h-4 mr-2" />
            Genehmigen
          </Button>
        )}

        {/* Review -> Draft (admin only, shows reject input) */}
        {currentStatus === 'review' && isAdmin && !showRejectInput && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowRejectInput(true)}
            disabled={loading}
          >
            <XIcon className="w-4 h-4 mr-2" />
            Ablehnen
          </Button>
        )}

        {/* Published -> Archived (admin only) */}
        {currentStatus === 'published' && isAdmin && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => changeStatus('archived')}
            disabled={loading}
          >
            <ArchiveIcon className="w-4 h-4 mr-2" />
            Archivieren
          </Button>
        )}
      </div>

      {/* Reject comment input (shown when admin clicks Ablehnen) */}
      {showRejectInput && (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ablehnungsgrund
            </span>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Bitte geben Sie einen Grund fuer die Ablehnung an..."
              className="mt-1 w-full p-3 border rounded-lg resize-none dark:bg-gray-900 dark:border-gray-700"
              rows={3}
              disabled={loading}
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleReject}
              disabled={loading || !rejectComment.trim()}
              loading={loading}
            >
              Ablehnung bestaetigen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowRejectInput(false)
                setRejectComment('')
                setError(null)
              }}
              disabled={loading}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Status badge component showing current workflow state
 */
export function StatusBadge({ status }: { status: KBArticleStatus }) {
  const styles: Record<KBArticleStatus, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  const labels: Record<KBArticleStatus, string> = {
    draft: 'Entwurf',
    review: 'In Pruefung',
    published: 'Veroeffentlicht',
    archived: 'Archiviert',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

// Icons
function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  )
}
