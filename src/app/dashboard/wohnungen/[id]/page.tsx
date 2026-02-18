/**
 * Unit Detail Page
 *
 * Server component showing detailed unit information including:
 * - Unit overview (name, type, floor, tenant)
 * - Room condition summary and grid (HIST-02, HIST-05)
 * - Recent condition history (HIST-03, HIST-04)
 * - Links to timeline and related pages
 *
 * Path: /dashboard/wohnungen/[id]
 * Phase 11-03: Condition Automation Verification
 * Requirements: HIST-03, HIST-04
 *
 * Condition Automation (HIST-03, HIST-04):
 *
 * When a renovation_project status changes to 'approved':
 * 1. Trigger `on_project_approved()` fires (migration 027)
 * 2. Calls `update_room_condition_from_project()` function
 * 3. Finds tasks with status='completed' and room_id set
 * 4. Those rooms get condition='new', condition_updated_at=NOW()
 * 5. A condition_history record is created with source_project_id
 *
 * Prerequisites:
 * - Tasks must have room_id assigned for trigger to work
 * - Tasks must be marked 'completed' before project approval
 *
 * Limitations:
 * - All affected rooms become 'new' (no partial detection)
 * - media_ids not auto-populated (enhancement for future)
 * - Template tasks don't have room_id by default
 *
 * Alternative trigger in migration 035 updates ALL rooms in unit
 * regardless of task assignments (commented out, available if needed).
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/with-org'
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/session'
import { ConditionBadge, getConditionLabel } from '@/components/units/ConditionBadge'
import { UnitActions } from '@/components/units/UnitActions'
import UnitTimeline from '@/components/units/UnitTimeline'
import {
  fetchUnitConditionData,
  fetchRecentConditionHistory
} from '@/lib/units/condition-queries'
import { formatSwissDate } from '@/lib/costs/payment-helpers'
import type { Role } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Get room type label in German
 */
function getRoomTypeLabel(roomType: string): string {
  const labels: Record<string, string> = {
    living_room: 'Wohnzimmer',
    bedroom: 'Schlafzimmer',
    kitchen: 'Küche',
    bathroom: 'Badezimmer',
    toilet: 'WC',
    hallway: 'Flur',
    storage: 'Abstellraum',
    balcony: 'Balkon',
    other: 'Sonstiges'
  }
  return labels[roomType] ?? roomType
}

/**
 * Get unit type label in German
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
 * Get floor display text
 */
function getFloorLabel(floor: number | null): string {
  if (floor === null) return ''
  if (floor === 0) return 'Erdgeschoss'
  if (floor === 4) return 'Dachgeschoss'
  return `${floor}. Obergeschoss`
}

