'use client'

import { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TemplateEditor } from '@/components/templates/TemplateEditor'
import { fetchTemplate, updateTemplate } from '@/lib/api/templates'
import type { TemplateWithHierarchy, TemplateCategory, TemplateScope, UpdateTemplateInput } from '@/types/templates'
import type { RoomType } from '@/types'

const categoryOptions: { value: TemplateCategory; label: string }[] = [
  { value: 'complete_renovation', label: 'Komplett-Renovation' },
  { value: 'room_specific', label: 'Raum-spezifisch' },
  { value: 'trade_specific', label: 'Gewerk-spezifisch' }
]

const scopeOptions: { value: TemplateScope; label: string }[] = [
  { value: 'unit', label: 'Wohnung (ganzes Unit)' },
  { value: 'room', label: 'Einzelner Raum' }
]

const roomTypeOptions: { value: RoomType; label: string }[] = [
  { value: 'bathroom', label: 'Bad' },
  { value: 'kitchen', label: 'Küche' },
  { value: 'bedroom', label: 'Schlafzimmer' },
  { value: 'living_room', label: 'Wohnzimmer' },
  { value: 'hallway', label: 'Flur' },
  { value: 'balcony', label: 'Balkon' },
  { value: 'storage', label: 'Abstellraum' },
  { value: 'laundry', label: 'Waschküche' },
  { value: 'garage', label: 'Garage' },
  { value: 'office', label: 'Buero' },
  { value: 'other', label: 'Andere' }
]

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Template Edit Page
 *
 * Admin-only page for editing template metadata and WBS structure.
 */
export default function TemplateEditPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [template, setTemplate] = useState<TemplateWithHierarchy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Form state for metadata
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '' as TemplateCategory | '',
    scope: '' as TemplateScope | '',
    target_room_type: '' as RoomType | '',
    is_active: true
  })

  // Load template and check admin
  useEffect(() => {
    loadTemplate()
    checkAdminStatus()
  }, [id])

  const loadTemplate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTemplate(id)
      setTemplate(data)
      setFormData({
        name: data.name,
        description: data.description || '',
        category: data.category,
        scope: data.scope,
        target_room_type: data.target_room_type || '',
        is_active: data.is_active
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [id])

  async function checkAdminStatus() {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      setIsAdmin(data.roleName === 'admin')
      if (data.roleName !== 'admin') {
        router.push(`/templates/${id}`)
      }
    } catch {
      router.push(`/templates/${id}`)
    }
  }

  async function handleSaveMetadata() {
    if (!formData.name || !formData.category || !formData.scope) {
      setError('Name, Kategorie und Scope sind erforderlich')
      return
    }

    if (formData.scope === 'room' && !formData.target_room_type) {
      setError('Raumtyp ist erforderlich für raum-spezifische Templates')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const updateData: UpdateTemplateInput = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        scope: formData.scope,
        target_room_type: formData.scope === 'room' ? formData.target_room_type as RoomType : null,
        is_active: formData.is_active
      }

      await updateTemplate(id, updateData)

      // Reload template to get updated data
      await loadTemplate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Lade Template...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Nur Administratoren können Templates bearbeiten.</p>
          <Link href={`/templates/${id}`} className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Zurück zum Template
          </Link>
        </div>
      </div>
    )
  }

  if (error && !template) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
          <Link href="/templates" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Zurück zur Bibliothek
          </Link>
        </div>
      </div>
    )
  }

  if (!template) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <Link href="/templates" className="text-blue-600 hover:text-blue-700">
            Template-Bibliothek
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link href={`/templates/${id}`} className="text-blue-600 hover:text-blue-700">
            {template.name}
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Bearbeiten</span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Template bearbeiten</h1>
          <Link
            href={`/templates/${id}`}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] flex items-center"
          >
            Abbrechen
          </Link>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Metadata form */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Template-Metadaten</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="z.B. Komplett-Renovation (Standard)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Beschreibung des Templates..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value as TemplateCategory }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Kategorie wählen --</option>
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope *</label>
              <select
                value={formData.scope}
                onChange={e => setFormData(f => ({ ...f, scope: e.target.value as TemplateScope }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Scope wählen --</option>
                {scopeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {formData.scope === 'room' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ziel-Raumtyp *</label>
                <select
                  value={formData.target_room_type}
                  onChange={e => setFormData(f => ({ ...f, target_room_type: e.target.value as RoomType }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Raumtyp wählen --</option>
                  {roomTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Template ist aktiv (sichtbar in der Bibliothek)
              </label>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveMetadata}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Speichern...' : 'Metadaten speichern'}
            </button>
          </div>
        </div>

        {/* WBS Editor */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">WBS-Struktur bearbeiten</h2>
          <TemplateEditor template={template} onUpdate={loadTemplate} />
        </div>
      </div>
    </div>
  )
}
