-- KEWA Renovations Operations System
-- Migration: 024_magic_links.sql
-- AUTH-09: Magic link tokens for contractor portal access

-- =============================================
-- MAGIC LINK TOKENS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),

  -- Linked entities (at least one required)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,

  -- Token details
  email TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'work_order_access', 'login', 'password_reset', etc.

  -- Validity tracking
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_link_tokens(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_work_order ON magic_link_tokens(work_order_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_user ON magic_link_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_link_tokens(expires_at)
  WHERE used_at IS NULL AND is_revoked = false;

-- =============================================
-- HELPER FUNCTION: Create magic link token
-- =============================================

CREATE OR REPLACE FUNCTION create_magic_link_token(
  p_email TEXT,
  p_purpose TEXT,
  p_work_order_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 72,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_token UUID;
BEGIN
  -- Generate token and insert
  INSERT INTO magic_link_tokens (
    email,
    purpose,
    work_order_id,
    user_id,
    expires_at,
    created_by
  ) VALUES (
    p_email,
    p_purpose,
    p_work_order_id,
    p_user_id,
    NOW() + (p_expires_hours || ' hours')::INTERVAL,
    p_created_by
  )
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Validate and consume token
-- =============================================

CREATE OR REPLACE FUNCTION validate_magic_link_token(p_token UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  user_id UUID,
  work_order_id UUID,
  email TEXT,
  purpose TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_record magic_link_tokens%ROWTYPE;
BEGIN
  -- Find the token
  SELECT * INTO v_record
  FROM magic_link_tokens t
  WHERE t.token = p_token;

  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Token not found'::TEXT;
    RETURN;
  END IF;

  -- Token already used
  IF v_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Token already used'::TEXT;
    RETURN;
  END IF;

  -- Token revoked
  IF v_record.is_revoked THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Token revoked'::TEXT;
    RETURN;
  END IF;

  -- Token expired
  IF v_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 'Token expired'::TEXT;
    RETURN;
  END IF;

  -- Mark as used
  UPDATE magic_link_tokens
  SET used_at = NOW()
  WHERE token = p_token;

  -- Return valid result
  RETURN QUERY SELECT
    true,
    v_record.user_id,
    v_record.work_order_id,
    v_record.email,
    v_record.purpose,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Revoke token
-- =============================================

CREATE OR REPLACE FUNCTION revoke_magic_link_token(p_token UUID) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE magic_link_tokens
  SET is_revoked = true
  WHERE token = p_token AND used_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Revoke all tokens for work order
-- =============================================

CREATE OR REPLACE FUNCTION revoke_work_order_tokens(p_work_order_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE magic_link_tokens
  SET is_revoked = true
  WHERE work_order_id = p_work_order_id
    AND used_at IS NULL
    AND is_revoked = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CLEANUP FUNCTION: Remove expired tokens
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_magic_link_tokens() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM magic_link_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE magic_link_tokens IS 'One-time tokens for passwordless authentication';
COMMENT ON COLUMN magic_link_tokens.token IS 'Unique token for URL embedding';
COMMENT ON COLUMN magic_link_tokens.purpose IS 'Token purpose: work_order_access, login, password_reset';
COMMENT ON COLUMN magic_link_tokens.expires_at IS 'Token expiration timestamp (default 72h)';
COMMENT ON COLUMN magic_link_tokens.used_at IS 'When token was consumed (null if unused)';
COMMENT ON COLUMN magic_link_tokens.is_revoked IS 'Manually revoked tokens';

COMMENT ON FUNCTION create_magic_link_token IS 'Create a new magic link token with configurable expiry';
COMMENT ON FUNCTION validate_magic_link_token IS 'Validate and consume a token, returns validity status';
COMMENT ON FUNCTION revoke_magic_link_token IS 'Revoke a single unused token';
COMMENT ON FUNCTION revoke_work_order_tokens IS 'Revoke all tokens for a work order';
COMMENT ON FUNCTION cleanup_expired_magic_link_tokens IS 'Delete tokens expired more than 7 days ago';
