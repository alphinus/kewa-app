import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DashboardBreadcrumbs } from '@/components/navigation/DashboardBreadcrumbs'
import { createPublicClient } from '@/lib/supabase/with-org'
import { getProjectCostBreakdown } from '@/lib/costs/project-cost-queries'
import { ProjectCostDashboard } from '@/components/costs/ProjectCostDashboard'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Project Cost Detail Page
 *
 * Shows detailed cost breakdown for a single renovation project:
 * - Summary cards (budget, offers, invoices, paid, expenses)
 * - Work orders with offer/invoice amounts side-by-side
 * - Expenses list with categories
 * - Breadcrumb navigation back to overview
 *
 * Phase 10-04: Project Cost Dashboard
 */
export default async function ProjectCostPage({ params }: Props) {
  const { id } = await params

  const supabase = await createPublicClient()

  // Fetch project cost data
  const { data, error } = await getProjectCostBreakdown(supabase, id)

  if (error || !data) {
    notFound()
  }

  return (
    <div className="space-y-6 pb-20">
      <DashboardBreadcrumbs />

      {/* Project Cost Dashboard */}
      <ProjectCostDashboard data={data} />

      {/* Back link and project detail link */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/dashboard/kosten"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Zurück zur Übersicht
        </Link>

        <Link
          href={`/dashboard/projekte/${id}`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
        >
          Projektdetails anzeigen
          <svg
            className="w-4 h-4 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  )
}
