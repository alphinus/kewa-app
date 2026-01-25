'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArticleEditor } from '@/components/knowledge/ArticleEditor'
import { getTemplateLabel } from '@/components/knowledge/TemplateSelector'
import type {
  KBArticleWithMeta,
  KBArticleResponse,
  KBArticleVisibility,
  KBArticleStatus,
  UpdateKBArticleInput,
  KBCategoryWithCount,
  KBCategoriesResponse,
} from '@/types/knowledge-base'

/**
 * Edit article page
 * Loads existing article and allows editing content, metadata, and status
 */
export default function EditArticlePage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params.id as string

  // Article state
  const [article, setArticle] = useState<KBArticleWithMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [categoryId, setCategoryId] = useState('')
  const [visibility, setVisibility] = useState<KBArticleVisibility>('internal')
  const [tagsInput, setTagsInput] = useState('')

  // UI state
  const [categories, setCategories] = useState<KBCategoryWithCount[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
      const art = data.article

      setArticle(art)
      setTitle(art.title)
      setContent(art.content)
      setCategoryId(art.category_id || '')
      setVisibility(art.visibility)
      setTagsInput(art.tags?.join(', ') || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [articleId])

  // Fetch categories
  useEffect(() => {
    fetch('/api/knowledge/categories?include_empty=true')
      .then(res => res.json())
      .then((data: KBCategoriesResponse) => setCategories(data.categories))
      .catch(() => {})
  }, [])

  // Initial load
  useEffect(() => {
    fetchArticle()
  }, [fetchArticle])

  // Handle content change
  const handleContentChange = useCallback((newContent: Record<string, unknown>) => {
    setContent(newContent)
  }, [])

  // Parse tags from comma-separated input
  const getTags = (): string[] => {
    return tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
  }

  // Handle save
  const handleSave = async (newStatus?: KBArticleStatus) => {
    if (!title.trim()) {
      setSaveError('Bitte Titel angeben')
      return
    }

    try {
      setSaving(true)
      setSaveError(null)

      const body: UpdateKBArticleInput = {
        title: title.trim(),
        content,
        category_id: categoryId || null,
        tags: getTags(),
        visibility,
      }

      if (newStatus) {
        body.status = newStatus
      }

      const response = await fetch(`/api/knowledge/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      router.push(`/dashboard/knowledge/${articleId}`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  // Flatten categories for dropdown
  const flattenedCategories = categories.flatMap(cat => [
    cat,
    ...(cat.children || []),
  ])

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

  // Get available status transitions
  const getStatusActions = () => {
    const actions: { label: string; status: KBArticleStatus; variant: 'primary' | 'secondary' | 'danger' }[] = []

    switch (article.status) {
      case 'draft':
        actions.push({ label: 'Zur Pruefung einreichen', status: 'review', variant: 'primary' })
        break
      case 'review':
        actions.push({ label: 'Veroeffentlichen', status: 'published', variant: 'primary' })
        actions.push({ label: 'Zurueck zu Entwurf', status: 'draft', variant: 'secondary' })
        break
      case 'published':
        actions.push({ label: 'Archivieren', status: 'archived', variant: 'danger' })
        break
    }

    return actions
  }

  const statusActions = getStatusActions()

  return (
    <div className="space-y-4 pb-40">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 min-h-[48px] mb-2"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            Zurueck
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Artikel bearbeiten
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {getTemplateLabel(article.template)} - Version {article.version}
          </p>
        </div>
        <StatusBadge status={article.status} />
      </div>

      {/* Error display */}
      {saveError && (
        <Card>
          <CardContent className="p-4">
            <p className="text-red-500">{saveError}</p>
          </CardContent>
        </Card>
      )}

      {/* Title */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Artikeltitel eingeben..."
              className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kategorie
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Keine Kategorie</option>
              {flattenedCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.level === 2 ? `  ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (kommagetrennt)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="z.B. wartung, anleitung, wichtig"
              className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sichtbarkeit
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="internal"
                  checked={visibility === 'internal'}
                  onChange={() => setVisibility('internal')}
                  className="w-5 h-5"
                />
                <span className="text-gray-700 dark:text-gray-300">Nur intern</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="contractors"
                  checked={visibility === 'contractors'}
                  onChange={() => setVisibility('contractors')}
                  className="w-5 h-5"
                />
                <span className="text-gray-700 dark:text-gray-300">Nur Handwerker</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="both"
                  checked={visibility === 'both'}
                  onChange={() => setVisibility('both')}
                  className="w-5 h-5"
                />
                <span className="text-gray-700 dark:text-gray-300">Alle</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content editor */}
      <Card>
        <CardContent className="p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Inhalt
          </label>
          <ArticleEditor
            initialContent={content}
            onChange={handleContentChange}
          />
        </CardContent>
      </Card>

      {/* Action buttons (sticky bottom) */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 shadow-lg">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Save button */}
          <Button
            variant="secondary"
            fullWidth
            onClick={() => handleSave()}
            loading={saving}
            disabled={saving || !title.trim()}
          >
            Aenderungen speichern
          </Button>

          {/* Status transition buttons */}
          {statusActions.length > 0 && (
            <div className="flex gap-3">
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  variant={action.variant}
                  fullWidth
                  onClick={() => handleSave(action.status)}
                  loading={saving}
                  disabled={saving || !title.trim()}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const labels = {
    draft: 'Entwurf',
    review: 'Pruefung',
    published: 'Veroeffentlicht',
    archived: 'Archiviert',
  }

  return (
    <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${styles[status as keyof typeof styles] || styles.draft}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
