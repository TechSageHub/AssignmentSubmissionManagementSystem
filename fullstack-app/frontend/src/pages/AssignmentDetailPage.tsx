import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { Assignment } from '@/types'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FilePreview from '@/components/FilePreview'
import { ArrowLeft, Calendar, FileUp, Upload, Edit3, Users, AlertTriangle, X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

interface StudentOption {
  id: number
  name: string
  email: string
}

export default function AssignmentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [groupMembers, setGroupMembers] = useState<StudentOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    api.get(`/assignments/${id}`)
      .then(({ data }) => setAssignment(data))
      .catch(() => navigate('/assignments'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  // Fetch students for group selection when form is shown
  useEffect(() => {
    if (showGroupForm && students.length === 0) {
      api.get('/users/students').then(({ data }) => {
        setStudents(data.filter((u: StudentOption) => u.id !== user?.id))
      }).catch(() => {})
    }
  }, [showGroupForm, students.length, user?.id])

  const addMember = (student: StudentOption) => {
    if (!groupMembers.find(m => m.id === student.id)) {
      setGroupMembers([...groupMembers, student])
    }
    setSearchTerm('')
  }

  const removeMember = (id: number) => {
    setGroupMembers(groupMembers.filter(m => m.id !== id))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Please select a file'); return }
    setSubmitting(true)
    const formData = new FormData()
    formData.append('files', file)
    if (groupMembers.length > 0) {
      groupMembers.forEach(m => formData.append('group_member_ids', String(m.id)))
    }
    try {
      const { data } = await api.post(`/assignments/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(data.message || 'Submitted successfully!')
      setFile(null)
      setGroupMembers([])
      setShowGroupForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-48 rounded-xl" />
      </Layout>
    )
  }
  if (!assignment) return null

  const isOverdue = new Date() > new Date(assignment.due_date)

  return (
    <Layout>
      <Button variant="ghost" size="sm" className="mb-4 gap-2" onClick={() => navigate('/assignments')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{assignment.title}</CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {(assignment as any).course_code && (
                      <span className="font-medium text-indigo-600">{(assignment as any).course_code}</span>
                    )}
                    {(assignment as any).course_title && (
                      <span>{(assignment as any).course_title}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Due {new Date(assignment.due_date).toLocaleString()}
                    </span>
                  </div>
                </div>
                {isOverdue && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {assignment.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {user?.role === 'student' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Submit Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:border-primary/50 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, ZIP up to 10MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  {file && (
                    <FilePreview localFile={file} fileName={file.name} />
                  )}

                  <div className="border rounded-lg">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between p-3 text-sm font-medium"
                      onClick={() => setShowGroupForm(!showGroupForm)}
                    >
                      <span className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Group Submission
                      </span>
                      <span className="text-xs text-muted-foreground">optional</span>
                    </button>
                    {showGroupForm && (
                      <div className="border-t p-3 space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Add group members</Label>
                          <Input
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mt-1"
                          />
                          {searchTerm && (
                            <div className="mt-1 max-h-32 overflow-y-auto border rounded-lg">
                              {students
                                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                                .slice(0, 10)
                                .map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                                    onClick={() => addMember(s)}
                                  >
                                    <span className="font-medium">{s.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">{s.email}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                        {groupMembers.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Selected ({groupMembers.length})</p>
                            {groupMembers.map(m => (
                              <div key={m.id} className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-sm">
                                <span>{m.name}</span>
                                <button type="button" onClick={() => removeMember(m.id)} className="text-muted-foreground hover:text-destructive">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting || !file}>
                    {submitting ? 'Uploading...' : 'Submit'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {user?.role === 'lecturer' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate(`/assignments/${id}/edit`)}>
                  <Edit3 className="h-4 w-4" />
                  Edit Assignment
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate(`/assignments/${id}/submissions`)}>
                  <Users className="h-4 w-4" />
                  View Submissions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}
