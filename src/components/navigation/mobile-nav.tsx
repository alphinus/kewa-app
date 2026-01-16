'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  Mic,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

// Navigation items for KEWA AG (admin role)
const kewaNavItems: NavItem[] = [
  { href: '/', label: 'Uebersicht', icon: LayoutDashboard },
  { href: '/buildings', label: 'Gebaeude', icon: Building2 },
  { href: '/tasks', label: 'Aufgaben', icon: CheckSquare },
  { href: '/audio', label: 'Audio', icon: Mic },
  { href: '/settings', label: 'Einstellungen', icon: Settings }
]

// Navigation items for Imeri (worker role)
const imeriNavItems: NavItem[] = [
  { href: '/tasks', label: 'Aufgaben', icon: CheckSquare },
  { href: '/audio', label: 'Audio', icon: Mic }
]

interface MobileNavProps {
  role?: Role
}

/**
 * Bottom navigation bar for mobile devices
 * Role-based items: KEWA AG sees 5 items, Imeri sees 2
 * Touch targets: min 48px height per item
 */
export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname()

  // Select navigation items based on role
  const navItems = role === 'kewa' ? kewaNavItems : imeriNavItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // Touch target: full height, flex container
                'flex flex-col items-center justify-center',
                'min-h-[48px] min-w-[48px] px-3 py-2',
                // Flex grow to fill available space evenly
                'flex-1',
                // Text and transition
                'text-xs font-medium transition-colors duration-200',
                // Active/inactive states
                isActive
                  ? 'text-[var(--brand-primary)]'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <Icon
                className={cn(
                  'h-6 w-6 mb-1',
                  isActive && 'text-[var(--brand-primary)]'
                )}
              />
              <span>{item.label}</span>
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--brand-primary)] rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
