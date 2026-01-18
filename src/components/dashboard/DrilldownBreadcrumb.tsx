/**
 * DrilldownBreadcrumb Component
 *
 * Navigation breadcrumb showing current drill path for dashboard navigation.
 * Shows Property -> Unit -> Room -> Project hierarchy.
 *
 * Phase 12-04: Drilldown Navigation & Side Panel
 * Requirements: DASH-05 (drilldown navigation)
 */

import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface DrilldownBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function DrilldownBreadcrumb({ items, className }: DrilldownBreadcrumbProps) {
  return (
    <nav
      className={cn('flex items-center gap-2 text-sm', className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
