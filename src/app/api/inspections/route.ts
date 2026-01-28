/**
 * Inspections API - Collection Routes
 *
 * GET /api/inspections - List inspections with filters
 * POST /api/inspections - Create a new inspection
 *
 * Phase 22-01: Inspection Core CRUD
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Role } from '@/types'
import type { InspectionStatus, CreateInspectionInput } from '@/types/inspections'
import {
  listInspections,
  createInspection,
} from '@/lib/inspections/queries'

// Internal roles that can manage inspections
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/inspections - List inspections
 *
 * Query params:
 * - work_order_id: Filter by work order
 * - project_id: Filter by project
 * - status: Filter by status
 * - inspector_id: Filter by inspector
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)

    // Parse filters
    const workOrderId = searchParams.get('work_order_id') || undefined
    const projectId = searchParams.get('project_id') || undefined
    const status = searchParams.get('status') as InspectionStatus | undefined
    const inspectorId = searchParams.get('inspector_id') || undefined

    const inspections = await listInspections({
      work_order_id: workOrderId,
      project_id: projectId,
      status,
      inspector_id: inspectorId,
    })

    return NextResponse.json({
      inspections,
      total: inspections.length,
    })
  } catch (error) {
    console.error('Error in GET /api/inspections:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inspections - Create a new inspection
 *
 * Body: CreateInspectionInput
 * - title: string (required)
 * - work_order_id?: string (must provide work_order_id OR project_id)
 * - project_id?: string (must provide work_order_id OR project_id)
 * - template_id?: string (auto-populates checklist if provided)
 * - description?: string
 * - inspection_date?: string (ISO date, default: today)
 * - checklist_items?: ChecklistSectionResult[] (optional, populated from template if not provided)
 */
export async function POST(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can create inspections
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: CreateInspectionInput = await request.json()

    // Validate required fields
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    // Must provide work_order_id OR project_id
    if (!body.work_order_id && !body.project_id) {
      return NextResponse.json(
        { error: 'Either work_order_id or project_id is required' },
        { status: 400 }
      )
    }

    const inspection = await createInspection(body, userId)

    return NextResponse.json({ inspection }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/inspections:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
