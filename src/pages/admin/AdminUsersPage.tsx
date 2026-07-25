import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, setUserActive } from '@/api/admin'
import type { AdminUser, Role } from '@/types'
import { Badge }          from '@/components/ui/Badge'
import { Button }         from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Select }         from '@/components/ui/Select'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Role filter options ──────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: '',          label: 'All Roles'  },
  { value: 'SEEKER',    label: 'Seekers'    },
  { value: 'RECRUITER', label: 'Recruiters' },
  { value: 'ADMIN',     label: 'Admins'     },
]

/** Format an ISO timestamp to a readable date */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── UserRow ──────────────────────────────────────────────────────────────────
/**
 * Single user row with an activate/deactivate toggle.
 *
 * The toggle calls setUserActive(userId, !current). The backend prevents
 * an admin from deactivating their own account — if that happens the API
 * returns an error which we surface inline.
 *
 * After the mutation the user list is re-fetched via invalidateQueries
 * so the button state reflects the updated isActive value.
 */
function UserRow({
  user,
  onChanged,
}: {
  user: AdminUser
  onChanged: () => void
}) {
  const toggleMutation = useMutation({
    mutationFn: () => setUserActive(user.id, !user.active),
    onSuccess:  onChanged,
  })

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4 text-sm text-gray-900">{user.email}</td>
      <td className="py-3 pr-4">
        {/* Role shown as a coloured badge */}
        <Badge
          label={user.role}
          variant={
            user.role === 'ADMIN'     ? 'purple'
            : user.role === 'RECRUITER' ? 'blue'
            : 'gray'
          }
        />
      </td>
      <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {toggleMutation.isError && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Failed
            </span>
          )}
          <Button
            size="sm"
            variant={user.active ? 'danger' : 'outline'}
            loading={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate()}
          >
            {user.active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ─── AdminUsersPage ───────────────────────────────────────────────────────────
/**
 * Admin user management page — route: /admin/users
 *
 * Role filter and page number live in the URL query string so that:
 *   - Refreshing the page keeps the current filter/page
 *   - The browser back button restores the previous view
 *
 * Pagination: the backend returns PagedResponse<AdminUser> with totalPages.
 * We show previous/next buttons and disable them at the boundaries.
 */
export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const role = (searchParams.get('role') ?? '') as Role | ''
  const page = Number(searchParams.get('page') ?? '0')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminUsers', { role, page }],
    queryFn:  () => getUsers({ role: role || undefined, page, size: 20 }),
  })

  const handleRoleChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set('role', value)
      else next.delete('role')
      next.delete('page') // reset to first page on filter change
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

  const handleChanged = () => {
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Users</h1>

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <Select
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="w-40"
        />
        {data && (
          <span className="text-sm text-gray-500">
            {data.totalElements} user{data.totalElements !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading && (
        <p className="text-center text-sm text-gray-500">Loading users...</p>
      )}

      {isError && (
        <p className="text-center text-sm text-red-600">Failed to load. Please try again.</p>
      )}

      {/* User table */}
      {data && data.content.length > 0 && (
        <Card>
          <CardBody className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((user) => (
                  <UserRow key={user.id} user={user} onChanged={handleChanged} />
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {data?.content.length === 0 && (
        <p className="py-12 text-center text-gray-500">No users found.</p>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={page === 0}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {data.totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={data.last}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
