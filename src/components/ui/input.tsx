import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text */
  label?: string
  /** Error message to display */
  error?: string
  /** Visual variant */
  variant?: 'default' | 'error'
  /** Optional left icon/adornment */
  leftAdornment?: ReactNode
  /** Optional right icon/adornment */
  rightAdornment?: ReactNode
}

/**
 * Touch-optimized input component
 * Height: 48px (h-12) for optimal touch targets
 * Full width by default
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      variant: variantProp,
      leftAdornment,
      rightAdornment,
      className,
      id,
      ...props
    },
    ref
  ) => {
    // Determine variant based on error state
    const variant = error ? 'error' : variantProp || 'default'
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    const variantClasses = {
      default:
        'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500',
      error:
        'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500'
    }

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftAdornment && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {leftAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base styles - touch-friendly height
              'w-full h-12 min-h-[48px] px-4',
              'rounded-lg border',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-600',
              // Focus states
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'transition-colors duration-200',
              // Disabled state
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800',
              // Variant
              variantClasses[variant],
              // Padding adjustments for adornments
              leftAdornment && 'pl-10',
              rightAdornment && 'pr-10',
              className
            )}
            {...props}
          />
          {rightAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {rightAdornment}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
