'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArticleCard } from '@/components/knowledge/ArticleViewer'
import { CategoryTree } from '@/components/knowledge/CategoryTree'
import { SearchBar } from '@/components/knowledge/SearchBar'
import { SearchResults } from '@/components/knowledge/SearchResults'
import type {
  KBArticleWithMeta,
  KBArticlesResponse,
  KBCategoryWithCount,
  KBCategoriesResponse,
  KBArticleStatus,
  KBSearchResult,
  KBSearchResponse,
} from '@/types/knowledge-base'

/**
 * Knowledge Base home page
 * Lists articles with filters by status and category
 * Includes category tree sidebar and search functionality
 */
function KnowledgePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const categoryIdFromUrl = searchParams.get('category_id')
  const statusFromUrl = searchParams.get('status') as KBArticleStatus | null
  const searchQuery = searchParams.get('q')

  // State
  const [articles, setArticles] = useState<KBArticleWithMeta[]>([])
  const [categories, setCategories] = useState<KBCategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchResults, setSearchResults] = useState<KBSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | KBArticleStatus>(
    statusFromUrl || 'all'
  )
  const [categoryFilter, setCategoryFilter] = useState<string>(
    categoryIdFromUrl || ''
  )

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (categoryFilter) {
        params.set('category_id', categoryFilter)
      }

      const url = `/api/knowledge${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Artikel')
      }

      const data: KBArticlesResponse = await response.json()
      setArticles(data.articles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter])

  // Fetch categories for filter dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/knowledge/categories?include_empty=true')
      if (response.ok) {
        const data: KBCategoriesResponse = await response.json()
        setCategories(data.categories)
      }
    } catch {
      // Silently fail - category filter is optional
    }
  }, [])

  // Fetch search results
  const fetchSearchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      const response = await fetch(
        `/api/knowledge/search?q=${encodeURIComponent(query)}`
      )

      if (!response.ok) {
        throw new Error('Suche fehlgeschlagen')
      }

      const data: KBSearchResponse = await response.json()
      setSearchResults(data.results)
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchCategories()
    if (searchQuery) {
      fetchSearchResults(searchQuery)
    } else {
      fetchArticles()
    }
  }, [fetchArticles, fetchCategories, fetchSearchResults, searchQuery])

  // Handle article click
  const handleArticleClick = (article: KBArticleWithMeta) => {
    router.push(`/dashboard/knowledge/${article.id}`)
  }

  // Handle search
  const handleSearch = (query: string) => {
    const params = new URLSearchParams()
    params.set('q', query)
    router.push(`/dashboard/knowledge?${params.toString()}`)
  }

  // Flatten categories for dropdown
  const flattenedCategories = categories.flatMap((cat) => [
    cat,
    ...(cat.children || []),
  ])

  // Determine if showing search results or article list
  const isSearchMode = Boolean(searchQuery)

  return (
    <div className="flex gap-6 pb-20">
      {/* Sidebar with category tree */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3">
            Kategorien
          </h2>
          <CategoryTree showEmpty={true} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link
            href="/dashboard"
            className="hover:text-gray-700 dark:hover:text-gray-300"
          >
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">
            Wissensdatenbank
          </span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Wissensdatenbank
            </h1>
            {!isSearchMode && (
              <p className="text-gray-600 dark:text-gray-400">
                {articles.length} Artikel
              </p>
            )}
          </div>
          <Button onClick={() => router.push('/dashboard/knowledge/new')}>
            Neuer Artikel
          </Button>
        </div>

        {/* Search bar */}
        <SearchBar
          initialQuery={searchQuery || ''}
          onSearch={handleSearch}
          className="max-w-xl"
        />

        {/* Search Results */}
        {isSearchMode ? (
          <SearchResults
            results={searchResults}
            query={searchQuery || ''}
            loading={searchLoading}
          />
        ) : (
          <>
            {/* Filters */}
            <div className="flex gap-3">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | KBArticleStatus)
                }
                className="h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle Status</option>
                <option value="draft">Entwurf</option>
                <option value="review">Prüfung</option>
                <option value="published">Veroeffentlicht</option>
                <option value="archived">Archiviert</option>
              </select>

              {/* Category filter (dropdown for mobile, sidebar for desktop) */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 lg:hidden h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Kategorien</option>
                {flattenedCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.level === 2 ? `  ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error state */}
            {error && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-red-500">{error}</p>
                  <button
                    onClick={fetchArticles}
                    className="mt-2 text-blue-500 underline"
                  >
                    Erneut versuchen
                  </button>
                </CardContent>
              </Card>
            )}

            {/* Loading state */}
            {loading && !error && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Articles list */}
            {!loading && !error && (
              <>
                {articles.length > 0 ? (
                  <div className="space-y-3">
                    {articles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={() => handleArticleClick(article)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        Keine Artikel gefunden
                      </p>
                      <Button
                        variant="secondary"
                        className="mt-4"
                        onClick={() => router.push('/dashboard/knowledge/new')}
                      >
                        Ersten Artikel erstellen
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* Back link */}
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Zurück zum Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </aside>
          <main className="flex-1 space-y-4">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-12 max-w-xl bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="flex gap-3">
              <div className="h-12 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-12 flex-1 lg:hidden bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
              />
            ))}
          </main>
        </div>
      }
    >
      <KnowledgePageContent />
    </Suspense>
  )
}
