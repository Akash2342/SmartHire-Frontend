import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobApplications, updateApplicationStatus } from '@/api/applications'
import type { ApplicationDetail, ApplicationStatus } from '@/types'
import { Badge }               from '@/components/ui/Badge'
import { Button }              from '@/components/ui/Button'
import { Card, CardBody }      from '@/components/ui/Card'
import {
  ChevronLeft, MapPin, Phone, FileText,
  ChevronDown, ChevronUp, AlertCircle, Users,
} from 'lucide-react'

// ─── Application pipeline ─────────────────────────────────────────────────────
/**
 * Returns the valid next statuses a recruiter can move an application to.
 * WITHDRAWN and HIRED/REJECTED are terminal — no further transitions.
 *
 * Pipeline flow:
 *   APPLIED | VIEWED → SHORTLISTED
 *   SHORTLISTED      → INTERVIEW_SCHEDULED
 *   INTERVIEW_SCHEDULED → OFFERED
 *   OFFERED          → HIRED | REJECTED
 *   Any active stage → REJECTED (fast-track rejection)
 */
function nextStatuses(current: ApplicationStatus): ApplicationStatus[] {
  if (current === 'WITHDRAWN' || current === 'HIRED' || current === 'REJECTED') return []
  if (current === 'APPLIED'  || current === 'VIEWED')       return ['SHORTLISTED', 'REJECTED']
  if (current === 'SHORTLISTED')                            return ['INTERVIEW_SCHEDULED', 'REJECTED']
  if (current === 'INTERVIEW_SCHEDULED')                    return ['OFFERED', 'REJECTED']
  if (current === 'OFFERED')                                return ['HIRED', 'REJECTED']
  return []
}

/** Human-readable button labels for each status transition */
const STATUS_LABELS: Partial<Record<ApplicationStatus, string>> = {
  SHORTLISTED:          'Shortlist',
  INTERVIEW_SCHEDULED:  'Schedule Interview',
  OFFERED:              'Make Offer',
  HIRED:                'Mark Hired',
  REJECTED:             'Reject',
}

/** Format an ISO timestamp to a readable date */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── ApplicationRow ───────────────────────────────────────────────────────────
/**
 * Single applicant card in the list.
 *
 * Two display modes controlled by `expanded`:
 *   Collapsed — candidate name, headline, status badge, applied date
 *   Expanded  — full detail: cover letter, phone, city, resume filename,
 *               recruiter note textarea, pipeline action buttons
 *
 * The backend auto-transitions APPLIED → VIEWED when getApplicationDetail() is
 * called, but since we fetch all applications at once with getJobApplications(),
 * the VIEWED transition happens inside updateApplicationStatus when the recruiter
 * takes any action. Clicking to expand does NOT auto-mark as viewed here — only
 * the status change does.
 */
function ApplicationRow({
  application,
  onStatusChanged,
}: {
  application: ApplicationDetail
  onStatusChanged: () => void
}) {
  const [expanded, setExpanded]     = useState(false)
  // recruiterNote is local state — only sent to backend on status update
  const [recruiterNote, setRecruiterNote] = useState(application.recruiterNote ?? '')

  const statusMutation = useMutation({
    mutationFn: (status: ApplicationStatus) =>
      updateApplicationStatus(application.id, status, recruiterNote || undefined),
    onSuccess: onStatusChanged,
  })

  const transitions = nextStatuses(application.status)
  const candidateName = [application.candidateFirstName, application.candidateLastName]
    .filter(Boolean).join(' ') || 'Candidate'

  return (
    <Card>
      {/* ── Collapsed header — always visible ──────────────────────────── */}
      <CardBody>
        <button
          className="w-full text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{candidateName}</p>
                <Badge applicationStatus={application.status} label={application.status} />
              </div>
              {application.candidateHeadline && (
                <p className="mt-0.5 text-sm text-gray-500 truncate">
                  {application.candidateHeadline}
                </p>
              )}
              <p className="mt-0.5 text-xs text-gray-400">
                Applied {formatDate(application.appliedAt)}
              </p>
            </div>
            {/* Chevron indicates expand/collapse */}
            {expanded
              ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
              : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            }
          </div>
        </button>

        {/* ── Expanded detail ─────────────────────────────────────────────── */}
        {expanded && (
          <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 pt-4">

            {/* Candidate meta row */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
              {application.candidateCity && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  {application.candidateCity}
                </span>
              )}
              {application.candidatePhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {application.candidatePhone}
                </span>
              )}
              {application.resumeFileName && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  {application.resumeFileName}
                </span>
              )}
            </div>

            {/* Cover letter — only shown if candidate wrote one */}
            {application.coverLetter && (
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Cover Letter</p>
                <p className="whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {application.coverLetter}
                </p>
              </div>
            )}

            {/* Recruiter note — internal, never shown to candidate */}
            {transitions.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Recruiter Note <span className="font-normal text-gray-400">(internal only)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Add a note for your team..."
                  value={recruiterNote}
                  // Tracks the note locally — sent with the next status update
                  onChange={(e) => setRecruiterNote(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Pipeline action buttons */}
            {transitions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {transitions.map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant={next === 'REJECTED' ? 'danger' : next === 'HIRED' ? 'primary' : 'outline'}
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(next)}
                  >
                    {STATUS_LABELS[next]}
                  </Button>
                ))}
              </div>
            )}

            {/* Error from status mutation */}
            {statusMutation.isError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                Action failed. Please try again.
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// ─── RecruiterApplicationsPage ────────────────────────────────────────────────
/**
 * Recruiter view of all applicants for a specific job posting.
 * Route: /recruiter/jobs/:jobId/applications
 *
 * jobId comes from the URL via useParams — same job the recruiter clicked
 * "Applicants" on in RecruiterJobsPage.
 *
 * After any status update, onStatusChanged invalidates the applications cache
 * so the badge on the card reflects the new status immediately.
 */
export function RecruiterApplicationsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate   = useNavigate()
  const queryClient = useQueryClient()

  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ['jobApplications', jobId],
    queryFn:  () => getJobApplications(jobId!),
    enabled:  !!jobId,
  })

  const handleStatusChanged = () => {
    queryClient.invalidateQueries({ queryKey: ['jobApplications', jobId] })
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-gray-500">
        Loading applicants...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-red-600">
        Failed to load applicants. Please try again.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back to job list */}
      <button
        onClick={() => navigate('/recruiter/jobs')}
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Jobs
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
        <span className="text-sm text-gray-500">
          {applications?.length ?? 0} application{applications?.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty state */}
      {applications?.length === 0 && (
        <div className="py-16 text-center text-gray-500">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">No applications yet</p>
          <p className="mt-1 text-sm">
            Make sure the job is ACTIVE so candidates can apply.
          </p>
        </div>
      )}

      {/* Applicant list */}
      <div className="flex flex-col gap-3">
        {applications?.map((app) => (
          <ApplicationRow
            key={app.id}
            application={app}
            onStatusChanged={handleStatusChanged}
          />
        ))}
      </div>
    </div>
  )
}
