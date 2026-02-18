import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { TaskPhotoWithUrl, ErrorResponse } from '@/types/database'
import type { Role } from '@/types'

// Storage bucket name
const BUCKET_NAME = 'task-photos'

// Signed URL expiry (1 hour in seconds)
const URL_EXPIRY_SECONDS = 3600

// =============================================
// RESPONSE TYPES
// =============================================

interface WeeklyReportTask {
  task: {
    id: string
    title: string
    completed_at: string | null
    completion_note: string | null
  }
  photos: {
    explanation: TaskPhotoWithUrl[]
    completion: TaskPhotoWithUrl[]
  }
}

interface WeeklyReportProject {
  project: {
    id: string
    name: string
  }
  tasks: WeeklyReportTask[]
}

interface WeeklyReportUnit {
  unit: {
    id: string
    name: string
    unit_type: string
    floor: number | null
  }
  projects: WeeklyReportProject[]
}

interface WeeklyReportResponse {
  period: {
    start: string
    end: string
  }
  summary: {
    total_completed: number
    units_with_work: number
  }
  units: WeeklyReportUnit[]
}

/**
 * GET /api/reports/weekly
 *
 * Returns weekly report data for KEWA AG.
 * Query params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD (default: last 7 days)
 * KEWA only - returns 403 for Imeri.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<WeeklyReportResponse | ErrorResponse>> {
  try {
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

    // KEWA only
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Forbidden - KEWA only' },
        { status: 403 }
      )
    }

    // Parse query params for date range
    const { searchParams } = new URL(request.url)
    let startDate = searchParams.get('start_date')
    let endDate = searchParams.get('end_date')

    // Default to last 7 days if not provided
    if (!startDate || !endDate) {
      const now = new Date()
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(now.getDate() - 7)

      // Format as YYYY-MM-DD
      startDate = sevenDaysAgo.toISOString().split('T')[0]
      endDate = now.toISOString().split('T')[0]
    }

    // Fetch completed tasks in date range with project and unit info
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        completed_at,
        completion_note,
        project:projects (
          id,
          name,
          unit:units (
            id,
            name,
            unit_type,
            floor
          )
        )
      `)
      .eq('status', 'completed')
      .gte('completed_at', `${startDate}T00:00:00`)
      .lte('completed_at', `${endDate}T23:59:59`)

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      )
    }

    // Get all task IDs for photo fetching
    const taskIds = (tasks || []).map(t => t.id)

    // Fetch all photos for these tasks
    let photosMap: Map<string, { explanation: TaskPhotoWithUrl[], completion: TaskPhotoWithUrl[] }> = new Map()

    if (taskIds.length > 0) {
      const { data: photos, error: photosError } = await supabase
        .from('task_photos')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true })

      if (photosError) {
        console.error('Error fetching photos:', photosError)
        // Continue without photos - not a critical error
      } else {
        // Generate signed URLs and group by task
        for (const photo of (photos || [])) {
          const { data: signedUrl } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(photo.storage_path, URL_EXPIRY_SECONDS)

          const photoWithUrl: TaskPhotoWithUrl = {
            ...photo,
            url: signedUrl?.signedUrl || '',
          }

          if (!photosMap.has(photo.task_id)) {
            photosMap.set(photo.task_id, { explanation: [], completion: [] })
          }

          const taskPhotos = photosMap.get(photo.task_id)!
          if (photo.photo_type === 'explanation') {
            taskPhotos.explanation.push(photoWithUrl)
          } else {
            taskPhotos.completion.push(photoWithUrl)
          }
        }
      }
    }

    // Group tasks by unit, then by project
    const unitsMap = new Map<string, {
      unit: WeeklyReportUnit['unit']
      projectsMap: Map<string, {
        project: WeeklyReportProject['project']
        tasks: WeeklyReportTask[]
      }>
    }>()

    for (const task of (tasks || [])) {
      // Handle Supabase nested object types
      const project = task.project as unknown as {
        id: string
        name: string
        unit: {
          id: string
          name: string
          unit_type: string
          floor: number | null
        }
      } | null

      if (!project?.unit) continue

      const unitId = project.unit.id
      const projectId = project.id

      // Initialize unit if not exists
      if (!unitsMap.has(unitId)) {
        unitsMap.set(unitId, {
          unit: {
            id: project.unit.id,
            name: project.unit.name,
            unit_type: project.unit.unit_type,
            floor: project.unit.floor,
          },
          projectsMap: new Map(),
        })
      }

      const unitData = unitsMap.get(unitId)!

      // Initialize project if not exists
      if (!unitData.projectsMap.has(projectId)) {
        unitData.projectsMap.set(projectId, {
          project: {
            id: project.id,
            name: project.name,
          },
          tasks: [],
        })
      }

      // Add task
      const taskPhotos = photosMap.get(task.id) || { explanation: [], completion: [] }
      unitData.projectsMap.get(projectId)!.tasks.push({
        task: {
          id: task.id,
          title: task.title,
          completed_at: task.completed_at,
          completion_note: task.completion_note,
        },
        photos: taskPhotos,
      })
    }

    // Convert maps to arrays and sort
    const units: WeeklyReportUnit[] = Array.from(unitsMap.values()).map(unitData => ({
      unit: unitData.unit,
      projects: Array.from(unitData.projectsMap.values()).map(projectData => ({
        project: projectData.project,
        // Sort tasks by completed_at (most recent first)
        tasks: projectData.tasks.sort((a, b) => {
          const dateA = a.task.completed_at || ''
          const dateB = b.task.completed_at || ''
          return dateB.localeCompare(dateA)
        }),
      }))
      // Sort projects alphabetically
      .sort((a, b) => a.project.name.localeCompare(b.project.name)),
    }))
    // Sort units by floor (descending - higher floors first)
    .sort((a, b) => {
      const floorA = a.unit.floor ?? -999
      const floorB = b.unit.floor ?? -999
      return floorB - floorA
    })

    // Calculate summary
    const totalCompleted = (tasks || []).length
    const unitsWithWork = unitsMap.size

    return NextResponse.json({
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        total_completed: totalCompleted,
        units_with_work: unitsWithWork,
      },
      units,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/reports/weekly:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
