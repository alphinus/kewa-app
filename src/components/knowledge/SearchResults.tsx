'use client'

import Link from 'next/link'
import { FileText, Folder, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KBSearchResult } from '@/types/knowledge-base'

interface SearchResultsProps {
  results: KBSearchResult[]
  query: string
  loading?: boolean
  className?: string
}

/**
 * Format date for display (Swiss format)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Render snippet with highlighted matches.
 * Converts <mark> tags from server to styled spans.
 */
function HighlightedSnippet({ snippet }: { snippet: string }) {
  // Split by <mark> tags and render with highlights
  const parts = snippet.split(/(<mark>.*?<\/mark>)/g)

  return (
    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
      {parts.map((part, index) => {
        if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
          const text = part.slice(6, -7) // Remove <mark> and </mark>
          return (
            <mark
              key={index}
              className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-gray-100 px-0.5 rounded"
            >
              {text}
            </mark>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </p>
  )
}

/**
 * Search results list component.
 * Displays articles with highlighted snippets and metadata.
 * Shows empty state with spelling suggestions.
 */
export function SearchResults({
  results,
  query,
  loading = false,
  className,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
          >
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center',
          className
        )}
      >
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Keine Ergebnisse gefunden
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Fuer &quot;{query}&quot; wurden keine Artikel gefunden.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-2">Vorschlaege:</p>
          <ul className="list-disc list-inside text-left max-w-xs mx-auto space-y-1">
            <li>Ueberpruefen Sie die Schreibweise</li>
            <li>Verwenden Sie weniger Suchbegriffe</li>
            <li>Versuchen Sie allgemeinere Begriffe</li>
            <li>Durchsuchen Sie die Kategorien</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {results.length} {results.length === 1 ? 'Ergebnis' : 'Ergebnisse'} fuer
        &quot;{query}&quot;
      </p>

      {/* Result cards */}
      {results.map((result) => (
        <Link
          key={result.id}
          href={`/dashboard/knowledge/${result.id}`}
          className="block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
        >
          {/* Title with highlight indicator */}
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600">
            {result.title}
          </h3>

          {/* Snippet with highlights */}
          <HighlightedSnippet snippet={result.snippet} />

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
            {/* Category */}
            {result.category_name && (
              <span className="flex items-center gap-1">
                <Folder className="w-3.5 h-3.5" />
                {result.category_name}
              </span>
            )}

            {/* Author */}
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {result.author_name}
            </span>

            {/* Date */}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(result.updated_at)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
