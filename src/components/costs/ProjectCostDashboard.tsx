'use client'

/**
 * ProjectCostDashboard Component
 *
 * Complete cost view for a single project combining:
 * - ProjectCostSummary (cards at top)
 * - Work orders table with offer/invoice breakdown
 * - Expenses list with category totals
 *
 * Phase 10-04: Project Cost Dashboard
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatCHF, formatSwissDate } from '@/lib/costs/formatters'
import { formatExpenseCategory, getCategoryColor } from '@/lib/costs/expense-constants'
import { ProjectCostSummary, ProjectCostSummarySkeleton } from './ProjectCostSummary'
import {
  WorkOrderCostRow,
  WorkOrderCostRowSkeleton,
  WorkOrderCostEmptyState,
} from './WorkOrderCostRow'
import type { ProjectWithCostBreakdown } from '@/lib/costs/project-cost-queries'
import type { ExpenseCategory } from '@/types'

interface ProjectCostDashboardProps {
  data: ProjectWithCostBreakdown
}

/**
 * Project cost dashboard combining all views
 */
export function ProjectCostDashboard({ data }: ProjectCostDashboardProps) {
  const { project, workOrders, expenses, totals } = data

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {project.name}
        </h2>
        {project.unit && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {project.unit.building?.name
              ? `${project.unit.building.name} - ${project.unit.name}`
              : project.unit.name}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <ProjectCostSummary data={data} />

      {/* Work Orders Section */}
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Arbeitsaufträge
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {workOrders.length} Aufträge
            </span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Auftrag
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Raum
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Offerte
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rechnung
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Aktion
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {workOrders.length === 0 ? (
                <WorkOrderCostEmptyState />
              ) : (
                workOrders.map((wo) => (
                  <WorkOrderCostRow
                    key={wo.id}
                    workOrder={wo}
                    linkToDetail={false}
                  />
                ))
              )}
            </tbody>
            {workOrders.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                  <td colSpan={2} className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    Total Arbeitsaufträge
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                    {formatCHF(totals.totalOffers)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                    {formatCHF(totals.totalInvoiced)}
                  </td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Expenses Section */}
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Ausgaben
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {expenses.length} Eintraege
            </span>
          </div>
        </CardHeader>
        {expenses.length === 0 ? (
          <CardContent>
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              Keine Ausgaben vorhanden
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bezeichnung
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kategorie
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lieferant
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Betrag
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatSwissDate(expense.paid_at)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {expense.title}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          getCategoryColor(expense.category as ExpenseCategory)
                        )}
                      >
                        {formatExpenseCategory(expense.category as ExpenseCategory)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {expense.vendor_name ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCHF(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                  <td colSpan={4} className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    Total Ausgaben
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                    {formatCHF(totals.totalExpenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Grand Total */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Gesamtkosten
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCHF(totals.grandTotal)}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Rechnungen ({formatCHF(totals.totalInvoiced)}) + Ausgaben ({formatCHF(totals.totalExpenses)})
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Full dashboard skeleton for loading state
 */
export function ProjectCostDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mt-2 animate-pulse" />
      </div>

      {/* Summary skeleton */}
      <ProjectCostSummarySkeleton />

      {/* Work orders skeleton */}
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-4 text-left">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                </th>
                <th className="py-3 px-4 text-left">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto animate-pulse" />
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto animate-pulse" />
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-auto animate-pulse" />
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-auto animate-pulse" />
                </th>
              </tr>
            </thead>
            <tbody>
              <WorkOrderCostRowSkeleton />
              <WorkOrderCostRowSkeleton />
              <WorkOrderCostRowSkeleton />
            </tbody>
          </table>
        </div>
      </Card>

      {/* Expenses skeleton */}
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
