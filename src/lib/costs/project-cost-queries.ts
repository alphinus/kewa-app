/**
 * Project Cost Queries
 *
 * Server-side query helpers for fetching project costs with work order breakdown.
 * Uses the project_costs view and joins work orders with their offers/invoices.
 *
 * Phase 10-04: Project Cost Dashboard
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ProjectCosts,
  RenovationProject,
  WorkOrder,
  Offer,
  Invoice,
  Expense,
  Room,
  Partner,
} from '@/types/database'

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Work order with associated cost data
 */
export interface WorkOrderWithCosts {
  id: string
  title: string
  status: string
  room: Pick<Room, 'id' | 'name'> | null
  partner: Pick<Partner, 'id' | 'company_name'> | null
  // Cost fields
  estimated_cost: number | null
  proposed_cost: number | null
  final_cost: number | null
  // Related offer (accepted one)
  acceptedOffer: Pick<
    Offer,
    'id' | 'total_amount' | 'status' | 'offer_date'
  > | null
  // Related invoice (primary one)
  invoice: Pick<
    Invoice,
    'id' | 'invoice_number' | 'total_amount' | 'status' | 'paid_at'
  > | null
}

/**
 * Project with full cost breakdown
 */
export interface ProjectWithCostBreakdown {
  project: Pick<
    RenovationProject,
    | 'id'
    | 'name'
    | 'status'
    | 'estimated_cost'
    | 'planned_start_date'
    | 'planned_end_date'
  > & {
    unit: {
      id: string
      name: string
      building: {
        id: string
        name: string
      } | null
    } | null
  }
  // Summary from view
  summary: ProjectCosts | null
  // Detailed breakdown
  workOrders: WorkOrderWithCosts[]
  expenses: ExpenseWithCategory[]
  // Calculated totals
  totals: {
    totalOffers: number
    totalInvoiced: number
    totalPaid: number
    totalExpenses: number
    grandTotal: number
  }
}

/**
 * Expense with category info for display
 */
export interface ExpenseWithCategory extends Expense {
  categoryLabel?: string
}

/**
 * Project summary for list view
 */
export interface ProjectCostSummaryItem {
  project_id: string
  project_name: string
  unit_id: string
  unit_name: string
  building_name: string | null
  status: string
  estimated_cost: number | null
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  total_expenses: number
  total_cost: number
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get project cost summary from the project_costs view
 */
export async function getProjectCostSummary(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ data: ProjectCosts | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('project_costs')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as ProjectCosts, error: null }
}

/**
 * Get all work orders for a project with their associated costs
 */
export async function getProjectWorkOrdersWithCosts(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ data: WorkOrderWithCosts[]; error: Error | null }> {
  // Fetch work orders with relations
  const { data: workOrders, error } = await supabase
    .from('work_orders')
    .select(
      `
      id,
      title,
      status,
      estimated_cost,
      proposed_cost,
      final_cost,
      room:rooms (
        id,
        name
      ),
      partner:partners (
        id,
        company_name
      ),
      offers (
        id,
        total_amount,
        status,
        offer_date
      ),
      invoices (
        id,
        invoice_number,
        total_amount,
        status,
        paid_at
      )
    `
    )
    .eq('renovation_project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: [], error: new Error(error.message) }
  }

  // Transform to WorkOrderWithCosts
  const result: WorkOrderWithCosts[] = (workOrders || []).map((wo) => {
    // Find the accepted offer
    const offers = Array.isArray(wo.offers) ? wo.offers : []
    const acceptedOffer = offers.find((o) => o.status === 'accepted') || null

    // Get primary invoice (first one)
    const invoices = Array.isArray(wo.invoices) ? wo.invoices : []
    const invoice = invoices[0] || null

    // Handle Supabase returning arrays for to-one relations
    const roomData = Array.isArray(wo.room) ? wo.room[0] : wo.room
    const partnerData = Array.isArray(wo.partner) ? wo.partner[0] : wo.partner

    return {
      id: wo.id,
      title: wo.title,
      status: wo.status,
      estimated_cost: wo.estimated_cost,
      proposed_cost: wo.proposed_cost,
      final_cost: wo.final_cost,
      room: roomData ? { id: roomData.id, name: roomData.name } : null,
      partner: partnerData ? { id: partnerData.id, company_name: partnerData.company_name } : null,
      acceptedOffer: acceptedOffer as WorkOrderWithCosts['acceptedOffer'],
      invoice: invoice as WorkOrderWithCosts['invoice'],
    }
  })

  return { data: result, error: null }
}

/**
 * Get all expenses for a project
 */
