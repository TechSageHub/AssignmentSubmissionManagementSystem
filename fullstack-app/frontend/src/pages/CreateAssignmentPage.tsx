import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import RubricBuilder from '@/components/RubricBuilder'

export default function CreateAssignmentPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [criteria, setCriteria] = useState<{ name: string; maxScore: number }[]>([])
  const [showRubric, setShowRubric] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Title is required'); return }
    if (!dueDate) { setError('Due date is required'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/assignments', {
        title: title.trim(),
        description,
        due_date: dueDate,
        course_code: courseCode.trim() || undefined,
        course_title: courseTitle.trim() || undefined,
      })
      if (criteria.length > 0) {
        await api.put(`/assignments/${data.id}/rubric`, { criteria })
      }
      navigate('/assignments')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      setError(msg || 'Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate('/assignments')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Button>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Create Assignment</h1>
          <p className="text-muted-foreground">Set up a new assignment for your students</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>Fill in the information below</CardDescription>
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
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midterm Essay" required />
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
                <Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the assignment requirements..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>

              <div className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-sm font-medium"
                  onClick={() => setShowRubric(!showRubric)}
                >
                  <span>Grading Rubric <span className="text-muted-foreground font-normal">(optional)</span></span>
                  {showRubric ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {showRubric && (
                  <div className="border-t p-3">
                    <RubricBuilder criteria={criteria} onChange={setCriteria} />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Assignment'}
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
