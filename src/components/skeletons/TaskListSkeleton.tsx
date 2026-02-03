'use client'

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Skeleton loader for task list page.
 * Matches task row layout with checkbox, title, badge, and date.
 */
export function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Checkbox placeholder */}
              <Skeleton width={24} height={24} borderRadius={4} />
              {/* Title */}
              <div className="flex-1">
                <Skeleton width="50%" height={18} />
              </div>
              {/* Status badge */}
              <Skeleton width={70} height={22} borderRadius={11} />
              {/* Date */}
              <Skeleton width={80} height={16} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default TaskListSkeleton
