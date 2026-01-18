/**
 * Contractor Media API
 *
 * GET /api/contractor/[token]/[workOrderId]/media
 * DELETE /api/contractor/[token]/[workOrderId]/media
 *
 * List and manage media files uploaded by contractors.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateContractorAccess } from '@/lib/magic-link'
import { createClient } from '@/lib/supabase/server'
import { STORAGE_BUCKET } from '@/lib/storage/contractor-upload'

interface MediaItem {
  id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  media_type: string
  context: string
  created_at: string
  url: string
}

interface MediaListResponse {
  media: MediaItem[]
}

interface DeleteResponse {
  success: boolean
  deleted_id: string
}

interface ErrorResponse {
  error: string
}

// Status where deletion is allowed
const DELETE_ALLOWED_STATUSES = ['accepted', 'in_progress']

/**
 * GET - List all media for a work order
 *
 * Query params:
 * - type: Filter by media_type ('photo' | 'document')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; workOrderId: string }> }
): Promise<NextResponse<MediaListResponse | ErrorResponse>> {
  try {
    const { token, workOrderId } = await params

    // Validate contractor access
    const validation = await validateContractorAccess(token)
    if (!validation.valid || !validation.email) {
      return NextResponse.json(
        { error: 'Ungueltiger oder abgelaufener Token' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Verify work order belongs to this contractor
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select(`
        id,
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')

    // Build query
    let query = supabase
      .from('media')
      .select('id, storage_path, file_name, file_size, mime_type, media_type, context, created_at')
      .eq('entity_type', 'work_order')
      .eq('entity_id', workOrderId)
      .order('created_at', { ascending: false })

    // Apply type filter if provided
    if (typeFilter && ['photo', 'document'].includes(typeFilter)) {
      query = query.eq('media_type', typeFilter)
    }

    const { data: mediaItems, error: mediaError } = await query

    if (mediaError) {
      console.error('Failed to fetch media:', mediaError)
      return NextResponse.json(
        { error: 'Fehler beim Laden der Dateien' },
        { status: 500 }
      )
    }

    // Generate signed URLs for all items
    const mediaWithUrls: MediaItem[] = await Promise.all(
      (mediaItems || []).map(async (item) => {
        const { data: signedUrl } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(item.storage_path, 3600) // 1 hour expiry

        return {
          ...item,
          url: signedUrl?.signedUrl || '',
        }
      })
    )

    return NextResponse.json({ media: mediaWithUrls })
  } catch (error) {
    console.error('Media list error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove a media file
 *
 * Body: { mediaId: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; workOrderId: string }> }
): Promise<NextResponse<DeleteResponse | ErrorResponse>> {
  try {
    const { token, workOrderId } = await params

    // Validate contractor access
    const validation = await validateContractorAccess(token)
    if (!validation.valid || !validation.email) {
      return NextResponse.json(
        { error: 'Ungueltiger oder abgelaufener Token' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { mediaId } = body

    if (!mediaId) {
      return NextResponse.json(
        { error: 'mediaId ist erforderlich' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify work order belongs to this contractor and check status
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

    // Check if deletion is allowed for this status
    if (!DELETE_ALLOWED_STATUSES.includes(workOrder.status)) {
      return NextResponse.json(
        {
          error: `Loeschen nicht erlaubt im Status '${workOrder.status}'. Nur erlaubt bei: akzeptiert, in Bearbeitung.`,
        },
        { status: 403 }
      )
    }

    // Get media record to verify it belongs to this work order
    const { data: mediaRecord, error: mediaError } = await supabase
      .from('media')
      .select('id, storage_path')
      .eq('id', mediaId)
      .eq('entity_type', 'work_order')
      .eq('entity_id', workOrderId)
      .single()

    if (mediaError || !mediaRecord) {
      return NextResponse.json(
        { error: 'Datei nicht gefunden' },
        { status: 404 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([mediaRecord.storage_path])

    if (storageError) {
      console.error('Failed to delete from storage:', storageError)
      // Continue with database deletion anyway
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('media')
      .delete()
      .eq('id', mediaId)

    if (deleteError) {
      console.error('Failed to delete media record:', deleteError)
      return NextResponse.json(
        { error: 'Fehler beim Loeschen der Datei' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted_id: mediaId,
    })
  } catch (error) {
    console.error('Media delete error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
