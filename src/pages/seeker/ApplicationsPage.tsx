import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyApplications, withdrawApplication } from '@/api/applications'
import type { JobApplication } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Briefcase, Calendar, Building2, AlertCircle } from 'lucide-react'

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Format an ISO timestamp to a readable date e.g. "24 Jul 2026" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── ApplicationCard ──────────────────────────────────────────────────────────
/**
 * Displays a single application with its current pipeline status.
 *
 * The Withdraw button is only rendered when status is 'APPLIED' — that is the
 * only stage the backend allows withdrawal from. At any later stage the button
 * would be rejected with a 400, so we hide it proactively instead of letting
 * the user hit an error.
 *
 * After a successful withdrawal, `onWithdrawn` is called which invalidates the
 * ['myApplications'] cache and re-fetches the list automatically.
 */
function ApplicationCard({
  application,
  onWithdrawn,
}: {
  application: JobApplication
  onWithdrawn: () => void
}) {
  // useMutation for the withdraw action.
  // mutationFn receives no arguments because the application id is already in scope.
  const withdrawMutation = useMutation({
    mutationFn: () => withdrawApplication(application.id),
    onSuccess:  onWithdrawn,
  })

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">

          {/* Left — job info */}
          <div className="min-w-0 flex-1">
            {/* Job title links to the public job detail page */}
            <Link
              to={`/jobs/${application.jobId}`}
              className="font-semibold text-gray-900 hover:text-blue-600"
            >
              {application.jobTitle}
            </Link>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {application.companyName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Applied {formatDate(application.appliedAt)}
              </span>
            </div>

            {/* Pipeline status badge — Badge auto-maps ApplicationStatus to a colour */}
            <div className="mt-2">
              <Badge applicationStatus={application.status} label={application.status} />
            </div>

            {/* Error shown if the withdraw API call fails */}
            {withdrawMutation.isError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Failed to withdraw. Please try again.
              </p>
            )}
          </div>

          {/* Right — withdraw button (only visible when status is APPLIED) */}
          {application.status === 'APPLIED' && (
            <Button
              variant="outline"
              size="sm"
              loading={withdrawMutation.isPending}
              onClick={() => withdrawMutation.mutate()}
              className="shrink-0"
            >
              Withdraw
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

// ─── ApplicationsPage ─────────────────────────────────────────────────────────
/**
 * Seeker applications tracker — route: /seeker/applications
 *
 * Fetches all applications for the logged-in candidate and displays them as
 * cards sorted by most-recent first (the backend returns them in that order).
 *
 * Each card shows the job title (linked to /jobs/:id), company, applied date,
 * current pipeline status, and a Withdraw button if still in APPLIED state.
 *
 * After a withdrawal, the list auto-refreshes via queryClient.invalidateQueries
 * — no manual state updates needed.
 */
export function ApplicationsPage() {
  const queryClient = useQueryClient()

  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ['myApplications'],
    queryFn:  getMyApplications,
  })

  // Passed down to each card — called after a successful withdrawal
  const handleWithdrawn = () => {
    queryClient.invalidateQueries({ queryKey: ['myApplications'] })
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-gray-500">
        Loading applications...
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-red-600">
        Failed to load applications. Please try again.
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!applications || applications.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">My Applications</h1>
        <div className="py-16 text-center text-gray-500">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">No applications yet</p>
          <p className="mt-1 text-sm">
            Browse jobs and apply to get started.
          </p>
          <Link to="/jobs">
            <Button className="mt-4" size="sm">Browse Jobs</Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <span className="text-sm text-gray-500">
          {applications.length} application{applications.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onWithdrawn={handleWithdrawn}
          />
        ))}
      </div>
    </div>
  )
}
