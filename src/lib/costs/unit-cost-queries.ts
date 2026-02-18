/**
 * Unit Cost Query Utilities
 *
 * Functions for fetching unit cost data from unit_costs view
 * and calculating investment metrics.
 * Used by API routes and server components.
 *
 * Phase 10-06: Unit Investment View and Rent Entry
 */

import { createPublicClient } from '@/lib/supabase/with-org'
import type { UnitCosts } from '@/types/database'

/**
 * Extended unit cost data with building information
 */
export interface UnitCostWithBuilding extends UnitCosts {
  building_id?: string
  building_name?: string
}

/**
 * Get cost summary for a single unit from unit_costs view
 */
export async function getUnitCostSummary(
  unitId: string
): Promise<UnitCosts | null> {
  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('unit_costs')
    .select('*')
    .eq('unit_id', unitId)
    .single()

  if (error) {
    console.error('Error fetching unit cost summary:', error)
    return null
  }

  return data as UnitCosts
}

/**
 * Get all units with cost data for overview
 * Optionally filter by building
 */
export async function getAllUnitCosts(
  buildingId?: string
): Promise<UnitCostWithBuilding[]> {
  const supabase = await createPublicClient()

  // Join unit_costs view with units to get building info
  const { data, error } = await supabase
    .from('unit_costs')
    .select(`
      *,
      units!inner (
        building_id,
        buildings!inner (
          id,
          name
        )
      )
    `)

  if (error) {
    console.error('Error fetching all unit costs:', error)
    return []
  }

  // Transform data to include building info at top level
  const units = (data ?? []).map((item) => {
    const unitData = item as UnitCosts & {
      units: {
        building_id: string
        buildings: { id: string; name: string }
      }
    }
    return {
      unit_id: unitData.unit_id,
      unit_name: unitData.unit_name,
      rent_amount: unitData.rent_amount,
      total_project_costs: unitData.total_project_costs,
      direct_expenses: unitData.direct_expenses,
      total_investment: unitData.total_investment,
      years_to_recover: unitData.years_to_recover,
      building_id: unitData.units?.building_id,
      building_name: unitData.units?.buildings?.name
    } as UnitCostWithBuilding
  })

  // Filter by building if specified
  if (buildingId) {
    return units.filter(u => u.building_id === buildingId)
  }

  return units
}

/**
 * Calculate payback period in years
 * Returns null if rent is 0 or not set
 *
 * @param investment - Total investment amount in CHF
 * @param monthlyRent - Monthly rent amount in CHF
 * @returns Years to recover investment via rent, or null
 */
export function calculatePaybackPeriod(
  investment: number | null,
  monthlyRent: number | null
): number | null {
  if (!investment || !monthlyRent || monthlyRent <= 0) {
    return null
  }

  const annualRent = monthlyRent * 12
  return investment / annualRent
}

/**
 * Get unit projects with cost breakdown
 * Returns list of renovation projects for a unit with their costs
 */
export async function getUnitProjectCosts(unitId: string): Promise<{
  projects: Array<{
    id: string
    name: string
    status: string
    estimated_cost: number | null
    actual_cost: number | null
    total_invoiced: number
    total_paid: number
  }>
  total: number
}> {
  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('renovation_projects')
    .select(`
      id,
      name,
      status,
      estimated_cost,
      actual_cost,
      invoices (
        total_amount,
        amount_paid
      )
    `)
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching unit project costs:', error)
    return { projects: [], total: 0 }
  }

  const projects = (data ?? []).map(project => {
    const invoices = project.invoices as Array<{
      total_amount: number | null
      amount_paid: number
    }> | null
    const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0) ?? 0
    const totalPaid = invoices?.reduce((sum, inv) => sum + inv.amount_paid, 0) ?? 0

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      estimated_cost: project.estimated_cost,
      actual_cost: project.actual_cost,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid
    }
  })

  const total = projects.reduce((sum, p) => sum + p.total_invoiced, 0)

  return { projects, total }
}

/**
 * Get unit direct expenses (not linked to a project)
 */
export async function getUnitDirectExpenses(unitId: string): Promise<{
  expenses: Array<{
    id: string
    title: string
    category: string
    amount: number
    paid_at: string | null
    vendor_name: string | null
  }>
  total: number
}> {
  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('expenses')
    .select('id, title, category, amount, paid_at, vendor_name')
    .eq('unit_id', unitId)
    .is('renovation_project_id', null)
    .order('paid_at', { ascending: false })

  if (error) {
    console.error('Error fetching unit direct expenses:', error)
    return { expenses: [], total: 0 }
  }

  const expenses = data ?? []
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return { expenses, total }
}

/**
 * Get summary statistics for investment overview
 */
export async function getInvestmentSummaryStats(
  buildingId?: string
): Promise<{
  totalUnits: number
  unitsWithRent: number
  totalInvestment: number
  averagePaybackYears: number | null
}> {
  const units = await getAllUnitCosts(buildingId)

  const totalUnits = units.length
  const unitsWithRent = units.filter(u => u.rent_amount && u.rent_amount > 0).length
  const totalInvestment = units.reduce((sum, u) => sum + (u.total_investment ?? 0), 0)

  // Calculate average payback for units with rent and investment
  const paybackYears = units
    .filter(u => u.years_to_recover !== null)
    .map(u => u.years_to_recover as number)

  const averagePaybackYears = paybackYears.length > 0
    ? paybackYears.reduce((sum, y) => sum + y, 0) / paybackYears.length
    : null

  return {
    totalUnits,
    unitsWithRent,
    totalInvestment,
    averagePaybackYears
  }
}

/**
 * Get available buildings for filtering
 */
export async function getBuildingsForFilter(): Promise<Array<{
  id: string
  name: string
}>> {
  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('buildings')
    .select('id, name')
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
    return []
  }

  return data ?? []
}
