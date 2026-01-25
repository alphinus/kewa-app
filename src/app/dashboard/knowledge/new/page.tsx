'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArticleEditor } from '@/components/knowledge/ArticleEditor'
import { TemplateSelector, getTemplateContent } from '@/components/knowledge/TemplateSelector'
import type {
  KBArticleTemplate,
  KBArticleVisibility,
  CreateKBArticleInput,
  KBCategoryWithCount,
  KBCategoriesResponse,
} from '@/types/knowledge-base'
import { useEffect } from 'react'

/**
 * Create new article page
 * User selects template, then fills in title, content, category, tags, visibility
 */
export default function NewArticlePage() {
  const router = useRouter()

  // Form state
  const [template, setTemplate] = useState<KBArticleTemplate | undefined>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [categoryId, setCategoryId] = useState('')
  const [visibility, setVisibility] = useState<KBArticleVisibility>('internal')
  const [tagsInput, setTagsInput] = useState('')

  // UI state
  const [categories, setCategories] = useState<KBCategoryWithCount[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch categories
  useEffect(() => {
    fetch('/api/knowledge/categories?include_empty=true')
      .then(res => res.json())
      .then((data: KBCategoriesResponse) => setCategories(data.categories))
      .catch(() => {})
  }, [])

  // Handle template selection
  const handleTemplateSelect = useCallback((selectedTemplate: KBArticleTemplate) => {
    setTemplate(selectedTemplate)
    setContent(getTemplateContent(selectedTemplate))
  }, [])

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
  const handleSave = async (submitForReview: boolean = false) => {
    if (!template || !title.trim()) {
      setError('Bitte Artikeltyp und Titel angeben')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const body: CreateKBArticleInput = {
        title: title.trim(),
        content,
        template,
        category_id: categoryId || undefined,
        tags: getTags(),
        visibility,
      }

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      const data = await response.json()
      const articleId = data.article.id

      // If submitting for review, update status
      if (submitForReview) {
        await fetch(`/api/knowledge/${articleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'review' }),
        })
      }

      router.push(`/dashboard/knowledge/${articleId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  // Flatten categories for dropdown
  const flattenedCategories = categories.flatMap(cat => [
    cat,
    ...(cat.children || []),
  ])

  return (
    <div className="space-y-4 pb-24">
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
            Neuer Artikel
          </h1>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Template selection */}
      {!template && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <TemplateSelector
              value={template}
              onChange={handleTemplateSelect}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Article form (after template selected) */}
      {template && (
        <>
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
            <div className="max-w-lg mx-auto flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleSave(false)}
                loading={saving}
                disabled={saving || !title.trim()}
              >
                Als Entwurf speichern
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => handleSave(true)}
                loading={saving}
                disabled={saving || !title.trim()}
              >
                Zur Pruefung einreichen
              </Button>
            </div>
          </div>
        </>
      )}
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
