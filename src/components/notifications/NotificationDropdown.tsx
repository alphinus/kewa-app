'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NotificationItem } from './NotificationItem'
import type { UserNotification } from '@/types/notifications'

interface NotificationDropdownProps {
  notifications: UserNotification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
}

interface GroupedNotification {
  key: string
  notifications: UserNotification[]
  latest: UserNotification
  count: number
}

/**
 * Dropdown panel showing grouped notifications with mark all read and see all link
 */
export function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Group notifications by entity
  const grouped = notifications.reduce<GroupedNotification[]>((acc, notif) => {
    if (!notif.notification) return acc

    const key = `${notif.notification.entity_type}:${notif.notification.entity_id}`
    const existing = acc.find((g) => g.key === key)

    if (existing) {
      existing.notifications.push(notif)
      existing.count++
      // Keep latest
      if (new Date(notif.created_at) > new Date(existing.latest.created_at)) {
        existing.latest = notif
      }
    } else {
      acc.push({
        key,
        notifications: [notif],
        latest: notif,
        count: 1,
      })
    }

    return acc
  }, [])

  // Sort groups by latest notification
  grouped.sort((a, b) => {
    return new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  })

  // Take top 10 groups
  const displayGroups = grouped.slice(0, 10)

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Benachrichtigungen</h3>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
            Alle gelesen
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {displayGroups.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            Keine Benachrichtigungen
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {displayGroups.map((group) => {
              const notif = group.latest.notification!
              const displayTitle = group.count > 1 ? `${notif.title} - ${group.count} Aktualisierungen` : notif.title

              return (
                <NotificationItem
                  key={group.key}
                  notification={{
                    ...group.latest,
                    notification: {
                      ...notif,
                      title: displayTitle,
                    },
                  }}
                  onMarkRead={onMarkRead}
                  onNavigate={(url) => {
                    onClose()
                    window.location.href = url
                  }}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <Link
          href="/dashboard/benachrichtigungen"
          onClick={onClose}
          className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Alle anzeigen
        </Link>
      </div>
    </div>
  )
}
