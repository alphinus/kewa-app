# Phase 24: Push Notifications - Research

**Researched:** 2026-01-29
**Domain:** Web Push Notifications + Supabase Realtime (In-App Notifications)
**Confidence:** HIGH

## Summary

Phase 24 implements a dual-track notification system: browser push notifications via Web Push API and in-app notifications via Supabase Realtime. The CONTEXT.md decisions are locked: notification center with dropdown UI, bell icon with badge count, 90-day auto-purge, three event triggers (work order status, approvals, deadline reminders), urgency levels with quiet hours bypass, and daily digest mode.

The standard stack is `web-push` library for server-side push, Service Worker for client-side push handling, and Supabase Realtime for in-app notifications. Next.js App Router requires client component registration with proper feature detection. Database schema splits notification content (reusable templates) from user-notification-links (read status tracking).

**Primary recommendation:** Use `web-push` library with VAPID keys, store subscriptions in Supabase, implement Service Worker in `/public/sw.js`, use Supabase Realtime for in-app notification center updates, and implement pg_cron for daily digest delivery.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `web-push` | 3.6.7+ | Server-side push notification sending with VAPID authentication | De facto Node.js standard for Web Push Protocol, handles encryption/authentication automatically |
| Service Worker | Browser API | Client-side push message reception and notification display | Required by Web Push API spec, only way to receive background push events |
| Supabase Realtime | Built-in | In-app notification updates via WebSocket | Already available in project, zero additional dependencies, PostgreSQL LISTEN/NOTIFY under hood |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `uuid` | 9.0.0+ | Generate device IDs for subscription tracking | Identify unique browser/device combinations for subscription management |
| `js-cookie` | 3.0.5+ | Store device ID in browser cookie | Persist device identity across sessions for subscription validation |
| `pg_cron` | Supabase built-in | Schedule daily digest delivery | Run scheduled jobs directly in PostgreSQL for digest aggregation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `web-push` | Firebase Cloud Messaging (FCM) | FCM adds Google dependency, requires Firebase project setup, overkill for web-only push |
| Service Worker | Third-party service (OneSignal, Pusher) | Paid services add cost, vendor lock-in, unnecessary for self-hosted control |
| `pg_cron` | External cron job | External scheduler adds infrastructure complexity, pg_cron runs inside Supabase |

**Installation:**
```bash
npm install web-push uuid js-cookie
npm install -D @types/web-push @types/uuid @types/js-cookie
```

## Architecture Patterns

### Recommended Project Structure

```
app/
├── api/
│   ├── push/
│   │   ├── subscribe/route.ts          # Store push subscription
│   │   ├── unsubscribe/route.ts        # Remove push subscription
│   │   └── send/route.ts               # Send push notification (internal)
│   └── notifications/
│       ├── mark-read/route.ts          # Mark notification read
│       └── mark-all-read/route.ts      # Mark all read
├── notifications/
│   └── page.tsx                        # Full notification center page
├── components/
│   ├── NotificationBell.tsx            # Bell icon with dropdown
│   └── NotificationItem.tsx            # Single notification UI
└── contexts/
    └── PushContext.tsx                 # Service worker registration + subscription management

public/
└── sw.js                               # Service worker (push/notificationclick handlers)

supabase/
├── migrations/
│   └── XXX_notifications.sql           # Tables: notifications, user_notifications, push_subscriptions
└── functions/
    └── send-notification/              # Edge Function triggered by DB webhook
        └── index.ts
```

### Pattern 1: Service Worker Registration (Client Component)

**What:** Register service worker on mount with feature detection
**When to use:** In root layout or dedicated PushProvider component
**Example:**

```typescript
// app/contexts/PushContext.tsx
'use client'

import { createContext, useEffect, useState } from 'react'

export function PushProvider({ children }) {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  async function registerServiceWorker() {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none', // Critical: always fetch latest SW
    })
    const sub = await registration.pushManager.getSubscription()
    setSubscription(sub)
  }

  async function subscribeToPush() {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    })

    // Store subscription in Supabase
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub, deviceId: getDeviceId() }),
    })

    setSubscription(sub)
  }

  return (
    <PushContext.Provider value={{ subscription, isSupported, subscribeToPush }}>
      {children}
    </PushContext.Provider>
  )
}
```

