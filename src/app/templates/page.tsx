'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { fetchTemplates, deleteTemplate, duplicateTemplate } from '@/lib/api/templates'
import { useDebounce } from '@/hooks/useDebounce'
import type { Template, TemplateCategory } from '@/types/templates'

/**
 * Template Library Page
 *
 * Displays all templates grouped by category with filters.
 * Admin users can create, edit, and delete templates.
 */
export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | ''>('')
  const [showInactive, setShowInactive] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search update
  const updateDebouncedQuery = useCallback((query: string) => {
    setDebouncedQuery(query)
    setIsSearching(false)
  }, [])
  const debouncedSearch = useDebounce(updateDebouncedQuery, 300)

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setIsSearching(true)
    debouncedSearch(value)
  }, [debouncedSearch])

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!debouncedQuery.trim()) return templates

    const query = debouncedQuery.toLowerCase()
    return templates.filter(template => {
      const nameMatch = template.name?.toLowerCase().includes(query) ?? false
      const descMatch = template.description?.toLowerCase().includes(query) ?? false
      return nameMatch || descMatch
    })
  }, [templates, debouncedQuery])

  // Load templates and check admin status
  useEffect(() => {
    loadTemplates()
    checkAdminStatus()
  }, [categoryFilter, showInactive])

  async function loadTemplates() {
    setLoading(true)
    setError(null)
    try {
      const options: { category?: TemplateCategory; active?: boolean } = {}
      if (categoryFilter) options.category = categoryFilter
      if (!showInactive) options.active = true
      const data = await fetchTemplates(Object.keys(options).length > 0 ? options : undefined)
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Templates')
    } finally {
      setLoading(false)
    }
  }

  async function checkAdminStatus() {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      setIsAdmin(data.roleName === 'admin')
    } catch {
      setIsAdmin(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTemplate(id)
      setTemplates(templates.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    }
  }

  async function handleDuplicate(id: string) {
    const template = templates.find(t => t.id === id)
    const newName = prompt('Name fuer die Kopie:', template ? `${template.name} (Kopie)` : 'Kopie')
    if (!newName) return

    try {
      const newTemplate = await duplicateTemplate(id, newName)
      router.push(`/templates/${newTemplate.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Duplizieren')
    }
  }

  // Group filtered templates by category
  const grouped = filteredTemplates.reduce((acc, template) => {
    const key = template.category
    if (!acc[key]) acc[key] = []
    acc[key].push(template)
    return acc
  }, {} as Record<string, Template[]>)

  const categoryTitles: Record<string, string> = {
    complete_renovation: 'Komplett-Renovationen',
    room_specific: 'Raum-spezifische Vorlagen',
    trade_specific: 'Gewerk-spezifische Vorlagen'
  }

  // Order categories for consistent display
  const categoryOrder: TemplateCategory[] = ['complete_renovation', 'room_specific', 'trade_specific']

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template-Bibliothek</h1>
            <p className="text-gray-600 text-sm mt-1">
              Vorlagen fuer Renovationsprojekte mit WBS-Struktur
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/templates/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] flex items-center"
            >
              Neues Template
            </Link>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Template suchen..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Inactive toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Inaktive anzeigen</span>
            </label>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              categoryFilter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setCategoryFilter('complete_renovation')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              categoryFilter === 'complete_renovation'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            Komplett
          </button>
          <button
            onClick={() => setCategoryFilter('room_specific')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              categoryFilter === 'room_specific'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            Raum-spezifisch
          </button>
          <button
            onClick={() => setCategoryFilter('trade_specific')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              categoryFilter === 'trade_specific'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            Gewerk-spezifisch
          </button>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-500">
            {isSearching ? (
              'Suche...'
            ) : (
              `Zeige ${filteredTemplates.length} von ${templates.length} Templates`
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Lade Templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-600">
              {templates.length === 0 ? 'Keine Templates vorhanden' : 'Keine Templates gefunden'}
            </p>
            {isAdmin && (
              <Link
                href="/templates/new"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                Erstes Template erstellen
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {categoryOrder.map(category => {
              const categoryTemplates = grouped[category]
              if (!categoryTemplates || categoryTemplates.length === 0) return null

              return (
                <section key={category}>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {categoryTitles[category] || category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
