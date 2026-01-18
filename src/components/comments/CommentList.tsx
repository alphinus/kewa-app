'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CommentVisibilityBadge } from './CommentVisibilityBadge'
import type { CommentWithAuthor, CommentEntityType } from '@/types/comments'

interface CommentListProps {
  entityType: CommentEntityType
  entityId: string
  className?: string
}

export function CommentList({ entityType, entityId, className }: CommentListProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/comments?entity_type=${entityType}&entity_id=${entityId}`
      )

      if (!response.ok) throw new Error('Failed to fetch comments')

      const data = await response.json()
      setComments(data.comments)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-3', className)}>
        {[1, 2].map(i => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('text-sm text-red-500', className)}>
        {error}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className={cn('text-sm text-gray-500 dark:text-gray-400 text-center py-4', className)}>
        Keine Kommentare vorhanden.
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {comments.map((comment) => (
        <div
          key={comment.id}
          className={cn(
            'p-3 rounded-lg border',
            comment.visibility === 'internal'
              ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
              : 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {comment.author_display_name}
              </span>
              <CommentVisibilityBadge visibility={comment.visibility} />
            </div>
            <time className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(comment.created_at)}
            </time>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
      ))}
    </div>
  )
}
