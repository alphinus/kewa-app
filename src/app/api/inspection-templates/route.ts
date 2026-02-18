/**
 * Inspection Templates API - Collection Routes
 *
 * GET /api/inspection-templates - List templates
 * POST /api/inspection-templates - Create a new template
 *
 * Phase 22-01: Inspection Core CRUD
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { CreateInspectionTemplateInput } from '@/types/inspections'
import {
  listInspectionTemplates,
  createInspectionTemplate,
} from '@/lib/inspections/queries'

// Internal roles that can manage templates
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/inspection-templates - List inspection templates
 *
 * Query params:
 * - trade_category: Filter by trade
 * - is_active: Filter by active status (default: true)
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

    // Only internal roles can view templates
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse filters
    const tradeCategory = searchParams.get('trade_category') || undefined
    const isActiveParam = searchParams.get('is_active')
    const isActive = isActiveParam === null ? true : isActiveParam === 'true'

    const templates = await listInspectionTemplates({
      trade_category: tradeCategory,
      is_active: isActive,
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error in GET /api/inspection-templates:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inspection-templates - Create a new inspection template
 *
 * Body: CreateInspectionTemplateInput
 * - name: string (required)
 * - trade_category: string (required)
 * - checklist_sections: ChecklistSection[] (required, non-empty array)
 * - description?: string
 * - formality_level?: InspectionFormality
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

    // Only internal roles can create templates
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: CreateInspectionTemplateInput = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    if (!body.trade_category) {
      return NextResponse.json(
        { error: 'trade_category is required' },
        { status: 400 }
      )
    }

    if (!body.checklist_sections || !Array.isArray(body.checklist_sections) || body.checklist_sections.length === 0) {
      return NextResponse.json(
        { error: 'checklist_sections is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    const template = await createInspectionTemplate(body, userId)

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/inspection-templates:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
