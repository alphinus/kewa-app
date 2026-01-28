'use client'

/**
 * Send Portal Dialog Component
 *
 * Dialog for creating and sharing inspection portal link with contractors.
 * Generates magic link token and provides URL for manual sharing.
 *
 * Phase: 23-inspection-advanced Plan 02
 */

import { useState } from 'react'
import type { Inspection } from '@/types/inspections'

interface SendPortalDialogProps {
  inspection: Inspection
  isOpen: boolean
  onClose: () => void
}

export function SendPortalDialog({
  inspection,
  isOpen,
  onClose,
}: SendPortalDialogProps) {
  const [email, setEmail] = useState('')
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inspections/${inspection.id}/send-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        const data = await res.json()
        setPortalUrl(data.portalUrl)
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Erstellen des Links')
      }
    } catch (err) {
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleClose() {
    setEmail('')
    setPortalUrl(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Portal-Link senden</h3>

        {!portalUrl ? (
          <form onSubmit={handleSend}>
            <label className="block mb-4">
              <span className="text-sm text-gray-600">
                E-Mail-Adresse des Handwerkers
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="handwerker@firma.ch"
                className="w-full mt-1 px-3 py-2 border rounded-lg"
                required
              />
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Der Handwerker erhaelt einen Link zum Ansehen und Bestaetigen des
              Abnahmeprotokolls. Der Link ist 7 Tage gueltig.
            </p>
            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || !email}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Erstelle...' : 'Link erstellen'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-2">Portal-Link erstellt:</p>
            <div className="bg-gray-100 rounded-lg p-3 mb-4 break-all text-sm">
              {portalUrl}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                {copied ? 'Kopiert!' : 'Link kopieren'}
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg"
              >
                Schliessen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
