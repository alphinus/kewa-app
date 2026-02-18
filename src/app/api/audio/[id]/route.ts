import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { SuccessResponse, ErrorResponse } from '@/types/database'
import type { Role } from '@/types'

// Storage bucket name
const BUCKET_NAME = 'task-audio'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/audio/[id]
 *
 * Deletes an audio file by ID.
 * Only the uploader can delete their audio files.
 * Deletes from both storage and database.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
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

    // Fetch audio record
    const { data: audio, error: fetchError } = await supabase
      .from('task_audio')
      .select('id, storage_path, uploaded_by')
      .eq('id', id)
      .single()

    if (fetchError || !audio) {
      return NextResponse.json(
        { error: 'Audio not found' },
        { status: 404 }
      )
    }

    // Check if current user is the uploader
    if (audio.uploaded_by !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own audio files' },
        { status: 403 }
      )
    }

    // Delete from storage first
    // If this fails but file doesn't exist, that's okay (idempotent)
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([audio.storage_path])

    if (storageError) {
      // Log but don't fail - file might already be deleted
      console.warn('Storage delete warning:', storageError)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('task_audio')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting audio record:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete audio' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/audio/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
