import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  KBArticleStatus,
  KBArticleWithMeta,
  KBArticleResponse,
  KBErrorResponse,
} from '@/types/knowledge-base'

type RouteParams = {
  params: Promise<{ id: string }>
}

interface StatusChangeBody {
  status: KBArticleStatus
  comment?: string
}

/**
 * Valid status transitions by role
 *
 * Author transitions:
 * - draft -> review (submit for review)
 * - draft -> archived (discard)
 *
 * Admin transitions:
 * - review -> published (approve)
 * - review -> draft (reject, requires comment)
 * - published -> archived (retire)
 */
const VALID_TRANSITIONS: Record<KBArticleStatus, { to: KBArticleStatus; role: 'author' | 'admin'; requiresComment?: boolean }[]> = {
  draft: [
    { to: 'review', role: 'author' },
    { to: 'archived', role: 'author' },
  ],
  review: [
    { to: 'published', role: 'admin' },
    { to: 'draft', role: 'admin', requiresComment: true },
  ],
  published: [
    { to: 'archived', role: 'admin' },
  ],
  archived: [],
}

/**
 * PUT /api/knowledge/[id]/status
 *
 * Updates the workflow status of an article.
 * Validates transitions based on user role and current status.
 * Logs transition to kb_workflow_transitions via database trigger.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<KBArticleResponse | KBErrorResponse>> {
  try {
    const supabase = await createClient()
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

    // Parse request body
    const body: StatusChangeBody = await request.json()
    const { status: newStatus, comment } = body

    // Validate new status
    const validStatuses: KBArticleStatus[] = ['draft', 'review', 'published', 'archived']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Fetch current article
    const { data: article, error: fetchError } = await supabase
      .from('kb_articles')
      .select('id, status, author_id')
      .eq('id', articleId)
      .single()

    if (fetchError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    const currentStatus = article.status as KBArticleStatus

    // No change needed
    if (currentStatus === newStatus) {
      return NextResponse.json(
        { error: 'Article is already in this status' },
        { status: 400 }
      )
    }

    // Check if transition is valid
    const allowedTransitions = VALID_TRANSITIONS[currentStatus]
    const transition = allowedTransitions.find((t) => t.to === newStatus)

    if (!transition) {
      return NextResponse.json(
        { error: `Invalid transition from ${currentStatus} to ${newStatus}` },
        { status: 400 }
      )
    }

    // Check role permission
    const isAdmin = userRole === 'admin' || userRole === 'kewa'
    const isAuthor = article.author_id === userId

    if (transition.role === 'admin' && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can perform this action' },
        { status: 403 }
      )
    }

    if (transition.role === 'author' && !isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the author can perform this action' },
        { status: 403 }
      )
    }

    // Check comment requirement (rejection)
    if (transition.requiresComment && (!comment || !comment.trim())) {
      return NextResponse.json(
        { error: 'Comment is required for this transition' },
        { status: 400 }
      )
    }

    // Update article status
    // The database trigger will handle logging to kb_workflow_transitions
    const { data: updatedArticle, error: updateError } = await supabase
      .from('kb_articles')
      .update({
        status: newStatus,
        updated_by: userId,
      })
      .eq('id', articleId)
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
      // Check for workflow transition error from trigger
      if (updateError.message.includes('Invalid status transition')) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        )
      }
      console.error('Error updating article status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update article status' },
        { status: 500 }
      )
    }

    // If there's a comment (for rejections), insert it into workflow transitions
    // This supplements the trigger which doesn't have access to the comment
    if (comment && comment.trim()) {
      await supabase
        .from('kb_workflow_transitions')
        .update({ comment: comment.trim() })
        .eq('article_id', articleId)
        .eq('from_status', currentStatus)
        .eq('to_status', newStatus)
        .order('transitioned_at', { ascending: false })
        .limit(1)
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
    console.error('Unexpected error in PUT /api/knowledge/[id]/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
