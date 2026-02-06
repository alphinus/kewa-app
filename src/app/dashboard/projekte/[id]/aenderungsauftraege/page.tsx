/**
 * Project Change Orders Analytics Page
 *
 * Per-project view showing:
 * - Budget summary cards
 * - Waterfall chart
 * - Table of all change orders for this project
 *
 * Phase 21-03: Budget Impact Analytics
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BudgetSummaryCards } from '@/components/change-orders/BudgetSummaryCards'
import { LazyBudgetImpactChart } from '@/components/change-orders/LazyBudgetImpactChart'
import { ChevronRight, Plus, FileText } from 'lucide-react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Format CHF currency
 */
function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Get German label for status
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    submitted: 'Eingereicht',
    under_review: 'In Pruefung',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    cancelled: 'Storniert',
  }
  return labels[status] || status
}

/**
 * Get status badge color
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export default async function ProjectChangeOrdersPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch analytics data
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${id}/change-orders/analytics`,
    {
      headers: {
        cookie: (await supabase.auth.getSession()).data.session?.access_token
          ? `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
          : '',
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Fehler beim Laden der Daten</p>
        </div>
      </div>
    )
  }

  const data = await response.json()

  return (
    <div className="p-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700">
          Dashboard
        </Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <Link href="/dashboard/projekte" className="hover:text-gray-700">
          Projekte
        </Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <Link href={`/dashboard/projekte/${id}`} className="hover:text-gray-700">
          {data.project_name}
        </Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900">Aenderungsauftraege</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aenderungsauftraege</h1>
          <p className="text-gray-600 mt-1">{data.project_name}</p>
        </div>
        <Link
          href={`/dashboard/aenderungsauftraege/neu?project_id=${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neuer Aenderungsauftrag
        </Link>
      </div>

      {/* Budget Summary Cards */}
      <BudgetSummaryCards
        originalBudget={data.original_budget}
        approvedTotal={data.approved_total}
        netBudget={data.net_budget}
        pendingTotal={data.pending_total}
      />

      {/* Waterfall Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget-Entwicklung</h2>
        <LazyBudgetImpactChart
          originalBudget={data.original_budget}
          changeOrders={data.change_orders}
        />
      </div>

      {/* Change Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Alle Aenderungsauftraege ({data.all_change_orders.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {data.all_change_orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Noch keine Aenderungsauftraege vorhanden
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AA-Nummer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Betrag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.all_change_orders.map((co: any) => (
                  <tr key={co.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {co.co_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md truncate">{co.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          co.status
                        )}`}
                      >
                        {getStatusLabel(co.status)}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        co.total_amount < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {formatCHF(co.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {co.approved_at
                        ? new Date(co.approved_at).toLocaleDateString('de-CH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/dashboard/aenderungsauftraege/${co.id}`}
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
