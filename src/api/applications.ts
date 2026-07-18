import api from '@/lib/axios'
import type {
  ApiResponse,
  JobApplication,
  ApplicationDetail,
  ApplicationStatus,
} from '@/types'

/**
 * Seeker — submit a job application.
 * The backend validates that the job is ACTIVE, no duplicate application exists,
 * and the candidate has an uploaded resume before accepting.
 */
export const applyToJob = async (data: {
  jobId: string
  resumeId: string
  coverLetter?: string
}): Promise<JobApplication> => {
  const res = await api.post<ApiResponse<JobApplication>>('/applications', data)
  return res.data.data
}

/** Seeker — list all applications submitted by the logged-in candidate */
export const getMyApplications = async (): Promise<JobApplication[]> => {
  const res = await api.get<ApiResponse<JobApplication[]>>('/applications')
  return res.data.data
}

/**
 * Seeker — withdraw an application.
 * Only allowed while status is APPLIED; any further along and it's too late.
 */
export const withdrawApplication = async (applicationId: string): Promise<void> => {
  await api.delete(`/applications/${applicationId}`)
}

/** Recruiter — list all applicants for a specific job posting */
export const getJobApplications = async (
  jobId: string
): Promise<ApplicationDetail[]> => {
  const res = await api.get<ApiResponse<ApplicationDetail[]>>(
    `/recruiter/jobs/${jobId}/applications`
  )
  return res.data.data
}

/**
 * Recruiter — fetch full detail for one application.
 * The backend automatically transitions status APPLIED → VIEWED on first call,
 * indicating the recruiter has seen the application.
 */
export const getApplicationDetail = async (
  applicationId: string
): Promise<ApplicationDetail> => {
  const res = await api.get<ApiResponse<ApplicationDetail>>(
    `/recruiter/applications/${applicationId}`
  )
  return res.data.data
}

/**
 * Recruiter — move an application to the next pipeline stage.
 * Backend enforces: WITHDRAWN is terminal; HIRED / REJECTED are final states.
 * An optional recruiterNote is stored internally and never shown to the candidate.
 */
export const updateApplicationStatus = async (
  applicationId: string,
  status: ApplicationStatus,
  recruiterNote?: string
): Promise<ApplicationDetail> => {
  const res = await api.patch<ApiResponse<ApplicationDetail>>(
    `/recruiter/applications/${applicationId}/status`,
    { status, recruiterNote }
  )
  return res.data.data
}
