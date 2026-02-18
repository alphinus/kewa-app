/**
 * Defect Action API Route
 *
 * POST: Take action on defect (create task, defer, dismiss)
 * Phase: 22-inspection-core Plan 03
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import { getInspection } from '@/lib/inspections/queries'
import { createFollowUpTask, deferDefect, dismissDefect } from '@/lib/inspections/defect-actions'
import type { InspectionDefect, DefectAction } from '@/types/inspections'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; defectId: string }> }
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

    const { id: inspectionId, defectId } = await params
    const body = await req.json()

    const { action, reason, assignee_id } = body as {
      action: DefectAction
      reason?: string
      assignee_id?: string
    }

    if (!action) {
      return NextResponse.json(
        { error: 'action ist erforderlich' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(req)

    // Fetch defect and validate it belongs to inspection
    const { data: defect, error: defectError } = await supabase
      .from('inspection_defects')
      .select('*')
      .eq('id', defectId)
      .eq('inspection_id', inspectionId)
      .single()

    if (defectError || !defect) {
      return NextResponse.json(
        { error: 'Mangel nicht gefunden' },
        { status: 404 }
      )
    }

    const typedDefect = defect as InspectionDefect

    // Prevent duplicate actions
    if (typedDefect.action !== null) {
      return NextResponse.json(
        { error: 'Aktion bereits ausgeführt' },
        { status: 400 }
      )
    }

    // Execute action based on type
    switch (action) {
      case 'task_created': {
        if (!assignee_id) {
          return NextResponse.json(
            { error: 'assignee_id ist erforderlich für Aufgabenerstellung' },
            { status: 400 }
          )
        }

        // Fetch full inspection for context
        const inspection = await getInspection(inspectionId)
        const task = await createFollowUpTask(typedDefect, inspection, assignee_id)

        // Refresh defect to get updated fields
        const { data: updatedDefect } = await supabase
          .from('inspection_defects')
          .select('*')
          .eq('id', defectId)
          .single()

        return NextResponse.json({
          defect: updatedDefect,
          task,
        })
      }

      case 'deferred': {
        await deferDefect(defectId, reason)

        // Refresh defect
        const { data: updatedDefect } = await supabase
          .from('inspection_defects')
          .select('*')
          .eq('id', defectId)
          .single()

        return NextResponse.json({ defect: updatedDefect })
      }

      case 'dismissed': {
        if (!reason || reason.trim() === '') {
          return NextResponse.json(
            { error: 'Grund ist erforderlich beim Verwerfen' },
            { status: 400 }
          )
        }

        await dismissDefect(defectId, reason)

        // Refresh defect
        const { data: updatedDefect } = await supabase
          .from('inspection_defects')
          .select('*')
          .eq('id', defectId)
          .single()

        return NextResponse.json({ defect: updatedDefect })
      }

      default:
        return NextResponse.json(
          { error: `Ungültige Aktion: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error executing defect action:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Ausführen der Aktion' },
      { status: 500 }
    )
  }
}
