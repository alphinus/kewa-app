'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { TaskWithProject } from '@/types/database'

interface CompleteTaskModalProps {
  task: TaskWithProject
  onClose: () => void
  onComplete: () => void
}

const MAX_NOTE_LENGTH = 200

/**
 * Task completion confirmation modal
 * Shows task details, optional note input, and confirm/cancel buttons
 * Accessible: focus trap, escape to close, proper ARIA
 */
export function CompleteTaskModal({ task, onClose, onComplete }: CompleteTaskModalProps) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap and escape key handling
  useEffect(() => {
    // Focus the cancel button on open
    cancelButtonRef.current?.focus()

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    // Handle focus trap
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleFocusTrap)

    // Prevent body scroll
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleFocusTrap)
      document.body.style.overflow = ''
    }
  }, [loading, onClose])

  // Handle confirmation
  const handleConfirm = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          completion_note: note.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to complete task')
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  // Build location string
  const location = `${task.unit.name} - ${task.project.name}`

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 shadow-xl"
      >
        {/* Header */}
        <h2
          id="modal-title"
          className="text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          Aufgabe abschliessen
        </h2>

        {/* Task info */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {task.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {location}
          </p>
        </div>

        {/* Note input */}
        <div className="mt-4">
          <label
            htmlFor="completion-note"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Notiz (optional)
          </label>
          <textarea
            id="completion-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            placeholder="Kurze Notiz zur Erledigung..."
            rows={3}
            maxLength={MAX_NOTE_LENGTH}
            disabled={loading}
            className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
            {note.length}/{MAX_NOTE_LENGTH}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleConfirm}
            loading={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            Als erledigt markieren
          </Button>
        </div>
      </div>
    </div>
  )
}
