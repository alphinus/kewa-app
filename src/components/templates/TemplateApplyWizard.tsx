'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Template, TemplateWithHierarchy, TemplateTask } from '@/types/templates'
import { fetchTemplates, fetchTemplate } from '@/lib/api/templates'
import {
  applyTemplateToProject,
  getOptionalTasks,
  calculateTemplateMetrics,
  getAffectedByExclusion,
  getTaskById,
  formatCHF,
  formatDuration
} from '@/lib/templates/apply'

interface TemplateApplyWizardProps {
  projectId: string
  projectName: string
  onSuccess?: () => void
  onCancel?: () => void
}

type WizardStep = 'select' | 'configure' | 'date' | 'preview' | 'applying' | 'complete'

/**
 * TemplateApplyWizard Component
 *
 * Multi-step wizard for applying a template to a renovation project.
 * Steps:
 * 1. Select template from library
 * 2. Configure optional tasks (toggle on/off)
 * 3. Set start date
 * 4. Preview (task count, duration, cost)
 * 5. Apply and show result
 */
export function TemplateApplyWizard({
  projectId,
  projectName,
  onSuccess,
  onCancel
}: TemplateApplyWizardProps) {
  const [step, setStep] = useState<WizardStep>('select')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Template selection
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithHierarchy | null>(null)

  // Step 2: Optional tasks configuration
  const [excludedTaskIds, setExcludedTaskIds] = useState<Set<string>>(new Set())

  // Step 3: Start date
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Step 5: Result
  const [result, setResult] = useState<{
    phases_created: number
    packages_created: number
    tasks_created: number
    dependencies_created: number
    gates_created: number
  } | null>(null)

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTemplates({ active: true })
        setTemplates(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Vorlagen')
      } finally {
        setLoading(false)
      }
    }
    loadTemplates()
  }, [])

  // Load full template when selected
  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplate(null)
      return
    }

    async function loadTemplate() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchTemplate(selectedTemplateId!)
        setSelectedTemplate(data)
        // Reset excluded tasks when template changes
        setExcludedTaskIds(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Vorlage')
      } finally {
        setLoading(false)
      }
    }
    loadTemplate()
  }, [selectedTemplateId])

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!selectedTemplate) return null
    return calculateTemplateMetrics(selectedTemplate, excludedTaskIds)
  }, [selectedTemplate, excludedTaskIds])

  // Get optional tasks
  const optionalTasks = useMemo(() => {
    if (!selectedTemplate) return []
    return getOptionalTasks(selectedTemplate)
  }, [selectedTemplate])

  // Toggle task exclusion
  const toggleTaskExclusion = (taskId: string) => {
    setExcludedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  // Get affected tasks for a task
  const getAffectedTasks = (taskId: string): TemplateTask[] => {
    if (!selectedTemplate) return []
    const affectedIds = getAffectedByExclusion(selectedTemplate, taskId)
    return affectedIds
      .map(id => getTaskById(selectedTemplate, id))
      .filter((t): t is TemplateTask => t !== undefined)
  }

  // Apply template
  const handleApply = async () => {
    if (!selectedTemplateId) return

    setStep('applying')
    setError(null)

    try {
      const applyResult = await applyTemplateToProject({
        templateId: selectedTemplateId,
        projectId,
        startDate: startDate ? new Date(startDate) : undefined,
        excludedTaskIds: Array.from(excludedTaskIds)
      })

      setResult({
        phases_created: applyResult.phases_created,
        packages_created: applyResult.packages_created,
        tasks_created: applyResult.tasks_created,
        dependencies_created: applyResult.dependencies_created,
        gates_created: applyResult.gates_created
      })
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Anwenden der Vorlage')
      setStep('preview')
    }
  }

  // Navigation
  const canProceed = () => {
    switch (step) {
      case 'select':
        return selectedTemplateId !== null && selectedTemplate !== null
      case 'configure':
        return true
      case 'date':
        return startDate !== ''
      case 'preview':
        return true
      default:
        return false
    }
  }

  const goNext = () => {
    switch (step) {
      case 'select':
        // Skip configure if no optional tasks
        if (optionalTasks.length === 0) {
          setStep('date')
        } else {
          setStep('configure')
        }
        break
      case 'configure':
        setStep('date')
        break
      case 'date':
        setStep('preview')
        break
      case 'preview':
        handleApply()
        break
    }
  }

  const goBack = () => {
    switch (step) {
      case 'configure':
        setStep('select')
        break
      case 'date':
        if (optionalTasks.length === 0) {
          setStep('select')
        } else {
          setStep('configure')
        }
        break
      case 'preview':
        setStep('date')
        break
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Vorlage anwenden</h2>
        <p className="text-sm text-gray-500 mt-1">Projekt: {projectName}</p>
      </div>

      {/* Progress indicator */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          {['select', 'configure', 'date', 'preview', 'complete'].map((s, i) => {
            const isActive = step === s || (step === 'applying' && s === 'complete')
            const isPast = ['select', 'configure', 'date', 'preview', 'complete'].indexOf(step) > i
            const label = {
              select: 'Vorlage',
              configure: 'Optionen',
              date: 'Datum',
              preview: 'Vorschau',
              complete: 'Fertig'
            }[s]

            // Skip configure step indicator if no optional tasks
            if (s === 'configure' && optionalTasks.length === 0) return null

            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (optionalTasks.length > 0 || s !== 'configure') && (
                  <div className={`w-8 h-0.5 ${isPast ? 'bg-blue-500' : 'bg-gray-300'}`} />
                )}
                <div className={`flex items-center gap-1.5 ${isActive ? 'text-blue-600' : isPast ? 'text-gray-900' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${isActive ? 'bg-blue-600 text-white' : isPast ? 'bg-blue-100 text-blue-600' : 'bg-gray-200'}`}>
                    {isPast && !isActive ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1 - (optionalTasks.length === 0 && i > 1 ? 1 : 0)
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Step 1: Select Template */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-gray-600">Waehlen Sie eine Vorlage fuer das Projekt:</p>

            {loading && <p className="text-gray-500">Laden...</p>}

            {!loading && templates.length === 0 && (
              <p className="text-gray-500">Keine aktiven Vorlagen verfuegbar.</p>
            )}

            <div className="space-y-2">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    selectedTemplateId === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {template.category}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded">
                        {template.scope}
                      </span>
                    </div>
                  </div>
                  {template.total_duration_days && (
                    <p className="text-sm text-gray-500 mt-2">
                      Dauer: {formatDuration(template.total_duration_days)}
                      {template.total_estimated_cost && ` | Kosten: ${formatCHF(template.total_estimated_cost)}`}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Configure Optional Tasks */}
        {step === 'configure' && selectedTemplate && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Diese Vorlage enthaelt optionale Aufgaben. Waehlen Sie, welche ausgefuehrt werden sollen:
            </p>

            <div className="space-y-3">
              {optionalTasks.map(task => {
                const isExcluded = excludedTaskIds.has(task.id)
                const affected = getAffectedTasks(task.id)

                return (
                  <div
                    key={task.id}
                    className={`p-4 border rounded-lg ${isExcluded ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => toggleTaskExclusion(task.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">{task.wbs_code}</span>
                          <span className={`font-medium ${isExcluded ? 'text-gray-400' : 'text-gray-900'}`}>
                            {task.name}
                          </span>
                        </div>
                        {task.description && (
                          <p className={`text-sm mt-1 ${isExcluded ? 'text-gray-400' : 'text-gray-600'}`}>
                            {task.description}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatDuration(task.estimated_duration_days)}</span>
                          {task.estimated_cost && <span>{formatCHF(task.estimated_cost)}</span>}
                        </div>
                        {affected.length > 0 && isExcluded && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                            <strong>Warnung:</strong> Diese Aufgabe hat abhaengige Aufgaben:
                            <ul className="mt-1 list-disc list-inside">
                              {affected.map(t => (
                                <li key={t.id}>{t.wbs_code} {t.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Start Date */}
        {step === 'date' && (
          <div className="space-y-4">
            <p className="text-gray-600">Waehlen Sie das Startdatum fuer das Projekt:</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Geplanter Starttermin
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && selectedTemplate && metrics && (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Zusammenfassung</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Vorlage</p>
                  <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Startdatum</p>
                  <p className="font-medium text-gray-900">
                    {new Date(startDate).toLocaleDateString('de-CH')}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Was erstellt wird</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedTemplate.phases.length}</p>
                  <p className="text-sm text-blue-800">Phasen</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedTemplate.phases.reduce((sum, p) => sum + p.packages.length, 0)}
                  </p>
                  <p className="text-sm text-purple-800">Pakete</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{metrics.taskCount}</p>
                  <p className="text-sm text-green-800">Aufgaben</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Geschaetzte Werte</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Gesamtdauer</p>
                  <p className="font-medium text-gray-900">{formatDuration(metrics.totalDays)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Gesamtkosten</p>
                  <p className="font-medium text-gray-900">{formatCHF(metrics.totalCost)}</p>
                </div>
              </div>
            </div>

            {excludedTaskIds.size > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>{excludedTaskIds.size} optionale Aufgabe(n)</strong> werden nicht erstellt.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Applying */}
        {step === 'applying' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Vorlage wird angewendet...</p>
          </div>
        )}

        {/* Step 6: Complete */}
        {step === 'complete' && result && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Vorlage erfolgreich angewendet!</h3>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Erstellt</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded text-center">
                  <p className="text-xl font-bold text-gray-900">{result.phases_created}</p>
                  <p className="text-xs text-gray-500">Phasen</p>
                </div>
                <div className="p-3 bg-gray-50 rounded text-center">
                  <p className="text-xl font-bold text-gray-900">{result.packages_created}</p>
                  <p className="text-xs text-gray-500">Pakete</p>
                </div>
                <div className="p-3 bg-gray-50 rounded text-center">
                  <p className="text-xl font-bold text-gray-900">{result.tasks_created}</p>
                  <p className="text-xs text-gray-500">Aufgaben</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-3 bg-gray-50 rounded text-center">
                  <p className="text-xl font-bold text-gray-900">{result.dependencies_created}</p>
                  <p className="text-xs text-gray-500">Abhaengigkeiten</p>
                </div>
                <div className="p-3 bg-gray-50 rounded text-center">
                  <p className="text-xl font-bold text-gray-900">{result.gates_created}</p>
                  <p className="text-xs text-gray-500">Quality Gates</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
        {step !== 'complete' && step !== 'applying' ? (
          <>
            <button
              onClick={step === 'select' ? onCancel : goBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 min-h-[44px]"
            >
              {step === 'select' ? 'Abbrechen' : 'Zurueck'}
            </button>
            <button
              onClick={goNext}
              disabled={!canProceed() || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {step === 'preview' ? 'Anwenden' : 'Weiter'}
            </button>
          </>
        ) : step === 'complete' ? (
          <button
            onClick={onSuccess}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
          >
            Zum Projekt
          </button>
        ) : null}
      </div>
    </div>
  )
}
