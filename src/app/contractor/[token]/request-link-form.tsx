'use client'

/**
 * Request Link Form Component
 *
 * Shown when contractor's token is expired or work order is closed.
 * Allows contractor to request a new access link from KEWA.
 *
 * Features:
 * - Email input for contact
 * - Submit creates audit log entry for KEWA to follow up
 * - Confirmation message after submit
 */

import { useState } from 'react'

interface RequestLinkFormProps {
  error: 'expired' | 'work_order_closed'
}

export default function RequestLinkForm({ error }: RequestLinkFormProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/contractor/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      setIsSubmitted(true)
    } catch {
      setSubmitError('Anfrage fehlgeschlagen. Bitte versuchen Sie es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const errorConfig = {
    expired: {
      title: 'Link abgelaufen',
      message:
        'Dieser Zugangslink ist abgelaufen. Bitte fordern Sie einen neuen Link an.',
      icon: (
        <svg
          className="w-16 h-16 text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    work_order_closed: {
      title: 'Auftrag abgeschlossen',
      message:
        'Dieser Arbeitsauftrag wurde abgeschlossen. Wenn Sie weitere Informationen benoetigen, kontaktieren Sie uns.',
      icon: (
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  }

  const config = errorConfig[error]

  // Success state after submission
  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <svg
          className="w-16 h-16 text-green-500 mb-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Anfrage gesendet
        </h1>

        <p className="text-gray-600 mb-4 max-w-sm">
          Ihre Anfrage wurde an KEWA AG gesendet. Wir werden uns in Kuerze bei
          Ihnen melden.
        </p>

        <p className="text-sm text-gray-500">
          Kontakt-E-Mail: <span className="font-medium">{email}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <div className="mb-6">{config.icon}</div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h1>

      {/* Message */}
      <p className="text-gray-600 mb-8 max-w-sm">{config.message}</p>

      {/* Request Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-sm">
        <h2 className="font-semibold text-gray-900 mb-4">
          Neuen Link anfordern
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1 text-left"
            >
              Ihre E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ihre-email@firma.ch"
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="w-full bg-blue-600 text-white font-semibold py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Wird gesendet...' : 'Link anfordern'}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          KEWA AG wird Ihren Antrag pruefen und Ihnen einen neuen Zugangslink
          zusenden.
        </p>
      </div>

      {/* Alternative Contact */}
      <div className="mt-6 text-sm text-gray-500">
        <p>Oder kontaktieren Sie uns direkt:</p>
        <a
          href="mailto:info@kewa.ch"
          className="text-blue-600 underline hover:text-blue-700"
        >
          info@kewa.ch
        </a>
      </div>
    </div>
  )
}
