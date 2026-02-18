import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { ProjectResponse, ErrorResponse } from '@/types/database'
import type { Role } from '@/types'

interface ArchiveRequestBody {
  archive: boolean
}

/**
 * POST /api/projects/[id]/archive
 *
 * Archive or unarchive a project.
 * - KEWA only (403 for Imeri)
 * - archive=true: Check all tasks completed, then set status='archived', archived_at=NOW()
 * - archive=false: Set status='active', archived_at=null
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ProjectResponse | ErrorResponse>> {
  try {
    const { id: projectId } = await params
    const supabase = await createOrgClient(request)

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only KEWA can archive/unarchive projects
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Nur KEWA kann Projekte archivieren' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: ArchiveRequestBody = await request.json()
    const { archive } = body

    if (typeof archive !== 'boolean') {
      return NextResponse.json(
        { error: 'archive must be a boolean' },
        { status: 400 }
      )
    }

    // Check project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    if (archive) {
      // Archiving: Check all tasks are completed
      const { data: openTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'open')
        .limit(1)

      if (tasksError) {
        console.error('Error checking tasks:', tasksError)
        return NextResponse.json(
          { error: 'Fehler beim Prüfen der Aufgaben' },
          { status: 500 }
        )
      }

      if (openTasks && openTasks.length > 0) {
        return NextResponse.json(
          { error: 'Alle Aufgaben müssen erledigt sein' },
          { status: 400 }
        )
      }

      // Archive the project
      // Note: archived_at column may not exist if migration 006 not applied
      // Try with archived_at first, fallback to status-only update
      let updatedProject
      let updateError

      // First try with archived_at
      const result1 = await supabase
        .from('projects')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single()

      if (result1.error && result1.error.message.includes('archived_at')) {
        // Column doesn't exist, use status-only update
        const result2 = await supabase
          .from('projects')
          .update({ status: 'archived' })
          .eq('id', projectId)
          .select()
          .single()
        updatedProject = result2.data
        updateError = result2.error
      } else {
        updatedProject = result1.data
        updateError = result1.error
      }

      if (updateError) {
        console.error('Error archiving project:', updateError)
        return NextResponse.json(
          { error: 'Fehler beim Archivieren' },
          { status: 500 }
        )
      }

      return NextResponse.json({ project: updatedProject })
    } else {
      // Unarchiving: Set status to active, clear archived_at
      // Note: archived_at column may not exist if migration 006 not applied
      let updatedProject
      let updateError

      // First try with archived_at
      const result1 = await supabase
        .from('projects')
        .update({
          status: 'active',
          archived_at: null,
        })
        .eq('id', projectId)
        .select()
        .single()

      if (result1.error && result1.error.message.includes('archived_at')) {
        // Column doesn't exist, use status-only update
        const result2 = await supabase
          .from('projects')
          .update({ status: 'active' })
          .eq('id', projectId)
          .select()
          .single()
        updatedProject = result2.data
        updateError = result2.error
      } else {
        updatedProject = result1.data
        updateError = result1.error
      }

      if (updateError) {
        console.error('Error unarchiving project:', updateError)
        return NextResponse.json(
          { error: 'Fehler beim Wiederherstellen' },
          { status: 500 }
        )
      }

      return NextResponse.json({ project: updatedProject })
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/projects/[id]/archive:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
