import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getMyJobs, createJob, updateJob, updateJobStatus, deleteJob,
} from '@/api/jobs'
import { getMyCompany } from '@/api/company'
import type { JobPosting, JobStatus, EmploymentType, WorkMode, ExperienceLevel } from '@/types'
import { Button }               from '@/components/ui/Button'
import { Input }                from '@/components/ui/Input'
import { Select }               from '@/components/ui/Select'
import { Badge }                from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import {
  Plus, Pencil, Trash2, Users, Eye,
  AlertCircle, ChevronRight,
} from 'lucide-react'

// ─── Option lists ─────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME',  label: 'Full Time'  },
  { value: 'PART_TIME',  label: 'Part Time'  },
  { value: 'CONTRACT',   label: 'Contract'   },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'FREELANCE',  label: 'Freelance'  },
]

const WORK_MODES = [
  { value: 'ON_SITE', label: 'On-Site' },
  { value: 'REMOTE',  label: 'Remote'  },
  { value: 'HYBRID',  label: 'Hybrid'  },
]

const EXPERIENCE_LEVELS = [
  { value: 'FRESHER', label: 'Fresher' },
  { value: 'JUNIOR',  label: 'Junior'  },
  { value: 'MID',     label: 'Mid'     },
  { value: 'SENIOR',  label: 'Senior'  },
  { value: 'LEAD',    label: 'Lead'    },
]

// ─── Zod schema ───────────────────────────────────────────────────────────────

const jobSchema = z.object({
  title:           z.string().min(1, 'Required'),
  description:     z.string().min(1, 'Required'),
  requirements:    z.string().optional(),
  category:        z.string().optional(),
  location:        z.string().optional(),
  employmentType:  z.string().min(1, 'Required'),
  workMode:        z.string().min(1, 'Required'),
  experienceLevel: z.string().min(1, 'Required'),
  salaryMin:       z.number().optional(),
  salaryMax:       z.number().optional(),
  numberOfOpenings: z.number().optional(),
})

type JobFields = z.infer<typeof jobSchema>

// ─── Status machine ───────────────────────────────────────────────────────────
/**
 * Returns the valid next statuses a recruiter can transition a job to.
 * The backend enforces these same rules — we mirror them here to show only
 * valid buttons and avoid unnecessary error responses.
 *
 *   DRAFT   → ACTIVE
 *   ACTIVE  → PAUSED | CLOSED
 *   PAUSED  → ACTIVE | CLOSED
 *   CLOSED / EXPIRED → (terminal, no transitions)
 */
function nextStatuses(current: JobStatus): JobStatus[] {
  if (current === 'DRAFT')  return ['ACTIVE']
  if (current === 'ACTIVE') return ['PAUSED', 'CLOSED']
  if (current === 'PAUSED') return ['ACTIVE', 'CLOSED']
  return []
}

/** Human-readable label for each status transition button */
const STATUS_LABELS: Partial<Record<JobStatus, string>> = {
  ACTIVE: 'Publish',
  PAUSED: 'Pause',
  CLOSED: 'Close',
}

// ─── JobForm ──────────────────────────────────────────────────────────────────
/**
 * Used for both creating and editing job postings.
 * If `existing` is provided the form is pre-filled and calls updateJob on save.
 * Otherwise it calls createJob (new jobs always start as DRAFT).
 */
