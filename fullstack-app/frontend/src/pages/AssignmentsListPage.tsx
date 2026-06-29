import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { readApiCache } from '@/services/api'
import type { Assignment } from '@/types'
import Layout from '@/components/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, ExternalLink, Calendar } from 'lucide-react'

interface AssignmentWithStatus extends Assignment {
  has_submitted: number
  is_late_submission: number
}

export default function AssignmentsListPage() {
  const [assignments, setAssignments] = useState<AssignmentWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const cachedAssignments = readApiCache<AssignmentWithStatus[]>('/assignments')
    if (cachedAssignments) {
      setAssignments(cachedAssignments)
      setLoading(false)
    }

    api.get('/assignments')
      .then(({ data }) => setAssignments(data))
      .catch(() => {
        if (!cachedAssignments) setAssignments([])
      })
      .finally(() => {
        if (!cachedAssignments) setLoading(false)
      })
  }, [])

  const statusBadge = (a: AssignmentWithStatus) => {
    if (a.has_submitted) return <Badge variant="success">Submitted</Badge>
    if (new Date() > new Date(a.due_date)) return <Badge variant="destructive">Overdue</Badge>
    return <Badge variant="warning">Pending</Badge>
  }

  const filtered = assignments.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase())
    if (filter === 'all') return matchSearch
    if (filter === 'submitted') return matchSearch && a.has_submitted
    if (filter === 'pending') return matchSearch && !a.has_submitted && new Date() <= new Date(a.due_date)
    if (filter === 'overdue') return matchSearch && !a.has_submitted && new Date() > new Date(a.due_date)
    return matchSearch
  })

  if (loading) {
    return (
      <Layout>
        <div className="mb-8"><h1 className="text-2xl font-bold tracking-tight">Assignments</h1></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">Browse and submit your assignments</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No assignments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Link key={a.id} to={`/assignments/${a.id}`} className="block">
              <Card className="transition-all duration-150 hover:shadow-md hover:border-primary/20">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">
                      {a.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      {(a as any).course_code && (
                        <span className="font-medium text-indigo-500">{(a as any).course_code}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(a.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {statusBadge(a)}
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  )
}
