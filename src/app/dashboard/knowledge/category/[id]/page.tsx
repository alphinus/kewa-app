/**
 * Knowledge Base Category Page
 *
 * Server component showing articles in a specific category.
 * Features:
 * - Category info with breadcrumb
 * - Article list (most recent first)
 * - Sidebar with category tree
 * - Search bar at top
 *
 * Path: /dashboard/knowledge/category/[id]
 * Phase 18-03: Category Navigation & Search
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { createPublicClient } from '@/lib/supabase/with-org'
import { validateSessionWithRBAC, SESSION_COOKIE_NAME } from '@/lib/session'
import { CategoryTree } from '@/components/knowledge/CategoryTree'
import { SearchBar } from '@/components/knowledge/SearchBar'
import { FileText, Calendar, User, Eye, ChevronRight } from 'lucide-react'
import type { KBArticleWithMeta } from '@/types/knowledge-base'

interface PageProps {
  params: Promise<{ id: string }>
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
 * Get status badge styling
 */
function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'draft':
      return {
        label: 'Entwurf',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      }
    case 'review':
      return {
        label: 'In Prüfung',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      }
    case 'published':
      return {
        label: 'Veroeffentlicht',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      }
    case 'archived':
      return {
        label: 'Archiviert',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      }
    default:
      return {
        label: status,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      }
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { id } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    notFound()
  }

  // Get user session from cookies
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    redirect('/login')
  }

  // Validate session with RBAC
  const session = await validateSessionWithRBAC(sessionCookie.value)
  if (!session) {
    redirect('/login')
  }

  const isAdmin = session.roleName === 'admin'

  // Fetch category with articles
  const supabase = await createPublicClient()

  // Fetch category
  const { data: category, error: categoryError } = await supabase
    .from('kb_categories')
    .select('id, name, description, icon, parent_id, path, level')
    .eq('id', id)
    .single()

  if (categoryError || !category) {
    notFound()
  }

  // Fetch parent name if exists
  let parentName: string | null = null
  if (category.parent_id) {
    const { data: parent } = await supabase
      .from('kb_categories')
      .select('name')
      .eq('id', category.parent_id)
      .single()
    parentName = parent?.name || null
  }

  // Fetch articles in this category
  let articlesQuery = supabase
    .from('kb_articles')
    .select(`
      *,
      author:users!kb_articles_author_id_fkey (
        id,
        display_name
      ),
      category:kb_categories (
        id,
        name
      )
    `)
    .eq('category_id', id)
    .order('updated_at', { ascending: false })

  // Non-admin users only see published articles
  if (!isAdmin) {
    articlesQuery = articlesQuery.eq('status', 'published')
  }

  const { data: articlesData, error: articlesError } = await articlesQuery

  if (articlesError) {
    console.error('Error fetching category articles:', articlesError)
  }

  // Transform articles
  const articles: KBArticleWithMeta[] = (articlesData || []).map((article) => ({
    id: article.id,
    title: article.title,
    content: article.content,
    template: article.template,
    status: article.status,
    visibility: article.visibility,
    category_id: article.category_id,
    tags: article.tags || [],
    author_id: article.author_id,
    last_reviewed_at: article.last_reviewed_at,
    expiry_date: article.expiry_date,
    view_count: article.view_count,
    version: article.version,
    created_at: article.created_at,
    updated_at: article.updated_at,
    updated_by: article.updated_by,
    author_name: article.author?.display_name || 'Unknown',
    category_name: article.category?.name || null,
  }))

  return (
    <div className="flex gap-6 pb-20">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3">
            Kategorien
          </h2>
          <CategoryTree selectedCategoryId={id} showEmpty={isAdmin} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-6">
        <DashboardBreadcrumbs />

        {/* Search bar */}
        <SearchBar className="max-w-xl" />

        {/* Category header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {category.description}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {articles.length} {articles.length === 1 ? 'Artikel' : 'Artikel'}
          </p>
        </div>

        {/* Articles list */}
        {articles.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Keine Artikel in dieser Kategorie
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {isAdmin
                ? 'Erstellen Sie den ersten Artikel in dieser Kategorie.'
                : 'Es wurden noch keine Artikel in dieser Kategorie veroeffentlicht.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Titel
                    </th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Autor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aktualisiert
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aufrufe
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {articles.map((article) => {
                    const badge = getStatusBadge(article.status)
                    return (
                      <tr
                        key={article.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-4">
                          <Link
                            href={`/dashboard/knowledge/${article.id}`}
                            className="block"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400">
                              {article.title}
                            </div>
                            {article.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {article.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {article.tags.length > 3 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    +{article.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </Link>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {article.author_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(article.updated_at)}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-gray-600 dark:text-gray-400">
                          <span className="flex items-center justify-end gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {article.view_count}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {articles.map((article) => {
                const badge = getStatusBadge(article.status)
                return (
                  <Link
                    key={article.id}
                    href={`/dashboard/knowledge/${article.id}`}
                    className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {article.title}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {article.author_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(article.updated_at)}
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <span
                          className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Back link */}
        <div>
          <Link
            href="/dashboard/knowledge"
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
            Zurück zur Wissensdatenbank
          </Link>
        </div>
      </main>
    </div>
  )
}
