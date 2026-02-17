'use client'

/**
 * ProjectCostSummary Component
 *
 * Summary cards grid showing: Budget, Offerten, Rechnungen, Bezahlt, Ausgaben
 * Displays variance from budget if applicable.
 *
 * Phase 10-04: Project Cost Dashboard
 */

import { cn } from '@/lib/utils'
import { formatCHF, formatVariance } from '@/lib/costs/formatters'
import type { ProjectWithCostBreakdown } from '@/lib/costs/project-cost-queries'

interface ProjectCostSummaryProps {
  data: ProjectWithCostBreakdown
}

/**
 * Single summary card
 */
function SummaryCard({
  label,
  value,
  subtitle,
  variant = 'default',
}: {
  label: string
  value: string
  subtitle?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}) {
  const variantClasses = {
    default: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    muted: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variantClasses[variant]
      )}
    >
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  )
}

/**
 * Project cost summary cards
 */
export function ProjectCostSummary({ data }: ProjectCostSummaryProps) {
  const { project, summary, totals } = data

  // Calculate variance from budget
  const budget = project.estimated_cost ?? 0
  const variance = budget > 0 ? totals.grandTotal - budget : null
  const variancePercent =
    budget > 0 ? ((totals.grandTotal / budget) * 100 - 100).toFixed(1) : null

  // Determine variance variant
  let varianceVariant: 'success' | 'warning' | 'danger' | 'muted' = 'muted'
  if (variance !== null) {
    if (variance <= 0) {
      varianceVariant = 'success'
    } else if (variance <= budget * 0.1) {
      varianceVariant = 'warning'
    } else {
      varianceVariant = 'danger'
    }
  }

  // Outstanding amount
  const totalOutstanding = totals.totalInvoiced - totals.totalPaid

  return (
    <div className="space-y-4">
      {/* Main metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Budget */}
        <SummaryCard
          label="Budget"
          value={formatCHF(budget || null)}
          subtitle={budget > 0 ? 'Geschaetzt' : 'Nicht festgelegt'}
          variant="muted"
        />

        {/* Total Offers */}
        <SummaryCard
          label="Offerten"
          value={formatCHF(totals.totalOffers)}
          subtitle={`${data.workOrders.filter((wo) => wo.acceptedOffer).length} akzeptiert`}
        />

        {/* Total Invoiced */}
        <SummaryCard
          label="Rechnungen"
          value={formatCHF(totals.totalInvoiced)}
          subtitle={`${data.workOrders.filter((wo) => wo.invoice).length} erfasst`}
        />

        {/* Total Paid */}
        <SummaryCard
          label="Bezahlt"
          value={formatCHF(totals.totalPaid)}
          subtitle={
            totalOutstanding > 0
              ? `${formatCHF(totalOutstanding)} offen`
              : 'Alles bezahlt'
          }
          variant={totalOutstanding > 0 ? 'warning' : 'success'}
        />

        {/* Total Expenses */}
        <SummaryCard
          label="Ausgaben"
          value={formatCHF(totals.totalExpenses)}
          subtitle={`${data.expenses.length} Eintraege`}
        />
      </div>

      {/* Variance row (if budget exists) */}
      {budget > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Cost */}
          <SummaryCard
            label="Gesamtkosten"
            value={formatCHF(totals.grandTotal)}
            subtitle="Rechnungen + Ausgaben"
          />

          {/* Variance from Budget */}
          <SummaryCard
            label="Abweichung vom Budget"
            value={formatVariance(variance)}
            subtitle={
              variancePercent !== null
                ? `${variancePercent}% ${variance! > 0 ? 'über' : variance! < 0 ? 'unter' : 'im'} Budget`
                : undefined
            }
            variant={varianceVariant}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton for loading state
 */
export function ProjectCostSummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2 animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mt-2 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
