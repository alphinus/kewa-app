'use client'

import { FileText, AlertCircle, Clock } from 'lucide-react'
import type { UserNotification } from '@/types/notifications'

interface NotificationItemProps {
  notification: UserNotification
  onMarkRead: (id: string) => void
  onNavigate: (url: string) => void
}

/**
 * Single notification item with icon, title, body, timestamp, and read status
 */
export function NotificationItem({ notification, onMarkRead, onNavigate }: NotificationItemProps) {
  const notif = notification.notification
  if (!notif) return null

  const isUnread = !notification.read_at

  function handleClick() {
    if (!notif) return
    if (isUnread) {
      onMarkRead(notif.id)
    }
    onNavigate(notif.url)
  }

  function getIcon() {
    if (!notif) return <FileText className="h-5 w-5 text-gray-600" />
    switch (notif.type) {
      case 'work_order_status':
        return <FileText className="h-5 w-5 text-blue-600" />
      case 'approval_needed':
        return <AlertCircle className="h-5 w-5 text-amber-600" />
      case 'deadline_reminder':
        return <Clock className="h-5 w-5 text-red-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  function getRelativeTime(timestamp: string): string {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'gerade eben'
    if (diffMins < 60) return `vor ${diffMins} Min.`
    if (diffHours < 24) return `vor ${diffHours} Std.`
    if (diffDays < 7) return `vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'}`

    return past.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
        isUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''
      }`}
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">{getIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-gray-100`}>
            {notif.title}
          </h4>
          {notif.urgency === 'urgent' && (
            <span className="px-1.5 py-0.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded">
              Dringend
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{notif.body}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{getRelativeTime(notif.created_at)}</p>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div className="flex-shrink-0 pt-2">
          <div className="h-2 w-2 rounded-full bg-blue-600" />
        </div>
      )}
    </div>
  )
}
