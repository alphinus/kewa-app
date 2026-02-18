'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  CheckSquare,
  Landmark,
  Banknote,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MehrBottomSheet } from './MehrBottomSheet'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

// 4 primary navigation items for all internal users
const internalNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Übersicht', icon: LayoutDashboard },
  { href: '/dashboard/objekte', label: 'Objekte', icon: Landmark },
  { href: '/dashboard/aufgaben', label: 'Aufgaben', icon: CheckSquare },
  { href: '/dashboard/kosten', label: 'Kosten', icon: Banknote }
]

// Routes accessible via Mehr bottom sheet (for active state detection)
const MEHR_ROUTES = [
  '/dashboard/projekte',
  '/dashboard/lieferanten',
  '/dashboard/berichte',
  '/dashboard/abnahmen',
  '/dashboard/aenderungsauftraege',
  '/dashboard/vorlagen',
  '/dashboard/knowledge',
  '/dashboard/audio',
  '/dashboard/benachrichtigungen',
  '/dashboard/settings'
]

interface MobileNavProps {
  isInternal?: boolean
}

/**
 * Bottom navigation bar for mobile devices.
 * All internal users see 5 items: 4 primary links + Mehr button.
 * Mehr button opens a bottom sheet with 10 overflow navigation items.
 * Touch targets: min 48px height per item.
 */
export function MobileNav({ isInternal }: MobileNavProps) {
  const pathname = usePathname()
  const [mehrOpen, setMehrOpen] = useState(false)

  if (!isInternal) return null

  const isMehrActive = MEHR_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  ) || mehrOpen

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {internalNavItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'min-h-[48px] min-w-[48px] px-3 py-2',
                  'flex-1',
                  'text-xs font-medium transition-colors duration-200',
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
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--brand-primary)] rounded-full" />
                )}
              </Link>
            )
          })}

          {/* Mehr button — 5th nav item */}
          <button
            onClick={() => setMehrOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center',
              'min-h-[48px] min-w-[48px] px-3 py-2',
              'flex-1',
              'text-xs font-medium transition-colors duration-200',
              isMehrActive
                ? 'text-[var(--brand-primary)]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            <Menu
              className={cn(
                'h-6 w-6 mb-1',
                isMehrActive && 'text-[var(--brand-primary)]'
              )}
            />
            <span>Mehr</span>
            {isMehrActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--brand-primary)] rounded-full" />
            )}
          </button>
        </div>
      </nav>

      <MehrBottomSheet open={mehrOpen} onClose={() => setMehrOpen(false)} />
    </>
  )
}
