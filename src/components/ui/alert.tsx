import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-white text-gray-950 border-gray-200',
        destructive: 'border-red-500/50 text-red-600 bg-red-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
)
Alert.displayName = 'Alert'

const AlertTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
