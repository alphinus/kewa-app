'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'

interface RelatedArticle {
  id: string
  title: string
  category_name: string | null
}

interface RelatedArticlesProps {
  articleId: string
  limit?: number
}

/**
 * Related articles component for knowledge base.
 * Shows automatically suggested similar articles based on content.
 * German UI text.
 */
export function RelatedArticles({ articleId, limit = 5 }: RelatedArticlesProps) {
  const [related, setRelated] = useState<RelatedArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/knowledge/related?article_id=${articleId}&limit=${limit}`)
      .then(res => res.json())
      .then(data => setRelated(data.articles || []))
      .catch(err => {
        console.error('Failed to load related articles:', err)
      })
      .finally(() => setLoading(false))
  }, [articleId, limit])

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Verwandte Artikel
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
          <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (related.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Verwandte Artikel
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Keine verwandten Artikel
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Verwandte Artikel
      </h3>
      <ul className="space-y-1">
        {related.map(article => (
          <li key={article.id}>
            <Link
              href={`/dashboard/knowledge/${article.id}`}
              className="block p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {article.title}
              </p>
              {article.category_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {article.category_name}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
