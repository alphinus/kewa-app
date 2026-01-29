'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { QRLoginCode } from '@/components/portal/QRLoginCode'

/**
 * Portal settings page
 * Account info, QR code for multi-device login, logout
 */
export default function PortalSettingsPage() {
  const router = useRouter()
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.userId) {
          setSession({ userId: data.userId, email: data.email || '' })
        }
      })
      .catch(() => toast.error('Sitzung konnte nicht geladen werden'))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/portal/auth/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Abmeldung fehlgeschlagen')
      }

      toast.success('Erfolgreich abgemeldet')
      router.push('/portal/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Fehler bei der Abmeldung')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Laden...</p>
      </div>
    )
  }

  if (!session) {
    router.push('/portal/login')
    return null
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>

      {/* Account section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Konto</h2>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">E-Mail</p>
            <p className="text-base text-gray-900">{session.email}</p>
          </div>
        </div>
      </div>

      {/* QR code section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Auf anderem Gerät anmelden
        </h2>
        <QRLoginCode userId={session.userId} />
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full min-h-[48px] px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
      >
        Abmelden
      </button>
    </div>
  )
}
