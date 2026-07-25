import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getMyProfile,
  updateProfile,
  addExperience, updateExperience, deleteExperience,
  addEducation,  updateEducation,  deleteEducation,
  addSkill,      deleteSkill,
} from '@/api/candidate'
import type {
  CandidateProfile, WorkExperience, Education, CandidateSkill,
  EmploymentType, NoticePeriod, ProficiencyLevel,
} from '@/types'
import { Button }       from '@/components/ui/Button'
import { Input }        from '@/components/ui/Input'
import { Select }       from '@/components/ui/Select'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Pencil, Trash2, Plus, AlertCircle } from 'lucide-react'

// ─── Option lists (mirror backend enums) ─────────────────────────────────────

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'FULL_TIME',  label: 'Full Time'   },
  { value: 'PART_TIME',  label: 'Part Time'   },
  { value: 'CONTRACT',   label: 'Contract'    },
  { value: 'INTERNSHIP', label: 'Internship'  },
  { value: 'FREELANCE',  label: 'Freelance'   },
]

const NOTICE_PERIOD_OPTIONS = [
  { value: 'IMMEDIATE',     label: 'Immediate'    },
  { value: 'FIFTEEN_DAYS',  label: '15 Days'      },
  { value: 'ONE_MONTH',     label: '1 Month'      },
  { value: 'TWO_MONTHS',    label: '2 Months'     },
  { value: 'THREE_MONTHS',  label: '3 Months'     },
]

const PROFICIENCY_OPTIONS = [
  { value: 'BEGINNER',     label: 'Beginner'     },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'EXPERT',       label: 'Expert'       },
]

// ─── Zod schemas (validation rules for each form) ────────────────────────────

const basicInfoSchema = z.object({
  firstName:        z.string().min(1, 'Required'),
  lastName:         z.string().min(1, 'Required'),
  phone:            z.string().optional(),
  city:             z.string().optional(),
  headline:         z.string().optional(),
  summary:          z.string().optional(),
  linkedinUrl:      z.string().optional(),
  githubUrl:        z.string().optional(),
  portfolioUrl:     z.string().optional(),
  noticePeriod:     z.string().optional(),
  preferredJobType: z.string().optional(),
  expectedSalaryMin: z.number().optional(),
  expectedSalaryMax: z.number().optional(),
})

const experienceSchema = z.object({
  companyName:    z.string().min(1, 'Required'),
  jobTitle:       z.string().min(1, 'Required'),
  employmentType: z.string().min(1, 'Required'),
  startDate:      z.string().min(1, 'Required'),
  endDate:        z.string().optional(),
  isCurrent:      z.boolean().optional(),
  description:    z.string().optional(),
})

const educationSchema = z.object({
  institutionName: z.string().min(1, 'Required'),
  degree:          z.string().min(1, 'Required'),
  fieldOfStudy:    z.string().optional(),
  startYear:       z.number().min(1900).max(2100),
  endYear:         z.number().optional(),
  grade:           z.string().optional(),
})

const skillSchema = z.object({
  skillName:         z.string().min(1, 'Required'),
  proficiencyLevel:  z.string().min(1, 'Required'),
  yearsOfExperience: z.number().optional(),
})

// Infer TypeScript types from the schemas so we don't define them twice
type BasicInfoFields   = z.infer<typeof basicInfoSchema>
type ExperienceFields  = z.infer<typeof experienceSchema>
type EducationFields   = z.infer<typeof educationSchema>
type SkillFields       = z.infer<typeof skillSchema>

// ─── ProfileScoreBar ──────────────────────────────────────────────────────────
/**
 * Visual indicator of profile completeness (0–100).
 * The backend calculates this score across 6 criteria: basic info, headline,
 * experience, education, skills, and social links.
 * Colour changes: red → yellow → green as the score improves.
 */
