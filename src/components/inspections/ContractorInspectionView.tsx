'use client'

/**
 * Contractor Inspection View Component
 *
 * Read-only view of inspection results for contractors via portal.
 * Shows inspection details, defects, and signature info with acknowledge button.
 *
 * Phase: 23-inspection-advanced Plan 02
 */

import { useState } from 'react'
import { SeverityBadge } from './SeverityBadge'
import type { DefectSeverity, DefectAction } from '@/types/inspections'

interface InspectionDefectPortal {
  id: string
  title: string
  description: string | null
  severity: DefectSeverity
  status: string
  action: DefectAction | null
}

interface InspectionPortal {
  id: string
  title: string
  description: string | null
  inspection_date: string
  status: string
  overall_result: string | null
  checklist_items: any[]
  signer_name: string | null
  signer_role: string | null
  signed_at: string | null
  signature_refused: boolean
  signature_refused_reason: string | null
  work_order?: { id: string; title: string; wo_number: string } | null
  project?: { id: string; name: string } | null
  defects: InspectionDefectPortal[]
}

interface ContractorInspectionViewProps {
  inspection: InspectionPortal
  onAcknowledge: () => void
}

export function ContractorInspectionView({
  inspection,
  onAcknowledge,
}: ContractorInspectionViewProps) {
  const [confirming, setConfirming] = useState(false)

  const resultLabels: Record<string, string> = {
    passed: 'Bestanden',
    passed_with_conditions: 'Bestanden mit Auflagen',
    failed: 'Nicht bestanden',
  }

  const resultColors: Record<string, string> = {
    passed: 'bg-green-100 text-green-800',
    passed_with_conditions: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  }

  const actionLabels: Record<string, string> = {
    task_created: 'Aufgabe erstellt',
    deferred: 'Aufgeschoben',
    dismissed: 'Abgelehnt',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm text-gray-500">Titel</span>
          <p className="font-medium">{inspection.title}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Datum</span>
          <p className="font-medium">
            {new Date(inspection.inspection_date).toLocaleDateString('de-CH')}
          </p>
        </div>
        {inspection.work_order && (
          <div>
            <span className="text-sm text-gray-500">Arbeitsauftrag</span>
            <p className="font-medium">
              {inspection.work_order.wo_number} - {inspection.work_order.title}
            </p>
          </div>
        )}
        {inspection.project && (
          <div>
            <span className="text-sm text-gray-500">Projekt</span>
            <p className="font-medium">{inspection.project.name}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {inspection.description && (
        <div className="border-t pt-4">
          <span className="text-sm text-gray-500 block mb-1">Beschreibung</span>
          <p className="text-gray-700">{inspection.description}</p>
        </div>
      )}

      {/* Overall Result */}
      {inspection.overall_result && (
        <div className="border-t pt-4">
          <span className="text-sm text-gray-500 block mb-2">Gesamtergebnis</span>
          <span
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              resultColors[inspection.overall_result] || 'bg-gray-100'
            }`}
          >
            {resultLabels[inspection.overall_result] || inspection.overall_result}
          </span>
        </div>
      )}

      {/* Defects */}
      {inspection.defects?.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Mängel ({inspection.defects.length})</h3>
          <div className="space-y-2">
            {inspection.defects.map((defect) => (
              <div key={defect.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{defect.title}</span>
                  <SeverityBadge severity={defect.severity} />
                </div>
                {defect.description && (
                  <p className="text-sm text-gray-600">{defect.description}</p>
                )}
                {defect.action && (
                  <p className="text-xs text-gray-500 mt-1">
                    Massnahme: {actionLabels[defect.action] || defect.action}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature Info */}
      {inspection.signed_at && (
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Unterschrift</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium">{inspection.signer_name}</p>
            <p className="text-sm text-gray-600">{inspection.signer_role}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(inspection.signed_at).toLocaleString('de-CH')}
            </p>
          </div>
        </div>
      )}

      {inspection.signature_refused && (
        <div className="border-t pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-1">
              Unterschrift verweigert
            </h3>
            <p className="text-sm text-yellow-700">
              {inspection.signature_refused_reason}
            </p>
          </div>
        </div>
      )}

      {/* Acknowledge Button */}
      <div className="border-t pt-6">
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Kenntnisnahme bestätigen
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Mit der Bestätigung erklären Sie, dass Sie das Abnahmeprotokoll
              erhalten und zur Kenntnis genommen haben.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-3 border rounded-lg font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={onAcknowledge}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Bestaetigen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