export async function getProjectExpenses(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ data: ExpenseWithCategory[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('renovation_project_id', projectId)
    .order('paid_at', { ascending: false })

  if (error) {
    return { data: [], error: new Error(error.message) }
  }

  return { data: (data || []) as ExpenseWithCategory[], error: null }
}

/**
 * Get full project cost breakdown (combines all queries)
 */
export async function getProjectCostBreakdown(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ data: ProjectWithCostBreakdown | null; error: Error | null }> {
  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('renovation_projects')
    .select(
      `
      id,
      name,
      status,
      estimated_cost,
      planned_start_date,
      planned_end_date,
      unit:units (
        id,
        name,
        building:buildings (
          id,
          name
        )
      )
    `
    )
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return {
      data: null,
      error: new Error(projectError?.message || 'Project not found'),
    }
  }

  // Handle Supabase returning arrays for to-one relations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unitRaw = project.unit as any
  const unitData = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
  const buildingRaw = unitData?.building
  const buildingData = buildingRaw && Array.isArray(buildingRaw)
    ? buildingRaw[0]
    : buildingRaw

  const normalizedProject = {
    id: project.id,
    name: project.name,
    status: project.status,
    estimated_cost: project.estimated_cost,
    planned_start_date: project.planned_start_date,
    planned_end_date: project.planned_end_date,
    unit: unitData
      ? {
          id: unitData.id as string,
          name: unitData.name as string,
          building: buildingData
            ? { id: buildingData.id as string, name: buildingData.name as string }
            : null,
        }
      : null,
  }

  // Fetch cost summary
  const { data: summary } = await getProjectCostSummary(supabase, projectId)

  // Fetch work orders with costs
  const { data: workOrders, error: woError } =
    await getProjectWorkOrdersWithCosts(supabase, projectId)

  if (woError) {
    return { data: null, error: woError }
  }

  // Fetch expenses
  const { data: expenses, error: expError } = await getProjectExpenses(
    supabase,
    projectId
  )

  if (expError) {
    return { data: null, error: expError }
  }

  // Calculate totals from work orders
  const totalOffers = workOrders.reduce(
    (sum, wo) => sum + (wo.acceptedOffer?.total_amount ?? 0),
    0
  )
  const totalInvoiced = workOrders.reduce(
    (sum, wo) => sum + (wo.invoice?.total_amount ?? 0),
    0
  )
  const totalPaid = workOrders.reduce((sum, wo) => {
    if (wo.invoice?.status === 'paid') {
      return sum + (wo.invoice.total_amount ?? 0)
    }
    return sum
  }, 0)
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const grandTotal = totalInvoiced + totalExpenses

  return {
    data: {
      project: normalizedProject,
      summary,
      workOrders,
      expenses,
      totals: {
        totalOffers,
        totalInvoiced,
        totalPaid,
        totalExpenses,
        grandTotal,
      },
    },
    error: null,
  }
}

/**
 * Get all projects with cost summaries for overview page
 */
export async function getAllProjectCostSummaries(
  supabase: SupabaseClient
): Promise<{ data: ProjectCostSummaryItem[]; error: Error | null }> {
  // Join project_costs view with units and buildings
  const { data: projects, error } = await supabase
    .from('renovation_projects')
    .select(
      `
      id,
      name,
      status,
      estimated_cost,
      unit:units (
        id,
        name,
        building:buildings (
          id,
          name
        )
      )
    `
    )
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: new Error(error.message) }
  }

  // Fetch cost summaries
  const { data: costSummaries, error: costError } = await supabase
    .from('project_costs')
    .select('*')

  if (costError) {
    return { data: [], error: new Error(costError.message) }
  }

  // Create a map for quick lookup
  const costMap = new Map<string, ProjectCosts>()
  for (const cs of costSummaries || []) {
    costMap.set(cs.project_id, cs as ProjectCosts)
  }

  // Combine data
  const result: ProjectCostSummaryItem[] = (projects || []).map((p) => {
    // Handle Supabase returning arrays for to-one relations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unitRaw = p.unit as any
    const unitData = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
    const buildingRaw = unitData?.building
    const buildingData = buildingRaw && Array.isArray(buildingRaw)
      ? buildingRaw[0]
      : buildingRaw
    const costs = costMap.get(p.id)

    return {
      project_id: p.id,
      project_name: p.name,
      unit_id: (unitData?.id as string) ?? '',
      unit_name: (unitData?.name as string) ?? '-',
      building_name: (buildingData?.name as string) ?? null,
      status: p.status,
      estimated_cost: p.estimated_cost,
      total_invoiced: costs?.total_invoiced ?? 0,
      total_paid: costs?.total_paid ?? 0,
      total_outstanding: costs?.total_outstanding ?? 0,
      total_expenses: costs?.total_expenses ?? 0,
      total_cost: costs?.total_cost ?? 0,
    }
  })

  return { data: result, error: null }
}

/**
 * Get cost statistics for dashboard
 */
export async function getCostStatistics(supabase: SupabaseClient): Promise<{
  data: {
    totalInvoiced: number
    totalPaid: number
    totalOutstanding: number
    totalExpenses: number
    projectCount: number
  } | null
  error: Error | null
}> {
  const { data: costs, error } = await supabase.from('project_costs').select('*')

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const stats = {
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalExpenses: 0,
    projectCount: costs?.length ?? 0,
  }

  for (const c of costs || []) {
    stats.totalInvoiced += c.total_invoiced ?? 0
    stats.totalPaid += c.total_paid ?? 0
    stats.totalOutstanding += c.total_outstanding ?? 0
    stats.totalExpenses += c.total_expenses ?? 0
  }

  return { data: stats, error: null }
}
