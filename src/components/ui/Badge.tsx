import { cn } from '@/lib/utils'
import type { ApplicationStatus, JobStatus, VerificationStatus } from '@/types'

type BadgeVariant = 'green' | 'yellow' | 'blue' | 'red' | 'gray' | 'purple'

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-blue-100 text-blue-800',
  red:    'bg-red-100 text-red-800',
  gray:   'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
}

// Maps backend enum values to badge colours so callers don't hard-code colours.
// Usage: <Badge applicationStatus="SHORTLISTED" label="Shortlisted" />
const applicationStatusColor: Record<ApplicationStatus, BadgeVariant> = {
  APPLIED:              'blue',
  VIEWED:               'gray',
  SHORTLISTED:          'yellow',
  INTERVIEW_SCHEDULED:  'purple',
  OFFERED:              'green',
  HIRED:                'green',
  REJECTED:             'red',
  WITHDRAWN:            'gray',
}

const jobStatusColor: Record<JobStatus, BadgeVariant> = {
  DRAFT:   'gray',
  ACTIVE:  'green',
  PAUSED:  'yellow',
  CLOSED:  'red',
  EXPIRED: 'red',
}

const verificationStatusColor: Record<VerificationStatus, BadgeVariant> = {
  PENDING:   'yellow',
  VERIFIED:  'green',
  REJECTED:  'red',
  SUSPENDED: 'red',
}

interface BadgeProps {
  label: string
  /** Pass a raw variant to override automatic colour mapping */
  variant?: BadgeVariant
  applicationStatus?: ApplicationStatus
  jobStatus?: JobStatus
  verificationStatus?: VerificationStatus
  className?: string
}

/**
 * Pill badge that can be coloured three ways (in priority order):
 *   1. Explicit `variant` prop
 *   2. Auto-mapped from a status enum prop (applicationStatus / jobStatus / verificationStatus)
 *   3. Falls back to 'gray'
 *
 * Underscores in the label are replaced with spaces automatically
 * so raw enum strings like "FULL_TIME" render as "FULL TIME".
 */
export function Badge({
  label,
  variant,
  applicationStatus,
  jobStatus,
  verificationStatus,
  className,
}: BadgeProps) {
  const resolved =
    variant ??
    (applicationStatus  ? applicationStatusColor[applicationStatus]   : undefined) ??
    (jobStatus          ? jobStatusColor[jobStatus]                   : undefined) ??
    (verificationStatus ? verificationStatusColor[verificationStatus] : undefined) ??
    'gray'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[resolved],
        className
      )}
    >
      {label.replace(/_/g, ' ')}
    </span>
  )
}
