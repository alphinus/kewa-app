'use client'

/**
 * Inspection Detail Page
 *
 * Displays inspection details with summary stats and defect count.
 *
 * Path: /dashboard/abnahmen/[id]
 * Phase 22-02: Inspection UI
 * Updated Phase 22-03: Added completion flow with defect warnings
 * Updated Phase 23-01: Added re-inspection scheduling and history
 * Updated Phase 23-03: Integrated all Phase 23 components into InspectionDetail
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InspectionDetail } from '@/components/inspections/InspectionDetail'
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
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningData, setWarningData] = useState<{
    message: string
    open_defects_count: number
  } | null>(null)

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

  const handleComplete = async (acknowledge: boolean = false) => {
    try {
      const res = await fetch(`/api/inspections/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledge_defects: acknowledge }),
      })

      if (!res.ok) {
        throw new Error('Failed to complete inspection')
      }

      const data = await res.json()

      // Handle warning response
      if (data.warning) {
        setWarningData({
          message: data.message,
          open_defects_count: data.open_defects_count,
        })
        setShowWarningModal(true)
        return
      }

      // Success - refresh inspection
      setInspection(data.inspection)
      setShowWarningModal(false)
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

  // Check if this is a re-inspection (has parent)
  const isReInspection = !!inspection.parent_inspection_id

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

      {/* InspectionDetail component with all Phase 23 integrations */}
      <InspectionDetail
        inspection={inspection}
        defects={defects}
        onComplete={() => handleComplete(false)}
        showHistory={isReInspection || inspection.status === 'signed'}
      />

      {/* Warning modal for open defects */}
      {showWarningModal && warningData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Offene Mängel
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {warningData.message}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {warningData.open_defects_count}{' '}
              {warningData.open_defects_count === 1 ? 'Mangel ist' : 'Mängel sind'} noch offen.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => handleComplete(true)} className="flex-1 min-h-[48px]">
                Trotzdem abschliessen
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowWarningModal(false)}
                className="flex-1 min-h-[48px]"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
