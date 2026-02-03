'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Error fallback component for displaying user-friendly error states.
 * Can be used standalone or with ErrorBoundary.
 */

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary?: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardContent className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
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
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Ein Fehler ist aufgetreten
        </h3>
        <details className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-left">
          <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
            Technische Details
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
        {resetErrorBoundary && (
          <Button onClick={resetErrorBoundary} variant="secondary">
            Erneut versuchen
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Error boundary class component for catching render errors.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary onReset={() => refetch()}>
 *   <ComponentThatMightError />
 * </ErrorBoundary>
 * ```
 */

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional custom fallback component */
  fallback?: ReactNode
  /** Callback after user clicks retry */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      )
    }

    return this.props.children
  }
}
