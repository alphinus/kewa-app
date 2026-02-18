/**
 * Project Change Orders Analytics API
 *
 * GET: Budget impact data for a project (original budget + approved COs)
 *
 * Phase 21-03: Budget Impact Analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/change-orders/analytics
 *
 * Returns budget impact analytics for a project:
 * - Original budget
 * - Approved COs total
 * - Pending COs total
 * - Net budget (original + approved)
 * - Count by status
 * - List of all change orders
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createOrgClient(request)

    // Verify user authentication and role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'property_manager', 'renovation_manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch project with estimated_cost
    const { data: project, error: projectError } = await supabase
      .from('renovation_projects')
      .select('id, name, estimated_cost')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch all change orders for this project via work_orders
    const { data: changeOrders, error: coError } = await supabase
      .from('change_orders')
      .select(
        `
        id,
        co_number,
        description,
        total_amount,
        status,
        approved_at,
        work_order:work_orders!work_order_id (
          project_id
        )
      `
      )
      .order('approved_at', { ascending: true, nullsFirst: false })

    if (coError) {
      console.error('Error fetching change orders:', coError)
      return NextResponse.json({ error: 'Failed to fetch change orders' }, { status: 500 })
    }

    // Filter to only this project's change orders
    const projectChangeOrders = (changeOrders || []).filter(
      (co: any) => co.work_order?.project_id === id
    )

    // Calculate aggregates
    const approvedCOs = projectChangeOrders.filter((co: any) => co.status === 'approved')
    const pendingCOs = projectChangeOrders.filter((co: any) =>
      ['submitted', 'under_review'].includes(co.status)
    )

    const approvedTotal = approvedCOs.reduce((sum: number, co: any) => sum + Number(co.total_amount), 0)
    const pendingTotal = pendingCOs.reduce((sum: number, co: any) => sum + Number(co.total_amount), 0)

    const originalBudget = Number(project.estimated_cost) || 0
    const netBudget = originalBudget + approvedTotal

    // Count by status
    const countByStatus = {
      draft: projectChangeOrders.filter((co: any) => co.status === 'draft').length,
      submitted: projectChangeOrders.filter((co: any) => co.status === 'submitted').length,
      under_review: projectChangeOrders.filter((co: any) => co.status === 'under_review').length,
      approved: approvedCOs.length,
      rejected: projectChangeOrders.filter((co: any) => co.status === 'rejected').length,
      cancelled: projectChangeOrders.filter((co: any) => co.status === 'cancelled').length,
    }

    // Format change orders for response (only approved ones for waterfall chart)
    const formattedCOs = approvedCOs.map((co: any) => ({
      co_number: co.co_number,
      description: co.description,
      total_amount: Number(co.total_amount),
      approved_at: co.approved_at,
    }))

    return NextResponse.json({
      project_id: project.id,
      project_name: project.name,
      original_budget: originalBudget,
      approved_total: approvedTotal,
      pending_total: pendingTotal,
      net_budget: netBudget,
      count_by_status: countByStatus,
      change_orders: formattedCOs,
      all_change_orders: projectChangeOrders.map((co: any) => ({
        id: co.id,
        co_number: co.co_number,
        description: co.description,
        total_amount: Number(co.total_amount),
        status: co.status,
        approved_at: co.approved_at,
      })),
    })
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/change-orders/analytics:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
