import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

/** Container card with a subtle border and shadow */
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/** Optional top section separated by a bottom border — use for titles/actions */
export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-b border-gray-200 px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

/** Main content area of a card */
export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}
