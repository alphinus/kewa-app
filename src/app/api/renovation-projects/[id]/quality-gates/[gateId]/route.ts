import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ id: string; gateId: string }>
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

/**
 * GET /api/renovation-projects/[id]/quality-gates/[gateId] - Get single gate with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gateId } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('project_quality_gates')
      .select(`
        *,
        phase:project_phases(id, name, wbs_code, status),
        package:project_packages(id, name, wbs_code, status),
        photos:media(id, file_name, storage_path, created_at)
      `)
      .eq('id', gateId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quality gate not found' }, { status: 404 })
      }
      console.error('Error fetching quality gate:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quality_gate: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/renovation-projects/[id]/quality-gates/[gateId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/renovation-projects/[id]/quality-gates/[gateId] - Update gate progress
 *
 * Supports:
 * - toggle_checklist_item: Toggle a checklist item completion
 * - approve: Manually approve the gate
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gateId } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Handle checklist item toggle
    if (body.toggle_checklist_item) {
      const { data: gate, error: fetchError } = await supabase
        .from('project_quality_gates')
        .select('checklist_items, checklist_progress')
        .eq('id', gateId)
        .single()

      if (fetchError || !gate) {
        return NextResponse.json({ error: 'Gate not found' }, { status: 404 })
      }

      const itemId = body.toggle_checklist_item
      let progress: ChecklistProgress[] = gate.checklist_progress || []

      const existingIndex = progress.findIndex(p => p.id === itemId)
      if (existingIndex >= 0) {
        // Toggle existing
        progress[existingIndex] = {
          ...progress[existingIndex],
          completed: !progress[existingIndex].completed,
          completed_at: !progress[existingIndex].completed ? new Date().toISOString() : null,
          completed_by: !progress[existingIndex].completed ? userId : null
        }
      } else {
        // Add new completed item
        progress.push({
          id: itemId,
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: userId
        })
      }

      const { data, error } = await supabase
        .from('project_quality_gates')
        .update({ checklist_progress: progress })
        .eq('id', gateId)
        .select()
        .single()

      if (error) {
        console.error('Error updating checklist progress:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Check for auto-approval
      await checkAndAutoApprove(supabase, gateId)

      return NextResponse.json({ quality_gate: data })
    }

    // Handle manual approval
    if (body.approve === true) {
      const { data, error } = await supabase
        .from('project_quality_gates')
        .update({
          status: 'passed',
          approved_at: new Date().toISOString(),
          approved_by: userId
        })
        .eq('id', gateId)
        .select()
        .single()

      if (error) {
        console.error('Error approving gate:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ quality_gate: data })
    }

    return NextResponse.json({ error: 'Invalid update' }, { status: 400 })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/renovation-projects/[id]/quality-gates/[gateId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Check if gate should auto-approve
 */
async function checkAndAutoApprove(supabase: SupabaseClient, gateId: string) {
  const { data: gate } = await supabase
    .from('project_quality_gates')
    .select(`
      id, checklist_items, checklist_progress, min_photos_required,
      auto_approve_when_complete, status
    `)
    .eq('id', gateId)
    .single()

  if (!gate || gate.status !== 'pending' || !gate.auto_approve_when_complete) {
    return
  }

  // Check checklist completion
  const checklistItems = gate.checklist_items as ChecklistItem[]
  const checklistProgress = gate.checklist_progress as ChecklistProgress[] | null
  const requiredItems = checklistItems.filter(i => i.required)
  const allRequired = requiredItems.every(item =>
    checklistProgress?.find(p => p.id === item.id && p.completed)
  )

  // Check photo count
  const { count } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'quality_gate')
    .eq('entity_id', gateId)

  const photosComplete = (count || 0) >= gate.min_photos_required

  // Auto-approve if complete
  if (allRequired && photosComplete) {
    await supabase
      .from('project_quality_gates')
      .update({
        status: 'passed',
        approved_at: new Date().toISOString(),
        approved_by: null  // null indicates auto-approval
      })
      .eq('id', gateId)
  }
}
