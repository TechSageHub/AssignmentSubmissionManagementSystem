import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { Assignment, Course } from '@/types'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { getTargetLevels } from '@/constants/academic'
import { Switch } from '@/components/ui/switch'

export default function EditAssignmentPage() {
  usePageTitle('Edit Assignment')
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const availableLevels = getTargetLevels(user?.level_scope || user?.levelScope)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [courseChoice, setCourseChoice] = useState('')
  const [showManualCourse, setShowManualCourse] = useState(false)
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [semester, setSemester] = useState('')
  const [targetLevel, setTargetLevel] = useState<string>('All Levels')
  const [acceptLate, setAcceptLate] = useState(true)
  const [lateCutoff, setLateCutoff] = useState('')
  const [showLatePolicy, setShowLatePolicy] = useState(false)
  const [publishDate, setPublishDate] = useState('')
  const [showScheduling, setShowScheduling] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data)).catch(() => {})
  }, [])

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
        setSemester((data as any).semester || '')
        setTargetLevel((data as any).target_level || availableLevels[0] || 'All Levels')
        if ((data as any).course_id) {
          setCourseChoice(String((data as any).course_id))
          setShowManualCourse(false)
        } else if ((data as any).course_code || (data as any).course_title) {
          setCourseChoice('MANUAL')
          setShowManualCourse(true)
        } else {
          setCourseChoice('')
          setShowManualCourse(false)
        }
        setCourseCode((data as any).course_code || '')
        setCourseTitle((data as any).course_title || '')
        setAcceptLate((data as any).accept_late_submissions !== false)
        const cutoff = (data as any).late_cutoff
        if (cutoff) {
          const c = new Date(cutoff)
          const pad = (n: number) => String(n).padStart(2, '0')
          setLateCutoff(`${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}T${pad(c.getHours())}:${pad(c.getMinutes())}`)
        }
        const publishedAt = (data as any).publish_date
        if (publishedAt) {
          const p = new Date(publishedAt)
          const pad = (n: number) => String(n).padStart(2, '0')
          setPublishDate(`${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}T${pad(p.getHours())}:${pad(p.getMinutes())}`)
        }
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
      const isManual = courseChoice === 'MANUAL'
      const isCourse = courseChoice && courseChoice !== 'MANUAL'
      await api.put(`/assignments/${id}`, {
        title: title.trim(),
        description,
        due_date: new Date(dueDate).toISOString(),
        course_id: isCourse ? Number(courseChoice) : undefined,
        course_code: isManual ? courseCode.trim() || null : undefined,
        course_title: isManual ? courseTitle.trim() || null : undefined,
        semester: semester.trim() || undefined,
        target_level: targetLevel || undefined,
        accept_late_submissions: acceptLate,
        late_cutoff: lateCutoff.trim() ? new Date(lateCutoff).toISOString() : '',
        publish_date: publishDate.trim() ? new Date(publishDate).toISOString() : '',
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
              <div className="space-y-2">
                <Label htmlFor="course">Course <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select
                  value={courseChoice}
                  onValueChange={(v) => {
                    setCourseChoice(v)
                    setShowManualCourse(v === 'MANUAL')
                  }}
                >
                  <SelectTrigger id="course"><SelectValue placeholder="Select a course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.code} · {c.title}</SelectItem>
                    ))}
                    <SelectItem value="MANUAL">Not listed — enter details manually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {showManualCourse && (
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
              )}
              <div className="space-y-2">
                <Label htmlFor="semester">Semester / Session <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="semester" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="e.g. 2024/2025 · 1st Sem" />
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
              <div className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-sm font-medium"
                  onClick={() => setShowScheduling(!showScheduling)}
                >
                  <span>Scheduling</span>
                  {showScheduling ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 rotate-180" />}
                </button>
                {showScheduling && (
                  <div className="border-t space-y-2 p-3">
                    <Label htmlFor="publishDate">Publish Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="publishDate" type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Leave empty to publish immediately. Students only see the assignment after this time.</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-sm font-medium"
                  onClick={() => setShowLatePolicy(!showLatePolicy)}
                >
                  <span>Submission Policy</span>
                  {showLatePolicy ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 rotate-180" />}
                </button>
                {showLatePolicy && (
                  <div className="border-t space-y-4 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Accept late submissions</p>
                        <p className="text-xs text-muted-foreground">Allow submissions after the due date</p>
                      </div>
                      <Switch checked={acceptLate} onCheckedChange={setAcceptLate} />
                    </div>
                    {acceptLate && (
                      <div className="space-y-2">
                        <Label htmlFor="lateCutoff">Late Submission Cutoff <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input id="lateCutoff" type="datetime-local" value={lateCutoff} onChange={(e) => setLateCutoff(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Leave empty to accept late submissions indefinitely.</p>
                      </div>
                    )}
                  </div>
                )}
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
