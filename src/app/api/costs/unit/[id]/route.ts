/**
 * Unit Cost API Route
 *
 * GET /api/costs/unit/[id]
 * Returns unit cost data from unit_costs view including:
 * - rent_amount, total_project_costs, direct_expenses, total_investment, years_to_recover
 * - List of projects with individual costs
 * - List of direct expenses
 *
 * Phase 10-06: Unit Investment View and Rent Entry
 * Requirements: RENT-02, RENT-03
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Role } from '@/types'
import {
  getUnitCostSummary,
  getUnitProjectCosts,
  getUnitDirectExpenses
} from '@/lib/costs/unit-cost-queries'

interface UnitCostResponse {
  unitId: string
  unitName: string
  rentAmount: number | null
  totalProjectCosts: number
  directExpenses: number
  totalInvestment: number
  yearsToRecover: number | null
  annualRent: number | null
  projects: Array<{
    id: string
    name: string
    status: string
    estimatedCost: number | null
    actualCost: number | null
    totalInvoiced: number
    totalPaid: number
  }>
  expenses: Array<{
    id: string
    title: string
    category: string
    amount: number
    paidAt: string | null
    vendorName: string | null
  }>
}

/**
 * GET /api/costs/unit/[id]
 * Returns complete cost data for a unit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ data: UnitCostResponse } | { error: string }>> {
  try {
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check role - only internal roles can view cost data
    const allowedRoles: Role[] = ['kewa', 'admin', 'manager', 'accounting']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung fuer Kostendaten' },
        { status: 403 }
      )
    }

    // Fetch unit cost summary
    const costSummary = await getUnitCostSummary(id)

    if (!costSummary) {
      return NextResponse.json(
        { error: 'Einheit nicht gefunden' },
        { status: 404 }
      )
    }

    // Fetch project costs breakdown
    const { projects } = await getUnitProjectCosts(id)

    // Fetch direct expenses
    const { expenses } = await getUnitDirectExpenses(id)

    // Calculate annual rent
    const annualRent = costSummary.rent_amount
      ? costSummary.rent_amount * 12
      : null

    // Build response with camelCase keys for client
    const response: UnitCostResponse = {
      unitId: costSummary.unit_id,
      unitName: costSummary.unit_name,
      rentAmount: costSummary.rent_amount,
      totalProjectCosts: costSummary.total_project_costs,
      directExpenses: costSummary.direct_expenses,
      totalInvestment: costSummary.total_investment,
      yearsToRecover: costSummary.years_to_recover,
      annualRent,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        estimatedCost: p.estimated_cost,
        actualCost: p.actual_cost,
        totalInvoiced: p.total_invoiced,
        totalPaid: p.total_paid
      })),
      expenses: expenses.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: e.amount,
        paidAt: e.paid_at,
        vendorName: e.vendor_name
      }))
    }

    return NextResponse.json({ data: response })
  } catch (error) {
    console.error('Error in GET /api/costs/unit/[id]:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
