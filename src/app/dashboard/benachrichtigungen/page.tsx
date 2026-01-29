'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { UserNotification, NotificationsResponse, NotificationType } from '@/types/notifications'

interface GroupedNotification {
  key: string
  notifications: UserNotification[]
  latest: UserNotification
  count: number
}

/**
 * Full notification center page with filters and pagination
 */
export default function NotificationsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [offset, setOffset] = useState(0)
  const limit = 20

  // Get userId from session
  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  // Fetch notifications when filters or userId change
  useEffect(() => {
    if (!userId) return

    async function fetchNotifications() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        })

        if (typeFilter !== 'all') {
          params.set('type', typeFilter)
        }

        if (readFilter === 'unread') {
          params.set('unread_only', 'true')
        } else if (readFilter === 'read') {
          // Fetch all and filter client-side (API doesn't have read_only param)
        }

        const response = await fetch(`/api/notifications?${params.toString()}`, {
          headers: {
            'x-user-id': userId,
          },
        })

        if (response.ok) {
          const data: NotificationsResponse = await response.json()

          // Apply read filter client-side
          let filtered = data.notifications
          if (readFilter === 'read') {
            filtered = data.notifications.filter((n) => n.read_at !== null)
          }

          setNotifications(filtered)
          setTotal(data.total)
          setUnreadCount(data.unread_count)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [userId, typeFilter, readFilter, offset])

  // Subscribe to Realtime updates
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          // Re-fetch to get latest
          setOffset(0)
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
    if (!userId) return

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
    if (!userId) return

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
    router.push(url)
  }

  function handleLoadMore() {
    setOffset((prev) => prev + limit)
  }

  // Group notifications by entity
  const grouped = notifications.reduce<GroupedNotification[]>((acc, notif) => {
    if (!notif.notification) return acc

    const key = `${notif.notification.entity_type}:${notif.notification.entity_id}`
    const existing = acc.find((g) => g.key === key)

    if (existing) {
      existing.notifications.push(notif)
      existing.count++
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Benachrichtigungen</h1>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline">
            Alle gelesen
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Typ
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any)
              setOffset(0)
            }}
            className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">Alle</option>
            <option value="work_order_status">Arbeitsauftrag-Status</option>
            <option value="approval_needed">Genehmigungen</option>
            <option value="deadline_reminder">Frist-Erinnerungen</option>
          </select>
        </div>

        <div>
          <label htmlFor="read-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            id="read-filter"
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value as any)
              setOffset(0)
            }}
            className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">Alle</option>
            <option value="unread">Ungelesen</option>
            <option value="read">Gelesen</option>
          </select>
        </div>
      </div>

      {/* Notification list */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">Lädt...</div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">Keine Benachrichtigungen</p>
            <p className="text-sm mt-1">
              {readFilter === 'unread'
                ? 'Alle Benachrichtigungen wurden gelesen.'
                : 'Benachrichtigungen erscheinen hier, sobald es Neuigkeiten gibt.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {grouped.map((group) => {
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
                  onMarkRead={handleMarkRead}
                  onNavigate={handleNavigate}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Load more */}
      {notifications.length < total && (
        <div className="flex justify-center mt-6">
          <Button onClick={handleLoadMore} variant="outline" disabled={loading}>
            {loading ? 'Lädt...' : 'Mehr laden'}
          </Button>
        </div>
      )}
    </div>
  )
}
