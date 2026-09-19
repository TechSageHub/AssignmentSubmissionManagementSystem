import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import api, { readApiCache, writeApiCache, clearApiCache } from '@/services/api'
import Layout from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState, EmptyState } from '@/components/PageState'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/utils/dates'

interface Announcement {
  id: number
  title: string
  message: string
  created_by: number
  creator_name: string
  target_role: string
  target_department: string | null
  target_level: string | null
  published_at: string | null
}

const cacheKey = '/announcements'

const LEVEL_OPTIONS = ['100', '200', '300', '400', '500']
const DEPARTMENTS = ['CSC', 'MTH', 'PHY', 'CHM', 'BIO', 'ENG']

function roleBadge(role: string): string {
  switch (role) {
    case 'student': return 'Students'
    case 'lecturer': return 'Lecturers'
    case 'admin': return 'Admins'
    default: return 'Everyone'
  }
}

export default function AnnouncementsPage() {
  usePageTitle('Announcements')
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'lecturer'

  const [items, setItems] = useState<Announcement[] | null>(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetRole, setTargetRole] = useState('all')
  const [targetDepartment, setTargetDepartment] = useState<string>('')
  const [targetLevel, setTargetLevel] = useState<string>('')

  const load = async (useCache = true) => {
    setError(false)
    if (useCache) {
      const cached = readApiCache<Announcement[]>(cacheKey)
      if (cached) { setItems(cached); return }
    }
    try {
      const { data } = await api.get<Announcement[]>(cacheKey)
      writeApiCache(cacheKey, data)
      setItems(data)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setTargetRole('all')
    setTargetDepartment('')
    setTargetLevel('')
  }

  const openCreate = () => {
    resetForm()
    setEditing(null)
    setCreateOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditing(a)
    setTitle(a.title)
    setMessage(a.message)
    setTargetRole(a.target_role)
    setTargetDepartment(a.target_department || '')
    setTargetLevel(a.target_level || '')
    setCreateOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        targetRole,
        targetDepartment: targetDepartment || null,
        targetLevel: targetLevel || null,
      }
      if (editing) {
        await api.put(`/announcements/${editing.id}`, payload)
        toast.success('Announcement updated')
      } else {
        await api.post('/announcements', payload)
        toast.success('Announcement published')
      }
      clearApiCache()
      setCreateOpen(false)
      await load(false)
    } catch {
      toast.error('Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  const del = async (a: Announcement) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/announcements/${a.id}`)
      clearApiCache()
      toast.success('Announcement deleted')
      await load(false)
    } catch {
      toast.error('Failed to delete announcement')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
            <p className="text-muted-foreground text-sm">
              Notices from admins and lecturers.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> New Announcement
            </Button>
          )}
        </div>

        {error ? (
          <ErrorState onRetry={() => load(false)} />
        ) : items === null ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            description={canManage ? 'Publish the first announcement for your students.' : 'Check back soon.'}
          />
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{a.creator_name}</span>
                        {a.published_at && <span>· {formatDateTime(a.published_at)}</span>}
                        <Badge variant="secondary">{roleBadge(a.target_role)}</Badge>
                        {a.target_department && <Badge variant="outline">{a.target_department}</Badge>}
                        {a.target_level && <Badge variant="outline">Level {a.target_level}</Badge>}
                      </div>
                    </div>
                    {canManage && (user?.role === 'admin' || a.created_by === user?.id) && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => del(a)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-semester break" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-message">Message</Label>
              <Textarea id="ann-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Write the announcement..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="lecturer">Lecturers</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={targetDepartment} onValueChange={(v) => setTargetDepartment(v === 'any' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={targetLevel} onValueChange={(v) => setTargetLevel(v === 'any' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {LEVEL_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}L</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Publish'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
