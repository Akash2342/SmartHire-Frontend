import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompanies, verifyCompany } from '@/api/admin'
import type { AdminCompany, VerificationStatus } from '@/types'
import { Badge }          from '@/components/ui/Badge'
import { Button }         from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { CheckCircle, XCircle, Building2, AlertCircle } from 'lucide-react'

// ─── CompanyCard ──────────────────────────────────────────────────────────────
/**
 * Single company row in the admin verification list.
 *
 * APPROVE — one click, no extra input needed.
 * REJECT  — clicking "Reject" reveals an inline textarea for the rejection reason.
 *           The backend requires a non-blank reason on REJECT, so we enforce this
 *           client-side before sending.
 *
 * After either action, onActioned() invalidates the companies cache so the list
 * refreshes and the card either disappears (if filtered to PENDING) or updates
 * its badge.
 */
function CompanyCard({
  company,
  onActioned,
}: {
  company: AdminCompany
  onActioned: () => void
}) {
  // Controls whether the reject form is open
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason]         = useState('')
  const [reasonError, setReasonError] = useState('')

  const approveMutation = useMutation({
    mutationFn: () => verifyCompany(company.id, 'APPROVE'),
    onSuccess:  onActioned,
  })

  const rejectMutation = useMutation({
    mutationFn: () => verifyCompany(company.id, 'REJECT', reason),
    onSuccess:  onActioned,
  })

  const handleReject = () => {
    // Enforce non-blank reason before calling the API
    if (!reason.trim()) {
      setReasonError('Rejection reason is required.')
      return
    }
    setReasonError('')
    rejectMutation.mutate()
  }

  const isPending = company.verificationStatus === 'PENDING'

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Company name + verification status badge */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
              <p className="font-semibold text-gray-900">{company.companyName}</p>
              <Badge verificationStatus={company.verificationStatus} label={company.verificationStatus} />
            </div>

            {/* Meta info */}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500">
              <span>{company.ownerEmail}</span>
              {company.industry   && <span>{company.industry}</span>}
              {company.companySize && <span>{company.companySize} employees</span>}
              {company.website    && <span>{company.website}</span>}
            </div>

            {/* Show existing rejection reason if already rejected */}
            {company.rejectionReason && (
              <p className="mt-1 text-xs text-red-600">
                Rejected: {company.rejectionReason}
              </p>
            )}
          </div>

          {/* Action buttons — only shown for PENDING companies */}
          {isPending && !rejectOpen && (
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setRejectOpen(true)}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          )}
        </div>

        {/* Inline reject form — shown when reject button is clicked */}
        {rejectOpen && (
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
            <label className="text-sm font-medium text-gray-700">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Explain why this company is being rejected..."
              value={reason}
              onChange={(e) => { setReason(e.target.value); setReasonError('') }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {reasonError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {reasonError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                loading={rejectMutation.isPending}
                onClick={handleReject}
              >
                Confirm Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setRejectOpen(false); setReason(''); setReasonError('') }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Error from approve mutation */}
        {approveMutation.isError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            Approve failed. Please try again.
          </p>
        )}
      </CardBody>
    </Card>
  )
}

// ─── AdminCompaniesPage ───────────────────────────────────────────────────────
/**
 * Admin company verification page — route: /admin/companies
 *
 * Two tabs:
 *   Pending — companies waiting for review (default)
 *   All     — every company regardless of status
 *
 * The active tab controls the `status` filter passed to getCompanies().
 * After any approve/reject action, the list re-fetches automatically via
 * queryClient.invalidateQueries.
 */
export function AdminCompaniesPage() {
  const queryClient = useQueryClient()
  // 'PENDING' = show only pending, undefined = show all
  const [filter, setFilter] = useState<VerificationStatus | undefined>('PENDING')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminCompanies', filter],
    queryFn:  () => getCompanies({ status: filter }),
  })

  const handleActioned = () => {
    // Invalidate both tabs so switching shows fresh data
    queryClient.invalidateQueries({ queryKey: ['adminCompanies'] })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Company Verifications</h1>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {(['PENDING', undefined] as (VerificationStatus | undefined)[]).map((f) => {
          const label = f === 'PENDING' ? 'Pending' : 'All'
          const active = filter === f
          return (
            <button
              key={label}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {/* Show count badge next to Pending tab */}
              {f === 'PENDING' && data && (
                <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                  {data.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isLoading && (
        <p className="text-center text-sm text-gray-500">Loading companies...</p>
      )}

      {isError && (
        <p className="text-center text-sm text-red-600">Failed to load. Please try again.</p>
      )}

      {data?.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">
            {filter === 'PENDING' ? 'No pending verifications' : 'No companies found'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data?.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            onActioned={handleActioned}
          />
        ))}
      </div>
    </div>
  )
}
