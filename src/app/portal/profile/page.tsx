'use client'

/**
 * Portal Profile Page
 *
 * Tenant profile management page.
 * Allows editing phone and emergency contact.
 * Email is read-only.
 *
 * Path: /portal/profile
 * Phase 29: Tenant Extras & UX Improvements
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ProfileForm } from '@/components/portal/ProfileForm'

interface Profile {
  id: string
  email: string
  display_name: string
  phone: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  unit: {
    id: string
    name: string
    building_name: string | null
  } | null
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/portal/profile')
      if (!res.ok) {
        throw new Error('Fehler beim Laden des Profils')
      }

      const data = await res.json()
      setProfile(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(data: {
    phone: string
    emergency_contact_name: string
    emergency_contact_phone: string
  }) {
    const res = await fetch('/api/portal/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error || 'Fehler beim Speichern')
    }

    const result = await res.json()
    setProfile(result.profile)
    toast.success('Profil gespeichert')
  }

  // Loading state
  if (loading) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'Profil nicht gefunden'}</p>
          <button
            onClick={loadProfile}
            className="text-sm text-red-700 underline"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mein Profil</h1>

      <ProfileForm initialData={profile} onSave={handleSave} />
    </div>
  )
}
