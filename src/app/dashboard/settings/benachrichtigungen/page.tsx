'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { usePush } from '@/contexts/PushContext'
import type {
  NotificationPreferences,
  NotificationType,
  UpdatePreferencesInput,
} from '@/types/notifications'

// =============================================
// TYPES
// =============================================

interface NotificationTypeConfig {
  type: NotificationType
  label: string
  description: string
}

const NOTIFICATION_TYPE_CONFIGS: NotificationTypeConfig[] = [
  {
    type: 'work_order_status',
    label: 'Arbeitsauftrag-Statusänderungen',
    description: 'Benachrichtigung bei Statusänderung von Arbeitsaufträgen (gesendet, akzeptiert, abgelehnt)',
  },
  {
    type: 'approval_needed',
    label: 'Genehmigungen erforderlich',
    description: 'Benachrichtigung bei ausstehenden Genehmigungen (Rechnungen, Änderungsaufträge)',
  },
  {
    type: 'deadline_reminder',
    label: 'Frist-Erinnerungen',
    description: 'Erinnerung 24 Stunden vor Ablauf einer Annahmefrist',
  },
]

// =============================================
// COMPONENT
// =============================================

/**
 * Notification preferences settings page
 * German UI with toggles for notification types, quiet hours, digest mode, and push subscription
 */
export default function NotificationSettingsPage() {
  const { isSupported, isSubscribed, subscribeToPush, unsubscribeFromPush } = usePush()

  // State
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [availableTypes, setAvailableTypes] = useState<NotificationType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [workOrderEnabled, setWorkOrderEnabled] = useState(true)
  const [approvalEnabled, setApprovalEnabled] = useState(true)
  const [deadlineEnabled, setDeadlineEnabled] = useState(true)
  const [quietHoursStart, setQuietHoursStart] = useState('22:00')
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00')
  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestTime, setDigestTime] = useState('08:00')

  /**
   * Load preferences from API
   */
  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/notifications/preferences')
        if (!res.ok) {
          throw new Error('Failed to load preferences')
        }

        const data = await res.json()
        setPreferences(data.preferences)
        setAvailableTypes(data.availableTypes || [])

        // Populate form
        setWorkOrderEnabled(data.preferences.work_order_status_enabled)
        setApprovalEnabled(data.preferences.approval_needed_enabled)
        setDeadlineEnabled(data.preferences.deadline_reminder_enabled)
        setQuietHoursStart(data.preferences.quiet_hours_start)
        setQuietHoursEnd(data.preferences.quiet_hours_end)
        setDigestEnabled(data.preferences.digest_enabled)
        setDigestTime(data.preferences.digest_time)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Einstellungen')
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [])

  /**
   * Save preferences
   */
  async function handleSave() {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      const updates: UpdatePreferencesInput = {
        work_order_status_enabled: workOrderEnabled,
        approval_needed_enabled: approvalEnabled,
        deadline_reminder_enabled: deadlineEnabled,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
        digest_enabled: digestEnabled,
        digest_time: digestTime,
      }

      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Fehler beim Speichern')
      }

      const data = await res.json()
      setPreferences(data.preferences)
      setSuccessMessage('Einstellungen gespeichert')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle push subscription toggle
   */
  async function handlePushToggle() {
    try {
      if (isSubscribed) {
        await unsubscribeFromPush()
      } else {
        await subscribeToPush()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei Push-Benachrichtigungen')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Benachrichtigungen
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Verwalten Sie Ihre Benachrichtigungs-Einstellungen
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-green-600 dark:text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Notification Types */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Benachrichtigungstypen
        </h2>
        <div className="space-y-4">
          {NOTIFICATION_TYPE_CONFIGS.filter((config) =>
            availableTypes.includes(config.type)
          ).map((config) => {
            let checked = false
            let setChecked = (val: boolean) => {}

            if (config.type === 'work_order_status') {
              checked = workOrderEnabled
              setChecked = setWorkOrderEnabled
            } else if (config.type === 'approval_needed') {
              checked = approvalEnabled
              setChecked = setApprovalEnabled
            } else if (config.type === 'deadline_reminder') {
              checked = deadlineEnabled
              setChecked = setDeadlineEnabled
            }

            return (
              <label
                key={config.type}
                className="flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {config.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {config.description}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Ruhezeiten
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Während der Ruhezeiten werden keine normalen Benachrichtigungen gesendet. Dringende
          Benachrichtigungen werden immer zugestellt.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start
            </label>
            <input
              type="time"
              value={quietHoursStart}
              onChange={(e) => setQuietHoursStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ende
            </label>
            <input
              type="time"
              value={quietHoursEnd}
              onChange={(e) => setQuietHoursEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Daily Digest */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Tägliche Zusammenfassung
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Erhalten Sie eine tägliche Zusammenfassung statt einzelner Benachrichtigungen.
          Dringende Benachrichtigungen werden weiterhin sofort gesendet.
        </p>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={digestEnabled}
            onChange={(e) => setDigestEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Zusammenfassung aktivieren
          </span>
        </label>
        {digestEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Uhrzeit
            </label>
            <input
              type="time"
              value={digestTime}
              onChange={(e) => setDigestTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}
      </div>

      {/* Push Notifications */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Push-Benachrichtigungen
        </h2>
        {!isSupported && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ihr Browser unterstützt keine Push-Benachrichtigungen.
          </p>
        )}
        {isSupported && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Push-Benachrichtigungen werden von Ihrem Browser unterstützt
            </p>
            {isSubscribed ? (
              <>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Push-Benachrichtigungen sind aktiviert
                </p>
                <Button
                  variant="secondary"
                  onClick={handlePushToggle}
                  className="w-full sm:w-auto"
                >
                  Deaktivieren
                </Button>
              </>
            ) : (
              <Button
                onClick={handlePushToggle}
                className="w-full sm:w-auto"
              >
                Push-Benachrichtigungen aktivieren
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? 'Speichern...' : 'Einstellungen speichern'}
        </Button>
      </div>
    </div>
  )
}
