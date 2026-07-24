import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getMyCompany, createCompany, updateCompany, uploadLogo, getLogoUrl } from '@/api/company'
import { Button }               from '@/components/ui/Button'
import { Input }                from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge }                from '@/components/ui/Badge'
import { Pencil, Upload, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const companySchema = z.object({
  companyName:      z.string().min(1, 'Company name is required'),
  displayName:      z.string().optional(),
  industry:         z.string().optional(),
  companySize:      z.string().optional(),
  foundedYear:      z.number().optional(),
  websiteUrl:       z.string().optional(),
  description:      z.string().optional(),
  headquartersCity: z.string().optional(),
})

type CompanyFields = z.infer<typeof companySchema>

// ─── VerificationBanner ───────────────────────────────────────────────────────
/**
 * Explains the current verification status to the recruiter.
 * PENDING  — admin hasn't reviewed yet, jobs cannot be posted
 * VERIFIED — approved, jobs can be posted
 * REJECTED — admin rejected with a reason, recruiter should update and re-submit
 * SUSPENDED — account suspended by admin
 */
function VerificationBanner({
  status,
  reason,
}: {
  status: string
  reason: string | null
}) {
  if (status === 'VERIFIED') {
    return (
      <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle className="h-4 w-4 shrink-0" />
        Your company is verified. You can post jobs.
      </div>
    )
  }
  if (status === 'PENDING') {
    return (
      <div className="flex items-center gap-2 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <Clock className="h-4 w-4 shrink-0" />
        Verification pending — an admin will review your profile before you can post jobs.
      </div>
    )
  }
  if (status === 'REJECTED') {
    return (
      <div className="flex flex-col gap-1 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>Your company profile was rejected.</span>
        </div>
        {reason && <p className="ml-6 text-red-600">Reason: {reason}</p>}
        <p className="ml-6">Update your profile and contact an admin to re-review.</p>
      </div>
    )
  }
  return null
}

// ─── CompanyForm ──────────────────────────────────────────────────────────────
/**
 * Used for both creating and editing.
 * If `existing` is provided the form is pre-filled and calls updateCompany on save.
 * Otherwise it calls createCompany.
 * `onDone` is called after a successful save so the parent can close the form
 * and refresh the cache.
 */
function CompanyForm({
  existing,
  onDone,
}: {
  existing?: CompanyFields & { id: string }
  onDone: () => void
}) {
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFields>({
    resolver: zodResolver(companySchema),
    defaultValues: existing
      ? {
          companyName:      existing.companyName,
          displayName:      existing.displayName      ?? '',
          industry:         existing.industry         ?? '',
          companySize:      existing.companySize      ?? '',
          foundedYear:      existing.foundedYear      ?? undefined,
          websiteUrl:       existing.websiteUrl       ?? '',
          description:      existing.description      ?? '',
          headquartersCity: existing.headquartersCity ?? '',
        }
      : {},
  })

  const onSubmit = async (data: CompanyFields) => {
    setServerError('')
    try {
      const payload = {
        companyName:      data.companyName,
        displayName:      data.displayName      || null,
        industry:         data.industry         || null,
        companySize:      data.companySize      || null,
        foundedYear:      data.foundedYear      ?? null,
        websiteUrl:       data.websiteUrl       || null,
        description:      data.description      || null,
        headquartersCity: data.headquartersCity || null,
      }
      if (existing) {
        await updateCompany(payload)
      } else {
        await createCompany(payload)
      }
      onDone()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setServerError(msg ?? 'Failed to save. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Company Name"
          error={errors.companyName?.message}
          {...register('companyName')}
          className="sm:col-span-2"
        />
        <Input label="Display Name"      {...register('displayName')} />
        <Input label="Industry"          {...register('industry')} />
        <Input label="Company Size"      placeholder="e.g. 11-50" {...register('companySize')} />
        <Input
          label="Founded Year"
          type="number"
          {...register('foundedYear', { valueAsNumber: true })}
        />
        <Input label="Website URL"       {...register('websiteUrl')} />
        <Input label="Headquarters City" {...register('headquartersCity')} />
      </div>

      {/* Description textarea — full width */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          {...register('description')}
        />
      </div>

      {serverError && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {serverError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>
          {existing ? 'Save Changes' : 'Create Company'}
        </Button>
        {existing && (
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        )}
      </div>
    </form>
  )
}

// ─── LogoSection ──────────────────────────────────────────────────────────────
/**
 * Shows the current logo (if any) and a file picker to replace it.
 * The logo URL is a direct backend streaming endpoint — we set it as <img src>
 * and the browser fetches it automatically (JWT is NOT needed because the
 * endpoint is public, matching /api/v1/company/profile/:id/logo in SecurityConfig).
 */
function LogoSection({ companyId, hasLogo, onUploaded }: {
  companyId: string
  hasLogo: boolean
  onUploaded: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess:  onUploaded,
    onError: () => setError('Upload failed. Use JPEG, PNG or WEBP under 2 MB.'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, or WEBP files are allowed.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be under 2 MB.')
      return
    }
    uploadMutation.mutate(file)
  }

  return (
    <div className="flex items-center gap-4">
      {/* Show existing logo or placeholder */}
      {hasLogo ? (
        <img
          src={getLogoUrl(companyId)}
          alt="Company logo"
          className="h-16 w-16 rounded-md object-cover border border-gray-200"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
          No logo
        </div>
      )}

      <div className="flex flex-col gap-1">
        {/* Hidden file input triggered by the button below */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          loading={uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {hasLogo ? 'Replace Logo' : 'Upload Logo'}
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-xs text-gray-400">JPEG / PNG / WEBP · max 2 MB</p>
      </div>
    </div>
  )
}

// ─── CompanyPage ──────────────────────────────────────────────────────────────
/**
 * Recruiter company profile page — route: /recruiter/company
 *
 * Two top-level states:
 *   1. No company yet (404)  → show create form
 *   2. Company exists        → show read view with edit + logo upload
 *
 * The verification status banner is always visible so the recruiter knows
 * whether they can post jobs (VERIFIED only).
 */
export function CompanyPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const {
    data: company,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['myCompany'],
    queryFn:  getMyCompany,
    // 404 means no company created yet — not a real error
    retry: (_, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      return status !== 404
    },
  })

  const handleSaved = () => {
    // Re-fetch company so the page reflects the latest data
    queryClient.invalidateQueries({ queryKey: ['myCompany'] })
    setEditing(false)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-gray-500">
        Loading...
      </div>
    )
  }

  const is404 = (error as { response?: { status?: number } })?.response?.status === 404
  const isRealError = isError && !is404

  if (isRealError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-red-600">
        Failed to load company profile. Please try again.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Company Profile</h1>

      {/* ── State A: no company yet — show create form ─────────────────── */}
      {!company || is404 ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Create your company profile</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Complete your profile and wait for admin verification before posting jobs.
            </p>
          </CardHeader>
          <CardBody>
            <CompanyForm onDone={handleSaved} />
          </CardBody>
        </Card>
      ) : (
        /* ── State B: company exists — show read view ───────────────────── */
        <div className="flex flex-col gap-4">
          {/* Verification status banner */}
          <VerificationBanner
            status={company.verificationStatus}
            reason={company.rejectionReason}
          />

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-900">{company.companyName}</h2>
                  <Badge verificationStatus={company.verificationStatus} label={company.verificationStatus} />
                </div>
                {!editing && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {editing ? (
                // Edit form — pre-filled with current values
                <CompanyForm
                  existing={{
                    id:               company.id,
                    companyName:      company.companyName,
                    displayName:      company.displayName      ?? undefined,
                    industry:         company.industry         ?? undefined,
                    companySize:      company.companySize      ?? undefined,
                    foundedYear:      company.foundedYear      ?? undefined,
                    websiteUrl:       company.websiteUrl       ?? undefined,
                    description:      company.description      ?? undefined,
                    headquartersCity: company.headquartersCity ?? undefined,
                  }}
                  onDone={handleSaved}
                />
              ) : (
                // Read-only field grid
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <Field label="Display Name"      value={company.displayName} />
                  <Field label="Industry"          value={company.industry} />
                  <Field label="Company Size"      value={company.companySize} />
                  <Field label="Founded Year"      value={company.foundedYear?.toString()} />
                  <Field label="Website"           value={company.websiteUrl} />
                  <Field label="Headquarters"      value={company.headquartersCity} />
                  {company.description && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-gray-500">Description</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-gray-700">{company.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Logo section — always visible in read mode */}
              {!editing && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">Company Logo</p>
                  <LogoSection
                    companyId={company.id}
                    hasLogo={company.hasLogo}
                    onUploaded={handleSaved}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

/** Small read-only label+value pair — renders nothing if value is empty */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  )
}
