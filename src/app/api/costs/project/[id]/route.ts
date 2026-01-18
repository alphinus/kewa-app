/**
 * Project Cost API Route
 *
 * Returns aggregated cost data for a single project including:
 * - Summary from project_costs view
 * - Work orders with offer/invoice breakdown
 * - Expenses linked to project
 *
 * Phase 10-04: Project Cost Dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjectCostBreakdown } from '@/lib/costs/project-cost-queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch complete cost breakdown
    const { data, error } = await getProjectCostBreakdown(supabase, id)

    if (error) {
      console.error('Error fetching project costs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in project costs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
