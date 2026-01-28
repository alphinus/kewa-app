'use client'

/**
 * InspectionForm Component
 *
 * Form to create a new inspection with template selection.
 *
 * Phase 22-02: Inspection UI
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { InspectionTemplate } from '@/types/inspections'

interface WorkOrder {
  id: string
  title: string
  wo_number: string
  partner?: {
    trade_category?: string
  }
}

interface Project {
  id: string
  name: string
}

interface InspectionFormProps {
  onSubmit?: (inspectionId: string) => void
}

export function InspectionForm({ onSubmit }: InspectionFormProps) {
  const router = useRouter()

  const [linkType, setLinkType] = useState<'work_order' | 'project'>('work_order')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [workOrderId, setWorkOrderId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<InspectionTemplate[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch work orders, projects, and templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [woRes, projectsRes, templatesRes] = await Promise.all([
          fetch('/api/work-orders'),
          fetch('/api/renovation-projects'),
          fetch('/api/inspection-templates?is_active=true'),
        ])

        if (woRes.ok) {
          const data = await woRes.json()
          setWorkOrders(data.workOrders || [])
        }

        if (projectsRes.ok) {
          const data = await projectsRes.json()
          setProjects(data.projects || [])
        }

        if (templatesRes.ok) {
          const data = await templatesRes.json()
          setTemplates(data.templates || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      }
    }

    fetchData()
  }, [])

  // Filter templates by trade category when work order changes
  useEffect(() => {
    if (linkType === 'work_order' && workOrderId) {
      const selectedWorkOrder = workOrders.find((wo) => wo.id === workOrderId)
      if (selectedWorkOrder?.partner?.trade_category) {
        const partnerTradeCategory = selectedWorkOrder.partner.trade_category
        setFilteredTemplates(
          templates.filter(
            (t) => t.trade_category === partnerTradeCategory
          )
        )
      } else {
        setFilteredTemplates(templates)
      }
    } else {
      setFilteredTemplates(templates)
    }
  }, [linkType, workOrderId, workOrders, templates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        work_order_id: linkType === 'work_order' ? workOrderId : undefined,
        project_id: linkType === 'project' ? projectId : undefined,
        template_id: templateId || undefined,
        inspection_date: inspectionDate,
      }

      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create inspection')
      }

      const data = await res.json()

      if (onSubmit) {
        onSubmit(data.inspection.id)
      } else {
        router.push(`/dashboard/abnahmen/${data.inspection.id}/checkliste`)
      }
    } catch (err) {
      console.error('Error creating inspection:', err)
      setError(err instanceof Error ? err.message : 'Failed to create inspection')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Link type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Verknüpfung
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="work_order"
              checked={linkType === 'work_order'}
              onChange={(e) => setLinkType(e.target.value as 'work_order')}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auftrag</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="project"
              checked={linkType === 'project'}
              onChange={(e) => setLinkType(e.target.value as 'project')}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Projekt</span>
          </label>
        </div>
      </div>

      {/* Work order or project selector */}
      {linkType === 'work_order' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Auftrag <span className="text-red-500">*</span>
          </label>
          <select
            value={workOrderId}
            onChange={(e) => {
              setWorkOrderId(e.target.value)
              setTemplateId('') // Reset template when work order changes
            }}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Auftrag wählen...</option>
            {workOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>
                {wo.wo_number} - {wo.title}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Projekt <span className="text-red-500">*</span>
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Projekt wählen...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Template selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Vorlage (optional)
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">Keine Vorlage (leere Checkliste)</option>
          {filteredTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {linkType === 'work_order' && workOrderId && filteredTemplates.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Keine Vorlagen für diese Gewerk gefunden
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Titel <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="z.B. Schlussabnahme Sanitärarbeiten"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Beschreibung (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Zusätzliche Details zur Abnahme..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Inspection date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Abnahmedatum <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={inspectionDate}
          onChange={(e) => setInspectionDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Erstellen...' : 'Abnahme erstellen'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
