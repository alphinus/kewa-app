/**
 * Token Error Component
 *
 * Displays user-friendly error messages for invalid magic link tokens.
 */

import Link from 'next/link'

interface TokenErrorProps {
  error: 'expired' | 'used' | 'revoked' | 'not_found' | 'work_order_closed'
}

export default function TokenError({ error }: TokenErrorProps) {
  const errorConfig = {
    expired: {
      title: 'Link Expired',
      message:
        'This link has expired. Please contact KEWA AG to request a new link.',
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
    used: {
      title: 'Link Already Used',
      message:
        'This link has already been used. Each link can only be used once for security reasons.',
      icon: (
        <svg
          className="w-16 h-16 text-orange-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    revoked: {
      title: 'Link Revoked',
      message:
        'This link has been revoked and is no longer valid. Please contact KEWA AG for assistance.',
      icon: (
        <svg
          className="w-16 h-16 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      ),
    },
    not_found: {
      title: 'Link Not Found',
      message:
        'This link is invalid. Please check that you copied the complete URL from your email.',
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
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    work_order_closed: {
      title: 'Work Order Closed',
      message:
        'This work order has been completed and closed. Contact KEWA AG if you need assistance.',
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

  const config = errorConfig[error] ?? errorConfig.not_found

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <div className="mb-6">{config.icon}</div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{config.title}</h1>

      {/* Message */}
      <p className="text-gray-600 mb-8 max-w-sm">{config.message}</p>

      {/* Contact Info */}
      <div className="bg-gray-50 rounded-lg p-4 w-full max-w-sm">
        <h2 className="font-semibold text-gray-700 mb-2">Need Help?</h2>
        <p className="text-sm text-gray-600 mb-3">
          Contact KEWA AG to request a new access link:
        </p>
        <div className="space-y-2">
          <a
            href="mailto:info@kewa.ch"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Send Email
          </a>
          <a
            href="tel:+41000000000"
            className="flex items-center justify-center gap-2 w-full bg-gray-200 text-gray-700 rounded-lg py-3 px-4 font-medium hover:bg-gray-300 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            Call Us
          </a>
        </div>
      </div>
    </div>
  )
}
