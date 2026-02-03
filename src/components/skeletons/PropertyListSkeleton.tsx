'use client'

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Skeleton loader for property list page.
 * Matches the property card layout with avatar, title, subtitle, and stats.
 */
export function PropertyListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Avatar circle */}
              <Skeleton circle width={48} height={48} />
              <div className="flex-1">
                {/* Title line */}
                <Skeleton width="60%" height={20} />
                {/* Subtitle line */}
                <Skeleton width="40%" height={16} className="mt-1" />
              </div>
              {/* Stats badges */}
              <div className="flex gap-2">
                <Skeleton width={60} height={24} borderRadius={12} />
                <Skeleton width={60} height={24} borderRadius={12} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default PropertyListSkeleton
