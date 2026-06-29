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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const cachedAssignments = readApiCache<Assignment[]>('/assignments')
      const cachedSubmissions = readApiCache<any[]>(user?.role === 'lecturer' ? '/submissions' : '/submissions/mine')

      if (cachedAssignments) setAssignments(cachedAssignments)
      if (cachedSubmissions) {
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
          const [assignmentsRes, submissions] = await Promise.all([
            api.get('/assignments'),
            api.get('/submissions'),
          ])
          setAssignments(assignmentsRes.data)
          setStats({
            totalAssignments: assignmentsRes.data.length,
            totalSubmissions: submissions.data.length,
            pendingGrading: submissions.data.filter((s: { score?: number | null }) => s.score == null).length,
            averageScore: submissions.data.filter((s: { score?: number | null }) => s.score != null).length > 0
              ? Math.round(submissions.data.filter((s: { score?: number | null }) => s.score != null).reduce((a: number, s: { score: number }) => a + s.score, 0) / submissions.data.filter((s: { score?: number | null }) => s.score != null).length)
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
    const lecturerCards = [
      { title: 'Assignments', value: stats.totalAssignments ?? 0, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
      { title: 'Submissions', value: stats.totalSubmissions ?? 0, icon: FileText, color: 'text-indigo-600 bg-indigo-50' },
      { title: 'Pending Grading', value: stats.pendingGrading ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
      { title: 'Avg Score', value: stats.averageScore ?? 0, icon: TrendingUp, color: 'text-green-600 bg-green-50', suffix: '%' },
    ]

    return (
      <Layout>
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <div className="text-2xl font-bold">
                    {card.value}{card.suffix || ''}
                  </div>
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
              <Link to="/assignments/new">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Create New Assignment
                </Button>
              </Link>
              <Link to="/assignments">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  View All Assignments
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 rounded" />)}</div>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.slice(0, 5).map((a: any) => (
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
