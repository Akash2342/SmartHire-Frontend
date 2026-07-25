import { useEffect, useState } from 'react'
import { getDashboard } from '@/api/admin'
import type { AdminDashboard } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Link } from 'react-router-dom'
import { Users, Briefcase, FileText, Clock } from 'lucide-react'

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboard | null>(null)

  useEffect(() => {
    getDashboard().then(setStats).catch(console.error)
  }, [])

  const tiles = stats
    ? [
        { label: 'Candidates',           value: stats.totalCandidates,      icon: Users,     color: 'blue',   link: '/admin/users?role=SEEKER'    },
        { label: 'Recruiters',           value: stats.totalRecruiters,      icon: Users,     color: 'green',  link: '/admin/users?role=RECRUITER'  },
        { label: 'Active Jobs',          value: stats.totalActiveJobs,              icon: Briefcase, color: 'purple', link: '/jobs'           },
        { label: 'Total Applications',   value: stats.totalApplications,            icon: FileText,  color: 'yellow', link: '#'               },
        { label: 'Pending Verifications',value: stats.pendingCompanyVerifications,  icon: Clock,     color: 'red',    link: '/admin/companies' },
      ]
    : []

  const colorMap: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-600',
    green:  'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red:    'bg-red-100 text-red-600',
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {stats === null ? (
        <p className="text-gray-500">Loading stats...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map(({ label, value, icon: Icon, color, link }) => (
            <Link key={label} to={link}>
              <Card className="cursor-pointer transition hover:shadow-md">
                <CardBody className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className={`rounded-full p-3 ${colorMap[color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-4">
        <Link to="/admin/companies" className="text-sm text-blue-600 hover:underline">
          → Review pending company verifications
        </Link>
        <Link to="/admin/users" className="text-sm text-blue-600 hover:underline">
          → Manage users
        </Link>
      </div>
    </div>
  )
}
