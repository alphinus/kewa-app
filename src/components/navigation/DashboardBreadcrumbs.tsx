'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Dashboard breadcrumb navigation component.
 * Purpose-built for the dashboard nav hierarchy per D3.
 *
 * - Returns null on /dashboard (no breadcrumbs on home page)
 * - Prepends "Übersicht" linking to /dashboard
 * - Resolves known route segment labels from static map
 * - Accepts UUID → display name overrides via `labels` prop
 *
 * Usage:
 * ```tsx
 * // Auto-generate from URL
 * <DashboardBreadcrumbs />
 *
 * // With UUID label overrides for drill-down pages
 * <DashboardBreadcrumbs labels={{ [propertyId]: property.name }} />
 * ```
 */

interface DashboardBreadcrumbsProps {
  /** UUID → display name overrides for dynamic route segments */
  labels?: Record<string, string>
}

interface BreadcrumbItem {
  label: string
  href: string
}

/**
 * Static label map: route segment → German display label.
 * Covers all known dashboard routes per D3.
 */
const SEGMENT_LABELS: Record<string, string> = {
  objekte: 'Objekte',
  aufgaben: 'Aufgaben',
  kosten: 'Kosten',
  projekte: 'Projekte',
  lieferanten: 'Lieferanten',
  berichte: 'Berichte',
  settings: 'Einstellungen',
  abnahmen: 'Abnahmen',
  knowledge: 'Knowledge Base',
  audio: 'Audio',
  benachrichtigungen: 'Benachrichtigungen',
  aenderungsauftraege: 'Änderungsaufträge',
  vorlagen: 'Vorlagen',
  raum: 'Raum',
  ausgaben: 'Ausgaben',
  rechnungen: 'Rechnungen',
  wohnungen: 'Wohnungen',
  bestellungen: 'Bestellungen',
  bestand: 'Bestand',
  auftraege: 'Aufträge',
  maengel: 'Mängel',
  checkliste: 'Checkliste',
  unterschrift: 'Unterschrift',
  export: 'Export',
  analytics: 'Analytics',
  preise: 'Preise',
  verbrauch: 'Verbrauch',
  neu: 'Neu',
  new: 'Neu',
  edit: 'Bearbeiten',
  bearbeiten: 'Bearbeiten',
  category: 'Kategorie',
  tasks: 'Aufgaben',
  partner: 'Partner',
  admin: 'Administration',
  properties: 'Liegenschaften',
}

/** UUID pattern for detecting dynamic route segments */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolve display label for a URL segment.
 * Priority: labels override → static map → formatted fallback
 */
function resolveLabel(segment: string, labels?: Record<string, string>): string {
  // Check UUID override from labels prop
  if (labels?.[segment]) {
    return labels[segment]
  }

  // Check static segment map
  if (SEGMENT_LABELS[segment]) {
    return SEGMENT_LABELS[segment]
  }

  // UUID fallback: truncate
  if (UUID_PATTERN.test(segment)) {
    return segment.slice(0, 8) + '...'
  }

  // Kebab-case to Title Case fallback
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Dashboard breadcrumb nav component.
 * Returns null on the /dashboard home page (no crumbs needed).
 */
export function DashboardBreadcrumbs({ labels }: DashboardBreadcrumbsProps) {
  const pathname = usePathname()

  const items = useMemo<BreadcrumbItem[]>(() => {
    // Strip leading /dashboard — split and filter
    const segments = pathname
      .split('/')
      .filter(Boolean)
      .filter((seg) => seg !== 'dashboard')

    // No segments means we're at /dashboard — no breadcrumbs
    if (segments.length === 0) {
      return []
    }

    // Build breadcrumb items: cumulative hrefs from /dashboard/
    const crumbs: BreadcrumbItem[] = segments.map((segment, idx) => {
      const pathParts = segments.slice(0, idx + 1)
      const href = `/dashboard/${pathParts.join('/')}`
      return { label: resolveLabel(segment, labels), href }
    })

    // Prepend "Übersicht" as the home crumb
    return [{ label: 'Übersicht', href: '/dashboard' }, ...crumbs]
  }, [pathname, labels])

  // No items = on /dashboard home, render nothing
  if (items.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4 flex-wrap"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1

        return (
          <div key={item.href} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
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
