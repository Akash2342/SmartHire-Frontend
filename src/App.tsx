import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

// Auth pages
import { LoginPage }    from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

// Public pages
import { JobsPage }      from '@/pages/jobs/JobsPage'
import { JobDetailPage } from '@/pages/jobs/JobDetailPage'

// Seeker pages
import { SeekerDashboard }   from '@/pages/seeker/SeekerDashboard'
import { ResumePage }        from '@/pages/seeker/ResumePage'
import { ProfilePage }       from '@/pages/seeker/ProfilePage'
import { ApplicationsPage }  from '@/pages/seeker/ApplicationsPage'

// Other dashboards
import { RecruiterDashboard } from '@/pages/recruiter/RecruiterDashboard'
import { AdminDashboard }     from '@/pages/admin/AdminDashboard'

// Single QueryClient instance shared across the whole app.
// Caches API responses and deduplicates in-flight requests.
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Navbar is always visible on every page */}
        <Navbar />

        <main>
          <Routes>
            {/* Public routes — no auth required */}
            <Route path="/"            element={<Navigate to="/jobs" replace />} />
            <Route path="/login"       element={<LoginPage />} />
            <Route path="/register"    element={<RegisterPage />} />
            <Route path="/jobs"        element={<JobsPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />

            {/* Seeker-only routes */}
            <Route element={<ProtectedRoute allowedRoles={['SEEKER']} />}>
              <Route path="/seeker/dashboard"    element={<SeekerDashboard />} />
              <Route path="/seeker/resume"       element={<ResumePage />} />
              <Route path="/seeker/profile"      element={<ProfilePage />} />
              <Route path="/seeker/applications" element={<ApplicationsPage />} />
            </Route>

            {/* Recruiter-only routes */}
            <Route element={<ProtectedRoute allowedRoles={['RECRUITER']} />}>
              <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Catch-all — redirect unknown paths back to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
