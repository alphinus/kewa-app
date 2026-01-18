/**
 * Contractor Portal Layout
 *
 * Mobile-first layout for external contractors accessing work orders.
 * Implements NFR-06: Contractor page mobile-optimized.
 *
 * Design principles:
 * - Touch-friendly buttons (min 44px height)
 * - Readable text without zooming (16px base)
 * - No horizontal scrolling
 * - Fast load time (minimal JS)
 */

import { Metadata, Viewport } from 'next'
import './contractor.css'

export const metadata: Metadata = {
  title: 'KEWA AG - Contractor Portal',
  description: 'Work order portal for KEWA AG contractors',
  robots: 'noindex, nofollow', // Don't index contractor pages
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a365d',
}

interface ContractorLayoutProps {
  children: React.ReactNode
  params: Promise<{ token: string }>
}

export default async function ContractorLayout({
  children,
}: ContractorLayoutProps) {
  return (
    <div className="contractor-layout min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white px-4 py-3 safe-area-inset-top">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo placeholder - replace with actual logo */}
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-blue-900 font-bold text-sm">K</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">KEWA AG</h1>
              <p className="text-blue-200 text-xs">Contractor Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-lg mx-auto safe-area-inset-bottom">
        {children}
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-white">
        <p>&copy; {new Date().getFullYear()} KEWA AG. All rights reserved.</p>
        <p className="mt-1">
          Questions? Contact{' '}
          <a
            href="mailto:info@kewa.ch"
            className="text-blue-600 underline"
          >
            info@kewa.ch
          </a>
        </p>
      </footer>
    </div>
  )
}
