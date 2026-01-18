/**
 * Unit Investment Detail Page
 *
 * Server component showing detailed investment view for a single unit.
 * Includes: UnitInvestmentCard (full), project list, expense list.
 *
 * Path: /dashboard/kosten/wohnungen/[id]
 * Phase 10-06: Unit Investment View and Rent Entry
 * Requirements: RENT-01, RENT-02, RENT-03
 */

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { UnitInvestmentCard } from '@/components/costs/UnitInvestmentCard'
import { formatCHF, formatSwissDate } from '@/lib/costs/payment-helpers'
import {
  getUnitCostSummary,
  getUnitProjectCosts,
  getUnitDirectExpenses
} from '@/lib/costs/unit-cost-queries'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Check if user has permission to view cost data
 * Note: v2.0 will add more granular RBAC roles
 */
function canViewCosts(role: Role): boolean {
  return role === 'kewa'
}

/**
 * Check if user has permission to edit rent
 * Note: v2.0 will add more granular RBAC roles
 */
function canEditRent(role: Role): boolean {
  return role === 'kewa'
}

/**
 * Get project status label (German)
 */
function getProjectStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    planned: 'Geplant',
    in_progress: 'In Arbeit',
    on_hold: 'Pausiert',
    completed: 'Abgeschlossen',
    cancelled: 'Abgebrochen',
    approved: 'Freigegeben'
  }
  return labels[status] ?? status
}

/**
 * Get project status color
 */
function getProjectStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

/**
 * Get expense category label (German)
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    material: 'Material',
    labor: 'Arbeit',
    equipment_rental: 'Geraetemiete',
    travel: 'Reise/Spesen',
    permits: 'Bewilligungen',
    disposal: 'Entsorgung',
    utilities: 'Nebenkosten',
    other: 'Sonstiges'
  }
  return labels[category] ?? category
}

export default async function UnitInvestmentDetailPage({ params }: PageProps) {
  const { id } = await params

  // Get user session from cookies
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('kewa-session')

  if (!sessionCookie?.value) {
    redirect('/login')
  }

  // Parse session
  let session: { userId: string; role: Role }
  try {
    session = JSON.parse(sessionCookie.value)
  } catch {
    redirect('/login')
  }

  // Check permission
  if (!canViewCosts(session.role)) {
    redirect('/dashboard')
  }

  // Fetch unit cost summary
  const costSummary = await getUnitCostSummary(id)

  if (!costSummary) {
    notFound()
  }

  // Fetch additional data in parallel
  const [projectsData, expensesData, unitData] = await Promise.all([
    getUnitProjectCosts(id),
    getUnitDirectExpenses(id),
    fetchUnitBuilding(id)
  ])

  const hasEditPermission = canEditRent(session.role)

  // Extend cost summary with building info
  const unitWithBuilding = {
    ...costSummary,
    building_name: unitData?.building_name ?? undefined
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/kosten"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Kosten
        </Link>
        <span>/</span>
        <Link
          href="/dashboard/kosten/wohnungen"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Wohnungen
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{costSummary.unit_name}</span>
      </nav>

      {/* Unit Investment Card (full variant) */}
      <UnitInvestmentCard
        unit={unitWithBuilding}
        canEditRent={hasEditPermission}
        showDetailLink={false}
        variant="full"
      />

      {/* Renovation Projects */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Renovationsprojekte
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {projectsData.projects.length} Projekt{projectsData.projects.length !== 1 ? 'e' : ''} -
            Total {formatCHF(projectsData.total)}
          </p>
        </div>

        {projectsData.projects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Projekt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rechnungen
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bezahlt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {projectsData.projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/renovationen/${project.id}`}
                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getProjectStatusColor(project.status)}`}>
                        {getProjectStatusLabel(project.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {formatCHF(project.estimated_cost)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCHF(project.total_invoiced)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                      {formatCHF(project.total_paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">
                    {formatCHF(projectsData.total)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                    {formatCHF(projectsData.projects.reduce((sum, p) => sum + p.total_paid, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Keine Renovationsprojekte fuer diese Einheit.
          </div>
        )}
      </section>

      {/* Direct Expenses */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Direkte Ausgaben
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {expensesData.expenses.length} Ausgabe{expensesData.expenses.length !== 1 ? 'n' : ''} -
              Total {formatCHF(expensesData.total)}
            </p>
          </div>
          <Link
            href={`/dashboard/kosten/ausgaben/neu?unit_id=${id}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            + Ausgabe erfassen
          </Link>
        </div>

        {expensesData.expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bezeichnung
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kategorie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lieferant
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Betrag
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {expensesData.expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/kosten/ausgaben/${expense.id}`}
                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {expense.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {getCategoryLabel(expense.category)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {expense.vendor_name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {formatSwissDate(expense.paid_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCHF(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">
                    {formatCHF(expensesData.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Keine direkten Ausgaben fuer diese Einheit.
            </p>
            <Link
              href={`/dashboard/kosten/ausgaben/neu?unit_id=${id}`}
              className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Erste Ausgabe erfassen
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * Fetch unit with building info
 */
async function fetchUnitBuilding(unitId: string): Promise<{
  building_name: string | null
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('units')
    .select(`
      building:buildings (
        name
      )
    `)
    .eq('id', unitId)
    .single()

  if (error || !data) {
    return null
  }

  // Supabase returns single relation as object, but type system shows array
  // Use type assertion to handle the actual runtime shape
  const building = data.building as unknown as { name: string } | null
  return {
    building_name: building?.name ?? null
  }
}
