'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Breadcrumb navigation component.
 * Auto-generates breadcrumbs from pathname or accepts explicit items.
 * Skips 'dashboard' and 'portal' segments per CONTEXT.md.
 *
 * Usage:
 * ```tsx
 * // Auto-generate from URL
 * <Breadcrumbs />
 *
 * // With custom segment labels
 * <Breadcrumbs labels={{ 'abc-123': 'Musterstrasse 1' }} />
 *
 * // With explicit items
 * <Breadcrumbs items={[
 *   { label: 'Liegenschaften', href: '/dashboard/liegenschaft' },
 *   { label: 'Musterstrasse 1', href: '/dashboard/liegenschaft/abc' }
 * ]} />
 * ```
 */

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  /** Explicit breadcrumb items (overrides auto-generation) */
  items?: BreadcrumbItem[]
  /** Labels for dynamic route segments (e.g., UUIDs) */
  labels?: Record<string, string>
}

/**
 * Convert kebab-case segment to Title Case.
 * Handle UUIDs by showing truncated version.
 */
function formatSegment(segment: string): string {
  // UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(segment)) {
    return segment.slice(0, 8) + '...'
  }

  // kebab-case to Title Case
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function Breadcrumbs({ items, labels }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs from pathname
  const generatedItems = useMemo<BreadcrumbItem[]>(() => {
    if (items) return items

    const segments = pathname
      .split('/')
      .filter(Boolean)
      .filter((seg) => seg !== 'dashboard' && seg !== 'portal')

    return segments.map((segment, idx) => {
      // Build href including dashboard/portal prefix
      const pathSegments = pathname.split('/').filter(Boolean)
      const prefixIdx = pathSegments.findIndex(
        (s) => s === 'dashboard' || s === 'portal'
      )
      const prefix = prefixIdx >= 0 ? pathSegments[prefixIdx] : ''
      const pathParts = segments.slice(0, idx + 1)
      const href = `/${prefix}/${pathParts.join('/')}`

      // Get label from override or format segment
      const label = labels?.[segment] || formatSegment(segment)

      return { label, href }
    })
  }, [pathname, items, labels])

  // Don't render if no items or only one item
  if (generatedItems.length <= 1) {
    return null
  }

  return (
    <nav
      className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400"
      aria-label="Breadcrumb"
    >
      {generatedItems.map((item, idx) => {
        const isLast = idx === generatedItems.length - 1

        return (
          <div key={item.href} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
            {isLast ? (
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
