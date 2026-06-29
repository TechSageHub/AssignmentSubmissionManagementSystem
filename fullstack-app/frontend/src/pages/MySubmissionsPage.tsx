import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { readApiCache } from '@/services/api'
import Layout from '@/components/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, FileText, Calendar } from 'lucide-react'

interface MySubmission {
  id: number
  assignment_id: number
  assignment_title: string
  submitted_at: string
  is_late: boolean
  score: number | null
  feedback: string | null
  grade_graded_at: string | null
}

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<MySubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cachedSubmissions = readApiCache<MySubmission[]>('/submissions/mine')
    if (cachedSubmissions) {
      setSubmissions(cachedSubmissions)
      setLoading(false)
    }

    api.get('/submissions/mine')
      .then(({ data }) => setSubmissions(data))
      .catch(() => {
        if (!cachedSubmissions) setSubmissions([])
      })
      .finally(() => {
        if (!cachedSubmissions) setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="mb-8"><h1 className="text-2xl font-bold tracking-tight">My Submissions</h1></div>
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">My Submissions</h1>
        <p className="text-muted-foreground">Track all your submitted work</p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No submissions yet.</p>
            <Link to="/assignments">
              <Button variant="outline" className="mt-4">Browse Assignments</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <Link key={s.id} to={`/submissions/${s.id}`} className="block">
              <Card className="transition-all duration-150 hover:shadow-md hover:border-primary/20">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{s.assignment_title}</h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {s.score != null ? (
                      <div className="text-right">
                        <span className="text-lg font-bold">{s.score}</span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                    {s.is_late && <Badge variant="destructive">Late</Badge>}
                    <Eye className="h-4 w-4 text-muted-foreground" />
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