**Source:** [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)

### Pattern 2: Service Worker Push Event Handler

**What:** Receive push message and display notification
**When to use:** In `/public/sw.js` for all push notifications
**Example:**

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json()

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag, // For grouping/replacing notifications
    data: {
      url: data.url, // URL to open on click
      notificationId: data.notificationId,
    },
    requireInteraction: data.urgency === 'urgent', // Stay visible for urgent
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})
```

**Source:** [MDN Service Worker Push Event](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/push_event), [MDN Notification Click Event](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event)

### Pattern 3: Sending Push Notifications (Server-Side)

**What:** Use `web-push` library to send notifications to subscribed devices
**When to use:** In API routes or Supabase Edge Functions when events occur
**Example:**

```typescript
// app/api/push/send/route.ts
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!, // mailto:your-email@example.com
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: Request) {
  const { userId, title, body, url, urgency } = await request.json()

  // Get user's push subscriptions from database
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription_data')
    .eq('user_id', userId)
    .eq('enabled', true)

  const payload = JSON.stringify({
    title,
    body,
    url,
    urgency,
    tag: `notification-${Date.now()}`,
  })

  const promises = subscriptions.map((sub) =>
    webpush.sendNotification(sub.subscription_data, payload, {
      urgency: urgency === 'urgent' ? 'high' : 'normal',
      TTL: 86400, // 24 hours
    }).catch((err) => {
      // Handle 410 Gone (subscription expired)
      if (err.statusCode === 410) {
        // Remove expired subscription from database
        return removeSubscription(sub.id)
      }
    })
  )

  await Promise.allSettled(promises)
  return Response.json({ success: true })
}
```

**Source:** [web-push GitHub](https://github.com/web-push-libs/web-push)

### Pattern 4: In-App Notification Center with Supabase Realtime

**What:** Real-time updates to notification list via Supabase Realtime
**When to use:** In notification center dropdown and full page
**Example:**

```typescript
// app/components/NotificationBell.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    // Load initial notifications
    loadNotifications()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
          setUnreadCount((prev) => prev + 1)
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
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          )
          if (payload.new.read_at) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function loadNotifications() {
    const { data } = await supabase
      .from('user_notifications')
      .select('*, notification:notifications(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    setNotifications(data || [])
    setUnreadCount(data?.filter((n) => !n.read_at).length || 0)
  }

  return (
    <div className="relative">
      <button className="relative">
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {/* Dropdown with notifications */}
    </div>
  )
}
```

**Source:** [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime), [MakerKit Real-Time Notifications Tutorial](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs)

### Pattern 5: Database Schema (Split Content from User Links)

**What:** Separate notification content (reusable templates) from per-user delivery tracking
**When to use:** Designing notification database schema
**Example:**

```sql
-- Notification content (stored once, referenced many times)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'work_order_status', 'approval_needed', 'deadline_reminder'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'work_order', 'invoice', 'change_order'
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES users(id), -- Who triggered this notification
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('urgent', 'normal', 'info')),
  url TEXT NOT NULL, -- Where to navigate on click
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification tracking (one per user, per notification)
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_read_at ON user_notifications(read_at) WHERE read_at IS NULL;

-- Push subscriptions (one per device/browser)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL, -- UUID stored in cookie
  subscription_data JSONB NOT NULL, -- Full PushSubscription object (endpoint, keys)
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Notification preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  work_order_status_enabled BOOLEAN DEFAULT TRUE,
  approval_needed_enabled BOOLEAN DEFAULT TRUE,
  deadline_reminder_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  timezone TEXT DEFAULT 'Europe/Zurich',
  digest_enabled BOOLEAN DEFAULT FALSE,
  digest_time TIME DEFAULT '08:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-purge old notifications (90 days)
