export type CommentVisibility = 'internal' | 'shared'
export type CommentEntityType = 'task' | 'work_order' | 'project' | 'unit'

export interface Comment {
  id: string
  entity_type: CommentEntityType
  entity_id: string
  content: string
  visibility: CommentVisibility
  author_id: string | null
  author_email: string | null
  author_name: string | null
  created_at: string
  updated_at: string
}

export interface CommentWithAuthor extends Comment {
  author_display_name: string
  is_own_comment: boolean
}

export interface CreateCommentInput {
  entity_type: CommentEntityType
  entity_id: string
  content: string
  visibility: CommentVisibility
}

export interface CommentListResponse {
  comments: CommentWithAuthor[]
  total: number
}
