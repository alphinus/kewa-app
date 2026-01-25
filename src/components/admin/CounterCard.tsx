import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface CounterCardProps {
  title: string
  count: number
  href: string
  alert?: {
    count: number
    severity: 'error' | 'warning'
  }
  icon?: ReactNode
}

/**
 * Clickable counter card for admin dashboard
 * Displays a count with optional alert badge
 */
export function CounterCard({ title, count, href, alert, icon }: CounterCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer h-full">
        <CardContent className="p-4 sm:p-6 relative">
          {/* Alert badge */}
          {alert && alert.count > 0 && (
            <span
              className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full ${
                alert.severity === 'error'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
              }`}
            >
              {alert.count}
            </span>
          )}

          {/* Icon */}
          {icon && (
            <div className="mb-3 text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          )}

          {/* Count */}
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {count}
          </p>

          {/* Title */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {title}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
