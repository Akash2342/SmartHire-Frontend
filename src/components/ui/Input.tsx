import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Validation error message shown in red below the input */
  error?: string
}

/**
 * forwardRef is required so react-hook-form can attach its internal ref to the
 * underlying <input> element via the `...register('fieldName')` spread.
 * Without it, RHF can't read the value or trigger validation.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-900 placeholder:text-gray-400',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
