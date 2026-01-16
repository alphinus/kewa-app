'use client'

import type { TaskWithProject } from '@/types/database'

interface CompleteTaskModalProps {
  task: TaskWithProject
  onClose: () => void
  onComplete: () => void
}

/**
 * Placeholder - will be implemented in Task 2
 */
export function CompleteTaskModal({ task, onClose, onComplete }: CompleteTaskModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-sm w-full mx-4">
        <h2>TODO: {task.title}</h2>
        <button onClick={onClose}>Close</button>
        <button onClick={onComplete}>Complete</button>
      </div>
    </div>
  )
}
