'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { TaskWithProject } from '@/types/database'
import type { Priority } from '@/types'

interface ImeriTaskCardProps {
  task: TaskWithProject
  onComplete: (task: TaskWithProject) => void
}

/**
 * Get priority badge styling
 */
function getPriorityBadge(priority: Priority): { label: string; className: string } {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Dringend',
        className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      }
    case 'high':
      return {
        label: 'Hoch',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      }
    case 'normal':
      return {
        label: 'Normal',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      }
    case 'low':
      return {
        label: 'Niedrig',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      }
  }
}

/**
 * Get due date display with urgency styling
 */
function getDueDateDisplay(dueDate: string | null): {
  label: string
  isOverdue: boolean
  isToday: boolean
} | null {
  if (!dueDate) return null

  const due = new Date(dueDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())

  const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      label: `Ueberfaellig (${due.toLocaleDateString('de-CH')})`,
      isOverdue: true,
      isToday: false,
    }
  } else if (diffDays === 0) {
    return { label: 'Heute', isOverdue: false, isToday: true }
  } else if (diffDays === 1) {
    return { label: 'Morgen', isOverdue: false, isToday: false }
  } else if (diffDays <= 7) {
    return { label: `In ${diffDays} Tagen`, isOverdue: false, isToday: false }
  } else {
    return {
      label: due.toLocaleDateString('de-CH'),
      isOverdue: false,
      isToday: false,
    }
  }
}

/**
 * Touch-optimized task card for Imeri's task list
 * Shows task title, location, due date, priority, and completion button
 */
export function ImeriTaskCard({ task, onComplete }: ImeriTaskCardProps) {
  const [expanded, setExpanded] = useState(false)

  const priorityBadge = getPriorityBadge(task.priority)
  const dueDateInfo = getDueDateDisplay(task.due_date)

  // Build location string
  const location = `${task.unit.name} - ${task.project.name}`

  return (
    <Card className="overflow-hidden relative group">
      <CardContent className="p-0">
        {/* Main card content - tappable to expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:pr-32"
          aria-expanded={expanded}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Task info */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                {task.title}
              </h3>

              {/* Location */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                {location}
              </p>

              {/* Due date and priority */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Due date */}
                {dueDateInfo && (
                  <span
                    className={`text-sm font-medium ${
                      dueDateInfo.isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : dueDateInfo.isToday
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {dueDateInfo.label}
                  </span>
                )}

                {/* Priority badge */}
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityBadge.className}`}
                >
                  {priorityBadge.label}
                </span>
              </div>
            </div>

            {/* Expand indicator */}
            <div className="flex-shrink-0 text-gray-400">
              <svg
                className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
            {/* Description */}
            {task.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 whitespace-pre-wrap">
                {task.description}
              </p>
            )}

            {/* Complete button */}
            <div className="mt-4">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation()
                  onComplete(task)
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Erledigt
              </Button>
            </div>
          </div>
        )}

        {/* Quick complete button when collapsed - visible on hover on larger screens */}
        {!expanded && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="primary"
              size="md"
              onClick={(e) => {
                e.stopPropagation()
                onComplete(task)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Erledigt
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
