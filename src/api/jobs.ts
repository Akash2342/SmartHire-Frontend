import api from '@/lib/axios'
import type {
  ApiResponse,
  PagedResponse,
  JobPosting,
  JobSearchParams,
  JobStatus,
} from '@/types'

/**
 * Public — search active jobs with optional filters and pagination.
 * Filters left undefined are ignored by the backend (all values match).
 */
export const searchJobs = async (
  params: JobSearchParams
): Promise<PagedResponse<JobPosting>> => {
  const res = await api.get<ApiResponse<PagedResponse<JobPosting>>>('/jobs', { params })
  return res.data.data
}

/**
 * Public — get a single ACTIVE job's full detail.
 * The backend increments the job's viewCount on this call.
 */
export const getJob = async (jobId: string): Promise<JobPosting> => {
  const res = await api.get<ApiResponse<JobPosting>>(`/jobs/${jobId}`)
  return res.data.data
}

/** Recruiter — list all job postings owned by the recruiter's company */
export const getMyJobs = async (): Promise<JobPosting[]> => {
  const res = await api.get<ApiResponse<JobPosting[]>>('/recruiter/jobs')
  return res.data.data
}

/** Recruiter — create a new job posting; starts in DRAFT status */
export const createJob = async (data: Partial<JobPosting>): Promise<JobPosting> => {
  const res = await api.post<ApiResponse<JobPosting>>('/recruiter/jobs', data)
  return res.data.data
}

/** Recruiter — update editable fields on an existing job */
export const updateJob = async (
  jobId: string,
  data: Partial<JobPosting>
): Promise<JobPosting> => {
  const res = await api.put<ApiResponse<JobPosting>>(`/recruiter/jobs/${jobId}`, data)
  return res.data.data
}

/**
 * Recruiter — transition a job through its status machine.
 * Allowed transitions enforced by the backend:
 *   DRAFT → ACTIVE, ACTIVE → PAUSED | CLOSED, PAUSED → ACTIVE | CLOSED
 */
export const updateJobStatus = async (
  jobId: string,
  status: JobStatus
): Promise<JobPosting> => {
  const res = await api.patch<ApiResponse<JobPosting>>(
    `/recruiter/jobs/${jobId}/status`,
    null,
    { params: { status } }
  )
  return res.data.data
}

/** Recruiter — delete a job; only allowed when status is DRAFT */
export const deleteJob = async (jobId: string): Promise<void> => {
  await api.delete(`/recruiter/jobs/${jobId}`)
}
