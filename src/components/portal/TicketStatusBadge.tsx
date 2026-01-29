import { TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '@/types/portal'
import type { TicketStatus } from '@/types/portal'
import { cn } from '@/lib/utils'

interface TicketStatusBadgeProps {
  status: TicketStatus
}

/**
 * Inline badge for ticket status with German labels
 */
export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        TICKET_STATUS_COLORS[status]
      )}
    >
      {TICKET_STATUS_LABELS[status]}
    </span>
  )
}
