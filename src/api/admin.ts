import api from '@/lib/axios'
import type {
  ApiResponse,
  PagedResponse,
  AdminDashboard,
  AdminUser,
  CompanyProfile,
  Role,
  VerificationStatus,
} from '@/types'

/** Admin — platform-level stats: total candidates, recruiters, active jobs, applications, pending verifications */
export const getDashboard = async (): Promise<AdminDashboard> => {
  const res = await api.get<ApiResponse<AdminDashboard>>('/admin/dashboard')
  return res.data.data
}

/** Admin — paginated user list, optionally filtered by role */
export const getUsers = async (params: {
  role?: Role
  page?: number
  size?: number
}): Promise<PagedResponse<AdminUser>> => {
  const res = await api.get<ApiResponse<PagedResponse<AdminUser>>>('/admin/users', { params })
  return res.data.data
}

/**
 * Admin — activate or deactivate a user account.
 * The backend prevents admins from deactivating their own account.
 */
export const setUserActive = async (
  userId: string,
  active: boolean
): Promise<void> => {
  await api.patch(`/admin/users/${userId}/status`, null, { params: { active } })
}

/** Admin — list companies, optionally filtered by verification status */
export const getCompanies = async (params: {
  status?: VerificationStatus
  page?: number
  size?: number
}): Promise<PagedResponse<CompanyProfile>> => {
  const res = await api.get<ApiResponse<PagedResponse<CompanyProfile>>>('/admin/companies', {
    params,
  })
  return res.data.data
}

/**
 * Admin — approve or reject a company verification request.
 * REJECT requires a non-blank rejectionReason (enforced by the backend).
 * APPROVE sets verificationStatus → VERIFIED, unlocking job posting for that recruiter.
 */
export const verifyCompany = async (
  companyId: string,
  action: 'APPROVE' | 'REJECT',
  rejectionReason?: string
): Promise<CompanyProfile> => {
  const res = await api.patch<ApiResponse<CompanyProfile>>(
    `/admin/companies/${companyId}/verify`,
    { action, rejectionReason }
  )
  return res.data.data
}
