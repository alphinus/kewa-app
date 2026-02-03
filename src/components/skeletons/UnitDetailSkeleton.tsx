'use client'

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Skeleton loader for unit detail page.
 * Matches header, info cards grid, and content area layout.
 */
export function UnitDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header with title and badge */}
      <div className="flex items-center gap-4">
        <Skeleton width={200} height={32} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton width="40%" height={14} className="mb-2" />
              <Skeleton width="70%" height={24} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content area */}
      <Card>
        <CardHeader>
          <Skeleton width={150} height={20} />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton count={4} height={16} />
        </CardContent>
      </Card>
    </div>
  )
}

export default UnitDetailSkeleton
