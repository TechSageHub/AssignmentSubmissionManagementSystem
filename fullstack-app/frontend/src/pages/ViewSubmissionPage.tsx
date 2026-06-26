import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import FilePreview from '@/components/FilePreview'
import { ArrowLeft, FileText, Award, MessageSquare, Eye } from 'lucide-react'

export default function ViewSubmissionPage() {
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
    grade?: { score: number; feedback: string | null; status?: string; criteria_scores?: { criteria_id: number; name: string; max_score: number; score: number }[] }
  } | null>(null)
  const [loading, setLoading] = useState(true)

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
        navigate('/assignments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [submissionId, navigate])

  if (loading) {
    return (
      <Layout>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-48 rounded-xl mb-4" />
        <Skeleton className="h-48 rounded-xl" />
      </Layout>
    )
  }
  if (!submission) return null

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
                  <p className="text-xs text-muted-foreground font-medium">File</p>
                  <p className="font-medium mt-0.5 truncate">{submission.original_name}</p>
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
              <FilePreview
                submissionId={submission.id}
                fileName={submission.original_name}
              />
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
                              <span>{cs.name}</span>
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