CREATE OR REPLACE FUNCTION purge_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule purge with pg_cron (run daily at 3 AM)
SELECT cron.schedule(
  'purge-old-notifications',
  '0 3 * * *',
  $$SELECT purge_old_notifications()$$
);
```

**Source:** [Scalable Notification System Design (DEV Community)](https://dev.to/ndohjapan/scalable-notification-system-design-for-50-million-users-database-design-4cl), [Building Scalable Notifications (Medium, Jan 2026)](https://medium.com/@aboud-khalaf/building-scalable-notifications-a-journey-to-the-perfect-database-design-part-1-a7818edad0ba)

### Pattern 6: Quiet Hours + Urgency Bypass

**What:** Check quiet hours before sending, but bypass for urgent notifications
**When to use:** In notification sending logic (API route or Edge Function)
**Example:**

```typescript
async function shouldSendNotification(
  userId: string,
  urgency: 'urgent' | 'normal' | 'info'
): Promise<boolean> {
  // Urgent always sends (bypasses quiet hours)
  if (urgency === 'urgent') return true

  // Get user preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('quiet_hours_start, quiet_hours_end, timezone')
    .eq('user_id', userId)
    .single()

  if (!prefs) return true // No preferences = send

  // Check if current time in user's timezone is within quiet hours
  const now = new Date().toLocaleString('en-US', { timeZone: prefs.timezone })
  const currentTime = new Date(now).toTimeString().slice(0, 5) // "HH:MM"

  const isQuietHours =
    currentTime >= prefs.quiet_hours_start || currentTime < prefs.quiet_hours_end

  return !isQuietHours
}
```

**Source:** [Push Notification Best Practices 2026 (Reteno)](https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026), [Appbot Push Notification Best Practices 2026](https://appbot.co/blog/app-push-notifications-2026-best-practices/)

### Pattern 7: Daily Digest with pg_cron

**What:** Aggregate unread notifications and send single digest push at scheduled time
**When to use:** When user enables digest mode in preferences
**Example:**

```sql
-- Daily digest function
CREATE OR REPLACE FUNCTION send_daily_digests()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  unread_count INTEGER;
BEGIN
  FOR user_record IN
    SELECT user_id, digest_time, timezone
    FROM notification_preferences
    WHERE digest_enabled = TRUE
  LOOP
    -- Count unread notifications
    SELECT COUNT(*) INTO unread_count
    FROM user_notifications
    WHERE user_id = user_record.user_id AND read_at IS NULL;

    IF unread_count > 0 THEN
      -- Send digest notification (call API route or Edge Function)
      PERFORM net.http_post(
        url := 'https://your-app.com/api/push/send-digest',
        body := json_build_object(
          'userId', user_record.user_id,
          'unreadCount', unread_count
        )::text
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule digest delivery (runs every hour, checks user's digest_time)
SELECT cron.schedule(
  'send-daily-digests',
  '0 * * * *', -- Every hour
  $$SELECT send_daily_digests()$$
);
```

**Source:** [Supabase Cron](https://supabase.com/modules/cron), [pg_cron GitHub](https://github.com/citusdata/pg_cron)

### Anti-Patterns to Avoid

- **Storing VAPID private key in client-side code:** Private key must stay server-side only (API routes, Edge Functions, env vars). Public key is safe to expose.
- **Not handling 410 Gone errors:** Push subscriptions expire when users revoke permissions or reinstall browsers. Always remove expired subscriptions on 410 response.
- **Sending notifications without checking preferences:** Always validate user has enabled the notification type before sending.
- **Manual notification deletion:** Use auto-purge with pg_cron instead of requiring users to delete old notifications.
- **Single "enable all notifications" toggle:** Provide granular controls per notification type (work orders, approvals, deadlines) as specified in CONTEXT.md decisions.
- **Not using notification tags:** Use `tag` property to replace previous notifications (e.g., "Work Order #42 updated" replaces older "Work Order #42" notifications).
- **Polling for in-app notifications:** Use Supabase Realtime subscriptions instead of polling database for updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Web Push Protocol encryption | Custom VAPID signing and payload encryption | `web-push` library | RFC 8292 compliance, automatic encryption with p256dh/auth keys, error-prone to implement |
| Service Worker registration | Custom SW lifecycle management | Browser's `navigator.serviceWorker.register()` | Standard API handles updates, activation, scope, caching policies |
| Real-time in-app updates | WebSocket server or polling | Supabase Realtime | Already available, PostgreSQL LISTEN/NOTIFY, automatic reconnection, minimal latency |
| Scheduled digest delivery | External cron job or background workers | pg_cron extension | Runs inside Supabase PostgreSQL, no external infrastructure, transactional consistency |
| VAPID key generation | Custom elliptic curve key pair generation | `web-push generateVAPIDKeys()` | CLI command or library method, guaranteed RFC 8292 compliance |
| Notification grouping UI | Custom dropdown with virtualization | Standard dropdown + Supabase pagination | 10 notifications in dropdown, "See all" link to full page, good enough for expected volume |

**Key insight:** Web Push API has complex encryption requirements (ECDH key exchange, AES-GCM payload encryption, JWT signing). The `web-push` library handles this correctly per RFC 8292. Custom implementations miss edge cases like subscription renewal via `pushsubscriptionchange` event, TTL handling, and urgency levels.

## Common Pitfalls

### Pitfall 1: Service Worker Cache Prevents Updates

**What goes wrong:** Service worker is cached by browser, updates don't deploy, users stuck on old SW version with broken push handlers.

**Why it happens:** Default browser caching behavior caches `/sw.js` like any other static file. Next.js may serve it with `Cache-Control: public, max-age=31536000`.

**How to avoid:**
- Set `updateViaCache: 'none'` in service worker registration options
- Add custom headers in `next.config.js` for `/sw.js` route:
  ```js
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  }
  ```

**Warning signs:** Push notifications stop working after deployment, service worker version in DevTools doesn't match deployed code, users report old notification behavior.

**Source:** [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [LogRocket Service Workers in Next.js](https://blog.logrocket.com/implementing-service-workers-next-js/)

### Pitfall 2: Notification Fatigue from Lack of Grouping

**What goes wrong:** Users receive 5 separate push notifications for the same work order, turn off all notifications, system becomes useless.

**Why it happens:** Each event (status change, comment, update) triggers separate push notification without consolidation.

**How to avoid:**
- Use notification `tag` property to replace previous notifications for same entity:
  ```javascript
  const options = {
    tag: `work-order-${workOrderId}`, // Replaces previous notification with same tag
    body: `Work Order #${workOrderNumber} - ${latestEvent}`,
    renotify: true, // Notify user even if replacing existing notification
  }
  ```
- Group by entity in in-app notification center (as specified in CONTEXT.md): "Arbeitsauftrag #42 — 3 Aktualisierungen"
- Implement digest mode for non-urgent notifications

**Warning signs:** User complaints about too many notifications, high unsubscribe rate, low notification click-through rate.

**Source:** [Push Notification Best Practices 2026 (Reteno)](https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026), [Android Notification Grouping](https://developer.android.com/develop/ui/views/notifications/group)

### Pitfall 3: Expired Subscriptions Not Removed

**What goes wrong:** Database accumulates dead subscriptions (users revoked permission, reinstalled browser), sending notifications fails silently, performance degrades.

**Why it happens:** `webpush.sendNotification()` returns 410 Gone for expired subscriptions but code doesn't handle it.

**How to avoid:**
- Catch 410 errors and remove subscription from database:
  ```typescript
  try {
    await webpush.sendNotification(subscription, payload)
  } catch (err) {
    if (err.statusCode === 410) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscriptionId)
    }
  }
  ```
- Implement `pushsubscriptionchange` event in service worker to update subscription:
  ```javascript
  self.addEventListener('pushsubscriptionchange', async (event) => {
    const newSubscription = await event.newSubscription
    // Update subscription in database
    await fetch('/api/push/update-subscription', {
      method: 'POST',
      body: JSON.stringify({ oldEndpoint: event.oldSubscription.endpoint, newSubscription }),
    })
  })
  ```

**Warning signs:** Growing `push_subscriptions` table size, increasing failed send attempts, 410 errors in logs.

**Source:** [Web Push Error 410 (Pushpad)](https://pushpad.xyz/blog/web-push-error-410-the-push-subscription-has-expired-or-the-user-has-unsubscribed), [Push Subscription Management Recipe (ServiceWorker Cookbook)](https://serviceworke.rs/push-subscription-management.html)

### Pitfall 4: VAPID Keys Exposed in Client Code

**What goes wrong:** Private VAPID key committed to repo or exposed in browser, attackers can send fake notifications impersonating your app.

**Why it happens:** Confusion about which key is public (safe to expose) vs private (must stay secret).

**How to avoid:**
- ONLY expose public key in client environment variables:
  ```bash
  # .env.local
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNxT...  # Safe to expose
  VAPID_PRIVATE_KEY=dGhpc2lzc2VjcmV0  # NEVER expose (no NEXT_PUBLIC_)
  VAPID_SUBJECT=mailto:you@example.com
  ```
- Use private key ONLY in server-side code (API routes, Server Actions, Edge Functions)
- Store private key in Vercel environment variables for production
- Add `VAPID_PRIVATE_KEY` to `.gitignore` patterns if storing in separate file
- Use secrets manager (Vercel Secrets, Doppler) instead of plain env vars for enhanced security

**Warning signs:** Private key visible in browser DevTools Network tab, private key in git history, anyone can send notifications to your users.

**Source:** [Are Environment Variables Still Safe for Secrets in 2026? (Security Boulevard)](https://securityboulevard.com/2025/12/are-environment-variables-still-safe-for-secrets-in-2026/), [GitGuardian VAPID Key Detection](https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/specifics/vapid_key)

### Pitfall 5: Ignoring Urgency Bypass for Quiet Hours

**What goes wrong:** Urgent approval notifications are blocked during quiet hours, critical deadlines missed, users angry they weren't notified immediately.

**Why it happens:** Quiet hours logic applied uniformly to all notification types without considering urgency.

**How to avoid:**
- Check urgency BEFORE checking quiet hours:
  ```typescript
  if (urgency === 'urgent') {
    // Skip quiet hours check, send immediately
    await sendPushNotification(userId, payload)
  } else {
    // Check quiet hours for normal notifications
    if (await isWithinQuietHours(userId)) {
      // Queue for delivery after quiet hours end
      await queueNotification(userId, payload)
    } else {
      await sendPushNotification(userId, payload)
    }
  }
  ```
- Set `requireInteraction: true` for urgent notifications (won't auto-dismiss)
- Use high urgency level in web-push options: `urgency: 'high'`

**Warning signs:** Complaints about missed urgent notifications, approvals delayed, users disable quiet hours entirely.

**Source:** [PagerDuty Dynamic Notifications](https://support.pagerduty.com/main/docs/dynamic-notifications), [Rootly Alert Urgency](https://docs.rootly.com/alerts/alert-urgency)

### Pitfall 6: Not Testing on iOS PWA

**What goes wrong:** Push notifications work on desktop and Android, but fail silently on iOS, users complain "notifications don't work".

**Why it happens:** iOS only supports push notifications for apps installed to home screen (PWA mode). Browser tab notifications not supported.

**How to avoid:**
- Detect iOS and prompt user to "Add to Home Screen" before enabling notifications:
  ```typescript
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  if (isIOS && !isStandalone) {
    // Show "Add to Home Screen" instructions
    showInstallInstructions()
  } else if ('PushManager' in window) {
    // Enable push notifications
    enablePushNotifications()
  }
  ```
- Provide web app manifest (`app/manifest.ts`) for PWA installation
- Test push notifications on actual iOS device in standalone mode (simulator doesn't support push)
- Require iOS 16.4+ (first version with Web Push support)

**Warning signs:** iOS users report notifications don't work, push permission never requested on iOS, subscription fails on iPhone.

**Source:** [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [Next.js 16 PWA Tutorial](https://www.buildwithmatija.com/blog/turn-nextjs-16-app-into-pwa)

## Code Examples

Verified patterns from official sources:

### VAPID Key Generation

```bash
# Generate once, store in environment variables
npx web-push generate-vapid-keys

