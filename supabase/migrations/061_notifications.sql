-- KEWA Renovations Operations System
-- Migration: 061_notifications.sql
-- Purpose: Notification system with push subscriptions and preferences
-- Phase: 24-push-notifications, Plan: 01

-- =============================================
-- ENUMS
-- =============================================

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'work_order_status',
    'approval_needed',
    'deadline_reminder'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM (
    'urgent',
    'normal',
    'info'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
-- Notification content stored once, referenced by multiple users

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('work_order', 'invoice', 'change_order')),
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES users(id),
  urgency urgency_level NOT NULL DEFAULT 'normal',
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Notification content shared across users - single source of notification data';
COMMENT ON COLUMN notifications.entity_type IS 'Type of entity this notification relates to';
COMMENT ON COLUMN notifications.entity_id IS 'ID of the entity (work_order, invoice, change_order)';
COMMENT ON COLUMN notifications.actor_id IS 'User who triggered the notification (nullable for system events)';
COMMENT ON COLUMN notifications.url IS 'Navigation target when user clicks notification';

-- =============================================
-- USER_NOTIFICATIONS TABLE
-- =============================================
-- Per-user read tracking for notifications

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

COMMENT ON TABLE user_notifications IS 'Per-user notification delivery and read tracking';
COMMENT ON COLUMN user_notifications.read_at IS 'When user marked notification as read (NULL = unread)';

-- =============================================
-- PUSH_SUBSCRIPTIONS TABLE
-- =============================================
-- One subscription per device/browser

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  subscription_data JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

COMMENT ON TABLE push_subscriptions IS 'Browser push subscription data for web push notifications';
COMMENT ON COLUMN push_subscriptions.device_id IS 'UUID stored in browser cookie to identify device';
COMMENT ON COLUMN push_subscriptions.subscription_data IS 'Full PushSubscription object (endpoint, keys) from browser API';
COMMENT ON COLUMN push_subscriptions.last_used_at IS 'Last time this subscription was used to send a push';

-- =============================================
-- NOTIFICATION_PREFERENCES TABLE
-- =============================================
-- User-level notification preferences

CREATE TABLE IF NOT EXISTS notification_preferences (
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

COMMENT ON TABLE notification_preferences IS 'User-specific notification preferences and quiet hours';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'Start of quiet hours (no non-urgent notifications)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'End of quiet hours';
COMMENT ON COLUMN notification_preferences.digest_enabled IS 'If true, batch notifications into daily digest';
COMMENT ON COLUMN notification_preferences.digest_time IS 'Time to send daily digest summary';

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_digest ON notification_preferences(digest_time) WHERE digest_enabled = TRUE;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Purge notifications older than 90 days
CREATE OR REPLACE FUNCTION purge_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
  -- user_notifications cascade deleted via FK constraint
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purge_old_notifications() IS 'Deletes notifications older than 90 days (cascades to user_notifications)';

-- Send daily digest notifications
-- Finds users whose digest_time matches current hour in their timezone
-- Attempts to call internal API via pg_net extension (falls back to LOG if unavailable)
CREATE OR REPLACE FUNCTION send_daily_digests()
RETURNS void AS $$
DECLARE
  v_user RECORD;
  v_unread_count INTEGER;
  v_current_time_user TIME;
  v_response_id BIGINT;
BEGIN
  -- Find users whose digest time matches current hour (in their timezone)
  FOR v_user IN
    SELECT np.user_id, np.digest_time, np.timezone
    FROM notification_preferences np
    WHERE np.digest_enabled = TRUE
  LOOP
    -- Convert current UTC time to user's timezone and extract time
    v_current_time_user := (NOW() AT TIME ZONE v_user.timezone)::TIME;

    -- Check if current hour matches digest time hour
    IF EXTRACT(HOUR FROM v_current_time_user) = EXTRACT(HOUR FROM v_user.digest_time) THEN
      -- Count unread notifications for this user
      SELECT COUNT(*) INTO v_unread_count
      FROM user_notifications
      WHERE user_id = v_user.user_id AND read_at IS NULL;

      -- Only send digest if user has unread notifications
      IF v_unread_count > 0 THEN
        -- Attempt to call internal API via pg_net (if available)
        BEGIN
          -- This requires pg_net extension to be installed
          -- If not available, will be caught and logged instead
          SELECT net.http_post(
            url := 'http://localhost:3000/api/notifications/digest',
            headers := '{"Content-Type": "application/json"}'::JSONB,
            body := json_build_object(
              'userId', v_user.user_id,
              'unreadCount', v_unread_count
            )::JSONB
          ) INTO v_response_id;
        EXCEPTION
          WHEN OTHERS THEN
            -- If pg_net not available or API call fails, log for external cron pickup
            RAISE LOG 'Digest needed for user % (% unread notifications)', v_user.user_id, v_unread_count;
        END;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_daily_digests() IS 'Sends daily digest notifications to users at their configured time (via pg_net or LOG fallback)';

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at on notification preferences changes
CREATE OR REPLACE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- PG_CRON JOBS
-- =============================================
-- Wrap in DO block to handle environments without pg_cron extension

DO $$
BEGIN
  -- Purge old notifications daily at 3 AM UTC
  PERFORM cron.schedule(
    'purge-old-notifications',
    '0 3 * * *',
    $$SELECT purge_old_notifications()$$
  );

  -- Send daily digests every hour
  PERFORM cron.schedule(
    'send-daily-digests',
    '0 * * * *',
    $$SELECT send_daily_digests()$$
  );
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron extension not available - skipping cron job creation';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create cron jobs: %', SQLERRM;
END $$;
