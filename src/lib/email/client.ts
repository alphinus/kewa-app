/**
 * Resend Email Client
 *
 * Singleton client for sending emails via Resend API.
 * Handles missing API key gracefully without crashing.
 *
 * Phase 29: Tenant Extras & UX
 */

import { Resend } from 'resend'

// Log warning if API key is missing but don't crash
if (!process.env.RESEND_API_KEY) {
  console.warn(
    'RESEND_API_KEY not configured. Email sending will be disabled. ' +
      'Set RESEND_API_KEY in environment variables to enable email notifications.'
  )
}

/**
 * Resend client singleton
 *
 * Initialized with API key from environment.
 * Will fail gracefully on send if key is missing.
 */
export const resend = new Resend(process.env.RESEND_API_KEY || '')
