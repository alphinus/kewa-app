'use client'

import Link from 'next/link'
import {
  Archive,
  Truck,
  FileText,
  ClipboardCheck,
  FilePen,
  FileStack,
  BookOpen,
  Mic,
  Bell,
  Settings
} from 'lucide-react'
import { useEffect } from 'react'

interface MehrBottomSheetProps {
  open: boolean
  onClose: () => void
}

const MEHR_ITEMS = [
  { label: 'Projekte', icon: Archive, href: '/dashboard/projekte' },
  { label: 'Lieferanten', icon: Truck, href: '/dashboard/lieferanten' },
  { label: 'Berichte', icon: FileText, href: '/dashboard/berichte' },
  { label: 'Abnahmen', icon: ClipboardCheck, href: '/dashboard/abnahmen' },
  { label: 'Änderungsaufträge', icon: FilePen, href: '/dashboard/aenderungsauftraege' },
  { label: 'Vorlagen', icon: FileStack, href: '/dashboard/vorlagen/abnahmen' },
  { label: 'Knowledge Base', icon: BookOpen, href: '/dashboard/knowledge' },
  { label: 'Audio', icon: Mic, href: '/dashboard/audio' },
  { label: 'Benachrichtigungen', icon: Bell, href: '/dashboard/benachrichtigungen' },
  { label: 'Einstellungen', icon: Settings, href: '/dashboard/settings' }
]

export function MehrBottomSheet({ open, onClose }: MehrBottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full bg-white dark:bg-gray-900 rounded-t-2xl safe-area-bottom animate-slide-in-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Grid of items */}
        <div className="grid grid-cols-4 gap-2 p-4 pb-6">
          {MEHR_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-700 dark:text-gray-300 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
