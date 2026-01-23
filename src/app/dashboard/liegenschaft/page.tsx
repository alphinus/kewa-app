/**
 * Liegenschaft Dashboard Page
 *
 * Property overview with building heatmap and parking status.
 * KEWA-only access for full property visualization.
 * Supports building selection via URL query parameter.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Requirements: DASH-01, DASH-02, DASH-03
 */

import { PropertyDashboard } from '@/components/dashboard/PropertyDashboard'
import { PropertyDashboardClient } from '@/components/dashboard/PropertyDashboardClient'
import { DrilldownBreadcrumb } from '@/components/dashboard/DrilldownBreadcrumb'
import { BuildingSelector } from '@/components/dashboard/BuildingSelector'
import { fetchHeatmapData } from '@/lib/dashboard/heatmap-queries'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Liegenschaft - KEWA Dashboard',
  description: 'Property overview with building heatmap and parking status'
}

interface PageProps {
  searchParams: Promise<{ building?: string }>
}

/**
 * Get building ID - from query param or default to first
 */
async function getBuildingId(requestedId?: string): Promise<string | null> {
  const supabase = await createClient()

  if (requestedId) {
    // Verify the building exists
    const { data } = await supabase
      .from('buildings')
      .select('id')
      .eq('id', requestedId)
      .single()

    if (data) return data.id
  }

  // Fall back to first building
  const { data } = await supabase
    .from('buildings')
    .select('id')
    .limit(1)
    .single()

  return data?.id ?? null
}

export default async function LiegenschaftPage({ searchParams }: PageProps) {
  const params = await searchParams
  const buildingId = await getBuildingId(params.building)

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
        <BuildingSelector currentBuildingId={buildingId} />
      </div>

      <PropertyDashboardClient units={units}>
        <PropertyDashboard buildingId={buildingId} />
      </PropertyDashboardClient>
    </div>
  )
}
