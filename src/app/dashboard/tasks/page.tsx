'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ImeriTaskCard } from '@/components/tasks/ImeriTaskCard'
import { CompleteTaskModal } from '@/components/tasks/CompleteTaskModal'
import type { TaskWithProject, TasksResponse } from '@/types/database'

/**
 * Group tasks by due date category
 */
function groupTasksByDueDate(tasks: TaskWithProject[]): {
  overdue: TaskWithProject[]
  today: TaskWithProject[]
  thisWeek: TaskWithProject[]
  later: TaskWithProject[]
  noDueDate: TaskWithProject[]
} {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekFromNow = new Date(today)
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  const groups = {
    overdue: [] as TaskWithProject[],
    today: [] as TaskWithProject[],
    thisWeek: [] as TaskWithProject[],
    later: [] as TaskWithProject[],
    noDueDate: [] as TaskWithProject[],
  }

  for (const task of tasks) {
    if (!task.due_date) {
      groups.noDueDate.push(task)
      continue
    }

    const dueDate = new Date(task.due_date)
    const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

    if (dueDay < today) {
      groups.overdue.push(task)
    } else if (dueDay.getTime() === today.getTime()) {
      groups.today.push(task)
    } else if (dueDay < weekFromNow) {
      groups.thisWeek.push(task)
    } else {
      groups.later.push(task)
    }
  }

  return groups
}

/**
 * Skeleton loading card
 */
function TaskCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
          <div className="flex gap-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Section header with count
 */
function SectionHeader({
  title,
  count,
  variant,
}: {
  title: string
  count: number
  variant: 'danger' | 'warning' | 'default'
}) {
  const colorClasses = {
    danger: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    warning: 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    default: 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  }

  return (
    <div
      className={`flex items-center justify-between py-2 px-3 rounded-lg border ${colorClasses[variant]}`}
    >
      <span className="font-medium">{title}</span>
      <span className="text-sm opacity-75">{count}</span>
    </div>
  )
}

/**
 * Imeri's task list page
 * Shows open tasks grouped by due date with completion functionality
 */
export default function ImeriTasksPage() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null)

  // Fetch open tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/tasks?status=open')

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data: TasksResponse = await response.json()
      setTasks(data.tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Handle task completion
  const handleComplete = (task: TaskWithProject) => {
    setSelectedTask(task)
  }

  // Handle completion success - remove task from list
  const handleCompletionSuccess = () => {
    if (selectedTask) {
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id))
    }
    setSelectedTask(null)
  }

  // Group tasks
  const groupedTasks = groupTasksByDueDate(tasks)

  // Calculate total
  const totalTasks = tasks.length

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Meine Aufgaben
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {loading ? (
            <span className="inline-block w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            `${totalTasks} offene Aufgaben`
          )}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchTasks}
            className="mt-2 text-sm text-red-700 dark:text-red-300 underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tasks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-3">&#10003;</div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Keine offenen Aufgaben
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gut gemacht! Alle Aufgaben sind erledigt.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Task list grouped by due date */}
      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-6">
          {/* Overdue */}
          {groupedTasks.overdue.length > 0 && (
            <section>
              <SectionHeader
                title="Ueberfaellig"
                count={groupedTasks.overdue.length}
                variant="danger"
              />
              <div className="mt-3 space-y-3">
                {groupedTasks.overdue.map((task) => (
                  <ImeriTaskCard key={task.id} task={task} onComplete={handleComplete} />
                ))}
              </div>
            </section>
          )}

          {/* Today */}
          {groupedTasks.today.length > 0 && (
            <section>
              <SectionHeader
                title="Heute"
                count={groupedTasks.today.length}
                variant="warning"
              />
              <div className="mt-3 space-y-3">
                {groupedTasks.today.map((task) => (
                  <ImeriTaskCard key={task.id} task={task} onComplete={handleComplete} />
                ))}
              </div>
            </section>
          )}

          {/* This week */}
          {groupedTasks.thisWeek.length > 0 && (
            <section>
              <SectionHeader
                title="Diese Woche"
                count={groupedTasks.thisWeek.length}
                variant="default"
              />
              <div className="mt-3 space-y-3">
                {groupedTasks.thisWeek.map((task) => (
                  <ImeriTaskCard key={task.id} task={task} onComplete={handleComplete} />
                ))}
              </div>
            </section>
          )}

          {/* Later */}
          {groupedTasks.later.length > 0 && (
            <section>
              <SectionHeader
                title="Spaeter"
                count={groupedTasks.later.length}
                variant="default"
              />
              <div className="mt-3 space-y-3">
                {groupedTasks.later.map((task) => (
                  <ImeriTaskCard key={task.id} task={task} onComplete={handleComplete} />
                ))}
              </div>
            </section>
          )}

          {/* No due date */}
          {groupedTasks.noDueDate.length > 0 && (
            <section>
              <SectionHeader
                title="Ohne Faelligkeitsdatum"
                count={groupedTasks.noDueDate.length}
                variant="default"
              />
              <div className="mt-3 space-y-3">
                {groupedTasks.noDueDate.map((task) => (
                  <ImeriTaskCard key={task.id} task={task} onComplete={handleComplete} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Completion modal */}
      {selectedTask && (
        <CompleteTaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onComplete={handleCompletionSuccess}
        />
      )}
    </div>
  )
}
