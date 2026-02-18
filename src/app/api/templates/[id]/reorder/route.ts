import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ReorderItem {
  id: string
  sort_order: number
}

interface ReorderInput {
  type: 'phase' | 'package' | 'task'
  items: ReorderItem[]
}

/**
 * PATCH /api/templates/[id]/reorder - Bulk update sort_order for phases, packages, or tasks
 *
 * Admin only (kewa role)
 *
 * Request body:
 * {
 *   type: 'phase' | 'package' | 'task'
 *   items: Array<{ id: string; sort_order: number }>
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id: templateId } = await params
    const body: ReorderInput = await request.json()

    // Validate input
    if (!body.type || !['phase', 'package', 'task'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be phase, package, or task' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate each item has id and sort_order
    for (const item of body.items) {
      if (!item.id || typeof item.sort_order !== 'number') {
        return NextResponse.json(
          { error: 'Each item must have id and sort_order' },
          { status: 400 }
        )
      }
    }

    const supabase = await createOrgClient(request)

    // Determine table based on type
    const tableMap = {
      phase: 'template_phases',
      package: 'template_packages',
      task: 'template_tasks'
    } as const

    const table = tableMap[body.type]

    // Batch update sort_order for each item
    const updatePromises = body.items.map(item =>
      supabase
        .from(table)
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
    )

    const results = await Promise.all(updatePromises)

    // Check for errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Error reordering items:', errors[0].error)
      return NextResponse.json(
        { error: errors[0].error?.message || 'Failed to reorder items' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/templates/[id]/reorder:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
