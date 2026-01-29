import type { Metadata } from 'next'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Mieterportal',
  description: 'KEWA AG Mieterportal',
}

/**
 * Independent portal layout for tenant users
 *
 * No operator navigation or sidebar - completely separate UI from operator app
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </div>
  )
}
