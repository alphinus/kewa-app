import { TicketListSkeleton } from '@/components/skeletons/TicketListSkeleton'

/**
 * Loading state for portal tickets page
 * Uses skeleton loader pattern per CONTEXT.md (UXPL-05)
 */
export default function PortalTicketsLoading() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-12 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Ticket list skeleton */}
      <TicketListSkeleton />
    </div>
  )
}
