/**
 * Change Order PDF Download Component
 *
 * Button to download change order as PDF document.
 * Phase 21-03: Photo Evidence and PDF Generation
 */

'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface ChangeOrderPDFProps {
  changeOrderId: string
  coNumber: string
}

export function ChangeOrderPDF({ changeOrderId, coNumber }: ChangeOrderPDFProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/change-orders/${changeOrderId}/pdf`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'PDF-Generierung fehlgeschlagen')
      }

      // Get PDF blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${coNumber}.pdf`
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF-Generierung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Wird generiert...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>PDF herunterladen</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
