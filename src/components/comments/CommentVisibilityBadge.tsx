import { cn } from '@/lib/utils'
import type { CommentVisibility } from '@/types/comments'

const VISIBILITY_STYLES: Record<CommentVisibility, string> = {
  internal: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  shared: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
}

const VISIBILITY_LABELS: Record<CommentVisibility, string> = {
  internal: 'Intern',
  shared: 'Geteilt'
}

interface CommentVisibilityBadgeProps {
  visibility: CommentVisibility
  size?: 'sm' | 'md'
  className?: string
}

export function CommentVisibilityBadge({
  visibility,
  size = 'sm',
  className
}: CommentVisibilityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        VISIBILITY_STYLES[visibility],
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      {visibility === 'internal' && (
        <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
      {VISIBILITY_LABELS[visibility]}
    </span>
  )
}
