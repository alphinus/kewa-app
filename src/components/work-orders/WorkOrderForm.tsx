'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CreateWorkOrderInput, WorkOrderWithRelations } from '@/types/work-order'
import type { TradeCategory } from '@/types'

// =============================================
// TYPES
// =============================================

interface Project {
  id: string
  name: string
  description: string | null
  status: string
}

interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  trade_category: TradeCategory | null
  project_id: string
}

interface Partner {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  trade_categories: TradeCategory[]
  is_active: boolean
}

interface WorkOrderFormProps {
  /** Mode: create new or edit existing */
  mode: 'create' | 'edit'
  /** Existing work order for edit mode */
  workOrder?: WorkOrderWithRelations
  /** Pre-selected project ID */
  defaultProjectId?: string
  /** Pre-selected task ID */
  defaultTaskId?: string
  /** Callback on successful save */
  onSave: (workOrder: WorkOrderWithRelations) => void
  /** Callback on cancel */
  onCancel: () => void
}

// =============================================
// COMPONENT
// =============================================

/**
 * WorkOrder create/edit form
 *
 * Allows creating work orders from projects or tasks with:
 * - Partner selection (filtered by trade if task has trade)
 * - Scope of work entry
 * - Date scheduling
 * - Cost estimate
 * - Acceptance deadline
 * - Internal notes
 */
