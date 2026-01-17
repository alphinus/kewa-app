import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/transcription'
import type {
  TaskAudio,
  TaskAudioWithUrl,
  AudioResponse,
  ErrorResponse,
} from '@/types/database'
import type { Role } from '@/types'

// Storage bucket name
const BUCKET_NAME = 'task-audio'

// Signed URL expiry (1 hour in seconds)
const URL_EXPIRY_SECONDS = 3600

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/audio/[id]/transcribe
 *
 * Trigger transcription for an explanation audio file.
 * Only KEWA can trigger transcription (they own explanation audio).
 *
 * Idempotent: If already completed, returns existing transcription.
 * Returns 409 if already processing.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<AudioResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()
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

    // Only KEWA can trigger transcription
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Only KEWA can trigger transcription' },
        { status: 403 }
      )
    }

    // Fetch audio record
    const { data: audio, error: fetchError } = await supabase
      .from('task_audio')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !audio) {
      return NextResponse.json(
        { error: 'Audio not found' },
        { status: 404 }
      )
    }

    const audioRecord = audio as TaskAudio

    // Validate audio type - only explanation audio can be transcribed
    if (audioRecord.audio_type !== 'explanation') {
      return NextResponse.json(
        { error: 'Only explanation audio can be transcribed' },
        { status: 400 }
      )
    }

    // Check transcription status
    if (audioRecord.transcription_status === 'processing') {
      return NextResponse.json(
        { error: 'Transcription already in progress' },
        { status: 409 }
      )
    }

    // If already completed, return existing transcription (idempotent)
    if (audioRecord.transcription_status === 'completed') {
      // Generate signed URL
      const { data: signedUrl } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(audioRecord.storage_path, URL_EXPIRY_SECONDS)

      const audioWithUrl: TaskAudioWithUrl = {
        ...audioRecord,
        url: signedUrl?.signedUrl || '',
      }

      return NextResponse.json({ audio: audioWithUrl })
    }

    // Update status to 'processing'
    const { error: updateProcessingError } = await supabase
      .from('task_audio')
      .update({ transcription_status: 'processing' })
      .eq('id', id)

    if (updateProcessingError) {
      console.error('Error updating to processing:', updateProcessingError)
      return NextResponse.json(
        { error: 'Failed to start transcription' },
        { status: 500 }
      )
    }

    // Download audio file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(audioRecord.storage_path)

    if (downloadError || !fileData) {
      console.error('Error downloading audio:', downloadError)
      // Revert to failed status
      await supabase
        .from('task_audio')
        .update({ transcription_status: 'failed', transcription: 'Failed to download audio file' })
        .eq('id', id)
      return NextResponse.json(
        { error: 'Failed to download audio file' },
        { status: 500 }
      )
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer()

    // Call transcription service
    const result = await transcribeAudio(arrayBuffer, audioRecord.file_name)

    // Update database with result
    if (result.success) {
      const { data: updatedAudio, error: updateSuccessError } = await supabase
        .from('task_audio')
        .update({
          transcription: result.transcription,
          transcription_status: 'completed',
        })
        .eq('id', id)
        .select()
        .single()

      if (updateSuccessError) {
        console.error('Error updating transcription success:', updateSuccessError)
        return NextResponse.json(
          { error: 'Failed to save transcription' },
          { status: 500 }
        )
      }

      // Generate signed URL
      const { data: signedUrl } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(audioRecord.storage_path, URL_EXPIRY_SECONDS)

      const audioWithUrl: TaskAudioWithUrl = {
        ...updatedAudio,
        url: signedUrl?.signedUrl || '',
      }

      return NextResponse.json({ audio: audioWithUrl })
    } else {
      // Transcription failed
      const { data: updatedAudio, error: updateFailError } = await supabase
        .from('task_audio')
        .update({
          transcription: result.error || 'Unknown transcription error',
          transcription_status: 'failed',
        })
        .eq('id', id)
        .select()
        .single()

      if (updateFailError) {
        console.error('Error updating transcription failure:', updateFailError)
      }

      // Generate signed URL even for failed transcription
      const { data: signedUrl } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(audioRecord.storage_path, URL_EXPIRY_SECONDS)

      const audioWithUrl: TaskAudioWithUrl = {
        ...(updatedAudio || audioRecord),
        transcription_status: 'failed',
        transcription: result.error || 'Unknown transcription error',
        url: signedUrl?.signedUrl || '',
      }

      return NextResponse.json({ audio: audioWithUrl })
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/audio/[id]/transcribe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
