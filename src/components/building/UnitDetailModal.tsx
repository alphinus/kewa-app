'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { UnitWithStats, UpdateUnitInput, UnitResponse } from '@/types/database'

/**
 * Progress color based on task completion percentage
 */
function getProgressColor(progress: number, hasTasks: boolean): string {
  if (!hasTasks) return 'bg-green-500'
  if (progress === 100) return 'bg-green-500'
  if (progress >= 50) return 'bg-yellow-500'
  if (progress > 0) return 'bg-orange-500'
  return 'bg-red-500'
}

/**
 * Get German label for unit type
 */
function getUnitTypeLabel(type: string): string {
  switch (type) {
    case 'apartment':
      return 'Wohnung'
    case 'common_area':
      return 'Gemeinschaftsraum'
    case 'building':
      return 'Gebäude'
    default:
      return type
  }
}

/**
 * Get badge color for unit type
 */
function getUnitTypeBadgeColor(type: string): string {
  switch (type) {
    case 'apartment':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'common_area':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'building':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }
}

export interface UnitDetailModalProps {
  /** Unit to display (null = modal closed) */
  unit: UnitWithStats | null
  /** Close handler */
  onClose: () => void
  /** Save handler - receives updated unit */
  onSave: (updated: UnitWithStats) => void
  /** Whether current user is KEWA (determines if editable) */
  isKewa: boolean
}

/**
 * UnitDetailModal displays unit information and allows editing for KEWA
 *
 * Features:
 * - View unit name, type, floor, tenant
 * - Task statistics with progress bar
 * - KEWA can edit tenant name and visibility
 * - Link to filtered tasks view
 */
export function UnitDetailModal({
  unit,
  onClose,
  onSave,
  isKewa,
}: UnitDetailModalProps) {
  // Form state (only used by KEWA)
  const [tenantName, setTenantName] = useState('')
  const [visibleToImeri, setVisibleToImeri] = useState(true)

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset form when unit changes
  useEffect(() => {
    if (unit) {
      setTenantName(unit.tenant_name || '')
      setVisibleToImeri(unit.tenant_visible_to_imeri)
      setError(null)
      setSuccess(false)
    }
  }, [unit])

  // Don't render if no unit
  if (!unit) return null

  // Calculate progress
  const hasTasks = unit.total_tasks_count > 0
  const completed = unit.total_tasks_count - unit.open_tasks_count
  const progress = hasTasks
    ? (completed / unit.total_tasks_count) * 100
    : 100

  const progressColor = getProgressColor(progress, hasTasks)

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const input: UpdateUnitInput = {
        tenant_name: tenantName.trim() || null,
        tenant_visible_to_imeri: visibleToImeri,
      }

      const response = await fetch(`/api/units/${unit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Speichern')
      }

      const data: UnitResponse = await response.json()
      setSuccess(true)

      // Notify parent with updated unit
      onSave(data.unit)

      // Close after short delay to show success
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setSaving(false)
    }
  }

  // Check if form has changes
  const hasChanges =
    tenantName !== (unit.tenant_name || '') ||
    visibleToImeri !== unit.tenant_visible_to_imeri

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      {/* Slide-up panel on mobile, centered modal on desktop */}
      <Card className="w-full sm:max-w-[500px] sm:mx-4 max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {unit.name}
              </h2>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  getUnitTypeBadgeColor(unit.unit_type)
                )}
              >
                {getUnitTypeLabel(unit.unit_type)}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Schliessen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
              Gespeichert
            </div>
          )}

          {/* Floor info */}
          {unit.floor !== null && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {unit.floor === 0 ? 'Erdgeschoss' :
               unit.floor === 4 ? 'Dachgeschoss' :
               `${unit.floor}. Obergeschoss`}
              {unit.position && ` - ${unit.position}`}
            </div>
          )}

          {/* Task statistics */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Aufgaben
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {hasTasks
                  ? `${unit.open_tasks_count} offene von ${unit.total_tasks_count}`
                  : 'Keine Aufgaben'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', progressColor)}
                style={{ width: `${progress}%` }}
              />
            </div>

            {hasTasks && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {completed} erledigt
                </span>
                <span
                  className={cn(
                    'font-medium',
                    progress === 100
                      ? 'text-green-600 dark:text-green-400'
                      : progress >= 50
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : progress > 0
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {Math.round(progress)}%
                </span>
              </div>
            )}
          </div>

          {/* Edit section (KEWA only) */}
          {isKewa && (
            <div className="space-y-4 pt-2">
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Einstellungen
                </h3>

                {/* Tenant name */}
                <Input
                  label="Mietername"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Name des Mieters"
                />

                {/* Visibility toggle */}
                <label className="flex items-center gap-3 mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleToImeri}
                    onChange={(e) => setVisibleToImeri(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Sichtbar für Imeri
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Link to tasks */}
          <Link
            href={`/dashboard/aufgaben?unit_id=${unit.id}`}
            className={cn(
              'block w-full h-12 min-h-[48px]',
              'flex items-center justify-center',
              'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
              'text-gray-900 dark:text-gray-100',
              'rounded-lg font-medium',
              'transition-colors duration-200'
            )}
          >
            Aufgaben anzeigen
          </Link>
        </CardContent>

        <CardFooter className="flex gap-3 border-t border-gray-200 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            fullWidth={!isKewa}
          >
            {isKewa ? 'Abbrechen' : 'Schliessen'}
          </Button>

          {isKewa && (
            <Button
              type="button"
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
              fullWidth
            >
              Speichern
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
