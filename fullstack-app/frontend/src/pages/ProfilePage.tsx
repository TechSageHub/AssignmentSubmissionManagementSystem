import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import api from '@/services/api'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ErrorState } from '@/components/PageState'
import { User, Mail, Hash, BadgeCheck, Save } from 'lucide-react'
import { toast } from 'sonner'
import { DEPARTMENTS, STUDENT_LEVELS, LECTURER_LEVEL_SCOPES } from '@/constants/academic'

export default function ProfilePage() {
  usePageTitle('Profile')
  const { user, token } = useAuth()
  const [selectedDept, setSelectedDept] = useState('')
  const [customDept, setCustomDept] = useState('')
  const [programme, setProgramme] = useState('')
  const [level, setLevel] = useState('')
  const [levelScope, setLevelScope] = useState('both')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)

  const effectiveDepartment = selectedDept === 'OTHER' ? customDept.trim() : selectedDept

  useEffect(() => {
    if (user && token) {
      api.get('/auth/me').then(({ data }) => {
        const dept = (data as any).department || ''
        if (DEPARTMENTS.includes(dept as any)) {
          setSelectedDept(dept)
        } else if (dept) {
          setSelectedDept('OTHER')
          setCustomDept(dept)
        }
        setProgramme((data as any).programme || '')
        setLevel((data as any).level || '')
        setLevelScope((data as any).level_scope || (data as any).levelScope || 'both')
        setPhone((data as any).phone || '')
      }).catch(() => setLoadError(true)).finally(() => setLoading(false))
    }
  }, [user, token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/users/profile', {
        department: effectiveDepartment,
        programme,
        level,
        levelScope: user?.role === 'lecturer' ? levelScope : undefined,
        phone,
      })
      toast.success('Profile updated successfully')
      localStorage.setItem('user', JSON.stringify({ ...user, ...data }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      {loadError && (
        <div className="mb-6">
          <ErrorState message="Could not load your profile details." />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
              {user.username && (
                <p className="mt-1 text-xs text-muted-foreground">@{user.username}</p>
              )}
              <Separator className="my-4" />
              <div className="space-y-2 text-left text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{user.email}</span>
                </div>
                {user.student_id && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    <span>ID: {user.student_id}</span>
                  </div>
                )}
                {user.staff_id && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    <span>Staff: {user.staff_id}</span>
                  </div>
                )}
                {user.is_verified && (
                  <div className="flex items-center gap-2 text-green-600">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    <span>Email verified</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 rounded" />
                  <Skeleton className="h-10 rounded" />
                  <Skeleton className="h-10 rounded" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dept">Department</Label>
                      <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger id="dept" className="h-11">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                          <SelectItem value="OTHER">Other (Specify manually)</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedDept === 'OTHER' && (
                        <Input
                          className="mt-1.5"
                          value={customDept}
                          onChange={(e) => setCustomDept(e.target.value)}
                          placeholder="Type department name..."
                          required
                        />
                      )}
                    </div>
                    {user.role === 'student' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="programme">Programme</Label>
                          <Input id="programme" value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder="e.g. Computer Science" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="level">Level</Label>
                          <Select value={level} onValueChange={setLevel}>
                            <SelectTrigger id="level" className="h-11">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              {STUDENT_LEVELS.map((l) => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    {user.role === 'lecturer' && (
                      <div className="space-y-2">
                        <Label htmlFor="scope">Teaching Scope</Label>
                        <Select value={levelScope} onValueChange={setLevelScope}>
                          <SelectTrigger id="scope" className="h-11">
                            <SelectValue placeholder="Select teaching scope" />
                          </SelectTrigger>
                          <SelectContent>
                            {LECTURER_LEVEL_SCOPES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Restricts the level of assignments you can create (ND, HND, or both).</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 08031234567" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
