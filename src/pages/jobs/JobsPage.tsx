import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { searchJobs } from '@/api/jobs'
import type { JobPosting, EmploymentType, WorkMode, ExperienceLevel } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { MapPin, Briefcase, Clock, ChevronLeft, ChevronRight, Search } from 'lucide-react'

// ─── Filter option lists ──────────────────────────────────────────────────────
// Empty string value = "no filter" — maps to undefined before the API call.
// Labels are human-readable; values match backend enum strings exactly.

const EMPLOYMENT_TYPES: { value: EmploymentType | ''; label: string }[] = [
  { value: '',           label: 'All Types'   },
  { value: 'FULL_TIME',  label: 'Full Time'   },
  { value: 'PART_TIME',  label: 'Part Time'   },
  { value: 'CONTRACT',   label: 'Contract'    },
  { value: 'INTERNSHIP', label: 'Internship'  },
  { value: 'FREELANCE',  label: 'Freelance'   },
]

const WORK_MODES: { value: WorkMode | ''; label: string }[] = [
  { value: '',        label: 'All Modes' },
  { value: 'ON_SITE', label: 'On-Site'   },
  { value: 'REMOTE',  label: 'Remote'    },
  { value: 'HYBRID',  label: 'Hybrid'    },
]

const EXPERIENCE_LEVELS: { value: ExperienceLevel | ''; label: string }[] = [
  { value: '',        label: 'All Levels' },
  { value: 'FRESHER', label: 'Fresher'    },
  { value: 'JUNIOR',  label: 'Junior'     },
  { value: 'MID',     label: 'Mid'        },
  { value: 'SENIOR',  label: 'Senior'     },
  { value: 'LEAD',    label: 'Lead'       },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a salary range into a compact human-readable string.
 * Converts raw numbers to K / L (lakh) notation used in Indian job listings.
 */
function formatSalary(job: JobPosting): string {
  if (!job.salaryMin && !job.salaryMax) return 'Salary not disclosed'
  const currency = job.salaryCurrency ?? 'INR'
  const fmt = (n: number) =>
    n >= 100000 ? `${(n / 100000).toFixed(1)}L`
    : n >= 1000  ? `${(n / 1000).toFixed(0)}K`
    : `${n}`
  if (job.salaryMin && job.salaryMax)
    return `${currency} ${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`
  if (job.salaryMin) return `${currency} ${fmt(job.salaryMin)}+`
  return `Up to ${currency} ${fmt(job.salaryMax!)}`
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ─── JobCard ─────────────────────────────────────────────────────────────────

/** Single job listing row. Clicking navigates to the full detail page. */
function JobCard({ job }: { job: JobPosting }) {
  return (
    <Link to={`/jobs/${job.id}`}>
      <Card className="cursor-pointer transition hover:shadow-md hover:border-blue-200">
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-900 hover:text-blue-600">
                {job.title}
              </h3>
              <p className="mt-0.5 text-sm text-gray-600">{job.companyName}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {job.employmentType.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(job.postedAt)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {formatSalary(job)}
                </span>
                <Badge label={job.workMode}         variant={job.workMode === 'REMOTE' ? 'green' : 'gray'} />
                <Badge label={job.experienceLevel}  variant="blue" />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  )
}

// ─── JobsPage ─────────────────────────────────────────────────────────────────

/**
 * Public job search page — accessible without login.
 *
 * Filter state lives in the URL query string (useSearchParams) so that:
 *   - The browser back button restores the previous search
 *   - A filtered URL can be bookmarked or shared
 *   - TanStack Query uses the URL params as its cache key, so changing
 *     any filter automatically triggers a new fetch
 *
 * Two-tier input behaviour:
 *   - Dropdowns (employmentType, workMode, experienceLevel) apply immediately
 *     on change — no need to press Search.
 *   - Text inputs (keyword, location) are buffered in local state and only
 *     committed to the URL on form submit, to avoid firing an API request
 *     on every keystroke.
 */
export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Derive current filter values from the URL
  const keyword         = searchParams.get('keyword')         ?? ''
  const location        = searchParams.get('location')        ?? ''
  const employmentType  = searchParams.get('employmentType')  ?? ''
  const workMode        = searchParams.get('workMode')        ?? ''
  const experienceLevel = searchParams.get('experienceLevel') ?? ''
  const page            = Number(searchParams.get('page')     ?? '0')

  // Local state for text inputs — only flushed to URL on submit
  const [inputValues, setInputValues] = useState({ keyword, location })

  // Keep local text state in sync when the URL changes externally (e.g. back button)
  useEffect(() => {
    setInputValues({ keyword, location })
  }, [keyword, location])

  // ── Data fetching ───────────────────────────────────────────────────────────
  // The query key array includes all active filters. TanStack Query re-fetches
  // whenever any element changes. placeholderData keeps previous results visible
  // while the next page / filter set loads — prevents a blank flash.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', { keyword, location, employmentType, workMode, experienceLevel, page }],
    queryFn: () =>
      searchJobs({
        keyword:         keyword         || undefined,
        location:        location        || undefined,
        employmentType:  (employmentType  as EmploymentType)  || undefined,
        workMode:        (workMode        as WorkMode)        || undefined,
        experienceLevel: (experienceLevel as ExperienceLevel) || undefined,
        page,
        size: 10,
      }),
    placeholderData: (prev) => prev,
  })

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Dropdowns write directly to URL and reset to page 0
  const handleSelectChange = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  // Text search flushes buffered input values to URL
  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (inputValues.keyword)  next.set('keyword', inputValues.keyword)
      else next.delete('keyword')
      if (inputValues.location) next.set('location', inputValues.location)
      else next.delete('location')
      next.delete('page')
      return next
    })
  }

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newPage === 0) next.delete('page')
      else next.set('page', String(newPage))
      return next
    })
  }

  const handleClear = () => {
    setSearchParams({})
    setInputValues({ keyword: '', location: '' })
  }

  const hasFilters = keyword || location || employmentType || workMode || experienceLevel

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Browse Jobs</h1>

      {/* ── Filter panel ─────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardBody>
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Job title, skill, keyword..."
                value={inputValues.keyword}
                onChange={(e) => setInputValues((v) => ({ ...v, keyword: e.target.value }))}
              />
              <Input
                placeholder="City or location..."
                value={inputValues.location}
                onChange={(e) => setInputValues((v) => ({ ...v, location: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                options={EMPLOYMENT_TYPES}
                value={employmentType}
                onChange={(e) => handleSelectChange('employmentType', e.target.value)}
              />
              <Select
                options={WORK_MODES}
                value={workMode}
                onChange={(e) => handleSelectChange('workMode', e.target.value)}
              />
              <Select
                options={EXPERIENCE_LEVELS}
                value={experienceLevel}
                onChange={(e) => handleSelectChange('experienceLevel', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm">
                <Search className="mr-1.5 h-4 w-4" />
                Search
              </Button>
              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                  Clear filters
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {isLoading && (
        <p className="text-center text-sm text-gray-500">Loading jobs...</p>
      )}

      {isError && (
        <p className="text-center text-sm text-red-600">
          Failed to load jobs. Please try again.
        </p>
      )}

      {data && (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {data.totalElements} job{data.totalElements !== 1 ? 's' : ''} found
          </p>

          {data.content.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-medium">No jobs found</p>
              <p className="mt-1 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {data.content.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* ── Pagination ─────────────────────────────────────────────── */}
          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm text-gray-600">
                Page {page + 1} of {data.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={data.last}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
