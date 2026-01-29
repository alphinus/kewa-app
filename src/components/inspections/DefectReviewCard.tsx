'use client'

/**
 * Defect Review Card Component
 *
 * Defect action selection card for post-inspection review.
 * Phase: 22-inspection-core Plan 03
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SeverityBadge } from './SeverityBadge'
import { toast } from 'sonner'
import type { InspectionDefect, DefectAction } from '@/types/inspections'

interface DefectReviewCardProps {
  defect: InspectionDefect
  onActionTaken: () => void
  users: Array<{ id: string; display_name: string }>
}

export function DefectReviewCard({ defect, onActionTaken, users }: DefectReviewCardProps) {
  const [selectedAction, setSelectedAction] = useState<DefectAction | null>(null)
  const [reason, setReason] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedAction) return

    // Validate required fields
    if (selectedAction === 'dismissed' && !reason.trim()) {
      toast.warning('Grund ist erforderlich beim Verwerfen')
      return
    }

    if (selectedAction === 'task_created' && !assigneeId) {
      toast.warning('Bitte waehlen Sie einen Verantwortlichen aus')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/inspections/${defect.inspection_id}/defects/${defect.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          reason: reason || undefined,
          assignee_id: assigneeId || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Ausführen der Aktion')
      }

      onActionTaken()
    } catch (error) {
      console.error('Error taking action:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Ausfuehren der Aktion')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render read-only if action already taken
  if (defect.action) {
    const actionLabels: Record<DefectAction, string> = {
      task_created: 'Aufgabe erstellt',
      deferred: 'Auf nächste Abnahme verschoben',
      dismissed: 'Verworfen',
    }

    return (
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">{defect.title}</h4>
          <SeverityBadge severity={defect.severity} />
        </div>

        {defect.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{defect.description}</p>
        )}

        {defect.photo_storage_paths.length > 0 && (
          <div className="flex gap-2 mb-3">
            {defect.photo_storage_paths.map((path, idx) => (
              <div
                key={idx}
                className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
              >
                {/* Photo thumbnail placeholder */}
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Aktion: {actionLabels[defect.action]}
          </div>
          {defect.action_reason && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Grund: {defect.action_reason}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render action selection
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">{defect.title}</h4>
        <SeverityBadge severity={defect.severity} />
      </div>

      {defect.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{defect.description}</p>
      )}

      {defect.photo_storage_paths.length > 0 && (
        <div className="flex gap-2 mb-3">
          {defect.photo_storage_paths.map((path, idx) => (
            <div
              key={idx}
              className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
            >
              {/* Photo thumbnail placeholder */}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Aktion wählen
          </Label>
          <div className="mt-2 space-y-2">
            {/* Task Created */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name={`action-${defect.id}`}
                value="task_created"
                checked={selectedAction === 'task_created'}
                onChange={(e) => setSelectedAction(e.target.value as DefectAction)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Aufgabe erstellen
              </span>
            </label>

            {selectedAction === 'task_created' && (
              <div className="ml-6">
                <Label htmlFor="assignee" className="text-xs">Verantwortlicher</Label>
                <select
                  id="assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Auswählen...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Deferred */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name={`action-${defect.id}`}
                value="deferred"
                checked={selectedAction === 'deferred'}
                onChange={(e) => setSelectedAction(e.target.value as DefectAction)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auf nächste Abnahme verschieben
              </span>
            </label>

            {selectedAction === 'deferred' && (
              <div className="ml-6">
                <Label htmlFor="defer-reason" className="text-xs">Grund (optional)</Label>
                <Textarea
                  id="defer-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Grund für Verschiebung..."
                  rows={2}
                  className="mt-1 text-sm"
                />
              </div>
            )}

            {/* Dismissed */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name={`action-${defect.id}`}
                value="dismissed"
                checked={selectedAction === 'dismissed'}
                onChange={(e) => setSelectedAction(e.target.value as DefectAction)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Verwerfen
              </span>
            </label>

            {selectedAction === 'dismissed' && (
              <div className="ml-6">
                <Label htmlFor="dismiss-reason" className="text-xs">Grund (erforderlich)</Label>
                <Textarea
                  id="dismiss-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Grund für Verwerfung..."
                  rows={2}
                  className="mt-1 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={
            !selectedAction ||
            isSubmitting ||
            (selectedAction === 'dismissed' && !reason.trim()) ||
            (selectedAction === 'task_created' && !assigneeId)
          }
          className="w-full min-h-[48px]"
        >
          {isSubmitting ? 'Wird ausgeführt...' : 'Aktion ausführen'}
        </Button>
      </div>
    </div>
  )
}
