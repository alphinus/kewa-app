'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Role } from '@/types'

// =============================================
// TYPES
// =============================================

interface SystemSetting {
  key: string
  value: string
  description: string
  updated_at: string
}

interface UserInfo {
  id: string
  display_name: string
  role: Role
}

// =============================================
// COMPONENT
// =============================================

/**
 * Settings page for KEWA AG
 * Shows system info and configuration
 */
export default function SettingsPage() {
  const router = useRouter()

  // State
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch user session and settings
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch session
      const sessionRes = await fetch('/api/auth/session')
      if (!sessionRes.ok) {
        router.push('/login')
        return
      }
      const sessionData = await sessionRes.json()

      // Only KEWA can access settings
      if (sessionData.role !== 'kewa') {
        router.push('/dashboard')
        return
      }

      setUserInfo({
        id: sessionData.userId,
        display_name: sessionData.displayName || 'KEWA AG',
        role: sessionData.role
      })

      // Fetch system settings
      const settingsRes = await fetch('/api/settings')
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData.settings || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/login')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="secondary" onClick={fetchData}>
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page header */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Einstellungen
      </h1>

      {/* Admin Quick Links */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <AdminIcon className="w-5 h-5" />
          Administration
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AdminLink
            href="/dashboard/admin/properties"
            icon={<BuildingIcon className="w-6 h-6" />}
            label="Liegenschaften"
            description="Gebaeude & Einheiten"
          />
          <AdminLink
            href="/dashboard/partner"
            icon={<PartnerIcon className="w-6 h-6" />}
            label="Partner"
            description="Handwerker & Lieferanten"
          />
          <AdminLink
            href="/dashboard/projekte"
            icon={<TemplateIcon className="w-6 h-6" />}
            label="Projekte"
            description="Renovierungen"
          />
          <AdminLink
            href="/dashboard/auftraege"
            icon={<OrderIcon className="w-6 h-6" />}
            label="Auftraege"
            description="Work Orders"
          />
          <AdminLink
            href="/dashboard/kosten"
            icon={<CostIcon className="w-6 h-6" />}
            label="Kosten"
            description="Ausgaben & Rechnungen"
          />
          <AdminLink
            href="/dashboard/berichte"
            icon={<ReportIcon className="w-6 h-6" />}
            label="Berichte"
            description="Auswertungen"
          />
          <AdminLink
            href="/dashboard/settings/benachrichtigungen"
            icon={<BellIcon className="w-6 h-6" />}
            label="Benachrichtigungen"
            description="Einstellungen"
          />
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          Benutzer
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Name</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {userInfo?.display_name}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Rolle</span>
            <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
              {userInfo?.role === 'kewa' ? 'Administrator' : userInfo?.role}
            </span>
          </div>
        </div>
      </div>

      {/* System Settings Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Systemeinstellungen
        </h2>
        {settings.length > 0 ? (
          <div className="space-y-3">
            {settings.map((setting) => (
              <div
                key={setting.key}
                className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatSettingLabel(setting.key)}
                  </p>
                  {setting.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {setting.description}
                    </p>
                  )}
                </div>
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {formatSettingValue(setting.key, setting.value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Keine Systemeinstellungen gefunden.
          </p>
        )}
      </div>

      {/* App Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <InfoIcon className="w-5 h-5" />
          App-Informationen
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Version</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              2.1.0
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Umgebung</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {process.env.NODE_ENV === 'production' ? 'Produktion' : 'Entwicklung'}
            </span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="pt-4">
        <Button
          variant="secondary"
          onClick={handleLogout}
          className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogoutIcon className="w-5 h-5 mr-2" />
          Abmelden
        </Button>
      </div>
    </div>
  )
}

// =============================================
// HELPERS
// =============================================

/**
 * Format setting key to human-readable label
 */
function formatSettingLabel(key: string): string {
  const labels: Record<string, string> = {
    audit_log_retention_days: 'Audit-Log Aufbewahrung',
    magic_link_expiry_hours: 'Magic-Link Gueltigkeit',
    magic_link_cleanup_days: 'Magic-Link Bereinigung',
    media_retention_days: 'Medien Aufbewahrung',
    session_timeout_hours: 'Session Timeout'
  }
  return labels[key] || key.replace(/_/g, ' ')
}

/**
 * Format setting value with unit
 */
function formatSettingValue(key: string, value: string): string {
  if (key.includes('_days')) {
    const num = parseInt(value, 10)
    return num === 0 ? 'Unbegrenzt' : `${num} Tage`
  }
  if (key.includes('_hours')) {
    return `${value} Stunden`
  }
  return value
}

// =============================================
// ICONS
// =============================================

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function PartnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function OrderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function CostIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ReportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

// =============================================
// ADMIN LINK COMPONENT
// =============================================

interface AdminLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  description: string
}

function AdminLink({ href, icon, label, description }: AdminLinkProps) {
  return (
    <a
      href={href}
      className="flex flex-col items-center p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-center group"
    >
      <div className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {description}
      </span>
    </a>
  )
}
