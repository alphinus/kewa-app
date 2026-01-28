/**
 * Inspections API - Single Resource Routes
 *
 * GET /api/inspections/[id] - Get single inspection with defects
 * PATCH /api/inspections/[id] - Update inspection
 * DELETE /api/inspections/[id] - Delete inspection (only if in_progress)
 *
 * Phase 22-01: Inspection Core CRUD
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Role } from '@/types'
import type { UpdateInspectionInput } from '@/types/inspections'
import {
  getInspection,
  updateInspection,
  deleteInspection,
  listDefects,
} from '@/lib/inspections/queries'
import { computeOverallResult } from '@/lib/inspections/workflow'

// Internal roles that can manage inspections
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/inspections/[id] - Get single inspection with defects
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can view inspections
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const inspection = await getInspection(id)

    return NextResponse.json({
      inspection,
      defects: inspection.defects || [],
    })
  } catch (error) {
    console.error('Error in GET /api/inspections/[id]:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/inspections/[id] - Update inspection
 *
 * Body: UpdateInspectionInput
 * - checklist_items?: ChecklistSectionResult[]
 * - overall_result?: InspectionResult
 * - notes?: string
 * - status?: InspectionStatus (validates transition)
 *
 * If status changes to 'completed', auto-computes overall_result from defects.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can update inspections
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: UpdateInspectionInput = await request.json()

    // If status changing to 'completed', auto-compute overall_result from defects
    if (body.status === 'completed' && !body.overall_result) {
      const defects = await listDefects(id)
      body.overall_result = computeOverallResult(defects)
    }

    const inspection = await updateInspection(id, body)

    return NextResponse.json({ inspection })
  } catch (error) {
    console.error('Error in PATCH /api/inspections/[id]:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/inspections/[id] - Delete inspection
 *
 * Only allowed if status is 'in_progress'.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can delete inspections
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    await deleteInspection(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/inspections/[id]:', error)

    if (error instanceof Error && error.message.includes('Cannot delete inspection')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
