import { cn } from '@/lib/utils'
import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  /** Validation error message shown in red below the select */
  error?: string
  /** Shown as the first, empty-value option — acts as a "no filter" choice */
  placeholder?: string
  options: { value: string; label: string }[]
}

/**
 * forwardRef mirrors the Input component pattern so react-hook-form can attach
 * its ref when this is used inside a <form> with register().
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, options, placeholder, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-900',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