function JobForm({
  existing,
  onDone,
}: {
  existing?: JobPosting
  onDone: () => void
}) {
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobFields>({
    resolver: zodResolver(jobSchema),
    defaultValues: existing
      ? {
          title:            existing.title,
          description:      existing.description,
          requirements:     existing.requirements    ?? '',
          category:         existing.category        ?? '',
          location:         existing.location        ?? '',
          employmentType:   existing.employmentType,
          workMode:         existing.workMode,
          experienceLevel:  existing.experienceLevel,
          salaryMin:        existing.salaryMin       ?? undefined,
          salaryMax:        existing.salaryMax       ?? undefined,
          numberOfOpenings: existing.numberOfOpenings ?? undefined,
        }
      : { workMode: 'ON_SITE' },
  })

  const onSubmit = async (data: JobFields) => {
    setServerError('')
    try {
      const payload = {
        title:            data.title,
        description:      data.description,
        requirements:     data.requirements     || null,
        category:         data.category         || null,
        location:         data.location         || null,
        employmentType:   data.employmentType   as EmploymentType,
        workMode:         data.workMode         as WorkMode,
        experienceLevel:  data.experienceLevel  as ExperienceLevel,
        salaryMin:        data.salaryMin        ?? null,
        salaryMax:        data.salaryMax        ?? null,
        numberOfOpenings: data.numberOfOpenings ?? null,
      }
      if (existing) {
        await updateJob(existing.id, payload)
      } else {
        await createJob(payload)
      }
      onDone()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setServerError(msg ?? 'Failed to save. Please try again.')
    }
  }

  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
      <p className="mb-4 font-medium text-gray-900">
        {existing ? 'Edit Job' : 'New Job Posting'}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Job Title"
            error={errors.title?.message}
            {...register('title')}
            className="sm:col-span-2"
          />

          {/* Description textarea */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Requirements textarea */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Requirements</label>
            <textarea
              rows={3}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('requirements')}
            />
          </div>

          <Select
            label="Employment Type"
            options={EMPLOYMENT_TYPES}
            error={errors.employmentType?.message}
            {...register('employmentType')}
          />
          <Select
            label="Work Mode"
            options={WORK_MODES}
            error={errors.workMode?.message}
            {...register('workMode')}
          />
          <Select
            label="Experience Level"
            options={EXPERIENCE_LEVELS}
            error={errors.experienceLevel?.message}
            {...register('experienceLevel')}
          />
          <Input label="Category"  {...register('category')} />
          <Input label="Location"  {...register('location')} />
          <Input
            label="Salary Min"
            type="number"
            {...register('salaryMin', { valueAsNumber: true })}
          />
          <Input
            label="Salary Max"
            type="number"
            {...register('salaryMax', { valueAsNumber: true })}
          />
          <Input
            label="Number of Openings"
            type="number"
            {...register('numberOfOpenings', { valueAsNumber: true })}
          />
        </div>

        {serverError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {serverError}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={isSubmitting}>
            {existing ? 'Save Changes' : 'Create as Draft'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── JobCard ──────────────────────────────────────────────────────────────────
/**
 * Single job row in the recruiter list.
 * Shows status badge, view count, and action buttons:
 *   - Edit    (only for DRAFT / PAUSED jobs — active jobs can be edited too)
 *   - Status transition buttons (computed from nextStatuses())
 *   - View applicants (links to /recruiter/jobs/:id/applications)
 *   - Delete  (only for DRAFT jobs)
 */
function JobCard({
  job,
  onEdit,
  onChanged,
}: {
  job: JobPosting
  onEdit: () => void
  onChanged: () => void
}) {
  const navigate = useNavigate()

  const statusMutation = useMutation({
    mutationFn: (status: JobStatus) => updateJobStatus(job.id, status),
    onSuccess:  onChanged,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess:  onChanged,
  })

  const transitions = nextStatuses(job.status)

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{job.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <Badge jobStatus={job.status} label={job.status} />
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {job.viewCount} views
              </span>
              <span>{job.location ?? 'Remote / Flexible'}</span>
              <span>{job.employmentType.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {/* View applicants — navigates to a dedicated applications page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/recruiter/jobs/${job.id}/applications`)}
            >
              <Users className="mr-1 h-3.5 w-3.5" />
              Applicants
            </Button>

            {/* Edit — available for all non-terminal statuses */}
            {job.status !== 'CLOSED' && job.status !== 'EXPIRED' && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Status transition buttons */}
            {transitions.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === 'ACTIVE' ? 'primary' : next === 'CLOSED' ? 'danger' : 'outline'}
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate(next)}
              >
                {STATUS_LABELS[next]}
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            ))}

            {/* Delete — only for DRAFT jobs */}
            {job.status === 'DRAFT' && (
              <Button
                variant="ghost"
                size="sm"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            )}
          </div>
        </div>

        {/* Error feedback from status or delete mutations */}
        {(statusMutation.isError || deleteMutation.isError) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            Action failed. Please try again.
          </p>
        )}
      </CardBody>
    </Card>
  )
}

// ─── RecruiterJobsPage ────────────────────────────────────────────────────────
/**
 * Recruiter job management page — route: /recruiter/jobs
 *
 * Shows all jobs for the recruiter's company.
 * activeForm controls which panel is visible:
 *   null     → list only
 *   'new'    → create form above list
 *   job.id   → edit form inline for that job
 *
 * Before showing "New Job", we check that the company is VERIFIED —
 * the backend rejects job creation from unverified companies, so we
 * show a warning proactively instead of letting the API return an error.
 */
export function RecruiterJobsPage() {
  const queryClient = useQueryClient()
  // null = list, 'new' = create form, job.id string = edit form for that job
  const [activeForm, setActiveForm] = useState<'new' | string | null>(null)

  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ['myJobs'],
    queryFn:  getMyJobs,
  })

  // Fetch company to check verification status before allowing job creation
  const { data: company } = useQuery({
    queryKey: ['myCompany'],
    queryFn:  getMyCompany,
    retry: (_, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      return status !== 404
    },
  })

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['myJobs'] })
    setActiveForm(null)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-gray-500">
        Loading jobs...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-red-600">
        Failed to load jobs. Please try again.
      </div>
    )
  }

  const isVerified = company?.verificationStatus === 'VERIFIED'

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
        {/* Only show New Job button when no form is already open */}
        {activeForm === null && (
          <Button
            size="sm"
            onClick={() => setActiveForm('new')}
            disabled={!isVerified}
            title={!isVerified ? 'Company must be verified before posting jobs' : ''}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Job
          </Button>
        )}
      </div>

      {/* Warn if company not verified */}
      {!isVerified && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Your company must be verified by an admin before you can post jobs.
        </div>
      )}

      {/* Create form — shown above list when activeForm is 'new' */}
      {activeForm === 'new' && (
        <div className="mb-6">
          <JobForm onDone={handleSaved} />
        </div>
      )}

      {/* Empty state */}
      {(!jobs || jobs.length === 0) && activeForm !== 'new' && (
        <div className="py-16 text-center text-gray-500">
          <Pencil className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">No job postings yet</p>
          <p className="mt-1 text-sm">Create your first job to start receiving applications.</p>
        </div>
      )}

      {/* Job list */}
      <div className="flex flex-col gap-3">
        {jobs?.map((job) =>
          activeForm === job.id ? (
            // Edit form replaces the card for this job
            <JobForm key={job.id} existing={job} onDone={handleSaved} />
          ) : (
            <JobCard
              key={job.id}
              job={job}
              onEdit={() => setActiveForm(job.id)}
              onChanged={() => queryClient.invalidateQueries({ queryKey: ['myJobs'] })}
            />
          )
        )}
      </div>
    </div>
  )
}
