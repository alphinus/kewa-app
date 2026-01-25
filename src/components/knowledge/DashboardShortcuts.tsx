'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Pin, X } from 'lucide-react'
import type { KBDashboardShortcut } from '@/types/knowledge-base'

/**
 * Dashboard shortcuts widget for pinned knowledge base articles.
 * Displays user's pinned articles with quick access links.
 * German UI text.
 */
export function DashboardShortcuts() {
  const [shortcuts, setShortcuts] = useState<KBDashboardShortcut[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/knowledge/shortcuts')
      .then(res => res.json())
      .then(data => setShortcuts(data.shortcuts || []))
      .catch(err => {
        console.error('Failed to load shortcuts:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  const removeShortcut = async (articleId: string) => {
    try {
      const res = await fetch(`/api/knowledge/${articleId}/pin`, { method: 'DELETE' })
      if (res.ok) {
        setShortcuts(shortcuts.filter(s => s.article_id !== articleId))
      }
    } catch (err) {
      console.error('Failed to remove shortcut:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Pin className="w-4 h-4" />
          Angepinnte Artikel
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
    )
  }

  // Don't render if no shortcuts
  if (shortcuts.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Pin className="w-4 h-4" />
        Angepinnte Artikel
      </h3>
      <ul className="space-y-1">
        {shortcuts.map(shortcut => (
          <li
            key={shortcut.id}
            className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 group"
          >
            <Link
              href={`/dashboard/knowledge/${shortcut.article_id}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex-1 truncate"
            >
              {shortcut.article?.title || 'Unbekannter Artikel'}
            </Link>
            <button
              type="button"
              onClick={() => removeShortcut(shortcut.article_id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              aria-label="Shortcut entfernen"
            >
              <X className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
