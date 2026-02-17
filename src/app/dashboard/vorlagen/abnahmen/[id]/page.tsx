'use client'

/**
 * Edit Inspection Template Page
 *
 * Form to edit an existing inspection template.
 * Path: /dashboard/vorlagen/abnahmen/[id]
 * Phase: 22-inspection-core Plan 03
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChecklistEditor } from '@/components/inspections/ChecklistEditor'
import { toast } from 'sonner'
import type { InspectionTemplate, ChecklistSection, InspectionFormality } from '@/types/inspections'

export default function EditInspectionTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [template, setTemplate] = useState<InspectionTemplate | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tradeCategory, setTradeCategory] = useState('general')
  const [formalityLevel, setFormalityLevel] = useState<InspectionFormality>('informal_check')
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tradeCategories = [
    { value: 'general', label: 'Allgemein' },
    { value: 'plumbing', label: 'Sanitär' },
    { value: 'electrical', label: 'Elektro' },
    { value: 'hvac', label: 'Heizung/Klima' },
    { value: 'painting', label: 'Malerarbeiten' },
    { value: 'flooring', label: 'Bodenbeläge' },
    { value: 'carpentry', label: 'Schreinerei' },
    { value: 'roofing', label: 'Dach' },
    { value: 'masonry', label: 'Mauerwerk' },
    { value: 'glazing', label: 'Verglasung' },
    { value: 'landscaping', label: 'Gartenbau' },
    { value: 'cleaning', label: 'Reinigung' },
    { value: 'demolition', label: 'Abbruch' },
    { value: 'other', label: 'Andere' },
  ]

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/inspection-templates/${id}`)
        if (!res.ok) {
          throw new Error('Failed to fetch template')
        }
        const data = await res.json()
        const tmpl = data.template
        setTemplate(tmpl)
        setName(tmpl.name)
        setDescription(tmpl.description || '')
        setTradeCategory(tmpl.trade_category)
        setFormalityLevel(tmpl.formality_level)
        setChecklistSections(tmpl.checklist_sections)
      } catch (err) {
        console.error('Error fetching template:', err)
        setError(err instanceof Error ? err.message : 'Failed to load template')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplate()
  }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.warning('Bitte geben Sie einen Namen ein')
      return
    }

    if (checklistSections.length === 0) {
      toast.warning('Bitte fügen Sie mindestens einen Abschnitt hinzu')
      return
    }

    // Validate that all sections have names and at least one item
    for (const section of checklistSections) {
      if (!section.name.trim()) {
        toast.warning('Alle Abschnitte müssen einen Namen haben')
        return
      }
      if (section.items.length === 0) {
        toast.warning(`Abschnitt "${section.name}" muss mindestens ein Element haben`)
        return
      }
      for (const item of section.items) {
        if (!item.title.trim()) {
          toast.warning(`Alle Elemente in "${section.name}" müssen einen Titel haben`)
          return
        }
      }
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/inspection-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          trade_category: tradeCategory,
          formality_level: formalityLevel,
          checklist_sections: checklistSections,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Speichern der Vorlage')
      }

      router.push('/dashboard/vorlagen/abnahmen')
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern der Vorlage')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Vorlage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/inspection-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Löschen der Vorlage')
      }

      router.push('/dashboard/vorlagen/abnahmen')
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen der Vorlage')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <p className="text-gray-500 dark:text-gray-400">Laden...</p>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error || 'Vorlage nicht gefunden'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/vorlagen" className="hover:text-gray-700 dark:hover:text-gray-300">
          Vorlagen
        </Link>
        <span>/</span>
        <Link href="/dashboard/vorlagen/abnahmen" className="hover:text-gray-700 dark:hover:text-gray-300">
          Abnahmen
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{template.name}</span>
      </nav>

      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Vorlage bearbeiten
      </h1>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic info */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Grundinformationen
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Sanitärarbeiten Standardabnahme"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="trade-category">Gewerk *</Label>
              <select
                id="trade-category"
                value={tradeCategory}
                onChange={(e) => setTradeCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                {tradeCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Formalitätsgrad *</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="formality"
                    value="informal_check"
                    checked={formalityLevel === 'informal_check'}
                    onChange={(e) => setFormalityLevel(e.target.value as InspectionFormality)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Informeller Check
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="formality"
                    value="formal_abnahme"
                    checked={formalityLevel === 'formal_abnahme'}
                    onChange={(e) => setFormalityLevel(e.target.value as InspectionFormality)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Formales Abnahmeprotokoll
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Checkliste *
          </h3>
          <ChecklistEditor
            initialSections={checklistSections}
            onChange={setChecklistSections}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="min-h-[48px]"
          >
            Löschen
          </Button>
          <div className="flex gap-3">
            <Link href="/dashboard/vorlagen/abnahmen">
              <Button type="button" variant="outline" className="min-h-[48px]">
                Abbrechen
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting} className="min-h-[48px]">
              {isSubmitting ? 'Speichern...' : 'Änderungen speichern'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
