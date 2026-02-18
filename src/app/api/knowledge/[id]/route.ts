import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type {
  KBArticleWithMeta,
  KBArticleResponse,
  UpdateKBArticleInput,
  KBErrorResponse,
  KBSuccessResponse,
} from '@/types/knowledge-base'

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/knowledge/[id]
 *
 * Returns a single article with author and category info.
 * Increments view_count on each fetch.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBArticleResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id } = await params

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
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' },
        { status: 400 }
      )
    }

    // Fetch article with author and category
    const { data: article, error: articleError } = await supabase
      .from('kb_articles')
      .select(`
        *,
        author:users!kb_articles_author_id_fkey (
          id,
          display_name
        ),
        category:kb_categories (
          id,
          name
        )
      `)
      .eq('id', id)
      .single()

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Increment view count (fire and forget - don't wait for result)
    supabase
      .from('kb_articles')
      .update({ view_count: article.view_count + 1 })
      .eq('id', id)
      .then(() => {})

    // Transform to KBArticleWithMeta
    const transformedArticle: KBArticleWithMeta = {
      id: article.id,
      title: article.title,
      content: article.content,
      template: article.template,
      status: article.status,
      visibility: article.visibility,
      category_id: article.category_id,
      tags: article.tags || [],
      author_id: article.author_id,
      last_reviewed_at: article.last_reviewed_at,
      expiry_date: article.expiry_date,
      view_count: article.view_count,
      version: article.version,
      created_at: article.created_at,
      updated_at: article.updated_at,
      updated_by: article.updated_by,
      author_name: article.author?.display_name || 'Unknown',
      category_name: article.category?.name || null,
    }

    return NextResponse.json({ article: transformedArticle })
  } catch (error) {
    console.error('Unexpected error in GET /api/knowledge/[id]:', error)
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
 * PUT /api/knowledge/[id]
 *
 * Updates an existing article.
 * Accepts: { title?, content?, category_id?, tags?, visibility?, status?, last_reviewed_at?, expiry_date? }
 * Sets updated_by from x-user-id header.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBArticleResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id } = await params

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
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' },
        { status: 400 }
      )
    }

    // Parse request body
    const body: UpdateKBArticleInput = await request.json()

    // Verify article exists
    const { data: existingArticle, error: fetchError } = await supabase
      .from('kb_articles')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Verify category exists if being updated
    if (body.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('kb_categories')
        .select('id')
        .eq('id', body.category_id)
        .single()

      if (categoryError || !category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_by: userId,
    }

    if (body.title !== undefined) {
      updateData.title = body.title.trim()
    }
    if (body.content !== undefined) {
      updateData.content = body.content
    }
    if (body.category_id !== undefined) {
      updateData.category_id = body.category_id
    }
    if (body.tags !== undefined) {
      updateData.tags = body.tags
    }
    if (body.visibility !== undefined) {
      updateData.visibility = body.visibility
    }
    if (body.status !== undefined) {
      updateData.status = body.status
    }
    if (body.last_reviewed_at !== undefined) {
      updateData.last_reviewed_at = body.last_reviewed_at
    }
    if (body.expiry_date !== undefined) {
      updateData.expiry_date = body.expiry_date
    }

    // Update article
    const { data: updatedArticle, error: updateError } = await supabase
      .from('kb_articles')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        author:users!kb_articles_author_id_fkey (
          id,
          display_name
        ),
        category:kb_categories (
          id,
          name
        )
      `)
      .single()

    if (updateError) {
      // Check for workflow transition error
      if (updateError.message.includes('Invalid status transition')) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        )
      }
      console.error('Error updating article:', updateError)
      return NextResponse.json(
        { error: 'Failed to update article' },
        { status: 500 }
      )
    }

    // Transform to KBArticleWithMeta
    const transformedArticle: KBArticleWithMeta = {
      id: updatedArticle.id,
      title: updatedArticle.title,
      content: updatedArticle.content,
      template: updatedArticle.template,
      status: updatedArticle.status,
      visibility: updatedArticle.visibility,
      category_id: updatedArticle.category_id,
      tags: updatedArticle.tags || [],
      author_id: updatedArticle.author_id,
      last_reviewed_at: updatedArticle.last_reviewed_at,
      expiry_date: updatedArticle.expiry_date,
      view_count: updatedArticle.view_count,
      version: updatedArticle.version,
      created_at: updatedArticle.created_at,
      updated_at: updatedArticle.updated_at,
      updated_by: updatedArticle.updated_by,
      author_name: updatedArticle.author?.display_name || 'Unknown',
      category_name: updatedArticle.category?.name || null,
    }

    return NextResponse.json({ article: transformedArticle })
  } catch (error) {
    console.error('Unexpected error in PUT /api/knowledge/[id]:', error)
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
 * DELETE /api/knowledge/[id]
 *
 * Deletes an article.
 * Only allowed for draft articles or by admin role.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBSuccessResponse | KBErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)
    const { id } = await params

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
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid article ID format' },
        { status: 400 }
      )
    }

    // Verify article exists and check status
    const { data: article, error: fetchError } = await supabase
      .from('kb_articles')
      .select('id, status, author_id')
      .eq('id', id)
      .single()

    if (fetchError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of draft articles, unless admin
    const isAdmin = userRole === 'admin' || userRole === 'kewa'
    const isAuthor = article.author_id === userId
    const isDraft = article.status === 'draft'

    if (!isAdmin && (!isDraft || !isAuthor)) {
      return NextResponse.json(
        { error: 'Only draft articles can be deleted by their author. Admins can delete any article.' },
        { status: 403 }
      )
    }

    // Delete article (cascades to history and shortcuts)
    const { error: deleteError } = await supabase
      .from('kb_articles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting article:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/knowledge/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
