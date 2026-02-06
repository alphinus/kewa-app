'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Pin, PinOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VersionHistory } from '@/components/knowledge/VersionHistory'
import { RelatedArticles } from '@/components/knowledge/RelatedArticles'

const ArticleViewer = dynamic(
  () => import('@/components/knowledge/ArticleViewer').then(mod => mod.ArticleViewer),
  {
    loading: () => (
      <div className="prose max-w-none animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
    ),
    ssr: false
  }
)
import type { KBArticleWithMeta, KBArticleResponse } from '@/types/knowledge-base'

/**
 * View article page
 * Displays article content with metadata, version history, related articles, and actions
 */
export default function ArticleViewPage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params.id as string

  // State
  const [article, setArticle] = useState<KBArticleWithMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

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

  // Check if article is pinned
  const checkPinned = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge/shortcuts')
      if (res.ok) {
        const data = await res.json()
        const isPinnedArticle = (data.shortcuts || []).some(
          (s: { article_id: string }) => s.article_id === articleId
        )
        setIsPinned(isPinnedArticle)
      }
    } catch {
      // Ignore errors
    }
  }, [articleId])

  // Initial load
  useEffect(() => {
    fetchArticle()
    checkPinned()
  }, [fetchArticle, checkPinned])

  // Toggle pin state
  const togglePin = async () => {
    setPinLoading(true)
    try {
      if (isPinned) {
        const res = await fetch(`/api/knowledge/${articleId}/pin`, { method: 'DELETE' })
        if (res.ok) {
          setIsPinned(false)
        }
      } else {
        const res = await fetch(`/api/knowledge/${articleId}/pin`, { method: 'POST' })
        if (res.ok) {
          setIsPinned(true)
        }
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err)
    } finally {
      setPinLoading(false)
    }
  }

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
      {/* Header with back button and pin action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 min-h-[48px]"
        >
          <ChevronLeftIcon className="w-5 h-5 mr-1" />
          Zurueck
        </button>

        <button
          onClick={togglePin}
          disabled={pinLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors min-h-[48px] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          aria-label={isPinned ? 'Vom Dashboard entfernen' : 'Zum Dashboard hinzufuegen'}
        >
          {isPinned ? (
            <>
              <PinOff className="w-4 h-4" />
              <span className="hidden sm:inline">Entfernen</span>
            </>
          ) : (
            <>
              <Pin className="w-4 h-4" />
              <span className="hidden sm:inline">Anpinnen</span>
            </>
          )}
        </button>
      </div>

      {/* Article content */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <ArticleViewer article={article} />
        </CardContent>
      </Card>

      {/* Related articles */}
      <Card>
        <CardContent className="p-4">
          <RelatedArticles articleId={articleId} />
        </CardContent>
      </Card>

      {/* Version history */}
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
