import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, EyeOff, UserPlus, ArrowRight, BookOpen, CheckCircle2, Clock } from 'lucide-react'

const levels = ['ND I', 'ND II', 'HND I', 'HND II']

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'student' | 'lecturer'>('student')
  const [studentId, setStudentId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [department, setDepartment] = useState('')
  const [programme, setProgramme] = useState('')
  const [level, setLevel] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await register({
        name, email, password, role,
        username: username || undefined,
        studentId: role === 'student' ? studentId : undefined,
        staffId: role === 'lecturer' ? staffId : undefined,
        department: department || undefined,
        programme: role === 'student' ? programme : undefined,
        level: role === 'student' ? level : undefined,
        phone: phone || undefined,
      })
      setSuccess('Registration successful! Please check your email to verify your account.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      setError(msg || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    { icon: BookOpen, text: 'Access course assignments' },
    { icon: CheckCircle2, text: 'Track your submissions' },
    { icon: Clock, text: 'Never miss a deadline' },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Left: Branding */}
      <div className="relative hidden flex-1 flex-col justify-between bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/fpi-logo.png" alt="FPI Logo" className="h-10 w-10 rounded-xl bg-white object-contain shadow-lg" />
            <span className="text-lg font-semibold tracking-tight">FPI - ASMS</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md mx-auto w-full">
          <div className="mb-10">
            <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-white/5 backdrop-blur-xl" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 opacity-20 blur-2xl" />
              <UserPlus className="relative h-24 w-24 text-white/90" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Join the Platform</h1>
            <p className="mt-3 text-base text-indigo-200/80 leading-relaxed">
              Create your account and start managing your academic journey efficiently.
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
      <div className="flex flex-1 items-center justify-center bg-white p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center justify-center gap-2 lg:hidden">
            <img src="/fpi-logo.png" alt="FPI Logo" className="h-9 w-9 rounded-lg bg-indigo-600 object-contain p-1" />
            <span className="text-lg font-semibold tracking-tight">FPI - ASMS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create account</h2>
            <p className="mt-1.5 text-sm text-slate-500">Get started with your free account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reg-name" className="text-sm font-medium text-slate-700">Full Name</Label>
              <Input
                id="reg-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-password" className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
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

            <div className="space-y-1.5">
              <Label htmlFor="reg-role" className="text-sm font-medium text-slate-700">I am a</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'student' | 'lecturer')}>
                <SelectTrigger id="reg-role" className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="lecturer">Lecturer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-username" className="text-sm font-medium text-slate-700">Username <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                id="reg-username"
                type="text"
                placeholder="e.g. john.doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-xs text-slate-400">Auto-generated from your name if left empty</p>
            </div>

            {role === 'student' && (
              <>
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Student Details</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-student-id" className="text-sm font-medium text-slate-700">Student ID / Matric Number</Label>
                  <Input
                    id="reg-student-id"
                    type="text"
                    placeholder="e.g. ND/ICT/2024/0001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-dept" className="text-sm font-medium text-slate-700">Department</Label>
                  <Input
                    id="reg-dept"
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-programme" className="text-sm font-medium text-slate-700">Programme</Label>
                  <Input
                    id="reg-programme"
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={programme}
                    onChange={(e) => setProgramme(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-level" className="text-sm font-medium text-slate-700">Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger id="reg-level" className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="e.g. 08031234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </>
            )}

            {role === 'lecturer' && (
              <>
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Lecturer Details</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-staff-id" className="text-sm font-medium text-slate-700">Staff ID</Label>
                  <Input
                    id="reg-staff-id"
                    type="text"
                    placeholder="e.g. FPI/STAFF/001"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-lect-dept" className="text-sm font-medium text-slate-700">Department</Label>
                  <Input
                    id="reg-lect-dept"
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-lect-phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
                  <Input
                    id="reg-lect-phone"
                    type="tel"
                    placeholder="e.g. 08031234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 rounded-lg border-slate-200 bg-slate-50/50 transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-lg bg-indigo-600 text-sm font-medium shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
