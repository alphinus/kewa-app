import { createClient } from '@/lib/supabase/server'
import type { KBSearchFilters, KBSearchResult } from '@/types/knowledge-base'

/**
 * Search knowledge base articles using PostgreSQL full-text search.
 * Uses websearch_to_tsquery for safe user input handling.
 * Returns results with snippets containing highlighted matches.
 *
 * @param query - Search query (user input, safe to pass directly)
 * @param filters - Optional filters for category, visibility, author, date range
 * @param limit - Maximum number of results (default 20)
 * @returns Search results with snippets and total count
 */
export async function searchArticles(
  query: string,
  filters: KBSearchFilters = {},
  limit: number = 20
): Promise<{ results: KBSearchResult[]; total: number }> {
  // Handle empty query
  if (!query || query.trim().length === 0) {
    return { results: [], total: 0 }
  }

  const supabase = await createClient()

  // Call the PostgreSQL search function
  const { data, error, count } = await supabase.rpc('search_kb_articles', {
    search_query: query.trim(),
    category_filter: filters.categoryId || null,
    visibility_filter: filters.audience || null,
    author_filter: filters.author || null,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    result_limit: limit,
  })

  if (error) {
    console.error('Search error:', error)
    throw new Error('Search failed')
  }

  // Transform RPC results to KBSearchResult type
  const results: KBSearchResult[] = (data || []).map(
    (row: {
      id: string
      title: string
      snippet: string
      rank: number
      category_id: string | null
      category_name: string | null
      updated_at: string
      author_name: string
    }) => ({
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      rank: row.rank,
      category_id: row.category_id,
      category_name: row.category_name,
      updated_at: row.updated_at,
      author_name: row.author_name,
    })
  )

  return {
    results,
    total: count ?? results.length,
  }
}

/**
 * Get search suggestions based on user input.
 * Uses pg_trgm similarity for fuzzy matching.
 *
 * @param term - Partial search term (minimum 2 characters)
 * @param limit - Maximum number of suggestions (default 5)
 * @returns Array of suggestion strings
 */
export async function getSuggestions(
  term: string,
  limit: number = 5
): Promise<string[]> {
  // Require minimum 2 characters
  if (!term || term.trim().length < 2) {
    return []
  }

  const supabase = await createClient()

  // Call the PostgreSQL suggestions function
  const { data, error } = await supabase.rpc('get_kb_suggestions', {
    search_term: term.trim(),
    match_limit: limit,
  })

  if (error) {
    console.error('Suggestions error:', error)
    return []
  }

  // Extract unique suggestions
  const suggestions = (data || [])
    .map((row: { suggestion: string }) => row.suggestion)
    .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)

  return suggestions.slice(0, limit)
}

/**
 * Build search highlights for display.
 * Extracts text between <mark> tags for custom styling.
 *
 * @param snippet - Snippet with <mark> tags from search
 * @returns Object with parts array for rendering
 */
export function parseHighlights(snippet: string): { parts: Array<{ text: string; highlighted: boolean }> } {
  const parts: Array<{ text: string; highlighted: boolean }> = []
  const regex = /<mark>(.*?)<\/mark>/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(snippet)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        text: snippet.slice(lastIndex, match.index),
        highlighted: false,
      })
    }
    // Add the highlighted match
    parts.push({
      text: match[1],
      highlighted: true,
    })
    lastIndex = regex.lastIndex
  }

  // Add remaining text after last match
  if (lastIndex < snippet.length) {
    parts.push({
      text: snippet.slice(lastIndex),
      highlighted: false,
    })
  }

  return { parts }
}
