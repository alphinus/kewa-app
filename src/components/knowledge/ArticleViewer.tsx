'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import type { KBArticleWithMeta } from '@/types/knowledge-base'

interface ArticleViewerProps {
  article: KBArticleWithMeta
  highlightTerms?: string[]
}

/**
 * Read-only article display with Tiptap rendering
 * Displays article content, metadata, and optional search term highlighting
 */
export function ArticleViewer({ article, highlightTerms: _highlightTerms = [] }: ArticleViewerProps) {
  // TODO (Plan 18-05): Implement search term highlighting using _highlightTerms
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline hover:no-underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: article.content,
    editable: false,
    immediatelyRender: false, // CRITICAL: Prevents SSR hydration errors
  })

  if (!editor) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
      </div>
    )
  }

  return (
    <article className="space-y-6">
      {/* Article metadata header */}
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {article.title}
        </h1>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          {article.author_name && (
            <span>
              <span className="font-medium">Von:</span> {article.author_name}
            </span>
          )}
          <span>
            <span className="font-medium">Aktualisiert:</span>{' '}
            {formatDate(article.updated_at)}
          </span>
          <span>
            <span className="font-medium">Version:</span> {article.version}
          </span>
          {article.view_count > 0 && (
            <span>{article.view_count} Aufrufe</span>
          )}
        </div>

        {/* Category breadcrumb */}
        {article.category_name && (
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300">
              {article.category_name}
            </span>
          </div>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Article content */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <EditorContent
          editor={editor}
          className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400"
        />
      </div>

      {/* Visibility indicator */}
      <footer className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <VisibilityIcon visibility={article.visibility} />
          <span>{getVisibilityLabel(article.visibility)}</span>
        </div>
      </footer>
    </article>
  )
}

/**
 * Compact article card for list views
 */
interface ArticleCardProps {
  article: KBArticleWithMeta
  onClick?: () => void
}

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {article.title}
          </h3>
          {article.category_name && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {article.category_name}
            </p>
          )}
        </div>
        <StatusBadge status={article.status} />
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{formatDate(article.updated_at)}</span>
        {article.author_name && <span>{article.author_name}</span>}
      </div>
    </button>
  )
}

// Helper components
interface StatusBadgeProps {
  status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const labels = {
    draft: 'Entwurf',
    review: 'Prüfung',
    published: 'Veroeffentlicht',
    archived: 'Archiviert',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.draft}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}

function VisibilityIcon({ visibility }: { visibility: string }) {
  if (visibility === 'internal') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function getVisibilityLabel(visibility: string): string {
  const labels = {
    internal: 'Nur intern sichtbar',
    contractors: 'Nur für Handwerker sichtbar',
    both: 'Für alle sichtbar',
  }
  return labels[visibility as keyof typeof labels] || visibility
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
