import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getJob } from '@/api/jobs'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import {
  MapPin, Briefcase, Clock, Building2, Users,
  DollarSign, ChevronLeft, Wifi,
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

// ─── JobDetailPage ─────────────────────────────────────────────────────────────
/**
 * Full job detail view for a single posting.
 *
 * Fetches the job by `:jobId` from the URL — the backend increments viewCount
 * on this call so we get an accurate "X people viewed this" stat server-side.
 *
 * Apply button is role-aware:
 *   - Guest (not logged in)  → "Login to Apply" → redirects to /login
 *   - SEEKER                 → "Apply Now" (disabled placeholder until /seeker/resume is built)
 *   - RECRUITER / ADMIN      → button hidden entirely (they cannot apply)
 */
export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', jobId],
    queryFn:  () => getJob(jobId!),
    // Don't fire if jobId is somehow undefined (shouldn't happen via normal routing)
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

  // Render the correct apply CTA based on who is viewing
  const applyButton = !user ? (
    <Button onClick={() => navigate('/login')} className="w-full sm:w-auto">
      Login to Apply
    </Button>
  ) : user.role === 'SEEKER' ? (
    <Button className="w-full sm:w-auto" disabled>
      Apply Now <span className="ml-1 text-xs opacity-70">(coming soon)</span>
    </Button>
  ) : null

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

          {/* Header — title, company, meta badges, apply button */}
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
                <Badge label={job.workMode}                              variant={job.workMode === 'REMOTE' ? 'green' : 'gray'} />
                <Badge label={job.experienceLevel}                       variant="blue" />
                <Badge label={job.employmentType.replace('_', ' ')}     variant="gray" />
                {job.category && <Badge label={job.category}            variant="purple" />}
              </div>

              {applyButton && (
                <div className="mt-5 border-t border-gray-100 pt-5">
                  {applyButton}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Full description — whitespace-pre-wrap preserves line breaks from the backend */}
          <Card>
            <CardBody>
              <h2 className="mb-3 font-semibold text-gray-900">Job Description</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {job.description}
              </p>
            </CardBody>
          </Card>

          {/* Requirements — only rendered when the recruiter filled this field in */}
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

          {/* Repeat apply CTA in sidebar for quick access without scrolling */}
          {applyButton && <div>{applyButton}</div>}
        </div>

      </div>
    </div>
  )
}
