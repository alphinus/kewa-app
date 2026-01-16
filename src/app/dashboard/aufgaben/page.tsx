'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskForm } from '@/components/tasks/TaskForm'
import type { TaskWithProject, TasksResponse, UnitWithStats, UnitsResponse } from '@/types/database'
import type { TaskStatus } from '@/types'

/**
 * Aufgaben (Tasks) management page
 * Shows task list with filters and CRUD operations
 */
function AufgabenPageContent() {
  const searchParams = useSearchParams()
  const unitIdFromUrl = searchParams.get('unit_id')

  // State
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [units, setUnits] = useState<UnitWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [unitFilter, setUnitFilter] = useState<string>(unitIdFromUrl || '')

  // Modal state
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TaskWithProject | null>(null)

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (unitFilter) {
        params.set('unit_id', unitFilter)
      }

      const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Aufgaben')
      }

      const data: TasksResponse = await response.json()
      setTasks(data.tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, unitFilter])

  // Fetch units for filter dropdown
  const fetchUnits = useCallback(async () => {
    try {
      const response = await fetch('/api/units')
      if (response.ok) {
        const data: UnitsResponse = await response.json()
        setUnits(data.units)
      }
    } catch {
      // Silently fail - units filter is optional
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchTasks()
    fetchUnits()
  }, [fetchTasks, fetchUnits])

  // Update unit filter when URL changes
  useEffect(() => {
    if (unitIdFromUrl) {
      setUnitFilter(unitIdFromUrl)
    }
  }, [unitIdFromUrl])

  // Handle task click (edit)
  const handleTaskClick = (task: TaskWithProject) => {
    setEditingTask(task)
    setShowForm(true)
  }

  // Handle delete click
  const handleDeleteClick = (task: TaskWithProject) => {
    setDeleteConfirm(task)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return

    try {
      const response = await fetch(`/api/tasks/${deleteConfirm.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Loeschen')
      }

      // Refresh list
      await fetchTasks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // Handle form close
  const handleFormClose = () => {
    setShowForm(false)
    setEditingTask(null)
  }

  // Handle save (create or update)
  const handleSave = async () => {
    await fetchTasks()
    handleFormClose()
  }

  // Handle delete from form
  const handleDelete = async () => {
    await fetchTasks()
    handleFormClose()
  }

  // Handle new task button
  const handleNewTask = () => {
    setEditingTask(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Aufgaben
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {tasks.length} Aufgabe{tasks.length !== 1 ? 'n' : ''}
          </p>
        </div>
        <Button onClick={handleNewTask}>
          Neue Aufgabe
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
          className="h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Alle Status</option>
          <option value="open">Offen</option>
          <option value="completed">Erledigt</option>
        </select>

        {/* Unit filter */}
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="flex-1 h-12 min-h-[48px] px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Einheiten</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchTasks}
              className="mt-2 text-blue-500 underline"
            >
              Erneut versuchen
            </button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Task list */}
      {!loading && !error && (
        <TaskList
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onDeleteClick={handleDeleteClick}
        />
      )}

      {/* Task form modal */}
      {showForm && (
        <TaskForm
          mode={editingTask ? 'edit' : 'create'}
          task={editingTask || undefined}
          defaultUnitId={unitFilter || undefined}
          onSave={handleSave}
          onCancel={handleFormClose}
          onDelete={handleDelete}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Aufgabe loeschen?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Moechten Sie &quot;{deleteConfirm.title}&quot; wirklich loeschen?
                Diese Aktion kann nicht rueckgaengig gemacht werden.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                  fullWidth
                >
                  Abbrechen
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  fullWidth
                >
                  Loeschen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function AufgabenPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="flex gap-3">
          <div className="h-12 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-12 flex-1 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    }>
      <AufgabenPageContent />
    </Suspense>
  )
}
