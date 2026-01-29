'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

interface QRLoginCodeProps {
  userId: string
}

/**
 * QR code component for multi-device login
 * Generates short-lived token (5 minutes) for scanning
 */
export function QRLoginCode({ userId }: QRLoginCodeProps) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const generateQRCode = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/portal/auth/qr-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('QR-Code konnte nicht generiert werden')
      }

      const data = await response.json()
      const baseUrl = window.location.origin
      setQrUrl(`${baseUrl}/portal/qr-login?token=${data.token}`)
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Fehler beim Generieren des QR-Codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateQRCode()
  }, [userId])

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <p className="text-sm text-gray-600 text-center">QR-Code wird generiert...</p>
      </div>
    )
  }

  if (!qrUrl) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <p className="text-sm text-red-600 text-center">QR-Code konnte nicht geladen werden</p>
        <button
          onClick={generateQRCode}
          className="mt-2 w-full min-h-[40px] px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <p className="text-sm text-gray-600 mb-4">
        Scannen Sie diesen Code mit einem anderen Gerät zum Anmelden
      </p>

      <div className="flex justify-center mb-4">
        <QRCodeSVG value={qrUrl} size={200} level="M" includeMargin />
      </div>

      <p className="text-xs text-gray-500 text-center mb-3">
        Gültig für 5 Minuten
      </p>

      <button
        onClick={generateQRCode}
        className="w-full min-h-[40px] px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
      >
        Neuen Code generieren
      </button>
    </div>
  )
}
