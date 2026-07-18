import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getJob } from '@/api/jobs'
import { getResume } from '@/api/candidate'
import { applyToJob } from '@/api/applications'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import {
  MapPin, Briefcase, Clock, Building2, Users,
  DollarSign, ChevronLeft, Wifi, CheckCircle, AlertCircle,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null
): string {
  if (!min && !max) return 'Salary not disclosed'
  const c   = currency ?? 'INR'
  const fmt = (n: number) =>
    n >= 100000 ? `${(n / 100000).toFixed(1)}L`
    : n >= 1000  ? `${(n / 1000).toFixed(0)}K`
    : `${n}`
  if (min && max) return `${c} ${fmt(min)} – ${fmt(max)} per year`
  if (min)        return `${c} ${fmt(min)}+ per year`
  return `Up to ${c} ${fmt(max!)} per year`
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff  = Date.now() - new Date(dateStr).getTime()
  const days  = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days} days ago`
  return `${Math.floor(days / 30)} months ago`
}

// ─── MetaItem ─────────────────────────────────────────────────────────────────
/** Icon + text row used in the sidebar details card */
function MetaItem({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <span>{label}</span>
    </div>
  )
}

// ─── ApplySection ─────────────────────────────────────────────────────────────
/**
 * The apply CTA rendered for logged-in SEEKERs only.
 * Extracted into its own component so the logic doesn't crowd JobDetailPage.
 *
 * Three visual states:
 *   1. No resume → prompt to upload first (can't apply without one)
 *   2. Resume exists, not yet applied → "Apply Now" button that expands an
 *      inline cover letter form on click
 *   3. Applied successfully (or 409 from backend) → confirmation message
 */
function ApplySection({ jobId }: { jobId: string }) {
  const navigate = useNavigate()

  // Whether the inline cover letter form is currently open
  const [showForm, setShowForm] = useState(false)
  // Cover letter text typed by the user — optional field
  const [coverLetter, setCoverLetter] = useState('')

  // ── Fetch resume ────────────────────────────────────────────────────────────
  // Same queryKey as ResumePage so we hit the cache if the user was just there.
  // On 404 (no resume) we get isError=true — we treat that as "no resume yet".
  const { data: resume, isLoading: resumeLoading } = useQuery({
    queryKey: ['myResume'],
    queryFn:  getResume,
    retry: (_, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      return status !== 404
    },
  })

  // ── Apply mutation ───────────────────────────────────────────────────────────
  // mutate() triggers the POST /applications request.
  // isSuccess becomes true permanently after a successful submission.
  // isError becomes true if the backend rejects it (e.g. 409 = already applied).
  const applyMutation = useMutation({
    mutationFn: () =>
      applyToJob({ jobId, resumeId: resume!.id, coverLetter: coverLetter || undefined }),
  })

  // Check if the backend returned 409 Conflict (duplicate application)
  const isAlreadyApplied =
    applyMutation.isError &&
    (applyMutation.error as { response?: { status?: number } })?.response?.status === 409

  const handleSubmit = () => {
    applyMutation.mutate()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (resumeLoading) return null   // don't flash anything while fetching

  // State 3: applied successfully or 409 from backend
  if (applyMutation.isSuccess || isAlreadyApplied) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-green-700">
        <CheckCircle className="h-4 w-4" />
        {isAlreadyApplied ? 'You have already applied for this job.' : 'Application submitted successfully!'}
      </div>
    )
  }

  // State 1: no resume uploaded yet
  if (!resume) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-yellow-50 px-3 py-2.5 text-sm text-yellow-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          You need to{' '}
          <button
            onClick={() => navigate('/seeker/resume')}
            className="font-medium underline hover:text-yellow-900"
          >
            upload your resume
          </button>
          {' '}before you can apply.
        </span>
      </div>
    )
  }

  // State 2: resume exists, ready to apply
  return (
    <div className="flex flex-col gap-3">
      {/* Before the form opens, show the "Apply Now" button */}
      {!showForm && (
        <Button className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
          Apply Now
        </Button>
      )}

      {/*
        Inline apply form — appears when the user clicks "Apply Now".
        A <textarea> is an uncontrolled-style input where we track its value
        manually in `coverLetter` state using onChange.
      */}
      {showForm && (
        <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">
            Applying with: <span className="text-gray-900">{resume.originalFileName}</span>
          </p>

          {/* Cover letter textarea — optional */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Cover Letter <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Tell the recruiter why you're a great fit..."
              value={coverLetter}
              // Every keystroke calls this — it updates `coverLetter` state,
              // React re-renders, and the textarea shows the new value.
              onChange={(e) => setCoverLetter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Generic server error (not 409) */}
          {applyMutation.isError && !isAlreadyApplied && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              Something went wrong. Please try again.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              loading={applyMutation.isPending}
            >
              Submit Application
            </Button>
            {/* Cancel closes the form without doing anything */}
            <Button
              variant="ghost"
              onClick={() => { setShowForm(false); setCoverLetter('') }}
              disabled={applyMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── JobDetailPage ─────────────────────────────────────────────────────────────
/**
 * Full job detail view for a single posting.
 *
 * Fetches the job by `:jobId` from the URL — the backend increments viewCount
 * on this call so we get an accurate view count server-side.
 *
 * Apply section is role-aware:
 *   - Guest (not logged in)  → "Login to Apply" button
 *   - SEEKER                 → <ApplySection /> handles resume check + submission
 *   - RECRUITER / ADMIN      → nothing shown (they cannot apply to jobs)
 */
export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', jobId],
    queryFn:  () => getJob(jobId!),
    enabled:  !!jobId,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-gray-500">
        Loading job...
      </div>
    )
  }

  if (isError || !job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-600">Job not found or no longer active.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/jobs')}>
          Back to jobs
        </Button>
      </div>
    )
  }

  // Decide what the apply section looks like based on who is viewing
  const applySection = !user ? (
    // Not logged in — send them to login
    <Button onClick={() => navigate('/login')} className="w-full sm:w-auto">
      Login to Apply
    </Button>
  ) : user.role === 'SEEKER' ? (
    // Logged-in seeker — full apply flow (resume check + form)
    <ApplySection jobId={job.id} />
  ) : null  // recruiters and admins see nothing

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back to search results */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to results
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Main column ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:col-span-2">

          {/* Header — title, company, meta badges, apply section */}
          <Card>
            <CardBody>
              <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
              <Link
                to={`/company/${job.companyId}`}
                className="mt-1 text-sm font-medium text-blue-600 hover:underline"
              >
                {job.companyName}
              </Link>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Posted {timeAgo(job.postedAt)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge label={job.workMode}                          variant={job.workMode === 'REMOTE' ? 'green' : 'gray'} />
                <Badge label={job.experienceLevel}                   variant="blue" />
                <Badge label={job.employmentType.replace('_', ' ')} variant="gray" />
                {job.category && <Badge label={job.category}        variant="purple" />}
              </div>

              {applySection && (
                <div className="mt-5 border-t border-gray-100 pt-5">
                  {applySection}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Full description — whitespace-pre-wrap preserves line breaks */}
          <Card>
            <CardBody>
              <h2 className="mb-3 font-semibold text-gray-900">Job Description</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {job.description}
              </p>
            </CardBody>
          </Card>

          {/* Requirements — only rendered when recruiter filled this field */}
          {job.requirements && (
            <Card>
              <CardBody>
                <h2 className="mb-3 font-semibold text-gray-900">Requirements</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {job.requirements}
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <h2 className="font-semibold text-gray-900">Job Details</h2>
              <MetaItem
                icon={DollarSign}
                label={formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
              />
              <MetaItem icon={Briefcase} label={job.employmentType.replace('_', ' ')} />
              <MetaItem icon={Wifi}      label={job.workMode.replace('_', ' ')} />
              <MetaItem icon={Users}     label={`${job.experienceLevel} level`} />
              {job.location && <MetaItem icon={MapPin}    label={job.location} />}
              <MetaItem icon={Building2} label={job.companyName} />
            </CardBody>
          </Card>

          {/* Repeat apply section in sidebar for quick access */}
          {applySection && <div>{applySection}</div>}
        </div>

      </div>
    </div>
  )
}
