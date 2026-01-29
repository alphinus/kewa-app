'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Ticket, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Portal bottom navigation bar
 * Mobile tab bar pattern with 3 tabs
 */
export function PortalNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/portal', label: 'Dashboard', icon: Home },
    { href: '/portal/tickets', label: 'Tickets', icon: Ticket },
    { href: '/portal/settings', label: 'Einstellungen', icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === '/portal/tickets' && pathname?.startsWith('/portal/tickets'))
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-1',
                'min-h-[48px] transition-colors',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
