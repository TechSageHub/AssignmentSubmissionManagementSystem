import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/services/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import Layout from '@/components/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ErrorState, EmptyState } from '@/components/PageState'
import { MessageSquareWarning, ExternalLink, CheckCircle2, XCircle, Clock3 } from 'lucide-react'
import { toast } from 'sonner'

interface AppealRow {
  id: number
  submission_id: number
  student_name: string
  assignment_title: string
  reason: string
  status: 'open' | 'accepted' | 'rejected'
  lecturer_comment: string | null
  old_score: number | null
  new_score: number | null
  requested_at: string
  resolved_at: string | null
}

export default function AppealsPage() {
  usePageTitle('Grade Appeals')
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('s') || 'open'
  const [items, setItems] = useState<AppealRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rejecting, setRejecting] = useState<AppealRow | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [rejectSaving, setRejectSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(false)
    try {
      const { data } = await api.get('/appeals', { params: { status } })
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [status])

  const handleReject = async () => {
    if (!rejecting) return
    if (!rejectComment.trim()) {
      toast.error('Add a comment explaining the rejection')
      return
    }
    setRejectSaving(true)
    try {
      await api.post(`/appeals/${rejecting.id}/resolve`, { status: 'rejected', lecturerComment: rejectComment })
      toast.success('Appeal rejected')
      setRejecting(null)
      setRejectComment('')
      await fetchData()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Failed to reject appeal')
    } finally {
      setRejectSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </Layout>
    )
  }

  const statusBadge = (s: AppealRow['status']) =>
    s === 'open' ? <Badge variant="warning"><Clock3 className="h-3 w-3 mr-1" />Open</Badge>
      : s === 'accepted' ? <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>
        : <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Grade Appeals</h1>
        <p className="text-muted-foreground">Review and respond to student grade appeals</p>
      </div>

      <div className="mb-4 flex gap-2">
        {(['open', 'accepted', 'rejected', 'all'] as const).map((s) => (
          <Button
            key={s}
            variant={status === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchParams(s === 'open' ? {} : { s })}
          >
            {s === 'open' ? 'Open' : s === 'accepted' ? 'Accepted' : s === 'rejected' ? 'Rejected' : 'All'}
          </Button>
        ))}
      </div>

      {error ? (
        <ErrorState message="Could not load appeals." onRetry={fetchData} />
      ) : items.length === 0 ? (
        <EmptyState title="No appeals here" description="Appeals filed by your students will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{a.assignment_title}</h3>
                      {statusBadge(a.status)}
                      {a.old_score != null && a.new_score != null && a.old_score !== a.new_score && (
                        <span className="text-sm text-muted-foreground">
                          {a.old_score} → <span className="font-bold text-primary">{a.new_score}</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{a.student_name}</span> · {new Date(a.requested_at).toLocaleString()}
                    </p>
                    <div className="mt-3 rounded-lg border-l-4 border-primary bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <MessageSquareWarning className="h-3 w-3" />
                        Appeal reason
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
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link to={`/submissions/${a.submission_id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Button>
                    </Link>
                    {a.status === 'open' && (
                      <>
                        <Link to={`/submissions/${a.submission_id}/grade?appeal=${a.id}`}>
                          <Button size="sm">Review & Adjust</Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => setRejecting(a)}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject appeal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {rejecting ? `Rejecting ${rejecting.student_name}'s appeal for "${rejecting.assignment_title}".` : ''}
            </p>
            <div className="space-y-2">
              <Label>Comment for the student (required)</Label>
              <Textarea
                rows={4}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Explain why the appeal was declined..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectSaving}>
              {rejectSaving ? 'Rejecting...' : 'Reject Appeal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}