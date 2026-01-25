import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Building2, Users, FolderKanban, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CounterCard } from '@/components/admin/CounterCard'
import { AlertSection } from '@/components/admin/AlertSection'
import { QuickActions } from '@/components/admin/QuickActions'
import { AdminDashboardClient } from './AdminDashboardClient'

/**
 * Admin Dashboard
 * Shows overview counts, alerts, and quick actions for administrators
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Get current user and verify admin role
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie?.value) {
    redirect('/login')
  }

  let session
  try {
    session = JSON.parse(sessionCookie.value)
  } catch {
    redirect('/login')
  }

  // Only allow kewa role
  if (session.role !== 'kewa') {
    redirect('/dashboard')
  }

  // Fetch all counts and alerts in parallel
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    propertiesResult,
    partnersResult,
    projectsResult,
    templatesResult,
    overdueResult,
    stalledResult,
    inactivePartnersResult,
  ] = await Promise.all([
    // Count properties
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    // Count partners
    supabase.from('partners').select('*', { count: 'exact', head: true }),
    // Count renovation projects
    supabase.from('renovation_projects').select('*', { count: 'exact', head: true }),
    // Count templates
    supabase.from('templates').select('*', { count: 'exact', head: true }),
    // Overdue projects (deadline in past, not completed)
    supabase
      .from('renovation_projects')
      .select('id, name')
      .lt('end_date', now.toISOString())
      .neq('status', 'completed'),
    // Stalled projects (not updated in 7+ days, not completed)
    supabase
      .from('renovation_projects')
      .select('id, name')
      .lt('updated_at', sevenDaysAgo.toISOString())
      .neq('status', 'completed'),
    // Inactive partners
    supabase
      .from('partners')
      .select('id, company_name')
      .eq('is_active', false),
  ])

  const propertyCount = propertiesResult.count ?? 0
  const partnerCount = partnersResult.count ?? 0
  const projectCount = projectsResult.count ?? 0
  const templateCount = templatesResult.count ?? 0

  const overdueProjects = overdueResult.data ?? []
  const stalledProjects = stalledResult.data ?? []
  const inactivePartners = inactivePartnersResult.data ?? []

  // Calculate alert counts for badges
  const projectAlertCount = overdueProjects.length + stalledProjects.length
  const partnerAlertCount = inactivePartners.length

  return (
    <AdminDashboardClient propertyCount={propertyCount}>
      <div className="p-4 pb-20 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Uebersicht aller Stammdaten und Systemstatus
          </p>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <CounterCard
            title="Liegenschaften"
            count={propertyCount}
            href="/dashboard/admin/properties"
            icon={<Building2 className="h-6 w-6" />}
          />
          <CounterCard
            title="Partner"
            count={partnerCount}
            href="/dashboard/partner"
            icon={<Users className="h-6 w-6" />}
            alert={partnerAlertCount > 0 ? { count: partnerAlertCount, severity: 'warning' } : undefined}
          />
          <CounterCard
            title="Projekte"
            count={projectCount}
            href="/dashboard/kosten/projekte"
            icon={<FolderKanban className="h-6 w-6" />}
            alert={projectAlertCount > 0 ? { count: projectAlertCount, severity: 'error' } : undefined}
          />
          <CounterCard
            title="Templates"
            count={templateCount}
            href="/templates"
            icon={<FileText className="h-6 w-6" />}
          />
        </div>

        {/* Alerts Section */}
        <div className="mb-6">
          <AlertSection
            overdueProjects={overdueProjects}
            stalledProjects={stalledProjects}
            inactivePartners={inactivePartners}
          />
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </AdminDashboardClient>
  )
}
