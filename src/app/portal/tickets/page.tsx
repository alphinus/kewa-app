import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Ticket } from 'lucide-react'
import { getPortalUser } from '@/lib/portal/session'
import { getTickets } from '@/lib/portal/ticket-queries'
import { TicketCard } from '@/components/portal/TicketCard'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'

/**
 * Portal ticket list page
 * Shows all tickets for the authenticated tenant
 *
 * Phase 29: Integrated EmptyState pattern and Breadcrumbs
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
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meine Tickets</h1>
        <Link href="/portal/tickets/new">
          <Button>
            <Plus className="w-5 h-5 mr-1" />
            Neues Ticket
          </Button>
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
        <div className="py-12 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <Ticket className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            Keine Tickets
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
            Sie haben noch keine Tickets erstellt.
          </p>
          <Link href="/portal/tickets/new">
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              Neues Ticket erstellen
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
