import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { register as registerApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { Briefcase } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.enum(['SEEKER', 'RECRUITER']),
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'SEEKER' },
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const response = await registerApi(data)
      storeLogin(response)
      navigate(response.role === 'SEEKER' ? '/seeker/dashboard' : '/recruiter/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.'
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
          <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
          <p className="mt-1 text-sm text-gray-600">Join SmartHire today</p>
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
                placeholder="Min. 8 characters"
                error={errors.password?.message}
                {...register('password')}
              />

              {/* Role selector */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['SEEKER', 'RECRUITER'] as const).map((role) => (
                    <label
                      key={role}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 p-3 hover:border-blue-400"
                    >
                      <input
                        type="radio"
                        value={role}
                        className="text-blue-600"
                        {...register('role')}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {role === 'SEEKER' ? 'Job Seeker' : 'Recruiter'}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.role && (
                  <p className="text-xs text-red-600">{errors.role.message}</p>
                )}
              </div>

              {serverError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </p>
              )}

              <Button type="submit" loading={isSubmitting} className="w-full">
                Create Account
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
