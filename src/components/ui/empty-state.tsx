'use client'

import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/**
 * EmptyState component for displaying meaningful messages when lists are empty.
 *
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon={<Home className="h-12 w-12" />}
 *   title="Keine Liegenschaften"
 *   description="Erstellen Sie Ihre erste Liegenschaft."
 *   action={{ label: "+ Liegenschaft", onClick: () => router.push('/dashboard/liegenschaften/neu') }}
 * />
 * ```
 */

interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  /** Optional icon displayed above the title */
  icon?: ReactNode
  /** Main title text */
  title: string
  /** Optional description text below title */
  description?: string
  /** Optional CTA button */
  action?: EmptyStateAction
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      {icon && (
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
