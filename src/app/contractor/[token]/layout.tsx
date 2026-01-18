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

      {/* Mobile-optimized styles */}
      <style jsx global>{`
        /* Base font size for readability */
        html {
          font-size: 16px;
        }

        /* Touch-friendly tap targets */
        .contractor-layout button,
        .contractor-layout a,
        .contractor-layout input,
        .contractor-layout select,
        .contractor-layout textarea {
          min-height: 44px;
        }

        /* Safe area insets for notched devices */
        .safe-area-inset-top {
          padding-top: max(0.75rem, env(safe-area-inset-top));
        }

        .safe-area-inset-bottom {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }

        /* Prevent horizontal scroll */
        .contractor-layout {
          overflow-x: hidden;
        }

        /* Optimize for touch */
        .contractor-layout * {
          -webkit-tap-highlight-color: transparent;
        }

        /* Focus states for accessibility */
        .contractor-layout button:focus,
        .contractor-layout a:focus,
        .contractor-layout input:focus,
        .contractor-layout select:focus,
        .contractor-layout textarea:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        /* Disabled state */
        .contractor-layout button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Loading spinner */
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
