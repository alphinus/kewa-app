/**
 * Contractor Upload API
 *
 * POST /api/contractor/[token]/[workOrderId]/upload
 *
 * Allows contractors to upload documents (offers, invoices) and photos
 * (completion evidence) through the portal.
 *
 * Implements:
 * - EXT-11: Document upload (offers, invoices)
 * - EXT-12: Photo upload (completion photos)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateContractorAccess } from '@/lib/magic-link'
import { createClient } from '@/lib/supabase/server'
import {
  validateContractorUpload,
  generateStoragePath,
  STORAGE_BUCKET,
  type UploadMediaType,
  type UploadContext,
} from '@/lib/storage/contractor-upload'
import { logUploadAddedEvent } from '@/lib/work-orders/events'

interface UploadResponse {
  media: {
    id: string
    storage_path: string
    file_name: string
    file_size: number | null
    mime_type: string | null
    media_type: string
    context: string
    url: string
  }
}

interface ErrorResponse {
  error: string
}

// Valid work order statuses for uploads
const UPLOAD_ALLOWED_STATUSES = ['accepted', 'in_progress', 'done']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; workOrderId: string }> }
): Promise<NextResponse<UploadResponse | ErrorResponse>> {
  try {
    const { token, workOrderId } = await params

    // Validate contractor access
    const validation = await validateContractorAccess(token)
    if (!validation.valid || !validation.email) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Token' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Verify work order belongs to this contractor and is in valid status
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select(`
        id,
        status,
        partner:partners!inner(email)
      `)
      .eq('id', workOrderId)
      .ilike('partners.email', validation.email.toLowerCase())
      .single()

    if (woError || !workOrder) {
      return NextResponse.json(
        { error: 'Arbeitsauftrag nicht gefunden oder Zugriff verweigert' },
        { status: 404 }
      )
    }

    // Check if uploads are allowed for this status
    if (!UPLOAD_ALLOWED_STATUSES.includes(workOrder.status)) {
      return NextResponse.json(
        {
          error: `Uploads nicht erlaubt im Status '${workOrder.status}'. Erlaubt: akzeptiert, in Bearbeitung, erledigt.`,
        },
        { status: 403 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mediaType = (formData.get('type') as UploadMediaType) || 'photo'
    const context = (formData.get('context') as UploadContext) || 'other'

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      )
    }

    // Validate file
    const validationResult = validateContractorUpload(file, mediaType)
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error || 'Ungültige Datei' },
        { status: 400 }
      )
    }

    // Generate storage path
    const storagePath = generateStoragePath(
      workOrderId,
      mediaType,
      context,
      file.type
    )

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(storagePath.bucket)
      .upload(storagePath.path, new Uint8Array(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      return NextResponse.json(
        { error: 'Upload fehlgeschlagen. Bitte erneut versuchen.' },
        { status: 500 }
      )
    }

    // Map upload context to media_context enum
    const dbContext = mapContextToEnum(context)

    // Create media record in database
    const { data: media, error: insertError } = await supabase
      .from('media')
      .insert({
        entity_type: 'work_order',
        entity_id: workOrderId,
        media_type: mediaType,
        context: dbContext,
        storage_path: storagePath.path,
        file_name: file.name || storagePath.filename,
        file_size: file.size,
        mime_type: file.type,
        // uploaded_by is null for contractor uploads (they don't have user records)
      })
      .select('id, storage_path, file_name, file_size, mime_type, media_type, context')
      .single()

    if (insertError) {
      console.error('Database insert failed:', insertError)
      // Clean up uploaded file
      await supabase.storage.from(storagePath.bucket).remove([storagePath.path])
      return NextResponse.json(
        { error: 'Speichern der Datei fehlgeschlagen' },
        { status: 500 }
      )
    }

    // Generate signed URL for response
    const { data: signedUrl } = await supabase.storage
      .from(storagePath.bucket)
      .createSignedUrl(storagePath.path, 3600) // 1 hour expiry

    // Log upload event
    await logUploadAddedEvent(workOrderId, validation.email, {
      file_name: file.name || storagePath.filename,
      file_type: file.type,
      media_id: media.id,
      context: context,
    })

    return NextResponse.json(
      {
        media: {
          ...media,
          url: signedUrl?.signedUrl || '',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

/**
 * Map upload context to database media_context enum.
 * The database enum has: before, after, during, documentation, other
 */
function mapContextToEnum(
  context: UploadContext
): 'before' | 'after' | 'during' | 'documentation' | 'other' {
  switch (context) {
    case 'offer':
    case 'invoice':
      return 'documentation'
    case 'completion':
    case 'after':
      return 'after'
    case 'before':
      return 'before'
    case 'during':
      return 'during'
    default:
      return 'other'
  }
}
