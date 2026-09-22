import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { readApiCache } from '@/services/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import Layout from '@/components/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState, EmptyState } from '@/components/PageState'
import { MessageSquareWarning, CheckCircle2, XCircle, Clock3 } from 'lucide-react'

interface MyAppeal {
  id: number
  submission_id: number
  assignment_title: string
  reason: string
  status: 'open' | 'accepted' | 'rejected'
  lecturer_comment: string | null
  old_score: number | null
  new_score: number | null
  requested_at: string
  resolved_at: string | null
}

export default function MyAppealsPage() {
  usePageTitle('My Appeals')
  const [items, setItems] = useState<MyAppeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setError(false)
    const cached = readApiCache<MyAppeal[]>('/appeals/mine')
    if (cached) {
      setItems(cached)
      setLoading(false)
    }
    api.get('/appeals/mine')
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => { if (!cached) setError(true) })
      .finally(() => { if (!cached) setLoading(false) })
  }, [reloadKey])

  if (loading) {
    return (
      <Layout>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </Layout>
    )
  }

  const statusBadge = (s: MyAppeal['status']) =>
    s === 'open' ? <Badge variant="warning"><Clock3 className="h-3 w-3 mr-1" />Open</Badge>
      : s === 'accepted' ? <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>
        : <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">My Appeals</h1>
        <p className="text-muted-foreground">Track your grade appeals</p>
      </div>

      {error ? (
        <ErrorState message="Could not load your appeals." onRetry={() => setReloadKey((k) => k + 1)} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No appeals yet"
          description="If you disagree with a released grade you can appeal it from the submission page."
          action={
            <Link to="/my-submissions">
              <Button variant="outline">View My Submissions</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/submissions/${a.submission_id}`} className="font-medium hover:text-primary">
                        {a.assignment_title}
                      </Link>
                      {statusBadge(a.status)}
                      {a.old_score != null && a.new_score != null && a.old_score !== a.new_score && (
                        <span className="text-sm text-muted-foreground">
                          {a.old_score} → <span className="font-bold text-primary">{a.new_score}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border-l-4 border-primary bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <MessageSquareWarning className="h-3 w-3" />
                        You appealed
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{a.reason}</p>
                    </div>
                    {a.lecturer_comment && (
                      <div className="mt-2 rounded-lg border-l-4 border-muted p-3 bg-card">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Lecturer response</p>
                        <p className="text-sm whitespace-pre-wrap">{a.lecturer_comment}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{new Date(a.requested_at).toLocaleDateString()}</p>
                    {a.resolved_at && <p className="mt-1">Resolved {new Date(a.resolved_at).toLocaleDateString()}</p>}
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