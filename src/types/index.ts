// ─── Enums ────────────────────────────────────────────────────────────────────
// These string-literal union types mirror the Java enums on the backend exactly.
// If a backend enum value changes, update it here too.

export type Role = 'SEEKER' | 'RECRUITER' | 'ADMIN'

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP'
  | 'FREELANCE'

export type WorkMode = 'ON_SITE' | 'REMOTE' | 'HYBRID'

export type ExperienceLevel =
  | 'FRESHER'
  | 'JUNIOR'
  | 'MID'
  | 'SENIOR'
  | 'LEAD'

export type JobStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED'

export type ApplicationStatus =
  | 'APPLIED'
  | 'VIEWED'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'

export type VerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'

export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'

export type NoticePeriod =
  | 'IMMEDIATE'
  | 'FIFTEEN_DAYS'
  | 'ONE_MONTH'
  | 'TWO_MONTHS'
  | 'THREE_MONTHS'

// ─── API Envelope ─────────────────────────────────────────────────────────────
// Every backend response is wrapped in one of these two shapes.
// API functions unwrap them (res.data.data) before returning, so callers
// never see the envelope — they only deal with the inner type T.

/** Single-item response wrapper */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

/** Paginated response wrapper — used by job search, admin user list, etc. */
export interface PagedResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean   // true when this is the final page
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  role: Role
}

/**
 * Returned by both /auth/login and /auth/register.
 * Note: the backend field is `accessToken`, not `token`.
 * The userId is NOT included — authStore.ts decodes it from the JWT `sub` claim.
 */
export interface AuthResponse {
  accessToken: string
  email: string
  role: Role
}

// ─── Candidate Profile ───────────────────────────────────────────────────────

export interface WorkExperience {
  id: string
  companyName: string
  jobTitle: string
  employmentType: EmploymentType
  startDate: string       // ISO date string "YYYY-MM-DD"
  endDate: string | null
  isCurrent: boolean
  description: string | null
}

export interface Education {
  id: string
  institutionName: string
  degree: string
  fieldOfStudy: string
  startYear: number
  endYear: number | null
  grade: string | null
}

export interface CandidateSkill {
  id: string
  skillName: string
  proficiency: ProficiencyLevel   // backend field is `proficiency`, not `proficiencyLevel`
  yearsOfExperience: number | null
}

export interface CandidateProfile {
  id: string
  userId: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  city: string | null
  headline: string | null
  summary: string | null
  linkedinUrl: string | null    // backend field is `linkedinUrl` (lowercase i)
  githubUrl: string | null
  portfolioUrl: string | null
  noticePeriod: NoticePeriod | null
  preferredJobType: EmploymentType | null
  expectedSalaryMin: number | null
  expectedSalaryMax: number | null
  salaryCurrency: string | null
  /** 0–100 score calculated server-side across completeness criteria */
  profileScore: number
  workExperiences: WorkExperience[]
  educations: Education[]
  skills: CandidateSkill[]
}

// ─── Resume ───────────────────────────────────────────────────────────────────
// Metadata only — file bytes are never sent to the frontend except on download.

export interface Resume {
  id: string
  originalFileName: string
  fileType: string
  fileSizeBytes: number
  uploadedAt: string
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface CompanyProfile {
  id: string
  recruiterEmail: string   // backend sends email, not userId
  companyName: string
  displayName: string | null
  industry: string | null
  companySize: string | null
  foundedYear: number | null
  websiteUrl: string | null
  description: string | null
  headquartersCity: string | null
  hasLogo: boolean          // backend computes this from logo BYTEA column
  verificationStatus: VerificationStatus
  rejectionReason: string | null
}

// ─── Job Posting ──────────────────────────────────────────────────────────────

export interface JobPosting {
  id: string
  companyId: string
  companyName: string
  companyHasLogo: boolean
  title: string
  description: string
  requirements: string | null
  category: string | null
  location: string | null
  employmentType: EmploymentType
  workMode: WorkMode
  experienceLevel: ExperienceLevel
  minYearsExperience: number | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  isSalaryVisible: boolean
  numberOfOpenings: number | null
  applicationDeadline: string | null  // ISO date "YYYY-MM-DD"
  status: JobStatus
  viewCount: number
  postedAt: string | null
  createdAt: string
}

export interface JobSearchParams {
  keyword?: string
  location?: string
  category?: string
  employmentType?: EmploymentType
  workMode?: WorkMode
  experienceLevel?: ExperienceLevel
  minSalary?: number
  page?: number
  size?: number
}

// ─── Application ─────────────────────────────────────────────────────────────

/** Candidate-facing application view — excludes internal recruiter fields */
export interface JobApplication {
  id: string
  jobId: string
  jobTitle: string
  companyName: string
  candidateProfileId: string
  resumeId: string
  coverLetter: string | null
  status: ApplicationStatus
  appliedAt: string
}

/** Recruiter-facing application view — includes candidate info and recruiter note */
export interface ApplicationDetail extends JobApplication {
  recruiterNote: string | null
  candidateFirstName: string | null
  candidateLastName: string | null
  candidateHeadline: string | null
  candidateCity: string | null
  candidateProfileScore: number
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminDashboard {
  totalCandidates: number
  totalRecruiters: number
  activeJobs: number
  totalApplications: number
  pendingVerifications: number
}

export interface AdminUser {
  id: string
  email: string
  role: Role
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
}
