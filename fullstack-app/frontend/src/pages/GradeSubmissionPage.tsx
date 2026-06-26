import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/services/api'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import FilePreview from '@/components/FilePreview'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface CriterionScore {
  criteriaId: number
  name: string
  maxScore: number
  score: string
}

export default function GradeSubmissionPage() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [criteriaScores, setCriteriaScores] = useState<CriterionScore[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submission, setSubmission] = useState<{ student_name: string; original_name: string; assignment_title?: string; assignment_id?: number } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sub } = await api.get(`/submissions/${submissionId}`)
        setSubmission(sub)

        // Fetch rubric criteria if they exist
        try {
          const { data: rubric } = await api.get(`/assignments/${sub.assignment_id}/rubric`)
          if (Array.isArray(rubric) && rubric.length > 0) {
            setCriteriaScores(
              rubric.map((c: { id: number; name: string; max_score: number }) => ({
                criteriaId: c.id,
                name: c.name,
                maxScore: c.max_score,
                score: '',
              }))
            )
          }
        } catch { /* no rubric */ }

        // Load existing grade
        try {
          const { data: grade } = await api.get(`/submissions/${submissionId}/grade`)
          if (grade.score !== null) {
            setScore(String(grade.score))
            setFeedback(grade.feedback || '')
            if (grade.criteria_scores?.length > 0) {
              setCriteriaScores(
                grade.criteria_scores.map((cs: { criteria_id: number; score: number; name: string; max_score: number }) => ({
                  criteriaId: cs.criteria_id,
                  name: cs.name,
                  maxScore: cs.max_score,
                  score: String(cs.score),
                }))
              )
            }
          }
        } catch { /* no grade yet */ }
      } catch {
        navigate('/assignments')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [submissionId, navigate])

  const updateCriterionScore = (i: number, value: string) => {
    const updated = criteriaScores.map((c, idx) => idx === i ? { ...c, score: value } : c)
    setCriteriaScores(updated)
    // Auto-calculate total
    const total = updated.reduce((sum, c) => sum + (Number(c.score) || 0), 0)
    setScore(String(total))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const scoreNum = Number(score)
    if (!score || isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setError('Score must be a number between 0 and 100')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { score: scoreNum, feedback }
      if (criteriaScores.length > 0) {
        payload.criteriaScores = criteriaScores.map(c => ({
          criteriaId: c.criteriaId,
          score: Number(c.score) || 0,
        }))
      }
      await api.put(`/submissions/${submissionId}/grade`, payload)
      toast.success('Grade saved successfully')
      navigate(-1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      setError(msg || 'Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate(`/submissions/${submissionId}`)}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Grade Submission</h1>
        <p className="text-muted-foreground">Evaluate and provide feedback</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Student</Label>
                  <p className="font-medium">{submission.student_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">File</Label>
                  <p className="font-medium">{submission.original_name}</p>
                </div>
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Preview
                  </Label>
                  <FilePreview submissionId={Number(submissionId)} fileName={submission.original_name} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Save className="h-4 w-4" />
              Grade & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {criteriaScores.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">Rubric Criteria</Label>
                    {criteriaScores.map((c, i) => (
                      <div key={c.criteriaId} className="flex items-center gap-3">
                        <span className="flex-1 text-sm">{c.name}</span>
                        <Input
                          type="number"
                          min={0}
                          max={c.maxScore}
                          placeholder={`0-${c.maxScore}`}
                          value={c.score}
                          onChange={(e) => updateCriterionScore(i, e.target.value)}
                          className="w-24 text-center"
                        />
                        <span className="text-xs text-muted-foreground w-8">/ {c.maxScore}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between text-sm font-medium">
                      <span>Total</span>
                      <span>{criteriaScores.reduce((s, c) => s + (Number(c.score) || 0), 0)} / {criteriaScores.reduce((s, c) => s + c.maxScore, 0)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="score">Score (0-100)</Label>
                  <Input id="score" type="number" min={0} max={100} placeholder="85" value={score} onChange={(e) => setScore(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea id="feedback" rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Provide constructive feedback..." />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Grade'}
                </Button>
              </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
