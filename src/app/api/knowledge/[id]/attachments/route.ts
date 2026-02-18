import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type {
  KBAttachment,
  KBAttachmentWithUrl,
  KBAttachmentsResponse,
  KBAttachmentResponse,
  KBErrorResponse,
  KBSuccessResponse,
} from '@/types/knowledge-base'

type RouteParams = {
  params: Promise<{ id: string }>
}

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * GET /api/knowledge/[id]/attachments
 *
 * Returns all attachments for an article with signed download URLs.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBAttachmentsResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id: articleId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(articleId)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' },
        { status: 400 }
      )
    }

    // Verify article exists
    const { data: article, error: articleError } = await supabase
      .from('kb_articles')
      .select('id')
      .eq('id', articleId)
      .single()

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Fetch attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('kb_attachments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: false })

    if (attachmentsError) {
      console.error('Error fetching attachments:', attachmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch attachments' },
        { status: 500 }
      )
    }

    // Generate signed URLs for each attachment (1 hour expiry)
    const attachmentsWithUrls: KBAttachmentWithUrl[] = await Promise.all(
      (attachments || []).map(async (attachment: KBAttachment) => {
        const { data: signedData } = await supabase.storage
          .from('media')
          .createSignedUrl(attachment.storage_path, 3600) // 1 hour

        return {
          ...attachment,
          url: signedData?.signedUrl || '',
        }
      })
    )

    return NextResponse.json({ attachments: attachmentsWithUrls })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/[id]/attachments:', error)
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
 * POST /api/knowledge/[id]/attachments
 *
 * Uploads a file attachment for an article.
 * Body: FormData with 'file' field and optional 'description' field.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBAttachmentResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id: articleId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(articleId)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' },
        { status: 400 }
      )
    }

    // Verify article exists
    const { data: article, error: articleError } = await supabase
      .from('kb_articles')
      .select('id')
      .eq('id', articleId)
      .single()

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPEG, WebP` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 10MB' },
        { status: 400 }
      )
    }

    // Generate unique file ID and path
    const fileId = crypto.randomUUID()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const storagePath = `kb_articles/${articleId}/attachments/${fileId}.${ext}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Insert attachment record
    const { data: attachment, error: insertError } = await supabase
      .from('kb_attachments')
      .insert({
        article_id: articleId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        description: description || null,
        uploaded_by: userId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting attachment:', insertError)
      // Try to clean up uploaded file
      await supabase.storage.from('media').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create attachment record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ attachment })
  } catch (error) {
    console.error('Unexpected error in POST /api/knowledge/[id]/attachments:', error)
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
 * DELETE /api/knowledge/[id]/attachments
 *
 * Deletes an attachment by attachment ID (passed as query param).
 * Query: ?attachmentId=uuid
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBSuccessResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id: articleId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get attachment ID from query
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Missing attachmentId parameter' },
        { status: 400 }
      )
    }

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(articleId) || !uuidRegex.test(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    // Fetch attachment to get storage path and verify ownership
    const { data: attachment, error: fetchError } = await supabase
      .from('kb_attachments')
      .select('*, article:kb_articles!kb_attachments_article_id_fkey(author_id)')
      .eq('id', attachmentId)
      .eq('article_id', articleId)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Check permission: only admin or article author can delete
    const isAdmin = userRole === 'admin' || userRole === 'kewa'
    const isAuthor = attachment.article?.author_id === userId

    if (!isAdmin && !isAuthor) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('media')
      .remove([attachment.storage_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue to delete the record even if storage deletion fails
    }

    // Delete attachment record
    const { error: deleteError } = await supabase
      .from('kb_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('Error deleting attachment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete attachment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/knowledge/[id]/attachments:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
