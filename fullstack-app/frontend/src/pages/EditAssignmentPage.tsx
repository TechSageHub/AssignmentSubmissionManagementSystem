import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/services/api'
import type { Assignment } from '@/types'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'

export default function EditAssignmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    api.get(`/assignments/${id}`)
      .then(({ data }: { data: Assignment }) => {
        setTitle(data.title)
        setDescription(data.description || '')
        setDueDate(new Date(data.due_date).toISOString().slice(0, 16))
        setCourseCode((data as any).course_code || '')
        setCourseTitle((data as any).course_title || '')
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
        due_date: dueDate,
        course_code: courseCode.trim() || undefined,
        course_title: courseTitle.trim() || undefined,
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
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
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
