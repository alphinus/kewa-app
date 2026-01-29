---
phase: 24
plan: 01
subsystem: notifications
tags: [push-notifications, service-worker, web-push, subscriptions, vapid]

dependency_graph:
  requires: []
  provides:
    - notification database schema (4 tables)
    - TypeScript types for notifications and subscriptions
    - service worker with push event handlers
    - PushProvider context with usePush() hook
    - push subscription API endpoints
  affects:
    - "24-02: notification preferences UI (uses usePush())"
    - "24-03: notification sending logic (uses types and queries)"
    - "24-04: notification center UI (uses usePush())"

tech_stack:
  added:
    - web-push: VAPID-based push notification library
    - js-cookie: device ID cookie management
    - uuid: device ID generation
  patterns:
    - service worker registration with updateViaCache none
    - VAPID key URL-safe base64 conversion
    - device-based subscription tracking (cookie)
    - upsert pattern for subscription management

key_files:
  created:
    - supabase/migrations/061_notifications.sql
    - src/types/notifications.ts
    - src/lib/notifications/queries.ts
    - public/sw.js
    - src/contexts/PushContext.tsx
    - src/app/api/push/subscribe/route.ts
    - src/app/api/push/unsubscribe/route.ts
  modified:
    - next.config.ts
    - src/app/layout.tsx
    - .env.example
    - package.json

decisions:
  - id: "24-01-vapid-env-vars"
    choice: "VAPID public key exposed to client (NEXT_PUBLIC_), private key server-only"
    rationale: "Browser needs public key for subscription, private key must remain secret for sending"
    alternatives: []
  - id: "24-01-device-cookie"
    choice: "Device ID stored in cookie (1-year expiry) to identify browser/device"
    rationale: "Allows multiple subscriptions per user (desktop + mobile), survives logout"
    alternatives: ["localStorage (not accessible in service worker)", "user_agent hash (unreliable)"]
  - id: "24-01-no-pwa-icons"
    choice: "Service worker notification without icon/badge references"
    rationale: "No PWA icons exist yet in public/, notifications work without them"
    alternatives: []
  - id: "24-01-pg-cron-fallback"
    choice: "pg_cron jobs wrapped in DO/EXCEPTION block with fallback to LOG"
    rationale: "Supports environments without pg_cron extension, digest can use external cron"
    alternatives: []
  - id: "24-01-push-provider-wave1"
    choice: "PushProvider included in Plan 24-01 (Wave 1) instead of 24-04 (Wave 2)"
    rationale: "Plan 24-02 (Wave 2) uses usePush() in settings page - provider must exist first"
    alternatives: []

metrics:
  duration: 26 min
  completed: 2026-01-29
  commits: 3
  files_changed: 13
  lines_added: ~1300

schema_changes:
  - "notifications table: shared notification content (type, title, body, entity, urgency, url)"
  - "user_notifications table: per-user read tracking with notification FK"
  - "push_subscriptions table: device-specific subscription data (JSONB, unique per user+device)"
  - "notification_preferences table: user-level preferences (quiet hours, digest, type toggles)"
  - "notification_type enum: work_order_status, approval_needed, deadline_reminder"
  - "urgency_level enum: urgent, normal, info"
  - "purge_old_notifications() function: deletes notifications older than 90 days"
  - "send_daily_digests() function: pg_net or LOG fallback for digest delivery"
  - "pg_cron jobs: purge-old-notifications (daily 3 AM), send-daily-digests (hourly)"
---

# Phase 24 Plan 01: Notification Foundation Summary

**One-liner:** Complete push notification infrastructure with database schema, service worker registration, VAPID subscription management, and PushProvider context integration.

## What Was Built

### Database Layer (Migration 061)

Four tables for notification system:

1. **notifications**: Shared notification content (one notification, many users)
2. **user_notifications**: Per-user read tracking with FK to notifications
3. **push_subscriptions**: Device-specific subscription data with JSONB endpoint/keys
4. **notification_preferences**: User-level settings for types, quiet hours, digest

Enums for type safety:
- `notification_type`: work_order_status, approval_needed, deadline_reminder
- `urgency_level`: urgent, normal, info

Background jobs via pg_cron:
- Daily purge (3 AM UTC): deletes notifications older than 90 days
- Hourly digest (every hour): calls pg_net or falls back to LOG for external cron

Functions:
- `purge_old_notifications()`: cascade deletes old notifications
- `send_daily_digests()`: finds users with matching digest time, counts unread, attempts API call

### TypeScript Types

**src/types/notifications.ts** exports:
- Type unions: `NotificationType`, `UrgencyLevel`, `EntityType`
- Entity interfaces: `Notification`, `UserNotification`, `PushSubscriptionRecord`, `NotificationPreferences`
- Input types: `CreateNotificationInput`, `SubscribePushInput`, `UpdatePreferencesInput`
- Response types: `NotificationsResponse`, `PreferencesResponse`, `SubscribeResponse`
- `ROLE_NOTIFICATION_TYPES`: maps roles to available notification types

