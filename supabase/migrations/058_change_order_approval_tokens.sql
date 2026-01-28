-- KEWA Renovations Operations System
-- Migration: 058_change_order_approval_tokens.sql
-- Purpose: Link change orders to magic link tokens for client approval portal
-- Phase: 21-change-orders, Plan: 04

-- =============================================
-- APPROVAL TOKENS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS change_order_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL REFERENCES magic_link_tokens(token) ON DELETE CASCADE,
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(token)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_co_approval_tokens_co ON change_order_approval_tokens(change_order_id);
CREATE INDEX IF NOT EXISTS idx_co_approval_tokens_token ON change_order_approval_tokens(token);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE change_order_approval_tokens IS 'Links magic link tokens to change orders for client approval portal access';
COMMENT ON COLUMN change_order_approval_tokens.token IS 'References the magic link token used for portal access';
COMMENT ON COLUMN change_order_approval_tokens.change_order_id IS 'The change order accessible via this token';
