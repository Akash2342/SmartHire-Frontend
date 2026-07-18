import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Briefcase, User, LogOut } from 'lucide-react'

export function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const dashboardLink = user
    ? user.role === 'SEEKER'
      ? '/seeker/dashboard'
      : user.role === 'RECRUITER'
      ? '/recruiter/dashboard'
      : '/admin/dashboard'
    : null

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
          <Briefcase className="h-6 w-6" />
          SmartHire
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <Link to="/jobs" className="text-sm text-gray-600 hover:text-gray-900">
            Browse Jobs
          </Link>

          {user && dashboardLink && (
            <Link to={dashboardLink} className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
          )}

          {!user ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Sign Up
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <User className="h-4 w-4" />
                {user.email}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
