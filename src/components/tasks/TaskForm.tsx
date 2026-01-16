'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProjectSelect } from '@/components/projects/ProjectSelect'
import type { TaskWithProject, CreateTaskInput, UpdateTaskInput, Task } from '@/types/database'
import type { Priority } from '@/types'

interface TaskFormProps {
  /** Form mode */
  mode: 'create' | 'edit'
  /** Task to edit (required for edit mode) */
  task?: TaskWithProject
  /** Default unit ID for project filter */
  defaultUnitId?: string
  /** Callback on successful save */
  onSave: (task: Task) => void
  /** Callback on cancel */
  onCancel: () => void
  /** Callback on delete (edit mode only) */
  onDelete?: () => void
}

// Priority options for select
const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Niedrig' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Hoch' },
  { value: 'urgent', label: 'Dringend' },
]

/**
 * Task create/edit form modal
 */
export function TaskForm({
  mode,
  task,
  defaultUnitId,
  onSave,
  onCancel,
  onDelete,
}: TaskFormProps) {
  // Form state
  const [projectId, setProjectId] = useState(task?.project_id || '')
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [dueDate, setDueDate] = useState(task?.due_date?.split('T')[0] || '')
  const [priority, setPriority] = useState<Priority>(task?.priority || 'normal')

  // UI state
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setProjectId(task.project_id)
      setTitle(task.title)
      setDescription(task.description || '')
      setDueDate(task.due_date?.split('T')[0] || '')
      setPriority(task.priority)
    }
  }, [task])

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!projectId) {
      newErrors.projectId = 'Bitte waehlen Sie ein Projekt'
    }
    if (!title.trim()) {
      newErrors.title = 'Bitte geben Sie einen Titel ein'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      setSaving(true)

      if (mode === 'create') {
        // Create new task
        const input: CreateTaskInput = {
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          due_date: dueDate || undefined,
          priority,
        }

        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fehler beim Erstellen')
        }

        const data = await response.json()
        onSave(data.task)
      } else if (task) {
        // Update existing task
        const input: UpdateTaskInput = {
          title: title.trim(),
          description: description.trim() || undefined,
          due_date: dueDate || null,
          priority,
        }

        const response = await fetch(`/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fehler beim Speichern')
        }

        const data = await response.json()
        onSave(data.task)
      }
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten',
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!task) return

    try {
      setDeleting(true)

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Loeschen')
      }

      onDelete?.()
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Fehler beim Loeschen',
      })
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Handle status toggle (edit mode)
  const handleStatusToggle = async () => {
    if (!task) return

    try {
      setSaving(true)

      const newStatus = task.status === 'open' ? 'completed' : 'open'
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren')
      }

      const data = await response.json()
      onSave(data.task)
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Fehler beim Aktualisieren',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      {/* Slide-up panel on mobile, centered modal on desktop */}
      <Card className="w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {mode === 'create' ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}
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
            <ProjectSelect
              value={projectId}
              onChange={setProjectId}
              unitId={defaultUnitId}
              disabled={mode === 'edit'} // Can't change project in edit mode
              error={errors.projectId}
            />

            {/* Title */}
            <Input
              label="Titel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Was soll erledigt werden?"
              error={errors.title}
              required
            />

            {/* Description */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Beschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Zusaetzliche Details..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Due date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Faelligkeitsdatum (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Priority */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioritaet
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status toggle (edit mode only) */}
            {mode === 'edit' && task && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Status: {task.status === 'open' ? 'Offen' : 'Erledigt'}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleStatusToggle}
                  loading={saving}
                >
                  {task.status === 'open' ? 'Als erledigt markieren' : 'Wieder oeffnen'}
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex gap-3 border-t border-gray-200 dark:border-gray-800">
            {/* Delete button (edit mode only) */}
            {mode === 'edit' && onDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
              >
                Loeschen
              </Button>
            )}

            <div className="flex-1" />

            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving || deleting}
            >
              Abbrechen
            </Button>

            <Button
              type="submit"
              loading={saving}
              disabled={deleting}
            >
              {mode === 'create' ? 'Erstellen' : 'Speichern'}
            </Button>
          </CardFooter>
        </form>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl m-4 space-y-4 max-w-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Aufgabe loeschen?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Diese Aktion kann nicht rueckgaengig gemacht werden.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  fullWidth
                >
                  Abbrechen
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  loading={deleting}
                  fullWidth
                >
                  Loeschen
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
