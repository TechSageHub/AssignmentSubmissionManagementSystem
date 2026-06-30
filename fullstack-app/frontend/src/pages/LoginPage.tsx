import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeOff, GraduationCap, CheckCircle2, BookOpen, Users, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const v = searchParams.get('verified')
    if (v === 'true') setVerified('Email verified successfully! You can now log in.')
    else if (v === 'error') setVerified('Verification link is invalid or expired.')
  }, [searchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
      toast.success('Successfully signed in.')
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      setError(msg || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    { icon: CheckCircle2, text: 'Submit assignments effortlessly' },
    { icon: BookOpen, text: 'Track deadlines and grades' },
    { icon: Users, text: 'Collaborate with lecturers' },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Left: Branding */}
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-12 text-white lg:flex">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/fpi-logo.png" alt="FPI Logo" className="h-10 w-10 rounded-xl bg-white object-contain shadow-lg" />
            <span className="text-lg font-semibold tracking-tight">FPI - ASMS</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md mx-auto w-full">
          {/* Illustration */}
          <div className="mb-10">
            <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-white/5 backdrop-blur-xl" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 opacity-20 blur-2xl" />
              <GraduationCap className="relative h-24 w-24 text-white/90" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Federal Polytechnic Ilaro<br />Assignment Submission System</h1>
            <p className="mt-3 text-base text-indigo-200/80 leading-relaxed">
              Streamline your academic workflow. Submit, track, and manage assignments all in one place.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit.text} className="flex items-center gap-3 text-sm text-indigo-200">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <benefit.icon className="h-4 w-4" />
                </div>
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-indigo-300/60">
          &copy; 2026 Federal Polytechnic Ilaro. All rights reserved.
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-4 lg:p-12">
        <Card className="w-full max-w-md border-slate-200 shadow-xl">
          <CardContent className="p-8">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
              <img src="/fpi-logo.png" alt="FPI Logo" className="h-9 w-9 rounded-lg bg-indigo-600 object-contain p-1" />
              <span className="text-lg font-semibold tracking-tight">FPI - ASMS</span>
            </div>

            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-1.5 text-sm text-slate-500">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {verified && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                  {verified}
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email or Username</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="name@university.edu or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                  <Link to="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/50 pr-10 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                pending={loading}
                className="h-11 w-full rounded-lg bg-indigo-600 text-sm font-medium shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/contact" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                Contact your administrator
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
