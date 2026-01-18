/**
 * Expense Queries Library
 *
 * Server-side query helpers for fetching expenses with relations.
 * Used by API routes and server components.
 *
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Expense } from '@/types/database'

// ============================================
// QUERY DEFINITIONS
// ============================================

/**
 * Select query for expenses with relations
 */
export const EXPENSE_SELECT = `
  *,
  project:renovation_projects (
    id,
    name,
    unit_id
  ),
  unit:units (
    id,
    name,
    building:buildings (
      id,
      name
    )
  ),
  room:rooms (
    id,
    name,
    room_type
  ),
  work_order:work_orders (
    id,
    title
  ),
  paid_by_user:users!expenses_paid_by_fkey (
    id,
    display_name
  ),
  created_by_user:users!expenses_created_by_fkey (
    id,
    display_name
  )
`

// ============================================
// EXPENSE WITH RELATIONS TYPE
// ============================================

export interface ExpenseWithRelations extends Expense {
  project: {
    id: string
    name: string
    unit_id: string
  } | null
  unit: {
    id: string
    name: string
    building: {
      id: string
      name: string
    } | null
  } | null
  room: {
    id: string
    name: string
    room_type: string
  } | null
  work_order: {
    id: string
    title: string
  } | null
  paid_by_user: {
    id: string
    display_name: string
  } | null
  created_by_user: {
    id: string
    display_name: string
  } | null
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get a single expense with all relations
 */
export async function getExpenseWithRelations(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: ExpenseWithRelations | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as ExpenseWithRelations, error: null }
}

/**
 * Get all expenses for a specific project
 */
export async function getExpensesByProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ data: ExpenseWithRelations[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('renovation_project_id', projectId)
    .order('paid_at', { ascending: false })

  if (error) {
    return { data: [], error: new Error(error.message) }
  }

  return { data: (data || []) as ExpenseWithRelations[], error: null }
}

/**
 * Get all expenses for a specific unit (including direct unit expenses)
 */
export async function getExpensesByUnit(
  supabase: SupabaseClient,
  unitId: string
): Promise<{ data: ExpenseWithRelations[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('unit_id', unitId)
    .order('paid_at', { ascending: false })

  if (error) {
    return { data: [], error: new Error(error.message) }
  }

  return { data: (data || []) as ExpenseWithRelations[], error: null }
}

/**
 * Get recent expenses for dashboard display
 */
export async function getRecentExpenses(
  supabase: SupabaseClient,
  limit: number = 10
): Promise<{ data: ExpenseWithRelations[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: [], error: new Error(error.message) }
  }

  return { data: (data || []) as ExpenseWithRelations[], error: null }
}

// ============================================
// LIST QUERY WITH FILTERS
// ============================================

export interface ExpenseListFilters {
  projectId?: string
  unitId?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

/**
 * Get expenses with filters and pagination
 */
export async function getExpensesList(
  supabase: SupabaseClient,
  filters: ExpenseListFilters = {}
): Promise<{
  data: ExpenseWithRelations[]
  total: number | null
  error: Error | null
}> {
  const {
    projectId,
    unitId,
    category,
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0,
  } = filters

  let query = supabase
    .from('expenses')
    .select(EXPENSE_SELECT, { count: 'exact' })
    .order('paid_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply filters
  if (projectId) {
    query = query.eq('renovation_project_id', projectId)
  }
  if (unitId) {
    query = query.eq('unit_id', unitId)
  }
  if (category) {
    query = query.eq('category', category)
  }
  if (dateFrom) {
    query = query.gte('paid_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('paid_at', dateTo)
  }

  const { data, error, count } = await query

  if (error) {
    return { data: [], total: null, error: new Error(error.message) }
  }

  return {
    data: (data || []) as ExpenseWithRelations[],
    total: count,
    error: null,
  }
}

// ============================================
// AGGREGATION HELPERS
// ============================================

/**
 * Calculate total amount for a list of expenses
 */
export function calculateExpenseTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}

/**
 * Group expenses by category with totals
 */
export function groupExpensesByCategory(
  expenses: Expense[]
): Record<string, { count: number; total: number }> {
  return expenses.reduce(
    (acc, expense) => {
      const category = expense.category
      if (!acc[category]) {
        acc[category] = { count: 0, total: 0 }
      }
      acc[category].count++
      acc[category].total += expense.amount
      return acc
    },
    {} as Record<string, { count: number; total: number }>
  )
}
