import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getPortalUser } from '@/lib/portal/session'
import { getTenantContext } from '@/lib/portal/tenant-isolation'
import { getOpenTicketCount, getRecentTickets } from '@/lib/portal/ticket-queries'
import { getUnreadMessageCount } from '@/lib/portal/message-queries'
import { TicketCard } from '@/components/portal/TicketCard'
import { createPublicClient } from '@/lib/supabase/with-org'

/**
 * Portal dashboard - tenant homepage
 * Shows stats, recent tickets, and quick actions
 */
export default async function PortalDashboardPage() {
  // Check authentication
  const user = await getPortalUser()
  if (!user) {
    redirect('/portal/login')
  }

  // Get tenant context and unit details
  const { unitId } = await getTenantContext(user.id)

  const supabase = await createPublicClient()
  const { data: unit } = await supabase
    .from('units')
    .select('name, buildings!inner (name)')
    .eq('id', unitId)
    .single()

  const building = Array.isArray(unit?.buildings) ? unit.buildings[0] : unit?.buildings
  const buildingName = building?.name || ''
  const unitName = unit?.name || ''

  // Get dashboard stats
  const [openTicketCount, unreadMessageCount, recentTickets] = await Promise.all([
    getOpenTicketCount(user.id),
    getUnreadMessageCount(user.id),
    getRecentTickets(user.id, 5),
  ])

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Willkommen</h1>
        <p className="text-gray-600">
          {buildingName} - {unitName}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Offene Tickets</p>
          <p className="text-3xl font-bold text-blue-600">{openTicketCount}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Ungelesene Nachrichten</p>
          <p className="text-3xl font-bold text-blue-600">{unreadMessageCount}</p>
        </div>
      </div>

      {/* New ticket button */}
      <Link
        href="/portal/tickets/new"
        className="flex items-center justify-center gap-2 w-full min-h-[48px] bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Neues Ticket
      </Link>

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Letzte Tickets</h2>
          <Link
            href="/portal/tickets"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Alle anzeigen
          </Link>
        </div>

        {recentTickets.length > 0 ? (
          <div className="space-y-3">
            {recentTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">Noch keine Tickets erstellt</p>
            <Link
              href="/portal/tickets/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Erstes Ticket erstellen
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
