/**
 * Email Sending Helper
 *
 * Fire-and-forget email sending with error handling.
 * Uses Resend for email delivery.
 *
 * Phase 29: Tenant Extras & UX
 */

import { resend } from './client'
import type { ReactElement } from 'react'

// =============================================
// TYPES
// =============================================

interface SendEmailParams {
  to: string
  subject: string
  react: ReactElement
}

interface SendEmailResult {
  success: boolean
  error?: string
  emailId?: string
}

// =============================================
// CONFIG
// =============================================

const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL || 'KEWA Support <support@kewa.app>'

// =============================================
// SEND EMAIL
// =============================================

/**
 * Send an email using Resend
 *
 * Fire-and-forget pattern: logs errors but never throws.
 * Returns result object with success/error status.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: SendEmailParams): Promise<SendEmailResult> {
  // Check for API key
  if (!process.env.RESEND_API_KEY) {
    console.warn('Email not sent: RESEND_API_KEY not configured')
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      react,
    })

    if (error) {
      console.error('Resend API error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      emailId: data?.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Email send failed:', errorMessage)
    return {
      success: false,
      error: errorMessage,
    }
  }
}
