'use client'

/**
 * Re-inspection Button Component
 *
 * Button with modal dialog to schedule follow-up inspections.
 * Only visible for completed/signed inspections.
 *
 * Phase: 23-inspection-advanced
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Inspection } from '@/types/inspections'

interface ReInspectionButtonProps {
  inspection: Inspection
}

export function ReInspectionButton({ inspection }: ReInspectionButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only show for completed/signed inspections
  const canSchedule = ['completed', 'signed'].includes(inspection.status)

  if (!canSchedule) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/inspections/${inspection.id}/re-inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_date: date }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      const newInspection = await res.json()
      router.push(`/dashboard/abnahmen/${newInspection.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="min-h-[48px]"
      >
        Nachkontrolle planen
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Nachkontrolle planen
            </h3>

            <form onSubmit={handleSubmit}>
              <label className="block mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Datum
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full mt-1 px-3 py-2 h-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  required
                />
              </label>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Die Checkliste und aufgeschobene Maengel werden uebernommen.
              </p>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  {error}
                </p>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="min-h-[48px]"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !date}
                  className="min-h-[48px]"
                >
                  {loading ? 'Erstelle...' : 'Erstellen'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
