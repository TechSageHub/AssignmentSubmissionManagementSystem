import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import api, { readApiCache } from '@/services/api'
import type { Assignment } from '@/types'
import Layout from '@/components/Layout'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  BookOpen,
  ArrowRight,
} from 'lucide-react'

interface DashboardStats {
  totalAssignments?: number
  totalSubmissions?: number
  pendingGrading?: number
  averageScore?: number
  pendingAssignments?: number
  submittedCount?: number
  gradedCount?: number
  overdueCount?: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({})
  const [assignments, setAssignments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const cachedAssignments = readApiCache<Assignment[]>('/assignments')
      const cachedSubmissions = readApiCache<any[]>(user?.role === 'lecturer' ? '/submissions' : '/submissions/mine')

      if (cachedAssignments) setAssignments(cachedAssignments)
      if (cachedSubmissions) {
        setSubmissions(cachedSubmissions)
        if (user?.role === 'lecturer') {
          setStats({
            totalAssignments: cachedAssignments?.length ?? 0,
            totalSubmissions: cachedSubmissions.length,
            pendingGrading: cachedSubmissions.filter((s: { score?: number | null }) => s.score == null).length,
            averageScore: cachedSubmissions.filter((s: { score?: number | null }) => s.score != null).length > 0
              ? Math.round(cachedSubmissions.filter((s: { score?: number | null }) => s.score != null).reduce((a: number, s: { score: number }) => a + s.score, 0) / cachedSubmissions.filter((s: { score?: number | null }) => s.score != null).length)
              : 0,
          })
        } else {
          const now = new Date()
          const submittedIds = new Set(cachedSubmissions.map((s: { assignment_id: number }) => s.assignment_id))
          setStats({
            pendingAssignments: cachedAssignments?.filter((a: { id: number }) => !submittedIds.has(a.id)).length ?? 0,
            submittedCount: cachedSubmissions.length,
            gradedCount: cachedSubmissions.filter((s: { score?: number | null }) => s.score != null).length,
            overdueCount: cachedAssignments?.filter((a: { id: number; due_date: string }) =>
              new Date(a.due_date) < now && !submittedIds.has(a.id)
            ).length ?? 0,
          })
        }
      }

      if (cachedAssignments || cachedSubmissions) {
        setLoading(false)
      } else {
        setLoading(true)
      }

      try {
        if (user?.role === 'lecturer') {
          const [assignmentsRes, submissionsRes] = await Promise.all([
            api.get('/assignments'),
            api.get('/submissions'),
          ])
          setAssignments(assignmentsRes.data)
          setSubmissions(submissionsRes.data)
          setStats({
            totalAssignments: assignmentsRes.data.length,
            totalSubmissions: submissionsRes.data.length,
            pendingGrading: submissionsRes.data.filter((s: { score?: number | null }) => s.score == null).length,
            averageScore: submissionsRes.data.filter((s: { score?: number | null }) => s.score != null).length > 0
              ? Math.round(submissionsRes.data.filter((s: { score?: number | null }) => s.score != null).reduce((a: number, s: { score: number }) => a + s.score, 0) / submissionsRes.data.filter((s: { score?: number | null }) => s.score != null).length)
              : 0,
          })
        } else {
          const now = new Date()
          const [submissions, allAssignments] = await Promise.all([
            api.get('/submissions/mine'),
            api.get('/assignments').catch(() => ({ data: [] })),
          ])
          const submittedIds = new Set(submissions.data.map((s: { assignment_id: number }) => s.assignment_id))
          setAssignments(allAssignments.data)
          setStats({
            pendingAssignments: allAssignments.data.filter((a: { id: number }) => !submittedIds.has(a.id)).length,
            submittedCount: submissions.data.length,
            gradedCount: submissions.data.filter((s: { score?: number | null }) => s.score != null).length,
            overdueCount: allAssignments.data.filter((a: { id: number; due_date: string }) =>
              new Date(a.due_date) < now && !submittedIds.has(a.id)
            ).length,
          })
        }
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [user])

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  if (user?.role === 'lecturer') {
    const now = new Date()
    const attentionItems = assignments
      .map((a: any) => {
        const dueDate = new Date(a.due_date)
        return {
          ...a,
          isOverdue: dueDate < now,
          dueSoon: dueDate >= now && dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        }
      })
      .filter((a: any) => a.isOverdue || a.dueSoon)
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5)

    const recentSubmissions = [...submissions]
      .sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
      .slice(0, 5)

    const lecturerCards = [
      { title: 'Active Assignments', value: assignments.length, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
      { title: 'Submissions', value: submissions.length, icon: FileText, color: 'text-indigo-600 bg-indigo-50' },
      { title: 'Pending Grading', value: stats.pendingGrading ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
      { title: 'Overdue', value: attentionItems.filter((a: any) => a.isOverdue).length, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
      { title: 'Due This Week', value: attentionItems.filter((a: any) => a.dueSoon).length, icon: CalendarDays, color: 'text-green-600 bg-green-50' },
    ]

    return (
      <Layout>
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Academic Dashboard</h1>
            <p className="text-muted-foreground">Track assignments, submissions, and grading activity in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/assignments/new">
              <Button size="sm" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Create Assignment
              </Button>
            </Link>
            <Link to="/assignments">
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Manage Assignments
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {lecturerCards.map((card) => (
            <Card key={card.title} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submission Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded" />)}</div>
                ) : recentSubmissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No submissions received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentSubmissions.map((submission: any) => {
                      const isPending = submission.score == null
                      return (
                        <div key={submission.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium">{submission.student_name}</p>
                            <p className="text-sm text-muted-foreground">{submission.assignment_title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-1 text-xs ${isPending ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                              {isPending ? 'Pending Grade' : 'Graded'}
                            </span>
                            <Link to={`/submissions/${submission.id}`} className="text-sm font-medium text-primary inline-flex items-center gap-1">
                              Review <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Priority Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 rounded" />)}</div>
                ) : attentionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deadlines to watch this week.</p>
                ) : (
                  <div className="space-y-2">
                    {attentionItems.map((assignment: any) => (
                      <Link key={assignment.id} to={`/assignments/${assignment.id}/submissions`} className="flex items-center justify-between rounded-lg p-2 text-sm hover:bg-muted/50 transition-colors">
                        <span className="min-w-0 flex-1 truncate font-medium">{assignment.title}</span>
                        <span className={`ml-2 shrink-0 rounded-full px-2 py-1 text-xs ${assignment.isOverdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                          {assignment.isOverdue ? 'Overdue' : 'Due Soon'}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/assignments/new">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Create New Assignment
                  </Button>
                </Link>
                <Link to="/assignments">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FileText className="h-4 w-4" />
                    Review All Assignments
                  </Button>
                </Link>
                <Link to="/submissions">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Grade Submissions
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    )
  }

  const studentCards = [
    { title: 'Pending', value: stats.pendingAssignments ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { title: 'Submitted', value: stats.submittedCount ?? 0, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { title: 'Graded', value: stats.gradedCount ?? 0, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    { title: 'Overdue', value: stats.overdueCount ?? 0, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {studentCards.map((card) => (
          <Card key={card.title} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/assignments">
              <Button variant="outline" className="w-full justify-start gap-2">
                <ClipboardList className="h-4 w-4" />
                Browse Assignments
              </Button>
            </Link>
            <Link to="/my-submissions">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="h-4 w-4" />
                My Submissions
              </Button>
            </Link>
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 rounded" />)}</div>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
              ) : (
                <div className="space-y-2">
                  {assignments
                    .filter((a: any) => new Date(a.due_date) >= new Date())
                    .slice(0, 5)
                    .map((a: any) => (
                    <Link key={a.id} to={`/assignments/${a.id}`} className="flex items-center justify-between rounded-lg p-2 text-sm hover:bg-muted/50 transition-colors">
                      <span className="font-medium truncate">{a.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(a.due_date).toLocaleDateString()}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </Layout>
  )
}
