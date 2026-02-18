/**
 * Inspection Defects API
 *
 * GET /api/inspections/[id]/defects - List defects for inspection
 * POST /api/inspections/[id]/defects - Create a defect
 *
 * Phase 22-02: Inspection UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { CreateDefectInput } from '@/types/inspections'
import { listDefects, createDefect } from '@/lib/inspections/queries'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/inspections/[id]/defects - List defects for inspection
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

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const defects = await listDefects(id)

    return NextResponse.json({ defects })
  } catch (error) {
    console.error('Error in GET /api/inspections/[id]/defects:', error)
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
 * POST /api/inspections/[id]/defects - Create a defect
 *
 * Body: CreateDefectInput
 * - inspection_id: string (must match path param)
 * - checklist_item_id?: string
 * - title: string
 * - description?: string
 * - severity: DefectSeverity
 */
export async function POST(
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

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: CreateDefectInput = await request.json()

    // Ensure inspection_id matches path param
    if (body.inspection_id !== id) {
      return NextResponse.json(
        { error: 'Inspection ID mismatch' },
        { status: 400 }
      )
    }

    // Validate inspection exists
    const supabase = await createOrgClient(request)
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('id')
      .eq('id', id)
      .single()

    if (inspectionError || !inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    const defect = await createDefect(body, userId)

    return NextResponse.json({ defect }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/inspections/[id]/defects:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
