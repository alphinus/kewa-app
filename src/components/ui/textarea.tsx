import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Label text */
  label?: string
  /** Error message to display */
  error?: string
  /** Visual variant */
  variant?: 'default' | 'error'
}

/**
 * Touch-optimized textarea component
 * Min height: 96px for comfortable text entry
 * Full width by default
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      variant: variantProp,
      className,
      id,
      ...props
    },
    ref
  ) => {
    // Determine variant based on error state
    const variant = error ? 'error' : variantProp || 'default'
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

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
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            // Base styles - comfortable min height
            'w-full min-h-[96px] px-4 py-3',
            'rounded-lg border',
            'bg-white dark:bg-gray-900',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-600',
            // Focus states
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'transition-colors duration-200',
            // Disabled state
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800',
            // Resize
            'resize-y',
            // Variant
            variantClasses[variant],
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