export default async function UnitDetailPage({ params }: PageProps) {
  const { id } = await params

  // Get user session from cookies
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    redirect('/login')
  }

  // Validate session
  const session = await validateSession(sessionCookie.value)
  if (!session) {
    redirect('/login')
  }

  // Fetch unit data
  const supabase = await createPublicClient()
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select(`
      id,
      name,
      unit_type,
      floor,
      position,
      tenant_name,
      building:buildings (
        id,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (unitError || !unit) {
    notFound()
  }

  // Fetch condition data and history in parallel
  const [conditionData, conditionHistory] = await Promise.all([
    fetchUnitConditionData(id),
    fetchRecentConditionHistory(id, 5)
  ])

  const { summary, rooms } = conditionData

  // Extract building info (Supabase returns single relation as object)
  const building = unit.building as unknown as { id: string; name: string } | null

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/dashboard"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Dashboard
        </Link>
        <span>/</span>
        {building && (
          <>
            <Link
              href="/dashboard/liegenschaft"
              className="hover:text-gray-700 dark:hover:text-gray-300"
            >
              {building.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-gray-100">{unit.name}</span>
      </nav>

      {/* Unit Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {unit.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                {getUnitTypeLabel(unit.unit_type)}
              </span>
              {unit.floor !== null && (
                <span>{getFloorLabel(unit.floor)}</span>
              )}
              {unit.position && (
                <span>- {unit.position}</span>
              )}
            </div>
            {unit.tenant_name && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Mieter: {unit.tenant_name}
              </p>
            )}
          </div>

          {/* Actions */}
          <UnitActions unitId={id} unitName={unit.name} />
        </div>
      </div>

      {/* Condition Summary */}
      {summary && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Zustand
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Overall condition */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gesamtzustand</p>
              {summary.overall_condition ? (
                <ConditionBadge condition={summary.overall_condition} size="md" />
              ) : (
                <span className="text-sm text-gray-500">-</span>
              )}
            </div>

            {/* Renovation percentage */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Renoviert</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {summary.renovation_percentage !== null
                  ? `${summary.renovation_percentage}%`
                  : '-'
                }
              </p>
            </div>

            {/* Room counts */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Räume</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {summary.total_rooms}
              </p>
            </div>

            {/* Breakdown */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-600 dark:text-green-400">{summary.new_rooms} Neu</span>
                <span className="text-yellow-600 dark:text-yellow-400">{summary.partial_rooms} Teil</span>
                <span className="text-red-600 dark:text-red-400">{summary.old_rooms} Alt</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {summary.total_rooms > 0 && (
            <div className="mt-4">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                {summary.new_rooms > 0 && (
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${(summary.new_rooms / summary.total_rooms) * 100}%` }}
                  />
                )}
                {summary.partial_rooms > 0 && (
                  <div
                    className="bg-yellow-500 h-full"
                    style={{ width: `${(summary.partial_rooms / summary.total_rooms) * 100}%` }}
                  />
                )}
                {summary.old_rooms > 0 && (
                  <div
                    className="bg-red-500 h-full"
                    style={{ width: `${(summary.old_rooms / summary.total_rooms) * 100}%` }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Room Grid */}
      {rooms.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Räume
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {room.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getRoomTypeLabel(room.room_type)}
                      {room.area_sqm && ` - ${room.area_sqm} m2`}
                    </p>
                  </div>
                  <ConditionBadge condition={room.condition} size="sm" />
                </div>
                {room.condition_updated_at && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Aktualisiert: {formatSwissDate(room.condition_updated_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Condition History */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Letzte Zustandsänderungen
          </h2>
          <a
            href="#timeline"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Alle anzeigen
          </a>
        </div>

        {conditionHistory.length > 0 ? (
          <div className="flow-root">
            <ul className="-mb-4">
              {conditionHistory.map((entry, idx) => (
                <li key={entry.id}>
                  <div className="relative pb-4">
                    {/* Timeline line */}
                    {idx !== conditionHistory.length - 1 && (
                      <span
                        className="absolute left-3 top-6 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    )}

                    <div className="relative flex items-start gap-3">
                      {/* Condition indicator */}
                      <div
                        className={`relative flex h-6 w-6 items-center justify-center rounded-full ${
                          entry.new_condition === 'new'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : entry.new_condition === 'partial'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            entry.new_condition === 'new'
                              ? 'bg-green-500'
                              : entry.new_condition === 'partial'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {entry.room_name}
                          </p>
                          <time className="text-xs text-gray-500 dark:text-gray-400">
                            {formatSwissDate(entry.changed_at)}
                          </time>
                        </div>

                        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                          {entry.old_condition
                            ? `${getConditionLabel(entry.old_condition)} -> ${getConditionLabel(entry.new_condition)}`
                            : `-> ${getConditionLabel(entry.new_condition)}`
                          }
                        </p>

                        {entry.project_name && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            Projekt: {entry.source_project_id ? (
                              <Link
                                href={`/dashboard/projekte/${entry.source_project_id}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {entry.project_name}
                              </Link>
                            ) : (
                              entry.project_name
                            )}
                          </p>
                        )}

                        {entry.notes && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Keine Zustandsänderungen vorhanden
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Zustandsänderungen werden automatisch erfasst wenn Projekte abgenommen werden.
            </p>
          </div>
        )}
      </div>

      {/* Full Timeline / Verlauf (HIST-01) */}
      <div
        id="timeline"
        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 scroll-mt-4"
      >
        <div className="flex items-center gap-2 mb-4">
          {/* ClockIcon */}
          <svg
            className="h-5 w-5 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Verlauf
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Alle Aktivitäten dieser Wohnung: Projekte, Aufträge, Zustandsänderungen und Kosten.
        </p>
        <UnitTimeline unitId={id} />
      </div>
    </div>
  )
}
