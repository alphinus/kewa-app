'use client'

/**
 * Signature Capture Page
 *
 * Capture contractor signature for completed inspection.
 * Path: /dashboard/abnahmen/[id]/unterschrift
 * Phase: 22-inspection-core Plan 03
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { SignatureCapture } from '@/components/inspections/SignatureCapture'
import { SeverityBadge } from '@/components/inspections/SeverityBadge'
import { toast } from 'sonner'
import type { Inspection, InspectionDefect } from '@/types/inspections'

export default function SignaturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

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
        const insp = data.inspection

        // Redirect if not completed
        if (insp.status !== 'completed') {
          toast.warning('Abnahme muss zuerst abgeschlossen werden')
          router.push(`/dashboard/abnahmen/${id}`)
          return
        }

        setInspection(insp)
        setDefects(data.defects || [])
      } catch (err) {
        console.error('Error fetching inspection:', err)
        setError(err instanceof Error ? err.message : 'Failed to load inspection')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInspection()
  }, [id, router])

  const handleSave = async (imageDataUrl: string, signerName: string, signerRole: string) => {
    const res = await fetch(`/api/inspections/${id}/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_data_url: imageDataUrl,
        signer_name: signerName,
        signer_role: signerRole,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Fehler beim Speichern')
    }

    // Success - redirect to inspection detail
    router.push(`/dashboard/abnahmen/${id}`)
  }

  const handleRefused = async (reason: string) => {
    const res = await fetch(`/api/inspections/${id}/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refused: true,
        refused_reason: reason,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Fehler beim Speichern')
    }

    // Success - redirect to inspection detail
    router.push(`/dashboard/abnahmen/${id}`)
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

  // Format date as Swiss German
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Count schwer defects
  const schwerDefects = defects.filter(d => d.severity === 'schwer' && d.status === 'open')

  return (
    <div className="p-4 pb-20 sm:p-6 max-w-4xl mx-auto">
      <DashboardBreadcrumbs />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Unterschrift
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bitte Unterschrift des Handwerkers erfassen oder Verweigerung dokumentieren.
        </p>
      </div>

      {/* Inspection summary */}
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 mb-6">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Abnahme Übersicht
        </h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Titel:</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">{inspection.title}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Datum:</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">
              {formatDate(inspection.inspection_date)}
            </span>
          </div>
          {inspection.overall_result && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Ergebnis:</span>{' '}
              <span className={`font-medium ${
                inspection.overall_result === 'passed' ? 'text-green-600' :
                inspection.overall_result === 'passed_with_conditions' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {inspection.overall_result === 'passed' && 'Bestanden'}
                {inspection.overall_result === 'passed_with_conditions' && 'Mit Auflagen'}
                {inspection.overall_result === 'failed' && 'Nicht bestanden'}
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-600 dark:text-gray-400">Mängel:</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">{defects.length} gesamt</span>
            {schwerDefects.length > 0 && (
              <>
                {', '}
                <span className="text-red-600 font-medium">
                  {schwerDefects.length} schwer
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Warning for schwer defects */}
      {schwerDefects.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
          <div className="flex items-start gap-2">
            <SeverityBadge severity="schwer" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium mb-1">Achtung: Schwere Mängel vorhanden</p>
              <p>
                Es gibt {schwerDefects.length} schwere{' '}
                {schwerDefects.length === 1 ? 'Mangel' : 'Mängel'}, die vor der Unterschrift
                behoben werden sollten.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Signature capture */}
      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <SignatureCapture onSave={handleSave} onRefused={handleRefused} />
      </div>
    </div>
  )
}
