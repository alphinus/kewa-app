/**
 * Work Order List Page
 *
 * Server component showing all work orders with:
 * - Status badges with colors
 * - Partner and project info
 * - Deadline and cost display
 * - Link to detail page
 * - Create new button
 *
 * Path: /dashboard/auftraege
 * Phase 09-07: Work Order UI Integration
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText, Plus } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/with-org'
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/session'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { Button } from '@/components/ui/button'
import type { Role, WorkOrderStatus } from '@/types'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

/**
 * Get status badge styling based on work order status
 */
function getStatusBadge(status: WorkOrderStatus): { label: string; className: string } {
  switch (status) {
    case 'draft':
      return {
        label: 'Entwurf',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
    case 'sent':
      return {
        label: 'Gesendet',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      }
    case 'viewed':
      return {
        label: 'Angesehen',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      }
    case 'accepted':
      return {
        label: 'Angenommen',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      }
    case 'rejected':
      return {
        label: 'Abgelehnt',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }
    case 'in_progress':
      return {
        label: 'In Arbeit',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      }
    case 'done':
      return {
        label: 'Erledigt',
        className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
      }
    case 'closed':
      return {
        label: 'Abgeschlossen',
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
 * Format cost for display
 */
function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return '-'
  return `CHF ${cost.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

interface WorkOrderRow {
  id: string
  title: string
  status: WorkOrderStatus
  acceptance_deadline: string | null
  estimated_cost: number | null
  created_at: string
  partner: { company_name: string } | null
  project: { name: string } | null
}

export default async function AuftraegePage({ searchParams }: PageProps) {
  const params = await searchParams

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

  // Fetch work orders from Supabase
  const supabase = await createPublicClient()
  let query = supabase
    .from('work_orders')
    .select(`
      id,
      title,
      status,
      acceptance_deadline,
      estimated_cost,
      created_at,
      partner:partners (company_name),
      project:renovation_projects (name)
    `)
    .order('created_at', { ascending: false })

  // Optional status filter
  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data: workOrders, error } = await query

  if (error) {
    console.error('Error fetching work orders:', error)
  }

  // Type-safe cast
  const orders = (workOrders as unknown as WorkOrderRow[]) || []

  // Count by status for quick filters
  const statusCounts = orders.reduce((acc, wo) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumbs */}
      <DashboardBreadcrumbs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Arbeitsaufträge
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {orders.length} Aufträge insgesamt
          </p>
        </div>

        <Link href="/dashboard/auftraege/neu">
          <Button>
            <Plus className="w-4 h-4 mr-1" />
            Neuer Auftrag
          </Button>
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/auftraege"
          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
            !params.status
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Alle ({orders.length})
        </Link>
        {Object.entries(statusCounts).map(([status, count]) => {
          const badge = getStatusBadge(status as WorkOrderStatus)
          const isActive = params.status === status
          return (
            <Link
              key={status}
              href={`/dashboard/auftraege?status=${status}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {badge.label} ({count})
            </Link>
          )
        })}
      </div>

      {/* Work orders list */}
      {orders.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <FileText className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            Keine Arbeitsaufträge
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
            Erstellen Sie Ihren ersten Arbeitsauftrag für einen externen Handwerker.
          </p>
          <Link href="/dashboard/auftraege/neu">
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              Auftrag erstellen
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Titel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Auftragnehmer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Frist
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kosten
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => {
                  const badge = getStatusBadge(order.status)
                  const isOverdue = order.acceptance_deadline &&
                    new Date(order.acceptance_deadline) < new Date() &&
                    ['sent', 'viewed'].includes(order.status)

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/auftraege/${order.id}`}
                          className="block"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {order.title}
                          </div>
                          {order.project && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {order.project.name}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {order.partner?.company_name || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                          {formatDate(order.acceptance_deadline)}
                          {isOverdue && (
                            <span className="ml-1 text-xs">(überfaellig)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-600 dark:text-gray-400">
                        {formatCost(order.estimated_cost)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {orders.map((order) => {
              const badge = getStatusBadge(order.status)
              const isOverdue = order.acceptance_deadline &&
                new Date(order.acceptance_deadline) < new Date() &&
                ['sent', 'viewed'].includes(order.status)

              return (
                <Link
                  key={order.id}
                  href={`/dashboard/auftraege/${order.id}`}
                  className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {order.title}
                      </div>
                      {order.partner && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {order.partner.company_name}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className={isOverdue ? 'text-red-600 dark:text-red-400' : ''}>
                      {formatDate(order.acceptance_deadline)}
                      {isOverdue && ' (überfaellig)'}
                    </span>
                    <span>{formatCost(order.estimated_cost)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Back link */}
      <div>
        <Link
          href="/dashboard"
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
          Zurück zum Dashboard
        </Link>
      </div>
    </div>
  )
}
