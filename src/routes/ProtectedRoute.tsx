import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types'

interface ProtectedRouteProps {
  allowedRoles: Role[]
}

/**
 * Wraps role-restricted routes. Used as a layout route in App.tsx:
 *
 *   <Route element={<ProtectedRoute allowedRoles={['SEEKER']} />}>
 *     <Route path="/seeker/dashboard" element={<SeekerDashboard />} />
 *   </Route>
 *
 * React Router renders <Outlet /> when the check passes, or redirects otherwise.
 * Two failure cases:
 *   1. Not authenticated  → send to /login
 *   2. Wrong role         → send to their own dashboard (e.g. a RECRUITER hitting
 *      a SEEKER-only route goes to /recruiter/dashboard instead of an error page)
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, token } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    const dashboardByRole: Record<Role, string> = {
      SEEKER:    '/seeker/dashboard',
      RECRUITER: '/recruiter/dashboard',
      ADMIN:     '/admin/dashboard',
    }
    return <Navigate to={dashboardByRole[user.role]} replace />
  }

  return <Outlet />
}
