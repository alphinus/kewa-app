import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCHF } from '@/lib/costs/formatters'
import {
  getCostStatistics,
  getAllProjectCostSummaries,
} from '@/lib/costs/project-cost-queries'

/**
 * Stats card for overview
 */
function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variantClasses = {
    default: 'bg-white dark:bg-gray-900',
    success: 'bg-green-50 dark:bg-green-900/20',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20',
    danger: 'bg-red-50 dark:bg-red-900/20',
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-800 p-4 ${variantClasses[variant]}`}
    >
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
        {value}
      </div>
    </div>
  )
}

/**
 * Project status badge
 */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  const labels: Record<string, string> = {
    draft: 'Entwurf',
    planned: 'Geplant',
    in_progress: 'In Arbeit',
    completed: 'Abgeschlossen',
    approved: 'Freigegeben',
    cancelled: 'Storniert',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {labels[status] ?? status}
    </span>
  )
}

/**
 * Cost Overview Page
 *
 * Shows:
 * - Quick stats: Total invoiced, paid, outstanding
 * - List of all projects with cost summaries
 * - Links to invoices, expenses, and project details
 *
 * Phase 10-04: Project Cost Dashboard
 */
export default async function KostenOverviewPage() {
  const supabase = await createClient()

  // Fetch stats
  const { data: stats } = await getCostStatistics(supabase)

  // Fetch all projects with costs
  const { data: projects } = await getAllProjectCostSummaries(supabase)

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Kostenübersicht
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Finanzen und Kosten aller Projekte
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/kosten/rechnungen"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Rechnungen
          </Link>
          <Link
            href="/dashboard/kosten/ausgaben"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Ausgaben
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Rechnungen gesamt"
          value={formatCHF(stats?.totalInvoiced ?? 0)}
        />
        <StatCard
          label="Bezahlt"
          value={formatCHF(stats?.totalPaid ?? 0)}
          variant="success"
        />
        <StatCard
          label="Offen"
          value={formatCHF(stats?.totalOutstanding ?? 0)}
          variant={stats?.totalOutstanding && stats.totalOutstanding > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Ausgaben"
          value={formatCHF(stats?.totalExpenses ?? 0)}
        />
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Projekte
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {projects?.length ?? 0} Projekte
            </span>
          </div>
        </CardHeader>

        {projects && projects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Projekt
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Wohnung
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kosten
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Offen
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.project_id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/kosten/projekte/${project.project_id}`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {project.project_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {project.building_name
                        ? `${project.building_name} - ${project.unit_name}`
                        : project.unit_name}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-700 dark:text-gray-300">
                      {formatCHF(project.estimated_cost)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCHF(project.total_cost)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {project.total_outstanding > 0 ? (
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                          {formatCHF(project.total_outstanding)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                  <td colSpan={4} className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    Gesamt
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                    {formatCHF(
                      projects.reduce((sum, p) => sum + p.total_cost, 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-yellow-600 dark:text-yellow-400">
                    {formatCHF(
                      projects.reduce((sum, p) => sum + p.total_outstanding, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <CardContent>
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Keine Projekte vorhanden
            </p>
          </CardContent>
        )}
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/kosten/ausgaben/neu">
          <Card className="hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-lg">+</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Ausgabe erfassen
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Material, Spesen oder sonstige Kosten
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/kosten/rechnungen">
          <Card className="hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-lg">$</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Rechnungen verwalten
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Prüfen, freigeben und bezahlen
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
