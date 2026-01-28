'use client'

import { forwardRef, type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// ============================================
// Dialog Root
// ============================================

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => onOpenChange?.(false)}
          />
          {/* Content container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            {children}
          </div>
        </div>
      )}
    </>
  )
}

// ============================================
// Dialog Trigger
// ============================================

interface DialogTriggerProps {
  asChild?: boolean
  children: ReactNode
  onClick?: () => void
}

export function DialogTrigger({ children, onClick }: DialogTriggerProps) {
  return <span onClick={onClick}>{children}</span>
}

// ============================================
// Dialog Content
// ============================================

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative bg-white dark:bg-gray-900 rounded-lg shadow-lg',
          'w-full max-w-lg max-h-[85vh] overflow-y-auto',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DialogContent.displayName = 'DialogContent'

// ============================================
// Dialog Header
// ============================================

interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn('px-6 pt-6 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================
// Dialog Title
// ============================================

interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
}

export function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <h2
      className={cn(
        'text-lg font-semibold text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

// ============================================
// Dialog Description
// ============================================

interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
}

export function DialogDescription({ className, children, ...props }: DialogDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-gray-600 dark:text-gray-400 mt-1', className)}
      {...props}
    >
      {children}
    </p>
  )
}

// ============================================
// Dialog Footer
// ============================================

interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'px-6 pb-6 pt-4 flex justify-end gap-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================
// Dialog Close
// ============================================

interface DialogCloseProps extends HTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  asChild?: boolean
}

export function DialogClose({ className, children, asChild, ...props }: DialogCloseProps) {
  if (asChild) {
    return <span className={className}>{children}</span>
  }

  return (
    <button
      type="button"
      className={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        className
      )}
      {...props}
    >
      {children || (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
    </button>
  )
}
