import { useEffect, useState, type FormEvent } from 'react'
import api, { readApiCache } from '@/services/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorState, EmptyState } from '@/components/PageState'
import { toast } from 'sonner'
import { BookOpen, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'

interface Course {
  id: number
  code: string
  title: string
  department: string | null
  created_at: string
  assignment_count?: number
}

interface CoursePageResponse {
  items: Course[]
  total: number
  limit: number
  offset: number
}

const PAGE_SIZE = 20

function buildPageNumbers(current: number, last: number): (number | '...')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const result: (number | '...')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(last - 1, current + 1)
  if (start > 2) result.push('...')
  for (let p = start; p <= end; p++) result.push(p)
  if (end < last - 1) result.push('...')
  result.push(last)
  return result
}

export default function CourseManagementPage() {
  usePageTitle('Courses')
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [saving, setSaving] = useState(false)

  const cacheKey = `/admin/courses?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ''}`
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchCourses = async (useCache = true) => {
    setError(false)
    const cached = useCache ? readApiCache<CoursePageResponse>(cacheKey) : null
    if (cached) {
      setCourses(cached.items)
      setTotal(cached.total)
      setLoading(false)
    } else {
      setLoading(true)
    }
    try {
      const { data } = await api.get(cacheKey)
      setCourses(data.items)
      setTotal(data.total)
    } catch {
      if (!cached) setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    fetchCourses(true)
  }, [cacheKey, refreshKey])

  const openCreate = () => {
    setEditing(null)
    setCode('')
    setTitle('')
    setDepartment('')
    setDialogOpen(true)
  }

  const openEdit = (course: Course) => {
    setEditing(course)
    setCode(course.code)
    setTitle(course.title)
    setDepartment(course.department || '')
    setDialogOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/courses/${editing.id}`, { code, title, department: department || undefined })
        toast.success('Course updated')
      } else {
        await api.post('/admin/courses', { code, title, department: department || undefined })
        toast.success('Course created')
      }
      setDialogOpen(false)
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Failed to save course')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Delete course "${course.code} — ${course.title}"? Assignments linked to it will keep their course code/title but be unlinked.`)) return
    try {
      await api.delete(`/admin/courses/${course.id}`)
      toast.success('Course deleted')
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Failed to delete course')
    }
  }

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">Manage the course catalog lecturers pick from when creating assignments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Catalog
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by code or title..."
              className="w-full pl-8 sm:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : error ? (
            <ErrorState message="Could not load the course list." onRetry={() => fetchCourses(false)} />
          ) : courses.length === 0 ? (
            <EmptyState
              title={search ? 'No courses match your search.' : 'No courses yet'}
              description={search ? undefined : "Click 'Add Course' to build the catalog lecturers use when creating assignments."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Code</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Assignments</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id} className="border-b last:border-0">
                      <td className="py-3 font-semibold text-indigo-600">{course.code}</td>
                      <td className="py-3 font-medium">{course.title}</td>
                      <td className="py-3 text-muted-foreground">{course.department || '—'}</td>
                      <td className="py-3 text-muted-foreground">{course.assignment_count ?? 0}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(course)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(course)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {buildPageNumbers(page, totalPages).map((p, i) =>
                      p === '...' ? (
                        <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          className="min-w-9"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Course' : 'Add Course'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="co-code">Course Code</Label>
              <Input id="co-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. COM 411" required maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-title">Course Title</Label>
              <Input id="co-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Software Engineering" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-dept">Department <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="co-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" pending={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Course'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}