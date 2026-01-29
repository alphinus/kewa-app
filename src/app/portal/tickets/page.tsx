import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getPortalUser } from '@/lib/portal/session'
import { getTickets } from '@/lib/portal/ticket-queries'
import { TicketCard } from '@/components/portal/TicketCard'

/**
 * Portal ticket list page
 * Shows all tickets for the authenticated tenant
 */
export default async function PortalTicketsPage() {
  // Check authentication
  const user = await getPortalUser()
  if (!user) {
    redirect('/portal/login')
  }

  // Get all tickets for this user
  const tickets = await getTickets(user.id)

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meine Tickets</h1>
        <Link
          href="/portal/tickets/new"
          className="flex items-center justify-center gap-2 min-h-[48px] px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Neues Ticket
        </Link>
      </div>

      {/* Ticket list */}
      {tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => (
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
  )
}
