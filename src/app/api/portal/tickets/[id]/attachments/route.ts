/**
 * Portal Ticket Attachments API
 *
 * POST /api/portal/tickets/:id/attachments - Upload attachment(s)
 *
 * Uploads photos for ticket creation or message replies.
 * Enforces MAX_TICKET_PHOTOS limit for ticket-level attachments.
 * Phase 26: Tenant Portal Core
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyTicketOwnership } from '@/lib/portal/tenant-isolation'
import {
  validateAttachment,
  uploadTicketAttachment,
  MAX_TICKET_PHOTOS,
} from '@/lib/portal/attachment-upload'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/portal/tickets/:id/attachments
 *
 * Upload one or more photo attachments.
 * Validates file count, size, and type.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-portal-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    const { id: ticketId } = await params

    // Verify ticket ownership
    await verifyTicketOwnership(userId, ticketId)

    // Parse FormData
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const messageId = formData.get('message_id') as string | null

    // Validate files exist
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Keine Dateien hochgeladen' },
        { status: 400 }
      )
    }

    // For ticket-level attachments, enforce MAX_TICKET_PHOTOS
    if (!messageId) {
      const supabase = await createClient()

      // Count existing ticket-level attachments
      const { count: existingCount } = await supabase
        .from('ticket_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('ticket_id', ticketId)
        .is('message_id', null)

      const totalCount = (existingCount || 0) + files.length

      if (totalCount > MAX_TICKET_PHOTOS) {
        return NextResponse.json(
          {
            error: `Maximal ${MAX_TICKET_PHOTOS} Fotos pro Ticket erlaubt (${existingCount} vorhanden)`,
          },
          { status: 400 }
        )
      }
    }

    // Validate each file
    for (const file of files) {
      const validation = validateAttachment(file, 'tenant')
      if (!validation.valid) {
        return NextResponse.json(
          { error: `${file.name}: ${validation.error}` },
          { status: 400 }
        )
      }
    }

    // Upload all files
    const uploadResults = await Promise.all(
      files.map((file) => uploadTicketAttachment(file, ticketId, messageId || undefined))
    )

    // Create attachment records in database
    const supabase = await createClient()
    const attachmentRecords = uploadResults.map((result, idx) => ({
      ticket_id: ticketId,
      message_id: messageId || null,
      uploaded_by: userId,
      storage_path: result.path,
      file_name: files[idx].name,
      file_size: files[idx].size,
      mime_type: files[idx].type,
    }))

    const { data: attachments, error: insertError } = await supabase
      .from('ticket_attachments')
      .insert(attachmentRecords)
      .select()

    if (insertError) {
      console.error('Database insert failed:', insertError)

      // Clean up uploaded files
      await Promise.all(
        uploadResults.map((result) =>
          supabase.storage.from('media').remove([result.path])
        )
      )

      return NextResponse.json(
        { error: 'Speichern der Dateien fehlgeschlagen' },
        { status: 500 }
      )
    }

    // Add URLs to response
    const attachmentsWithUrls = attachments?.map((att, idx) => ({
      ...att,
      url: uploadResults[idx].url,
    }))

    return NextResponse.json({ attachments: attachmentsWithUrls }, { status: 201 })
  } catch (error) {
    console.error('Error uploading attachments:', error)

    if (
      error instanceof Error &&
      error.message.includes('nicht gefunden')
    ) {
      return NextResponse.json(
        { error: 'Ticket nicht gefunden oder Zugriff verweigert' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Fehler beim Hochladen der Dateien',
      },
      { status: 500 }
    )
  }
}
