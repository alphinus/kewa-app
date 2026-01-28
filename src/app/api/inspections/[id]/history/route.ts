/**
 * Inspection History API Route
 *
 * GET: Get the inspection history chain (parent-child relationships)
 * Phase: 23-inspection-advanced
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getInspectionHistory } from '@/lib/inspections/re-inspection'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const history = await getInspectionHistory(id)

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching inspection history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch inspection history' },
      { status: 500 }
    )
  }
}
