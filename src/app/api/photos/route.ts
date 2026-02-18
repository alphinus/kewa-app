import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import { taskPhotoPath } from '@/lib/storage/paths'
import type {
  TaskPhoto,
  TaskPhotoWithUrl,
  PhotosResponse,
  PhotoResponse,
  PhotoType,
  ErrorResponse,
} from '@/types/database'
import type { Role } from '@/types'

// Storage bucket name
const BUCKET_NAME = 'task-photos'

// Max photos per type per task
const MAX_PHOTOS_PER_TYPE = 2

// Signed URL expiry (1 hour in seconds)
const URL_EXPIRY_SECONDS = 3600

/**
 * GET /api/photos?task_id={id}
 *
 * Returns all photos for a task with signed URLs.
 * Requires authentication.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<PhotosResponse | ErrorResponse>> {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('task_id')

    if (!taskId) {
      return NextResponse.json(
        { error: 'task_id query parameter is required' },
        { status: 400 }
      )
    }

    // Verify task exists and user has access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        project:projects (
          visible_to_imeri
        )
      `)
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // For Imeri, check if project is visible
    // Supabase may return nested object or array depending on types
    const projectData = task.project as unknown as { visible_to_imeri: boolean } | null
    if (userRole === 'imeri' && !projectData?.visible_to_imeri) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Fetch photos for this task
    const { data: photos, error: photosError } = await supabase
      .from('task_photos')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      )
    }

    // Generate signed URLs for each photo
    const photosWithUrls: TaskPhotoWithUrl[] = await Promise.all(
      (photos || []).map(async (photo: TaskPhoto) => {
        const { data: signedUrl } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(photo.storage_path, URL_EXPIRY_SECONDS)

        return {
          ...photo,
          url: signedUrl?.signedUrl || '',
        }
      })
    )

    return NextResponse.json({ photos: photosWithUrls })
  } catch (error) {
    console.error('Unexpected error in GET /api/photos:', error)
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
 * POST /api/photos
 *
 * Upload a photo for a task.
 * Accepts multipart/form-data with file, task_id, photo_type.
 * Validates role-based permissions (KEWA=explanation, Imeri=completion).
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<PhotoResponse | ErrorResponse>> {
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

    const orgId = request.headers.get('x-organization-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const taskId = formData.get('task_id') as string | null
    const photoType = formData.get('photo_type') as PhotoType | null

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      )
    }

    if (!taskId) {
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      )
    }

    if (!photoType || !['explanation', 'completion'].includes(photoType)) {
      return NextResponse.json(
        { error: 'photo_type must be "explanation" or "completion"' },
        { status: 400 }
      )
    }

    // Validate role-based permissions
    if (userRole === 'kewa' && photoType !== 'explanation') {
      return NextResponse.json(
        { error: 'KEWA can only add explanation photos' },
        { status: 403 }
      )
    }

    if (userRole === 'imeri' && photoType !== 'completion') {
      return NextResponse.json(
        { error: 'Imeri can only add completion photos' },
        { status: 403 }
      )
    }

    // Verify task exists
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check max photos limit
    const { count, error: countError } = await supabase
      .from('task_photos')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('photo_type', photoType)

    if (countError) {
      console.error('Error counting photos:', countError)
      return NextResponse.json(
        { error: 'Failed to check photo limit' },
        { status: 500 }
      )
    }

    if ((count || 0) >= MAX_PHOTOS_PER_TYPE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS_PER_TYPE} ${photoType} photos allowed per task` },
        { status: 409 }
      )
    }

    // Generate unique storage path
    const fileId = crypto.randomUUID()
    const extension = file.type === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = taskPhotoPath(orgId, taskId, photoType, fileId, extension)

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'image/webp',
        upsert: false, // Don't overwrite (unique UUIDs prevent conflicts)
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload photo' },
        { status: 500 }
      )
    }

    // Insert record into task_photos table
    const photoData: Partial<TaskPhoto> = {
      task_id: taskId,
      photo_type: photoType,
      storage_path: storagePath,
      file_name: file.name || `photo.${extension}`,
      file_size: file.size,
      uploaded_by: userId,
    }

    const { data: newPhoto, error: insertError } = await supabase
      .from('task_photos')
      .insert(photoData)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting photo record:', insertError)
      // Try to clean up uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to save photo record' },
        { status: 500 }
      )
    }

    // Generate signed URL for response
    const { data: signedUrl } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, URL_EXPIRY_SECONDS)

    const photoWithUrl: TaskPhotoWithUrl = {
      ...newPhoto,
      url: signedUrl?.signedUrl || '',
    }

    return NextResponse.json({ photo: photoWithUrl }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/photos:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
