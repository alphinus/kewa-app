/**
 * Units Investment List Page
 *
 * Server component showing all units with their investment data.
 * Uses InvestmentOverview component for display.
 *
 * Path: /dashboard/kosten/wohnungen
 * Phase 10-06: Unit Investment View and Rent Entry
 * Requirements: RENT-02, RENT-03
 */

import { cookies, headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { InvestmentOverview } from '@/components/costs/InvestmentOverview'
import {
  getAllUnitCosts,
  getBuildingsForFilter
} from '@/lib/costs/unit-cost-queries'
import { validateSessionWithRBAC, SESSION_COOKIE_NAME } from '@/lib/session'
import { isInternalRole } from '@/lib/permissions'

export default async function WohnungenInvestmentPage() {
  // Get user session from cookies
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    redirect('/login')
  }

  // Validate session with RBAC
  const session = await validateSessionWithRBAC(sessionCookie.value)
  if (!session) {
    redirect('/login')
  }

  // Only internal users can view costs
  if (!isInternalRole(session.roleName)) {
    redirect('/dashboard')
  }

  // Fetch data in parallel
  const [units, buildings] = await Promise.all([
    getAllUnitCosts(),
    getBuildingsForFilter()
  ])

  const hasEditPermission = isInternalRole(session.roleName)

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
        <span className="text-gray-900 dark:text-gray-100">Wohnungen</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Investment-Übersicht
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Miete vs. Renovationskosten pro Wohnung mit Amortisationsberechnung
        </p>
      </div>

      {/* Investment overview */}
      <InvestmentOverview
        units={units}
        buildings={buildings}
        canEditRent={hasEditPermission}
      />

      {/* Help text */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Hinweise zur Amortisationsberechnung
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>
            Die Amortisation berechnet sich aus: Investment / Jaehrl. Mieteinnahmen
          </li>
          <li>
            Gruen: unter 10 Jahre, Gelb: 10-20 Jahre, Rot: über 20 Jahre
          </li>
          <li>
            Klicken Sie auf das Stift-Symbol, um den Mietzins zu erfassen oder zu aendern
          </li>
          <li>
            Investment umfasst: Renovationsprojekte + direkte Ausgaben ohne Projekt
          </li>
        </ul>
      </div>
    </div>
  )
}
