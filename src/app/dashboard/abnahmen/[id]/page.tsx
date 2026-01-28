'use client'

/**
 * Inspection Detail Page
 *
 * Displays inspection details with summary stats and defect count.
 *
 * Path: /dashboard/abnahmen/[id]
 * Phase 22-02: Inspection UI
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InspectionStatusBadge } from '@/components/inspections/InspectionStatusBadge'
import { SeverityBadge } from '@/components/inspections/SeverityBadge'
import type { Inspection, InspectionDefect } from '@/types/inspections'

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [defects, setDefects] = useState<InspectionDefect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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

    fetchInspection()
  }, [id])

  const handleComplete = async () => {
    if (!confirm('Abnahme abschliessen?')) return

    try {
      const res = await fetch(`/api/inspections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      if (!res.ok) {
        throw new Error('Failed to complete inspection')
      }

      const data = await res.json()
      setInspection(data.inspection)
    } catch (err) {
      console.error('Error completing inspection:', err)
      alert('Fehler beim Abschliessen')
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

  // Calculate checklist stats
  const checklistItems = inspection.checklist_items as any[] || []
  let totalItems = 0
  let passedItems = 0
  let failedItems = 0
  let naItems = 0
  let uncheckedItems = 0

  for (const section of checklistItems) {
    for (const item of section.items || []) {
      totalItems++
      if (item.status === 'pass') passedItems++
      else if (item.status === 'fail') failedItems++
      else if (item.status === 'na') naItems++
      else uncheckedItems++
    }
  }

  // Count defects by severity
  const geringCount = defects.filter((d) => d.severity === 'gering').length
  const mittelCount = defects.filter((d) => d.severity === 'mittel').length
  const schwerCount = defects.filter((d) => d.severity === 'schwer').length

  // Format date as Swiss German
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/abnahmen" className="hover:text-gray-700 dark:hover:text-gray-300">
          Abnahmen
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{inspection.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {inspection.title}
          </h1>
          <InspectionStatusBadge status={inspection.status} />
        </div>

        {inspection.description && (
          <p className="text-gray-600 dark:text-gray-400">{inspection.description}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Details
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Datum:</span>{' '}
              <span className="text-gray-900 dark:text-gray-100">
                {formatDate(inspection.inspection_date)}
              </span>
            </div>
            {inspection.work_order && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Auftrag:</span>{' '}
                <Link
                  href={`/dashboard/auftraege/${inspection.work_order.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {inspection.work_order.wo_number} - {inspection.work_order.title}
                </Link>
              </div>
            )}
            {inspection.project && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Projekt:</span>{' '}
                <Link
                  href={`/dashboard/projekte/${inspection.project.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {inspection.project.name}
                </Link>
              </div>
            )}
            {inspection.overall_result && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Ergebnis:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {inspection.overall_result === 'passed' && 'Bestanden'}
                  {inspection.overall_result === 'passed_with_conditions' && 'Mit Auflagen'}
                  {inspection.overall_result === 'failed' && 'Nicht bestanden'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Checkliste
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total:</span>{' '}
              <span className="text-gray-900 dark:text-gray-100">{totalItems}</span>
            </div>
            <div>
              <span className="text-green-600">Bestanden:</span> {passedItems}
            </div>
            <div>
              <span className="text-red-600">Nicht bestanden:</span> {failedItems}
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">N/A:</span> {naItems}
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Ungeprüft:</span> {uncheckedItems}
            </div>
          </div>
        </div>
      </div>

      {/* Defects summary */}
      {defects.length > 0 && (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Mängel ({defects.length})
          </h3>
          <div className="flex gap-4">
            {schwerCount > 0 && (
              <div className="flex items-center gap-2">
                <SeverityBadge severity="schwer" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{schwerCount}</span>
              </div>
            )}
            {mittelCount > 0 && (
              <div className="flex items-center gap-2">
                <SeverityBadge severity="mittel" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{mittelCount}</span>
              </div>
            )}
            {geringCount > 0 && (
              <div className="flex items-center gap-2">
                <SeverityBadge severity="gering" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{geringCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/dashboard/abnahmen/${id}/checkliste`}>
          <Button>Checkliste bearbeiten</Button>
        </Link>

        {inspection.status === 'in_progress' && (
          <Button variant="secondary" onClick={handleComplete}>
            Abnahme abschliessen
          </Button>
        )}
      </div>

      {/* Signature info */}
      {inspection.status === 'signed' && inspection.signer_name && (
        <div className="mt-6 p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Unterschrieben
          </h3>
          <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <div>
              <span className="font-medium">Name:</span> {inspection.signer_name}
            </div>
            {inspection.signer_role && (
              <div>
                <span className="font-medium">Rolle:</span> {inspection.signer_role}
              </div>
            )}
            {inspection.signed_at && (
              <div>
                <span className="font-medium">Datum:</span>{' '}
                {new Date(inspection.signed_at).toLocaleString('de-CH')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
