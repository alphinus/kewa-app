/**
 * Inspection Completion API Route
 *
 * POST: Complete inspection with defect warnings
 * Phase: 22-inspection-core Plan 03
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getInspection, updateInspection } from '@/lib/inspections/queries'
import { computeOverallResult } from '@/lib/inspections/workflow'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const inspectionId = params.id
    const body = await req.json()
    const acknowledgeDefects = body.acknowledge_defects === true

    // Fetch inspection with defects
    const inspection = await getInspection(inspectionId)

    // Validate current status
    if (inspection.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Abnahme kann nur aus Status "in_progress" abgeschlossen werden' },
        { status: 400 }
      )
    }

    // Compute overall result based on defects
    const overallResult = computeOverallResult(inspection.defects || [])

    // Check for open defects
    const openDefects = (inspection.defects || []).filter(d => d.status === 'open')

    if (openDefects.length > 0 && !acknowledgeDefects) {
      // Warn about open defects
      return NextResponse.json({
        warning: true,
        message: 'Es gibt offene Mängel. Möchten Sie die Abnahme trotzdem abschliessen?',
        open_defects_count: openDefects.length,
        overall_result: overallResult,
      })
    }

    // Complete inspection
    const updatedInspection = await updateInspection(inspectionId, {
      status: 'completed',
      overall_result: overallResult,
    })

    return NextResponse.json({ inspection: updatedInspection })
  } catch (error) {
    console.error('Error completing inspection:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Abschliessen der Abnahme' },
      { status: 500 }
    )
  }
}
