import api from '@/lib/axios'
import type {
  ApiResponse,
  CandidateProfile,
  WorkExperience,
  Education,
  CandidateSkill,
  Resume,
  ProficiencyLevel,
} from '@/types'

/** Seeker — get the logged-in candidate's own profile */
export const getMyProfile = async (): Promise<CandidateProfile> => {
  const res = await api.get<ApiResponse<CandidateProfile>>('/candidate/profile')
  return res.data.data
}

/** Public — get any candidate's profile by ID (used by recruiters) */
export const getProfile = async (profileId: string): Promise<CandidateProfile> => {
  const res = await api.get<ApiResponse<CandidateProfile>>(`/candidate/profile/${profileId}`)
  return res.data.data
}

/**
 * Seeker — partial-update own profile fields.
 * The backend applies only non-null fields, so omitting a field leaves it unchanged.
 * profileScore is recalculated server-side after every update.
 */
export const updateProfile = async (
  data: Partial<CandidateProfile>
): Promise<CandidateProfile> => {
  const res = await api.put<ApiResponse<CandidateProfile>>('/candidate/profile', data)
  return res.data.data
}

// ── Work Experience ───────────────────────────────────────────────────────────

export const addExperience = async (
  data: Partial<WorkExperience>
): Promise<WorkExperience> => {
  const res = await api.post<ApiResponse<WorkExperience>>('/candidate/profile/experience', data)
  return res.data.data
}

export const updateExperience = async (
  id: string,
  data: Partial<WorkExperience>
): Promise<WorkExperience> => {
  const res = await api.put<ApiResponse<WorkExperience>>(
    `/candidate/profile/experience/${id}`,
    data
  )
  return res.data.data
}

export const deleteExperience = async (id: string): Promise<void> => {
  await api.delete(`/candidate/profile/experience/${id}`)
}

// ── Education ─────────────────────────────────────────────────────────────────

export const addEducation = async (data: Partial<Education>): Promise<Education> => {
  const res = await api.post<ApiResponse<Education>>('/candidate/profile/education', data)
  return res.data.data
}

export const updateEducation = async (
  id: string,
  data: Partial<Education>
): Promise<Education> => {
  const res = await api.put<ApiResponse<Education>>(
    `/candidate/profile/education/${id}`,
    data
  )
  return res.data.data
}

export const deleteEducation = async (id: string): Promise<void> => {
  await api.delete(`/candidate/profile/education/${id}`)
}

// ── Skills ────────────────────────────────────────────────────────────────────

/**
 * Seeker — add a skill.
 * The backend rejects duplicates (same skillName on the same profile).
 */
export const addSkill = async (data: {
  skillName: string
  proficiencyLevel: ProficiencyLevel
  yearsOfExperience?: number
}): Promise<CandidateSkill> => {
  const res = await api.post<ApiResponse<CandidateSkill>>('/candidate/profile/skills', data)
  return res.data.data
}

export const deleteSkill = async (id: string): Promise<void> => {
  await api.delete(`/candidate/profile/skills/${id}`)
}

// ── Resume ────────────────────────────────────────────────────────────────────

/** Seeker — get resume metadata (no file bytes — use downloadResume for the file) */
export const getResume = async (): Promise<Resume> => {
  const res = await api.get<ApiResponse<Resume>>('/candidate/resumes')
  return res.data.data
}

/**
 * Seeker — upload a resume (PDF or DOCX, max 5 MB).
 * Only one resume is allowed per candidate; delete the existing one first to replace it.
 * Must use multipart/form-data so the file bytes are transmitted correctly.
 */
export const uploadResume = async (file: File): Promise<Resume> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post<ApiResponse<Resume>>('/candidate/resumes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

/**
 * Seeker — download the resume as a file.
 * The backend streams raw bytes; we create a temporary object URL and
 * programmatically click a hidden link to trigger the browser's save dialog.
 */
export const downloadResume = async (): Promise<void> => {
  const res = await api.get('/candidate/resumes/download', { responseType: 'blob' })
  const url  = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'resume.pdf')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const deleteResume = async (): Promise<void> => {
  await api.delete('/candidate/resumes')
}
