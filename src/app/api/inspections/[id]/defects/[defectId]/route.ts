/**
 * Inspection Defect API - Single Resource
 *
 * PATCH /api/inspections/[id]/defects/[defectId] - Update a defect
 * DELETE /api/inspections/[id]/defects/[defectId] - Delete a defect
 *
 * Phase 22-02: Inspection UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { UpdateDefectInput } from '@/types/inspections'
import { updateDefect, deleteDefect } from '@/lib/inspections/queries'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * PATCH /api/inspections/[id]/defects/[defectId] - Update a defect
 *
 * Body: UpdateDefectInput
 * - title?: string
 * - description?: string | null
 * - severity?: DefectSeverity
 * - status?: DefectStatus
 * - action?: DefectAction
 * - action_reason?: string
 * - linked_task_id?: string
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; defectId: string }> }
) {
  try {
    const { id, defectId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: UpdateDefectInput = await request.json()

    // Validate defect belongs to inspection
    const supabase = await createOrgClient(request)
    const { data: defect, error: defectError } = await supabase
      .from('inspection_defects')
      .select('id, inspection_id')
      .eq('id', defectId)
      .single()

    if (defectError || !defect) {
      return NextResponse.json(
        { error: 'Defect not found' },
        { status: 404 }
      )
    }

    if (defect.inspection_id !== id) {
      return NextResponse.json(
        { error: 'Defect does not belong to this inspection' },
        { status: 400 }
      )
    }

    const updatedDefect = await updateDefect(defectId, body)

    return NextResponse.json({ defect: updatedDefect })
  } catch (error) {
    console.error('Error in PATCH /api/inspections/[id]/defects/[defectId]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/inspections/[id]/defects/[defectId] - Delete a defect
 *
 * Only allowed if action is null (no action taken yet).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; defectId: string }> }
) {
  try {
    const { id, defectId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate defect belongs to inspection and no action taken
    const supabase = await createOrgClient(request)
    const { data: defect, error: defectError } = await supabase
      .from('inspection_defects')
      .select('id, inspection_id, action')
      .eq('id', defectId)
      .single()

    if (defectError || !defect) {
      return NextResponse.json(
        { error: 'Defect not found' },
        { status: 404 }
      )
    }

    if (defect.inspection_id !== id) {
      return NextResponse.json(
        { error: 'Defect does not belong to this inspection' },
        { status: 400 }
      )
    }

    if (defect.action !== null) {
      return NextResponse.json(
        { error: 'Cannot delete defect with action already taken' },
        { status: 400 }
      )
    }

    await deleteDefect(defectId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/inspections/[id]/defects/[defectId]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
