import api from '@/lib/axios'
import type { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@/types'

/** Authenticate an existing user and return a JWT access token + role */
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', data)
  return res.data.data
}

/**
 * Register a new user. The backend auto-creates an empty CandidateProfile
 * for SEEKER accounts so they can start filling in details immediately.
 * Returns a JWT just like login, so the user is signed in right after registering.
 */
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/register', data)
  return res.data.data
}
