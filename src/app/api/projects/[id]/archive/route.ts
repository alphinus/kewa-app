import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()

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
          { error: 'Fehler beim Pruefen der Aufgaben' },
          { status: 500 }
        )
      }

      if (openTasks && openTasks.length > 0) {
        return NextResponse.json(
          { error: 'Alle Aufgaben muessen erledigt sein' },
          { status: 400 }
        )
      }

      // Archive the project
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single()

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
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'active',
          archived_at: null,
        })
        .eq('id', projectId)
        .select()
        .single()

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
