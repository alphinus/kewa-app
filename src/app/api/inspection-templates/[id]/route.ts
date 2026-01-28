/**
 * Inspection Templates API - Single Resource Routes
 *
 * GET /api/inspection-templates/[id] - Get single template
 * PATCH /api/inspection-templates/[id] - Update template
 * DELETE /api/inspection-templates/[id] - Soft-delete template
 *
 * Phase 22-01: Inspection Core CRUD
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Role } from '@/types'
import type { UpdateInspectionTemplateInput } from '@/types/inspections'
import {
  getInspectionTemplate,
  updateInspectionTemplate,
  deleteInspectionTemplate,
} from '@/lib/inspections/queries'

// Internal roles that can manage templates
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/inspection-templates/[id] - Get single template
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

    // Only internal roles can view templates
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const template = await getInspectionTemplate(id)

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error in GET /api/inspection-templates/[id]:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Template not found' },
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
 * PATCH /api/inspection-templates/[id] - Update template
 *
 * Body: UpdateInspectionTemplateInput
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

    // Only internal roles can update templates
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: UpdateInspectionTemplateInput = await request.json()

    const template = await updateInspectionTemplate(id, body)

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error in PATCH /api/inspection-templates/[id]:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Template not found' },
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
 * DELETE /api/inspection-templates/[id] - Soft-delete template
 *
 * Sets is_active to false instead of hard deleting.
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

    // Only internal roles can delete templates
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    await deleteInspectionTemplate(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/inspection-templates/[id]:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
