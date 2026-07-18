import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { Briefcase } from 'lucide-react'
import { useState } from 'react'

// Zod schema defines validation rules
const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()
  const [serverError, setServerError] = useState('')

  const {
    register,   // binds input to form state
    handleSubmit, // wraps onSubmit with validation
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const response = await login(data)
      storeLogin(response)
      // Redirect to the correct dashboard based on role
      const dashboardByRole = {
        SEEKER:    '/seeker/dashboard',
        RECRUITER: '/recruiter/dashboard',
        ADMIN:     '/admin/dashboard',
      }
      navigate(dashboardByRole[response.role])
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please try again.'
      setServerError(msg)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <Briefcase className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-600">Sign in to your SmartHire account</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              {serverError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </p>
              )}

              <Button type="submit" loading={isSubmitting} className="w-full">
                Sign In
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
