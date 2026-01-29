import { TICKET_URGENCY_LABELS, TICKET_URGENCY_COLORS } from '@/types/portal'
import type { TicketUrgency } from '@/types/portal'
import { cn } from '@/lib/utils'

interface UrgencyBadgeProps {
  urgency: TicketUrgency
}

/**
 * Inline badge for ticket urgency with German labels
 * Notfall gets pulsing red indicator
 */
export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        TICKET_URGENCY_COLORS[urgency]
      )}
    >
      {urgency === 'notfall' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
      {TICKET_URGENCY_LABELS[urgency]}
    </span>
  )
}
