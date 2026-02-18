/**
 * Project Detail Page
 *
 * Server component showing detailed renovation project information including:
 * - Project overview (name, status, description)
 * - Unit link
 * - Planned/actual dates
 * - Template status
 * - Action buttons for template application and task viewing
 *
 * Path: /dashboard/projekte/[id]
 * Phase 12.1-01: Project Detail & Navigation
 * Closes integration gap INT-01 (Flow 1)
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/with-org'
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/session'
import type { Role } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Get status badge styling based on project status
 */
function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'planned':
      return {
        label: 'Geplant',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      }
    case 'active':
      return {
        label: 'Aktiv',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      }
    case 'blocked':
      return {
        label: 'Blockiert',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      }
    case 'finished':
      return {
        label: 'Abgeschlossen',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
    case 'approved':
      return {
        label: 'Abgenommen',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      }
    case 'archived':
      return {
        label: 'Archiviert',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
      }
    default:
      return {
        label: status,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
  }
}

/**
 * Format date for display (Swiss format)
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
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

export default async function ProjectDetailPage({ params }: PageProps) {
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

  // Fetch project data directly from Supabase
  // Note: Using 'projects' table (v1 schema) for compatibility with existing data
  const supabase = await createPublicClient()
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      status,
      visible_to_imeri,
      created_at,
      unit:units (
        id,
        name,
        unit_type,
        floor
      )
    `)
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Extract unit info (Supabase returns single relation as object)
  const unit = project.unit as unknown as {
    id: string
    name: string
    unit_type: string
    floor: number | null
  } | null

  const statusBadge = getStatusBadge(project.status)
  // Template features available when using renovation_projects table
  const canApplyTemplate = false // Disabled for v1 projects table

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
        <Link
          href="/dashboard/projekte"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Projekte
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{project.name}</span>
      </nav>

      {/* Project Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {project.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
              {project.status === 'approved' && (
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {project.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {project.description}
              </p>
            )}

            {/* Unit Link */}
            {unit && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span>Wohnung:</span>
                <Link
                  href={`/dashboard/wohnungen/${unit.id}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {unit.name}
                </Link>
                <span className="text-gray-400">({getUnitTypeLabel(unit.unit_type)})</span>
              </div>
            )}

            {/* Created Date */}
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Erstellt: </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(project.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Aktionen
        </h2>
        <div className="flex flex-wrap gap-3">
          {/* Apply Template Button - only if eligible */}
          {canApplyTemplate && (
            <Link
              href={`/renovation-projects/${project.id}/apply-template`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Vorlage anwenden
            </Link>
          )}

          {/* Show Tasks Button */}
          <Link
            href={unit ? `/dashboard/aufgaben?unit_id=${unit.id}` : '/dashboard/aufgaben'}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            Aufgaben anzeigen
          </Link>

          {/* Create Work Order Button - only for active/planned projects */}
          {project.status !== 'archived' && project.status !== 'finished' && (
            <Link
              href={`/dashboard/auftraege/neu?project_id=${project.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Auftrag erstellen
            </Link>
          )}

          {/* Show Costs Button */}
          {unit && (
            <Link
              href={`/dashboard/kosten/wohnungen/${unit.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Kosten anzeigen
            </Link>
          )}
        </div>

      </div>


      {/* Back to projects list */}
      <div>
        <Link
          href="/dashboard/projekte"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Zurück zur Projektliste
        </Link>
      </div>
    </div>
  )
}