# Output:
# =======================================
# Public Key:
# BNxT8Ks0...
#
# Private Key:
# dGhpc2lzc2VjcmV0...
# =======================================
```

**Source:** [web-push npm](https://www.npmjs.com/package/web-push)

### urlBase64ToUint8Array Utility

```typescript
// Required to convert VAPID public key for subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
```

**Source:** [Push Notifications in Next.js with Web-Push (Designly)](https://blog.designly.biz/push-notifications-in-next-js-with-web-push-a-provider-free-solution)

### Subscription Object Structure

```typescript
// PushSubscription object shape (store in database as JSONB)
interface PushSubscriptionJSON {
  endpoint: string // 'https://fcm.googleapis.com/fcm/send/...'
  keys: {
    p256dh: string // Public key for encryption
    auth: string   // Authentication secret
  }
}

// Example:
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/abc123...",
  "keys": {
    "p256dh": "BCk-QqERU0q-CfYZjcuB6lnyyOYfJ2AifKqfeHm...",
    "auth": "kJqFDTQsLRZKZo3YaS-q0g"
  }
}
```

**Source:** [MDN PushSubscription](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription)

### Supabase Edge Function for Push (Alternative to API Routes)

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

serve(async (req) => {
  const { userId, title, body, url, urgency } = await req.json()

  // Get subscriptions from Supabase (using service role key)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const response = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&enabled=eq.true`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  )
  const subscriptions = await response.json()

  const payload = JSON.stringify({ title, body, url, urgency })

  await Promise.allSettled(
    subscriptions.map((sub: any) =>
      webpush.sendNotification(sub.subscription_data, payload)
    )
  )

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

