import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/transcription'
import type {
  TaskAudio,
  TaskAudioWithUrl,
  AudiosResponse,
  AudioResponse,
  AudioType,
  TranscriptionStatus,
  ErrorResponse,
} from '@/types/database'
import type { Role } from '@/types'

// Storage bucket name
const BUCKET_NAME = 'task-audio'

// Max audio files per type per task
const MAX_AUDIO_PER_TYPE = 1

// Signed URL expiry (1 hour in seconds)
const URL_EXPIRY_SECONDS = 3600

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed audio MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
]

/**
 * GET /api/audio?task_id={id}
 *
 * Returns all audio files for a task with signed URLs.
 * Requires authentication.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<AudiosResponse | ErrorResponse>> {
  try {
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
    const projectData = task.project as unknown as { visible_to_imeri: boolean } | null
    if (userRole === 'imeri' && !projectData?.visible_to_imeri) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Fetch audio files for this task
    const { data: audios, error: audiosError } = await supabase
      .from('task_audio')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (audiosError) {
      console.error('Error fetching audio files:', audiosError)
      return NextResponse.json(
        { error: 'Failed to fetch audio files' },
        { status: 500 }
      )
    }

    // Generate signed URLs for each audio file
    const audiosWithUrls: TaskAudioWithUrl[] = await Promise.all(
      (audios || []).map(async (audio: TaskAudio) => {
        const { data: signedUrl } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(audio.storage_path, URL_EXPIRY_SECONDS)

        return {
          ...audio,
          url: signedUrl?.signedUrl || '',
        }
      })
    )

    return NextResponse.json({ audios: audiosWithUrls })
  } catch (error) {
    console.error('Unexpected error in GET /api/audio:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/audio
 *
 * Upload an audio file for a task.
 * Accepts multipart/form-data with file, task_id, audio_type, duration_seconds (optional).
 * Validates role-based permissions (KEWA=explanation, Imeri=emergency).
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<AudioResponse | ErrorResponse>> {
  try {
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

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const taskId = formData.get('task_id') as string | null
    const audioType = formData.get('audio_type') as AudioType | null
    const durationStr = formData.get('duration_seconds') as string | null

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

    if (!audioType || !['explanation', 'emergency'].includes(audioType)) {
      return NextResponse.json(
        { error: 'audio_type must be "explanation" or "emergency"' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid audio format. Allowed: webm, mp4, mpeg, wav, ogg' },
        { status: 400 }
      )
    }

    // Validate role-based permissions
    if (userRole === 'kewa' && audioType !== 'explanation') {
      return NextResponse.json(
        { error: 'KEWA can only add explanation audio' },
        { status: 403 }
      )
    }

    if (userRole === 'imeri' && audioType !== 'emergency') {
      return NextResponse.json(
        { error: 'Imeri can only add emergency audio' },
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

    // Check max audio limit (1 per type per task)
    const { count, error: countError } = await supabase
      .from('task_audio')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('audio_type', audioType)

    if (countError) {
      console.error('Error counting audio files:', countError)
      return NextResponse.json(
        { error: 'Failed to check audio limit' },
        { status: 500 }
      )
    }

    if ((count || 0) >= MAX_AUDIO_PER_TYPE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_AUDIO_PER_TYPE} ${audioType} audio file allowed per task` },
        { status: 409 }
      )
    }

    // Parse duration if provided
    const durationSeconds = durationStr ? parseInt(durationStr, 10) : null

    // Generate unique storage path
    const fileId = crypto.randomUUID()
    const extension = getFileExtension(file.type)
    const storagePath = `${taskId}/${audioType}/${fileId}.${extension}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload audio file' },
        { status: 500 }
      )
    }

    // Determine transcription status based on audio type
    // explanation audio will be transcribed, emergency audio won't
    const transcriptionStatus: TranscriptionStatus = audioType === 'explanation' ? 'pending' : 'completed'

    // Insert record into task_audio table
    const audioData: Partial<TaskAudio> = {
      task_id: taskId,
      audio_type: audioType,
      storage_path: storagePath,
      file_name: file.name || `audio.${extension}`,
      file_size: file.size,
      duration_seconds: durationSeconds,
      transcription: null,
      transcription_status: transcriptionStatus,
      uploaded_by: userId,
    }

    const { data: newAudio, error: insertError } = await supabase
      .from('task_audio')
      .insert(audioData)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting audio record:', insertError)
      // Try to clean up uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to save audio record' },
        { status: 500 }
      )
    }

    // Fire-and-forget auto-transcription for explanation audio
    if (audioType === 'explanation') {
      triggerTranscription(newAudio.id, storagePath, file.name || `audio.${extension}`).catch(
        (err) => {
          console.error('Auto-transcription error:', err)
        }
      )
    }

    // Generate signed URL for response
    const { data: signedUrl } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, URL_EXPIRY_SECONDS)

    const audioWithUrl: TaskAudioWithUrl = {
      ...newAudio,
      url: signedUrl?.signedUrl || '',
    }

    return NextResponse.json({ audio: audioWithUrl }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/audio:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  }
  return extensionMap[mimeType] || 'webm'
}

/**
 * Trigger automatic transcription for an audio file (fire-and-forget)
 *
 * This runs asynchronously after upload completes.
 * Failures are logged but don't affect the upload response.
 * User can manually retry via /api/audio/[id]/transcribe if auto-transcription fails.
 */
async function triggerTranscription(
  audioId: string,
  storagePath: string,
  fileName: string
): Promise<void> {
  const supabase = await createClient()

  try {
    // Update status to processing
    await supabase
      .from('task_audio')
      .update({ transcription_status: 'processing' })
      .eq('id', audioId)

    // Download audio from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(storagePath)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`)
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer()

    // Call transcription service
    const result = await transcribeAudio(arrayBuffer, fileName)

    // Update database with result
    if (result.success) {
      await supabase
        .from('task_audio')
        .update({
          transcription: result.transcription,
          transcription_status: 'completed',
        })
        .eq('id', audioId)
    } else {
      await supabase
        .from('task_audio')
        .update({
          transcription: result.error || 'Unknown transcription error',
          transcription_status: 'failed',
        })
        .eq('id', audioId)
    }
  } catch (error) {
    // Mark as failed with error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await supabase
      .from('task_audio')
      .update({
        transcription: errorMessage,
        transcription_status: 'failed',
      })
      .eq('id', audioId)
    throw error // Re-throw so the .catch() in the caller logs it
  }
}
