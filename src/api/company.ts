import api from '@/lib/axios'
import type { ApiResponse, CompanyProfile } from '@/types'

/**
 * Recruiter — create a company profile.
 * Each recruiter account can have only one company profile.
 * It starts in PENDING verification status; an admin must APPROVE it
 * before the recruiter can post jobs.
 */
export const createCompany = async (
  data: Partial<CompanyProfile>
): Promise<CompanyProfile> => {
  const res = await api.post<ApiResponse<CompanyProfile>>('/company/profile', data)
  return res.data.data
}

/** Recruiter — get own company profile */
export const getMyCompany = async (): Promise<CompanyProfile> => {
  const res = await api.get<ApiResponse<CompanyProfile>>('/company/profile')
  return res.data.data
}

/** Public — get any company's profile by ID */
export const getCompany = async (companyId: string): Promise<CompanyProfile> => {
  const res = await api.get<ApiResponse<CompanyProfile>>(`/company/profile/${companyId}`)
  return res.data.data
}

/** Recruiter — partial-update company fields (null fields are left unchanged) */
export const updateCompany = async (
  data: Partial<CompanyProfile>
): Promise<CompanyProfile> => {
  const res = await api.put<ApiResponse<CompanyProfile>>('/company/profile', data)
  return res.data.data
}

/**
 * Recruiter — upload a company logo (JPEG / PNG / WEBP, max 2 MB).
 * The logo is stored as BYTEA in the database and served via getLogoUrl().
 */
export const uploadLogo = async (file: File): Promise<void> => {
  const formData = new FormData()
  formData.append('file', file)
  await api.post('/company/profile/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * Returns a URL that streams the logo bytes directly from the backend.
 * Use as <img src={getLogoUrl(companyId)} /> — no extra fetch needed.
 */
export const getLogoUrl = (companyId: string): string =>
  `/api/v1/company/profile/${companyId}/logo`