**Source:** [Supabase Edge Functions Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firebase Cloud Messaging required | Native Web Push API with VAPID | 2020 (Safari added support) | No Google dependency, works on all modern browsers including iOS 16.4+ |
| Polling for in-app notifications | Supabase Realtime (WebSocket) | 2021 (Supabase Realtime GA) | Real-time updates, no polling overhead, minimal latency |
| Workbox for service worker management | Manual service worker with updateViaCache: 'none' | 2023 (Next.js App Router) | Simpler, fewer dependencies, better Next.js integration |
| External cron for scheduled jobs | pg_cron extension | 2024 (Supabase added pg_cron) | Runs inside database, transactional consistency, no external infrastructure |
| All-or-nothing notification permission | Granular per-type preferences | 2025-2026 UX trend | Higher opt-in rates, less notification fatigue |

**Deprecated/outdated:**
- **OneSignal/Pusher for web push:** Unnecessary for self-hosted control with `web-push` library. Use only if you need advanced features like A/B testing, analytics dashboard.
- **next-pwa package:** Maintenance declined, Next.js 15+ official PWA guide recommends manual service worker setup.
- **GCM (Google Cloud Messaging):** Replaced by FCM, but both unnecessary for web-only push with VAPID.
- **Environment variables for secrets:** Still baseline, but 2026 best practice is secrets manager (Doppler, Vercel Secrets) for production.

## Open Questions

### 1. iOS Push Notification Reliability in Standalone Mode

**What we know:** iOS 16.4+ supports Web Push for PWAs installed to home screen. Safari in-browser does not support push notifications.

**What's unclear:** Real-world reliability on iOS (delivery rate, latency, battery impact) compared to native iOS push. Limited production data available.

**Recommendation:** Plan for iOS testing phase after MVP. Provide "Add to Home Screen" instructions for iOS users. Monitor delivery metrics separately for iOS vs other platforms.

### 2. Notification Grouping Strategy Scalability

**What we know:** CONTEXT.md specifies grouping by entity ("Arbeitsauftrag #42 — 3 Aktualisierungen"). Browser supports notification `tag` property to replace previous notifications.

**What's unclear:** Whether browser notification grouping (tag-based replacement) vs in-app grouping (display logic) is sufficient for scale. If user has 20 work orders with updates, do they get 20 browser notifications with separate tags?

**Recommendation:** Start with tag-based replacement per entity (work order, invoice). If volume grows, add server-side batching: delay notifications 5 minutes, group multiple entity updates into single "You have 5 updates" notification linking to notification center.

### 3. pg_cron Reliability for Daily Digest

**What we know:** pg_cron runs inside Supabase PostgreSQL, schedules jobs via cron syntax, handles failures with job_run_details logging.

**What's unclear:** Supabase-hosted pg_cron reliability (does it guarantee execution?), retry behavior on failure, timezone handling for digest_time.

**Recommendation:** Start with pg_cron for MVP (zero infrastructure). Monitor `cron.job_run_details` for failures. If reliability issues surface, migrate digest sending to Vercel Cron Jobs (guaranteed execution, better observability). Store digest_time in user's timezone, convert to UTC for scheduling.

## Sources

### Primary (HIGH confidence)

- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) - Official Next.js App Router PWA implementation
- [MDN Service Worker Push Event](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/push_event) - Web Push API specification
- [MDN Notification Click Event](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event) - Notification click handling
- [web-push GitHub](https://github.com/web-push-libs/web-push) - Official web-push library documentation
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime) - Supabase Realtime PostgreSQL changes
- [Supabase Edge Functions Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications) - Official Supabase push guide
- [pg_cron GitHub](https://github.com/citusdata/pg_cron) - PostgreSQL cron extension
- [Supabase Cron](https://supabase.com/modules/cron) - Supabase pg_cron integration

### Secondary (MEDIUM confidence)

- [Push Notifications in Next.js with Web-Push (Designly)](https://blog.designly.biz/push-notifications-in-next-js-with-web-push-a-provider-free-solution) - Complete Next.js implementation tutorial
- [MakerKit Real-Time Notifications Tutorial](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs) - Supabase Realtime notification center
- [Scalable Notification System Design (DEV Community)](https://dev.to/ndohjapan/scalable-notification-system-design-for-50-million-users-database-design-4cl) - Database schema patterns
- [Building Scalable Notifications (Medium, Jan 2026)](https://medium.com/@aboud-khalaf/building-scalable-notifications-a-journey-to-the-perfect-database-design-part-1-a7818edad0ba) - Recent notification DB design patterns
- [Push Notification Best Practices 2026 (Reteno)](https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026) - Quiet hours, timing, personalization
- [Appbot Push Notification Best Practices 2026](https://appbot.co/blog/app-push-notifications-2026-best-practices/) - Common mistakes, urgency handling
- [Next.js 16 PWA Tutorial](https://www.buildwithmatija.com/blog/turn-nextjs-16-app-into-pwa) - Recent Next.js 16 PWA implementation
- [LogRocket Service Workers in Next.js](https://blog.logrocket.com/implementing-service-workers-next-js/) - Service worker integration patterns
- [Android Notification Grouping](https://developer.android.com/develop/ui/views/notifications/group) - Notification grouping patterns
- [Web Push Error 410 (Pushpad)](https://pushpad.xyz/blog/web-push-error-410-the-push-subscription-has-expired-or-the-user-has-unsubscribed) - Subscription expiry handling
- [Push Subscription Management Recipe (ServiceWorker Cookbook)](https://serviceworke.rs/push-subscription-management.html) - pushsubscriptionchange event
- [PagerDuty Dynamic Notifications](https://support.pagerduty.com/main/docs/dynamic-notifications) - Urgency-based notification routing
- [Rootly Alert Urgency](https://docs.rootly.com/alerts/alert-urgency) - Urgency bypass for Do Not Disturb

### Tertiary (LOW confidence)

- [Are Environment Variables Still Safe for Secrets in 2026? (Security Boulevard)](https://securityboulevard.com/2025/12/are-environment-variables-still-safe-for-secrets-in-2026/) - Secrets management evolution (single source, needs verification)
- [GitGuardian VAPID Key Detection](https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/specifics/vapid_key) - VAPID key security (vendor-specific guidance)
- [Novu Digest Feature](https://novu.co/digest/) - Third-party digest implementation example (not using in project)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `web-push`, Service Worker, Supabase Realtime are verified standards with official documentation
- Architecture patterns: HIGH - Patterns verified from MDN, Next.js official guide, Supabase docs, recent 2026 tutorials
- Database schema: MEDIUM - Design patterns from multiple sources (DEV Community, Medium) converge on split content/user-links model
- Pitfalls: HIGH - Common issues documented in official sources (MDN, Supabase), best practices from 2026 industry guides
- Quiet hours/urgency: MEDIUM - Pattern verified across multiple notification platforms (PagerDuty, Rootly, Pushsafer), but project-specific implementation
- Daily digest with pg_cron: MEDIUM - pg_cron documented by Supabase, but digest implementation pattern is extrapolated from general cron usage

**Research date:** 2026-01-29
**Valid until:** ~30 days (stable technology, but Next.js/Supabase updates quarterly)
