'use client'

/**
 * Checklist Execution Page
 *
 * Execute inspection checklist with pass/fail/na and photo upload.
 *
 * Path: /dashboard/abnahmen/[id]/checkliste
 * Phase 22-02: Inspection UI
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Button } from '@/components/ui/button'
import { ChecklistExecution } from '@/components/inspections/ChecklistExecution'
import { DefectList } from '@/components/inspections/DefectList'
import { DefectForm } from '@/components/inspections/DefectForm'
import type { Inspection, InspectionDefect, ChecklistSectionResult } from '@/types/inspections'

export default function ChecklisteExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [defects, setDefects] = useState<InspectionDefect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Defect form state
  const [isDefectFormOpen, setIsDefectFormOpen] = useState(false)

  useEffect(() => {
    fetchInspection()
  }, [id])

  const fetchInspection = async () => {
    try {
      const res = await fetch(`/api/inspections/${id}`)
      if (!res.ok) {
        throw new Error('Failed to fetch inspection')
      }
      const data = await res.json()
      setInspection(data.inspection)
      setDefects(data.defects || [])
    } catch (err) {
      console.error('Error fetching inspection:', err)
      setError(err instanceof Error ? err.message : 'Failed to load inspection')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (updatedItems: ChecklistSectionResult[]) => {
    try {
      const res = await fetch(`/api/inspections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist_items: updatedItems }),
      })

      if (!res.ok) {
        throw new Error('Failed to save checklist')
      }

      const data = await res.json()
      setInspection(data.inspection)
    } catch (err) {
      console.error('Error saving checklist:', err)
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <p className="text-gray-500 dark:text-gray-400">Laden...</p>
      </div>
    )
  }

  if (error || !inspection) {
    return (
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error || 'Abnahme nicht gefunden'}
        </div>
      </div>
    )
  }

  const isReadOnly = inspection.status !== 'in_progress'

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
      <DashboardBreadcrumbs />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {inspection.title} — Checkliste
          </h1>
          <Link href={`/dashboard/abnahmen/${id}`}>
            <Button variant="secondary">Zurück</Button>
          </Link>
        </div>
        {isReadOnly && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200">
            Diese Abnahme ist {inspection.status === 'completed' ? 'abgeschlossen' : 'unterschrieben'}.
            Bearbeitung nicht möglich.
          </div>
        )}
      </div>

      {/* Checklist execution */}
      {!isReadOnly ? (
        <ChecklistExecution inspection={inspection} onSave={handleSave} />
      ) : (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            Checkliste kann nicht mehr bearbeitet werden.
          </p>
        </div>
      )}

      {/* Defects section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Mängel ({defects.length})
          </h2>
          {!isReadOnly && (
            <Button onClick={() => setIsDefectFormOpen(true)}>Neuen Mangel erfassen</Button>
          )}
        </div>

        <DefectList defects={defects} onDefectClick={(defect) => console.log('Defect clicked:', defect)} />
      </div>

      {/* Defect form modal */}
      {isDefectFormOpen && (
        <DefectForm
          inspectionId={id}
          onClose={() => setIsDefectFormOpen(false)}
          onCreated={() => {
            setIsDefectFormOpen(false)
            fetchInspection() // Refresh to show new defect
          }}
        />
      )}
    </div>
  )
}
