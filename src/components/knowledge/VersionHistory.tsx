'use client'

import { useState, useEffect } from 'react'
import { Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KBArticleHistory } from '@/types/knowledge-base'

interface VersionHistoryProps {
  articleId: string
}

/**
 * Version history display for knowledge base articles.
 * Shows version timeline with expandable details.
 * German UI text.
 */
export function VersionHistory({ articleId }: VersionHistoryProps) {
  const [history, setHistory] = useState<KBArticleHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/knowledge/${articleId}/history`)
      .then(res => res.json())
      .then(data => setHistory(data.history || []))
      .catch(err => {
        console.error('Failed to load version history:', err)
      })
      .finally(() => setLoading(false))
  }, [articleId])

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Versionshistorie
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Versionshistorie
      </h3>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Keine Aenderungen</p>
      ) : (
        <ul className="space-y-1">
          {history.map(entry => (
            <li key={entry.history_id}>
              <button
                type="button"
                onClick={() =>
                  setExpandedVersion(
                    expandedVersion === entry.version ? null : entry.version
                  )
                }
                className="flex items-center gap-2 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded text-sm"
              >
                {expandedVersion === entry.version ? (
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  v{entry.version}
                </span>
                <span className="text-gray-500 dark:text-gray-400 truncate">
                  {entry.changed_by_name} - {formatDate(entry.changed_at)}
                </span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded flex-shrink-0',
                    entry.change_type === 'INSERT'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  )}
                >
                  {entry.change_type === 'INSERT' ? 'Erstellt' : 'Bearbeitet'}
                </span>
              </button>
              {expandedVersion === entry.version && (
                <div className="ml-6 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs space-y-1">
                  <p>
                    <span className="font-medium">Titel:</span> {entry.title}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    {getStatusLabel(entry.status)}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    review: 'Pruefung',
    published: 'Veroeffentlicht',
    archived: 'Archiviert',
  }
  return labels[status] || status
}
