'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { TaskWithProject } from '@/types/database'
import type { Priority } from '@/types'

interface TaskListProps {
  /** Tasks to display */
  tasks: TaskWithProject[]
  /** Callback when a task is clicked */
  onTaskClick: (task: TaskWithProject) => void
  /** Callback when delete is requested */
  onDeleteClick: (task: TaskWithProject) => void
  /** Building name lookup map for "all" view badges */
  buildingNames?: Record<string, string>
}

// Priority display configuration
const priorityConfig: Record<Priority, { label: string; classes: string }> = {
  urgent: {
    label: 'Dringend',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  high: {
    label: 'Hoch',
    classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  normal: {
    label: 'Normal',
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  low: {
    label: 'Niedrig',
    classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
}

/**
 * Format date for display (German format)
 */
function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Check if date is in the past
 */
function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(dateString)
  return dueDate < today
}

/**
 * Task list component
 * Displays tasks as cards with priority badge and due date
 */
export function TaskList({ tasks, onTaskClick, onDeleteClick, buildingNames }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Keine Aufgaben vorhanden
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskClick(task)}
          onDelete={() => onDeleteClick(task)}
          buildingName={task.unit.building_id && buildingNames ? buildingNames[task.unit.building_id] : undefined}
        />
      ))}
    </div>
  )
}

interface TaskCardProps {
  task: TaskWithProject
  onClick: () => void
  onDelete: () => void
  buildingName?: string
}

/**
 * Individual task card
 */
function TaskCard({ task, onClick, onDelete, buildingName }: TaskCardProps) {
  const priority = priorityConfig[task.priority]
  const dueDate = formatDate(task.due_date)
  const overdue = isOverdue(task.due_date) && task.status === 'open'
  const isCompleted = task.status === 'completed'

  return (
    <Card
      className={`cursor-pointer active:scale-[0.98] transition-transform ${
        isCompleted ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 min-h-[48px]">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p
              className={`font-medium text-gray-900 dark:text-gray-100 ${
                isCompleted ? 'line-through' : ''
              }`}
            >
              {task.title}
            </p>

            {/* Project and unit subtitle */}
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {buildingName && (
                <span className="inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                  {buildingName}
                </span>
              )}
              {task.project.name} - {task.unit.name}
            </p>

            {/* Due date */}
            {dueDate && (
              <p
                className={`text-sm mt-1 ${
                  overdue
                    ? 'text-red-500 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {overdue ? 'Ueberfaellig: ' : 'Faellig: '}
                {dueDate}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status indicator */}
            {isCompleted && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Erledigt
              </span>
            )}

            {/* Priority badge (only for open tasks) */}
            {!isCompleted && (
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${priority.classes}`}
              >
                {priority.label}
              </span>
            )}

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Aufgabe loeschen"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
