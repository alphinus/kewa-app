import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ChecklistItem {
  id: string
  text: string
  required: boolean
}

interface ChecklistProgress {
  id: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
}

interface Photo {
  id: string
  file_name: string
  storage_path: string
}

interface QualityGateWithRelations {
  id: string
  checklist_items: ChecklistItem[]
  checklist_progress: ChecklistProgress[] | null
  min_photos_required: number
  auto_approve_when_complete: boolean
  phase: { id: string; name: string; wbs_code: string; status: string } | null
  package: { id: string; name: string; wbs_code: string; status: string } | null
  photos: Photo[] | null
  [key: string]: unknown
}

/**
 * GET /api/renovation-projects/[id]/quality-gates - List project quality gates
 *
 * Returns all quality gates for a project with completion status calculated.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('project_quality_gates')
      .select(`
        *,
        phase:project_phases(id, name, wbs_code, status),
        package:project_packages(id, name, wbs_code, status),
        photos:media(id, file_name, storage_path)
      `)
      .eq('project_id', id)
      .order('created_at')

    if (error) {
      console.error('Error fetching project quality gates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate completion status for each gate
    const gatesWithStatus = (data as QualityGateWithRelations[]).map(gate => {
      const requiredChecks = gate.checklist_items.filter(i => i.required)
      const completedChecks = requiredChecks.filter(item =>
        gate.checklist_progress?.find(p => p.id === item.id && p.completed)
      )
      const photoCount = gate.photos?.length || 0

      const checklistComplete = completedChecks.length === requiredChecks.length
      const photosComplete = photoCount >= gate.min_photos_required
      const isComplete = checklistComplete && photosComplete

      return {
        ...gate,
        completion: {
          checklist_complete: checklistComplete,
          checklist_progress: `${completedChecks.length}/${requiredChecks.length}`,
          photos_complete: photosComplete,
          photos_progress: `${photoCount}/${gate.min_photos_required}`,
          is_complete: isComplete,
          can_auto_approve: isComplete && gate.auto_approve_when_complete
        }
      }
    })

    return NextResponse.json({ quality_gates: gatesWithStatus })
  } catch (error) {
    console.error('Unexpected error in GET /api/renovation-projects/[id]/quality-gates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
