'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CommentEntityType, CommentVisibility } from '@/types/comments'

interface CommentFormProps {
  entityType: CommentEntityType
  entityId: string
  canSetVisibility?: boolean // KEWA can choose visibility
  onCommentAdded?: () => void
  className?: string
}

export function CommentForm({
  entityType,
  entityId,
  canSetVisibility = false,
  onCommentAdded,
  className
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<CommentVisibility>('internal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) return

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          content: content.trim(),
          visibility: canSetVisibility ? visibility : 'shared'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      setContent('')
      onCommentAdded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-3', className)}>
      {error && (
        <div className="p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Kommentar schreiben..."
        rows={3}
        className={cn(
          'w-full px-3 py-2 rounded-lg border',
          'border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800',
          'text-gray-900 dark:text-gray-100',
          'placeholder-gray-400 dark:placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'resize-none'
        )}
      />

      <div className="flex items-center justify-between">
        {canSetVisibility && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'internal'}
                onChange={() => setVisibility('internal')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Intern</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'shared'}
                onChange={() => setVisibility('shared')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Geteilt</span>
            </label>
          </div>
        )}

        <Button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          loading={isSubmitting}
          size="sm"
        >
          Kommentieren
        </Button>
      </div>
    </form>
  )
}
