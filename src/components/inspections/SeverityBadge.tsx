'use client'

/**
 * SeverityBadge Component
 *
 * Displays defect severity as a colored badge with German label.
 *
 * Phase 22-02: Inspection UI
 */

import type { DefectSeverity } from '@/types/inspections'

interface SeverityBadgeProps {
  severity: DefectSeverity
}

const SEVERITY_CONFIG: Record<DefectSeverity, { label: string; color: string }> = {
  gering: { label: 'Gering', color: 'bg-yellow-100 text-yellow-800' },
  mittel: { label: 'Mittel', color: 'bg-orange-100 text-orange-800' },
  schwer: { label: 'Schwer', color: 'bg-red-100 text-red-800' },
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity]

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
