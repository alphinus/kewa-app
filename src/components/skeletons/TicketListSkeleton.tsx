'use client'

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Skeleton loader for portal ticket list page.
 * Matches ticket card layout with title, category badge, status badge, and date.
 * Mobile-friendly layout.
 */
export function TicketListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Title row */}
              <Skeleton width="70%" height={20} />
              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                <Skeleton width={80} height={22} borderRadius={11} />
                <Skeleton width={60} height={22} borderRadius={11} />
              </div>
              {/* Date */}
              <Skeleton width={100} height={14} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default TicketListSkeleton
