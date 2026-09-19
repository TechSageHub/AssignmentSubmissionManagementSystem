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
import { Eye, FileText, Calendar, Download, ChevronDown, History } from 'lucide-react'

interface HistoryFile {
  file_path: string
  original_name: string
  file_size?: number
  mime_type?: string | null
}

interface HistoryVersion {
  id: number
  version_number: number
  file_path: string
  original_name: string
  is_late: boolean
  submitted_at: string
  files_json: string | null
}

interface MySubmission {
  id: number
  assignment_id: number
  assignment_title: string
  submitted_at: string
  is_late: boolean
  score: number | null
  feedback: string | null
  grade_graded_at: string | null
  files?: HistoryFile[]
  history?: HistoryVersion[]
}

function parseFiles(version: HistoryVersion): HistoryFile[] {
  try {
    const parsed = JSON.parse(version.files_json || '[]')
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch { /* ignore */ }
  return [{ file_path: version.file_path, original_name: version.original_name }]
}

export default function MySubmissionsPage() {
  usePageTitle('My Submissions')
  const [submissions, setSubmissions] = useState<MySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [openHistory, setOpenHistory] = useState<number | null>(null)

  useEffect(() => {
    setError(false)
    const cachedSubmissions = readApiCache<MySubmission[]>('/submissions/mine')
    if (cachedSubmissions) {
      setSubmissions(cachedSubmissions)
      setLoading(false)
    }

    api.get('/submissions/mine')
      .then(({ data }) => setSubmissions(data))
      .catch(() => {
        if (!cachedSubmissions) setError(true)
      })
      .finally(() => {
        if (!cachedSubmissions) setLoading(false)
      })
  }, [reloadKey])

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

      {error ? (
        <ErrorState message="Could not load your submissions." onRetry={() => setReloadKey((k) => k + 1)} />
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Once you submit work for an assignment it will appear here with its grade."
          action={
            <Link to="/assignments">
              <Button variant="outline"><FileText className="mr-2 h-4 w-4" />Browse Assignments</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <Card key={s.id} className="transition-all duration-150 hover:shadow-md hover:border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <Link to={`/submissions/${s.id}`} className="block">
                      <h3 className="font-medium truncate hover:text-primary">{s.assignment_title}</h3>
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </span>
                      {(s.history?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <History className="h-3.5 w-3.5" />
                          {(s.history?.length ?? 0) + 1} versions
                        </span>
                      )}
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
                </div>

                {(s.history?.length ?? 0) > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setOpenHistory(openHistory === s.id ? null : s.id)}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${openHistory === s.id ? 'rotate-180' : ''}`} />
                      View version history
                    </button>
                    {openHistory === s.id && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Current version</p>
                          <div className="space-y-1">
                            {(s.files ?? []).map((f) => (
                              <a
                                key={f.file_path}
                                href={`/api/submissions/${s.id}/file?filePath=${encodeURIComponent(f.file_path)}`}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                              >
                                <Download className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate">{f.original_name || f.file_path}</span>
                              </a>
                            ))}
                            {(s.files?.length ?? 0) === 0 && (
                              <p className="px-2 py-1 text-xs text-muted-foreground">No files attached.</p>
                            )}
                          </div>
                        </div>
                        {s.history?.map((v) => (
                          <div key={v.id}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                              Version {v.version_number + 1} · {new Date(v.submitted_at).toLocaleString()}
                            </p>
                            <div className="space-y-1">
                              {parseFiles(v).map((f, i) => (
                                <a
                                  key={i}
                                  href={`/api/submissions/${s.id}/file?filePath=${encodeURIComponent(f.file_path)}`}
                                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="truncate">{f.original_name || f.file_path}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}