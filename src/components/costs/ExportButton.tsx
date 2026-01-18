'use client'

/**
 * ExportButton - Opens export modal or links to export page
 *
 * Can be used in two modes:
 * 1. Modal mode: Opens ExportModal inline (requires projects prop)
 * 2. Link mode: Links to /dashboard/kosten/export page
 *
 * Phase 10-05: CSV Export for Accounting (COST-06)
 */

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ExportModal } from './ExportModal'

interface Project {
  id: string
  name: string
}

interface ExportButtonProps {
  /** Projects for modal filter (if provided, uses modal mode) */
  projects?: Project[]
  /** Pre-selected export type */
  defaultType?: 'invoices' | 'expenses' | 'all'
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * ExportButton - Trigger for CSV export
 */
export function ExportButton({
  projects,
  defaultType,
  variant = 'secondary',
  size = 'md',
}: ExportButtonProps) {
  const [showModal, setShowModal] = useState(false)

  // Link mode - no projects provided
  if (!projects) {
    return (
      <Link href="/dashboard/kosten/export">
        <Button variant={variant} size={size}>
          <DownloadIcon />
          Export
        </Button>
      </Link>
    )
  }

  // Modal mode
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setShowModal(true)}>
        <DownloadIcon />
        Export
      </Button>

      {showModal && (
        <ExportModal
          projects={projects}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function DownloadIcon() {
  return (
    <svg
      className="w-4 h-4 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}
