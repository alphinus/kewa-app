'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

/**
 * QR login handler page
 * Verifies QR token and auto-logs in the user
 */
export default function QRLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = searchParams?.get('token')

    if (!token) {
      setStatus('error')
      setErrorMessage('Kein Token vorhanden')
      return
    }

    // Verify token and login
    fetch('/api/portal/auth/qr-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success')
          toast.success('Erfolgreich angemeldet')
          setTimeout(() => router.push('/portal'), 1000)
        } else {
          setStatus('error')
          setErrorMessage(data.error || 'QR-Code ungültig oder abgelaufen')
        }
      })
      .catch(() => {
        setStatus('error')
        setErrorMessage('Ein Fehler ist aufgetreten')
      })
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <div className="mb-4">
              <svg
                className="animate-spin h-12 w-12 mx-auto text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-lg text-gray-900">Anmeldung läuft...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4 text-green-600">
              <svg
                className="h-12 w-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg text-gray-900">Erfolgreich angemeldet!</p>
            <p className="text-sm text-gray-600 mt-2">Sie werden weitergeleitet...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4 text-red-600">
              <svg
                className="h-12 w-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-lg text-gray-900 mb-2">Anmeldung fehlgeschlagen</p>
            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
            <Link
              href="/portal/login"
              className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Zur Anmeldung
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
