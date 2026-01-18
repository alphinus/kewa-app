/**
 * Liegenschaft Dashboard Page
 *
 * Property overview with building heatmap and parking status.
 * KEWA-only access for full property visualization.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Requirements: DASH-01, DASH-02, DASH-03
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PropertyDashboard } from '@/components/dashboard/PropertyDashboard'
import { PropertyDashboardClient } from '@/components/dashboard/PropertyDashboardClient'
import { DrilldownBreadcrumb } from '@/components/dashboard/DrilldownBreadcrumb'
import { fetchHeatmapData } from '@/lib/dashboard/heatmap-queries'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

export const metadata = {
  title: 'Liegenschaft - KEWA Dashboard',
  description: 'Property overview with building heatmap and parking status'
}

/**
 * Get default building ID for dashboard
 */
async function getDefaultBuilding(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('buildings')
    .select('id')
    .limit(1)
    .single()

  return data?.id ?? null
}

export default async function LiegenschaftPage() {
  // Auth check
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('kewa-session')

  if (!sessionCookie?.value) {
    redirect('/login')
  }

  let role: Role
  try {
    const session = JSON.parse(sessionCookie.value)
    role = session.role
  } catch {
    redirect('/login')
  }

  // Only KEWA can see full dashboard
  if (role !== 'kewa') {
    redirect('/dashboard')
  }

  const buildingId = await getDefaultBuilding()

  if (!buildingId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Kein Gebaeude konfiguriert.
      </div>
    )
  }

  // Fetch units for client component
  const units = await fetchHeatmapData(buildingId)

  return (
    <div className="space-y-6 pb-20">
      <DrilldownBreadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Liegenschaft' }
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Liegenschaftsuebersicht
        </h1>
      </div>

      <PropertyDashboardClient units={units}>
        <PropertyDashboard buildingId={buildingId} />
      </PropertyDashboardClient>
    </div>
  )
}
