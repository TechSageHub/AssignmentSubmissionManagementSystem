import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react'

export default function ChangePasswordPage() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const forced = !!user?.mustChangePassword

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      updateUser({ mustChangePassword: false })
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      setError(msg || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle>Change your password</CardTitle>
          <CardDescription>
            {forced
              ? 'For security, you must set your own password before continuing.'
              : 'Update your account password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cp-current">Current Password</Label>
              <Input
                id="cp-current"
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Your temporary password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-new">New Password</Label>
              <div className="relative">
                <Input
                  id="cp-new"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  className="pr-10"
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
              <Label htmlFor="cp-confirm">Confirm New Password</Label>
              <Input
                id="cp-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                minLength={8}
                required
              />
            </div>

            <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
              {loading ? 'Saving...' : (<>Change Password <ArrowRight className="h-4 w-4" /></>)}
            </Button>
          </form>

          {forced && (
            <button
              onClick={logout}
              className="mt-6 w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Sign out instead
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
