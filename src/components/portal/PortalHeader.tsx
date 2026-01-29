'use client'

import { User } from 'lucide-react'
import Link from 'next/link'

interface PortalHeaderProps {
  companyName: string
}

/**
 * Portal header with company name and settings link
 * Fixed top bar with blue background
 */
export function PortalHeader({ companyName }: PortalHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-blue-900 text-white h-14 shadow-md">
      <div className="flex items-center justify-between h-full px-4">
        {/* Company name */}
        <div>
          <h1 className="text-lg font-semibold">{companyName}</h1>
          <p className="text-xs text-blue-100">Mieterportal</p>
        </div>

        {/* Settings link */}
        <Link
          href="/portal/settings"
          className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-full hover:bg-blue-800 transition-colors"
          aria-label="Einstellungen"
        >
          <User className="w-5 h-5" />
        </Link>
      </div>
    </header>
  )
}
