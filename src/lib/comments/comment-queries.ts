import { createClient } from '@/lib/supabase/server'
import type {
  Comment,
  CommentWithAuthor,
  CreateCommentInput,
  CommentEntityType,
} from '@/types/comments'

export async function fetchComments(
  entityType: CommentEntityType,
  entityId: string,
  viewerRole: 'kewa' | 'contractor',
  viewerEmail?: string
): Promise<CommentWithAuthor[]> {
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('comments')
    .select(`
      *,
      author:users(display_name)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })

  // Contractors only see shared comments
  if (viewerRole === 'contractor') {
    query = query.eq('visibility', 'shared')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching comments:', error)
    return []
  }

  return (data || []).map(comment => {
    // Handle Supabase array relation
    const authorData = comment.author as unknown as { display_name: string } | null

    return {
      ...comment,
      author_display_name: authorData?.display_name || comment.author_name || comment.author_email || 'Unbekannt',
      is_own_comment: viewerEmail ? comment.author_email === viewerEmail : false
    }
  }) as CommentWithAuthor[]
}

export async function createComment(
  input: CreateCommentInput,
  authorId?: string,
  authorEmail?: string,
  authorName?: string
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      content: input.content.trim(),
      visibility: input.visibility,
      author_id: authorId || null,
      author_email: authorEmail || null,
      author_name: authorName || null
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, comment: data as Comment }
}

export async function getCommentCount(
  entityType: CommentEntityType,
  entityId: string
): Promise<number> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  return count || 0
}
