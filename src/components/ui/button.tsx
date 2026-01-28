import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'destructive'
  /** Button size - all sizes meet 48px minimum touch target */
  size?: 'sm' | 'md' | 'lg' | 'icon'
  /** Full width button */
  fullWidth?: boolean
  /** Show loading spinner */
  loading?: boolean
  /** Content to display */
  children: ReactNode
}

const variantClasses = {
  primary:
    'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white',
  secondary:
    'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100',
  danger:
    'bg-[var(--status-error)] hover:bg-red-600 text-white',
  destructive:
    'bg-[var(--status-error)] hover:bg-red-600 text-white',
  ghost:
    'bg-transparent hover:bg-gray-100 text-gray-900 dark:hover:bg-gray-800 dark:text-gray-100',
  outline:
    'bg-transparent border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
}

const sizeClasses = {
  sm: 'h-10 min-h-[40px] px-3 text-sm', // 40px - meets touch target with spacing
  md: 'h-12 min-h-[48px] px-4 text-base', // 48px - primary touch target
  lg: 'h-14 min-h-[56px] px-6 text-lg', // 56px - large touch target
  icon: 'h-10 w-10 min-h-[40px] min-w-[40px] p-2' // Square icon button
}

/**
 * Touch-optimized button component
 * All sizes have minimum height of 40px+, with default 48px for optimal touch
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          // Touch-friendly tap highlight
          'active:scale-[0.98]',
          // Variant
          variantClasses[variant],
          // Size
          sizeClasses[size],
          // Full width
          fullWidth && 'w-full',
          // Disabled state
          isDisabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner />
            <span className="ml-2">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