function ProfileScoreBar({ score }: { score: number }) {
  const colour =
    score >= 70 ? 'bg-green-500'
    : score >= 40 ? 'bg-yellow-500'
    : 'bg-red-500'

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Profile Completeness</span>
          <span className="text-sm font-semibold text-gray-900">{score}%</span>
        </div>
        {/* Track bar */}
        <div className="h-2 w-full rounded-full bg-gray-200">
          {/* Fill bar — width is driven by the score value */}
          <div
            className={`h-2 rounded-full transition-all ${colour}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Complete your profile to stand out to recruiters.
        </p>
      </CardBody>
    </Card>
  )
}

// ─── BasicInfoSection ─────────────────────────────────────────────────────────
/**
 * Editable card for top-level profile fields.
 * Clicking "Edit" replaces the read view with a form.
 * On save, we call updateProfile() and invalidate the profile cache.
 */
function BasicInfoSection({
  profile,
  onSaved,
}: {
  profile: CandidateProfile
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BasicInfoFields>({
    resolver: zodResolver(basicInfoSchema),
    // Pre-fill form with current profile values
    defaultValues: {
      firstName:         profile.firstName         ?? '',
      lastName:          profile.lastName          ?? '',
      phone:             profile.phone             ?? '',
      city:              profile.city              ?? '',
      headline:          profile.headline          ?? '',
      summary:           profile.summary           ?? '',
      linkedinUrl:      profile.linkedinUrl      ?? '',
      githubUrl:         profile.githubUrl         ?? '',
      portfolioUrl:      profile.portfolioUrl      ?? '',
      noticePeriod:      profile.noticePeriod      ?? '',
      preferredJobType:  profile.preferredJobType  ?? '',
      expectedSalaryMin: profile.expectedSalaryMin ?? undefined,
      expectedSalaryMax: profile.expectedSalaryMax ?? undefined,
    },
  })

  const handleCancel = () => {
    // reset() restores all field values back to defaultValues
    reset()
    setEditing(false)
  }

  const onSubmit = async (data: BasicInfoFields) => {
    setServerError('')
    try {
      await updateProfile({
        firstName:         data.firstName         || null,
        lastName:          data.lastName          || null,
        phone:             data.phone             || null,
        city:              data.city              || null,
        headline:          data.headline          || null,
        summary:           data.summary           || null,
        linkedinUrl:       data.linkedinUrl       || null,
        githubUrl:         data.githubUrl         || null,
        portfolioUrl:      data.portfolioUrl      || null,
        noticePeriod:      (data.noticePeriod as NoticePeriod)       || null,
        preferredJobType:  (data.preferredJobType as EmploymentType) || null,
        expectedSalaryMin: data.expectedSalaryMin ?? null,
        expectedSalaryMax: data.expectedSalaryMax ?? null,
      })
      onSaved()
      setEditing(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setServerError(msg ?? 'Failed to save. Please try again.')
    }
  }

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Basic Info</h2>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {/* Read-only display grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <Field label="Name"     value={[profile.firstName, profile.lastName].filter(Boolean).join(' ')} />
            <Field label="Phone"    value={profile.phone} />
            <Field label="City"     value={profile.city} />
            <Field label="Headline" value={profile.headline} />
            <Field label="Notice"   value={profile.noticePeriod?.replace(/_/g, ' ')} />
            <Field label="Job Type" value={profile.preferredJobType?.replace(/_/g, ' ')} />
            <Field
              label="Expected Salary"
              value={profile.expectedSalaryMin || profile.expectedSalaryMax
                ? `${profile.salaryCurrency ?? 'INR'} ${profile.expectedSalaryMin ?? '?'} – ${profile.expectedSalaryMax ?? '?'}`
                : null}
            />
            <Field label="LinkedIn"  value={profile.linkedinUrl} />
            <Field label="GitHub"    value={profile.githubUrl} />
            <Field label="Portfolio" value={profile.portfolioUrl} />
          </div>
          {profile.summary && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Summary</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.summary}</p>
            </div>
          )}
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-gray-900">Basic Info</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="First Name" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last Name"  error={errors.lastName?.message}  {...register('lastName')} />
            <Input label="Phone"      {...register('phone')} />
            <Input label="City"       {...register('city')} />
            <Input label="Headline"   {...register('headline')} className="sm:col-span-2" />
          </div>

          {/* Summary textarea — full width */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Summary</label>
            <textarea
              rows={3}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('summary')}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Notice Period"
              placeholder="Select..."
              options={NOTICE_PERIOD_OPTIONS}
              {...register('noticePeriod')}
            />
            <Select
              label="Preferred Job Type"
              placeholder="Select..."
              options={EMPLOYMENT_TYPE_OPTIONS}
              {...register('preferredJobType')}
            />
            <Input label="Expected Salary Min" type="number" {...register('expectedSalaryMin', { valueAsNumber: true })} />
            <Input label="Expected Salary Max" type="number" {...register('expectedSalaryMax', { valueAsNumber: true })} />
            <Input label="LinkedIn URL"  {...register('linkedinUrl')} />
            <Input label="GitHub URL"    {...register('githubUrl')} />
            <Input label="Portfolio URL" {...register('portfolioUrl')} className="sm:col-span-2" />
          </div>

          <div className="flex flex-col gap-2">
            {serverError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {serverError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={isSubmitting}>Save</Button>
              <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

// ─── Small read-only field ────────────────────────────────────────────────────
/** Label + value pair used in the read-only view. Renders nothing if value is empty. */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  )
}

// ─── ExperienceSection ────────────────────────────────────────────────────────
/**
 * List of work experience entries.
 *
 * editingId controls which form is visible:
 *   'new'    → the add-new form is shown at the top
 *   item.id  → that item's inline edit form is shown instead of its card
 *   null     → only read-only cards are shown
 */
function ExperienceSection({
  experiences,
  onSaved,
}: {
  experiences: WorkExperience[]
  onSaved: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Work Experience</h2>
          {editingId === null && (
            <Button variant="ghost" size="sm" onClick={() => setEditingId('new')}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {/* Add-new form — shown when editingId is 'new' */}
        {editingId === 'new' && (
          <ExperienceForm
            onSave={onSaved}
            onCancel={() => setEditingId(null)}
            onDone={() => setEditingId(null)}
          />
        )}

        {experiences.length === 0 && editingId !== 'new' && (
          <p className="text-sm text-gray-500">No work experience added yet.</p>
        )}

        {experiences.map((exp) =>
          editingId === exp.id ? (
            // Edit form replaces the card for this specific item
            <ExperienceForm
              key={exp.id}
              existing={exp}
              onSave={onSaved}
              onCancel={() => setEditingId(null)}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <ExperienceCard
              key={exp.id}
              exp={exp}
              onEdit={() => setEditingId(exp.id)}
              onDeleted={onSaved}
            />
          )
        )}
      </CardBody>
    </Card>
  )
}

// ─── ExperienceCard ───────────────────────────────────────────────────────────
function ExperienceCard({
  exp,
  onEdit,
  onDeleted,
}: {
  exp: WorkExperience
  onEdit: () => void
  onDeleted: () => void
}) {
  const deleteMutation = useMutation({
    mutationFn: () => deleteExperience(exp.id),
    onSuccess:  onDeleted,
  })

  return (
    <div className="rounded-md border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{exp.jobTitle}</p>
          <p className="text-sm text-gray-600">{exp.companyName} · {exp.employmentType.replace('_', ' ')}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {exp.startDate} – {exp.isCurrent ? 'Present' : (exp.endDate ?? '—')}
          </p>
          {exp.description && (
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{exp.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="sm"
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── ExperienceForm ───────────────────────────────────────────────────────────
/**
 * Used for both adding and editing work experience.
 * If `existing` is provided, the form is pre-filled and calls updateExperience.
 * Otherwise it calls addExperience.
 */
function ExperienceForm({
  existing,
  onSave,
  onCancel,
  onDone,
}: {
  existing?: WorkExperience
  onSave: () => void
  onCancel: () => void
  onDone: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExperienceFields>({
    resolver: zodResolver(experienceSchema),
    defaultValues: existing
      ? {
          companyName:    existing.companyName,
          jobTitle:       existing.jobTitle,
          employmentType: existing.employmentType,
          startDate:      existing.startDate,
          endDate:        existing.endDate ?? '',
          isCurrent:      existing.isCurrent,
          description:    existing.description ?? '',
        }
      : { isCurrent: false },
  })

  const onSubmit = async (data: ExperienceFields) => {
    const payload = {
      ...data,
      employmentType: data.employmentType as EmploymentType,
      endDate:        data.endDate || null,
      description:    data.description || null,
    }
    if (existing) {
      await updateExperience(existing.id, payload)
    } else {
      await addExperience(payload)
    }
    onSave()
    onDone()
  }

  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-700">
        {existing ? 'Edit Experience' : 'Add Experience'}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Company Name" error={errors.companyName?.message} {...register('companyName')} />
          <Input label="Job Title"    error={errors.jobTitle?.message}    {...register('jobTitle')} />
          <Select
            label="Employment Type"
            options={EMPLOYMENT_TYPE_OPTIONS}
            error={errors.employmentType?.message}
            {...register('employmentType')}
          />
          <Input label="Start Date" type="date" error={errors.startDate?.message} {...register('startDate')} />
          <Input label="End Date"   type="date" {...register('endDate')} />
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="isCurrent" {...register('isCurrent')} />
            <label htmlFor="isCurrent" className="text-sm text-gray-700">Currently working here</label>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={3}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            {...register('description')}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={isSubmitting}>
            {existing ? 'Update' : 'Add'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

// ─── EducationSection ─────────────────────────────────────────────────────────
/** Same pattern as ExperienceSection — editingId controls which form is visible */
function EducationSection({
  educations,
  onSaved,
}: {
  educations: Education[]
  onSaved: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Education</h2>
          {editingId === null && (
            <Button variant="ghost" size="sm" onClick={() => setEditingId('new')}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {editingId === 'new' && (
          <EducationForm
            onSave={onSaved}
            onCancel={() => setEditingId(null)}
            onDone={() => setEditingId(null)}
          />
        )}

        {educations.length === 0 && editingId !== 'new' && (
          <p className="text-sm text-gray-500">No education added yet.</p>
        )}

        {educations.map((edu) =>
          editingId === edu.id ? (
            <EducationForm
              key={edu.id}
              existing={edu}
              onSave={onSaved}
              onCancel={() => setEditingId(null)}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <EducationCard
              key={edu.id}
              edu={edu}
              onEdit={() => setEditingId(edu.id)}
              onDeleted={onSaved}
            />
          )
        )}
      </CardBody>
    </Card>
  )
}

// ─── EducationCard ────────────────────────────────────────────────────────────
function EducationCard({
  edu,
  onEdit,
  onDeleted,
}: {
  edu: Education
  onEdit: () => void
  onDeleted: () => void
}) {
  const deleteMutation = useMutation({
    mutationFn: () => deleteEducation(edu.id),
    onSuccess:  onDeleted,
  })

  return (
    <div className="rounded-md border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{edu.degree} in {edu.fieldOfStudy}</p>
          <p className="text-sm text-gray-600">{edu.institutionName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {edu.startYear} – {edu.endYear ?? 'Present'}
            {edu.grade ? ` · ${edu.grade}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="sm"
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── EducationForm ────────────────────────────────────────────────────────────
function EducationForm({
  existing,
  onSave,
  onCancel,
  onDone,
}: {
  existing?: Education
  onSave: () => void
  onCancel: () => void
  onDone: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EducationFields>({
    resolver: zodResolver(educationSchema),
    defaultValues: existing
      ? {
          institutionName: existing.institutionName,
          degree:          existing.degree,
          fieldOfStudy:    existing.fieldOfStudy,
          startYear:       existing.startYear,
          endYear:         existing.endYear ?? undefined,
          grade:           existing.grade ?? '',
        }
      : {},
  })

  const onSubmit = async (data: EducationFields) => {
    const payload = { ...data, endYear: data.endYear || null, grade: data.grade || null }
    if (existing) {
      await updateEducation(existing.id, payload)
    } else {
      await addEducation(payload)
    }
    onSave()
    onDone()
  }

  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 p-4 flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-700">
        {existing ? 'Edit Education' : 'Add Education'}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Institution" error={errors.institutionName?.message} {...register('institutionName')} className="sm:col-span-2" />
          <Input label="Degree"      error={errors.degree?.message}          {...register('degree')} />
          <Input label="Field of Study" {...register('fieldOfStudy')} />
          <Input label="Start Year"  type="number" error={errors.startYear?.message} {...register('startYear', { valueAsNumber: true })} />
          <Input label="End Year"    type="number" {...register('endYear', { valueAsNumber: true })} />
          <Input label="Grade / GPA" {...register('grade')} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={isSubmitting}>
            {existing ? 'Update' : 'Add'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

// ─── SkillsSection ────────────────────────────────────────────────────────────
/**
 * Skills list — add and delete only (no edit endpoint on backend).
 * Skills are shown as chips; clicking the × deletes them.
 */
function SkillsSection({
  skills,
  onSaved,
}: {
  skills: CandidateSkill[]
  onSaved: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SkillFields>({
    resolver: zodResolver(skillSchema),
    defaultValues: { proficiencyLevel: 'INTERMEDIATE' },
  })

  const onSubmit = async (data: SkillFields) => {
    setServerError('')
    try {
      await addSkill({
        skillName:         data.skillName,
        proficiency:       data.proficiencyLevel as ProficiencyLevel,
        yearsOfExperience: data.yearsOfExperience,
      })
      onSaved()
      reset()
      setShowForm(false)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      // 409 means duplicate skill name — show a specific message
      setServerError(status === 409
        ? 'You already have this skill.'
        : 'Failed to add skill. Please try again.'
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Skills</h2>
          {!showForm && (
            <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {/* Skill chips */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <SkillChip key={skill.id} skill={skill} onDeleted={onSaved} />
            ))}
          </div>
        )}

        {skills.length === 0 && !showForm && (
          <p className="text-sm text-gray-500">No skills added yet.</p>
        )}

        {/* Add skill form */}
        {showForm && (
          <div className="rounded-md border border-blue-100 bg-blue-50 p-4 flex flex-col gap-3">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  label="Skill Name"
                  error={errors.skillName?.message}
                  {...register('skillName')}
                />
                <Select
                  label="Proficiency"
                  options={PROFICIENCY_OPTIONS}
                  error={errors.proficiencyLevel?.message}
                  {...register('proficiencyLevel')}
                />
                <Input
                  label="Years of Experience"
                  type="number"
                  {...register('yearsOfExperience', { valueAsNumber: true })}
                />
              </div>

              {serverError && (
                <p className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {serverError}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={isSubmitting}>Add Skill</Button>
                <Button
                  type="button" size="sm" variant="ghost"
                  onClick={() => { setShowForm(false); reset(); setServerError('') }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// ─── SkillChip ────────────────────────────────────────────────────────────────
/** Pill showing skill name + proficiency with a delete button */
function SkillChip({
  skill,
  onDeleted,
}: {
  skill: CandidateSkill
  onDeleted: () => void
}) {
  const deleteMutation = useMutation({
    mutationFn: () => deleteSkill(skill.id),
    onSuccess:  onDeleted,
  })

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
      {skill.skillName}
      <span className="text-xs text-blue-500">· {skill.proficiency.toLowerCase()}</span>
      <button
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="ml-0.5 text-blue-400 hover:text-red-500 disabled:opacity-50"
        aria-label={`Remove ${skill.skillName}`}
      >
        ×
      </button>
    </span>
  )
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
/**
 * Root component for /seeker/profile.
 *
 * Fetches the full candidate profile once — all four sections (basic info,
 * experience, education, skills) receive data as props.
 *
 * Every mutation in a child section calls `onSaved`, which runs
 * queryClient.invalidateQueries({ queryKey: ['myProfile'] }).
 * This re-fetches the whole profile, updating all sections and the score bar
 * in one go without any manual state synchronisation.
 */
export function ProfilePage() {
  const queryClient = useQueryClient()

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['myProfile'],
    queryFn:  getMyProfile,
  })

  // Called by every child section after a successful mutation
  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['myProfile'] })
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-gray-500">
        Loading profile...
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-red-600">
        Failed to load profile. Please try again.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="flex flex-col gap-6">
        <ProfileScoreBar score={profile.profileScore} />
        <BasicInfoSection   profile={profile}                  onSaved={handleSaved} />
        <ExperienceSection  experiences={profile.workExperiences} onSaved={handleSaved} />
        <EducationSection   educations={profile.educations}    onSaved={handleSaved} />
        <SkillsSection      skills={profile.skills}            onSaved={handleSaved} />
      </div>
    </div>
  )
}
