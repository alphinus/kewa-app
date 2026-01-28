/**
 * Re-inspection Scheduling API Route
 *
 * POST: Schedule a re-inspection for a completed/signed inspection
 * Phase: 23-inspection-advanced
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { scheduleReInspection } from '@/lib/inspections/re-inspection'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scheduled_date, inspector_id } = body

    if (!scheduled_date) {
      return NextResponse.json(
        { error: 'scheduled_date required' },
        { status: 400 }
      )
    }

    const reInspection = await scheduleReInspection(
      id,
      scheduled_date,
      inspector_id || user.id
    )

    return NextResponse.json(reInspection, { status: 201 })
  } catch (error) {
    console.error('Error scheduling re-inspection:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to schedule re-inspection' },
      { status: 400 }
    )
  }
}
