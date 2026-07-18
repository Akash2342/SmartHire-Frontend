import { create } from 'zustand'
import type { AuthResponse, Role } from '@/types'

interface AuthUser {
  userId: string
  email: string
  role: Role
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  login: (data: AuthResponse) => void
  logout: () => void
  isAuthenticated: () => boolean
}

/**
 * Extracts the `sub` claim (userId UUID) from a JWT payload.
 * The JWT is three base64url segments separated by dots — we only need
 * the middle one (the payload). We use atob() so no external library is needed.
 */
function parseJwtSub(token: string): string {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload)).sub as string
}

// ── Session rehydration on page load ─────────────────────────────────────────
// These run at module-load time (before React mounts) so the store's initial
// state is already populated when ProtectedRoute first checks authentication.
const storedToken = localStorage.getItem('token')
const storedUser  = localStorage.getItem('user')

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,

  /**
   * Called after a successful login or register API response.
   * Decodes userId from the JWT `sub` claim — the backend doesn't send it
   * in the response body, but it's always present in the token payload.
   */
  login: (data: AuthResponse) => {
    const user: AuthUser = {
      userId: parseJwtSub(data.accessToken),
      email: data.email,
      role: data.role,
    }
    localStorage.setItem('token', data.accessToken)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token: data.accessToken, user })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },

  isAuthenticated: () => !!get().token && !!get().user,
}))