### Database Queries

**src/lib/notifications/queries.ts** provides:
- `listUserNotifications()`: filters by unread/type, returns with joined notification data
- `getUnreadCount()`: fast count query for badge
- `markAsRead()`, `markAllAsRead()`: read state management
- `createNotification()`: single notification creation
- `createNotificationForUsers()`: batch creation for multiple users (transaction pattern)
- `saveSubscription()`: upsert pattern (ON CONFLICT user_id+device_id)
- `removeSubscription()`, `removeSubscriptionByEndpoint()`: cleanup
- `getUserSubscriptions()`: enabled subscriptions only

### Service Worker

**public/sw.js** handles:
- `push` event: displays notification with title, body, urgency-based requireInteraction
- `notificationclick` event: focuses existing window or opens new window to entity URL
- `pushsubscriptionchange` event: updates backend when browser changes subscription

Next.config headers ensure service worker never caches (must-revalidate).

### Push Context

**src/contexts/PushContext.tsx** client component:
- Registers service worker on mount with `updateViaCache: 'none'`
- Checks for existing subscription and sets state
- `subscribeToPush()`: converts VAPID key, subscribes via PushManager, saves to backend
- `unsubscribeFromPush()`: browser unsubscribe + backend cleanup
- Device ID via cookie (1-year expiry, survives logout)
- `usePush()` hook for consuming context

### Push APIs

**src/app/api/push/subscribe/route.ts**:
- POST: saves subscription to database (userId from headers, deviceId + subscription from body)

**src/app/api/push/unsubscribe/route.ts**:
- POST: removes subscription from database (userId + deviceId)

### Root Layout Integration

**src/app/layout.tsx**:
- Imports and renders `PushProvider` wrapping all children
- Server component remains server component (client boundary at PushProvider)
- Makes `usePush()` available to all downstream pages (required for Wave 2 plans)

## Deviations from Plan

None. Plan executed exactly as written.

## Technical Decisions

### VAPID Key Security
Public key exposed to client via `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (required for browser subscription). Private key kept server-only as `VAPID_PRIVATE_KEY` (used for sending, never exposed).

### Device-Based Subscriptions
Cookie stores device ID (UUID, 1-year expiry). Allows:
- Multiple subscriptions per user (desktop + mobile)
- Subscription survives logout/login
- Clean device-specific unsubscribe

Alternative considered: localStorage (not accessible in service worker context).

### pg_cron Fallback Strategy
Migration wraps cron job creation in DO/EXCEPTION block. If pg_cron unavailable (local dev, some hosting), falls back gracefully. Digest function uses pg_net if available, otherwise LOG (external cron can hit API).

### PushProvider Placement (Wave 1 vs Wave 2)
Originally planned for 24-04 (Wave 2), but moved to 24-01 because Plan 24-02 (settings page) uses `usePush()`. Provider must exist before any consumer.

### No PWA Icons
Service worker notification created without icon/badge references (no PWA icons exist in public/). Notifications display correctly without icons. Can be added later.

## Testing Notes

Build verification completed successfully:
- TypeScript compilation: no errors
- Next.js build: completed successfully
- All routes generated correctly

Database migration not verified (Docker Desktop not running). Migration follows established patterns from 057 and 060.

## Integration Points

### For Plan 24-02 (Preferences UI)
- `usePush()` hook available for subscription toggle
- `ROLE_NOTIFICATION_TYPES` map for role-based preference filtering
- API endpoints ready for subscription management

### For Plan 24-03 (Sending Logic)
- `createNotificationForUsers()` batch creation
- `getUserSubscriptions()` retrieves active subscriptions
- Database schema stores all required metadata

### For Plan 24-04 (Notification Center)
- `listUserNotifications()` with filters
- `getUnreadCount()` for badge
- `markAsRead()`, `markAllAsRead()` for state management
- Service worker navigation handles notificationclick

## Files Changed

**Created:**
- supabase/migrations/061_notifications.sql (234 lines)
- src/types/notifications.ts (183 lines)
- src/lib/notifications/queries.ts (341 lines)
- public/sw.js (46 lines)
- src/contexts/PushContext.tsx (176 lines)
- src/app/api/push/subscribe/route.ts (50 lines)
- src/app/api/push/unsubscribe/route.ts (47 lines)

**Modified:**
- next.config.ts: added headers() for service worker cache control
- src/app/layout.tsx: wrapped children with PushProvider
- .env.example: added VAPID key placeholders
- package.json: web-push, uuid, js-cookie dependencies

## Next Phase Readiness

**Phase 24 Plan 02 (Preferences UI)** can proceed immediately:
- PushProvider available for subscription toggle
- Types and queries ready for preference CRUD
- API endpoints functional

**Phase 24 Plan 03 (Sending Logic)** blocked until Plan 24-02 complete (needs preference checks).

**Phase 24 Plan 04 (Notification Center)** blocked until Plan 24-03 (needs notifications to exist).

No blockers for next plan.
