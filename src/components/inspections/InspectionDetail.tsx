'use client'

/**
 * Inspection Detail Component
 *
 * Comprehensive inspection detail view with stats, defects, and action buttons.
 * Phase: 22-inspection-core Plan 03
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InspectionStatusBadge } from './InspectionStatusBadge'
import { SeverityBadge } from './SeverityBadge'
import type { Inspection, InspectionDefect, ChecklistSectionResult } from '@/types/inspections'

interface InspectionDetailProps {
  inspection: Inspection
  defects: InspectionDefect[]
  onComplete?: () => void
}

export function InspectionDetail({ inspection, defects, onComplete }: InspectionDetailProps) {
  // Calculate checklist stats
  const checklistItems = (inspection.checklist_items as ChecklistSectionResult[]) || []
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {inspection.title}
          </h1>
          <div className="flex items-center gap-2">
            <InspectionStatusBadge status={inspection.status} />
            {inspection.overall_result && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                inspection.overall_result === 'passed'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : inspection.overall_result === 'passed_with_conditions'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              }`}>
                {inspection.overall_result === 'passed' && 'Bestanden'}
                {inspection.overall_result === 'passed_with_conditions' && 'Mit Auflagen'}
                {inspection.overall_result === 'failed' && 'Nicht bestanden'}
              </span>
            )}
          </div>
        </div>

        {inspection.description && (
          <p className="text-gray-600 dark:text-gray-400">{inspection.description}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {uncheckedItems > 0 && (
              <div>
                <span className="text-orange-600">Ungeprüft:</span> {uncheckedItems}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Defects summary */}
      {defects.length > 0 && (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
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

      {/* Signature section */}
      {inspection.status === 'signed' && inspection.signer_name && (
        <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
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

      {inspection.signature_refused && (
        <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Unterschrift verweigert
          </h3>
          {inspection.signature_refused_reason && (
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Grund: {inspection.signature_refused_reason}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {inspection.status === 'in_progress' && (
          <>
            <Link href={`/dashboard/abnahmen/${inspection.id}/checkliste`}>
              <Button className="min-h-[48px]">Checkliste bearbeiten</Button>
            </Link>
            {onComplete && (
              <Button variant="secondary" onClick={onComplete} className="min-h-[48px]">
                Abnahme abschliessen
              </Button>
            )}
          </>
        )}

        {inspection.status === 'completed' && (
          <>
            <Link href={`/dashboard/abnahmen/${inspection.id}/maengel`}>
              <Button className="min-h-[48px]">Mängel prüfen</Button>
            </Link>
            <Link href={`/dashboard/abnahmen/${inspection.id}/unterschrift`}>
              <Button variant="secondary" className="min-h-[48px]">Unterschrift erfassen</Button>
            </Link>
            <Link href={`/api/inspections/${inspection.id}/pdf`} target="_blank">
              <Button variant="outline" className="min-h-[48px]">PDF erstellen</Button>
            </Link>
          </>
        )}

        {inspection.status === 'signed' && (
          <Link href={`/api/inspections/${inspection.id}/pdf`} target="_blank">
            <Button className="min-h-[48px]">PDF herunterladen</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
