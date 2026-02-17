'use client'

import { useState, useEffect } from 'react'
import type { Template, TemplateWithHierarchy, TemplateTask } from '@/types/templates'
import {
  applyTemplateToProject,
  calculateTemplateMetrics,
  getOptionalTasks
} from '@/lib/templates/apply'

interface ProjectCreateWithTemplateProps {
  unitId: string
  unitName: string
  onSuccess?: (projectId: string) => void
  onCancel?: () => void
}

/**
 * TemplatePreviewWithExclusion - Shows template structure with optional task toggles
 */
function TemplatePreviewWithExclusion({
  template,
  excludedTaskIds,
  onToggleTask
}: {
  template: TemplateWithHierarchy
  excludedTaskIds: Set<string>
  onToggleTask: (taskId: string) => void
}) {
  const metrics = calculateTemplateMetrics(template, excludedTaskIds)
  const optionalTasks = getOptionalTasks(template)

  return (
    <div className="space-y-4">
      {/* Metrics summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
          <div className="font-bold text-gray-900 dark:text-gray-100">
            {template.phases.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Phasen</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
          <div className="font-bold text-gray-900 dark:text-gray-100">
            {metrics.taskCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Aufgaben</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
          <div className="font-bold text-gray-900 dark:text-gray-100">
            {metrics.totalDays}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Tage</div>
        </div>
      </div>

      {/* Optional tasks toggle */}
      {optionalTasks.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Optionale Aufgaben
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {optionalTasks.map((task) => (
              <label
                key={task.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!excludedTaskIds.has(task.id)}
                  onChange={() => onToggleTask(task.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={
                    excludedTaskIds.has(task.id)
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-700 dark:text-gray-300'
                  }
                >
                  {task.wbs_code} {task.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed WBS preview */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-3 max-h-60 overflow-y-auto">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Struktur
        </h4>
        <div className="space-y-2">
          {template.phases.map((phase) => {
            const packageCount = phase.packages.length
            const taskCount = phase.packages.reduce(
              (sum, p) => sum + p.tasks.length,
              0
            )
            return (
              <div key={phase.id} className="text-sm">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {phase.wbs_code} {phase.name}
                </div>
                <div className="ml-4 text-gray-600 dark:text-gray-400">
                  {packageCount} Pakete, {taskCount} Aufgaben
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Get category display label
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    bathroom: 'Badezimmer',
    kitchen: 'Küche',
    general: 'Allgemein',
    flooring: 'Bodenbelag',
    painting: 'Malen',
    electrical: 'Elektrik',
    plumbing: 'Sanitaer'
  }
  return labels[category] || category
}

/**
 * ProjectCreateWithTemplate - Template-first project creation component
 *
 * Two-column layout:
 * - Left: Template selection and project details
 * - Right: Template preview with optional task customization
 */
export function ProjectCreateWithTemplate({
  unitId,
  unitName,
  onSuccess,
  onCancel
}: ProjectCreateWithTemplateProps) {
  // Template list state
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  // Selected template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithHierarchy | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)

  // Customization state
  const [excludedTaskIds, setExcludedTaskIds] = useState<Set<string>>(new Set())

  // Project details state
  const [projectName, setProjectName] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch templates on mount
  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoadingTemplates(true)
        const response = await fetch('/api/templates?active=true')
        if (!response.ok) {
          throw new Error('Vorlagen konnten nicht geladen werden')
        }
        const data = await response.json()
        setTemplates(data.templates || [])
      } catch (error) {
        setTemplatesError(
          error instanceof Error ? error.message : 'Fehler beim Laden'
        )
      } finally {
        setLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [])

  // Fetch full template when selected
  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplate(null)
      return
    }

    async function fetchTemplate() {
      try {
        setLoadingTemplate(true)
        const response = await fetch(`/api/templates/${selectedTemplateId}`)
        if (!response.ok) {
          throw new Error('Vorlage konnte nicht geladen werden')
        }
        const data = await response.json()
        setSelectedTemplate(data.template)
        // Reset exclusions when template changes
        setExcludedTaskIds(new Set())
        // Set default project name from template
        if (data.template && !projectName) {
          setProjectName(`${data.template.name} - ${unitName}`)
        }
      } catch (error) {
        console.error('Error fetching template:', error)
        setSelectedTemplate(null)
      } finally {
        setLoadingTemplate(false)
      }
    }
    fetchTemplate()
  }, [selectedTemplateId, unitName, projectName])

  // Toggle task exclusion
  const toggleExclusion = (taskId: string) => {
    setExcludedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedTemplateId || !projectName.trim()) {
      return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)

      // Step 1: Create renovation project
      const createResponse = await fetch('/api/renovation-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unitId,
          name: projectName.trim(),
          planned_start_date: startDate
        })
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.error || 'Projekt konnte nicht erstellt werden')
      }

      const { project } = await createResponse.json()

      // Step 2: Apply template to project
      await applyTemplateToProject({
        templateId: selectedTemplateId,
        projectId: project.id,
        startDate: new Date(startDate),
        excludedTaskIds: Array.from(excludedTaskIds)
      })

      // Success - navigate to project
      onSuccess?.(project.id)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Fehler beim Erstellen'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Group templates by category
  const templatesByCategory = templates.reduce<Record<string, Template[]>>(
    (acc, template) => {
      const category = template.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(template)
      return acc
    },
    {}
  )

  const canSubmit =
    selectedTemplateId && projectName.trim() && !submitting && !loadingTemplate

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Template selection and project details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          1. Vorlage wählen
        </h3>

        {loadingTemplates ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : templatesError ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            {templatesError}
          </div>
        ) : templates.length === 0 ? (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg">
            Keine aktiven Vorlagen vorhanden
          </div>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
              <div key={category}>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {getCategoryLabel(category)}
                </div>
                <div className="space-y-2">
                  {categoryTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`w-full p-3 border rounded-lg text-left transition-colors ${
                        selectedTemplateId === template.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {template.name}
                      </div>
                      {template.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {template.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Project details (shown when template selected) */}
        {selectedTemplate && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-6">
              2. Projektdetails
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Projektname
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Projektname eingeben"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Startdatum
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </>
        )}

        {/* Error message */}
        {submitError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            {submitError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Erstellen...
              </span>
            ) : (
              'Projekt erstellen'
            )}
          </button>
        </div>
      </div>

      {/* Right: Template preview */}
      <div>
        {loadingTemplate ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : selectedTemplate ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Vorschau
            </h3>
            <TemplatePreviewWithExclusion
              template={selectedTemplate}
              excludedTaskIds={excludedTaskIds}
              onToggleTask={toggleExclusion}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <p className="mt-2">Vorlage auswählen um Vorschau zu sehen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
