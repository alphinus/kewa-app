/**
 * Liegenschaft Dashboard Page
 *
 * Property overview with building heatmap and parking status.
 * KEWA-only access for full property visualization.
 * Uses BuildingContext for multi-property support.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Requirements: DASH-01, DASH-02, DASH-03
 */

import { LiegenschaftContainer } from '@/components/dashboard/LiegenschaftContainer'

export const metadata = {
  title: 'Liegenschaft - KEWA Dashboard',
  description: 'Property overview with building heatmap and parking status'
}

export default function LiegenschaftPage() {
  return <LiegenschaftContainer />
}
