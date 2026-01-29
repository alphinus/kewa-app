'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NotificationDropdown } from './NotificationDropdown'
import type { UserNotification, NotificationsResponse } from '@/types/notifications'

interface NotificationBellProps {
  userId: string
}

/**
 * Bell icon with unread badge and dropdown panel
 * Subscribes to Supabase Realtime for live updates
 */
export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Fetch initial notifications
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications?limit=10', {
          headers: {
            'x-user-id': userId,
          },
        })

        if (response.ok) {
          const data: NotificationsResponse = await response.json()
          setNotifications(data.notifications)
          setUnreadCount(data.unread_count)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchNotifications()

    // Subscribe to Realtime updates
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch the full notification details
          const response = await fetch(`/api/notifications?limit=1&offset=0`, {
            headers: {
              'x-user-id': userId,
            },
          })

          if (response.ok) {
            const data: NotificationsResponse = await response.json()
            if (data.notifications.length > 0) {
              const newNotif = data.notifications[0]
              setNotifications((prev) => [newNotif, ...prev])
              setUnreadCount((prev) => prev + 1)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as any
          if (updated.read_at) {
            // Notification marked as read
            setNotifications((prev) =>
              prev.map((n) => (n.notification_id === updated.notification_id ? { ...n, read_at: updated.read_at } : n))
            )
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function handleMarkRead(notificationId: string) {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ notificationId }),
      })

      if (response.ok) {
        const now = new Date().toISOString()
        setNotifications((prev) =>
          prev.map((n) => (n.notification && n.notification.id === notificationId ? { ...n, read_at: now } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  async function handleMarkAllRead() {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      })

      if (response.ok) {
        const now = new Date().toISOString()
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: now })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  function handleNavigate(url: string) {
    window.location.href = url
  }

  const badgeCount = unreadCount > 9 ? '9+' : unreadCount.toString()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        aria-label="Benachrichtigungen"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 min-w-[20px] px-1 flex items-center justify-center text-xs font-bold text-white bg-red-600 rounded-full">
            {badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
