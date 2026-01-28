'use client'

/**
 * InspectionStatusBadge Component
 *
 * Displays inspection status as a colored badge with German label.
 *
 * Phase 22-02: Inspection UI
 */

import type { InspectionStatus } from '@/types/inspections'

interface InspectionStatusBadgeProps {
  status: InspectionStatus
}

const STATUS_CONFIG: Record<InspectionStatus, { label: string; color: string }> = {
  in_progress: { label: 'In Bearbeitung', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-800' },
  signed: { label: 'Unterschrieben', color: 'bg-purple-100 text-purple-800' },
}

export function InspectionStatusBadge({ status }: InspectionStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
