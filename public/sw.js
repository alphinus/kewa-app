/**
 * KEWA Service Worker
 * Handles push notifications and notification click events
 * Phase: 24-push-notifications
 */

// Push event: display notification
self.addEventListener('push', (event) => {
  const data = event.data.json()
  const options = {
    body: data.body,
    tag: data.tag || `notification-${Date.now()}`,
    data: { url: data.url, notificationId: data.notificationId },
    requireInteraction: data.urgency === 'urgent',
    renotify: true,
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click: navigate to entity URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// Subscription change: update backend
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: event.newSubscription,
        oldEndpoint: event.oldSubscription?.endpoint,
      }),
    })
  )
})
