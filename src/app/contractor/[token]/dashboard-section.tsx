/**
 * Dashboard Section Component
 *
 * Collapsible section for grouping work orders by status.
 * Color-coded headers with count badges.
 *
 * Variants:
 * - action: Orange theme for work orders needing response
 * - progress: Purple theme for in-progress work
 * - completed: Gray theme, collapsed by default
 */

'use client'

import { useState } from 'react'

type SectionVariant = 'action' | 'progress' | 'completed'

interface DashboardSectionProps {
  title: string
  count: number
  variant: SectionVariant
  collapsed?: boolean
  emptyMessage?: string
  children: React.ReactNode
}

export default function DashboardSection({
  title,
  count,
  variant,
  collapsed = false,
  emptyMessage = 'Keine Auftraege',
  children,
}: DashboardSectionProps) {
  const [isOpen, setIsOpen] = useState(!collapsed)

  // Variant-specific styling
  const variantStyles: Record<SectionVariant, {
    headerBg: string
    headerText: string
    badgeBg: string
    badgeText: string
    borderColor: string
  }> = {
    action: {
      headerBg: 'bg-orange-50',
      headerText: 'text-orange-800',
      badgeBg: 'bg-orange-600',
      badgeText: 'text-white',
      borderColor: 'border-orange-200',
    },
    progress: {
      headerBg: 'bg-purple-50',
      headerText: 'text-purple-800',
      badgeBg: 'bg-purple-600',
      badgeText: 'text-white',
      borderColor: 'border-purple-200',
    },
    completed: {
      headerBg: 'bg-gray-50',
      headerText: 'text-gray-600',
      badgeBg: 'bg-gray-500',
      badgeText: 'text-white',
      borderColor: 'border-gray-200',
    },
  }

  const styles = variantStyles[variant]

  // Don't render section if empty (except action section which shows empty state)
  if (count === 0 && variant !== 'action') {
    return null
  }

  return (
    <section className={`rounded-lg border ${styles.borderColor} overflow-hidden`}>
      {/* Header - clickable to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 ${styles.headerBg} ${styles.headerText}`}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">
            {title}
          </h2>
          <span className={`inline-flex items-center justify-center px-2 py-0.5 text-sm font-medium rounded-full ${styles.badgeBg} ${styles.badgeText}`}>
            {count}
          </span>
        </div>

        {/* Chevron indicator */}
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="bg-white">
          {count > 0 ? (
            <div className="divide-y divide-gray-100">
              {children}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-gray-500 text-sm">{emptyMessage}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