export function WorkOrderForm({
  mode,
  workOrder,
  defaultProjectId,
  defaultTaskId,
  onSave,
  onCancel
}: WorkOrderFormProps) {
  // Form state
  const [projectId, setProjectId] = useState(workOrder?.renovation_project_id || defaultProjectId || '')
  const [taskId, setTaskId] = useState(workOrder?.task_id || defaultTaskId || '')
  const [partnerId, setPartnerId] = useState(workOrder?.partner_id || '')
  const [title, setTitle] = useState(workOrder?.title || '')
  const [description, setDescription] = useState(workOrder?.description || '')
  const [scopeOfWork, setScopeOfWork] = useState(workOrder?.scope_of_work || '')
  const [requestedStartDate, setRequestedStartDate] = useState(workOrder?.requested_start_date?.split('T')[0] || '')
  const [requestedEndDate, setRequestedEndDate] = useState(workOrder?.requested_end_date?.split('T')[0] || '')
  const [estimatedCost, setEstimatedCost] = useState(workOrder?.estimated_cost?.toString() || '')
  const [acceptanceDeadline, setAcceptanceDeadline] = useState(
    workOrder?.acceptance_deadline
      ? new Date(workOrder.acceptance_deadline).toISOString().slice(0, 16)
      : ''
  )
  const [internalNotes, setInternalNotes] = useState(workOrder?.internal_notes || '')

  // Data state
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  // Filter partners when task changes
  useEffect(() => {
    const selectedTask = tasks.find(t => t.id === taskId)
    if (selectedTask?.trade_category) {
      // Filter partners by trade category
      const filtered = partners.filter(p =>
        p.trade_categories.includes(selectedTask.trade_category!)
      )
      setFilteredPartners(filtered.length > 0 ? filtered : partners)
    } else {
      setFilteredPartners(partners)
    }
  }, [taskId, tasks, partners])

  // Load tasks when project changes
  useEffect(() => {
    if (projectId) {
      loadTasks(projectId)
    } else {
      setTasks([])
      setTaskId('')
    }
  }, [projectId])

  // Set default deadline (72 hours from now) if creating new
  useEffect(() => {
    if (mode === 'create' && !acceptanceDeadline) {
      const deadline = new Date()
      deadline.setHours(deadline.getHours() + 72)
      setAcceptanceDeadline(deadline.toISOString().slice(0, 16))
    }
  }, [mode, acceptanceDeadline])

  /**
   * Load projects and partners
   */
  async function loadData() {
    try {
      setLoading(true)

      // Load projects
      const projectsRes = await fetch('/api/projects?status=active')
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data.projects || [])
      }

      // Load partners (active contractors only)
      const partnersRes = await fetch('/api/partners?type=contractor&is_active=true')
      if (partnersRes.ok) {
        const data = await partnersRes.json()
        setPartners(data.partners || [])
        setFilteredPartners(data.partners || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load tasks for selected project
   */
  async function loadTasks(projectId: string) {
    try {
      const res = await fetch(`/api/tasks?project_id=${projectId}&status=open`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  /**
   * Validate form
   */
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!projectId && !taskId) {
      newErrors.project = 'Bitte waehlen Sie ein Projekt oder eine Aufgabe'
    }
    if (!partnerId) {
      newErrors.partner = 'Bitte waehlen Sie einen Auftragnehmer'
    }
    if (!title.trim()) {
      newErrors.title = 'Bitte geben Sie einen Titel ein'
    }
    if (!scopeOfWork.trim()) {
      newErrors.scopeOfWork = 'Bitte beschreiben Sie den Arbeitsumfang'
    }
    if (estimatedCost && isNaN(parseFloat(estimatedCost))) {
      newErrors.estimatedCost = 'Bitte geben Sie eine gueltige Zahl ein'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    try {
      setSaving(true)

      const input: CreateWorkOrderInput = {
        title: title.trim(),
        partner_id: partnerId,
        renovation_project_id: projectId || undefined,
        task_id: taskId || undefined,
        description: description.trim() || undefined,
        scope_of_work: scopeOfWork.trim(),
        requested_start_date: requestedStartDate || undefined,
        requested_end_date: requestedEndDate || undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        acceptance_deadline: acceptanceDeadline || undefined,
        internal_notes: internalNotes.trim() || undefined
      }

      const url = mode === 'create'
        ? '/api/work-orders'
        : `/api/work-orders/${workOrder?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      const data = await response.json()
      onSave(data.workOrder)
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Auto-generate title from task
   */
  function handleTaskChange(newTaskId: string) {
    setTaskId(newTaskId)
    const task = tasks.find(t => t.id === newTaskId)
    if (task && !title) {
      setTitle(`Arbeitsauftrag: ${task.title}`)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="p-8">
          <div className="text-center text-gray-500">Laden...</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <Card className="w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {mode === 'create' ? 'Neuer Arbeitsauftrag' : 'Arbeitsauftrag bearbeiten'}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Schliessen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-6">
            {/* Error message */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            {/* Project select */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Projekt *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={mode === 'edit'}
              >
                <option value="">Projekt waehlen...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {errors.project && (
                <p className="mt-1 text-sm text-red-500">{errors.project}</p>
              )}
            </div>

            {/* Task select (optional, filtered by project) */}
            {projectId && tasks.length > 0 && (
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Aufgabe (optional)
                </label>
                <select
                  value={taskId}
                  onChange={(e) => handleTaskChange(e.target.value)}
                  className="w-full h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={mode === 'edit'}
                >
                  <option value="">Keine spezifische Aufgabe</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                      {task.trade_category && ` (${task.trade_category})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Partner select */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Auftragnehmer *
                {taskId && filteredPartners.length < partners.length && (
                  <span className="text-xs text-gray-500 ml-2">
                    (gefiltert nach Gewerk)
                  </span>
                )}
              </label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className={`w-full h-12 min-h-[48px] px-4 rounded-lg border ${
                  errors.partner ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Auftragnehmer waehlen...</option>
                {filteredPartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.company_name}
                    {partner.contact_name && ` (${partner.contact_name})`}
                  </option>
                ))}
              </select>
              {errors.partner && (
                <p className="mt-1 text-sm text-red-500">{errors.partner}</p>
              )}
            </div>

            {/* Title */}
            <Input
              label="Titel *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel des Arbeitsauftrags"
              error={errors.title}
              required
            />

            {/* Description (optional) */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kurzbeschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung des Auftrags..."
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Scope of Work */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arbeitsumfang *
              </label>
              <textarea
                value={scopeOfWork}
                onChange={(e) => setScopeOfWork(e.target.value)}
                placeholder="Detaillierte Beschreibung der auszufuehrenden Arbeiten..."
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.scopeOfWork ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              />
              {errors.scopeOfWork && (
                <p className="mt-1 text-sm text-red-500">{errors.scopeOfWork}</p>
              )}
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gewuenschter Beginn
                </label>
                <input
                  type="date"
                  value={requestedStartDate}
                  onChange={(e) => setRequestedStartDate(e.target.value)}
                  className="w-full h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gewuenschtes Ende
                </label>
                <input
                  type="date"
                  value={requestedEndDate}
                  onChange={(e) => setRequestedEndDate(e.target.value)}
                  className="w-full h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Cost estimate */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Geschaetzte Kosten (CHF)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="z.B. 1500.00"
                className={`w-full h-12 min-h-[48px] px-4 rounded-lg border ${
                  errors.estimatedCost ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.estimatedCost && (
                <p className="mt-1 text-sm text-red-500">{errors.estimatedCost}</p>
              )}
            </div>

            {/* Acceptance deadline */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Antwort bis
              </label>
              <input
                type="datetime-local"
                value={acceptanceDeadline}
                onChange={(e) => setAcceptanceDeadline(e.target.value)}
                className="w-full h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Standard: 72 Stunden ab jetzt
              </p>
            </div>

            {/* Internal notes */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interne Notizen
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Notizen fuer interne Verwendung (nicht sichtbar fuer Auftragnehmer)..."
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Diese Notizen sind nur fuer KEWA sichtbar
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex-1" />

            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Abbrechen
            </Button>

            <Button
              type="submit"
              loading={saving}
            >
              {mode === 'create' ? 'Erstellen' : 'Speichern'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
