import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import api from '@/services/api'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ErrorState } from '@/components/PageState'
import FilePreview from '@/components/FilePreview'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, FileText, Award, MessageSquare, Eye, MessageSquareWarning } from 'lucide-react'
import { toast } from 'sonner'

interface GradeData {
  score: number | null
  feedback: string | null
  status?: string
  released?: boolean
  released_at?: string | null
  criteria_scores?: { criteria_id: number; name: string; max_score: number; score: number; weight?: number | null }[]
  appeal?: {
    id: number
    reason: string
    status: 'open' | 'accepted' | 'rejected'
    lecturer_comment: string | null
    requested_at: string
  } | null
}

export default function ViewSubmissionPage() {
  usePageTitle('Submission')
  const { submissionId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState<{
    id: number
    student_name: string
    assignment_title: string
    assignment_id: number
    original_name: string
    submitted_at: string
    is_late: boolean
    files?: Array<{ id: number; original_name: string; file_path: string }>
    grade?: GradeData
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [appealOpen, setAppealOpen] = useState(false)
  const [appealReason, setAppealReason] = useState('')
  const [appealSaving, setAppealSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sub } = await api.get(`/submissions/${submissionId}`)
        try {
          const { data: grade } = await api.get(`/submissions/${submissionId}/grade`)
          sub.grade = grade
        } catch { sub.grade = { score: null, feedback: null, status: 'pending' } }
        setSubmission(sub)
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [submissionId, navigate])

  const handleAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error('Please explain why you are appealing this grade')
      return
    }
    setAppealSaving(true)
    try {
      await api.post('/appeals', { submissionId: Number(submissionId), reason: appealReason })
      toast.success('Appeal submitted')
      setAppealOpen(false)
      setAppealReason('')
      window.location.reload()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Failed to submit appeal')
    } finally {
      setAppealSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-48 rounded-xl mb-4" />
        <Skeleton className="h-48 rounded-xl" />
      </Layout>
    )
  }

  if (loadError || !submission) {
    return (
      <Layout>
        <div className="py-10">
          <ErrorState message="Could not load this submission." onRetry={() => window.location.reload()} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate(user?.role === 'lecturer' ? `/assignments/${submission.assignment_id}/submissions` : '/my-submissions')}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Submission Details</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Submission Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Assignment</p>
                  <p className="font-medium mt-0.5">{submission.assignment_title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Student</p>
                  <p className="font-medium mt-0.5">{submission.student_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Submitted</p>
                  <p className="font-medium mt-0.5">{new Date(submission.submitted_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Files</p>
                  <p className="font-medium mt-0.5 truncate">{submission.files && submission.files.length > 0 ? `${submission.files.length} uploaded file${submission.files.length > 1 ? 's' : ''}` : submission.original_name}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Status</p>
                {submission.is_late ? <Badge variant="destructive">Late</Badge> : <Badge variant="success">On Time</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                File Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(submission.files && submission.files.length > 0 ? submission.files : [{ id: submission.id, original_name: submission.original_name, file_path: '' }]).map((file) => (
                  <div key={file.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{file.original_name}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await api.get(`/submissions/${submission.id}/file`, {
                              params: { fileId: file.id },
                              responseType: 'blob',
                            })
                            const url = URL.createObjectURL(response.data)
                            window.open(url, '_blank')
                          } catch (err) {
                            console.error('Failed to open file:', err)
                          }
                        }}
                        className="text-sm text-primary underline"
                      >
                        Open
                      </button>
                    </div>
                    <FilePreview submissionId={submission.id} fileName={file.original_name} fileId={file.id} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Grade & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submission.grade?.score != null && submission.grade.score !== undefined ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">{submission.grade.score}</div>
                    <p className="text-sm text-muted-foreground">out of 100</p>
                  </div>

                  {submission.grade.criteria_scores && submission.grade.criteria_scores.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-2">Criteria Breakdown</p>
                        <div className="space-y-2">
                          {submission.grade.criteria_scores.map((cs) => (
                            <div key={cs.criteria_id} className="flex items-center justify-between text-sm">
                              <span>
                                {cs.name}{' '}
                                <span className="text-xs text-muted-foreground">({(cs.weight ?? 100).toFixed(0)}%)</span>
                              </span>
                              <span className="font-medium">{cs.score} / {cs.max_score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {submission.grade.feedback && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Feedback
                        </p>
                        <p className="text-sm">{submission.grade.feedback}</p>
                      </div>
                    </>
                  )}

                  {submission.grade.appeal ? (
                    <div className="rounded-lg border-l-4 border-amber-400 bg-muted/40 p-3">
                      <p className="text-sm font-medium flex items-center gap-1.5 text-amber-600">
                        <MessageSquareWarning className="h-4 w-4" />
                        Appeal {submission.grade.appeal.status}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{submission.grade.appeal.reason}</p>
                      {submission.grade.appeal.lecturer_comment && (
                        <p className="text-xs mt-2 text-muted-foreground italic">&ldquo;{submission.grade.appeal.lecturer_comment}&rdquo;</p>
                      )}
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setAppealOpen(true)}>
                      <MessageSquareWarning className="h-4 w-4" />
                      Appeal this grade
                    </Button>
                  )}
                </div>
              ) : submission.grade?.released === false && submission.grade.status === 'withheld' ? (
                <div className="py-6 text-center">
                  <p className="text-sm font-medium text-muted-foreground">Grade withheld</p>
                  <p className="text-xs text-muted-foreground mt-1">Your grade has not been released yet. Contact your lecturer if you have questions.</p>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Not graded yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {user?.role === 'lecturer' && (
            <Button className="w-full" onClick={() => navigate(`/submissions/${submissionId}/grade`)}>
              {submission.grade?.score ? 'Update Grade' : 'Grade This Submission'}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  )
}
