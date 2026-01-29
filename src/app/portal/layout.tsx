import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { PortalHeader } from '@/components/portal/PortalHeader'
import { PortalNav } from '@/components/portal/PortalNav'
import { getSetting } from '@/lib/settings/queries'

export const metadata: Metadata = {
  title: 'Mieterportal',
  description: 'KEWA AG Mieterportal',
}

/**
 * Independent portal layout for tenant users
 *
 * No operator navigation or sidebar - completely separate UI from operator app
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get company name from settings
  const companyName = (await getSetting('company_name')) || 'KEWA AG'

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader companyName={companyName} />

      {/* Main content with spacing for fixed header and nav */}
      <main className="pt-14 pb-20">
        {children}
      </main>

      <PortalNav />

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
