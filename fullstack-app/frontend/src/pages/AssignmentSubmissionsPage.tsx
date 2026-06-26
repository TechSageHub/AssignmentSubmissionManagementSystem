import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '@/services/api'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Download, GraduationCap, BarChart3, List, Eye } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SubmissionRow {
  id: number
  student_name: string
  original_name: string
  submitted_at: string
  is_late: boolean
  score?: number | null
  feedback?: string | null
}

interface AnalyticsData {
  totalSubmissions: number
  totalGraded: number
  totalUngraded: number
  average: number | null
  median: number | null
  min: number | null
  max: number | null
  distribution: { range: string; count: number }[]
}

export default function AssignmentSubmissionsPage() {
  const { id } = useParams()
  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'submissions' | 'analytics'>('submissions')

  useEffect(() => {
    Promise.all([
      api.get(`/assignments/${id}/submissions`),
      api.get(`/assignments/${id}/analytics`).catch(() => ({ data: null })),
    ]).then(([subRes, anaRes]) => {
      setRows(subRes.data)
      setAnalytics(anaRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <Layout>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      </Layout>
    )
  }

  const ungraded = rows.filter((r) => r.score == null)

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 gap-2" asChild>
        <Link to={`/assignments/${id}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to Assignment
        </Link>
      </Button>

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
          <p className="text-muted-foreground">
            {rows.length} submission{rows.length !== 1 ? 's' : ''} — {ungraded.length} pending grading
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <a href={`/api/assignments/${id}/download-all`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download All
              </Button>
            </a>
          )}
          <div className="flex gap-1 rounded-lg border p-1">
            <Button
              variant={tab === 'submissions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('submissions')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={tab === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTab('analytics')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>
      </div>

      {tab === 'analytics' && analytics ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Average', value: analytics.average, suffix: '%' },
              { label: 'Median', value: analytics.median, suffix: '%' },
              { label: 'Highest', value: analytics.max, suffix: '%' },
              { label: 'Lowest', value: analytics.min, suffix: '%' },
            ].map((s) => (
              <Card key={s.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s.value != null ? s.value : '—'}{s.suffix}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="range" stroke="#64748b" fontSize={13} />
                    <YAxis stroke="#64748b" fontSize={13} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                      formatter={(value) => [value, 'Students']}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No submissions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="transition-all duration-150 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{r.student_name}</h3>
                    {r.is_late ? <Badge variant="destructive">Late</Badge> : <Badge variant="success">On Time</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{r.original_name}</span>
                    <span>•</span>
                    <span>{new Date(r.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {r.score != null ? (
                    <div className="text-right">
                      <span className="text-lg font-bold">{r.score}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <Link to={`/submissions/${r.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </Link>
                    <Link to={`/submissions/${r.id}/grade`}>
                      <Button variant="outline" size="sm">
                        {r.score != null ? 'Update' : 'Grade'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
