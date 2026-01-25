'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArticleViewer } from '@/components/knowledge/ArticleViewer'
import { VersionHistory } from '@/components/knowledge/VersionHistory'
import type { KBArticleWithMeta, KBArticleResponse } from '@/types/knowledge-base'

/**
 * View article page
 * Displays article content with metadata and edit button
 */
export default function ArticleViewPage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params.id as string

  // State
  const [article, setArticle] = useState<KBArticleWithMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch article
  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/knowledge/${articleId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Artikel nicht gefunden')
        }
        throw new Error('Fehler beim Laden des Artikels')
      }

      const data: KBArticleResponse = await response.json()
      setArticle(data.article)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [articleId])

  // Initial load
  useEffect(() => {
    fetchArticle()
  }, [fetchArticle])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  // Error state
  if (error || !article) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">{error || 'Artikel nicht gefunden'}</p>
            <button
              onClick={() => router.push('/dashboard/knowledge')}
              className="mt-4 text-blue-500 underline"
            >
              Zurueck zur Uebersicht
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 min-h-[48px]"
      >
        <ChevronLeftIcon className="w-5 h-5 mr-1" />
        Zurueck
      </button>

      {/* Article content */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <ArticleViewer article={article} />
        </CardContent>
      </Card>

      {/* Version history sidebar */}
      <Card>
        <CardContent className="p-4">
          <VersionHistory articleId={articleId} />
        </CardContent>
      </Card>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 shadow-lg">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => router.push(`/dashboard/knowledge/${articleId}/edit`)}
          >
            Bearbeiten
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => router.push('/dashboard/knowledge')}
          >
            Zur Uebersicht
          </Button>
        </div>
      </div>
    </div>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
