/**
 * Contractor Portal Knowledge Base
 *
 * Lists contractor-visible articles (visibility IN ('contractors', 'both'))
 * Simplified UI without internal metadata per CONTEXT.md
 *
 * Features:
 * - Search with contractor visibility filter
 * - Category filtering
 * - German UI
 */

import Link from 'next/link'
import { validateContractorAccess } from '@/lib/magic-link'
import { createClient } from '@/lib/supabase/server'
import TokenError from '../token-error'
import RequestLinkForm from '../request-link-form'
import type { KBArticleWithMeta, KBCategoryWithCount } from '@/types/knowledge-base'

interface ContractorKnowledgePageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function ContractorKnowledgePage({
  params,
  searchParams,
}: ContractorKnowledgePageProps) {
  const { token } = await params
  const { category: categoryFilter, q: searchQuery } = await searchParams

  // Validate contractor token
  const validation = await validateContractorAccess(token)

  if (!validation.valid) {
    if (validation.error === 'expired' || validation.error === 'work_order_closed') {
      return <RequestLinkForm error={validation.error} />
    }
    return <TokenError error={validation.error ?? 'not_found'} />
  }

  const supabase = await createClient()

  // Fetch contractor-visible articles
  let articlesQuery = supabase
    .from('kb_articles')
    .select(`
      id,
      title,
      status,
      visibility,
      category_id,
      tags,
      updated_at,
      category:kb_categories (
        id,
        name
      )
    `)
    .eq('status', 'published')
    .in('visibility', ['contractors', 'both'])
    .order('updated_at', { ascending: false })

  // Apply category filter
  if (categoryFilter) {
    articlesQuery = articlesQuery.eq('category_id', categoryFilter)
  }

  // Apply search filter (simple title/tags search for contractors)
  if (searchQuery) {
    articlesQuery = articlesQuery.or(
      `title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`
    )
  }

  const { data: articles } = await articlesQuery

  // Fetch categories that have contractor-visible articles
  const { data: categories } = await supabase
    .from('kb_categories')
    .select(`
      id,
      name,
      level,
      parent_id,
      sort_order
    `)
    .order('sort_order', { ascending: true })

  // Transform articles (Supabase returns single relation as object but types as array)
  const transformedArticles: Pick<
    KBArticleWithMeta,
    'id' | 'title' | 'category_id' | 'category_name' | 'tags'
  >[] = (articles || []).map((article) => {
    const categoryData = article.category as unknown as { id: string; name: string } | null
    return {
      id: article.id,
      title: article.title,
      category_id: article.category_id,
      category_name: categoryData?.name || null,
      tags: (article.tags || []) as string[],
    }
  })

  // Transform categories
  const transformedCategories: Pick<
    KBCategoryWithCount,
    'id' | 'name' | 'level' | 'parent_id'
  >[] = (categories || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    level: cat.level,
    parent_id: cat.parent_id,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Wissensdatenbank</h2>
        <p className="text-sm text-gray-600 mt-1">
          FAQs und Anleitungen für Handwerker
        </p>
      </div>

      {/* Search */}
      <form method="GET" className="relative">
        <input type="hidden" name="category" value={categoryFilter || ''} />
        <input
          type="text"
          name="q"
          defaultValue={searchQuery || ''}
          placeholder="Artikel suchen..."
          className="w-full h-12 px-4 pr-12 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
          aria-label="Suchen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </form>

      {/* Category Filter */}
      {transformedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/contractor/${token}/knowledge${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              !categoryFilter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alle
          </Link>
          {transformedCategories
            .filter((cat) => cat.level === 1)
            .map((category) => (
              <Link
                key={category.id}
                href={`/contractor/${token}/knowledge?category=${category.id}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  categoryFilter === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </Link>
            ))}
        </div>
      )}

      {/* Search results indicator */}
      {searchQuery && (
        <div className="text-sm text-gray-600">
          Suchergebnisse für &quot;{searchQuery}&quot;
          <Link
            href={`/contractor/${token}/knowledge${categoryFilter ? `?category=${categoryFilter}` : ''}`}
            className="ml-2 text-blue-600 underline"
          >
            Suche löschen
          </Link>
        </div>
      )}

      {/* Article List */}
      {transformedArticles.length > 0 ? (
        <ul className="space-y-3">
          {transformedArticles.map((article) => (
            <li key={article.id}>
              <Link
                href={`/contractor/${token}/knowledge/${article.id}`}
                className="block p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <h3 className="font-medium text-gray-900">{article.title}</h3>
                {article.category_name && (
                  <p className="text-sm text-gray-500 mt-1">
                    {article.category_name}
                  </p>
                )}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-500">
            {searchQuery ? 'Keine Artikel gefunden' : 'Noch keine Artikel vorhanden'}
          </p>
        </div>
      )}

      {/* Back to dashboard */}
      <div className="pt-4 border-t border-gray-200">
        <Link
          href={`/contractor/${token}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Zurück zu meinen Aufträgen
        </Link>
      </div>
    </div>
  )
}
