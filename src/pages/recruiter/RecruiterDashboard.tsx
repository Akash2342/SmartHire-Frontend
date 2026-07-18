import { useAuthStore } from '@/store/authStore'
import { Card, CardBody } from '@/components/ui/Card'
import { Link } from 'react-router-dom'
import { Building2, Briefcase, Users } from 'lucide-react'

export function RecruiterDashboard() {
  const { user } = useAuthStore()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Welcome back{user?.email ? `, ${user.email}` : ''}!
      </h1>
      <p className="mb-8 text-gray-500">Manage your jobs and candidates</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/recruiter/company">
          <Card className="cursor-pointer transition hover:shadow-md">
            <CardBody className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Company Profile</p>
                <p className="text-sm text-gray-500">Setup &amp; verification</p>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/recruiter/jobs">
          <Card className="cursor-pointer transition hover:shadow-md">
            <CardBody className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Job Postings</p>
                <p className="text-sm text-gray-500">Create &amp; manage jobs</p>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/recruiter/jobs">
          <Card className="cursor-pointer transition hover:shadow-md">
            <CardBody className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Applications</p>
                <p className="text-sm text-gray-500">Review candidates</p>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  )
}
