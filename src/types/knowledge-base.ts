/**
 * Knowledge Base types matching Supabase schema (048_knowledge_base.sql)
 *
 * These interfaces represent the knowledge base entities and are used
 * for type-safe Supabase queries and API operations.
 */

// =============================================
// ENUMS
// =============================================

/**
 * Article workflow status
 * Valid transitions: draft->review, review->published, review->draft, published->archived, draft->archived
 */
export type KBArticleStatus = 'draft' | 'review' | 'published' | 'archived'

/**
 * Article visibility settings
 * - internal: Only KEWA staff can see
 * - contractors: Only contractors can see (via portal)
 * - both: Visible to everyone
 */
export type KBArticleVisibility = 'internal' | 'contractors' | 'both'

/**
 * Article template types
 * Each template has predefined sections
 */
export type KBArticleTemplate = 'faq' | 'howto' | 'policy'

// =============================================
// CATEGORY TYPES
// =============================================

/**
 * Knowledge base category
 * Supports two-level hierarchy (categories and subcategories)
 */
export interface KBCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  parent_id: string | null
  path: string
  level: number
  sort_order: number
  created_at: string
}

/**
 * Category with article count and optional children
 * Used for category tree display
 */
export interface KBCategoryWithCount extends KBCategory {
  article_count: number
  children?: KBCategoryWithCount[]
}

// =============================================
// ARTICLE TYPES
// =============================================

/**
 * Knowledge base article
 * Core entity for documentation and FAQs
 */
export interface KBArticle {
  id: string
  title: string
  content: Record<string, unknown> // Tiptap JSON format
  template: KBArticleTemplate
  status: KBArticleStatus
  visibility: KBArticleVisibility
  category_id: string | null
  tags: string[]
  author_id: string
  last_reviewed_at: string | null
  expiry_date: string | null
  view_count: number
  version: number
  created_at: string
  updated_at: string
  updated_by: string | null
}

/**
 * Article with joined metadata
 * Includes author name and category name for display
 */
export interface KBArticleWithMeta extends KBArticle {
  author_name: string
  category_name: string | null
}

/**
 * Article version history record
 */
export interface KBArticleHistory {
  history_id: string
  article_id: string
  version: number
  title: string
  content: Record<string, unknown>
  status: KBArticleStatus
  changed_at: string
  changed_by: string
  change_type: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_by_name?: string
}

/**
 * Workflow transition record
 */
export interface KBWorkflowTransition {
  id: string
  article_id: string
  from_status: KBArticleStatus
  to_status: KBArticleStatus
  transitioned_by: string
  transitioned_at: string
  comment: string | null
}

// =============================================
// API INPUT TYPES
// =============================================

/**
 * Input for creating a new article
 */
export interface CreateKBArticleInput {
  title: string
  content: Record<string, unknown>
  template: KBArticleTemplate
  category_id?: string
  tags?: string[]
  visibility?: KBArticleVisibility
}

/**
 * Input for updating an existing article
 */
export interface UpdateKBArticleInput {
  title?: string
  content?: Record<string, unknown>
  category_id?: string | null
  tags?: string[]
  visibility?: KBArticleVisibility
  status?: KBArticleStatus
  last_reviewed_at?: string
  expiry_date?: string | null
}

/**
 * Input for creating a new category
 */
export interface CreateKBCategoryInput {
  name: string
  description?: string
  icon?: string
  parent_id?: string
  sort_order?: number
}

/**
 * Input for updating an existing category
 */
export interface UpdateKBCategoryInput {
  name?: string
  description?: string | null
  icon?: string | null
  sort_order?: number
}

// =============================================
// SEARCH TYPES
// =============================================

/**
 * Search result item
 * Includes snippet with highlighted matches
 */
export interface KBSearchResult {
  id: string
  title: string
  snippet: string
  rank: number
  category_id: string | null
  category_name: string | null
  updated_at: string
  author_name: string
}

/**
 * Search filter options
 */
export interface KBSearchFilters {
  categoryId?: string
  audience?: KBArticleVisibility
  author?: string
  dateFrom?: string
  dateTo?: string
}

// =============================================
// DASHBOARD SHORTCUT TYPES
// =============================================

/**
 * User's pinned article shortcut
 */
export interface KBDashboardShortcut {
  id: string
  user_id: string
  article_id: string
  created_at: string
  article?: KBArticleWithMeta
}

// =============================================
// API RESPONSE TYPES
// =============================================

/**
 * Response for GET /api/knowledge (list articles)
 */
export interface KBArticlesResponse {
  articles: KBArticleWithMeta[]
}

/**
 * Response for GET /api/knowledge/[id] (single article)
 */
export interface KBArticleResponse {
  article: KBArticleWithMeta
}

/**
 * Response for GET /api/knowledge/categories
 */
export interface KBCategoriesResponse {
  categories: KBCategoryWithCount[]
}

/**
 * Response for single category operations
 */
export interface KBCategoryResponse {
  category: KBCategory
}

/**
 * Response for search operations
 */
export interface KBSearchResponse {
  results: KBSearchResult[]
  total: number
}

/**
 * Response for article history
 */
export interface KBArticleHistoryResponse {
  history: KBArticleHistory[]
}

/**
 * Response for dashboard shortcuts
 */
export interface KBShortcutsResponse {
  shortcuts: KBDashboardShortcut[]
}

/**
 * Generic success response
 */
export interface KBSuccessResponse {
  success: boolean
}

/**
 * Error response format
 */
export interface KBErrorResponse {
  error: string
}
