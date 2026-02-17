'use client'

/**
 * Defect Review and Action Page
 *
 * Review all defects and take action on each.
 * Path: /dashboard/abnahmen/[id]/mängel
 * Phase: 22-inspection-core Plan 03
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DefectReviewCard } from '@/components/inspections/DefectReviewCard'
import type { Inspection, InspectionDefect } from '@/types/inspections'

export default function DefectReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [defects, setDefects] = useState<InspectionDefect[]>([])
  const [users, setUsers] = useState<Array<{ id: string; display_name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch inspection with defects
        const inspectionRes = await fetch(`/api/inspections/${id}`)
        if (!inspectionRes.ok) {
          throw new Error('Failed to fetch inspection')
        }
        const inspectionData = await inspectionRes.json()
        setInspection(inspectionData.inspection)
        setDefects(inspectionData.defects || [])

        // Fetch users for assignee selection
        const usersRes = await fetch('/api/users')
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleActionTaken = async () => {
    // Refresh defects after action taken
    try {
      const res = await fetch(`/api/inspections/${id}`)
      if (res.ok) {
        const data = await res.json()
        setDefects(data.defects || [])
      }
    } catch (err) {
      console.error('Error refreshing defects:', err)
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

  // Sort defects by severity (schwer first) then date
  const sortedDefects = [...defects].sort((a, b) => {
    const severityOrder: Record<string, number> = { schwer: 0, mittel: 1, gering: 2 }
    const severityCompare = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityCompare !== 0) return severityCompare
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  const defectsWithoutAction = defects.filter(d => !d.action).length

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
        <Link href={`/dashboard/abnahmen/${id}`} className="hover:text-gray-700 dark:hover:text-gray-300">
          {inspection.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Mängel prüfen</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Mängel prüfen
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {defects.length} Mängel gesamt, {defectsWithoutAction} ohne Aktion
        </p>
      </div>

      {/* Defect cards */}
      {defects.length === 0 ? (
        <div className="p-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Keine Mängel erfasst.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDefects.map((defect) => (
            <DefectReviewCard
              key={defect.id}
              defect={defect}
              onActionTaken={handleActionTaken}
              users={users}
            />
          ))}
        </div>
      )}

      {/* Back button */}
      <div className="mt-6">
        <Link href={`/dashboard/abnahmen/${id}`}>
          <Button variant="outline" className="min-h-[48px]">
            Zurück zur Abnahme
          </Button>
        </Link>
      </div>
    </div>
  )
}
