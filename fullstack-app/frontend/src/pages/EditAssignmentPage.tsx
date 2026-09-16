import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { Assignment } from '@/types'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { getTargetLevels } from '@/constants/academic'

export default function EditAssignmentPage() {
  usePageTitle('Edit Assignment')
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const availableLevels = getTargetLevels(user?.level_scope || user?.levelScope)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [targetLevel, setTargetLevel] = useState<string>('All Levels')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    api.get(`/assignments/${id}`)
      .then(({ data }: { data: Assignment }) => {
        setTitle(data.title)
        setDescription(data.description || '')
        // The API returns an ISO instant (with Z); prefill the datetime-local
        // input using the user's local wall-clock time.
        const d = new Date(data.due_date)
        const pad = (n: number) => String(n).padStart(2, '0')
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        setDueDate(dateStr)
        setCourseCode((data as any).course_code || '')
        setCourseTitle((data as any).course_title || '')
        setTargetLevel((data as any).target_level || availableLevels[0] || 'All Levels')
      })
      .catch(() => navigate('/assignments'))
      .finally(() => setFetching(false))
  }, [id, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Title is required'); return }
    setLoading(true)
    try {
      await api.put(`/assignments/${id}`, {
        title: title.trim(),
        description,
        due_date: new Date(dueDate).toISOString(),
        course_code: courseCode.trim() || undefined,
        course_title: courseTitle.trim() || undefined,
        target_level: targetLevel || undefined,
      })
      navigate('/assignments')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      setError(msg || 'Failed to update assignment')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <Layout>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 rounded-xl" />
      </Layout>
    )
  }

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate('/assignments')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Button>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Edit Assignment</h1>
          <p className="text-muted-foreground">Update the assignment details</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>Modify the fields below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="courseCode">Course Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="courseCode" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. COM 411" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseTitle">Course Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="courseTitle" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g. Software Engineering" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetLevel">Target Academic Level</Label>
                  <Select value={targetLevel} onValueChange={setTargetLevel}>
                    <SelectTrigger id="targetLevel"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {availableLevels.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" pending={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/assignments')}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
