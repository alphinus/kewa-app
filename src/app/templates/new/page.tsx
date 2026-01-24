'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createTemplate } from '@/lib/api/templates'
import type { TemplateCategory, TemplateScope, CreateTemplateInput } from '@/types/templates'
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
  { value: 'kitchen', label: 'Kueche' },
  { value: 'bedroom', label: 'Schlafzimmer' },
  { value: 'living_room', label: 'Wohnzimmer' },
  { value: 'hallway', label: 'Flur' },
  { value: 'balcony', label: 'Balkon' },
  { value: 'storage', label: 'Abstellraum' },
  { value: 'laundry', label: 'Waschkueche' },
  { value: 'garage', label: 'Garage' },
  { value: 'office', label: 'Buero' },
  { value: 'other', label: 'Andere' }
]

/**
 * Template Create Page
 *
 * Admin-only page for creating new templates.
 * After creation, redirects to edit page for WBS structure.
 */
export default function TemplateNewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '' as TemplateCategory | '',
    scope: '' as TemplateScope | '',
    target_room_type: '' as RoomType | ''
  })

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus()
  }, [])

  async function checkAdminStatus() {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      setIsAdmin(data.role === 'kewa')
      if (data.role !== 'kewa') {
        router.push('/templates')
      }
    } catch {
      router.push('/templates')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.category || !formData.scope) {
      setError('Name, Kategorie und Scope sind erforderlich')
      return
    }

    if (formData.scope === 'room' && !formData.target_room_type) {
      setError('Raumtyp ist erforderlich fuer raum-spezifische Templates')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const input: CreateTemplateInput = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category as TemplateCategory,
        scope: formData.scope as TemplateScope,
        target_room_type: formData.scope === 'room' ? formData.target_room_type as RoomType : undefined
      }

      const template = await createTemplate(input)
      router.push(`/templates/${template.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Pruefe Berechtigung...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Nur Administratoren koennen Templates erstellen.</p>
          <Link href="/templates" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Zurueck zur Bibliothek
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <Link href="/templates" className="text-blue-600 hover:text-blue-700">
            Template-Bibliothek
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Neues Template</span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Neues Template erstellen</h1>
          <Link
            href="/templates"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6">
          <p className="text-sm text-gray-600 mb-6">
            Erstellen Sie ein neues Template. Nach dem Erstellen koennen Sie die WBS-Struktur
            (Phasen, Arbeitspakete, Aufgaben) im Editor hinzufuegen.
          </p>

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
                <option value="">-- Kategorie waehlen --</option>
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
                <option value="">-- Scope waehlen --</option>
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
                  <option value="">-- Raumtyp waehlen --</option>
                  {roomTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Link
              href="/templates"
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg min-h-[44px] flex items-center"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Erstellen...' : 'Template erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
