import { useAuthStore } from '@/store/authStore'
import { Card, CardBody } from '@/components/ui/Card'
import { Link } from 'react-router-dom'
import { User, FileText, Briefcase } from 'lucide-react'

export function SeekerDashboard() {
  const { user } = useAuthStore()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Welcome back{user?.email ? `, ${user.email}` : ''}!
      </h1>
      <p className="mb-8 text-gray-500">Your job search hub</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/seeker/profile">
          <Card className="cursor-pointer transition hover:shadow-md">
            <CardBody className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">My Profile</p>
                <p className="text-sm text-gray-500">Edit info &amp; skills</p>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/seeker/resume">
          <Card className="cursor-pointer transition hover:shadow-md">
            <CardBody className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Resume</p>
                <p className="text-sm text-gray-500">Upload / download</p>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link to="/seeker/applications">
          <Card className="cursor-pointer transition hover:shadow-md">
            <CardBody className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Applications</p>
                <p className="text-sm text-gray-500">Track your progress</p>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  )
}
