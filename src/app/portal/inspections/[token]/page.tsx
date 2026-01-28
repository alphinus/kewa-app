'use client'

/**
 * Inspection Portal Page
 *
 * Public contractor-facing page for viewing and acknowledging inspection results.
 * No authentication required - token-based access only.
 *
 * Phase: 23-inspection-advanced Plan 02
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ContractorInspectionView } from '@/components/inspections/ContractorInspectionView'

interface PortalData {
  valid: boolean
  inspection?: any
  email?: string
  error?: string
}

export default function InspectionPortalPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<PortalData | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/portal/inspections/${token}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [token])

  async function handleAcknowledge() {
    const res = await fetch(`/api/portal/inspections/${token}/acknowledge`, {
      method: 'POST',
    })
    if (res.ok) {
      setAcknowledged(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Lade Abnahmeprotokoll...</div>
      </div>
    )
  }

  if (!data?.valid) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h1 className="text-xl font-semibold mb-2">Link ungueltig</h1>
          <p className="text-gray-600">
            {data?.error || 'Dieser Link ist abgelaufen oder wurde bereits verwendet.'}
          </p>
        </div>
      </div>
    )
  }

  if (acknowledged) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-green-500 text-4xl mb-4">&#10003;</div>
          <h1 className="text-xl font-semibold mb-2">Bestaetigt</h1>
          <p className="text-gray-600">
            Vielen Dank. Die Bestaetigung wurde erfolgreich uebermittelt.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="bg-blue-900 text-white rounded-t-lg p-6">
          <h1 className="text-xl font-semibold">KEWA AG</h1>
          <p className="text-blue-200 text-sm">Abnahmeprotokoll</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-lg shadow-lg">
          <ContractorInspectionView
            inspection={data.inspection}
            onAcknowledge={handleAcknowledge}
          />
        </div>
      </div>
    </div>
  )
}
